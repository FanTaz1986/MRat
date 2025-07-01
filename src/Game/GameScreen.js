import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../stores/gameStore";
import { initializeGameEngine } from "./engine/GameEngine";
// Import using relative path to fix case sensitivity issues
import MapManager from './maps/MapManager'; // Use relative path to avoid case sensitivity issues
import { playAmbianceForMap } from "../utils/AudioManager";
import { createDebugOverlay, initializeConsoleCapture, debugLog } from "../development/utils/Debug";

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

export default function GameScreen({ onGameEnd, onDebugNavigateToScreen }) {
  const gameContainerRef = useRef(null);
  const pixiApp = useRef(null);
  const mapManager = useRef(null);
  const debugSystem = useRef(null);
  const { currentMap, setCurrentMap } = useGameStore();
  const [appReady, setAppReady] = useState(false);
  const [mapManagerReady, setMapManagerReady] = useState(false);
  
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
        console.log('Creating PIXI Application...');
        
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
        
        console.log('PIXI Application created:', {
          hasApp: !!pixiApp.current,
          hasStage: !!pixiApp.current.stage,
          hasRenderer: !!pixiApp.current.renderer,
          hasView: !!pixiApp.current.view,
          hasCanvas: !!pixiApp.current.canvas
        });
        
        // In PixiJS v7.4.3, stage should be immediately available
        // But let's add a small wait to ensure it's fully initialized
        await new Promise(resolve => setTimeout(resolve, 50));
        
        console.log('After wait, PIXI app state:', {
          hasApp: !!pixiApp.current,
          hasStage: !!pixiApp.current.stage,
          stageChildren: pixiApp.current.stage?.children?.length || 0
        });
        
        // Double-check that stage is available
        if (!pixiApp.current.stage) {
          console.error('PIXI stage not available after initialization');
          throw new Error('PIXI stage initialization failed');
        }
        
        // Add canvas to DOM using modern API (check for both .view and .canvas)
        const canvas = pixiApp.current.canvas || pixiApp.current.view;
        gameContainerRef.current.appendChild(canvas);
        
        // Force canvas to exactly match container size with no CSS scaling
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = containerHeight + 'px';
        canvas.style.display = 'block';
        
        console.log('PIXI app initialized successfully with stage:', !!pixiApp.current.stage);
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
    
    // Additional safety check: ensure stage is available
    if (!pixiApp.current.stage) {
      console.error('PIXI app stage is not available, cannot initialize MapManager');
      return;
    }
    
    // Add a small delay to ensure PIXI app is fully initialized
    const initializeWithDelay = async () => {
      try {
        // Wait a frame to ensure PIXI app is fully ready
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Double-check that stage is still available
        if (!pixiApp.current || !pixiApp.current.stage) {
          console.error('PIXI app or stage lost during initialization delay');
          return;
        }
        
        console.log('Initializing game engine...');
        
        // Initialize game engine with the PIXI app
        initializeGameEngine(pixiApp.current);
        
        // Initialize console capture for debug system
        initializeConsoleCapture();
        
        // Create map manager with additional safety checks
        console.log('Creating MapManager with app:', {
          hasApp: !!pixiApp.current,
          hasStage: !!pixiApp.current.stage,
          stageChildren: pixiApp.current.stage?.children?.length || 0
        });
        
        mapManager.current = new MapManager(pixiApp.current);
        console.log('MapManager created successfully');
        
        // Set MapManager as ready
        setMapManagerReady(true);
        
        // Initialize debug system
        debugSystem.current = createDebugOverlay(pixiApp.current);
        
        debugLog('Game engine initialized', 'game');
        
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
      if (debugSystem.current && debugSystem.current.destroy) {
        debugSystem.current.destroy();
      }
      
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
    // Handle map changes
  useEffect(() => {
    console.log('Map loading useEffect triggered:', {
      appReady,
      mapManagerReady,
      hasMapManager: !!mapManager.current,
      currentMap
    });
    
    if (!appReady || !mapManagerReady || !mapManager.current) {
      console.log('Map loading skipped: appReady =', appReady, ', mapManagerReady =', mapManagerReady, ', mapManager =', !!mapManager.current);
      return;
    }
    
    console.log('Loading map:', currentMap);
    
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
      }, 100); // 100ms delay to ensure everything is initialized
      
      // Expose character and camera globally for debug access
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
    };
    
    mapManager.current.loadMap(currentMap, handleMapLoaded);
    
    return () => {
      // Clean up previous map resources
    };
  }, [currentMap, appReady, mapManagerReady]);  // Connect portal teleport handler through map manager
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
  return (
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
  );
}