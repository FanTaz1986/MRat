/**
 * Game State Manager
 * Collects and restores complete game state for save/load functionality
 */

import { debugLog } from '../../development/utils/Debug.js';

export default class GameStateManager {
  constructor() {
    this.currentGameState = null;
  }

  /**
   * Collect current game state from all game systems
   * @param {Object} gameReferences - References to game objects
   * @returns {Object} - Complete game state
   */
  collectCurrentGameState(gameReferences) {
    try {
      const {
        mapManager,
        currentMap,
        gameSeed,
        playerHealth,
        bossHealth,
        maxBossHealth,
        showBossUI
      } = gameReferences;

      // Enhanced debug logging for save operations
      const isEnhancedDebugEnabled = window.game?.debugConfig?.logCategories?.saving;
      
      if (isEnhancedDebugEnabled) {
        debugLog('🔍 === ENHANCED SAVE DEBUG START ===', 'saving');
        debugLog('🔍 Input gameReferences analysis:', 'saving');
        debugLog(`🔍 - mapManager exists: ${!!mapManager}`, 'saving');
        debugLog(`🔍 - currentMap parameter: "${currentMap}"`, 'saving');
        debugLog(`🔍 - currentMap type: ${typeof currentMap}`, 'saving');
        debugLog(`🔍 - gameSeed: ${gameSeed}`, 'saving');
        debugLog(`🔍 - playerHealth: ${playerHealth}`, 'saving');
        
        if (mapManager) {
          debugLog(`🔍 MapManager state check:`, 'saving');
          debugLog(`🔍 - mapManager.currentMap: "${mapManager.currentMap}"`, 'saving');
          debugLog(`🔍 - mapManager.currentMap type: ${typeof mapManager.currentMap}`, 'saving');
          
          // Critical comparison
          if (currentMap !== mapManager.currentMap) {
            debugLog(`🔍 🚨 CRITICAL MISMATCH DETECTED!`, 'saving');
            debugLog(`🔍 Input currentMap: "${currentMap}" != MapManager currentMap: "${mapManager.currentMap}"`, 'saving');
            debugLog(`🔍 This will cause the save file to show wrong map!`, 'saving');
            debugLog(`🔍 currentMap will be used in final gameState, causing the bug!`, 'saving');
          } else {
            debugLog(`🔍 ✅ Maps match correctly`, 'saving');
          }
          
          // Check character position for context
          if (mapManager.character && mapManager.character.position) {
            const pos = mapManager.character.position;
            debugLog(`🔍 Character position: (${pos.x}, ${pos.y})`, 'saving');
            
            // Map area analysis based on position
            if (pos.x > 1000 && pos.x < 3000 && pos.y > 1000 && pos.y < 2000) {
              debugLog(`🔍 Position analysis: Looks like BOSS ROOM (MapX) coordinates!`, 'saving');
            } else if (pos.x > 10000 && pos.y > 10000) {
              debugLog(`🔍 Position analysis: Looks like large map (Map1/Map2) coordinates!`, 'saving');
            } else if (pos.x < 5000 && pos.y < 5000) {
              debugLog(`🔍 Position analysis: Looks like beach (Map0) coordinates!`, 'saving');
            } else {
              debugLog(`🔍 Position analysis: Unknown map area for these coordinates`, 'saving');
            }
          }
        }
      }

      if (!mapManager) {
        console.warn('GameStateManager: MapManager not available for state collection');
        return null;
      }

      // Get character state
      const character = mapManager.character; // Direct property access instead of getCharacter()
      console.log('=== CHARACTER STATE COLLECTION DEBUG ===');
      console.log('Character object exists:', !!character);
      console.log('MapManager exists:', !!mapManager);
      console.log('MapManager.character property exists:', !!(mapManager && mapManager.character));
      console.log('MapManager.getCharacter function exists:', !!(mapManager && mapManager.getCharacter));
      
      if (character) {
        console.log('Character position object:', character.position);
        console.log('Character position x:', character.position?.x);
        console.log('Character position y:', character.position?.y);
        console.log('Character position x type:', typeof character.position?.x);
        console.log('Character position y type:', typeof character.position?.y);
        console.log('Character health:', character.health);
        console.log('Character sprite exists:', !!character.sprite);
        if (character.sprite) {
          console.log('Character sprite position:', character.sprite.position);
          console.log('Character sprite position x:', character.sprite.position?.x);
          console.log('Character sprite position y:', character.sprite.position?.y);
        }
        
        // Check if position is NaN or undefined
        const posX = character.position?.x;
        const posY = character.position?.y;
        console.log('Position X is NaN:', isNaN(posX));
        console.log('Position Y is NaN:', isNaN(posY));
        console.log('Position X is undefined:', posX === undefined);
        console.log('Position Y is undefined:', posY === undefined);
        console.log('Position X || 0 result:', posX || 0);
        console.log('Position Y || 0 result:', posY || 0);
      } else {
        console.log('No character found - will use default position (0,0)');
      }
      
      const characterState = character && character.position ? {
        position: { x: character.position.x || 0, y: character.position.y || 0 },
        health: playerHealth || character.health || 3,
        maxHealth: character.maxHealth || 3,
        level: character.level || 1,
        experience: character.experience || 0,
        direction: character.direction || 'right',
        isAlive: character.isAlive !== false,
        bounds: character.bounds || null
      } : {
        position: { x: 0, y: 0 },
        health: playerHealth || 3,
        maxHealth: 3,
        level: 1,
        experience: 0,
        direction: 'right',
        isAlive: true,
        bounds: null
      };

      console.log('=== CHARACTER STATE COLLECTION RESULT ===');
      console.log('Final characterState:', characterState);
      console.log('Character position in state:', characterState.position);
      console.log('=== END CHARACTER STATE COLLECTION ===');

      // Get pet state
      const pet = window.globalPet || (mapManager.getPet ? mapManager.getPet() : null);
      const petState = pet && pet.position ? {
        position: { x: pet.position.x || 0, y: pet.position.y || 0 },
        mapId: pet.mapId || currentMap,
        currentLevel: pet.currentLevel || 0,
        direction: pet.direction || 'right',
        isAutoFollowing: pet.isAutoFollowing || false,
        projectiles: [], // Don't save active projectiles
        attackCooldowns: {
          canRangedAttack: pet.canRangedAttack || true,
          lastRangedAttackTime: pet.lastRangedAttackTime || 0
        }
      } : {
        position: { x: 100, y: 100 },
        mapId: currentMap,
        currentLevel: 0,
        direction: 'right',
        isAutoFollowing: false,
        projectiles: [],
        attackCooldowns: {
          canRangedAttack: true,
          lastRangedAttackTime: 0
        }
      };

      // Get camera state
      const camera = mapManager.camera || (mapManager.getCamera ? mapManager.getCamera() : null);
      const cameraState = camera && camera.position ? {
        position: { x: camera.position.x || 0, y: camera.position.y || 0 },
        zoom: camera.zoom || 1,
        targetPosition: camera.targetPosition ? { x: camera.targetPosition.x || 0, y: camera.targetPosition.y || 0 } : null
      } : {
        position: { x: 0, y: 0 },
        zoom: 1,
        targetPosition: null
      };

      // Get enemy states from enemy manager
      const enemyManager = window.globalEnemyManager;
      const enemyStates = enemyManager && enemyManager.enemies ? 
        enemyManager.enemies.map((enemy, index) => ({
          id: enemy.id || `${enemy.type}_${index}_${enemy.position?.x || 0}_${enemy.position?.y || 0}`,
          type: enemy.type,
          position: { x: enemy.position?.x || 0, y: enemy.position?.y || 0 },
          currentHP: enemy.currentHP,
          maxHP: enemy.maxHP,
          isAlive: enemy.isAlive,
          state: enemy.state,
          direction: enemy.direction || 'right',
          scale: enemy.currentScale || 1.0,
          isAttacking: enemy.isAttacking || false,
          attackCooldownStart: enemy.attackCooldownStart || 0,
          lastAIUpdate: enemy.lastAIUpdate || 0,
          mapId: currentMap
        })) : [];

      // Get boss state (if in boss map) - use actual boss entity health, not React state
      let bossState = null;
      if (currentMap === 'mapareax') {
        // Try to get actual boss health from MapX instance
        if (mapManager && mapManager.mapXInstance) {
          try {
            const bossInfo = mapManager.mapXInstance.getBossInfo();
            debugLog(`[SAVING] Boss info retrieved: isVisible=${bossInfo.isVisible}, health=${bossInfo.currentHealth}/${bossInfo.maxHealth}, position=(${bossInfo.position?.x}, ${bossInfo.position?.y})`, 'saving');
            
            // Always save boss state if we're on boss map and boss exists, regardless of visibility
            if (bossInfo.currentHealth > 0 || bossInfo.maxHealth > 0) {
              bossState = {
                health: bossInfo.currentHealth,
                maxHealth: bossInfo.maxHealth,
                isActive: true, // Force active if boss exists
                isVisible: bossInfo.isVisible,
                position: bossInfo.position ? {
                  x: bossInfo.position.x,
                  y: bossInfo.position.y
                } : { x: 300, y: 300 }, // Fallback to spawn position
                mapId: 'mapareax'
              };
              debugLog(`[SAVING] Boss state from entity: health=${bossInfo.currentHealth}/${bossInfo.maxHealth}, position=(${bossState.position.x}, ${bossState.position.y}), visible=${bossInfo.isVisible}`, 'saving');
            } else {
              debugLog(`[SAVING] Boss entity has no health data: health=${bossInfo.currentHealth}/${bossInfo.maxHealth}`, 'saving');
            }
          } catch (error) {
            debugLog(`[SAVING] Error getting boss info: ${error.message}`, 'saving');
          }
        } else {
          debugLog(`[SAVING] MapManager or MapX instance not available: mapManager=${!!mapManager}, mapXInstance=${!!(mapManager && mapManager.mapXInstance)}`, 'saving');
        }
        
        // Fallback to React state if MapX not available (shouldn't happen in boss room)
        if (!bossState && showBossUI) {
          bossState = {
            health: bossHealth || 40,
            maxHealth: maxBossHealth || 40,
            isActive: showBossUI || false,
            mapId: 'mapareax'
          };
          debugLog(`[SAVING] Boss state from React fallback: health=${bossHealth}/${maxBossHealth}`, 'saving');
        }
      }

      // Collect complete game state
      const gameState = {
        version: '1.0',
        timestamp: Date.now(),
        currentMap: currentMap || 'maparea0',
        gameSeed: gameSeed || Date.now(),
        
        character: characterState,
        pet: petState,
        camera: cameraState,
        enemies: enemyStates,
        boss: bossState,
        
        // Map progression
        mapsVisited: this.getMapsVisited(mapManager),
        currentMapSeed: this.getCurrentMapSeed(mapManager),
        
        // Game stats
        gameTime: this.getGameTime(),
        score: this.getScore(),
        
        // UI states
        ui: {
          playerHealth: playerHealth || 3,
          showBossUI: showBossUI || false,
          bossHealth: bossHealth || 40,
          maxBossHealth: maxBossHealth || 40
        },
        
        // Debug states
        debugStates: {
          hitRegDebugEnabled: this.getDebugState('hitRegDebugEnabled'),
          coordinateDebugEnabled: this.getDebugState('coordinateDebugEnabled')
        }
      };

      // Enhanced debug logging for final game state
      if (isEnhancedDebugEnabled) {
        debugLog('🔍 === FINAL GAME STATE ANALYSIS ===', 'saving');
        debugLog(`🔍 Final currentMap in gameState: "${gameState.currentMap}"`, 'saving');
        debugLog(`🔍 How currentMap was determined:`, 'saving');
        debugLog(`🔍 - Input currentMap: "${currentMap}"`, 'saving');
        debugLog(`🔍 - Fallback value: "maparea0"`, 'saving');
        debugLog(`🔍 - Formula used: currentMap || 'maparea0'`, 'saving');
        debugLog(`🔍 - Result: "${gameState.currentMap}"`, 'saving');
        
        debugLog(`🔍 Character position in final state: (${gameState.character?.position?.x}, ${gameState.character?.position?.y})`, 'saving');
        debugLog(`🔍 Camera position in final state: (${gameState.camera?.position?.x}, ${gameState.camera?.position?.y})`, 'saving');
        debugLog(`🔍 Boss state exists: ${!!gameState.boss}`, 'saving');
        
        if (gameState.currentMap !== mapManager.currentMap) {
          debugLog(`🔍 🚨 CRITICAL: Final currentMap doesn't match MapManager!`, 'saving');
          debugLog(`🔍 This explains the save file issue!`, 'saving');
        }
        
        debugLog('🔍 === ENHANCED SAVE DEBUG END ===', 'saving');
      }

      console.log('GameStateManager: Collected game state:', gameState);
      this.currentGameState = gameState;
      return gameState;

    } catch (error) {
      console.error('GameStateManager: Error collecting game state:', error);
      return null;
    }
  }

  /**
   * Restore game state to all game systems
   * @param {Object} gameState - Complete game state to restore
   * @param {Object} gameReferences - References to game objects
   * @returns {boolean} - Success status
   */
  async restoreGameState(gameState, gameReferences) {
    try {
      console.log('GameStateManager: Restoring game state:', gameState);
      debugLog(`[RESTORE] Starting game state restoration`, 'loading');
      debugLog(`[RESTORE] Game state structure validation:`, 'loading');
      debugLog(`[RESTORE] - gameState exists: ${!!gameState}`, 'loading');
      debugLog(`[RESTORE] - currentMap: ${gameState?.currentMap || 'null'}`, 'loading');
      debugLog(`[RESTORE] - character data: ${!!gameState?.character}`, 'loading');
      debugLog(`[RESTORE] - pet data: ${!!gameState?.pet}`, 'loading');
      debugLog(`[RESTORE] - camera data: ${!!gameState?.camera}`, 'loading');
      debugLog(`[RESTORE] - enemy count: ${gameState?.enemies?.length || 0}`, 'loading');
      
      const {
        mapManager,
        setCurrentMap,
        setPlayerHealth,
        setBossHealth,
        setMaxBossHealth,
        setShowBossUI
      } = gameReferences;

      debugLog(`[RESTORE] Game references validation:`, 'loading');
      debugLog(`[RESTORE] - mapManager exists: ${!!mapManager}`, 'loading');
      debugLog(`[RESTORE] - setCurrentMap exists: ${!!setCurrentMap}`, 'loading');
      debugLog(`[RESTORE] - setPlayerHealth exists: ${!!setPlayerHealth}`, 'loading');

      if (!gameState || !mapManager) {
        const errorMsg = 'Invalid game state or missing map manager';
        console.error('GameStateManager: ' + errorMsg);
        debugLog(`[RESTORE] ERROR: ${errorMsg}`, 'loading');
        return false;
      }

      // Restore map first (this might trigger map change)
      if (gameState.currentMap) {
        console.log(`GameStateManager: Switching to map ${gameState.currentMap}`);
        debugLog(`[RESTORE] Attempting to switch to map: ${gameState.currentMap}`, 'loading');
        await this.restoreMap(gameState.currentMap, mapManager, setCurrentMap);
        debugLog(`[RESTORE] Map restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] WARNING: No currentMap in save data`, 'loading');
      }

      // Wait a frame for map to initialize
      debugLog(`[RESTORE] Waiting for map initialization...`, 'loading');
      await new Promise(resolve => setTimeout(resolve, 100));
      debugLog(`[RESTORE] Map initialization wait completed`, 'loading');

      // Restore character state
      if (gameState.character) {
        debugLog(`[RESTORE] Restoring character state...`, 'loading');
        debugLog(`[RESTORE] - Character position: (${gameState.character.position?.x}, ${gameState.character.position?.y})`, 'loading');
        debugLog(`[RESTORE] - Character health: ${gameState.character.health}`, 'loading');
        await this.restoreCharacterState(gameState.character, mapManager, gameState.camera);
        debugLog(`[RESTORE] Character state restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] WARNING: No character data in save state`, 'loading');
      }

      // Restore pet state  
      if (gameState.pet) {
        debugLog(`[RESTORE] Restoring pet state...`, 'loading');
        debugLog(`[RESTORE] - Pet position: (${gameState.pet.position?.x}, ${gameState.pet.position?.y})`, 'loading');
        debugLog(`[RESTORE] - Pet level: ${gameState.pet.currentLevel}`, 'loading');
        await this.restorePetState(gameState.pet, mapManager);
        debugLog(`[RESTORE] Pet state restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] No pet data in save state`, 'loading');
      }

      // Restore camera state
      if (gameState.camera) {
        debugLog(`[RESTORE] Restoring camera state...`, 'loading');
        debugLog(`[RESTORE] - Camera position: (${gameState.camera.position?.x}, ${gameState.camera.position?.y})`, 'loading');
        debugLog(`[RESTORE] - Camera zoom: ${gameState.camera.zoom}`, 'loading');
        await this.restoreCameraState(gameState.camera, mapManager);
        debugLog(`[RESTORE] Camera state restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] No camera data in save state`, 'loading');
      }

      // Restore enemy states
      if (gameState.enemies && gameState.enemies.length > 0) {
        debugLog(`[RESTORE] Restoring enemy states (${gameState.enemies.length} enemies)...`, 'loading');
        await this.restoreEnemyStates(gameState.enemies);
        debugLog(`[RESTORE] Enemy states restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] No enemy data in save state`, 'loading');
      }

      // Restore boss state
      if (gameState.boss) {
        debugLog(`[RESTORE] Restoring boss state...`, 'loading');
        debugLog(`[RESTORE] - Boss health: ${gameState.boss.health}/${gameState.boss.maxHealth}`, 'loading');
        debugLog(`[RESTORE] - Boss position: (${gameState.boss.position?.x || 'N/A'}, ${gameState.boss.position?.y || 'N/A'})`, 'loading');
        await this.restoreBossState(gameState.boss, setBossHealth, setMaxBossHealth, setShowBossUI, mapManager);
        debugLog(`[RESTORE] Boss state restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] No boss data in save state`, 'loading');
        
        // Special case: If we're loading into a boss map (mapareax) but no boss data exists,
        // we need to trigger the boss initialization
        if (gameState.currentMap === 'mapareax') {
          debugLog(`[RESTORE] Loading into boss map without boss data - attempting to initialize boss`, 'loading');
          
          // Try to access mapXInstance through mapManager
          if (mapManager && mapManager.mapXInstance) {
            debugLog(`[RESTORE] MapX instance found, checking boss state`, 'loading');
            
            try {
              // Check if boss exists but isn't spawned
              if (mapManager.mapXInstance.boss) {
                debugLog(`[RESTORE] Boss entity exists, checking spawn state`, 'loading');
                
                if (!mapManager.mapXInstance.bossSpawned) {
                  debugLog(`[RESTORE] Boss exists but not spawned - activating boss fight`, 'loading');
                  mapManager.mapXInstance.spawnBoss();
                } else {
                  debugLog(`[RESTORE] Boss already spawned`, 'loading');
                }
              } else {
                debugLog(`[RESTORE] No boss entity found - initializing boss`, 'loading');
                await mapManager.mapXInstance.initializeBoss();
                
                // Also spawn the boss immediately
                if (mapManager.mapXInstance.boss) {
                  debugLog(`[RESTORE] Boss initialized - spawning for fight`, 'loading');
                  mapManager.mapXInstance.spawnBoss();
                }
              }
              
              debugLog(`[RESTORE] Boss initialization/spawn completed`, 'loading');
            } catch (bossError) {
              console.warn('Error initializing/spawning boss on load:', bossError);
              debugLog(`[RESTORE] Boss initialization failed: ${bossError.message}`, 'loading');
            }
          } else {
            debugLog(`[RESTORE] MapX instance not found - boss cannot be initialized`, 'loading');
            console.warn('Loading into boss map but mapXInstance not available');
          }
        }
      }

      // Restore UI states
      if (gameState.ui) {
        debugLog(`[RESTORE] Restoring UI states...`, 'loading');
        debugLog(`[RESTORE] - Player health: ${gameState.ui.playerHealth}`, 'loading');
        if (setPlayerHealth && typeof gameState.ui.playerHealth === 'number') {
          setPlayerHealth(gameState.ui.playerHealth);
          debugLog(`[RESTORE] Player health set to: ${gameState.ui.playerHealth}`, 'loading');
        }
        debugLog(`[RESTORE] UI states restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] No UI data in save state`, 'loading');
      }

      // Restore debug states
      if (gameState.debugStates) {
        debugLog(`[RESTORE] Restoring debug states...`, 'loading');
        this.restoreDebugStates(gameState.debugStates);
        debugLog(`[RESTORE] Debug states restoration completed`, 'loading');
      } else {
        debugLog(`[RESTORE] No debug states in save data`, 'loading');
      }

      console.log('GameStateManager: Game state restored successfully');
      debugLog(`[RESTORE] === GAME STATE RESTORATION COMPLETED SUCCESSFULLY ===`, 'loading');
      return true;

    } catch (error) {
      console.error('GameStateManager: Error restoring game state:', error);
      debugLog(`[RESTORE] ERROR: Game state restoration failed`, 'loading');
      debugLog(`[RESTORE] ERROR: ${error.message}`, 'loading');
      debugLog(`[RESTORE] ERROR: Stack trace: ${error.stack}`, 'loading');
      return false;
    }
  }

  // Helper methods for collecting state

  getMapsVisited(mapManager) {
    return mapManager.mapsVisited || ['maparea0'];
  }

  getCurrentMapSeed(mapManager) {
    return mapManager.currentMapSeed || null;
  }

  getGameTime() {
    // Try to get from a global game timer or calculate based on session start
    return window.gameStartTime ? Date.now() - window.gameStartTime : 0;
  }

  getScore() {
    // Try to get from a global score system
    return window.gameScore || 0;
  }

  getDebugState(key) {
    // Try to get debug states from various sources
    if (window.globalPet && typeof window.globalPet[key] !== 'undefined') {
      return window.globalPet[key];
    }
    return false;
  }

  // Helper methods for restoring state

  async restoreMap(mapId, mapManager, setCurrentMap) {
    try {
      debugLog(`[RESTORE] Starting map restoration to: ${mapId}`, 'loading');
      
      // Use loadMap instead of switchToMap
      if (mapManager.loadMap && typeof mapManager.loadMap === 'function') {
        debugLog(`[RESTORE] Calling mapManager.loadMap(${mapId})`, 'loading');
        
        // Create a promise to wait for map loading to complete
        const mapLoadPromise = new Promise((resolve) => {
          mapManager.loadMap(mapId, resolve);
        });
        
        await mapLoadPromise;
        debugLog(`[RESTORE] Map loading completed for: ${mapId}`, 'loading');
        
        // CRITICAL: Check and repair PIXI app after map loading
        // Map loading can corrupt the PIXI app renderer/stage
        debugLog(`[RESTORE] Checking PIXI app state after map loading`, 'loading');
        
        // Get reference to the PIXI app (assuming it's accessible through mapManager or globally)
        const pixiApp = mapManager.app || window.pixiApp?.current || window.game?.pixiApp;
        
        if (pixiApp) {
          debugLog(`[RESTORE] PIXI app exists after map load: renderer=${!!pixiApp.renderer}, stage=${!!pixiApp.stage}`, 'loading');
          
          // Check if PIXI app was corrupted by map loading
          const rendererMissing = !pixiApp.renderer || pixiApp.renderer === false;
          const stageMissing = !pixiApp.stage || pixiApp.stage === false;
          const needsRepair = rendererMissing || stageMissing;
          
          if (needsRepair) {
            debugLog(`[RESTORE] CRITICAL: Map loading corrupted PIXI app! renderer=${rendererMissing}, stage=${stageMissing}`, 'loading');
            console.warn(`Map loading corrupted PIXI app - renderer missing: ${rendererMissing}, stage missing: ${stageMissing}`);
            
            // This is a critical error that needs to be handled by the calling code
            // We'll log it but can't easily repair it from here without access to the full PIXI setup
            debugLog(`[RESTORE] PIXI corruption detected - calling code should handle repair`, 'loading');
          } else {
            debugLog(`[RESTORE] PIXI app survived map loading intact`, 'loading');
          }
        } else {
          debugLog(`[RESTORE] Warning: Could not access PIXI app for post-load validation`, 'loading');
        }
      } else {
        debugLog(`[RESTORE] Warning: mapManager.loadMap not available`, 'loading');
      }
      
      // Update React state
      if (setCurrentMap && typeof setCurrentMap === 'function') {
        setCurrentMap(mapId);
        debugLog(`[RESTORE] React state updated to: ${mapId}`, 'loading');
      } else {
        debugLog(`[RESTORE] Warning: setCurrentMap function not available`, 'loading');
      }
      
      debugLog(`[RESTORE] Map restoration completed for: ${mapId}`, 'loading');
    } catch (error) {
      console.error('GameStateManager: Error restoring map:', error);
      debugLog(`[RESTORE] Error restoring map ${mapId}: ${error.message}`, 'loading');
    }
  }

  async restoreCharacterState(characterState, mapManager, savedCameraState = null) {
    try {
      debugLog(`[RESTORE] === CHARACTER RESTORATION START ===`, 'loading');
      debugLog(`[RESTORE] characterState: ${JSON.stringify(characterState, null, 2)}`, 'loading');
      debugLog(`[RESTORE] savedCameraState: ${JSON.stringify(savedCameraState, null, 2)}`, 'loading');
      
      const character = mapManager.character; // Direct property access instead of getCharacter()
      debugLog(`[RESTORE] Character object exists: ${!!character}`, 'loading');
      debugLog(`[RESTORE] Character position exists: ${!!(character && character.position)}`, 'loading');
      debugLog(`[RESTORE] characterState.position exists: ${!!(characterState && characterState.position)}`, 'loading');
      
      if (character && characterState.position) {
        debugLog(`[RESTORE] Character position validation:`, 'loading');
        debugLog(`[RESTORE] - Saved character position: (${characterState.position.x}, ${characterState.position.y})`, 'loading');
        
        // Check if character position is at spawn (0,0) which might indicate a positioning issue
        const isAtOrigin = (characterState.position.x === 0 && characterState.position.y === 0);
        debugLog(`[RESTORE] - Character is at origin (0,0): ${isAtOrigin}`, 'loading');
        
        if (isAtOrigin) {
          debugLog(`[RESTORE] WARNING: Character saved at origin (0,0) - checking if this is correct...`, 'loading');
          
          // Use saved camera position for validation (since camera hasn't been restored yet)
          if (savedCameraState && savedCameraState.position) {
            const savedCameraPos = savedCameraState.position;
            debugLog(`[RESTORE] - Saved camera position available: (${savedCameraPos.x.toFixed(1)}, ${savedCameraPos.y.toFixed(1)})`, 'loading');
            
            const cameraDistance = Math.sqrt(
              Math.pow(savedCameraPos.x - characterState.position.x, 2) +
              Math.pow(savedCameraPos.y - characterState.position.y, 2)
            );
            debugLog(`[RESTORE] - Saved camera distance from character: ${cameraDistance.toFixed(1)}px`, 'loading');
            debugLog(`[RESTORE] - Distance threshold check: ${cameraDistance.toFixed(1)} > 5000 = ${cameraDistance > 5000}`, 'loading');
            
            // If camera is very far from character origin, this suggests position inconsistency
            if (cameraDistance > 5000) {
              debugLog(`[RESTORE] ERROR: Character at origin but saved camera very far away - position inconsistency detected!`, 'loading');
              debugLog(`[RESTORE] - Character position: (${characterState.position.x}, ${characterState.position.y})`, 'loading');
              debugLog(`[RESTORE] - Saved camera position: (${savedCameraPos.x.toFixed(1)}, ${savedCameraPos.y.toFixed(1)})`, 'loading');
              
              // Correct character position to be near saved camera center
              const correctedX = savedCameraPos.x + 400; // Center-ish of screen
              const correctedY = savedCameraPos.y + 300;
              
              debugLog(`[RESTORE] FIXING: Moving character from (${characterState.position.x}, ${characterState.position.y}) to (${correctedX.toFixed(1)}, ${correctedY.toFixed(1)})`, 'loading');
              
              character.position.x = correctedX;
              character.position.y = correctedY;
              
              if (character.sprite) {
                character.sprite.position.set(character.position.x, character.position.y);
                debugLog(`[RESTORE] - Character sprite position updated`, 'loading');
              } else {
                debugLog(`[RESTORE] - WARNING: No character sprite to update`, 'loading');
              }
              
              debugLog(`[RESTORE] Character position corrected to prevent white void issue`, 'loading');
            } else {
              // Position seems reasonable, use saved position
              character.position.x = characterState.position.x;
              character.position.y = characterState.position.y;
              
              if (character.sprite) {
                character.sprite.position.set(character.position.x, character.position.y);
              }
              debugLog(`[RESTORE] Character position (0,0) accepted - saved camera is nearby`, 'loading');
            }
          } else {
            // No saved camera data, use saved position as-is but warn
            debugLog(`[RESTORE] WARNING: No saved camera data available for validation!`, 'loading');
            debugLog(`[RESTORE] - savedCameraState exists: ${!!savedCameraState}`, 'loading');
            debugLog(`[RESTORE] - savedCameraState.position exists: ${!!(savedCameraState && savedCameraState.position)}`, 'loading');
            
            character.position.x = characterState.position.x;
            character.position.y = characterState.position.y;
            
            if (character.sprite) {
              character.sprite.position.set(character.position.x, character.position.y);
            }
            debugLog(`[RESTORE] Character position set to saved values (no saved camera for validation)`, 'loading');
          }
        } else {
          // Normal case: use saved position
          character.position.x = characterState.position.x;
          character.position.y = characterState.position.y;
          
          if (character.sprite) {
            character.sprite.position.set(character.position.x, character.position.y);
          }
          debugLog(`[RESTORE] Character position set to: (${character.position.x}, ${character.position.y})`, 'loading');
        }
        
        if (typeof characterState.health === 'number') {
          character.health = characterState.health;
          debugLog(`[RESTORE] Character health set to: ${character.health}`, 'loading');
        }
        if (typeof characterState.maxHealth === 'number') {
          character.maxHealth = characterState.maxHealth;
          debugLog(`[RESTORE] Character maxHealth set to: ${character.maxHealth}`, 'loading');
        }
        if (characterState.direction) {
          character.direction = characterState.direction;
          debugLog(`[RESTORE] Character direction set to: ${character.direction}`, 'loading');
        }
        
        console.log('GameStateManager: Character state restored');
        debugLog(`[RESTORE] Final character position: (${character.position.x}, ${character.position.y})`, 'loading');
        debugLog(`[RESTORE] === CHARACTER RESTORATION END ===`, 'loading');
      } else {
        debugLog(`[RESTORE] ERROR: Cannot restore character state - character: ${!!character}, characterState.position: ${!!(characterState && characterState.position)}`, 'loading');
      }
    } catch (error) {
      console.error('GameStateManager: Error restoring character state:', error);
      debugLog(`[RESTORE] ERROR in character restoration: ${error.message}`, 'loading');
      debugLog(`[RESTORE] ERROR stack: ${error.stack}`, 'loading');
    }
  }

  async restorePetState(petState, mapManager) {
    try {
      const pet = window.globalPet || (mapManager.getPet ? mapManager.getPet() : null);
      if (pet && petState.position) {
        // Safe position restoration
        try {
          pet.position.x = petState.position.x;
          pet.position.y = petState.position.y;
        } catch (error) {
          console.warn('Error setting pet position:', error);
          // Initialize position if it doesn't exist
          pet.position = { x: petState.position.x, y: petState.position.y };
        }
        
        // Safe sprite position update
        if (pet.sprite) {
          try {
            // Check if sprite position exists and is valid
            if (pet.sprite.position && typeof pet.sprite.position.set === 'function') {
              pet.sprite.position.set(pet.position.x, pet.position.y);
            }
          } catch (error) {
            console.warn('Error setting pet sprite position:', error);
          }
        }
        
        if (petState.direction) {
          pet.direction = petState.direction;
        }
        if (typeof petState.isAutoFollowing === 'boolean') {
          pet.isAutoFollowing = petState.isAutoFollowing;
        }
        if (petState.attackCooldowns) {
          if (typeof petState.attackCooldowns.canRangedAttack === 'boolean') {
            pet.canRangedAttack = petState.attackCooldowns.canRangedAttack;
          }
          if (typeof petState.attackCooldowns.lastRangedAttackTime === 'number') {
            pet.lastRangedAttackTime = petState.attackCooldowns.lastRangedAttackTime;
          }
        }
        
        console.log('GameStateManager: Pet state restored');
      }
    } catch (error) {
      console.error('GameStateManager: Error restoring pet state:', error);
    }
  }

  async restoreCameraState(cameraState, mapManager) {
    try {
      const camera = mapManager.camera || (mapManager.getCamera ? mapManager.getCamera() : null);
      if (camera && cameraState.position) {
        camera.position.x = cameraState.position.x;
        camera.position.y = cameraState.position.y;
        
        if (typeof cameraState.zoom === 'number') {
          camera.zoom = cameraState.zoom;
        }
        
        console.log('GameStateManager: Camera state restored');
      }
    } catch (error) {
      console.error('GameStateManager: Error restoring camera state:', error);
    }
  }

  async restoreEnemyStates(enemyStates) {
    try {
      const enemyManager = window.globalEnemyManager;
      if (enemyManager && enemyStates.length > 0) {
        // Clear existing enemies first
        if (enemyManager.clearAllEnemies) {
          enemyManager.clearAllEnemies();
        }
        
        // Restore each enemy
        for (const enemyState of enemyStates) {
          if (enemyManager.restoreEnemy) {
            enemyManager.restoreEnemy(enemyState);
          }
        }
        
        console.log(`GameStateManager: Restored ${enemyStates.length} enemies`);
      }
    } catch (error) {
      console.error('GameStateManager: Error restoring enemy states:', error);
    }
  }

  async restoreBossState(bossState, setBossHealth, setMaxBossHealth, setShowBossUI, mapManager) {
    try {
      if (bossState.isActive && setBossHealth && setMaxBossHealth && setShowBossUI) {
        // Update UI state
        setBossHealth(bossState.health);
        setMaxBossHealth(bossState.maxHealth);
        setShowBossUI(true);
        
        // Also update the actual boss entity if available
        if (mapManager && mapManager.mapXInstance && mapManager.mapXInstance.boss) {
          try {
            const boss = mapManager.mapXInstance.boss;
            boss.currentHP = bossState.health;
            boss.maxHP = bossState.maxHealth;
            
            // Restore boss position if available
            if (bossState.position) {
              boss.position.set(bossState.position.x, bossState.position.y);
              debugLog(`[RESTORE] Boss entity position restored: (${bossState.position.x}, ${bossState.position.y})`, 'loading');
            }
            
            debugLog(`[RESTORE] Boss entity health restored: ${bossState.health}/${bossState.maxHealth}`, 'loading');
          } catch (bossEntityError) {
            debugLog(`[RESTORE] Error updating boss entity health: ${bossEntityError.message}`, 'loading');
          }
        } else {
          debugLog(`[RESTORE] Boss entity not available for health restoration`, 'loading');
        }
        
        console.log('GameStateManager: Boss state restored');
      }
    } catch (error) {
      console.error('GameStateManager: Error restoring boss state:', error);
    }
  }

  restoreDebugStates(debugStates) {
    try {
      if (window.globalPet && debugStates) {
        if (typeof debugStates.hitRegDebugEnabled === 'boolean') {
          window.globalPet.setHitRegDebugEnabled(debugStates.hitRegDebugEnabled);
        }
        if (typeof debugStates.coordinateDebugEnabled === 'boolean') {
          window.globalPet.setCoordinateDebugEnabled(debugStates.coordinateDebugEnabled);
        }
        
        console.log('GameStateManager: Debug states restored');
      }
    } catch (error) {
      console.error('GameStateManager: Error restoring debug states:', error);
    }
  }
}
