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
    <div className="player-ui-container">
      {/* Character Name */}
      <div className="player-ui-name">Erif</div>
      
      {/* Heart Health Display */}
      <div className="player-ui-hearts">
        {heartSlots.map((isFilled, index) => (
          <div 
            key={index} 
            className={`player-ui-heart ${isFilled ? 'filled' : 'empty'}`}
            onClick={() => handleHeartClick(index)}
            title={`Health ${index + 1}/${maxHealth}`}
          >
            <img 
              src="/Extra/HP/hearticon.png" 
              alt="Heart" 
              className="heart-icon"
            />
          </div>
        ))}
      </div>
      
      {/* Pet Name */}
      <div className="player-ui-pet-name">Snape</div>
      
      {/* Attack Ready Box */}
      <div className={`player-ui-attack-box ${attackProgress >= 100 ? 'ready' : ''}`}>
        <div 
          className="player-ui-attack-fill"
          style={{ width: `${attackProgress}%` }}
        />
        <div className="player-ui-attack-text">Attack</div>
      </div>
    </div>
  );
};

export default PlayerUI;
