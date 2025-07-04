import React, { useEffect, useState } from 'react';
import { debugLog } from '../../development/utils/Debug';
import './ObjectiveUI.css';

const ObjectiveUI = ({ currentMap = 'maparea0' }) => {
  const [actualCurrentMap, setActualCurrentMap] = useState(currentMap);

  // Try to get the actual current map from the mapManager if available
  useEffect(() => {
    const checkCurrentMap = () => {
      // Try to access the global mapManager
      if (window.gameMapManager && window.gameMapManager.currentMap) {
        const realMap = window.gameMapManager.currentMap;
        if (realMap !== actualCurrentMap) {
          debugLog(`ObjectiveUI: Found real current map: ${realMap}`, 'ui');
          setActualCurrentMap(realMap);
        }
      } else {
        // Fallback to the prop
        setActualCurrentMap(currentMap);
      }
    };

    // Check immediately
    checkCurrentMap();

    // Check periodically to catch map changes
    const interval = setInterval(checkCurrentMap, 1000);

    return () => clearInterval(interval);
  }, [currentMap, actualCurrentMap]);

  debugLog(`ObjectiveUI: Using map: ${actualCurrentMap}`, 'ui');

  // Get objective text based on current map
  const getObjectiveText = (mapId) => {
    debugLog(`ObjectiveUI: Getting objective text for map: ${mapId}`, 'ui');
    switch(mapId) {
      case 'maparea0':
        return 'Step in to portal';
      case 'maparea1':
        return 'Find portal';
      case 'maparea2':
        return ['Mutate rat', 'Find portal'];
      case 'mapareax':
        return 'Kill or survive boss for 3 min';
      default:
        return 'Explore the area';
    }
  };

  const objectiveText = getObjectiveText(actualCurrentMap);
  debugLog(`ObjectiveUI: Final render - actualCurrentMap: ${actualCurrentMap}, objectiveText: ${JSON.stringify(objectiveText)}`, 'ui');

  return (
    <div 
      className="objective-ui-container"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      <div 
        className="objective-ui-title"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        Objective:
      </div>
      <div 
        className="objective-ui-content"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        {Array.isArray(objectiveText) ? (
          objectiveText.map((text, index) => (
            <div 
              key={index} 
              className="objective-ui-item"
              tabIndex={-1}
              onMouseDown={(e) => e.preventDefault()}
              style={{ userSelect: 'none' }}
            >
              {text}
            </div>
          ))
        ) : (
          <div 
            className="objective-ui-item"
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            style={{ userSelect: 'none' }}
          >
            {objectiveText}
          </div>
        )}
      </div>
    </div>
  );
};

export default ObjectiveUI;
