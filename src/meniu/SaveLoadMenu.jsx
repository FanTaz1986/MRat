import React, { useState, useEffect } from 'react';
import './SaveLoadMenu.css';
import SaveLoadManager from '../Game/utils/SaveLoadManager';

const SaveLoadMenu = ({ 
  mode = 'load', // 'load' or 'save'
  onClose, 
  onLoadGame, 
  onSaveGame,
  currentGameState = null,
  isInGame = false 
}) => {
  const [saveLoadManager] = useState(new SaveLoadManager());
  const [saveSlots, setSaveSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Load save slots on component mount
  useEffect(() => {
    const refreshSlots = () => {
      const slots = saveLoadManager.getAllSaveSlots();
      setSaveSlots(slots);
    };
    refreshSlots();
  }, [saveLoadManager]);

  const refreshSaveSlots = () => {
    const slots = saveLoadManager.getAllSaveSlots();
    setSaveSlots(slots);
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    setMessage('');
  };

  const handleLoadGame = async () => {
    if (!selectedSlot) {
      setMessage('Please select a save slot to load.');
      return;
    }

    if (!selectedSlot.exists) {
      setMessage('Selected slot is empty.');
      return;
    }

    setIsLoading(true);
    try {
      const gameState = saveLoadManager.loadGame(selectedSlot.slot);
      if (gameState) {
        setMessage(`Game loaded from slot ${selectedSlot.slot}`);
        if (onLoadGame) {
          onLoadGame(gameState);
        }
        setTimeout(() => {
          onClose?.();
        }, 1000);
      } else {
        setMessage('Failed to load game. Save file may be corrupted.');
      }
    } catch (error) {
      console.error('Load error:', error);
      setMessage('Failed to load game.');
    }
    setIsLoading(false);
  };

  const handleSaveGame = async () => {
    if (!selectedSlot) {
      setMessage('Please select a save slot.');
      return;
    }

    if (!currentGameState) {
      setMessage('No game state available to save.');
      return;
    }

    setIsLoading(true);
    try {
      const success = saveLoadManager.saveGame(selectedSlot.slot, currentGameState);
      if (success) {
        setMessage(`Game saved to slot ${selectedSlot.slot}`);
        refreshSaveSlots(); // Refresh to show updated save info
        setTimeout(() => {
          onClose?.();
        }, 1000);
      } else {
        setMessage('Failed to save game.');
      }
    } catch (error) {
      console.error('Save error:', error);
      setMessage('Failed to save game.');
    }
    setIsLoading(false);
  };

  const handleDeleteSave = () => {
    if (!selectedSlot || !selectedSlot.exists) {
      setMessage('No save to delete.');
      return;
    }

    if (window.confirm(`Are you sure you want to delete save slot ${selectedSlot.slot}?`)) {
      const success = saveLoadManager.deleteSave(selectedSlot.slot);
      if (success) {
        setMessage(`Save slot ${selectedSlot.slot} deleted.`);
        refreshSaveSlots();
        setSelectedSlot(null);
      } else {
        setMessage('Failed to delete save.');
      }
    }
  };

  const formatGameTime = (gameTime) => {
    if (!gameTime) return 'Unknown';
    const minutes = Math.floor(gameTime / 60000);
    const seconds = Math.floor((gameTime % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const getMapDisplayName = (mapId) => {
    const mapNames = {
      'maparea0': 'Beach Area',
      'maparea1': 'Forest Area', 
      'maparea2': 'Mountain Area',
      'mapareax': 'Boss Area'
    };
    return mapNames[mapId] || mapId;
  };

  return (
    <div className="save-load-menu-overlay">
      <div className="save-load-menu">
        <div className="save-load-header">
          <h2>{mode === 'save' ? 'Save Game' : 'Load Game'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="save-slots-container">
          {saveSlots.map((slot) => (
            <div 
              key={slot.slot}
              className={`save-slot ${selectedSlot?.slot === slot.slot ? 'selected' : ''} ${!slot.exists ? 'empty' : ''}`}
              onClick={() => handleSlotSelect(slot)}
            >
              <div className="slot-header">
                <span className="slot-number">Slot {slot.slot}</span>
                {slot.exists && (
                  <span className="slot-date">{slot.dateCreated}</span>
                )}
              </div>
              
              {slot.exists ? (
                <div className="slot-details">
                  <div className="slot-info">
                    <span className="slot-map">📍 {getMapDisplayName(slot.currentMap)}</span>
                    <span className="slot-level">⭐ Level {slot.characterLevel}</span>
                    <span className="slot-time">⏱️ {formatGameTime(slot.gameTime)}</span>
                  </div>
                </div>
              ) : (
                <div className="slot-empty">
                  <span>Empty Slot</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="save-load-actions">
          {mode === 'load' ? (
            <>
              <button 
                className="action-btn load-btn"
                onClick={handleLoadGame}
                disabled={!selectedSlot || !selectedSlot.exists || isLoading}
              >
                {isLoading ? 'Loading...' : 'Load Game'}
              </button>
              <button 
                className="action-btn delete-btn"
                onClick={handleDeleteSave}
                disabled={!selectedSlot || !selectedSlot.exists || isLoading}
              >
                Delete Save
              </button>
            </>
          ) : (
            <button 
              className="action-btn save-btn"
              onClick={handleSaveGame}
              disabled={!selectedSlot || isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Game'}
            </button>
          )}
          
          <button className="action-btn cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>

        {message && (
          <div className={`save-load-message ${message.includes('Failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <div className="storage-info">
          Storage: {saveLoadManager.getStorageUsage().saveCount}/{saveLoadManager.maxSaveSlots} slots used
        </div>
      </div>
    </div>
  );
};

export default SaveLoadMenu;
