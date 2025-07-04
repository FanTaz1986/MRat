import React, { useState, useEffect } from 'react';
import './PlayerUI.css';

const PlayerUI = ({ playerHealth = 3, maxHealth = 5, petAttackCooldown = 0 }) => {
  const [currentHealth, setCurrentHealth] = useState(playerHealth);
  const [attackProgress, setAttackProgress] = useState(petAttackCooldown);

  useEffect(() => {
    setCurrentHealth(playerHealth);
  }, [playerHealth]);

  useEffect(() => {
    setAttackProgress(petAttackCooldown);
  }, [petAttackCooldown]);

  // Create heart slots array
  const heartSlots = [];
  for (let i = 0; i < maxHealth; i++) {
    heartSlots.push(i < currentHealth);
  }

  // Demo function to handle heart clicks (for testing)
  const handleHeartClick = (index) => {
    // Disabled - hearts should not be clickable in the game
    return;
  };

  return (
    <div 
      className="player-ui-container"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Character Name */}
      <div 
        className="player-ui-name"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        Erif
      </div>
      
      {/* Heart Health Display */}
      <div 
        className="player-ui-hearts"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        {heartSlots.map((isFilled, index) => (
          <div 
            key={index} 
            className={`player-ui-heart ${isFilled ? 'filled' : 'empty'}`}
            onClick={() => handleHeartClick(index)}
            title={`Health ${index + 1}/${maxHealth}`}
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            style={{ userSelect: 'none' }}
          >
            <img 
              src="/Extra/HP/hearticon.png" 
              alt="Heart" 
              className="heart-icon"
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        ))}
      </div>
      
      {/* Pet Name */}
      <div 
        className="player-ui-pet-name"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        Snape
      </div>
      
      {/* Attack Ready Box */}
      <div 
        className={`player-ui-attack-box ${attackProgress >= 100 ? 'ready' : ''}`}
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        <div 
          className="player-ui-attack-fill"
          style={{ width: `${attackProgress}%` }}
        />
        <div 
          className="player-ui-attack-text"
          tabIndex={-1}
          onMouseDown={(e) => e.preventDefault()}
          style={{ userSelect: 'none' }}
        >
          Attack
        </div>
      </div>
    </div>
  );
};

export default PlayerUI;
