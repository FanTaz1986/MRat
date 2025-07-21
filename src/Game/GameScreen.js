import React, { useRef, useEffect, useState, useCallback } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../stores/gameStore";
import { initializeGameEngine } from "./engine/GameEngine";
// Import using relative path to fix case sensitivity issues
import MapManager from './maps/MapManager'; // Use relative path to avoid case sensitivity issues
import { playAmbianceForMap, stopAmbiance, stopFootstepLoop, stopBossRoomMusic, stopBossFlySound } from "../utils/AudioManager";
import { createDebugOverlay, initializeConsoleCapture, debugLog, isInvulnerable } from "../development/utils/Debug";
import PlayerUI from "./ui/PlayerUI";
import BossUI from "./ui/BossUI";
import ObjectiveUI from "./ui/ObjectiveUI";
import OptionsMenu from "./ui/OptionsMenu";
import GameOverScreen from "../meniu/GameOverScreen";
import BossAI from "./entities/BossAI";
import SaveLoadMenu from "../meniu/SaveLoadMenu";
import GameStateManager from "./utils/GameStateManager";

// Modern PixiJS v7+ settings - no deprecated APIs
PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
PIXI.settings.ROUND_PIXELS = false;

// Modern texture settings using v7+ APIs
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.LINEAR;
PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON;

// Use modern precision settings if available
if (PIXI.Program && PIXI.Program.defaultFragmentPrecision !== undefined) {
  PIXI.Program.defaultFragmentPrecision = PIXI.PRECISION.HIGH;
}

export default function GameScreen({ onGameEnd, onReturnToMenu, onDebugNavigateToScreen, loadGameState = null }) {
  const gameContainerRef = useRef(null);
  const pixiApp = useRef(null);
  const mapManager = useRef(null);
  const debugSystem = useRef(null);
  const bossAI = useRef(null);
  const gameStateManager = useRef(new GameStateManager());
  const { currentMap, setCurrentMap, gameSeed } = useGameStore();
  const [appReady, setAppReady] = useState(false);
  const [mapManagerReady, setMapManagerReady] = useState(false);
  
  // Player UI state
  const [playerHealth, setPlayerHealth] = useState(3);
  const [petAttackCooldown, setPetAttackCooldown] = useState(0);
  
  // Boss UI state
  const [bossHealth, setBossHealth] = useState(40);
  const [maxBossHealth, setMaxBossHealth] = useState(40);
  const [showBossUI, setShowBossUI] = useState(false);
  
  // Options menu state
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isGamePaused, setIsGamePaused] = useState(false); // eslint-disable-line no-unused-vars
  
  // Save/Load menu state
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  
  // Game over state
  const [showGameOver, setShowGameOver] = useState(false);
  
  // Initialize game start time for save/load
  useEffect(() => {
    if (!window.gameStartTime) {
      window.gameStartTime = Date.now();
      console.log('GameScreen: Game start time initialized');
    }
  }, []);
  
  // Toggle options menu and pause/unpause game
  const toggleOptionsMenu = useCallback(() => {
    const newShowState = !showOptionsMenu;
    setShowOptionsMenu(newShowState);
    setIsGamePaused(newShowState);
    
    // Pause/unpause PIXI ticker (check if app exists and has ticker)
    if (pixiApp.current && pixiApp.current.ticker) {
      try {
        if (newShowState) {
          if (pixiApp.current.ticker.started) {
            pixiApp.current.ticker.stop();
          }
        } else {
          if (!pixiApp.current.ticker.started) {
            pixiApp.current.ticker.start();
          }
        }
      } catch (error) {
        console.warn('Error toggling PIXI ticker:', error);
      }
    }
  }, [showOptionsMenu]);
  
  // Watch for game over condition (all hearts lost)
  useEffect(() => {
    // Check if player health is 0 or below, but allow invulnerability to prevent game over
    if (playerHealth <= 0 && !showGameOver && !isInvulnerable()) {
      // Pause the game
      setIsGamePaused(true);
      if (pixiApp.current) {
        pixiApp.current.ticker.stop();
      }
      // Show game over screen after a short delay
      setTimeout(() => {
        setShowGameOver(true);
      }, 1000); // 1 second delay for dramatic effect
    }
  }, [playerHealth, showGameOver]);
  
  // Handle options menu actions
  const handleContinue = () => {
    toggleOptionsMenu();
  };
  
  const handleReturnToMain = () => {
    // Stop all game audio before returning to main menu
    try {
      stopAmbiance();
      stopFootstepLoop();
      stopBossRoomMusic();
      stopBossFlySound();
    } catch (error) {
      console.warn('Error stopping game audio:', error);
    }
    
    // First unpause the game
    setShowOptionsMenu(false);
    setIsGamePaused(false);
    if (pixiApp.current && pixiApp.current.ticker) {
      try {
        if (!pixiApp.current.ticker.started) {
          pixiApp.current.ticker.start();
        }
      } catch (error) {
        console.warn('Error starting ticker in handleReturnToMain:', error);
      }
    }
    // Then trigger the navigation to main menu (not outro)
    if (onReturnToMenu) {
      onReturnToMenu();
    } else {
      onGameEnd(); // Fallback if onReturnToMenu not provided
    }
  };
  
  const handleExitGame = () => {
    // Close the application (this depends on the runtime environment)
    if (window.electron) {
      window.electron.quit();
    } else {
      // In browser, we can only close the tab
      window.close();
    }
  };

  // Save/Load game handlers
  const handleSaveGame = (gameState) => {
    console.log('Game saved successfully');
    setShowSaveMenu(false);
  };

  const handleLoadGame = async (gameState) => {
    try {
      console.log('Loading game state:', gameState);
      
      // Pause the game during load
      setIsGamePaused(true);
      if (pixiApp.current && pixiApp.current.ticker) {
        pixiApp.current.ticker.stop();
      }

      // Check PIXI app state and attempt repair if needed
      debugLog(`[LOAD] PIXI app initial check: pixiApp.current exists = ${!!pixiApp.current}`, 'loading');
      
      if (pixiApp.current) {
        debugLog(`[LOAD] Pre-load PIXI validation: app=${!!pixiApp.current}, renderer=${!!pixiApp.current.renderer}, stage=${!!pixiApp.current.stage}`, 'loading');
        debugLog(`[LOAD] PIXI renderer type: ${typeof pixiApp.current.renderer}, value: ${pixiApp.current.renderer}`, 'loading');
        debugLog(`[LOAD] PIXI stage type: ${typeof pixiApp.current.stage}, value: ${pixiApp.current.stage}`, 'loading');
        
        // Check if PIXI app is completely broken or missing critical components
        // Handle cases where renderer/stage are explicitly false or null/undefined
        const rendererMissing = !pixiApp.current.renderer || pixiApp.current.renderer === false;
        const stageMissing = !pixiApp.current.stage || pixiApp.current.stage === false;
        const needsRepair = rendererMissing || stageMissing;
        
        if (needsRepair) {
          debugLog(`[LOAD] PIXI app needs repair - missing components: renderer=${rendererMissing} (type: ${typeof pixiApp.current.renderer}), stage=${stageMissing} (type: ${typeof pixiApp.current.stage})`, 'loading');
          
          try {
            // Try to recreate the PIXI application
            const containerWidth = window.innerWidth;
            const containerHeight = window.innerHeight;
            
            // Destroy the old app if it exists
            if (pixiApp.current && pixiApp.current.destroy) {
              debugLog('[LOAD] Destroying old PIXI app', 'loading');
              pixiApp.current.destroy(false, false);
            }
            
            // Create new PIXI app
            debugLog('[LOAD] Creating new PIXI app', 'loading');
            pixiApp.current = new PIXI.Application({
              width: containerWidth,
              height: containerHeight,
              backgroundColor: 0x000000,
              resolution: window.devicePixelRatio || 1,
              autoDensity: true,
              antialias: true,
              powerPreference: 'high-performance',
              hello: false
            });
            
            debugLog('[LOAD] PIXI app recreated successfully', 'loading');
            debugLog(`[LOAD] New PIXI app validation: renderer=${!!pixiApp.current.renderer}, stage=${!!pixiApp.current.stage}`, 'loading');
            
            // Re-add canvas to DOM
            const gameContainer = gameContainerRef.current;
            if (gameContainer) {
              debugLog('[LOAD] Re-adding canvas to DOM', 'loading');
              // Clear existing canvas
              while (gameContainer.firstChild) {
                gameContainer.removeChild(gameContainer.firstChild);
              }
              
              // Add new canvas
              const canvas = pixiApp.current.canvas || pixiApp.current.view;
              if (canvas) {
                gameContainer.appendChild(canvas);
                canvas.style.width = containerWidth + 'px';
                canvas.style.height = containerHeight + 'px';
                canvas.style.display = 'block';
                debugLog('[LOAD] Canvas re-added to DOM successfully', 'loading');
              } else {
                debugLog('[LOAD] ERROR: No canvas available from PIXI app', 'loading');
              }
            }
            
            // Force MapManager cleanup to trigger reinitialization
            if (mapManager.current) {
              debugLog('[LOAD] Cleaning up MapManager for reinitialization', 'loading');
              try {
                if (mapManager.current.destroy) {
                  mapManager.current.destroy();
                }
              } catch (error) {
                console.warn('Error destroying MapManager during PIXI repair:', error);
              }
              mapManager.current = null;
              setMapManagerReady(false);
            }
            
          } catch (error) {
            console.error('[LOAD] Failed to repair PIXI app:', error);
            debugLog(`[LOAD] PIXI repair failed: ${error.message}`, 'loading');
          }
        } else {
          debugLog('[LOAD] PIXI app appears functional - skipping recreation', 'loading');
        }
      } else {
        debugLog('[LOAD] ERROR: No PIXI app available at all - creating new one', 'loading');
        
        // Create PIXI app from scratch
        try {
          const containerWidth = window.innerWidth;
          const containerHeight = window.innerHeight;
          
          debugLog('[LOAD] Creating new PIXI app from scratch', 'loading');
          pixiApp.current = new PIXI.Application({
            width: containerWidth,
            height: containerHeight,
            backgroundColor: 0x000000,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
            antialias: true,
            powerPreference: 'high-performance',
            hello: false
          });
          
          debugLog('[LOAD] PIXI app created successfully from scratch', 'loading');
          debugLog(`[LOAD] New PIXI app validation: renderer=${!!pixiApp.current.renderer}, stage=${!!pixiApp.current.stage}`, 'loading');
          
          // Add canvas to DOM
          const gameContainer = gameContainerRef.current;
          if (gameContainer) {
            debugLog('[LOAD] Adding canvas to DOM', 'loading');
            // Clear existing canvas
            while (gameContainer.firstChild) {
              gameContainer.removeChild(gameContainer.firstChild);
            }
            
            // Add new canvas
            const canvas = pixiApp.current.canvas || pixiApp.current.view;
            if (canvas) {
              gameContainer.appendChild(canvas);
              canvas.style.width = containerWidth + 'px';
              canvas.style.height = containerHeight + 'px';
              canvas.style.display = 'block';
              debugLog('[LOAD] Canvas added to DOM successfully', 'loading');
            } else {
              debugLog('[LOAD] ERROR: No canvas available from new PIXI app', 'loading');
            }
          }
          
          // Force MapManager cleanup to trigger reinitialization
          if (mapManager.current) {
            debugLog('[LOAD] Cleaning up MapManager for reinitialization', 'loading');
            try {
              if (mapManager.current.destroy) {
                mapManager.current.destroy();
              }
            } catch (error) {
              console.warn('Error destroying MapManager during PIXI creation:', error);
            }
            mapManager.current = null;
            setMapManagerReady(false);
          }
          
        } catch (error) {
          console.error('[LOAD] Failed to create PIXI app from scratch:', error);
          debugLog(`[LOAD] PIXI creation failed: ${error.message}`, 'loading');
        }
      }

      // Wait for any async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // If MapManager was destroyed during PIXI repair, wait for it to be reinitialized
      if (!mapManager.current) {
        debugLog('[LOAD] MapManager was destroyed - waiting for reinitialization', 'loading');
        
        // Wait for MapManager to be recreated (up to 5 seconds)
        let waitTime = 0;
        const maxWaitTime = 5000;
        
        while (!mapManager.current && waitTime < maxWaitTime) {
          await new Promise(resolve => setTimeout(resolve, 100));
          waitTime += 100;
          
          if (waitTime % 1000 === 0) {
            debugLog(`[LOAD] Still waiting for MapManager... (${waitTime/1000}s)`, 'loading');
          }
        }
        
        if (!mapManager.current) {
          debugLog('[LOAD] ERROR: MapManager failed to reinitialize after PIXI repair', 'loading');
          console.error('Failed to load game: MapManager not available after PIXI repair');
          setIsGamePaused(false);
          return;
        } else {
          debugLog('[LOAD] MapManager reinitialized successfully', 'loading');
        }
      } else {
        debugLog('[LOAD] MapManager is already available', 'loading');
      }

      // Prepare game references for restoration
      const gameReferences = {
        mapManager: mapManager.current,
        setCurrentMap,
        setPlayerHealth,
        setBossHealth,
        setMaxBossHealth,
        setShowBossUI
      };

      debugLog(`[LOAD] Game references prepared - mapManager exists: ${!!gameReferences.mapManager}`, 'loading');

      // Restore the game state
      const success = await gameStateManager.current.restoreGameState(gameState, gameReferences);
      
      if (success) {
        console.log('Game loaded successfully');
        setShowLoadMenu(false);
        
        // Resume the game
        setIsGamePaused(false);
        if (pixiApp.current && pixiApp.current.ticker) {
          pixiApp.current.ticker.start();
        }
      } else {
        console.error('Failed to load game');
        // Resume the game even if load failed
        setIsGamePaused(false);
        if (pixiApp.current && pixiApp.current.ticker) {
          pixiApp.current.ticker.start();
        }
      }
    } catch (error) {
      console.error('Error loading game:', error);
      // Resume the game on error
      setIsGamePaused(false);
      if (pixiApp.current && pixiApp.current.ticker) {
        pixiApp.current.ticker.start();
      }
    }
  };

  const getCurrentGameState = () => {
    // Use mapManager's currentMap instead of gameStore's stale currentMap
    const actualCurrentMap = mapManager.current?.currentMap || currentMap;
    
    const gameReferences = {
      mapManager: mapManager.current,
      currentMap: actualCurrentMap,
      gameSeed,
      playerHealth,
      bossHealth,
      maxBossHealth,
      showBossUI
    };
    
    return gameStateManager.current.collectCurrentGameState(gameReferences);
  };
  
  // Game over callbacks
  const handleGameOverMainMenu = () => {
    // Stop all game audio before returning to main menu
    try {
      stopAmbiance();
      stopFootstepLoop();
      stopBossRoomMusic();
      stopBossFlySound();
    } catch (error) {
      console.warn('Error stopping game audio:', error);
    }
    
    // Reset game state
    setShowGameOver(false);
    setPlayerHealth(3); // Reset health
    setIsGamePaused(false);
    if (pixiApp.current && pixiApp.current.ticker) {
      try {
        if (!pixiApp.current.ticker.started) {
          pixiApp.current.ticker.start();
        }
      } catch (error) {
        console.warn('Error starting ticker in handleGameOverMainMenu:', error);
      }
    }
    // Navigate to main menu (not outro)
    if (onReturnToMenu) {
      onReturnToMenu();
    } else {
      onGameEnd(); // Fallback if onReturnToMenu not provided
    }
  };
  
  const handleRestartLevel = () => {
    // Reset game state
    setShowGameOver(false);
    setPlayerHealth(3); // Reset health to starting value
    setIsGamePaused(false);
    if (pixiApp.current && pixiApp.current.ticker) {
      try {
        if (!pixiApp.current.ticker.started) {
          pixiApp.current.ticker.start();
        }
      } catch (error) {
        console.warn('Error starting ticker in handleRestartLevel:', error);
      }
    }
    
    // Clear all existing enemies before restarting
    if (window.globalEnemyManager) {
      window.globalEnemyManager.clearAllEnemies();
      debugLog('Cleared all enemies for restart', 'game');
    }
    
    // Reset character position to map's starting position and reload current map
    if (mapManager.current) {
      // Use MapManager's current map instead of game store to ensure accuracy
      const actualCurrentMap = mapManager.current.currentMap || currentMap;
      
      // Get the proper starting position for the current map
      const startingPosition = mapManager.current.getCurrentMapSpawnPoint();
      debugLog(`Restarting level ${actualCurrentMap} at starting position: (${startingPosition.x}, ${startingPosition.y})`, 'game');
      
      // Load the map with the starting position
      mapManager.current.loadMap(actualCurrentMap, null, null, startingPosition);
      
      // Ensure debug system is properly reinitialized after restart
      if (debugSystem.current) {
        try {
          // Reconnect to map manager
          if (debugSystem.current.setMapManager) {
            debugSystem.current.setMapManager(mapManager.current);
          }
          
          // Update other game entities in debug system
          if (debugSystem.current.setCharacter && mapManager.current.character) {
            debugSystem.current.setCharacter(mapManager.current.character);
          }
          
          if (debugSystem.current.setCamera && mapManager.current.camera) {
            debugSystem.current.setCamera(mapManager.current.camera);
          }
          
          console.log('Debug system reinitialized after restart');
        } catch (error) {
          console.warn('Error reinitializing debug system:', error);
        }
      } else {
        // Recreate debug system if it was somehow destroyed
        console.log('Debug system was missing, recreating...');
        try {
          const handleHealthChange = (change) => {
            setPlayerHealth(prev => {
              const newHealth = prev + change;
              // If invulnerability is enabled, prevent health from going below 1
              const minHealth = isInvulnerable() ? 1 : 0;
              const clampedHealth = Math.max(minHealth, Math.min(5, newHealth));
              
              // Update the actual character's health
              if (mapManager.current && mapManager.current.character) {
                const character = mapManager.current.character;
                if (character.modifyHealth) {
                  // Calculate the difference and apply it to character
                  const healthDiff = clampedHealth - character.currentHP;
                  character.modifyHealth(healthDiff);
                  debugLog(`Debug health change (restart): UI health ${prev} -> ${clampedHealth}, Character health adjusted by ${healthDiff}`, 'debug');
                } else {
                  // Fallback: directly set character health properties
                  character.currentHP = clampedHealth;
                  character.health = clampedHealth;
                  debugLog(`Debug health change (restart): Character health directly set to ${clampedHealth}`, 'debug');
                }
              } else {
                debugLog('Debug health change (restart): Character not available for health update', 'debug');
              }
              
              return clampedHealth;
            });
          };
          
          debugSystem.current = createDebugOverlay(pixiApp.current, 'GameScreen-Restart', handleHealthChange);
          
          if (debugSystem.current && debugSystem.current.setMapManager) {
            debugSystem.current.setMapManager(mapManager.current);
          }
          
          console.log('Debug system recreated after restart');
        } catch (error) {
          console.error('Failed to recreate debug system:', error);
        }
      }
      
      // Ensure debug button is visible after restart
      setTimeout(() => {
        const debugButton = document.getElementById('debug-toggle-button');
        if (debugButton) {
          debugButton.style.display = 'block';
          debugLog('Debug button restored after level restart', 'system');
        } else {
          // Button is missing, try to recreate it
          debugLog('Debug button missing after restart, attempting to recreate...', 'system');
          
          // Force recreate the debug button by calling the internal createDebugButton function
          // We'll do this by accessing the global debug overlay and triggering button recreation
          if (window.globalDebugOverlay || debugSystem.current) {
            try {
              // Create a new debug button manually since the original might have been removed
              const newDebugButton = document.createElement('button');
              newDebugButton.id = 'debug-toggle-button';
              newDebugButton.innerHTML = 'Debug<br><small style="font-size:10px;">O:Open P:Hide</small>';
              newDebugButton.style.position = 'fixed';
              newDebugButton.style.top = '20px';
              newDebugButton.style.right = '20px';
              newDebugButton.style.zIndex = '10001';
              newDebugButton.style.padding = '12px 16px';
              newDebugButton.style.fontSize = '13px';
              newDebugButton.style.background = 'rgba(30,0,60,0.95)';
              newDebugButton.style.color = '#a259ff';
              newDebugButton.style.border = '2px solid #a259ff';
              newDebugButton.style.borderRadius = '12px';
              newDebugButton.style.cursor = 'pointer';
              newDebugButton.style.boxShadow = '0 0 16px #a259ff55';
              newDebugButton.style.transition = 'all 0.3s ease';
              newDebugButton.style.userSelect = 'none';
              newDebugButton.style.fontWeight = 'bold';
              newDebugButton.style.letterSpacing = '1px';
              newDebugButton.style.textShadow = '0 0 8px #a259ff88';
              newDebugButton.style.textAlign = 'center';
              newDebugButton.style.lineHeight = '1.2';
              newDebugButton.style.display = 'block';
              
              // Add click handler to toggle debug - use direct method first
              newDebugButton.addEventListener('click', () => {
                console.log('Debug button clicked, attempting to toggle debug...');
                
                // Method 0: Try reviving first if destroyed
                if (debugSystem.current && typeof debugSystem.current.revive === 'function') {
                  debugSystem.current.revive();
                }
                
                // Method 1: Try calling toggleDebug directly on debug system
                if (debugSystem.current && typeof debugSystem.current.toggleDebug === 'function') {
                  console.log('Using debugSystem.current.toggleDebug()');
                  debugSystem.current.toggleDebug();
                  return;
                }
                
                // Method 1b: Try force show instead
                if (debugSystem.current && typeof debugSystem.current.forceShow === 'function') {
                  console.log('Using debugSystem.current.forceShow()');
                  debugSystem.current.forceShow();
                  return;
                }
                
                // Method 2: Try global debug overlay
                if (window.globalDebugOverlay && typeof window.globalDebugOverlay.toggleDebug === 'function') {
                  console.log('Using window.globalDebugOverlay.toggleDebug()');
                  window.globalDebugOverlay.toggleDebug();
                  return;
                }
                
                // Method 2b: Try global force show
                if (window.globalDebugOverlay && typeof window.globalDebugOverlay.forceShow === 'function') {
                  console.log('Using window.globalDebugOverlay.forceShow()');
                  window.globalDebugOverlay.forceShow();
                  return;
                }
                
                // Method 3: Keyboard event simulation
                console.log('Using keyboard event simulation');
                const keyEvent = new KeyboardEvent('keydown', {
                  key: 'o',
                  code: 'KeyO',
                  keyCode: 79,
                  which: 79,
                  bubbles: true,
                  cancelable: true
                });
                document.dispatchEvent(keyEvent);
                
                // Method 4: Last resort - manual overlay toggle
                setTimeout(() => {
                  const debugOverlay = document.getElementById('debug-overlay');
                  if (debugOverlay) {
                    const isVisible = debugOverlay.style.display !== 'none' && 
                                     debugOverlay.style.visibility !== 'hidden';
                    debugOverlay.style.display = isVisible ? 'none' : 'block';
                    debugOverlay.style.visibility = isVisible ? 'hidden' : 'visible';
                    console.log('Manual overlay toggle:', isVisible ? 'hidden' : 'shown');
                  }
                }, 100);
              });
              
              // Add hover effects
              newDebugButton.addEventListener('mouseenter', () => {
                newDebugButton.style.background = 'rgba(162,89,255,0.15)';
                newDebugButton.style.color = '#fff';
                newDebugButton.style.boxShadow = '0 0 24px #a259ff88';
              });
              
              newDebugButton.addEventListener('mouseleave', () => {
                newDebugButton.style.background = 'rgba(30,0,60,0.95)';
                newDebugButton.style.color = '#a259ff';
                newDebugButton.style.boxShadow = '0 0 16px #a259ff55';
              });
              
              document.body.appendChild(newDebugButton);
              debugLog('Debug button manually recreated after restart', 'system');
            } catch (error) {
              console.error('Failed to recreate debug button:', error);
            }
          }
        }
      }, 100);
    }
  };
  
  // Initialize PixiJS app on component mount
  useEffect(() => {
    if (!gameContainerRef.current) return;
    
    // Get actual container dimensions
    const containerRect = gameContainerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width || window.innerWidth;
    const containerHeight = containerRect.height || window.innerHeight;
    
    // Create modern PIXI Application using v7+ initialization
    const initApp = async () => {
      try {
        debugLog('Creating PIXI Application...', 'system');
        
        // Modern PIXI app creation with v7+ options
        pixiApp.current = new PIXI.Application({
          width: containerWidth,
          height: containerHeight,
          backgroundColor: 0x000000,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
          antialias: true,
          powerPreference: 'high-performance',
          hello: false, // Disable hello message
        });
        
        debugLog('PIXI Application created: hasApp=' + !!pixiApp.current + ', hasStage=' + !!pixiApp.current.stage + ', hasRenderer=' + !!pixiApp.current.renderer + ', hasView=' + !!pixiApp.current.view + ', hasCanvas=' + !!pixiApp.current.canvas, 'system');
        
        // In PixiJS v7.4.3, stage should be immediately available
        // But let's add a small wait to ensure it's fully initialized
        await new Promise(resolve => setTimeout(resolve, 50));
        
        debugLog('After wait, PIXI app state: hasApp=' + !!pixiApp.current + ', hasStage=' + !!pixiApp.current.stage + ', stageChildren=' + (pixiApp.current.stage?.children?.length || 0), 'system');
        
        // Double-check that stage is available
        if (!pixiApp.current.stage) {
          debugLog('PIXI stage not available after initialization', 'system');
          throw new Error('PIXI stage initialization failed');
        }
        
        // Add canvas to DOM using modern API (check for both .view and .canvas)
        const canvas = pixiApp.current.canvas || pixiApp.current.view;
        gameContainerRef.current.appendChild(canvas);
        
        // Force canvas to exactly match container size with no CSS scaling
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        canvas.style.display = 'block';
        
        debugLog('PIXI app initialized successfully with stage: ' + !!pixiApp.current.stage, 'system');
        setAppReady(true);
      } catch (error) {
        console.error('Failed to initialize PIXI app:', error);
        // If initialization fails completely, still set ready to prevent infinite loading
        setAppReady(true);
      }
    };
    
    initApp();
  }, []);
  
  // Initialize game components when PIXI app is ready
  useEffect(() => {
    if (!appReady || !pixiApp.current) return;
    
    // Check if MapManager exists AND PIXI app is valid
    if (mapManager.current) {
      // Validate PIXI app state even when MapManager exists
      if (pixiApp.current && pixiApp.current.renderer && pixiApp.current.stage) {
        debugLog('MapManager exists and PIXI app is valid, skipping initialization', 'system');
        return;
      } else {
        debugLog('MapManager exists but PIXI app is invalid - will reinitialize', 'system');
        debugLog(`PIXI app validation: app=${!!pixiApp.current}, renderer=${!!pixiApp.current?.renderer}, stage=${!!pixiApp.current?.stage}`, 'system');
        
        // Clear the invalid MapManager to force reinitialization
        if (mapManager.current) {
          debugLog('Cleaning up invalid MapManager before reinitialization', 'system');
          try {
            if (mapManager.current.destroy && typeof mapManager.current.destroy === 'function') {
              mapManager.current.destroy();
            }
          } catch (error) {
            console.warn('Error destroying invalid MapManager:', error);
          }
          mapManager.current = null;
          setMapManagerReady(false);
        }
      }
    }
    
    // Additional safety check: ensure stage is available
    if (!pixiApp.current.stage) {
      console.error('PIXI app stage is not available, cannot initialize game components');
      return;
    }
    
    // Add a small delay to ensure PIXI app is fully initialized
    const initializeWithDelay = async () => {
      try {
        // Wait multiple frames to ensure PIXI app is fully ready
        await new Promise(resolve => {
          let frameCount = 0;
          const waitFrame = () => {
            frameCount++;
            if (frameCount >= 3) { // Wait 3 frames
              resolve();
            } else {
              requestAnimationFrame(waitFrame);
            }
          };
          requestAnimationFrame(waitFrame);
        });
        
        // Final check that stage is still available and MapManager doesn't exist
        if (!pixiApp.current || !pixiApp.current.stage || mapManager.current) {
          if (mapManager.current) {
            console.log('MapManager was created during delay, skipping initialization');
          } else {
            console.error('PIXI app or stage lost during initialization delay');
          }
          return;
        }
        
        debugLog('Initializing game engine...', 'system');
        
        // Initialize game engine with the PIXI app
        initializeGameEngine(pixiApp.current);
        
        // Initialize console capture for debug system
        initializeConsoleCapture();
        
        // Create map manager with additional safety checks
        debugLog('Creating MapManager with app: hasApp=' + !!pixiApp.current + ', hasStage=' + !!pixiApp.current.stage + ', stageChildren=' + (pixiApp.current.stage?.children?.length || 0) + ', gameSeed=' + gameSeed, 'system');
        
        mapManager.current = new MapManager(pixiApp.current, gameSeed);
        debugLog('MapManager created successfully with gameSeed: ' + gameSeed, 'system');
        
        // Initialize Boss AI
        bossAI.current = new BossAI();
        debugLog('BossAI initialized', 'boss');
        
        // Initialize Enemy Manager
        const EnemyManager = (await import('./engine/EnemyManager.js')).default;
        window.globalEnemyManager = new EnemyManager(pixiApp.current, pixiApp.current.stage);
        debugLog('EnemyManager initialized', 'enemies');
        
        // Expose mapManager globally for ObjectiveUI and boss system
        window.gameMapManager = mapManager.current;
        // Also expose character for boss attacks
        if (mapManager.current.character) {
          window.gameMapManager.character = mapManager.current.character;
        }
        
        // Set MapManager as ready
        setMapManagerReady(true);
        
        // Initialize debug system
        const handleHealthChange = (change) => {
          setPlayerHealth(prev => {
            const newHealth = prev + change;
            // If invulnerability is enabled, prevent health from going below 1
            const minHealth = isInvulnerable() ? 1 : 0;
            // Clamp between minHealth and 5 hearts
            const clampedHealth = Math.max(minHealth, Math.min(5, newHealth));
            
            // Update the actual character's health
            if (mapManager.current && mapManager.current.character) {
              const character = mapManager.current.character;
              if (character.modifyHealth) {
                // Calculate the difference and apply it to character
                const healthDiff = clampedHealth - character.currentHP;
                character.modifyHealth(healthDiff);
                debugLog(`Debug health change: UI health ${prev} -> ${clampedHealth}, Character health adjusted by ${healthDiff}`, 'debug');
              } else {
                // Fallback: directly set character health properties
                character.currentHP = clampedHealth;
                character.health = clampedHealth;
                debugLog(`Debug health change: Character health directly set to ${clampedHealth}`, 'debug');
              }
            } else {
              debugLog('Debug health change: Character not available for health update', 'debug');
            }
            
            return clampedHealth;
          });
        };
        
        debugSystem.current = createDebugOverlay(pixiApp.current, 'GameScreen', handleHealthChange);
        
        debugLog('Game engine initialized', 'game');
        
        // Initialize boss AI debug integration
        if (bossAI.current && debugSystem.current) {
          // Add keyboard event listener for boss controls
          document.addEventListener('keydown', bossAI.current.handleKeyDown);
          debugLog('BossAI keyboard controls initialized', 'boss');
          
          // Set up periodic check to connect boss entity to BossAI
          const connectBossToAI = () => {
            // Check if we're on MapX and if the boss is spawned
            if (mapManager.current && mapManager.current.mapXInstance) {
              if (mapManager.current.mapXInstance.boss) {
                const boss = mapManager.current.mapXInstance.boss;
                if (boss && !bossAI.current.bossEntity) {
                  bossAI.current.setBossEntity(boss);
                  debugLog('Boss entity connected to BossAI from MapX', 'boss');
                } else if (bossAI.current.bossEntity) {
                  // Boss already connected, no need to keep checking as frequently
                  return true; // Signal to reduce check frequency
                }
              } else {
                debugLog('MapX instance found but no boss spawned yet', 'boss');
              }
            } else {
              debugLog('MapManager or MapX instance not ready', 'boss');
            }
            return false;
          };
          
          // Check immediately and then every 500ms
          connectBossToAI();
          const bossConnectionInterval = setInterval(() => {
            const connected = connectBossToAI();
            if (connected) {
              // Boss connected, reduce check frequency
              clearInterval(bossConnectionInterval);
              // Check less frequently for disconnections
              const maintainConnectionInterval = setInterval(connectBossToAI, 2000);
              window.game.bossConnectionInterval = maintainConnectionInterval;
            }
          }, 500);
          
          // Store interval for cleanup
          window.game = window.game || {};
          window.game.bossConnectionInterval = bossConnectionInterval;
        }
        
        // Update debug system when map manager is created
        if (debugSystem.current && debugSystem.current.setMapManager && mapManager.current) {
          debugSystem.current.setMapManager(mapManager.current);
        }

        // Set up screen navigation callback for debug overlay
        if (debugSystem.current && debugSystem.current.setScreenNavigationCallback && onDebugNavigateToScreen) {
          debugSystem.current.setScreenNavigationCallback(onDebugNavigateToScreen);
        }
        
        // Expose game objects globally for debug access
        if (!window.game) {
          window.game = {};
        }
        if (mapManager.current) {
          window.game.mapManager = mapManager.current;
        }
        if (bossAI.current) {
          window.game.bossAI = bossAI.current;
        }
        
      } catch (error) {
        console.error('Failed to initialize game components:', error);
        // Don't throw here, just log the error to prevent crashes
      }
    };
    
    initializeWithDelay();
    
    // Handle resizing
const resizeHandler = () => {
  // Get actual container dimensions
  const containerRect = gameContainerRef.current.getBoundingClientRect();
  const containerWidth = containerRect.width || window.innerWidth;
  const containerHeight = containerRect.height || window.innerHeight;
  
  // Resize renderer to exact container size
  pixiApp.current.renderer.resize(containerWidth, containerHeight);
  
  // Ensure canvas matches container exactly
  pixiApp.current.view.style.width = containerWidth + 'px';
  pixiApp.current.view.style.height = containerHeight + 'px';
  
  if (gameContainerRef.current) {
    gameContainerRef.current.style.width = containerWidth + 'px';
    gameContainerRef.current.style.height = containerHeight + 'px';
  }
  if (mapManager.current) {
    mapManager.current.handleResize();
  }
};
    
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('resize', resizeHandler);
      
      // Clean up UI monitoring intervals
      if (window.gameIntervals) {
        window.gameIntervals.forEach(interval => clearInterval(interval));
        window.gameIntervals = [];
      }
      
      // Only destroy debug system on actual component unmount, not on re-renders
      // The debug system is designed to be a global singleton
      // We'll let it persist across game state changes
      
      // Modern cleanup using PIXI v7+ patterns
      if (pixiApp.current) {
        try {
          // Clean up properly without destroying BaseTextures managed by Assets
          if (pixiApp.current.destroy) {
            // Use simple destroy without options for better compatibility
            pixiApp.current.destroy(false, false);
          }
        } catch (error) {
          console.warn('Error during PIXI app cleanup:', error);
        }
      }
    };
  }, [appReady, onDebugNavigateToScreen, gameSeed]);
  
  // Separate useEffect for keyboard event listener
  useEffect(() => {
    // Add keyboard event listener for ESC key
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        // Only toggle options menu if app is ready and initialized
        if (appReady && pixiApp.current && pixiApp.current.stage && mapManager.current) {
          toggleOptionsMenu();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [appReady, toggleOptionsMenu]);
  
    // Handle map changes
  useEffect(() => {
    debugLog('Map loading useEffect triggered: appReady=' + appReady + ', mapManagerReady=' + mapManagerReady + ', hasMapManager=' + !!mapManager.current + ', currentMap=' + currentMap, 'system');
    
    if (!appReady || !mapManagerReady || !mapManager.current) {
      debugLog('Map loading skipped: appReady=' + appReady + ', mapManagerReady=' + mapManagerReady + ', mapManager=' + !!mapManager.current, 'system');
      return;
    }
    
    debugLog('Loading map: ' + currentMap, 'system');
    
    // Load the current map
    const handleMapLoaded = () => {
      playAmbianceForMap(currentMap);
        // Update debug system with new character and camera references
      if (debugSystem.current) {
        if (debugSystem.current.setCharacter && mapManager.current.character) {
          debugSystem.current.setCharacter(mapManager.current.character);
        }
        if (debugSystem.current.setCamera && mapManager.current.camera) {
          debugSystem.current.setCamera(mapManager.current.camera);
        }
        // Update portal data
        if (debugSystem.current.updatePortals) {
          debugSystem.current.updatePortals();
        }
      }
      
      // Force camera centering after a short delay to ensure character position is stable
      setTimeout(() => {
        if (mapManager.current.camera && mapManager.current.character) {
          const char = mapManager.current.character;
          const cam = mapManager.current.camera;
          debugLog(`Post-load camera centering: Character at (${char.position.x}, ${char.position.y})`, 'camera');
          cam.centerOn(char.position.x, char.position.y);
          debugLog(`Camera repositioned to follow character properly`, 'camera');
        }
      }, 100); // 100ms delay to ensure everything is initialized        // Expose character and camera globally for debug access
        if (window.game && mapManager.current) {
          window.game.characterManager = {
            character: mapManager.current.character,
            pet: mapManager.current.pet
          };
          window.game.cameras = {
            main: mapManager.current.camera
          };
          
          debugLog('🎮 Character, pet, and camera exposed globally:', 'game');
          debugLog({
            character: !!window.game.characterManager.character,
            pet: !!window.game.characterManager.pet,
            camera: !!window.game.cameras.main
          }, 'game');
        }
        
        // Set up UI monitoring for pet attack cooldown
        setupUIMonitoring();
      };
      
      const setupUIMonitoring = () => {
        // Monitor character health for UI updates
        const monitorCharacterHealth = () => {
          if (mapManager.current && mapManager.current.character) {
            const character = mapManager.current.character;
            if (character.currentHP !== undefined) {
              // Update UI health to match character's actual health
              setPlayerHealth(prev => {
                const actualHealth = character.currentHP;
                if (prev !== actualHealth) {
                  debugLog(`🏥 UI health sync: ${prev} -> ${actualHealth}`, 'character');
                  debugLog(`🎯 Character object health props: currentHP=${character.currentHP}, health=${character.health}, maxHP=${character.maxHP}`, 'character');
                  return actualHealth;
                }
                return prev;
              });
            } else {
              debugLog('⚠️ Character currentHP property is undefined', 'character');
            }
          } else {
            debugLog('⚠️ Character not found in mapManager for health monitoring', 'character');
          }
        };
        
        // Monitor pet attack cooldown for UI updates
        const monitorPetCooldown = () => {
          if (mapManager.current && mapManager.current.pet) {
            const pet = mapManager.current.pet;
            const now = Date.now();
            const attackInterval = pet.attackIntervals[pet.currentLevel];
            
            // Calculate progress as percentage (0-100)
            // 0% = just used attack, 100% = ready to attack again
            let cooldownProgress = 100; // Default to ready
            
            if (pet.currentLevel === 0) {
              // Level 0 (melee only) is always ready
              cooldownProgress = 100;
            } else if (attackInterval) {
              // For levels 1 and 2 with ranged attacks
              if (pet.canRangedAttack && pet.lastRangedAttackTime === 0) {
                // Pet hasn't attacked yet and is ready - show 100%
                cooldownProgress = 100;
              } else if (pet.canRangedAttack && pet.lastRangedAttackTime > 0) {
                // Pet has attacked before and cooldown is complete - show 100%
                cooldownProgress = 100;
              } else if (!pet.canRangedAttack && pet.lastRangedAttackTime > 0) {
                // Pet is on cooldown after attack - calculate progress from 0% to 100%
                const timeSinceLastAttack = now - pet.lastRangedAttackTime;
                cooldownProgress = Math.min((timeSinceLastAttack / attackInterval) * 100, 100);
              } else {
                // Fallback case
                cooldownProgress = 100;
              }
            }
            
            setPetAttackCooldown(cooldownProgress);
          }
        };
        
        // Update pet cooldown every 50ms for smooth progress bar
        const cooldownInterval = setInterval(monitorPetCooldown, 50);
        
        // Update character health every 100ms to sync with UI
        const healthInterval = setInterval(monitorCharacterHealth, 100);
        
        // Store interval IDs for cleanup
        if (!window.gameIntervals) window.gameIntervals = [];
        window.gameIntervals.push(cooldownInterval);
        window.gameIntervals.push(healthInterval);
      };
    
    mapManager.current.loadMap(currentMap, handleMapLoaded);

    return () => {
      // Clean up previous map resources
    };
  }, [currentMap, appReady, mapManagerReady]);

  // Connect portal teleport handler through map manager
  useEffect(() => {
    if (mapManager.current && appReady) {
      mapManager.current.onMapChanged = (newMap, previousMap) => {
        // Check if player is teleporting from MapX to Map0 - this should trigger outro
        if (previousMap === 'mapareax' && newMap === 'maparea0') {
          debugLog('Player escaped from MapX, triggering outro/game end', 'game');
          onGameEnd();
          return;
        }
        
        // Update the global state when map changes through portal
        setCurrentMap(newMap);
      };
    }
  }, [appReady, setCurrentMap, onGameEnd]);

  // Load game state if provided (for loading saved games)
  useEffect(() => {
    console.log(`[MAIN-MENU-LOAD] useEffect triggered: loadGameState=${!!loadGameState}, appReady=${appReady}, mapManagerReady=${mapManagerReady}, mapManager=${!!mapManager.current}`);
    
    if (loadGameState && appReady && mapManagerReady && mapManager.current) {
      console.log('Loading game state from main menu:', loadGameState);
      console.log(`[MAIN-MENU-LOAD] All conditions met, setting timeout`);
      
      // Give the map a moment to initialize
      setTimeout(async () => {
        console.log(`[MAIN-MENU-LOAD] Timeout executed, starting repair logic`);
        
        // ALWAYS run PIXI repair logic for main menu loads
        console.log(`[MAIN-MENU-LOAD] ===== Starting game load from main menu =====`);
        console.log(`[MAIN-MENU-LOAD] Initial conditions: loadGameState=${!!loadGameState}, appReady=${appReady}, mapManagerReady=${mapManagerReady}, mapManager=${!!mapManager.current}`);
        
        // Check PIXI app state and attempt repair if needed
        console.log(`[MAIN-MENU-LOAD] PIXI app initial check: pixiApp.current exists = ${!!pixiApp.current}`);
        
        try {
          
          if (pixiApp.current) {
            console.log(`[MAIN-MENU-LOAD] Pre-load PIXI validation: app=${!!pixiApp.current}, renderer=${!!pixiApp.current.renderer}, stage=${!!pixiApp.current.stage}`);
            console.log(`[MAIN-MENU-LOAD] PIXI renderer type: ${typeof pixiApp.current.renderer}, value: ${pixiApp.current.renderer}`);
            console.log(`[MAIN-MENU-LOAD] PIXI stage type: ${typeof pixiApp.current.stage}, value: ${pixiApp.current.stage}`);
            
            // Check if PIXI app is completely broken or missing critical components
            const rendererMissing = !pixiApp.current.renderer || pixiApp.current.renderer === false;
            const stageMissing = !pixiApp.current.stage || pixiApp.current.stage === false;
            const needsRepair = rendererMissing || stageMissing;
            
            console.log(`[MAIN-MENU-LOAD] Repair needed: ${needsRepair} (renderer missing: ${rendererMissing}, stage missing: ${stageMissing})`);
            
            if (needsRepair) {
              console.log(`[MAIN-MENU-LOAD] PIXI app needs repair - missing components: renderer=${rendererMissing} (type: ${typeof pixiApp.current.renderer}), stage=${stageMissing} (type: ${typeof pixiApp.current.stage})`);
              
              try {
                console.log(`[MAIN-MENU-LOAD] Starting PIXI repair process`);
                // Try to recreate the PIXI application
                const containerWidth = window.innerWidth;
                const containerHeight = window.innerHeight;
                
                // Destroy the old app if it exists
                if (pixiApp.current && pixiApp.current.destroy) {
                  debugLog('[MAIN-MENU-LOAD] Destroying old PIXI app', 'loading');
                  pixiApp.current.destroy(false, false);
                }
                
                // Create new PIXI app
                debugLog('[MAIN-MENU-LOAD] Creating new PIXI app', 'loading');
                pixiApp.current = new PIXI.Application({
                  width: containerWidth,
                  height: containerHeight,
                  backgroundColor: 0x000000,
                  resolution: window.devicePixelRatio || 1,
                  autoDensity: true,
                  antialias: true,
                  powerPreference: 'high-performance',
                  hello: false
                });
                
                debugLog('[MAIN-MENU-LOAD] PIXI app recreated successfully', 'loading');
                debugLog(`[MAIN-MENU-LOAD] New PIXI app validation: renderer=${!!pixiApp.current.renderer}, stage=${!!pixiApp.current.stage}`, 'loading');
                
                // Re-add canvas to DOM
                const gameContainer = gameContainerRef.current;
                if (gameContainer) {
                  debugLog('[MAIN-MENU-LOAD] Re-adding canvas to DOM', 'loading');
                  // Clear existing canvas
                  while (gameContainer.firstChild) {
                    gameContainer.removeChild(gameContainer.firstChild);
                  }
                  
                  // Add new canvas
                  const canvas = pixiApp.current.canvas || pixiApp.current.view;
                  if (canvas) {
                    gameContainer.appendChild(canvas);
                    canvas.style.width = containerWidth + 'px';
                    canvas.style.height = containerHeight + 'px';
                    canvas.style.display = 'block';
                    debugLog('[MAIN-MENU-LOAD] Canvas re-added to DOM successfully', 'loading');
                  } else {
                    debugLog('[MAIN-MENU-LOAD] ERROR: No canvas available from PIXI app', 'loading');
                  }
                }
                
                // Force MapManager cleanup to trigger reinitialization
                if (mapManager.current) {
                  debugLog('[MAIN-MENU-LOAD] Cleaning up MapManager for reinitialization', 'loading');
                  try {
                    if (mapManager.current.destroy) {
                      mapManager.current.destroy();
                    }
                  } catch (error) {
                    console.warn('Error destroying MapManager during PIXI repair:', error);
                  }
                  mapManager.current = null;
                  setMapManagerReady(false);
                }
                
                // Wait for MapManager to be recreated (up to 5 seconds)
                debugLog('[MAIN-MENU-LOAD] Waiting for MapManager reinitialization', 'loading');
                let waitTime = 0;
                const maxWaitTime = 5000;
                
                while (!mapManager.current && waitTime < maxWaitTime) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  waitTime += 100;
                  
                  if (waitTime % 1000 === 0) {
                    debugLog(`[MAIN-MENU-LOAD] Still waiting for MapManager... (${waitTime/1000}s)`, 'loading');
                  }
                }
                
                if (!mapManager.current) {
                  debugLog('[MAIN-MENU-LOAD] ERROR: MapManager failed to reinitialize after PIXI repair', 'loading');
                  console.error('Failed to load game from main menu: MapManager not available after PIXI repair');
                  return;
                } else {
                  debugLog('[MAIN-MENU-LOAD] MapManager reinitialized successfully', 'loading');
                }
                
              } catch (repairError) {
                console.error('[MAIN-MENU-LOAD] Failed to repair PIXI app:', repairError);
                debugLog(`[MAIN-MENU-LOAD] PIXI repair failed: ${repairError.message}`, 'loading');
                debugLog(`[MAIN-MENU-LOAD] Repair error stack: ${repairError.stack}`, 'loading');
                return;
              }
            } else {
              debugLog('[MAIN-MENU-LOAD] PIXI app appears functional - skipping recreation', 'loading');
            }
          } else {
            debugLog('[MAIN-MENU-LOAD] ERROR: No PIXI app available at all', 'loading');
            return;
          }

          debugLog(`[MAIN-MENU-LOAD] PIXI validation complete, proceeding with game state restoration`, 'loading');

          const gameReferences = {
            mapManager: mapManager.current,
            setCurrentMap,
            setPlayerHealth,
            setBossHealth,
            setMaxBossHealth,
            setShowBossUI
          };
          
          debugLog(`[MAIN-MENU-LOAD] Game references prepared - mapManager exists: ${!!gameReferences.mapManager}`, 'loading');
          
          const success = await gameStateManager.current.restoreGameState(loadGameState, gameReferences);
          
          // CRITICAL: Check and repair PIXI app AFTER game state restoration
          // The map loading process often corrupts the PIXI app
          console.log(`[MAIN-MENU-LOAD] Checking PIXI app state AFTER game state restoration`);
          
          if (pixiApp.current) {
            console.log(`[MAIN-MENU-LOAD] Post-restore PIXI validation: app=${!!pixiApp.current}, renderer=${!!pixiApp.current.renderer}, stage=${!!pixiApp.current.stage}`);
            
            const rendererMissing = !pixiApp.current.renderer || pixiApp.current.renderer === false;
            const stageMissing = !pixiApp.current.stage || pixiApp.current.stage === false;
            const needsRepair = rendererMissing || stageMissing;
            
            if (needsRepair) {
              console.log(`[MAIN-MENU-LOAD] CRITICAL: Game state restoration corrupted PIXI app! Starting repair process...`);
              
              try {
                // Get container dimensions
                const containerWidth = window.innerWidth;
                const containerHeight = window.innerHeight;
                
                // Destroy the corrupted app safely
                if (pixiApp.current && pixiApp.current.destroy) {
                  try {
                    pixiApp.current.destroy(false, false);
                  } catch (destroyError) {
                    console.warn('[MAIN-MENU-LOAD] Error destroying corrupted PIXI app:', destroyError);
                  }
                  pixiApp.current = null;
                }
                
                // Create new PIXI app
                console.log('[MAIN-MENU-LOAD] Creating new PIXI app to replace corrupted one');
                pixiApp.current = new PIXI.Application({
                  width: containerWidth,
                  height: containerHeight,
                  backgroundColor: 0x000000,
                  resolution: window.devicePixelRatio || 1,
                  autoDensity: true,
                  antialias: true,
                  powerPreference: 'high-performance',
                  hello: false
                });
                
                console.log('[MAIN-MENU-LOAD] PIXI app recreated successfully');
                
                // Re-add canvas to DOM
                const gameContainer = gameContainerRef.current;
                if (gameContainer) {
                  console.log('[MAIN-MENU-LOAD] Re-adding canvas to DOM');
                  
                  // Clear existing canvas
                  while (gameContainer.firstChild) {
                    gameContainer.removeChild(gameContainer.firstChild);
                  }
                  
                  // Add new canvas
                  const canvas = pixiApp.current.canvas || pixiApp.current.view;
                  if (canvas) {
                    gameContainer.appendChild(canvas);
                    canvas.style.width = containerWidth + 'px';
                    canvas.style.height = containerHeight + 'px';
                    canvas.style.display = 'block';
                    console.log('[MAIN-MENU-LOAD] Canvas re-added to DOM successfully');
                  }
                }
                
                // Force MapManager cleanup and reinitialize
                console.log('[MAIN-MENU-LOAD] Forcing MapManager reinitialization after PIXI repair');
                if (mapManager.current) {
                  try {
                    if (mapManager.current.destroy) {
                      mapManager.current.destroy();
                    }
                  } catch (error) {
                    console.warn('Error destroying MapManager during PIXI repair:', error);
                  }
                  mapManager.current = null;
                }
                setMapManagerReady(false);
                
                // Reinitialize game engine with new PIXI app
                console.log('[MAIN-MENU-LOAD] Reinitializing game engine with new PIXI app');
                const { initializeGameEngine } = await import('./engine/GameEngine.js');
                initializeGameEngine(pixiApp.current);
                
                // Create new MapManager
                const { default: MapManager } = await import('./maps/MapManager.js');
                mapManager.current = new MapManager(pixiApp.current, gameSeed);
                console.log('[MAIN-MENU-LOAD] MapManager recreated with new PIXI app');
                
                // Expose mapManager globally for ObjectiveUI and boss system
                window.gameMapManager = mapManager.current;
                
                setMapManagerReady(true);
                
                // Wait a moment for MapManager to fully initialize
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Now reload the map with the new MapManager
                console.log(`[MAIN-MENU-LOAD] Reloading map ${loadGameState.currentMap} with repaired PIXI app`);
                
                await new Promise((resolve) => {
                  mapManager.current.loadMap(loadGameState.currentMap, () => {
                    console.log('[MAIN-MENU-LOAD] Map reloaded successfully after PIXI repair');
                    resolve();
                  });
                });
                
                // Special case: If we're loading into boss map, initialize the boss
                if (loadGameState.currentMap === 'mapareax') {
                  console.log('[MAIN-MENU-LOAD] Boss map detected - initializing boss after PIXI repair');
                  
                  // Wait for map to fully settle
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  if (mapManager.current.mapXInstance) {
                    try {
                      if (mapManager.current.mapXInstance.boss) {
                        console.log('[MAIN-MENU-LOAD] Boss entity exists - checking spawn state');
                        if (!mapManager.current.mapXInstance.bossSpawned) {
                          console.log('[MAIN-MENU-LOAD] Spawning boss for fight');
                          mapManager.current.mapXInstance.spawnBoss();
                        }
                      } else {
                        console.log('[MAIN-MENU-LOAD] No boss entity - initializing boss');
                        await mapManager.current.mapXInstance.initializeBoss();
                        if (mapManager.current.mapXInstance.boss) {
                          console.log('[MAIN-MENU-LOAD] Boss initialized - spawning for fight');
                          mapManager.current.mapXInstance.spawnBoss();
                        }
                      }
                      console.log('[MAIN-MENU-LOAD] Boss initialization completed');
                    } catch (bossError) {
                      console.warn('[MAIN-MENU-LOAD] Error initializing boss:', bossError);
                    }
                  } else {
                    console.warn('[MAIN-MENU-LOAD] MapX instance not available for boss initialization');
                  }
                }
                
                // Restore character and pet positions now that everything is recreated
                if (mapManager.current.character) {
                  console.log('[MAIN-MENU-LOAD] Restoring character position after PIXI repair');
                  mapManager.current.character.position.set(
                    loadGameState.character.position.x,
                    loadGameState.character.position.y
                  );
                  mapManager.current.character.currentHP = loadGameState.character.health;
                }
                
                if (mapManager.current.pet && loadGameState.pet) {
                  console.log('[MAIN-MENU-LOAD] Restoring pet position after PIXI repair');
                  mapManager.current.pet.position.set(
                    loadGameState.pet.position.x,
                    loadGameState.pet.position.y
                  );
                  mapManager.current.pet.currentLevel = loadGameState.pet.level;
                }
                
                if (mapManager.current.camera && loadGameState.camera) {
                  console.log('[MAIN-MENU-LOAD] Restoring camera position after PIXI repair');
                  mapManager.current.camera.position.set(
                    loadGameState.camera.position.x,
                    loadGameState.camera.position.y
                  );
                }
                
                console.log('[MAIN-MENU-LOAD] PIXI repair and game state restoration completed successfully');
                
              } catch (repairError) {
                console.error('[MAIN-MENU-LOAD] Failed to repair PIXI app after corruption:', repairError);
              }
            } else {
              console.log('[MAIN-MENU-LOAD] PIXI app survived game state restoration');
            }
          } else {
            console.log('[MAIN-MENU-LOAD] No PIXI app available after game state restoration');
          }
          
          if (success) {
            console.log('Game state loaded successfully from main menu');
          } else {
            console.error('Failed to load game state from main menu');
          }
        } catch (mainError) {
          console.error('Error loading game state from main menu:', mainError);
          debugLog(`[MAIN-MENU-LOAD] ERROR in main menu load: ${mainError.message}`, 'loading');
          debugLog(`[MAIN-MENU-LOAD] Error stack: ${mainError.stack}`, 'loading');
        }
      }, 500); // Wait 500ms for map to fully initialize
    } else {
      if (loadGameState) {
        console.log(`[MAIN-MENU-LOAD] Conditions not met: appReady=${appReady}, mapManagerReady=${mapManagerReady}, mapManager=${!!mapManager.current}`);
      }
    }
  }, [loadGameState, appReady, mapManagerReady, setCurrentMap, gameSeed]);
  
  // Boss health tracking - check for boss health changes on Map X
  useEffect(() => {
    if (!appReady || !mapManagerReady || !mapManager.current) {
      return;
    }
    
    const updateBossHealth = () => {
      debugLog(`updateBossHealth: currentMap='${currentMap}', hasMapManager=${!!mapManager.current}, hasMapXInstance=${!!(mapManager.current && mapManager.current.mapXInstance)}, appReady=${appReady}, mapManagerReady=${mapManagerReady}`, 'boss');
      
      // Check both React state AND MapManager current map for boss UI visibility
      const actualCurrentMap = mapManager.current?.currentMap || currentMap;
      const isOnMapX = actualCurrentMap === 'mapareax';
      
      debugLog(`BossUI check: reactState='${currentMap}', actualMap='${actualCurrentMap}', isOnMapX=${isOnMapX}`, 'boss');
      
      if (isOnMapX && mapManager.current && mapManager.current.mapXInstance) {
        const bossInfo = mapManager.current.mapXInstance.getBossInfo();
        debugLog(`BossUI visibility update: isVisible=${bossInfo.isVisible}, health=${bossInfo.currentHealth}/${bossInfo.maxHealth}`, 'boss');
        setShowBossUI(bossInfo.isVisible);
        setBossHealth(bossInfo.currentHealth);
        setMaxBossHealth(bossInfo.maxHealth);
      } else {
        debugLog(`BossUI hidden: reactState='${currentMap}', actualMap='${actualCurrentMap}', isOnMapX=${isOnMapX}, hasMapXInstance=${!!(mapManager.current && mapManager.current.mapXInstance)}`, 'boss');
        setShowBossUI(false);
      }
    };
    
    // Update boss health immediately
    updateBossHealth();
    
    // Set up interval to continuously update boss health
    const bossHealthInterval = setInterval(updateBossHealth, 100);
    
    // Store interval ID for cleanup
    if (!window.gameIntervals) window.gameIntervals = [];
    window.gameIntervals.push(bossHealthInterval);
    
    return () => {
      clearInterval(bossHealthInterval);
    };  }, [currentMap, appReady, mapManagerReady]);

  // Debug log current map changes
  useEffect(() => {
    debugLog(`GameScreen: currentMap changed to '${currentMap}'`, 'map');
  }, [currentMap]);

  useEffect(() => {
    return () => {
      // This runs when GameScreen component is actually unmounted
      console.log('GameScreen component unmounting, cleaning up systems');
      
      // Cleanup BossAI
      if (bossAI.current) {
        document.removeEventListener('keydown', bossAI.current.handleKeyDown);
        bossAI.current.destroy();
        bossAI.current = null;
        debugLog('BossAI cleaned up', 'boss');
      }
      
      // Cleanup EnemyManager
      if (window.globalEnemyManager) {
        window.globalEnemyManager.destroy();
        window.globalEnemyManager = null;
        debugLog('EnemyManager cleaned up', 'enemies');
      }
      
      // Cleanup debug system
      if (debugSystem.current && debugSystem.current.destroy) {
        debugSystem.current.destroy();
        debugSystem.current = null;
      }
    };
  }, []); // Empty dependency array ensures this only runs on mount/unmount
  
  // Add debug logging to track debug system state and auto-fix missing button
  useEffect(() => {
    const interval = setInterval(() => {
      if (debugSystem.current) {
        debugLog('Debug system status: exists, overlayId: ' + debugSystem.current.overlayId, 'debug');
      } else {
        debugLog('Debug system status: not found', 'debug');
      }
      
      const debugButton = document.getElementById('debug-toggle-button');
      debugLog('Debug button status: ' + (debugButton ? 'exists' : 'missing') + ' ' + debugButton?.style?.display, 'debug');
      
      // Auto-fix missing debug button if debug system exists
      if (debugSystem.current && !debugButton) {
        debugLog('Auto-fixing missing debug button...', 'debug');
        try {
          // Create a new debug button
          const autoFixButton = document.createElement('button');
          autoFixButton.id = 'debug-toggle-button';
          autoFixButton.innerHTML = 'Debug<br><small style="font-size:10px;">O:Open P:Hide</small>';
          autoFixButton.style.position = 'fixed';
          autoFixButton.style.top = '20px';
          autoFixButton.style.right = '20px';
          autoFixButton.style.zIndex = '10001';
          autoFixButton.style.padding = '12px 16px';
          autoFixButton.style.fontSize = '13px';
          autoFixButton.style.background = 'rgba(30,0,60,0.95)';
          autoFixButton.style.color = '#a259ff';
          autoFixButton.style.border = '2px solid #a259ff';
          autoFixButton.style.borderRadius = '12px';
          autoFixButton.style.cursor = 'pointer';
          autoFixButton.style.boxShadow = '0 0 16px #a259ff55';
          autoFixButton.style.transition = 'all 0.3s ease';
          autoFixButton.style.userSelect = 'none';
          autoFixButton.style.fontWeight = 'bold';
          autoFixButton.style.letterSpacing = '1px';
          autoFixButton.style.textShadow = '0 0 8px #a259ff88';
          autoFixButton.style.textAlign = 'center';
          autoFixButton.style.lineHeight = '1.2';
          autoFixButton.style.display = 'block';
          
          // Add click handler to toggle debug - use direct method first
          autoFixButton.addEventListener('click', () => {
            console.log('Auto-fix debug button clicked, attempting to toggle debug...');
            
            // Method 0: Try reviving first if destroyed
            if (debugSystem.current && typeof debugSystem.current.revive === 'function') {
              debugSystem.current.revive();
            }
            
            // Method 1: Try calling toggleDebug directly on debug system
            if (debugSystem.current && typeof debugSystem.current.toggleDebug === 'function') {
              console.log('Using debugSystem.current.toggleDebug()');
              debugSystem.current.toggleDebug();
              return;
            }
            
            // Method 2: Try global debug overlay
            if (window.globalDebugOverlay && typeof window.globalDebugOverlay.toggleDebug === 'function') {
              console.log('Using window.globalDebugOverlay.toggleDebug()');
              window.globalDebugOverlay.toggleDebug();
              return;
            }
            
            // Method 3: Keyboard event simulation
            console.log('Using keyboard event simulation');
            const keyEvent = new KeyboardEvent('keydown', {
              key: 'o',
              code: 'KeyO',
              keyCode: 79,
              which: 79,
              bubbles: true,
              cancelable: true
            });
            document.dispatchEvent(keyEvent);
            
            // Method 4: Last resort - manual overlay toggle
            setTimeout(() => {
              const debugOverlay = document.getElementById('debug-overlay');
              if (debugOverlay) {
                const isVisible = debugOverlay.style.display !== 'none' && 
                                 debugOverlay.style.visibility !== 'hidden';
                debugOverlay.style.display = isVisible ? 'none' : 'block';
                debugOverlay.style.visibility = isVisible ? 'hidden' : 'visible';
                console.log('Auto-fix manual overlay toggle:', isVisible ? 'hidden' : 'shown');
              }
            }, 100);
          });
          
          // Add hover effects
          autoFixButton.addEventListener('mouseenter', () => {
            autoFixButton.style.background = 'rgba(162,89,255,0.15)';
            autoFixButton.style.color = '#fff';
            autoFixButton.style.boxShadow = '0 0 24px #a259ff88';
          });
          
          autoFixButton.addEventListener('mouseleave', () => {
            autoFixButton.style.background = 'rgba(30,0,60,0.95)';
            autoFixButton.style.color = '#a259ff';
            autoFixButton.style.boxShadow = '0 0 16px #a259ff55';
          });
          
          document.body.appendChild(autoFixButton);
          debugLog('Debug button auto-fixed', 'debug');
        } catch (error) {
          debugLog('Failed to auto-fix debug button: ' + error.message, 'debug');
        }
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  // Sync BossAI debug mode with debug configuration and boss entity
  useEffect(() => {
    if (!bossAI.current || !mapManagerReady) return;
    
    // Simple synchronization using global debug config (does NOT auto-enable boss logging)
    const syncBossAI = () => {
      if (window.game && window.game.debugConfig) {
        // Update boss AI debug mode based on boss control setting (separate from logging)
        if (bossAI.current) {
          bossAI.current.setDebugMode(window.game.debugConfig.bossControlEnabled);
        }
        
        // Connect BossAI to the boss entity if we're on Map X
        if (currentMap === 'mapareax' && mapManager.current && mapManager.current.mapXInstance) {
          const bossEntity = mapManager.current.mapXInstance.boss;
          if (bossEntity && bossAI.current) {
            bossAI.current.setBossEntity(bossEntity);
            debugLog('BossAI connected to boss entity', 'boss');
          }
        }
      } else {
        // Fallback: Try importing debug config (does NOT auto-enable boss logging)
        import('../development/utils/Debug.js').then(({ debugConfig }) => {
          if (debugConfig && bossAI.current) {
            // Use boss control flag instead of logging flag
            bossAI.current.setDebugMode(debugConfig.bossControlEnabled);
            
            // Connect BossAI to the boss entity if we're on Map X
            if (currentMap === 'mapareax' && mapManager.current && mapManager.current.mapXInstance) {
              const bossEntity = mapManager.current.mapXInstance.boss;
              if (bossEntity) {
                bossAI.current.setBossEntity(bossEntity);
                debugLog('BossAI connected to boss entity (fallback)', 'boss');
              }
            }
          }
        }).catch(error => {
          console.warn('Could not sync BossAI with debug config:', error);
        });
      }
    };
    
    // Initial sync
    syncBossAI();
    
    // Set up periodic sync to catch debug config changes
    const syncInterval = setInterval(syncBossAI, 1000);
    
    return () => {
      clearInterval(syncInterval);
      // Clean up boss connection interval
      if (window.game && window.game.bossConnectionInterval) {
        clearInterval(window.game.bossConnectionInterval);
        delete window.game.bossConnectionInterval;
      }
    };
  }, [currentMap, mapManagerReady]);

  return (
    <>
      <div 
        ref={gameContainerRef}
        style={{
          width: window.innerWidth + 'px',
          height: window.innerHeight + 'px',
          overflow: 'hidden',
          position: 'absolute',
          left: 0,
          top: 0
        }}
      />
      {appReady && (
        <>
          <PlayerUI 
            playerHealth={playerHealth}
            maxHealth={5}
            petAttackCooldown={petAttackCooldown}
          />
          <BossUI 
            bossHealth={bossHealth}
            maxBossHealth={maxBossHealth}
            isVisible={showBossUI}
          />
          <ObjectiveUI 
            currentMap={currentMap}
          />
          <OptionsMenu
            isVisible={showOptionsMenu}
            onContinue={handleContinue}
            onReturnToMain={handleReturnToMain}
            onExit={handleExitGame}
            onSaveGame={() => setShowSaveMenu(true)}
            onLoadGame={() => setShowLoadMenu(true)}
            initialMusicVolume={5}
            initialSfxVolume={7}
          />
          
          {/* Save Game Menu */}
          {showSaveMenu && (
            <SaveLoadMenu
              mode="save"
              onClose={() => setShowSaveMenu(false)}
              onSaveGame={handleSaveGame}
              currentGameState={getCurrentGameState()}
              isInGame={true}
            />
          )}
          
          {/* Load Game Menu */}
          {showLoadMenu && (
            <SaveLoadMenu
              mode="load"
              onClose={() => setShowLoadMenu(false)}
              onLoadGame={handleLoadGame}
              isInGame={true}
            />
          )}
        </>
      )}
      {showGameOver && (
        <GameOverScreen
          onMainMenu={handleGameOverMainMenu}
          onRestartLevel={handleRestartLevel}
          onDebugNavigateToScreen={onDebugNavigateToScreen}
        />
      )}
    </>
  );
}