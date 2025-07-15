import React from 'react';

export function createAnalysisTab(analyzeMapProps, mapManager, character, camera) {
  return React.createElement('div', { key: 'analysis' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Automatic Analysis Tools'),
    
    React.createElement('div', {
      key: 'analysisControls',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('button', {
        key: 'analyzeBtn',
        onClick: analyzeMapProps,
        style: {
          width: '100%',
          padding: '12px 16px',
          marginBottom: '12px',
          background: 'rgba(255, 152, 0, 0.2)',
          border: '2px solid rgba(255, 152, 0, 0.5)',
          borderRadius: '12px',
          color: '#FF9800',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textShadow: '0 0 8px rgba(255, 152, 0, 0.3)'
        }
      }, '🔍 Analyze Props & Map Data'),
      
      React.createElement('div', {
        key: 'info',
        style: { 
          fontSize: '11px', 
          color: '#a259ff', 
          opacity: 0.7,
          textAlign: 'center',
          fontStyle: 'italic',
          lineHeight: '1.4'
        }
      }, 'Analyzes current map props, positions, tiles, and coordinates. Results are logged to console.')
    ]),

    React.createElement('div', {
      key: 'liveInfo',
      style: { 
        fontSize: '12px', 
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(162, 89, 255, 0.3)'
      }
    }, [
      React.createElement('div', {
        key: 'currentData',
        style: { marginBottom: '8px' }
      }, React.createElement('strong', { style: { color: '#a259ff' } }, 'Live Tile & Prop Data:')),
      
      // Current Map Info
      React.createElement('div', {
        key: 'map-info',
        style: { fontSize: '10px', marginBottom: '4px', color: '#FFC107' }
      }, `📍 Current Map: ${mapManager?.currentMap || 'Unknown'}`),
      
      // Character position and tile with detailed info
      character && character.position ? 
        React.createElement('div', {
          key: 'char-detailed',
          style: { fontSize: '10px', marginBottom: '4px', background: 'rgba(76, 175, 80, 0.1)', padding: '4px', borderRadius: '4px' }
        }, [
          React.createElement('div', { key: 'char-pos' }, `🧙 Character: (${character.position.x.toFixed(1)}, ${character.position.y.toFixed(1)})`),
          React.createElement('div', { key: 'char-tile' }, `📐 Character Tile: (${Math.floor(character.position.x / 32)}, ${Math.floor(character.position.y / 32)})`)
        ]) :
        React.createElement('div', {
          key: 'no-char',
          style: { fontSize: '10px' }
        }, '❌ Character position not available'),
      
      // Portal coordinates and tiles with enhanced info
      mapManager?.portalManager?.portals?.length > 0 ? 
        mapManager.portalManager.portals.map((portal, index) => {
          const portalTileX = portal.position ? Math.floor(portal.position.x / 32) : 'N/A';
          const portalTileY = portal.position ? Math.floor(portal.position.y / 32) : 'N/A';
          return React.createElement('div', {
            key: `portal-detailed-${index}`,
            style: { fontSize: '10px', marginBottom: '4px', background: 'rgba(33, 150, 243, 0.1)', padding: '4px', borderRadius: '4px' }
          }, [
            React.createElement('div', { key: `portal-pos-${index}` }, `🌀 Portal ${index + 1}: (${portal.position?.x?.toFixed(1) || 'N/A'}, ${portal.position?.y?.toFixed(1) || 'N/A'})`),
            React.createElement('div', { key: `portal-tile-${index}` }, `📐 Portal Tile: (${portalTileX}, ${portalTileY})`),
            React.createElement('div', { key: `portal-target-${index}` }, `🎯 Target: ${portal.targetMap || 'Unknown'}`)
          ]);
        }) :
        React.createElement('div', {
          key: 'no-portals',
          style: { fontSize: '10px', color: '#888' }
        }, '❌ No portals found'),
      
      // Camera position
      camera && camera.position ?
        React.createElement('div', {
          key: 'cam-detailed',
          style: { fontSize: '10px', marginBottom: '4px', background: 'rgba(156, 39, 176, 0.1)', padding: '4px', borderRadius: '4px' }
        }, [
          React.createElement('div', { key: 'cam-pos' }, `📷 Camera: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)})`),
          React.createElement('div', { key: 'cam-tile' }, `📐 Camera Tile: (${Math.floor(camera.position.x / 32)}, ${Math.floor(camera.position.y / 32)})`)
        ]) :
        React.createElement('div', {
          key: 'no-cam',
          style: { fontSize: '10px' }
        }, '❌ Camera position not available'),
      
      // Simplified tile analysis section
      React.createElement('div', {
        key: 'props-section',
        style: { marginTop: '8px', borderTop: '1px solid rgba(162, 89, 255, 0.3)', paddingTop: '8px' }
      }, [
        React.createElement('div', {
          key: 'props-title',
          style: { fontSize: '10px', fontWeight: 'bold', color: '#a259ff', marginBottom: '4px' }
        }, '🎮 Tile Props Debug Info:'),
        React.createElement('div', {
          key: 'props-info',
          style: { fontSize: '9px', color: '#888', fontStyle: 'italic' }
        }, 'Use "Analyze Props & Map Data" button above for detailed tile analysis')
      ])
    ])
  ]);
}
