import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as PIXI from 'pixi.js';
import { 
  createGeneralTab, 
  createMapTab, 
  createToolsTab, 
  createPetTab, 
  createLoggingTab, 
  createAnalysisTab, 
  createCombatTab, 
  createBossTab, 
  createEnemyTab,
  createScreensTab,
  createSavingTab 
} from './debugTabs/index.js';

// Debug configuration and state
let debugConfig = {
  showConsoleMessages: true,
  showStats: true,
  muteDebugLogs: false,
  invulnerability: false, // Player invulnerability debug toggle
  bossControlEnabled: false, // Boss control toggle (separate from logging)
  thunderAutoRefresh: false, // Auto-refresh thunder coordinate display
  logCategories: {
    general: false,
    portal: false,
    character: false,
    camera: false,
    map: false,
    audio: false,
    asset: false,
    game: false,
    system: false,
    rendering: false,
    collision: false,
    animation: false,
    input: false,
    performance: false,
    pet: false, // Debug logging disabled by default
    petAutoFollow: false, // Pet auto-follow debugging - separate from general pet debug
    ui: false, // UI component debugging
    debug: false, // Debug system internal logging
    boss: false, // Boss fight debugging - NEVER auto-enabled
    bossattackz: false, // Boss Z attack (range) debugging - separate toggle
    bossattackx: false, // Boss X attack (bolt) debugging - separate toggle
    bossattackc: false, // Boss C attack (melee) debugging - separate toggle
    optionsSubmenu: false, // Options submenu debugging (Audio, How to Play buttons)
    enemies: false, // Enemy system debugging
    saving: false, // Save operation debugging
    loading: false // Load operation debugging
  }
};

// Export debugConfig for external access
export { debugConfig };

// Debug message buffer for reduced console spam
let debugMessageBuffer = new Map();
let lastBufferClear = Date.now();

// Console log capture system
let consoleLogHistory = [];
let maxLogHistory = 500;
let originalConsoleLog = console.log;

/**
 * Enhanced debug logger that captures logs and respects debug settings
 */
export function debugLog(message, category = 'general', frequency = 1000) {
  const now = Date.now();
  
  // Add to log history
  addToLogHistory(message, category, now);
  
  // Check if this category is enabled (no debug spam)
  if (!debugConfig.logCategories[category]) return;
  
  // Check if muted (no debug spam)
  if (debugConfig.muteDebugLogs) return;
  
  const key = `${category}_${message}`;
  
  // Clear buffer every 30 seconds
  if (now - lastBufferClear > 30000) {
    debugMessageBuffer.clear();
    lastBufferClear = now;
  }
  
  // Check if we should log this message based on frequency
  if (debugMessageBuffer.has(key)) {
    const lastLog = debugMessageBuffer.get(key);
    if (now - lastLog < frequency) return;
  }
  
  debugMessageBuffer.set(key, now);
  originalConsoleLog(`[${category.toUpperCase()}] ${message}`);
}

/**
 * Internal debug logging for the debug system itself
 */
function internalDebugLog(message) {
  if (debugConfig.logCategories.debug) {
    originalConsoleLog(`[DEBUG-SYSTEM] ${message}`);
  }
}

/**
 * Add log to history for debug overlay
 */
function addToLogHistory(message, category, timestamp) {
  consoleLogHistory.unshift({
    message,
    category,
    timestamp,
    time: new Date(timestamp).toLocaleTimeString()
  });
  
  // Keep only the most recent logs
  if (consoleLogHistory.length > maxLogHistory) {
    consoleLogHistory = consoleLogHistory.slice(0, maxLogHistory);
  }
}

/**
 * Initialize console log capture
 */
export function initializeConsoleCapture() {
  // Override console.log to capture all logs
  console.log = function(...args) {
    const message = args.join(' ');
    addToLogHistory(message, 'general', Date.now());
    originalConsoleLog.apply(console, args);
  };
}

/**
 * Restore original console.log
 */
export function restoreConsoleLog() {
  console.log = originalConsoleLog;
}

/**
 * Get invulnerability state
 */
export function isInvulnerable() {
  return debugConfig.invulnerability;
}

/**
 * Set invulnerability state
 */
export function setInvulnerability(enabled) {
  debugConfig.invulnerability = enabled;
  debugLog(`Invulnerability ${enabled ? 'enabled' : 'disabled'}`, 'debug');
}

/**
 * Simple debug overlay component
 */
function SimpleDebugOverlay({ 
  showDebug, 
  mapManager, 
  character, 
  camera,
  onClose,
  onNavigateToScreen,
  onHealthChange // New prop for health management
}) {  const [activeTab, setActiveTab] = useState('general');
  const [, setForceUpdate] = useState({});

  // Create a function to trigger re-renders
  const forceUpdate = () => setForceUpdate({});

  internalDebugLog(`SimpleDebugOverlay render: showDebug = ${showDebug}`);
  
  if (!showDebug) {
    internalDebugLog('SimpleDebugOverlay returning null (showDebug is false)');
    return null;
  }
  
  internalDebugLog('SimpleDebugOverlay rendering overlay content');
  
  const triggerUpdate = () => {
    forceUpdate();
  };

  const toggleLogging = (category) => {
    if (category === 'boss') {
      // Track when user manually enables/disables boss logging
      const newValue = !debugConfig.logCategories.boss;
      debugConfig.logCategories.boss = newValue;
      
      // Store user preference to allow boss logging
      sessionStorage.setItem('userEnabledBossLogging', newValue.toString());
      
      internalDebugLog(`Boss debug logging ${newValue ? 'manually enabled' : 'manually disabled'} by user`);
    } else if (category === 'all') {
      const newValue = !Object.values(debugConfig.logCategories).every(v => v);
      Object.keys(debugConfig.logCategories).forEach(key => {
        debugConfig.logCategories[key] = newValue;
      });
      // Clear boss logging user preference when toggling all
      if (newValue) {
        sessionStorage.setItem('userEnabledBossLogging', 'true');
      }
    } else if (category === 'none') {
      Object.keys(debugConfig.logCategories).forEach(key => {
        debugConfig.logCategories[key] = false;
      });
      // Clear boss logging user preference when disabling all
      sessionStorage.removeItem('userEnabledBossLogging');
    } else {
      debugConfig.logCategories[category] = !debugConfig.logCategories[category];
    }    debugLog(`Logging ${category}: ${category === 'none' ? 'all disabled' : (debugConfig.logCategories[category] ? 'enabled' : 'disabled')}`, 'system');
    triggerUpdate(); // Force re-render to update checkbox states
  };

  const getTileInfo = (character, mapManager) => {
    if (!character || !character.position || !mapManager) {
      return { tile: 'N/A', tileProps: 'N/A', tileName: 'N/A' };
    }
    
    // Calculate tile position (assuming 32x32 tile size)
    const tileSize = 32;
    const tileX = Math.floor(character.position.x / tileSize);
    const tileY = Math.floor(character.position.y / tileSize);
    
    return {
      tile: `(${tileX}, ${tileY})`,
      tileProps: `X:${tileX} Y:${tileY}`,
      tileName: `Tile_${tileX}_${tileY}`
    };
  };  const analyzeMapProps = () => {
    if (!mapManager) {
      debugLog('Map manager not available for analysis', 'system');
      return;
    }
    
    debugLog('=== DETAILED MAP PROPS ANALYSIS ===', 'system');
    debugLog(`Current Map: ${mapManager.currentMap || 'Unknown'}`, 'system');
    
    // Map dimensions and grid info
    const currentMapInstance = mapManager.currentMapInstance;
    let tileWidth = 32;  // Default tile width
    let tileHeight = 32; // Default tile height
    let mapPixelWidth = 0;
    let mapPixelHeight = 0;
    let gridWidth = 0;
    let gridHeight = 0;
    
    if (currentMapInstance) {
      debugLog(`--- MAP GRID INFORMATION ---`, 'system');
      
      // Detect map type and get correct tile sizes
      if (currentMapInstance.tileWidth && currentMapInstance.tileHeight) {
        // Map1/Map2 style with custom tile sizes
        tileWidth = currentMapInstance.tileWidth;
        tileHeight = currentMapInstance.tileHeight;
        mapPixelWidth = currentMapInstance.mapWidth || 0;
        mapPixelHeight = currentMapInstance.mapHeight || 0;
        gridWidth = currentMapInstance.gridSize || 16;
        gridHeight = currentMapInstance.gridSize || 16;
        
        debugLog(`Map Type: Custom grid map (Map1/Map2 style)`, 'system');
        debugLog(`Map Pixel Size: ${mapPixelWidth} x ${mapPixelHeight} pixels`, 'system');
        debugLog(`Grid Size: ${gridWidth} x ${gridHeight} tiles`, 'system');
        debugLog(`Tile Size: ${tileWidth} x ${tileHeight} pixels`, 'system');
      } else {
        // Standard 32x32 tile map
        mapPixelWidth = currentMapInstance.mapWidth || 0;
        mapPixelHeight = currentMapInstance.mapHeight || 0;
        gridWidth = Math.floor(mapPixelWidth / 32);
        gridHeight = Math.floor(mapPixelHeight / 32);
        
        debugLog(`Map Type: Standard 32x32 tile map`, 'system');
        debugLog(`Map Pixel Size: ${mapPixelWidth} x ${mapPixelHeight} pixels`, 'system');
        debugLog(`Grid Size: ${gridWidth} x ${gridHeight} tiles (calculated)`, 'system');
        debugLog(`Tile Size: 32 x 32 pixels (standard)`, 'system');
      }
      
      debugLog(`Total Tiles: ${gridWidth * gridHeight}`, 'system');
    }    
    // Character position and tile details
    if (character && character.position) {
      // Check if character is within map bounds (only log warnings)
      if (character.position.x > mapPixelWidth || character.position.y > mapPixelHeight) {
        debugLog(`⚠️ WARNING: Character is outside map bounds! Map size: ${mapPixelWidth}x${mapPixelHeight}`, 'system');
      }
    }    
    // Camera position and tile with distance analysis
    if (camera && camera.position) {
      const camTileX = Math.floor(camera.position.x / tileWidth);
      const camTileY = Math.floor(camera.position.y / tileHeight);
      const camTileIndex = camTileY * gridWidth + camTileX;
      debugLog(`--- CAMERA ANALYSIS ---`, 'system');
      debugLog(`Camera Position: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)})`, 'system');
      debugLog(`Camera Tile: (${camTileX}, ${camTileY}) | Tile Index: ${camTileIndex}`, 'system');
      
      // Calculate camera-character distance
      if (character && character.position) {
        const distanceX = Math.abs(camera.position.x - character.position.x);
        const distanceY = Math.abs(camera.position.y - character.position.y);
        const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
        debugLog(`Camera-Character Distance: X=${distanceX.toFixed(1)}, Y=${distanceY.toFixed(1)}, Total=${totalDistance.toFixed(1)}`, 'system');
      }
    }    
    // Enhanced Portal analysis
    if (mapManager.portalManager && mapManager.portalManager.portals) {
      debugLog(`--- DETAILED PORTAL ANALYSIS (${mapManager.portalManager.portals.length} portals) ---`, 'system');
      mapManager.portalManager.portals.forEach((portal, index) => {
        if (portal.position) {
          const portalTileX = Math.floor(portal.position.x / tileWidth);
          const portalTileY = Math.floor(portal.position.y / tileHeight);
          const portalTileIndex = portalTileY * gridWidth + portalTileX;
          
          debugLog(`Portal ${index + 1} - Basic Info:`, 'system');
          debugLog(`  Position: (${portal.position.x}, ${portal.position.y})`, 'system');
          debugLog(`  Tile: (${portalTileX}, ${portalTileY}) | Index: ${portalTileIndex}`, 'system');
          debugLog(`  Target: ${portal.targetMap || 'Unknown'}`, 'system');
          
          // Portal visual properties
          debugLog(`Portal ${index + 1} - Visual Properties:`, 'system');
          debugLog(`  Visible: ${portal.visible !== false}`, 'system');
          debugLog(`  Alpha: ${portal.alpha || 1}`, 'system');
          debugLog(`  Scale: ${portal.scale?.x || 1}x${portal.scale?.y || 1}`, 'system');
          debugLog(`  Anchor: (${portal.anchor?.x || 0}, ${portal.anchor?.y || 0})`, 'system');
          debugLog(`  Width/Height: ${portal.width || 'unknown'}x${portal.height || 'unknown'}`, 'system');
          
          // Portal sprite/texture info
          if (portal.texture) {
            debugLog(`  Texture: ${portal.texture.baseTexture?.resource?.url || 'unknown'}`, 'system');
            debugLog(`  Texture Size: ${portal.texture.width}x${portal.texture.height}`, 'system');
          }
          
          // Distance from character
          if (character && character.position) {
            const distanceX = Math.abs(portal.position.x - character.position.x);
            const distanceY = Math.abs(portal.position.y - character.position.y);
            const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
            debugLog(`  Distance from Character: X=${distanceX.toFixed(1)}, Y=${distanceY.toFixed(1)}, Total=${totalDistance.toFixed(1)}`, 'system');
            
            const tileDistance = Math.max(tileWidth, tileHeight) * 2; // 2 tiles
            if (totalDistance < tileDistance) {
              debugLog(`  ✅ Portal is VERY CLOSE to character (within 2 tiles)`, 'system');
            } else if (totalDistance < tileDistance * 2) {
              debugLog(`  ⚠️ Portal is close to character (within 4 tiles)`, 'system');
            } else {
              debugLog(`  ❌ Portal is FAR from character`, 'system');
            }
          }
          
          // Portal interaction area
          debugLog(`Portal ${index + 1} - Interaction Info:`, 'system');
          if (portal.hitArea) {
            debugLog(`  Hit Area: Defined`, 'system');
          } else {
            debugLog(`  Hit Area: Using sprite bounds`, 'system');
          }
          debugLog(`  Interactive: ${portal.interactive !== false}`, 'system');
          debugLog(`  Button Mode: ${portal.buttonMode === true}`, 'system');
        }
      });
    }
      // Props analysis with enhanced details for PIXI sprites
    try {
      if (currentMapInstance && currentMapInstance.props) {
        debugLog(`--- TILE PROPS ANALYSIS (${currentMapInstance.props.length} props) ---`, 'system');
        
        // Detect prop type
        const firstProp = currentMapInstance.props[0];
        let isPixiSprite = false;
        if (firstProp && firstProp.texture && firstProp.position && typeof firstProp.position.x === 'number') {
          isPixiSprite = true;
          debugLog(`Props detected as PIXI sprites`, 'system');
        } else {
          debugLog(`Props detected as raw data objects`, 'system');
        }
        
        // Find props near character
        const nearbyProps = [];
        if (character && character.position) {
          currentMapInstance.props.forEach((prop, index) => {
            let propX, propY;
            
            if (isPixiSprite) {
              // PIXI sprite - position is accessible directly
              propX = prop.position.x;
              propY = prop.position.y;
            } else {
              // Raw data object
              propX = prop.position?.x;
              propY = prop.position?.y;
            }
            
            if (propX !== undefined && propY !== undefined) {
              const distanceX = Math.abs(propX - character.position.x);
              const distanceY = Math.abs(propY - character.position.y);
              const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
              
              const nearbyDistance = Math.max(tileWidth, tileHeight) * 5; // 5 tiles
              if (totalDistance < nearbyDistance) {
                nearbyProps.push({ prop, index, distance: totalDistance, x: propX, y: propY });
              }
            }
          });
        }
        
        if (nearbyProps.length > 0) {
          debugLog(`--- NEARBY PROPS (within 5 tiles of character) ---`, 'system');
          nearbyProps.sort((a, b) => a.distance - b.distance);
          nearbyProps.forEach(({ prop, index, distance, x, y }) => {
            const propTileX = Math.floor(x / tileWidth);
            const propTileY = Math.floor(y / tileHeight);
            const propTileIndex = propTileY * gridWidth + propTileX;
            
            let propName = 'Unnamed';
            let propTexture = 'Unknown';
            
            if (isPixiSprite) {
              propName = prop._textureFileName || prop.name || `Sprite_${index}`;
              propTexture = prop._originalTexturePath || prop._textureFileName || 'Unknown';
            } else {
              propName = prop.name || `Prop_${index}`;
              propTexture = prop.texture || 'Unknown';
            }
            
            debugLog(`Nearby Prop ${index + 1}: "${propName}" at distance ${distance.toFixed(1)}`, 'system');
            debugLog(`  Position: (${x}, ${y}) | Tile: (${propTileX}, ${propTileY}) | Index: ${propTileIndex}`, 'system');
            debugLog(`  Texture: ${propTexture}`, 'system');
            
            if (isPixiSprite && prop.scale) {
              debugLog(`  Scale: ${prop.scale.x || 1}x${prop.scale.y || 1}`, 'system');
            } else if (!isPixiSprite && prop.scale) {
              debugLog(`  Scale: ${prop.scale.x || 1}x${prop.scale.y || 1}`, 'system');
            }
          });
        }
        
        // Show first 5 props for reference
        debugLog(`--- FIRST 5 PROPS (for reference) ---`, 'system');
        currentMapInstance.props.slice(0, 5).forEach((prop, index) => {
          let propX, propY, propName, propTexture;
          
          if (isPixiSprite) {
            propX = prop.position.x;
            propY = prop.position.y;
            propName = prop._textureFileName || prop.name || `Sprite_${index}`;
            propTexture = prop._originalTexturePath || prop._textureFileName || 'Unknown';
          } else {
            propX = prop.position?.x;
            propY = prop.position?.y;
            propName = prop.name || `Prop_${index}`;
            propTexture = prop.texture || 'Unknown';
          }
          
          if (propX !== undefined && propY !== undefined) {
            const propTileX = Math.floor(propX / tileWidth);
            const propTileY = Math.floor(propY / tileHeight);
            const propTileIndex = propTileY * gridWidth + propTileX;
            debugLog(`Prop ${index + 1}: "${propName}"`, 'system');
            debugLog(`  Position: (${propX}, ${propY}) | Tile: (${propTileX}, ${propTileY}) | Index: ${propTileIndex}`, 'system');
            debugLog(`  Texture: ${propTexture}`, 'system');
          }
        });
      } else {
        debugLog('No props found or props not accessible', 'system');
      }
    } catch (error) {
      debugLog(`Error analyzing props: ${error.message}`, 'system');
    }    
    // Tile index validation
    if (character && character.position && currentMapInstance) {
      const charX = Math.floor(character.position.x / tileWidth);
      const charY = Math.floor(character.position.y / tileHeight);
      const charTileIndex = charY * gridWidth + charX;
      
      debugLog(`--- TILE INDEX VALIDATION ---`, 'system');
      debugLog(`Grid Width: ${gridWidth}, Character Y: ${charY}, Character X: ${charX}`, 'system');
      debugLog(`Calculation: ${charY} * ${gridWidth} + ${charX} = ${charTileIndex}`, 'system');
      debugLog(`Tile Size Used: ${tileWidth}x${tileHeight}`, 'system');
      
      if (charTileIndex > 1000000) {
        debugLog(`⚠️ WARNING: Tile index ${charTileIndex} is suspiciously high! Check map dimensions.`, 'system');
      }
    }
    
    // Additional debugging info for Map1 and Map2
    if (mapManager.currentMap === 'maparea1' || mapManager.currentMap === 'maparea2') {
      debugLog(`--- SPECIAL DEBUG INFO FOR ${mapManager.currentMap.toUpperCase()} ---`, 'system');
      debugLog('This is a critical map for tile debugging. Portal visibility issues may be caused by:', 'system');
      debugLog('1. Portal sprite not loading/rendering correctly', 'system');
      debugLog('2. Portal positioned behind other sprites (z-index)', 'system');
      debugLog('3. Portal alpha/visibility settings', 'system');
      debugLog('4. Camera not following character properly', 'system');
      debugLog('5. Portal texture/sprite size issues', 'system');
      debugLog('6. Large tile sizes may affect portal detection', 'system');
      
      if (character && character.position) {
        const charTileX = Math.floor(character.position.x / tileWidth);
        const charTileY = Math.floor(character.position.y / tileHeight);
        const nearbyTiles = [];
        for (let dx = -2; dx <= 2; dx++) {
          for (let dy = -2; dy <= 2; dy++) {
            const tileX = charTileX + dx;
            const tileY = charTileY + dy;
            const tileIndex = tileY * gridWidth + tileX;
            nearbyTiles.push(`[${tileX},${tileY}]=${tileIndex}`);
          }        }
        debugLog(`5x5 tile grid around character: ${nearbyTiles.join(', ')}`, 'system');
        debugLog(`Character tile size context: Each tile is ${tileWidth}x${tileHeight} pixels`, 'system');      }
    }
    
    // Enhanced portal-character tile comparison
    if (mapManager.portalManager && mapManager.portalManager.portals && character && character.position) {
      debugLog(`--- PORTAL-CHARACTER TILE COMPARISON ---`, 'system');
      mapManager.portalManager.portals.forEach((portal, index) => {
        if (portal.position) {
          const charTileX = Math.floor(character.position.x / tileWidth);
          const charTileY = Math.floor(character.position.y / tileHeight);
          const portalTileX = Math.floor(portal.position.x / tileWidth);
          const portalTileY = Math.floor(portal.position.y / tileHeight);
          
          debugLog(`Portal ${index + 1} vs Character tile comparison:`, 'system');
          debugLog(`  Character: Tile (${charTileX}, ${charTileY})`, 'system');
          debugLog(`  Portal ${index + 1}: Tile (${portalTileX}, ${portalTileY})`, 'system');
          
          if (charTileX === portalTileX && charTileY === portalTileY) {
            debugLog(`  🎯 EXACT MATCH! Character and Portal ${index + 1} are on the SAME TILE!`, 'system');
            debugLog(`  🔍 This could explain why you see the portal prompt but not the portal visually`, 'system');
            debugLog(`  💡 Portal might be rendered underneath the character or other sprites`, 'system');
          } else {
            const tileDiffX = Math.abs(charTileX - portalTileX);
            const tileDiffY = Math.abs(charTileY - portalTileY);
            const totalTileDiff = tileDiffX + tileDiffY;
            
            if (totalTileDiff <= 1) {
              debugLog(`  ⚠️ ADJACENT TILES! Portal ${index + 1} is ${totalTileDiff} tile(s) away`, 'system');
            } else {
              debugLog(`  ❌ Different tiles. Distance: ${totalTileDiff} tiles`, 'system');
            }
          }
          
          // Check pixel distance too
          const pixelDistanceX = Math.abs(character.position.x - portal.position.x);
          const pixelDistanceY = Math.abs(character.position.y - portal.position.y);
          const totalPixelDistance = Math.sqrt(pixelDistanceX * pixelDistanceX + pixelDistanceY * pixelDistanceY);
          debugLog(`  📏 Pixel distance: ${totalPixelDistance.toFixed(1)}px`, 'system');
          
          if (totalPixelDistance < 50) {
            debugLog(`  🔥 VERY CLOSE! Portal and character are within 50 pixels`, 'system');
          }
        }
      });
    }
    
    debugLog('=== END DETAILED ANALYSIS ===', 'system');
  };

  const teleportToMap = (mapId) => {
    if (mapManager && mapManager.loadMap) {
      debugLog(`Teleporting to map: ${mapId}`, 'map');
      mapManager.loadMap(mapId, () => {
        debugLog(`Successfully teleported to ${mapId}`, 'map');
        
        // Ensure camera properly centers and applies zoom after map load
        setTimeout(() => {
          // Get the latest camera reference from mapManager
          const currentCamera = mapManager.camera || window.game?.mapManager?.camera;
          const currentCharacter = mapManager.character || window.game?.characterManager?.character;
          
          if (currentCamera && currentCharacter && currentCamera.centerOn) {
            // Force zoom scale reapplication with safety checks
            try {
              if (currentCamera.mapContainer && !currentCamera.mapContainer.destroyed && 
                  currentCamera.mapContainer.scale && currentCamera.zoom) {
                currentCamera.mapContainer.scale.set(currentCamera.zoom);
                debugLog(`Zoom scale reapplied: ${currentCamera.zoom}`, 'map');
              } else {
                debugLog('Cannot reapply zoom scale: mapContainer destroyed or scale not available', 'map');
              }
            } catch (error) {
              debugLog(`Error reapplying zoom scale: ${error.message}`, 'map');
            }
            
            // Center camera on character with additional safety checks
            if (currentCamera.mapContainer && !currentCamera.mapContainer.destroyed && 
                currentCharacter && currentCharacter.position) {
              const charX = currentCharacter.position.x;
              const charY = currentCharacter.position.y;
              
              if (typeof charX === 'number' && typeof charY === 'number' && 
                  !isNaN(charX) && !isNaN(charY) && 
                  isFinite(charX) && isFinite(charY)) {
                
                currentCamera.centerOn(charX, charY);
                debugLog(`Camera re-centered after map teleport to position: (${charX}, ${charY}) with zoom: ${currentCamera.zoom}`, 'map');
              } else {
                debugLog(`Cannot center camera: invalid character position (${charX}, ${charY})`, 'map');
              }
            } else {
              debugLog('Cannot center camera: mapContainer destroyed or character position missing', 'map');
            }
          }
        }, 200); // Longer delay to ensure everything is properly initialized
      });
    } else {
      debugLog('Cannot teleport: map manager not available', 'map');
    }
  };
  const teleportToPortal = () => {
    if (mapManager && mapManager.portalManager && mapManager.portalManager.portals.length > 0) {
      const portal = mapManager.portalManager.portals[0];
      const currentCharacter = mapManager.character || window.game?.characterManager?.character;
      
      if (portal && portal.position && currentCharacter && currentCharacter.position) {
        currentCharacter.position.x = portal.position.x;
        currentCharacter.position.y = portal.position.y;
        
        // Center camera on character after teleporting to portal
        setTimeout(() => {
          // Get the latest camera reference from mapManager instead of using the potentially stale one
          const currentCamera = mapManager.camera || window.game?.mapManager?.camera;
          
          // Additional safety checks before calling centerOn
          if (currentCamera && currentCamera.centerOn && currentCamera.mapContainer && 
              !currentCamera.mapContainer.destroyed && currentCharacter && currentCharacter.position) {
            const charX = currentCharacter.position.x;
            const charY = currentCharacter.position.y;
            
            if (typeof charX === 'number' && typeof charY === 'number' && 
                !isNaN(charX) && !isNaN(charY) && 
                isFinite(charX) && isFinite(charY)) {
              
              currentCamera.centerOn(charX, charY);
              debugLog(`Camera centered on character at portal: (${charX}, ${charY})`, 'portal');
            } else {
              debugLog(`Cannot center camera: invalid character position (${charX}, ${charY})`, 'portal');
            }
          } else {
            debugLog('Cannot center camera: missing camera, mapContainer destroyed, or character', 'portal');
          }
        }, 200); // Increased delay to ensure map is fully loaded
        
        debugLog('Teleported to portal and will center camera', 'portal');
      } else {
        debugLog('Cannot teleport: portal or character position is undefined', 'portal');
      }
    } else {
      debugLog('No portal found to teleport to', 'portal');
    }
  };
  const teleportToSpawn = () => {
    if (character && character.position && mapManager) {
      // Get current map spawn point or use default
      const spawnPoint = mapManager.getCurrentMapSpawnPoint() || { x: 100, y: 100 };
      character.position.x = spawnPoint.x;
      character.position.y = spawnPoint.y;
      
      // Center camera on character after teleporting to spawn
      setTimeout(() => {
        // Get the latest camera reference from mapManager instead of using the potentially stale one
        const currentCamera = mapManager.camera || window.game?.mapManager?.camera;
        const currentCharacter = mapManager.character || window.game?.characterManager?.character;
        
        // Additional safety checks before calling centerOn
        if (currentCamera && currentCamera.centerOn && currentCamera.mapContainer && 
            !currentCamera.mapContainer.destroyed && currentCharacter && currentCharacter.position) {
          // Double-check coordinates are valid
          const charX = currentCharacter.position.x;
          const charY = currentCharacter.position.y;
          
          if (typeof charX === 'number' && typeof charY === 'number' && 
              !isNaN(charX) && !isNaN(charY) && 
              isFinite(charX) && isFinite(charY)) {
            
            currentCamera.centerOn(charX, charY);
            debugLog(`Camera centered on character at spawn: (${charX}, ${charY})`, 'character');
          } else {
            debugLog(`Cannot center camera: invalid character position (${charX}, ${charY})`, 'character');
          }
        } else {
          debugLog('Cannot center camera at spawn: missing camera, mapContainer destroyed, or character', 'character');
        }
      }, 200); // Increased delay to ensure everything is initialized
      
      debugLog('Teleported to spawn point and will center camera', 'character');
    } else {
      debugLog('Cannot teleport: character position or map manager not available', 'character');
    }
  };
  const teleportToBoss = () => {
    if (mapManager && mapManager.loadMap) {
      debugLog('Teleporting to boss map (Map X)', 'map');
      
      // First teleport to Map X (boss map) - using callback pattern like other teleport functions
      mapManager.loadMap('mapareax', () => {
        debugLog('Map X loaded successfully for boss teleport', 'map');
        
        // Set a delay to ensure the map is fully loaded
        setTimeout(() => {
          const currentCharacter = mapManager.character || window.game?.characterManager?.character;
          const bossSpawnPosition = { x: 300, y: 300 }; // Same position as boss spawn
          const characterPosition = { x: 250, y: 250 }; // Position character slightly away from boss
          
          if (currentCharacter && currentCharacter.position) {
            currentCharacter.position.x = characterPosition.x;
            currentCharacter.position.y = characterPosition.y;
            debugLog(`Character teleported to boss area at (${characterPosition.x}, ${characterPosition.y})`, 'map');
          } else {
            debugLog('Character not found for boss teleport positioning', 'map');
          }
          
          // Get the latest camera reference from mapManager
          const currentCamera = mapManager.camera || window.game?.mapManager?.camera;
          
          if (currentCamera && currentCharacter && currentCamera.centerOn) {
            // Force zoom scale reapplication with safety checks
            try {
              if (currentCamera.mapContainer && !currentCamera.mapContainer.destroyed && 
                  currentCamera.mapContainer.scale && currentCamera.zoom) {
                currentCamera.mapContainer.scale.set(currentCamera.zoom);
                debugLog(`Zoom scale reapplied: ${currentCamera.zoom}`, 'map');
              } else {
                debugLog('Cannot reapply zoom scale: mapContainer destroyed or scale not available', 'map');
              }
            } catch (error) {
              debugLog(`Error reapplying zoom scale: ${error.message}`, 'map');
            }
            
            // Center camera on character with additional safety checks
            if (currentCamera.mapContainer && !currentCamera.mapContainer.destroyed && 
                currentCharacter && currentCharacter.position) {
              const charX = currentCharacter.position.x;
              const charY = currentCharacter.position.y;
              
              if (typeof charX === 'number' && typeof charY === 'number' && 
                  !isNaN(charX) && !isNaN(charY) && 
                  isFinite(charX) && isFinite(charY)) {
                
                currentCamera.centerOn(charX, charY);
                debugLog(`Camera re-centered after boss teleport to position: (${charX}, ${charY}) with zoom: ${currentCamera.zoom}`, 'map');
              } else {
                debugLog(`Cannot center camera: invalid character position (${charX}, ${charY})`, 'map');
              }
            } else {
              debugLog('Cannot center camera: mapContainer destroyed or character position missing', 'map');
            }
          } else {
            debugLog('Camera or character not available for centering after boss teleport', 'map');
          }
          
          debugLog(`Boss teleport complete - Character at (${characterPosition.x}, ${characterPosition.y}), Boss should be at (${bossSpawnPosition.x}, ${bossSpawnPosition.y})`, 'map');
        }, 200); // Delay to ensure everything is properly initialized
      });
    } else {
      debugLog('Cannot teleport to boss: map manager not available', 'map');
    }
  };

  return React.createElement('div', {
    style: {
      position: 'fixed',
      top: '20px',
      right: '20px',
      width: '520px', // Increased width to accommodate more tabs
      minWidth: '520px', // Minimum width
      maxWidth: '800px', // Maximum width
      height: '700px', // Fixed height for consistency
      minHeight: '600px', // Minimum height
      maxHeight: '90vh', // Maximum height relative to viewport
      background: 'rgba(30,0,60,0.95)',
      border: '2px solid #a259ff',
      borderRadius: '18px',
      color: '#fff',
      fontFamily: 'monospace',
      fontSize: '14px',
      zIndex: 10000,
      boxShadow: '0 0 32px #a259ff55',
      resize: 'both', // Make it resizable
      overflow: 'hidden', // Hide overflow to prevent content bleeding
      display: 'flex',
      flexDirection: 'column'
    }  }, [
    // Header
    React.createElement('div', {
      key: 'header',
      style: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '2px solid rgba(162,89,255,0.3)',
        background: 'rgba(162, 89, 255, 0.15)'
      }
    }, [
      React.createElement('h3', {
        key: 'title',
        style: { 
          margin: 0, 
          color: '#a259ff',
          fontSize: '18px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #a259ff88',
          flex: '1' // Take available space
        }
      }, '🔧 Debug Menu'),
      React.createElement('button', {
        key: 'close',
        onClick: onClose,
        style: {
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(128,0,255,0.3)',
          borderRadius: '8px',
          color: '#a259ff',
          fontSize: '16px',
          cursor: 'pointer',
          padding: '6px 12px',
          transition: 'all 0.2s ease',
          fontWeight: 'bold'
        }
      }, '✕'),
      React.createElement('div', {
        key: 'resize-indicator',
        style: {
          fontSize: '10px',
          color: '#a259ff',
          opacity: 0.5,
          marginLeft: '8px',
          userSelect: 'none',
          cursor: 'nw-resize'
        }
      }, '↘️ Resizable')    ]),

    // Tabs
    React.createElement('div', {
      key: 'tabs',
      style: {
        display: 'flex',
        borderBottom: '2px solid rgba(162,89,255,0.3)',
        background: 'rgba(0,0,0,0.2)',
        flexWrap: 'wrap', // Allow tabs to wrap if needed
        minHeight: '50px' // Ensure minimum height for tabs
      }
    }, ['general', 'map', 'tools', 'logging', 'analysis', 'pet', 'saving', 'combat', 'boss', 'enemy', 'screens'].map(tab => 
      React.createElement('button', {
        key: tab,
        onClick: () => setActiveTab(tab),
        style: {
          flex: '1 1 auto', // Flexible sizing
          minWidth: '60px', // Minimum width per tab
          padding: '8px 12px', // Slightly reduced padding
          background: activeTab === tab ? 'rgba(162,89,255,0.3)' : 'transparent',
          border: 'none',
          color: activeTab === tab ? '#fff' : '#a259ff',
          cursor: 'pointer',
          textTransform: 'capitalize',
          fontSize: '12px', // Slightly smaller font
          fontWeight: activeTab === tab ? 'bold' : 'normal',
          transition: 'all 0.2s ease',
          textShadow: activeTab === tab ? '0 0 8px #a259ff88' : 'none',
          wordBreak: 'keep-all', // Prevent text breaking
          whiteSpace: 'nowrap' // Keep text on one line
        }
      }, tab)
    )),    // Content
    React.createElement('div', {
      key: 'content',
      style: { 
        padding: '20px', 
        flex: '1', // Take remaining space
        overflowY: 'auto', // Vertical scroll
        overflowX: 'hidden', // Hide horizontal overflow
        background: 'rgba(0,0,0,0.1)',
        minHeight: '0' // Important for flex scrolling
      }
    }, [
      // General tab
      activeTab === 'general' && React.createElement('div', { key: 'general-tab' }, createGeneralTab(mapManager, character, camera)),
      
      // Map tab
      activeTab === 'map' && React.createElement('div', { key: 'map-tab' }, createMapTab(teleportToPortal, teleportToSpawn)),
      
      // Tools tab
      activeTab === 'tools' && React.createElement('div', { key: 'tools-tab' }, createToolsTab(teleportToMap, () => teleportToBoss(), camera, character, mapManager)),
      
      // Pet tab
      activeTab === 'pet' && React.createElement('div', { key: 'pet-tab' }, createPetTab(debugConfig, toggleLogging, forceUpdate)),
      
      // Saving tab
      activeTab === 'saving' && React.createElement('div', { key: 'saving-tab' }, createSavingTab(debugConfig, toggleLogging, forceUpdate, debugLog)),
      
      // Logging tab
      activeTab === 'logging' && React.createElement('div', { key: 'logging-tab' }, createLoggingTab(debugConfig, toggleLogging, forceUpdate)),
      
      // Analysis tab
      activeTab === 'analysis' && React.createElement('div', { key: 'analysis-tab' }, createAnalysisTab(analyzeMapProps, mapManager, character, camera)),
      
      // Combat tab
      activeTab === 'combat' && React.createElement('div', { key: 'combat-tab' }, createCombatTab(debugConfig, toggleLogging, forceUpdate, onHealthChange, debugLog)),
      
      // Boss tab
      activeTab === 'boss' && React.createElement('div', { key: 'boss-tab' }, createBossTab(debugConfig, toggleLogging, forceUpdate, debugLog)),
      
      // Enemy tab
      activeTab === 'enemy' && React.createElement('div', { key: 'enemy-tab' }, createEnemyTab(debugConfig, toggleLogging, forceUpdate, debugLog)),
      
      // Screens tab
      activeTab === 'screens' && React.createElement('div', { key: 'screens-tab' }, createScreensTab(onNavigateToScreen))
    ].filter(Boolean))
  ]);
}

// Global state to prevent multiple debug overlays
let globalDebugOverlay = null;
let debugOverlayCounter = 0;
let globalKeyboardHandlerActive = false;

/**
 * Create debug overlay system
 */
export function createDebugOverlay(app, screenName = 'Unknown', healthChangeCallback = null) {
  // Prevent multiple debug overlays from being created simultaneously
  debugOverlayCounter++;
  const overlayId = debugOverlayCounter;
  
  debugLog(`Creating debug overlay #${overlayId} for screen: ${screenName}`, 'system');
  
  // Expose debugConfig globally for external access
  if (!window.game) {
    window.game = {};
  }
  window.game.debugConfig = debugConfig;
  
  // Prevent automatic enabling of boss debug logging
  preventAutoBossLogging();
  
  // If there's already a global debug overlay, reuse it instead of creating new one
  if (globalDebugOverlay && !globalDebugOverlay.isDestroyed) {
    debugLog(`Reusing existing debug overlay for screen: ${screenName}`, 'system');
    return globalDebugOverlay;
  }
  
  let debugContainer = document.getElementById('debug-overlay');
  let root = null;
  let isDestroyed = false;
  
  if (!debugContainer) {
    debugContainer = document.createElement('div');
    debugContainer.id = 'debug-overlay';
    document.body.appendChild(debugContainer);
    root = createRoot(debugContainer);
    debugContainer._reactRoot = root;
  } else {
    if (!debugContainer._reactRoot) {
      root = createRoot(debugContainer);
      debugContainer._reactRoot = root;
    } else {
      root = debugContainer._reactRoot;
    }
  }

  // State for debug visibility
  let showDebug = false;
  let mapManager = null;
  let character = null;
  let camera = null;

  // Function to toggle debug
  function toggleDebug() {
    // If the overlay was destroyed, reset the flag and recreate components
    if (isDestroyed) {
      console.log('Toggling debug on destroyed overlay, resetting...');
      isDestroyed = false;
    }
    
    // Prevent automatic enabling of boss debug logging when opening debug menu
    preventAutoBossLogging();
    
    showDebug = !showDebug;
    debugLog(`Debug overlay toggled: showDebug = ${showDebug}`, 'system');
    internalDebugLog(`Debug overlay state changed to: ${showDebug}`);
    
    // Start/stop cooldown update loop based on overlay visibility
    if (showDebug) {
      startCooldownUpdateLoop();
    } else {
      stopCooldownUpdateLoop();
    }
    
    renderDebugOverlay();
  }
  
  // Function to force show debug (for external use)
  function forceShowDebug() {
    // If the overlay was destroyed, reset the flag and recreate components
    if (isDestroyed) {
      console.log('Force showing debug on destroyed overlay, resetting...');
      isDestroyed = false;
    }
    
    showDebug = true;
    debugLog(`Debug overlay force-shown`, 'system');
    console.log(`Debug overlay force-shown: showDebug = ${showDebug}`);
    
    // Start cooldown update loop when overlay is shown
    startCooldownUpdateLoop();
    
    renderDebugOverlay();
  }

  // Create debug button (persistent across screens)
  function createDebugButton() {
    // Don't recreate if it already exists and is properly set up
    const existingButton = document.getElementById('debug-toggle-button');
    if (existingButton && existingButton.parentNode) {
      // Just update the click handler to ensure it works with current overlay
      existingButton.onclick = toggleDebug;
      return existingButton;
    }
    
    // Remove any orphaned button
    if (existingButton) {
      existingButton.remove();
    }

    const debugButton = document.createElement('button');
    debugButton.id = 'debug-toggle-button';
    debugButton.innerHTML = 'Debug<br><small style="font-size:10px;">O:Open P:Hide</small>';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '20px';
    debugButton.style.right = '20px';
    debugButton.style.zIndex = '10001'; // Higher than debug overlay
    debugButton.style.padding = '12px 16px';
    debugButton.style.fontSize = '13px';
    debugButton.style.background = 'rgba(30,0,60,0.95)';
    debugButton.style.color = '#a259ff';
    debugButton.style.border = '2px solid #a259ff';
    debugButton.style.borderRadius = '12px';
    debugButton.style.cursor = 'pointer';
    debugButton.style.boxShadow = '0 0 16px #a259ff55';
    debugButton.style.transition = 'all 0.3s ease';
    debugButton.style.userSelect = 'none';
    debugButton.style.fontWeight = 'bold';
    debugButton.style.letterSpacing = '1px';
    debugButton.style.textShadow = '0 0 8px #a259ff88';
    debugButton.style.textAlign = 'center';
    debugButton.style.lineHeight = '1.2';
    
    // Add hover effects
    debugButton.addEventListener('mouseenter', () => {
      debugButton.style.background = 'rgba(162,89,255,0.15)';
      debugButton.style.color = '#fff';
      debugButton.style.boxShadow = '0 0 24px #a259ff88';
    });
    
    debugButton.addEventListener('mouseleave', () => {
      debugButton.style.background = 'rgba(30,0,60,0.9)';
      debugButton.style.color = '#a259ff';
      debugButton.style.boxShadow = '0 0 16px #a259ff55';
    });
    
    debugButton.addEventListener('click', toggleDebug);
    document.body.appendChild(debugButton);
    return debugButton;
  }

  // Create the debug button
  createDebugButton();

  // Add global keyboard event handling (only once)
  let debugButtonVisible = true;
  
  function handleKeyDown(event) {
    // Don't interfere with text inputs
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    // 'O' key to open/close debug overlay
    if (event.key.toLowerCase() === 'o') {
      event.preventDefault();
      toggleDebug();
      return;
    }
    
    // 'P' key to show/hide debug button
    if (event.key.toLowerCase() === 'p') {
      event.preventDefault();
      const debugButton = document.getElementById('debug-toggle-button');
      if (debugButton) {
        debugButtonVisible = !debugButtonVisible;
        debugButton.style.display = debugButtonVisible ? 'block' : 'none';
        debugLog(`Debug button ${debugButtonVisible ? 'shown' : 'hidden'} (Press P to toggle)`, 'system');
      }
      return;
    }
  }
  
  // Add the keyboard event listener only if not already active
  if (!globalKeyboardHandlerActive) {
    document.addEventListener('keydown', handleKeyDown);
    globalKeyboardHandlerActive = true;
  }

  // Throttle rendering to prevent performance issues
  let renderTimeout = null;
  let lastRenderTime = 0;
  const RENDER_THROTTLE_MS = 100; // Limit renders to 10fps max

  // Function to render the debug overlay (throttled)
  function renderDebugOverlay() {
    if (isDestroyed) {
      console.log('Render skipped: overlay is destroyed');
      return;
    }
    
    // Check if debug container exists, if not recreate it
    if (!debugContainer || !debugContainer.parentNode) {
      console.log('Debug container missing, recreating...');
      debugContainer = document.getElementById('debug-overlay');
      
      if (!debugContainer) {
        // Create new container
        debugContainer = document.createElement('div');
        debugContainer.id = 'debug-overlay';
        document.body.appendChild(debugContainer);
        console.log('Created new debug container');
        
        // Always create new React root for new container
        root = createRoot(debugContainer);
        debugContainer._reactRoot = root;
        console.log('Created new React root');
      } else {
        // Container exists but might need new root
        if (!debugContainer._reactRoot) {
          root = createRoot(debugContainer);
          debugContainer._reactRoot = root;
          console.log('Created new React root for existing container');
        } else {
          root = debugContainer._reactRoot;
          console.log('Reusing existing React root');
        }
      }
      
      // Reset destroyed flag since we've recreated the container
      if (isDestroyed) {
        isDestroyed = false;
        console.log('Reset isDestroyed flag after container recreation');
      }
    } else {
      // Container exists and is in DOM, ensure we have the root
      if (!root || !debugContainer._reactRoot) {
        root = createRoot(debugContainer);
        debugContainer._reactRoot = root;
        console.log('Recreated React root for existing container');
      }
    }
    
    const now = Date.now();
    if (now - lastRenderTime < RENDER_THROTTLE_MS) {
      // Throttle rapid renders
      if (renderTimeout) clearTimeout(renderTimeout);
      renderTimeout = setTimeout(() => {
        renderDebugOverlay();
      }, RENDER_THROTTLE_MS - (now - lastRenderTime));
      return;
    }
    
    lastRenderTime = now;
    
    internalDebugLog(`Rendering debug overlay: showDebug = ${showDebug}, hasRoot = ${!!root}, hasContainer = ${!!debugContainer}`);
    
    if (root && debugContainer) {
      root.render(
        React.createElement(SimpleDebugOverlay, {
          showDebug,
          mapManager,
          character,
          camera,
          onClose: toggleDebug,
          onHealthChange: healthChangeCallback,
          onNavigateToScreen: (screenType) => {
            debugLog(`Debug: Navigating to screen: ${screenType}`, 'system');
            // This callback should be provided by the parent application
            // For now, we'll just log the request
            window.debugNavigateToScreen && window.debugNavigateToScreen(screenType);
          }
        })
      );
    } else {
      console.log('No React root or container available for rendering');
    }
  }

  // Initial render
  renderDebugOverlay();

  // Log instructions for using the debug system
  debugLog('🎮 Debug System Ready! Controls: [O] Open/Close Debug | [P] Show/Hide Debug Button', 'system');

  // Return debug system interface
  const debugSystem = {
    setMapManager: (manager) => {
      mapManager = manager;
      renderDebugOverlay();
    },
    setCharacter: (char) => {
      character = char;
      renderDebugOverlay();
    },
    setCamera: (cam) => {
      camera = cam;
      renderDebugOverlay();
    },
    updatePortals: () => {
      renderDebugOverlay();
    },
    setScreenNavigationCallback: (callback) => {
      window.debugNavigateToScreen = callback;
      debugLog('Screen navigation callback set for debug overlay', 'system');
    },
    toggleDebug: () => {
      toggleDebug();
    },
    forceShow: () => {
      forceShowDebug();
    },
    revive: () => {
      // Method to revive a destroyed debug overlay
      if (isDestroyed) {
        console.log('Reviving destroyed debug overlay');
        isDestroyed = false;
        renderDebugOverlay();
      }
    },
    destroy: () => {
      isDestroyed = true;
      debugLog(`Destroying debug overlay #${overlayId}`, 'system');
      
      // Stop cooldown update loop when overlay is destroyed
      stopCooldownUpdateLoop();
      
      // Only remove keyboard event listener if this is the global overlay
      if (globalDebugOverlay === debugSystem && globalKeyboardHandlerActive) {
        document.removeEventListener('keydown', handleKeyDown);
        globalKeyboardHandlerActive = false;
      }
      
      // Only remove button if this is the global overlay being destroyed
      if (globalDebugOverlay === debugSystem) {
        const button = document.getElementById('debug-toggle-button');
        if (button) button.remove();
      }
      
      if (debugContainer && debugContainer.parentNode) {
        debugContainer.parentNode.removeChild(debugContainer);
      }
      
      // Clear global reference if this is the global overlay
      if (globalDebugOverlay === debugSystem) {
        globalDebugOverlay = null;
      }
    },
    isDestroyed: false,
    overlayId: overlayId
  };
  
  // Store as global overlay
  globalDebugOverlay = debugSystem;
  
  // Also expose globally for external access
  window.globalDebugOverlay = debugSystem;
  
  return debugSystem;
}

/**
 * Prevent automatic enabling of boss debug logging
 * This function ensures boss debug logging is only enabled manually by user action
 */
function preventAutoBossLogging() {
  // Ensure boss logging is never auto-enabled
  if (debugConfig.logCategories.boss === true) {
    // Only allow boss logging if it was explicitly enabled by user
    const userEnabledBossLogging = sessionStorage.getItem('userEnabledBossLogging') === 'true';
    if (!userEnabledBossLogging) {
      debugConfig.logCategories.boss = false;
      internalDebugLog('Boss debug logging auto-disabled - requires manual enable');
    }
  }
}

/**
 * Update cooldown displays in the boss debug tab
 */
function updateCooldownDisplays() {
  // Only update if boss debugging is enabled and boss exists
  if (!window.gameMapManager?.mapXInstance?.boss) {
    return;
  }
  
  const boss = window.gameMapManager.mapXInstance.boss;
  if (!boss.getCooldownInfo) {
    return;
  }
  
  const cooldownInfo = boss.getCooldownInfo();
  
  // Update melee cooldown
  const meleeElement = document.getElementById('meleeCooldown');
  const meleeItem = document.getElementById('meleeCooldownItem');
  if (meleeElement && meleeItem) {
    if (cooldownInfo.melee.onCooldown) {
      meleeElement.textContent = `${(cooldownInfo.melee.remaining / 1000).toFixed(1)}s`;
      meleeElement.style.color = '#f44336';
      meleeItem.style.borderLeftColor = '#f44336';
    } else {
      meleeElement.textContent = 'Ready';
      meleeElement.style.color = '#4CAF50';
      meleeItem.style.borderLeftColor = '#4CAF50';
    }
  }
  
  // Update zap (bolt) cooldown
  const zapElement = document.getElementById('zapCooldown');
  const zapItem = document.getElementById('zapCooldownItem');
  if (zapElement && zapItem) {
    if (cooldownInfo.bolt.onCooldown) {
      zapElement.textContent = `${(cooldownInfo.bolt.remaining / 1000).toFixed(1)}s`;
      zapElement.style.color = '#f44336';
      zapItem.style.borderLeftColor = '#f44336';
    } else {
      zapElement.textContent = 'Ready';
      zapElement.style.color = '#4CAF50';
      zapItem.style.borderLeftColor = '#4CAF50';
    }
  }
  
  // Update range cooldown
  const rangeElement = document.getElementById('rangeCooldown');
  const rangeItem = document.getElementById('rangeCooldownItem');
  if (rangeElement && rangeItem) {
    if (cooldownInfo.range.onCooldown) {
      rangeElement.textContent = `${(cooldownInfo.range.remaining / 1000).toFixed(1)}s`;
      rangeElement.style.color = '#f44336';
      rangeItem.style.borderLeftColor = '#f44336';
    } else {
      rangeElement.textContent = 'Ready';
      rangeElement.style.color = '#4CAF50';
      rangeItem.style.borderLeftColor = '#4CAF50';
    }
  }
}

// Global cooldown update interval
let cooldownUpdateInterval = null;

/**
 * Start cooldown update loop
 */
function startCooldownUpdateLoop() {
  if (cooldownUpdateInterval) {
    clearInterval(cooldownUpdateInterval);
  }
  
  cooldownUpdateInterval = setInterval(() => {
    updateCooldownDisplays();
  }, 100); // Update every 100ms for smooth countdown
  
  debugLog('Boss cooldown update loop started', 'debug');
}

/**
 * Stop cooldown update loop
 */
function stopCooldownUpdateLoop() {
  if (cooldownUpdateInterval) {
    clearInterval(cooldownUpdateInterval);
    cooldownUpdateInterval = null;
    debugLog('Boss cooldown update loop stopped', 'debug');
  }
}
