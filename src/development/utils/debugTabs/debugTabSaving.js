import React from 'react';
import { debugLog } from '../Debug.js';

/**
 * Create the Saving debug tab
 */
export function createSavingTab(debugConfig, toggleLogging, forceUpdate, debugLogFunction) {
  
  const handleDeepSaveAnalysis = () => {
    debugLog('=== DEEP SAVE ANALYSIS START ===', 'saving');
    
    // Step 1: Check current game state sources
    debugLog('STEP 1: Checking current game state sources...', 'saving');
    
    // Check current map from multiple sources
    debugLog('Map source analysis:', 'saving');
    if (window.gameMapManager) {
      debugLog(`- gameMapManager.currentMap: ${window.gameMapManager.currentMap}`, 'saving');
      debugLog(`- gameMapManager exists: ${!!window.gameMapManager}`, 'saving');
      debugLog(`- gameMapManager.app exists: ${!!window.gameMapManager.app}`, 'saving');
      debugLog(`- gameMapManager.character exists: ${!!window.gameMapManager.character}`, 'saving');
      debugLog(`- gameMapManager.camera exists: ${!!window.gameMapManager.camera}`, 'saving');
      
      if (window.gameMapManager.character && window.gameMapManager.character.position) {
        const pos = window.gameMapManager.character.position;
        debugLog(`- character position: (${pos.x}, ${pos.y})`, 'saving');
      }
    } else {
      debugLog('- gameMapManager: NOT FOUND', 'saving');
    }
    
    // Check React state (if available)
    debugLog('React state analysis:', 'saving');
    try {
      // Try to get current map from React store
      if (window.gameStore) {
        debugLog(`- gameStore.currentMap: ${window.gameStore.currentMap}`, 'saving');
      }
      
      // Check global game object
      if (window.game) {
        debugLog(`- window.game.currentMap: ${window.game.currentMap}`, 'saving');
        debugLog(`- window.game.mapManager: ${!!window.game.mapManager}`, 'saving');
        if (window.game.mapManager) {
          debugLog(`- window.game.mapManager.currentMap: ${window.game.mapManager.currentMap}`, 'saving');
        }
      } else {
        debugLog('- window.game: NOT FOUND', 'saving');
      }
    } catch (error) {
      debugLog(`React state check error: ${error.message}`, 'saving');
    }
    
    // Step 2: Simulate GameStateManager collection process
    debugLog('STEP 2: Simulating GameStateManager.collectCurrentGameState...', 'saving');
    
    if (window.gameStateManager && window.gameMapManager) {
      try {
        // Create the same gameReferences that would be passed to collectCurrentGameState
        const gameReferences = {
          mapManager: window.gameMapManager,
          currentMap: window.gameMapManager.currentMap || 'UNKNOWN',
          gameSeed: window.gameSeed || Date.now(),
          playerHealth: 3,
          bossHealth: 40,
          maxBossHealth: 40,
          showBossUI: false
        };
        
        debugLog('Game references being passed to collectCurrentGameState:', 'saving');
        debugLog(`- mapManager: ${!!gameReferences.mapManager}`, 'saving');
        debugLog(`- currentMap parameter: ${gameReferences.currentMap}`, 'saving');
        debugLog(`- gameSeed: ${gameReferences.gameSeed}`, 'saving');
        debugLog(`- playerHealth: ${gameReferences.playerHealth}`, 'saving');
        
        // Call the actual collection method
        debugLog('Calling GameStateManager.collectCurrentGameState...', 'saving');
        const collectedState = window.gameStateManager.collectCurrentGameState(gameReferences);
        
        if (collectedState) {
          debugLog('Collection successful! Analyzing result:', 'saving');
          debugLog(`- Collected currentMap: ${collectedState.currentMap}`, 'saving');
          debugLog(`- Collected gameSeed: ${collectedState.gameSeed}`, 'saving');
          debugLog(`- Character position: (${collectedState.character?.position?.x}, ${collectedState.character?.position?.y})`, 'saving');
          debugLog(`- Camera position: (${collectedState.camera?.position?.x}, ${collectedState.camera?.position?.y})`, 'saving');
          debugLog(`- Boss state: ${collectedState.boss ? 'EXISTS' : 'NULL'}`, 'saving');
          
          // Show all keys in the collected state
          debugLog(`- All collected keys: ${Object.keys(collectedState).join(', ')}`, 'saving');
          
          // Compare input vs output
          debugLog('INPUT vs OUTPUT comparison:', 'saving');
          debugLog(`- Input currentMap: ${gameReferences.currentMap}`, 'saving');
          debugLog(`- Output currentMap: ${collectedState.currentMap}`, 'saving');
          debugLog(`- Maps match: ${gameReferences.currentMap === collectedState.currentMap}`, 'saving');
          
          if (gameReferences.currentMap !== collectedState.currentMap) {
            debugLog('🚨 MISMATCH DETECTED! Input and output maps are different!', 'saving');
            debugLog('This explains why the save shows wrong map!', 'saving');
          }
          
        } else {
          debugLog('🚨 Collection FAILED - returned null/undefined', 'saving');
        }
        
      } catch (error) {
        debugLog(`GameStateManager collection error: ${error.message}`, 'saving');
        debugLog(`Stack trace: ${error.stack}`, 'saving');
      }
    } else {
      debugLog('🚨 Required managers not available:', 'saving');
      debugLog(`- gameStateManager: ${!!window.gameStateManager}`, 'saving');
      debugLog(`- gameMapManager: ${!!window.gameMapManager}`, 'saving');
    }
    
    // Step 3: Check what would actually be saved
    debugLog('STEP 3: Checking what would be saved to localStorage...', 'saving');
    
    if (window.saveLoadManager) {
      debugLog('SaveLoadManager available - checking save process...', 'saving');
      
      // Check existing save data to see the pattern
      for (let slot = 1; slot <= 3; slot++) {
        const existing = window.saveLoadManager.loadGame(slot);
        if (existing) {
          debugLog(`Existing save slot ${slot}:`, 'saving');
          debugLog(`- Map: ${existing.currentMap}`, 'saving');
          debugLog(`- Timestamp: ${new Date(existing.timestamp).toLocaleString()}`, 'saving');
          debugLog(`- Character: (${existing.character?.position?.x}, ${existing.character?.position?.y})`, 'saving');
        }
      }
    } else {
      debugLog('🚨 SaveLoadManager not available', 'saving');
    }
    
    debugLog('=== DEEP SAVE ANALYSIS END ===', 'saving');
  };
  
  const handleTestSave = () => {
    debugLog('Testing save functionality...', 'saving');
    
    // Get current game state for testing
    if (window.gameStateManager && window.gameMapManager) {
      try {
        const gameReferences = {
          mapManager: window.gameMapManager,
          currentMap: window.gameMapManager.currentMap || 'maparea0',
          gameSeed: window.gameSeed || Date.now(),
          playerHealth: 3,
          bossHealth: 40,
          gameStarted: true,
          timestamp: Date.now()
        };
        
        debugLog('Collecting current game state...', 'saving');
        const gameState = window.gameStateManager.collectCurrentGameState(gameReferences);
        
        debugLog('Attempting to save to slot 1...', 'saving');
        const success = window.saveLoadManager.saveGame(1, gameState);
        
        if (success) {
          debugLog(' Test save SUCCESSFUL!', 'saving');
        } else {
          debugLog(' Test save FAILED!', 'saving');
        }
      } catch (error) {
        debugLog(`Test save error: ${error.message}`, 'saving');
        debugLog(`Test save stack: ${error.stack}`, 'saving');
      }
    } else {
      debugLog('Test save: Required managers not available', 'saving');
    }
  };
  
  const handleTestLoad = () => {
    debugLog('Testing load functionality...', 'loading');
    
    if (window.saveLoadManager) {
      try {
        const saveData = window.saveLoadManager.loadGame(1);
        
        if (saveData) {
          debugLog(' Save data found in slot 1', 'loading');
          debugLog(`Save data keys: ${Object.keys(saveData).join(', ')}`, 'loading');
          
          if (window.gameStateManager && window.gameMapManager) {
            debugLog('Attempting to restore game state...', 'loading');
            
            const gameReferences = {
              mapManager: window.gameMapManager,
              saveData: saveData,
              forceUpdate: forceUpdate
            };
            
            const success = window.gameStateManager.restoreGameState(gameReferences);
            
            if (success) {
              debugLog(' Test load SUCCESSFUL!', 'loading');
            } else {
              debugLog(' Test load FAILED!', 'loading');
            }
          } else {
            debugLog('Test load: GameStateManager or MapManager not available for restoration', 'loading');
          }
        } else {
          debugLog('Test load: No save data in slot 1', 'loading');
        }
      } catch (error) {
        debugLog(`Test load error: ${error.message}`, 'loading');
        debugLog(`Test load stack: ${error.stack}`, 'loading');
      }
    } else {
      debugLog('Test load: SaveLoadManager not available', 'loading');
    }
  };
  
  const handleClearAllSaves = () => {
    debugLog('Clearing all save slots...', 'saving');
    
    if (window.saveLoadManager) {
      try {
        for (let slot = 1; slot <= 3; slot++) {
          const success = window.saveLoadManager.deleteSave(slot);
          debugLog(`Clear slot ${slot}: ${success ? 'SUCCESS' : 'FAILED'}`, 'saving');
        }
        debugLog('All save slots cleared', 'saving');
      } catch (error) {
        debugLog(`Clear saves error: ${error.message}`, 'saving');
      }
    } else {
      debugLog('Clear saves: SaveLoadManager not available', 'saving');
    }
  };
  
  const handleInspectLocalStorage = () => {
    debugLog('=== LOCALSTORAGE INSPECTION ===', 'saving');
    
    try {
      debugLog(`LocalStorage length: ${localStorage.length}`, 'saving');
      
      // Check for all game-related keys
      const gameKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('game') || key.includes('save') || key.includes('slot'))) {
          gameKeys.push(key);
        }
      }
      
      debugLog(`Game-related keys found: ${gameKeys.length}`, 'saving');
      
      // Inspect each game key
      gameKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          debugLog(`Key: ${key}`, 'saving');
          debugLog(`Size: ${value ? value.length : 0} characters`, 'saving');
          
          if (value) {
            try {
              const parsed = JSON.parse(value);
              debugLog(`Type: JSON object`, 'saving');
              debugLog(`Keys: ${Object.keys(parsed).join(', ')}`, 'saving');
              
              // Special handling for save data
              if (parsed.character) {
                debugLog(`Character position: (${parsed.character.position?.x}, ${parsed.character.position?.y})`, 'saving');
              }
              if (parsed.camera) {
                debugLog(`Camera position: (${parsed.camera.position?.x}, ${parsed.camera.position?.y})`, 'saving');
              }
              if (parsed.currentMap !== undefined) {
                debugLog(`Current map: ${parsed.currentMap}`, 'saving');
              }
              if (parsed.timestamp) {
                debugLog(`Timestamp: ${new Date(parsed.timestamp).toLocaleString()}`, 'saving');
              }
            } catch (parseError) {
              debugLog(`Type: String (not JSON)`, 'saving');
              debugLog(`Preview: ${value.substring(0, 100)}${value.length > 100 ? '...' : ''}`, 'saving');
            }
          }
          debugLog('---', 'saving');
        } catch (keyError) {
          debugLog(`Error reading key ${key}: ${keyError.message}`, 'saving');
        }
      });
      
      // Check specific save slots
      debugLog('=== SAVE SLOT DETAILS ===', 'saving');
      for (let slot = 1; slot <= 3; slot++) {
        const key = `game_save_slot_${slot}`;
        const data = localStorage.getItem(key);
        debugLog(`Slot ${slot} (${key}):`, 'saving');
        if (data) {
          try {
            const parsed = JSON.parse(data);
            debugLog(`- Valid JSON: YES`, 'saving');
            debugLog(`- Size: ${data.length} chars`, 'saving');
            debugLog(`- Character: ${parsed.character ? 'YES' : 'NO'}`, 'saving');
            debugLog(`- Camera: ${parsed.camera ? 'YES' : 'NO'}`, 'saving');
            debugLog(`- Map: ${parsed.currentMap || 'undefined'}`, 'saving');
            debugLog(`- Timestamp: ${parsed.timestamp ? new Date(parsed.timestamp).toLocaleString() : 'none'}`, 'saving');
          } catch (e) {
            debugLog(`- Valid JSON: NO (${e.message})`, 'saving');
          }
        } else {
          debugLog(`- Empty slot`, 'saving');
        }
      }
      
    } catch (error) {
      debugLog(`LocalStorage inspection error: ${error.message}`, 'saving');
    }
    
    debugLog('=== END LOCALSTORAGE INSPECTION ===', 'saving');
  };
  
  const handlePostLoadAnalysis = () => {
    debugLog('=== POST-LOAD ANALYSIS ===', 'loading');
    debugLog('Analyzing game state after load operation...', 'loading');
    
    // Wait a bit for everything to settle, then analyze
    setTimeout(() => {
      debugLog('=== POST-LOAD ANALYSIS (after 500ms delay) ===', 'loading');
      
      if (window.gameMapManager) {
        const mapManager = window.gameMapManager;
        debugLog(`Current Map: ${mapManager.currentMap}`, 'loading');
        debugLog(`MapManager app exists: ${!!mapManager.app}`, 'loading');
        
        // Check character after load
        const character = mapManager.character;
        debugLog(`Character exists after load: ${!!character}`, 'loading');
        if (character) {
          debugLog(`Character position: (${character.position?.x}, ${character.position?.y})`, 'loading');
          debugLog(`Character sprite exists: ${!!character.sprite}`, 'loading');
          if (character.sprite) {
            debugLog(`Character sprite visible: ${character.sprite.visible}`, 'loading');
            debugLog(`Character sprite position: (${character.sprite.position?.x}, ${character.sprite.position?.y})`, 'loading');
            debugLog(`Character sprite parent: ${character.sprite.parent?.constructor?.name || 'null'}`, 'loading');
          }
        }
        
        // Check camera after load
        const camera = mapManager.camera;
        debugLog(`Camera exists after load: ${!!camera}`, 'loading');
        if (camera) {
          debugLog(`Camera position: (${camera.position?.x}, ${camera.position?.y})`, 'loading');
          debugLog(`Camera zoom: ${camera.zoom}`, 'loading');
          debugLog(`Camera target: (${camera.targetPosition?.x || 'null'}, ${camera.targetPosition?.y || 'null'})`, 'loading');
        }
        
        // Check current map instance
        const mapInstance = mapManager.currentMapInstance;
        debugLog(`Current map instance: ${!!mapInstance}`, 'loading');
        if (mapInstance) {
          debugLog(`Map instance type: ${mapInstance.constructor.name}`, 'loading');
          debugLog(`Map container exists: ${!!mapInstance.container}`, 'loading');
          if (mapInstance.container) {
            debugLog(`Map container visible: ${mapInstance.container.visible}`, 'loading');
            debugLog(`Map container children: ${mapInstance.container.children.length}`, 'loading');
            debugLog(`Map container position: (${mapInstance.container.position?.x}, ${mapInstance.container.position?.y})`, 'loading');
          }
          
          // Check map layers
          if (mapInstance.backgroundLayer) {
            debugLog(`Background layer exists: ${!!mapInstance.backgroundLayer}`, 'loading');
            debugLog(`Background layer visible: ${mapInstance.backgroundLayer.visible}`, 'loading');
            debugLog(`Background layer children: ${mapInstance.backgroundLayer.children.length}`, 'loading');
          }
          
          if (mapInstance.propsLayer) {
            debugLog(`Props layer exists: ${!!mapInstance.propsLayer}`, 'loading');
            debugLog(`Props layer visible: ${mapInstance.propsLayer.visible}`, 'loading');
            debugLog(`Props layer children: ${mapInstance.propsLayer.children.length}`, 'loading');
          }
        }
        
        // Check PIXI stage
        if (mapManager.app && mapManager.app.stage) {
          const stage = mapManager.app.stage;
          debugLog(`PIXI Stage children count: ${stage.children.length}`, 'loading');
          debugLog(`PIXI Stage visible: ${stage.visible}`, 'loading');
          
          // List stage children
          stage.children.forEach((child, index) => {
            debugLog(`Stage child ${index}: ${child.constructor.name} (visible: ${child.visible})`, 'loading');
          });
        }
        
        // Check map container specifically
        if (mapManager.mapContainer) {
          debugLog(`MapContainer exists: ${!!mapManager.mapContainer}`, 'loading');
          debugLog(`MapContainer visible: ${mapManager.mapContainer.visible}`, 'loading');
          debugLog(`MapContainer children: ${mapManager.mapContainer.children.length}`, 'loading');
          debugLog(`MapContainer position: (${mapManager.mapContainer.position?.x}, ${mapManager.mapContainer.position?.y})`, 'loading');
        }
        
      } else {
        debugLog('ERROR: MapManager not available after load!', 'loading');
      }
      
      debugLog('=== END POST-LOAD ANALYSIS ===', 'loading');
    }, 500);
    
    debugLog('Post-load analysis scheduled for 500ms delay...', 'loading');
  };
  
  const handleRenderingDiagnostics = () => {
    debugLog('=== RENDERING DIAGNOSTICS ===', 'loading');
    
    if (window.gameMapManager) {
      const mapManager = window.gameMapManager;
      
      // Check PIXI app
      debugLog(`PIXI App exists: ${!!mapManager.app}`, 'loading');
      if (mapManager.app) {
        debugLog(`PIXI App renderer exists: ${!!mapManager.app.renderer}`, 'loading');
        if (mapManager.app.renderer) {
          debugLog(`PIXI App renderer type: ${mapManager.app.renderer.type}`, 'loading');
        }
        if (mapManager.app.view) {
          debugLog(`PIXI App view dimensions: ${mapManager.app.view.width}x${mapManager.app.view.height}`, 'loading');
        }
        debugLog(`PIXI App stage exists: ${!!mapManager.app.stage}`, 'loading');
        
        if (mapManager.app.stage) {
          debugLog(`Stage visible: ${mapManager.app.stage.visible}`, 'loading');
          debugLog(`Stage alpha: ${mapManager.app.stage.alpha}`, 'loading');
          debugLog(`Stage scale: (${mapManager.app.stage.scale.x}, ${mapManager.app.stage.scale.y})`, 'loading');
          debugLog(`Stage position: (${mapManager.app.stage.position.x}, ${mapManager.app.stage.position.y})`, 'loading');
          debugLog(`Stage children count: ${mapManager.app.stage.children.length}`, 'loading');
          
          // List all stage children
          mapManager.app.stage.children.forEach((child, index) => {
            debugLog(`  Child ${index}: ${child.constructor.name}`, 'loading');
            debugLog(`    - Visible: ${child.visible}`, 'loading');
            debugLog(`    - Alpha: ${child.alpha}`, 'loading');
            debugLog(`    - Position: (${child.position?.x || 'unknown'}, ${child.position?.y || 'unknown'})`, 'loading');
            debugLog(`    - Scale: (${child.scale?.x || 'unknown'}, ${child.scale?.y || 'unknown'})`, 'loading');
            if (child.children && child.children.length > 0) {
              debugLog(`    - Children: ${child.children.length}`, 'loading');
            }
          });
        }
      }
      
      // Check camera transform
      if (mapManager.camera) {
        debugLog(`Camera position: (${mapManager.camera.position?.x}, ${mapManager.camera.position?.y})`, 'loading');
        debugLog(`Camera zoom: ${mapManager.camera.zoom}`, 'loading');
        debugLog(`Camera bounds: ${JSON.stringify(mapManager.camera.bounds)}`, 'loading');
      }
      
      // Check viewport/canvas
      const canvas = document.querySelector('canvas');
      if (canvas) {
        debugLog(`Canvas found: ${canvas.width}x${canvas.height}`, 'loading');
        debugLog(`Canvas style: ${canvas.style.width}x${canvas.style.height}`, 'loading');
        debugLog(`Canvas visible: ${canvas.style.display !== 'none'}`, 'loading');
      } else {
        debugLog('No canvas element found!', 'loading');
      }
      
    } else {
      debugLog('ERROR: MapManager not available for rendering diagnostics!', 'loading');
    }
    
    debugLog('=== END RENDERING DIAGNOSTICS ===', 'loading');
  };
  
  const handleMapVisibilityCheck = () => {
    debugLog('=== MAP VISIBILITY CHECK ===', 'loading');
    
    if (window.gameMapManager) {
      const mapManager = window.gameMapManager;
      
      debugLog(`Current map: ${mapManager.currentMap}`, 'loading');
      debugLog(`Current map instance exists: ${!!mapManager.currentMapInstance}`, 'loading');
      
      // Check map manager''s layer containers
      const containers = [
        { name: 'backgroundLayer', obj: mapManager.backgroundLayer },
        { name: 'propsLayer', obj: mapManager.propsLayer },
        { name: 'characterLayer', obj: mapManager.characterLayer },
        { name: 'UILayer', obj: mapManager.UILayer }
      ];
      
      containers.forEach(({ name, obj }) => {
        if (obj) {
          debugLog(`${name}:`, 'loading');
          debugLog(`- Visible: ${obj.visible}`, 'loading');
          debugLog(`- Alpha: ${obj.alpha}`, 'loading');
          debugLog(`- Children: ${obj.children.length}`, 'loading');
          debugLog(`- Position: (${obj.position.x}, ${obj.position.y})`, 'loading');
        } else {
          debugLog(`${name}: NOT FOUND`, 'loading');
        }
      });
      
      // Check current map instance layers
      const mapInstance = mapManager.currentMapInstance;
      if (mapInstance) {
        debugLog(`Map instance layers:`, 'loading');
        const layers = [
          { name: 'backgroundLayer', obj: mapInstance.backgroundLayer },
          { name: 'propsLayer', obj: mapInstance.propsLayer },
          { name: 'container', obj: mapInstance.container }
        ];
        
        layers.forEach(({ name, obj }) => {
          if (obj) {
            debugLog(`- ${name}: visible=${obj.visible}, alpha=${obj.alpha}, children=${obj.children.length}`, 'loading');
          } else {
            debugLog(`- ${name}: NOT FOUND`, 'loading');
          }
        });
      }
      
    } else {
      debugLog('ERROR: MapManager not available for visibility check', 'loading');
    }
    
    debugLog('=== END MAP VISIBILITY CHECK ===', 'loading');
  };
  
  const handleGameStateAnalysis = () => {
    debugLog('=== GAME STATE ANALYSIS ===', 'saving');
    
    // Check global objects
    debugLog(`Window objects available:`, 'saving');
    debugLog(`- gameMapManager: ${!!window.gameMapManager}`, 'saving');
    debugLog(`- gameStateManager: ${!!window.gameStateManager}`, 'saving');
    debugLog(`- saveLoadManager: ${!!window.saveLoadManager}`, 'saving');
    debugLog(`- gameSeed: ${window.gameSeed || 'undefined'}`, 'saving');
    
    if (window.gameMapManager) {
      const mapManager = window.gameMapManager;
      debugLog(`MapManager state:`, 'saving');
      debugLog(`- Current map: ${mapManager.currentMap}`, 'saving');
      debugLog(`- App exists: ${!!mapManager.app}`, 'saving');
      debugLog(`- Character exists: ${!!mapManager.character}`, 'saving');
      debugLog(`- Camera exists: ${!!mapManager.camera}`, 'saving');
      debugLog(`- Current map instance: ${!!mapManager.currentMapInstance}`, 'saving');
      
      if (mapManager.character) {
        const char = mapManager.character;
        debugLog(`Character details:`, 'saving');
        debugLog(`- Position: (${char.position?.x || 'unknown'}, ${char.position?.y || 'unknown'})`, 'saving');
        debugLog(`- Sprite exists: ${!!char.sprite}`, 'saving');
        if (char.sprite) {
          debugLog(`- Sprite visible: ${char.sprite.visible}`, 'saving');
          debugLog(`- Sprite position: (${char.sprite.position?.x}, ${char.sprite.position?.y})`, 'saving');
          debugLog(`- Sprite parent exists: ${!!char.sprite.parent}`, 'saving');
        }
      }
      
      if (mapManager.camera) {
        const cam = mapManager.camera;
        debugLog(`Camera details:`, 'saving');
        debugLog(`- Position: (${cam.position?.x || 'unknown'}, ${cam.position?.y || 'unknown'})`, 'saving');
        debugLog(`- Zoom: ${cam.zoom || 'unknown'}`, 'saving');
        debugLog(`- Target: (${cam.targetPosition?.x || 'none'}, ${cam.targetPosition?.y || 'none'})`, 'saving');
      }
    }
    
    debugLog('=== END GAME STATE ANALYSIS ===', 'saving');
  };
  
  return React.createElement('div', {
    key: 'saving-debug-content',
    style: {
      padding: '12px',
      color: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4'
    }
  }, [
    // Header
    React.createElement('h3', {
      key: 'header',
      style: { 
        color: '#4CAF50', 
        marginBottom: '16px',
        fontSize: '16px'
      }
    }, ' Save/Load Debug'),
    
    // Debug logging toggle
    React.createElement('div', {
      key: 'debug-toggle',
      style: {
        marginBottom: '16px',
        padding: '10px',
        background: 'rgba(76,175,80,0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(76,175,80,0.3)'
      }
    }, [
      React.createElement('label', {
        key: 'saving-toggle',
        style: { 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '8px',
          cursor: 'pointer'
        }
      }, [
        React.createElement('input', {
          key: 'saving-checkbox',
          type: 'checkbox',
          checked: debugConfig?.logCategories?.saving || false,
          onChange: () => toggleLogging('saving'),
          style: { marginRight: '8px' }
        }),
        React.createElement('span', { 
          key: 'saving-label',
          style: { 
            color: '#4CAF50',
            fontWeight: 'bold'
          }
        }, ' 💾 Debug Save Operations (Enhanced Analytics & Map Tracking)')
      ]),
      
      React.createElement('label', {
        key: 'loading-toggle',
        style: { 
          display: 'flex', 
          alignItems: 'center',
          marginBottom: '8px',
          cursor: 'pointer'
        }
      }, [
        React.createElement('input', {
          key: 'loading-checkbox',
          type: 'checkbox',
          checked: debugConfig?.logCategories?.loading || false,
          onChange: () => toggleLogging('loading'),
          style: { marginRight: '8px' }
        }),
        React.createElement('span', { key: 'loading-label' }, ' Debug Loading Operations')
      ])
    ]),
    
    // Action buttons grid
    React.createElement('div', {
      key: 'actions',
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }
    }, [
      React.createElement('button', {
        key: 'test-save',
        onClick: handleTestSave,
        style: {
          padding: '8px 12px',
          background: 'rgba(76,175,80,0.2)',
          border: '2px solid rgba(76,175,80,0.5)',
          borderRadius: '6px',
          color: '#4CAF50',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Test Save'),
      
      React.createElement('button', {
        key: 'test-load',
        onClick: handleTestLoad,
        style: {
          padding: '8px 12px',
          background: 'rgba(33,150,243,0.2)',
          border: '2px solid rgba(33,150,243,0.5)',
          borderRadius: '6px',
          color: '#2196F3',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Test Load'),
      
      React.createElement('button', {
        key: 'analyze-state',
        onClick: handleGameStateAnalysis,
        style: {
          padding: '8px 12px',
          background: 'rgba(156,39,176,0.2)',
          border: '2px solid rgba(156,39,176,0.5)',
          borderRadius: '6px',
          color: '#9C27B0',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Analyze State'),
      
      React.createElement('button', {
        key: 'deep-save-analysis',
        onClick: handleDeepSaveAnalysis,
        style: {
          padding: '8px 12px',
          background: 'rgba(255,87,34,0.2)',
          border: '2px solid rgba(255,87,34,0.5)',
          borderRadius: '6px',
          color: '#FF5722',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' 🔍 Deep Save Debug'),
      
      React.createElement('button', {
        key: 'post-load-analysis',
        onClick: handlePostLoadAnalysis,
        style: {
          padding: '8px 12px',
          background: 'rgba(255,193,7,0.2)',
          border: '2px solid rgba(255,193,7,0.5)',
          borderRadius: '6px',
          color: '#FFC107',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Post-Load Analysis'),
      
      React.createElement('button', {
        key: 'rendering-diagnostics',
        onClick: handleRenderingDiagnostics,
        style: {
          padding: '8px 12px',
          background: 'rgba(233,30,99,0.2)',
          border: '2px solid rgba(233,30,99,0.5)',
          borderRadius: '6px',
          color: '#E91E63',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Rendering Diagnostics'),
      
      React.createElement('button', {
        key: 'map-visibility',
        onClick: handleMapVisibilityCheck,
        style: {
          padding: '8px 12px',
          background: 'rgba(0,255,255,0.2)',
          border: '2px solid rgba(0,255,255,0.5)',
          borderRadius: '6px',
          color: '#00ffff',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Map Visibility Check'),
      
      React.createElement('button', {
        key: 'inspect-storage',
        onClick: handleInspectLocalStorage,
        style: {
          padding: '8px 12px',
          background: 'rgba(255,128,0,0.2)',
          border: '2px solid rgba(255,128,0,0.5)',
          borderRadius: '6px',
          color: '#ff8000',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease'
        }
      }, ' Inspect Storage')
    ]),
    
    // Clear saves button (full width, warning style)
    React.createElement('button', {
      key: 'clear-saves',
      onClick: handleClearAllSaves,
      style: {
        padding: '8px 12px',
        background: 'rgba(255,0,0,0.2)',
        border: '2px solid rgba(255,0,0,0.5)',
        borderRadius: '6px',
        color: '#ff0000',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 'bold',
        transition: 'all 0.2s ease',
        marginBottom: '16px',
        width: '100%'
      }
    }, ' Clear All Saves (Dangerous!)'),
    
    // Info section
    React.createElement('div', {
      key: 'info',
      style: {
        padding: '12px',
        background: 'rgba(162,89,255,0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(162,89,255,0.3)',
        fontSize: '12px',
        lineHeight: '1.4'
      }
    }, [
      React.createElement('h4', {
        key: 'info-title',
        style: { 
          color: '#a259ff', 
          marginBottom: '8px',
          fontSize: '14px'
        }
      }, 'ℹ Debug Info'),
      
      React.createElement('div', {
        key: 'info-content',
        style: { color: '#ccc' }
      }, [
        React.createElement('p', {
          key: 'info-p1',
          style: { margin: '0 0 8px 0' }
        }, ' Enable debug logging to see detailed save/load operations in console'),
        React.createElement('p', {
          key: 'info-p2',
          style: { margin: '0 0 8px 0' }
        }, ' Test actions will perform save/load operations and log results'),
        React.createElement('p', {
          key: 'info-p3',
          style: { margin: '0 0 8px 0' }
        }, ' Look for [SAVING] and [LOADING] prefixed messages in console'),
        React.createElement('p', {
          key: 'info-p4',
          style: { margin: '0' }
        }, ' Use "Analyze State" to check current game objects before saving')
      ])
    ])
  ]);
}
