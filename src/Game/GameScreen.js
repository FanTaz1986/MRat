import React, { useRef, useEffect, useState } from "react";
import * as PIXI from "pixi.js";
import { useGameStore } from "../stores/gameStore";
import { initializeGameEngine } from "./engine/GameEngine";
// Import using relative path to fix case sensitivity issues
import MapManager from './maps/MapManager'; // Use relative path to avoid case sensitivity issues
import { playAmbianceForMap } from "../utils/AudioManager";
import { createDebugOverlay, initializeConsoleCapture, debugLog } from "../development/utils/Debug";

// PIXI settings for high-quality character rendering
PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.LINEAR; // Use linear scaling for smooth character scaling
PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON; // Enable mipmapping for better scaling quality
PIXI.settings.ROUND_PIXELS = false; // Don't round pixels for smoother character movement
PIXI.settings.PRECISION_FRAGMENT = 'highp'; // Use high precision for better quality

export default function GameScreen({ onGameEnd }) {
  const gameContainerRef = useRef(null);
  const pixiApp = useRef(null);
  const mapManager = useRef(null);
  const debugSystem = useRef(null);
  const { currentMap, setCurrentMap } = useGameStore();
  const [appReady, setAppReady] = useState(false);
  
  // Initialize PixiJS app on component mount
  useEffect(() => {
    if (!gameContainerRef.current) return;
    
    // Get actual container dimensions
    const containerRect = gameContainerRef.current.getBoundingClientRect();
    const containerWidth = containerRect.width || window.innerWidth;
    const containerHeight = containerRect.height || window.innerHeight;
    
    // Create PIXI Application with high-quality settings for character art
    pixiApp.current = new PIXI.Application({
      width: containerWidth,
      height: containerHeight,
      backgroundColor: 0x000000,
      resolution: window.devicePixelRatio || 1, // Use device pixel ratio for crisp rendering
      autoDensity: true, // Enable auto density for better scaling
      antialias: true, // Enable antialiasing for smooth character scaling
      powerPreference: 'high-performance', // Use high-performance GPU if available
    });
    
// Add canvas to DOM
gameContainerRef.current.appendChild(pixiApp.current.view);
// Force canvas to exactly match container size with no CSS scaling
pixiApp.current.view.style.width = containerWidth + 'px';
pixiApp.current.view.style.height = containerHeight + 'px';
pixiApp.current.view.style.display = 'block';
      // Initialize game engine with the PIXI app
    initializeGameEngine(pixiApp.current);
    
    // Initialize console capture for debug system
    initializeConsoleCapture();
      // Create map manager
    mapManager.current = new MapManager(pixiApp.current);
      // Initialize debug system
    debugSystem.current = createDebugOverlay(pixiApp.current);
    
    debugLog('Game engine initialized', 'game');
    
    // Update debug system when map manager is created
    if (debugSystem.current && debugSystem.current.setMapManager) {
      debugSystem.current.setMapManager(mapManager.current);
    }
    
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
    
    window.addEventListener('resize', resizeHandler);    // Set app as ready
    setAppReady(true);
    
    // Expose game objects globally for debug access
    if (!window.game) {
      window.game = {};
    }
    window.game.mapManager = mapManager.current;
    window.game.app = pixiApp.current;
    
    console.log('🎮 Game objects exposed globally:', {
      mapManager: !!window.game.mapManager,
      app: !!window.game.app
    });
      return () => {
      window.removeEventListener('resize', resizeHandler);
      if (debugSystem.current && debugSystem.current.destroy) {
        debugSystem.current.destroy();
      }
      pixiApp.current.destroy(true, true);
    };
  }, []);
    // Handle map changes
  useEffect(() => {
    if (!appReady || !mapManager.current) return;    // Load the current map
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
        
        console.log('🎮 Character, pet, and camera exposed globally:', {
          character: !!window.game.characterManager.character,
          pet: !!window.game.characterManager.pet,
          camera: !!window.game.cameras.main
        });
      }
    };
    
    mapManager.current.loadMap(currentMap, handleMapLoaded);
    
    return () => {
      // Clean up previous map resources
    };
  }, [currentMap, appReady]);  // Connect portal teleport handler through map manager
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