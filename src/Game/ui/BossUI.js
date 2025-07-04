import React, { useState, useEffect } from 'react';
import './BossUI.css';

const BossUI = ({ bossHealth = 40, maxBossHealth = 40, isVisible = false }) => {
  const [currentHealth, setCurrentHealth] = useState(bossHealth);

  useEffect(() => {
    setCurrentHealth(bossHealth);
  }, [bossHealth]);

  // Add debug logging to track prop changes (only when needed)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`BossUI props: health=${bossHealth}/${maxBossHealth}, visible=${isVisible}`);
    }
  }, [bossHealth, maxBossHealth, isVisible]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Create heart slots array - 4 rows of 10 hearts each
  const heartSlots = [];
  for (let i = 0; i < maxBossHealth; i++) {
    heartSlots.push(i < currentHealth);
  }

  // Split hearts into rows of 10
  const heartRows = [];
  for (let row = 0; row < 4; row++) {
    const rowHearts = [];
    for (let col = 0; col < 10; col++) {
      const heartIndex = row * 10 + col;
      rowHearts.push(heartSlots[heartIndex] || false);
    }
    heartRows.push(rowHearts);
  }

  return (
    <div 
      className="boss-ui-container"
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{ userSelect: 'none' }}
    >
      {/* Boss Name */}
      <div 
        className="boss-ui-name"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        Boss
      </div>
      
      {/* Boss Health Display - 4 rows of 10 hearts */}
      <div 
        className="boss-ui-hearts-container"
        tabIndex={-1}
        onMouseDown={(e) => e.preventDefault()}
        style={{ userSelect: 'none' }}
      >
        {heartRows.map((row, rowIndex) => (
          <div 
            key={rowIndex}
            className="boss-ui-hearts-row"
          >
            {row.map((isFilled, colIndex) => {
              const heartIndex = rowIndex * 10 + colIndex;
              return (
                <div 
                  key={heartIndex} 
                  className={`boss-ui-heart ${isFilled ? 'filled' : 'empty'}`}
                  title={`Boss Health ${heartIndex + 1}/${maxBossHealth}`}
                  tabIndex={-1}
                  onMouseDown={(e) => e.preventDefault()}
                  style={{ userSelect: 'none' }}
                >
                  <img 
                    src="/Extra/HP/hearticon.png" 
                    alt="Boss Heart" 
                    className="boss-heart-icon"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BossUI;
