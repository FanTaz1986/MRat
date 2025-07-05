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

export default function GameScreen({ onGameEnd, onReturnToMenu, onDebugNavigateToScreen }) {
  const gameContainerRef = useRef(null);
  const pixiApp = useRef(null);
  const mapManager = useRef(null);
  const debugSystem = useRef(null);
  const bossAI = useRef(null);
  const { currentMap, setCurrentMap } = useGameStore();
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
  
  // Game over state
  const [showGameOver, setShowGameOver] = useState(false);
  
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
              return Math.max(minHealth, Math.min(5, newHealth));
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
    
    // Prevent re-initialization if MapManager already exists
    if (mapManager.current) {
      console.log('MapManager already exists, skipping initialization');
      return;
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
        debugLog('Creating MapManager with app: hasApp=' + !!pixiApp.current + ', hasStage=' + !!pixiApp.current.stage + ', stageChildren=' + (pixiApp.current.stage?.children?.length || 0), 'system');
        
        mapManager.current = new MapManager(pixiApp.current);
        debugLog('MapManager created successfully', 'system');
        
        // Initialize Boss AI
        bossAI.current = new BossAI();
        debugLog('BossAI initialized', 'boss');
        
        // Expose mapManager globally for ObjectiveUI
        window.gameMapManager = mapManager.current;
        
        // Set MapManager as ready
        setMapManagerReady(true);
        
        // Initialize debug system
        const handleHealthChange = (change) => {
          setPlayerHealth(prev => {
            const newHealth = prev + change;
            // If invulnerability is enabled, prevent health from going below 1
            const minHealth = isInvulnerable() ? 1 : 0;
            // Clamp between minHealth and 5 hearts
            return Math.max(minHealth, Math.min(5, newHealth));
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
  }, [appReady, onDebugNavigateToScreen]);
  
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
        
        // Store interval ID for cleanup
        if (!window.gameIntervals) window.gameIntervals = [];        window.gameIntervals.push(cooldownInterval);
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
        // Update boss AI debug mode based on debug logging setting
        // This ONLY reads the setting, it NEVER auto-enables boss logging
        if (bossAI.current) {
          bossAI.current.setDebugMode(window.game.debugConfig.logCategories.boss);
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
            // This ONLY reads the setting, it NEVER auto-enables boss logging
            bossAI.current.setDebugMode(debugConfig.logCategories.boss);
            
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
            initialMusicVolume={5}
            initialSfxVolume={7}
          />
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