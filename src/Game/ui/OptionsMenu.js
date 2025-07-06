import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import './OptionsMenu.css';
import {
  setMusicVolume,
  setSfxVolume
} from '../../utils/AudioManager';
import { debugLog } from '../../development/utils/Debug';

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
  const [showAudio, setShowAudio] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Track when options menu is shown/hidden
  useEffect(() => {
    if (isVisible) {
      debugLog('Options Menu: Main options menu opened', 'optionsSubmenu');
      // Log viewport and menu container dimensions
      setTimeout(() => {
        const container = document.querySelector('.options-menu-container');
        if (container) {
          const containerRect = container.getBoundingClientRect();
          debugLog(`Main Options Menu Dimensions: Container(${containerRect.width}x${containerRect.height}), Viewport(${window.innerWidth}x${window.innerHeight})`, 'optionsSubmenu');
          debugLog(`Main Options Menu Position: Top=${containerRect.top}, Left=${containerRect.left}`, 'optionsSubmenu');
        }
      }, 50);
    } else {
      debugLog('Options Menu: Main options menu closed', 'optionsSubmenu');
      // Close any open modals when main menu closes
      if (showAudio) {
        debugLog('Options Menu: Audio modal auto-closed (main menu closed)', 'optionsSubmenu');
        setShowAudio(false);
      }
      if (showHowToPlay) {
        debugLog('Options Menu: How to Play modal auto-closed (main menu closed)', 'optionsSubmenu');
        setShowHowToPlay(false);
      }
    }
  }, [isVisible, showAudio, showHowToPlay]);

  const menuItems = useMemo(() => [
    { label: 'Audio', action: () => {
        debugLog('Options Menu: Audio button pressed', 'optionsSubmenu');
        setShowAudio(true);
        // Log modal dimensions after state change
        setTimeout(() => {
          const modal = document.querySelector('.options-menu-modal');
          const content = document.querySelector('.options-menu-modal-content');
          if (modal && content) {
            const modalRect = modal.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();
            debugLog(`Audio Modal Dimensions: Modal(${modalRect.width}x${modalRect.height}), Content(${contentRect.width}x${contentRect.height}), Viewport(${window.innerWidth}x${window.innerHeight})`, 'optionsSubmenu');
            debugLog(`Audio Modal Position: Content Top=${contentRect.top}, Left=${contentRect.left}, Visible=${contentRect.top >= 0 && contentRect.left >= 0 && contentRect.bottom <= window.innerHeight && contentRect.right <= window.innerWidth}`, 'optionsSubmenu');
            
            // Debug flexbox properties
            const modalStyles = window.getComputedStyle(modal);
            debugLog(`Audio Modal CSS: display=${modalStyles.display}, align-items=${modalStyles.alignItems}, justify-content=${modalStyles.justifyContent}`, 'optionsSubmenu');
            
            // Calculate expected center position
            const expectedLeft = (window.innerWidth - contentRect.width) / 2;
            const expectedTop = (window.innerHeight - contentRect.height) / 2;
            debugLog(`Audio Expected Center: Left=${expectedLeft}, Top=${expectedTop} | Actual: Left=${contentRect.left}, Top=${contentRect.top}`, 'optionsSubmenu');
          }
        }, 100);
      }
    },
    { label: 'How to Play', action: () => {
        debugLog('Options Menu: How to Play button pressed', 'optionsSubmenu');
        setShowHowToPlay(true);
        // Log modal dimensions after state change
        setTimeout(() => {
          const modal = document.querySelector('.options-menu-modal');
          const content = document.querySelector('.options-menu-modal-content');
          if (modal && content) {
            const modalRect = modal.getBoundingClientRect();
            const contentRect = content.getBoundingClientRect();
            debugLog(`How to Play Modal Dimensions: Modal(${modalRect.width}x${modalRect.height}), Content(${contentRect.width}x${contentRect.height}), Viewport(${window.innerWidth}x${window.innerHeight})`, 'optionsSubmenu');
            debugLog(`How to Play Modal Position: Content Top=${contentRect.top}, Left=${contentRect.left}, Visible=${contentRect.top >= 0 && contentRect.left >= 0 && contentRect.bottom <= window.innerHeight && contentRect.right <= window.innerWidth}`, 'optionsSubmenu');
            
            // Debug flexbox properties
            const modalStyles = window.getComputedStyle(modal);
            debugLog(`How to Play Modal CSS: display=${modalStyles.display}, align-items=${modalStyles.alignItems}, justify-content=${modalStyles.justifyContent}, position=${modalStyles.position}`, 'optionsSubmenu');
            debugLog(`How to Play Modal CSS: padding=${modalStyles.padding}, margin=${modalStyles.margin}, box-sizing=${modalStyles.boxSizing}`, 'optionsSubmenu');
            
            const contentStyles = window.getComputedStyle(content);
            debugLog(`How to Play Content CSS: position=${contentStyles.position}, margin=${contentStyles.margin}, transform=${contentStyles.transform}`, 'optionsSubmenu');
            debugLog(`How to Play Content CSS: max-width=${contentStyles.maxWidth}, width=${contentStyles.width}, min-width=${contentStyles.minWidth}`, 'optionsSubmenu');
            
            // Check for interfering elements
            const mainMenuContainer = document.querySelector('.options-menu-container');
            if (mainMenuContainer) {
              const mainRect = mainMenuContainer.getBoundingClientRect();
              debugLog(`Main Menu Container Behind Modal: Position(${mainRect.left}, ${mainRect.top}), Size(${mainRect.width}x${mainRect.height})`, 'optionsSubmenu');
            }
            
            // Calculate expected center position
            const expectedLeft = (window.innerWidth - contentRect.width) / 2;
            const expectedTop = (window.innerHeight - contentRect.height) / 2;
            debugLog(`Expected Center Position: Left=${expectedLeft}, Top=${expectedTop} | Actual: Left=${contentRect.left}, Top=${contentRect.top}`, 'optionsSubmenu');
            debugLog(`Position Offset: X-offset=${contentRect.left - expectedLeft}, Y-offset=${contentRect.top - expectedTop}`, 'optionsSubmenu');
            
            // Text content dimensions
            const textDiv = content.querySelector('div[style*="color: #fff"]');
            if (textDiv) {
              const textRect = textDiv.getBoundingClientRect();
              debugLog(`How to Play Text Content Dimensions: ${textRect.width}x${textRect.height}, ScrollHeight=${textDiv.scrollHeight}, ClientHeight=${textDiv.clientHeight}`, 'optionsSubmenu');
            }
          }
        }, 100);
      }
    },
    { label: 'Continue', action: onContinue },
    { label: 'Return to Main Menu', action: onReturnToMain },
    { label: 'Exit Game', action: onExit }
  ], [onContinue, onReturnToMain, onExit]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      // Handle escape key for modals
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showAudio) {
          debugLog('Options Menu: Audio modal closed by Escape key', 'optionsSubmenu');
          setShowAudio(false);
          return;
        }
        if (showHowToPlay) {
          debugLog('Options Menu: How to Play modal closed by Escape key', 'optionsSubmenu');
          setShowHowToPlay(false);
          return;
        }
        onContinue();
        return;
      }

      // Skip navigation if modal is open
      if (showAudio || showHowToPlay) return;

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
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, selectedIndex, onContinue, menuItems, showAudio, showHowToPlay]);

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

  const handleModalBackgroundClick = (e, modalType) => {
    // Close modal if clicking on background (not content)
    if (e.target === e.currentTarget) {
      debugLog(`Options Menu: ${modalType} modal closed by background click`, 'optionsSubmenu');
      const modal = document.querySelector('.options-menu-modal');
      const content = document.querySelector('.options-menu-modal-content');
      if (modal && content) {
        const contentRect = content.getBoundingClientRect();
        debugLog(`${modalType.charAt(0).toUpperCase() + modalType.slice(1)} Modal Dimensions at background click: Content(${contentRect.width}x${contentRect.height}), ScrollTop=${content.scrollTop}`, 'optionsSubmenu');
      }
      if (modalType === 'audio') {
        setShowAudio(false);
      } else if (modalType === 'howToPlay') {
        setShowHowToPlay(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <div className="options-menu-overlay">
      <div className="options-menu-container">
        <div className="options-menu-content">
          <h1 className="options-menu-title">Game Paused</h1>
          
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

      {/* Audio Settings Modal - Rendered to body using portal */}
      {showAudio && createPortal(
        <div className="options-menu-modal" onClick={(e) => handleModalBackgroundClick(e, 'audio')} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="options-menu-modal-content" style={{
            position: 'static',
            margin: 0,
            transform: 'none'
          }}>
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
            
            <button
              className="options-menu-btn"
              onClick={() => {
                debugLog('Options Menu: Audio modal closed by Back button', 'optionsSubmenu');
                const modal = document.querySelector('.options-menu-modal');
                const content = document.querySelector('.options-menu-modal-content');
                if (modal && content) {
                  const contentRect = content.getBoundingClientRect();
                  debugLog(`Audio Modal Final Dimensions before close: Content(${contentRect.width}x${contentRect.height}), ScrollTop=${content.scrollTop}, ScrollHeight=${content.scrollHeight}`, 'optionsSubmenu');
                }
                setShowAudio(false);
              }}
              style={{ marginTop: "8px" }}
            >
              Back to Menu
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* How to Play Modal - Rendered to body using portal */}
      {showHowToPlay && createPortal(
        <div className="options-menu-modal" onClick={(e) => handleModalBackgroundClick(e, 'howToPlay')} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(12px)'
        }}>
          <div className="options-menu-modal-content" style={{
            position: 'static',
            margin: 0,
            transform: 'none'
          }}>
            <h3 className="options-menu-subtitle">How to Play</h3>
            
            <div style={{ 
              color: "#fff", 
              textAlign: "left", 
              fontSize: "0.9rem", 
              lineHeight: "1.4", 
              width: "100%"
            }}>
              <div style={{ marginBottom: "12px" }}>
                <h4 style={{ color: "#a259ff", marginBottom: "4px", fontSize: "1rem" }}>⌨️ Controls</h4>
                <div style={{ fontSize: "0.85rem" }}>
                  <b>Character:</b> Arrow Keys | <b>Pet:</b> WASD | <b>Attack:</b> Space | <b>Teleport:</b> T
                </div>
              </div>
              
              <div style={{ marginBottom: "12px" }}>
                <h4 style={{ color: "#a259ff", marginBottom: "4px", fontSize: "1rem" }}>🎮 Controller</h4>
                <div style={{ fontSize: "0.85rem" }}>
                  <b>Character:</b> Right Stick | <b>Pet:</b> Left Stick | <b>Attack:</b> RB | <b>Teleport:</b> LB
                </div>
              </div>
              
              <div>
                <h4 style={{ color: "#a259ff", marginBottom: "4px", fontSize: "1rem" }}>🎯 Gameplay</h4>
                <div style={{ fontSize: "0.85rem" }}>
                  Explore maps, defeat enemies with your pet, use portals to travel, and face the boss in Map X!
                </div>
              </div>
            </div>
            
            <button
              className="options-menu-btn"
              onClick={() => {
                debugLog('Options Menu: How to Play modal closed by Back button', 'optionsSubmenu');
                const modal = document.querySelector('.options-menu-modal');
                const content = document.querySelector('.options-menu-modal-content');
                if (modal && content) {
                  const contentRect = content.getBoundingClientRect();
                  debugLog(`How to Play Modal Final Dimensions before close: Content(${contentRect.width}x${contentRect.height}), ScrollTop=${content.scrollTop}, ScrollHeight=${content.scrollHeight}`, 'optionsSubmenu');
                }
                setShowHowToPlay(false);
              }}
              style={{ marginTop: "12px" }}
            >
              Back to Menu
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default OptionsMenu;
