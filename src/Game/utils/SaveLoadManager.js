/**
 * Save/Load Game Manager
 * Handles saving and loading complete game state to/from localStorage
 */

import { debugLog } from '../../development/utils/Debug.js';

export default class SaveLoadManager {
  constructor() {
    this.maxSaveSlots = 3;
    this.saveKeyPrefix = 'ratgame_save_';
  }

  /**
   * Save complete game state to a specific slot
   * @param {number} slot - Save slot number (1-3)
   * @param {Object} gameState - Complete game state object
   * @returns {boolean} - Success status
   */
  saveGame(slot, gameState) {
    debugLog(`[SAVE] Starting save operation to slot ${slot}`, 'saving');
    debugLog(`[SAVE] Input gameState structure:`, 'saving');
    debugLog(`[SAVE] - gameState exists: ${!!gameState}`, 'saving');
    
    if (slot < 1 || slot > this.maxSaveSlots) {
      const errorMsg = `Invalid save slot: ${slot}. Must be 1-${this.maxSaveSlots}`;
      console.error(errorMsg);
      debugLog(`[SAVE] ERROR: ${errorMsg}`, 'saving');
      return false;
    }

    try {
      debugLog(`[SAVE] Analyzing input gameState...`, 'saving');
      debugLog(`[SAVE] - currentMap: ${gameState.currentMap || 'null'}`, 'saving');
      debugLog(`[SAVE] - gameSeed: ${gameState.gameSeed || 'null'}`, 'saving');
      debugLog(`[SAVE] - character exists: ${!!gameState.character}`, 'saving');
      debugLog(`[SAVE] - character.position exists: ${!!gameState.character?.position}`, 'saving');
      debugLog(`[SAVE] - pet exists: ${!!gameState.pet}`, 'saving');
      debugLog(`[SAVE] - camera exists: ${!!gameState.camera}`, 'saving');
      debugLog(`[SAVE] - enemies count: ${gameState.enemies?.length || 0}`, 'saving');
      
      // Create comprehensive save data
      debugLog(`[SAVE] Building save data structure...`, 'saving');
      const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        dateCreated: new Date().toLocaleString(),
        
        // Core game state
        currentMap: gameState.currentMap,
        gameSeed: gameState.gameSeed,
        
        // Character state
        character: {
          position: gameState.character?.position ? { ...gameState.character.position } : { x: 0, y: 0 },
          health: gameState.character?.health || 3,
          maxHealth: gameState.character?.maxHealth || 3,
          level: gameState.character?.level || 1,
          experience: gameState.character?.experience || 0,
          direction: gameState.character?.direction || 'right',
          isAlive: gameState.character?.isAlive !== false,
          bounds: gameState.character?.bounds || null
        },
        
        // Pet state
        pet: gameState.pet ? {
          position: gameState.pet.position ? { ...gameState.pet.position } : { x: 100, y: 100 },
          mapId: gameState.pet.mapId,
          currentLevel: gameState.pet.currentLevel,
          direction: gameState.pet.direction,
          isAutoFollowing: gameState.pet.isAutoFollowing || false,
          projectiles: [], // Don't save active projectiles, they'll be recreated
          attackCooldowns: {
            canRangedAttack: gameState.pet.attackCooldowns?.canRangedAttack || true,
            lastRangedAttackTime: gameState.pet.attackCooldowns?.lastRangedAttackTime || 0
          }
        } : null,
        
        // Camera state
        camera: gameState.camera ? {
          position: gameState.camera.position ? { ...gameState.camera.position } : { x: 0, y: 0 },
          zoom: gameState.camera.zoom || 1,
          targetPosition: gameState.camera.targetPosition ? { ...gameState.camera.targetPosition } : null
        } : null,
        
        // Enemy states (for current map)
        enemies: gameState.enemies ? gameState.enemies.map(enemy => ({
          id: enemy.id || `${enemy.type}_${enemy.position?.x || 0}_${enemy.position?.y || 0}`,
          type: enemy.type,
          position: enemy.position ? { ...enemy.position } : { x: 0, y: 0 },
          currentHP: enemy.currentHP,
          maxHP: enemy.maxHP,
          isAlive: enemy.isAlive,
          state: enemy.state,
          direction: enemy.direction || 'right',
          scale: enemy.scale || 1.0,
          isAttacking: enemy.isAttacking || false,
          attackCooldownStart: enemy.attackCooldownStart || 0,
          lastAIUpdate: enemy.lastAIUpdate || 0,
          mapId: gameState.currentMap
        })) : [],
        
        // Map progression state
        mapsVisited: gameState.mapsVisited || [],
        currentMapSeed: gameState.currentMapSeed || null,
        
        // Game settings/state
        gameTime: gameState.gameTime || 0,
        score: gameState.score || 0,
        
        // Debug states (optional)
        debugStates: {
          hitRegDebugEnabled: gameState.debugStates?.hitRegDebugEnabled || false,
          coordinateDebugEnabled: gameState.debugStates?.coordinateDebugEnabled || false
        }
      };

      debugLog(`[SAVE] Save data structure built successfully:`, 'saving');
      debugLog(`[SAVE] - Version: ${saveData.version}`, 'saving');
      debugLog(`[SAVE] - Timestamp: ${saveData.timestamp}`, 'saving');
      debugLog(`[SAVE] - Date: ${saveData.dateCreated}`, 'saving');
      debugLog(`[SAVE] - Current Map: ${saveData.currentMap}`, 'saving');
      debugLog(`[SAVE] - Character position: (${saveData.character.position.x}, ${saveData.character.position.y})`, 'saving');
      debugLog(`[SAVE] - Character health: ${saveData.character.health}/${saveData.character.maxHealth}`, 'saving');
      debugLog(`[SAVE] - Pet data: ${saveData.pet ? 'Present' : 'Null'}`, 'saving');
      if (saveData.pet) {
        debugLog(`[SAVE] - Pet position: (${saveData.pet.position.x}, ${saveData.pet.position.y})`, 'saving');
        debugLog(`[SAVE] - Pet level: ${saveData.pet.currentLevel}`, 'saving');
      }
      debugLog(`[SAVE] - Camera data: ${saveData.camera ? 'Present' : 'Null'}`, 'saving');
      if (saveData.camera) {
        debugLog(`[SAVE] - Camera position: (${saveData.camera.position.x}, ${saveData.camera.position.y})`, 'saving');
        debugLog(`[SAVE] - Camera zoom: ${saveData.camera.zoom}`, 'saving');
      }
      debugLog(`[SAVE] - Enemy count: ${saveData.enemies.length}`, 'saving');

      const saveKey = this.saveKeyPrefix + slot;
      debugLog(`[SAVE] Attempting to save to localStorage with key: ${saveKey}`, 'saving');
      
      const saveDataString = JSON.stringify(saveData);
      debugLog(`[SAVE] Serialized data size: ${saveDataString.length} characters`, 'saving');
      
      localStorage.setItem(saveKey, saveDataString);
      debugLog(`[SAVE] Data successfully written to localStorage`, 'saving');
      
      // Verify the save by reading it back
      const verification = localStorage.getItem(saveKey);
      debugLog(`[SAVE] Verification read: ${verification ? 'SUCCESS' : 'FAILED'}`, 'saving');
      debugLog(`[SAVE] Verification length: ${verification ? verification.length : 0} characters`, 'saving');
      
      console.log(`Game saved successfully to slot ${slot}:`, saveData);
      debugLog(`[SAVE] Save operation completed successfully for slot ${slot}`, 'saving');
      return true;
      
    } catch (error) {
      console.error(`Failed to save game to slot ${slot}:`, error);
      debugLog(`[SAVE] ERROR: Save operation failed for slot ${slot}`, 'saving');
      debugLog(`[SAVE] ERROR: ${error.message}`, 'saving');
      debugLog(`[SAVE] ERROR: Stack trace: ${error.stack}`, 'saving');
      return false;
    }
  }

  /**
   * Load game state from a specific slot
   * @param {number} slot - Save slot number (1-3)
   * @returns {Object|null} - Loaded game state or null if failed
   */
  loadGame(slot) {
    debugLog(`[LOAD] Starting load operation from slot ${slot}`, 'loading');
    
    if (slot < 1 || slot > this.maxSaveSlots) {
      const errorMsg = `Invalid save slot: ${slot}. Must be 1-${this.maxSaveSlots}`;
      console.error(errorMsg);
      debugLog(`[LOAD] ERROR: ${errorMsg}`, 'loading');
      return null;
    }

    try {
      const saveKey = this.saveKeyPrefix + slot;
      debugLog(`[LOAD] Attempting to read from localStorage with key: ${saveKey}`, 'loading');
      
      const saveDataString = localStorage.getItem(saveKey);
      debugLog(`[LOAD] Raw data retrieved: ${saveDataString ? 'Present' : 'Null'}`, 'loading');
      
      if (!saveDataString) {
        const msg = `No save data found in slot ${slot}`;
        console.log(msg);
        debugLog(`[LOAD] ${msg}`, 'loading');
        return null;
      }

      debugLog(`[LOAD] Raw data length: ${saveDataString.length} characters`, 'loading');
      debugLog(`[LOAD] First 100 characters: ${saveDataString.substring(0, 100)}...`, 'loading');
      
      debugLog(`[LOAD] Attempting to parse JSON data...`, 'loading');
      const saveData = JSON.parse(saveDataString);
      debugLog(`[LOAD] JSON parsing successful`, 'loading');
      
      // Validate save data
      debugLog(`[LOAD] Validating save data structure...`, 'loading');
      debugLog(`[LOAD] - Version exists: ${!!saveData.version}`, 'loading');
      debugLog(`[LOAD] - Version value: ${saveData.version}`, 'loading');
      debugLog(`[LOAD] - Current map exists: ${!!saveData.currentMap}`, 'loading');
      debugLog(`[LOAD] - Current map value: ${saveData.currentMap}`, 'loading');
      debugLog(`[LOAD] - Character exists: ${!!saveData.character}`, 'loading');
      debugLog(`[LOAD] - Character position exists: ${!!saveData.character?.position}`, 'loading');
      
      if (!saveData.version || !saveData.currentMap || !saveData.character) {
        const errorMsg = `Invalid save data in slot ${slot}`;
        console.error(errorMsg);
        debugLog(`[LOAD] ERROR: ${errorMsg}`, 'loading');
        debugLog(`[LOAD] ERROR: Missing required fields - version: ${!!saveData.version}, currentMap: ${!!saveData.currentMap}, character: ${!!saveData.character}`, 'loading');
        return null;
      }

      debugLog(`[LOAD] Save data validation passed`, 'loading');
      debugLog(`[LOAD] Loaded save data details:`, 'loading');
      debugLog(`[LOAD] - Version: ${saveData.version}`, 'loading');
      debugLog(`[LOAD] - Timestamp: ${saveData.timestamp}`, 'loading');
      debugLog(`[LOAD] - Date created: ${saveData.dateCreated}`, 'loading');
      debugLog(`[LOAD] - Current map: ${saveData.currentMap}`, 'loading');
      debugLog(`[LOAD] - Game seed: ${saveData.gameSeed}`, 'loading');
      debugLog(`[LOAD] - Character position: (${saveData.character.position.x}, ${saveData.character.position.y})`, 'loading');
      debugLog(`[LOAD] - Character health: ${saveData.character.health}/${saveData.character.maxHealth}`, 'loading');
      debugLog(`[LOAD] - Character level: ${saveData.character.level}`, 'loading');
      debugLog(`[LOAD] - Pet data present: ${!!saveData.pet}`, 'loading');
      if (saveData.pet) {
        debugLog(`[LOAD] - Pet position: (${saveData.pet.position.x}, ${saveData.pet.position.y})`, 'loading');
        debugLog(`[LOAD] - Pet level: ${saveData.pet.currentLevel}`, 'loading');
        debugLog(`[LOAD] - Pet map ID: ${saveData.pet.mapId}`, 'loading');
      }
      debugLog(`[LOAD] - Camera data present: ${!!saveData.camera}`, 'loading');
      if (saveData.camera) {
        debugLog(`[LOAD] - Camera position: (${saveData.camera.position.x}, ${saveData.camera.position.y})`, 'loading');
        debugLog(`[LOAD] - Camera zoom: ${saveData.camera.zoom}`, 'loading');
      }
      debugLog(`[LOAD] - Enemy count: ${saveData.enemies ? saveData.enemies.length : 0}`, 'loading');
      if (saveData.enemies && saveData.enemies.length > 0) {
        debugLog(`[LOAD] - First enemy: ${saveData.enemies[0].type} at (${saveData.enemies[0].position.x}, ${saveData.enemies[0].position.y})`, 'loading');
      }

      console.log(`Game loaded successfully from slot ${slot}:`, saveData);
      debugLog(`[LOAD] Load operation completed successfully for slot ${slot}`, 'loading');
      return saveData;
      
    } catch (error) {
      console.error(`Failed to load game from slot ${slot}:`, error);
      debugLog(`[LOAD] ERROR: Load operation failed for slot ${slot}`, 'loading');
      debugLog(`[LOAD] ERROR: ${error.message}`, 'loading');
      debugLog(`[LOAD] ERROR: Stack trace: ${error.stack}`, 'loading');
      return null;
    }
  }

  /**
   * Delete save data from a specific slot
   * @param {number} slot - Save slot number (1-3)
   * @returns {boolean} - Success status
   */
  deleteSave(slot) {
    if (slot < 1 || slot > this.maxSaveSlots) {
      console.error(`Invalid save slot: ${slot}. Must be 1-${this.maxSaveSlots}`);
      return false;
    }

    try {
      const saveKey = this.saveKeyPrefix + slot;
      localStorage.removeItem(saveKey);
      console.log(`Save data deleted from slot ${slot}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to delete save from slot ${slot}:`, error);
      return false;
    }
  }

  /**
   * Get save slot information for UI display
   * @param {number} slot - Save slot number (1-3)
   * @returns {Object|null} - Save slot info or null if empty
   */
  getSaveSlotInfo(slot) {
    if (slot < 1 || slot > this.maxSaveSlots) {
      return null;
    }

    try {
      const saveKey = this.saveKeyPrefix + slot;
      const saveDataString = localStorage.getItem(saveKey);
      
      if (!saveDataString) {
        return null;
      }

      const saveData = JSON.parse(saveDataString);
      
      return {
        slot: slot,
        exists: true,
        dateCreated: saveData.dateCreated || 'Unknown',
        timestamp: saveData.timestamp || 0,
        currentMap: saveData.currentMap || 'Unknown',
        characterLevel: saveData.character?.level || 1,
        gameTime: saveData.gameTime || 0,
        version: saveData.version || '1.0'
      };
      
    } catch (error) {
      console.error(`Failed to get save slot ${slot} info:`, error);
      return null;
    }
  }

  /**
   * Get all save slots information
   * @returns {Array} - Array of save slot info objects
   */
  getAllSaveSlots() {
    const slots = [];
    for (let i = 1; i <= this.maxSaveSlots; i++) {
      const slotInfo = this.getSaveSlotInfo(i);
      slots.push(slotInfo || {
        slot: i,
        exists: false,
        dateCreated: null,
        timestamp: 0,
        currentMap: null,
        characterLevel: 0,
        gameTime: 0,
        version: null
      });
    }
    return slots;
  }

  /**
   * Check if localStorage is available
   * @returns {boolean} - localStorage availability
   */
  isLocalStorageAvailable() {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.error('localStorage is not available:', error);
      return false;
    }
  }

  /**
   * Get total storage usage for save files
   * @returns {Object} - Storage usage info
   */
  getStorageUsage() {
    let totalSize = 0;
    let saveCount = 0;
    
    for (let i = 1; i <= this.maxSaveSlots; i++) {
      const saveKey = this.saveKeyPrefix + i;
      const saveData = localStorage.getItem(saveKey);
      if (saveData) {
        totalSize += saveData.length;
        saveCount++;
      }
    }
    
    return {
      totalSize: totalSize,
      saveCount: saveCount,
      totalSizeKB: (totalSize / 1024).toFixed(2),
      availableSlots: this.maxSaveSlots - saveCount
    };
  }
}
