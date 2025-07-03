import React, { useState, useEffect, useMemo } from 'react';
import './OptionsMenu.css';
import {
  setMusicVolume,
  setSfxVolume
} from '../../utils/AudioManager';

const OptionsMenu = ({ 
  isVisible, 
  onContinue, 
  onReturnToMain, 
  onExit, 
  initialMusicVolume = 5, 
  initialSfxVolume = 7 
}) => {
  const [musicVolume, setMusicVolumeState] = useState(initialMusicVolume);
  const [sfxVolume, setSfxVolumeState] = useState(initialSfxVolume);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const menuItems = useMemo(() => [
    { label: 'Continue', action: onContinue },
    { label: 'Return to Main Menu', action: onReturnToMain },
    { label: 'Exit Game', action: onExit }
  ], [onContinue, onReturnToMain, onExit]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : menuItems.length - 1;
            return newIndex;
          });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => {
            const newIndex = (prev + 1) % menuItems.length;
            return newIndex;
          });
          break;
        case 'Enter':
          e.preventDefault();
          menuItems[selectedIndex].action();
          break;
        case 'Escape':
          e.preventDefault();
          onContinue();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, onContinue, menuItems]);

  // Update audio manager when volume changes
  useEffect(() => {
    setMusicVolume(musicVolume / 10); // Convert 0-10 to 0-1
  }, [musicVolume]);

  useEffect(() => {
    setSfxVolume(sfxVolume / 10); // Convert 0-10 to 0-1
  }, [sfxVolume]);

  const handleMenuClick = (index) => {
    setSelectedIndex(index);
    setTimeout(() => {
      menuItems[index].action();
    }, 100);
  };

  if (!isVisible) return null;

  return (
    <div className="options-menu-overlay">
      <div className="options-menu-container">
        <div className="options-menu-content">
          <h1 className="options-menu-title">Game Paused</h1>
          
          {/* Audio Options */}
          <div className="options-menu-audio">
            <h3 className="options-menu-subtitle">Audio Settings</h3>
            
            <div className="options-menu-slider-group">
              <label className="options-menu-label">
                Music Volume: {musicVolume}
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={musicVolume}
                  onChange={e => setMusicVolumeState(Number(e.target.value))}
                  className="options-menu-slider"
                />
              </label>
            </div>
            
            <div className="options-menu-slider-group">
              <label className="options-menu-label">
                SFX Volume: {sfxVolume}
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={sfxVolume}
                  onChange={e => setSfxVolumeState(Number(e.target.value))}
                  className="options-menu-slider"
                />
              </label>
            </div>
          </div>

          {/* Menu Buttons */}
          <div className="options-menu-buttons">
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                className={`options-menu-btn ${selectedIndex === index ? 'selected' : ''}`}
                onClick={() => handleMenuClick(index)}
                onMouseEnter={() => {
                  setSelectedIndex(index);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptionsMenu;
