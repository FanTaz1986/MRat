import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as PIXI from 'pixi.js';

// Debug configuration and state
let debugConfig = {
  showConsoleMessages: true,
  showStats: true,
  muteDebugLogs: false,
  invulnerability: false, // Player invulnerability debug toggle
  bossControlEnabled: false, // Boss control toggle (separate from logging)
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
    ui: false, // UI component debugging
    debug: false, // Debug system internal logging
    boss: false, // Boss fight debugging - NEVER auto-enabled
    bossattack: false, // Boss attack animation debugging - separate toggle
    optionsSubmenu: false // Options submenu debugging (Audio, How to Play buttons)
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
  const [, forceUpdate] = useState({});

  internalDebugLog(`SimpleDebugOverlay render: showDebug = ${showDebug}`);
  
  if (!showDebug) {
    internalDebugLog('SimpleDebugOverlay returning null (showDebug is false)');
    return null;
  }
  
  internalDebugLog('SimpleDebugOverlay rendering overlay content');
  
  const triggerUpdate = () => {
    forceUpdate({});
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
              if (currentCamera.mapContainer && currentCamera.mapContainer.scale && currentCamera.zoom) {
                currentCamera.mapContainer.scale.set(currentCamera.zoom);
                debugLog(`Zoom scale reapplied: ${currentCamera.zoom}`, 'map');
              } else {
                debugLog('Cannot reapply zoom scale: mapContainer or scale not available', 'map');
              }
            } catch (error) {
              debugLog(`Error reapplying zoom scale: ${error.message}`, 'map');
            }
            
            // Center camera on character with additional safety checks
            if (currentCamera.mapContainer && currentCharacter && currentCharacter.position) {
              currentCamera.centerOn(currentCharacter.position.x, currentCharacter.position.y);
              debugLog(`Camera re-centered after map teleport to position: (${currentCharacter.position.x}, ${currentCharacter.position.y}) with zoom: ${currentCamera.zoom}`, 'map');
            } else {
              debugLog('Cannot center camera: missing mapContainer or character position', 'map');
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
          // Get the latest camera reference
          const currentCamera = mapManager.camera || window.game?.mapManager?.camera;
          
          // Additional safety checks before calling centerOn
          if (currentCamera && currentCamera.centerOn && currentCamera.mapContainer && currentCharacter && currentCharacter.position) {
            currentCamera.centerOn(currentCharacter.position.x, currentCharacter.position.y);
            debugLog(`Camera centered on character at portal: (${currentCharacter.position.x}, ${currentCharacter.position.y})`, 'portal');
          } else {
            debugLog('Cannot center camera: missing camera, mapContainer, or character', 'portal');
          }
        }, 150); // Increased delay to ensure map is fully loaded
        
        debugLog('Teleported to portal and centered camera', 'portal');
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
      if (camera && camera.centerOn) {
        setTimeout(() => {
          // Additional safety checks before calling centerOn
          if (camera && camera.centerOn && camera.mapContainer && character && character.position) {
            camera.centerOn(character.position.x, character.position.y);
            debugLog(`Camera centered on character at spawn: (${character.position.x}, ${character.position.y})`, 'character');
          } else {
            debugLog('Cannot center camera at spawn: missing camera, mapContainer, or character', 'character');
          }
        }, 150); // Increased delay to ensure everything is initialized
      }
      
      debugLog('Teleported to spawn point and centered camera', 'character');
    } else {
      debugLog('Cannot teleport: character position or map manager not available', 'character');
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
    }, ['general', 'map', 'tools', 'logging', 'analysis', 'pet', 'combat', 'boss', 'screens'].map(tab => 
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
    }, [      activeTab === 'general' && React.createElement('div', { key: 'general' }, [        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Game Info'),
        React.createElement('div', {
          key: 'info',
          style: { fontSize: '12px', lineHeight: '1.4' }
        }, [          React.createElement('div', { key: 'map' }, [
            React.createElement('strong', { key: 'map-label' }, 'Current Map: '),
            React.createElement('span', { key: 'map-value' }, mapManager?.currentMap || 'Unknown')
          ]),character && React.createElement('div', { key: 'char' }, [
            React.createElement('div', { key: 'char-label' }, React.createElement('strong', {}, 'Character Position:')),
            React.createElement('div', {
              key: 'char-pos',
              style: { marginLeft: '12px' }
            }, [
              React.createElement('span', { key: 'char-x' }, `X: ${character.position?.x?.toFixed(1) || 'N/A'}`),
              React.createElement('br', { key: 'char-br' }),
              React.createElement('span', { key: 'char-y' }, `Y: ${character.position?.y?.toFixed(1) || 'N/A'}`)
            ])
          ]),
          camera && React.createElement('div', { key: 'cam' }, [
            React.createElement('div', { key: 'cam-label' }, React.createElement('strong', {}, 'Camera Position:')),
            React.createElement('div', {
              key: 'cam-pos',
              style: { marginLeft: '12px' }
            }, [
              React.createElement('span', { key: 'cam-x' }, `X: ${camera.position?.x?.toFixed(1) || 'N/A'}`),
              React.createElement('br', { key: 'cam-br' }),
              React.createElement('span', { key: 'cam-y' }, `Y: ${camera.position?.y?.toFixed(1) || 'N/A'}`)
            ])
          ]),
          // Portal information in General tab
          React.createElement('div', { key: 'portals' }, [            React.createElement('div', {
              key: 'portal-info-header',
              style: { marginTop: '12px' }
            }, React.createElement('strong', {}, 'Portal Info:')),            React.createElement('div', {
              key: 'portal-info-content',
              style: { marginLeft: '12px', fontSize: '11px' }
            }, 
              mapManager?.portalManager?.portals?.length > 0 ? 
                mapManager.portalManager.portals.map((portal, index) =>
                  React.createElement('div', {
                    key: index,
                    style: { marginBottom: '4px' }
                  }, [
                    React.createElement('span', { key: `portal-pos-${index}` }, `Portal ${index + 1}: (${portal.position?.x?.toFixed(1) || 'N/A'}, ${portal.position?.y?.toFixed(1) || 'N/A'})`),
                    React.createElement('br', { key: `br-${index}` }),
                    React.createElement('span', { key: `portal-target-${index}` }, `→ ${portal.targetMap || 'Unknown'}`)
                  ])
                ) :
                React.createElement('div', {
                  key: 'none'
                }, 'No portals found')
            )
          ]),
          
          // Keyboard shortcuts section
          React.createElement('div', { key: 'shortcuts' }, [
            React.createElement('div', {
              key: 'shortcuts-header',
              style: { marginTop: '12px' }
            }, React.createElement('strong', {}, 'Keyboard Shortcuts:')),
            React.createElement('div', {
              key: 'shortcuts-content',
              style: { 
                marginLeft: '12px', 
                fontSize: '11px',
                background: 'rgba(162, 89, 255, 0.1)',
                padding: '8px',
                borderRadius: '6px',
                marginTop: '4px'
              }
            }, [
              React.createElement('div', { key: 'shortcut-o' }, '🔧 [O] - Open/Close Debug Overlay'),
              React.createElement('div', { key: 'shortcut-p' }, '👁️ [P] - Show/Hide Debug Button'),
              React.createElement('div', { key: 'shortcut-note', style: { fontSize: '10px', opacity: 0.8, marginTop: '4px' } }, 'Note: Shortcuts work on all screens')
            ])
          ])
        ])
      ]),      activeTab === 'map' && React.createElement('div', { key: 'map' }, [        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Map & Portal Controls'),
        
        React.createElement('div', {
          key: 'buttons',
          style: { marginBottom: '16px' }
        }, [          React.createElement('button', {
            key: 'portal',
            onClick: teleportToPortal,
            style: {
              width: '100%',
              padding: '12px 16px',
              marginBottom: '12px',
              background: 'rgba(76, 175, 80, 0.2)',
              border: '2px solid rgba(76, 175, 80, 0.5)',
              borderRadius: '12px',
              color: '#4CAF50',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
            }
          }, '🌀 Move to Portal'),
          
          React.createElement('button', {
            key: 'spawn',
            onClick: teleportToSpawn,
            style: {
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(33, 150, 243, 0.2)',
              border: '2px solid rgba(33, 150, 243, 0.5)',
              borderRadius: '12px',
              color: '#2196F3',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(33, 150, 243, 0.3)'
            }          }, '🏠 Teleport to Starting Position')
        ])
      ]),

      activeTab === 'tools' && React.createElement('div', { key: 'tools' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Map Teleport Tools'),
        
        React.createElement('div', {
          key: 'mapButtons',
          style: { 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '16px'
          }
        }, [
          // Map Area 0
          React.createElement('button', {
            key: 'map0',
            onClick: () => teleportToMap('maparea0'),
            style: {
              padding: '10px 12px',
              background: 'rgba(255, 193, 7, 0.2)',
              border: '2px solid rgba(255, 193, 7, 0.5)',
              borderRadius: '10px',
              color: '#FFC107',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(255, 193, 7, 0.3)'
            }
          }, '�️ Map 0\n(Beach)'),
          
          // Map Area 1
          React.createElement('button', {
            key: 'map1',
            onClick: () => teleportToMap('maparea1'),
            style: {
              padding: '10px 12px',
              background: 'rgba(76, 175, 80, 0.2)',
              border: '2px solid rgba(76, 175, 80, 0.5)',
              borderRadius: '10px',
              color: '#4CAF50',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
            }
          }, '🌲 Map 1\n(Forest)'),
          
          // Map Area 2
          React.createElement('button', {
            key: 'map2',
            onClick: () => teleportToMap('maparea2'),
            style: {
              padding: '10px 12px',
              background: 'rgba(156, 39, 176, 0.2)',
              border: '2px solid rgba(156, 39, 176, 0.5)',
              borderRadius: '10px',
              color: '#9C27B0',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(156, 39, 176, 0.3)'
            }
          }, '🏔️ Map 2\n(Swamp)'),
          
          // Map Area X
          React.createElement('button', {
            key: 'mapx',
            onClick: () => teleportToMap('mapareax'),
            style: {
              padding: '10px 12px',
              background: 'rgba(244, 67, 54, 0.2)',
              border: '2px solid rgba(244, 67, 54, 0.5)',
              borderRadius: '10px',
              color: '#F44336',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(244, 67, 54, 0.3)'            }
          }, '💀 Map X\n(Boss)')
        ]),
        
        React.createElement('h4', {
          key: 'camera-title',
          style: { 
            color: '#00bcd4', 
            margin: '16px 0 8px 0',
            fontSize: '14px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #00bcd488'
          }
        }, 'Camera Controls'),
        
        React.createElement('div', {
          key: 'cameraButtons',
          style: { 
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '8px',
            marginBottom: '16px'
          }
        }, [
          React.createElement('button', {
            key: 'centerCamera',            onClick: () => {
              if (camera && character && character.position) {
                // Use the camera's centerOn method for proper centering with safety checks
                if (camera.centerOn && camera.mapContainer) {
                  camera.centerOn(character.position.x, character.position.y);
                  debugLog(`Camera centered on character at (${character.position.x}, ${character.position.y})`, 'camera');
                } else {
                  // Fallback to direct position setting
                  if (camera.position) {
                    camera.position.x = character.position.x;
                    camera.position.y = character.position.y;
                    debugLog('Camera centered on character (fallback method)', 'camera');
                  } else {
                    debugLog('Cannot center camera: camera methods not available', 'camera');
                  }
                }
                
                // Ensure camera is following the character
                if (camera.follow) {
                  camera.follow(character);
                  debugLog('Camera follow re-enabled', 'camera');
                }
              } else {
                debugLog('Cannot center camera: camera or character not available', 'camera');
              }
            },
            style: {
              padding: '10px 12px',
              background: 'rgba(0, 188, 212, 0.2)',
              border: '2px solid rgba(0, 188, 212, 0.5)',
              borderRadius: '10px',
              color: '#00BCD4',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(0, 188, 212, 0.3)'
            }
          }, '📷 Center Camera on Character'),
          
          React.createElement('button', {
            key: 'centerOnPortal',            onClick: () => {
              if (mapManager?.portalManager?.portals?.length > 0) {
                const portal = mapManager.portalManager.portals[0];
                if (portal?.position && camera) {
                  if (camera.centerOn && camera.mapContainer) {
                    camera.centerOn(portal.position.x, portal.position.y);
                    debugLog(`Camera centered on portal at (${portal.position.x}, ${portal.position.y})`, 'camera');
                  } else {
                    // Fallback
                    camera.position.x = portal.position.x;
                    camera.position.y = portal.position.y;
                    debugLog('Camera centered on portal (fallback method)', 'camera');
                  }
                } else {
                  debugLog('Cannot center on portal: portal position or camera not available', 'camera');
                }
              } else {
                debugLog('No portals available to center on', 'camera');
              }
            },
            style: {
              padding: '10px 12px',
              background: 'rgba(255, 152, 0, 0.2)',
              border: '2px solid rgba(255, 152, 0, 0.5)',
              borderRadius: '10px',
              color: '#FF9800',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(255, 152, 0, 0.3)'
            }
          }, '🌀 Center Camera on Portal')
        ]),
        
        React.createElement('div', {
          key: 'note',
          style: { 
            fontSize: '11px', 
            color: '#a259ff', 
            opacity: 0.7,
            textAlign: 'center',
            fontStyle: 'italic'
          }        }, 'Note: Map teleport may reset character position')
      ]),

      activeTab === 'pet' && React.createElement('div', { key: 'pet' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Pet Debug Controls'),
        
        React.createElement('div', {
          key: 'petDebugging',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'debugTitle',
            style: { 
              color: '#00bcd4', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #00bcd488'
            }
          }, 'Pet Debugging'),
          
          React.createElement('div', {
            key: 'debugToggle',
            style: { 
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(162, 89, 255, 0.3)',
              marginBottom: '12px'
            }
          }, [
            React.createElement('input', {
              key: 'petDebugCheckbox',
              type: 'checkbox',
              checked: debugConfig.logCategories.pet,
              onChange: () => toggleLogging('pet'),
              style: {
                marginRight: '12px',
                accentColor: '#a259ff',
                transform: 'scale(1.2)'
              }
            }),
            React.createElement('label', {
              key: 'petDebugLabel',
              style: { 
                color: debugConfig.logCategories.pet ? '#4CAF50' : '#888',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              },
              onClick: () => toggleLogging('pet')
            }, debugConfig.logCategories.pet ? '🐾 Pet Debugging: ON' : '🐾 Pet Debugging: OFF')
          ]),
          
          React.createElement('div', {
            key: 'debugInfo',
            style: { 
              fontSize: '12px', 
              color: '#a259ff', 
              opacity: 0.8,
              lineHeight: '1.4',
              background: 'rgba(162, 89, 255, 0.1)',
              padding: '8px',
              borderRadius: '6px'
            }
          }, [
            React.createElement('div', { key: 'info1' }, '• When enabled, shows detailed pet movement and camera bounds logging'),
            React.createElement('div', { key: 'info2' }, '• Displays pet position restrictions and boundary calculations'),
            React.createElement('div', { key: 'info3' }, '• Logs pet camera viewport bounds and movement limits'),
            React.createElement('div', { key: 'info4' }, '• Use to debug pet movement issues and camera boundaries')
          ])
        ]),
        
        React.createElement('div', {
          key: 'petInfo',
          style: { 
            fontSize: '12px', 
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(162, 89, 255, 0.3)'
          }
        }, [
          React.createElement('div', {
            key: 'petInfoTitle',
            style: { marginBottom: '8px' }
          }, React.createElement('strong', { style: { color: '#a259ff' } }, 'Pet Information:')),
          
          React.createElement('div', {
            key: 'petControls',
            style: { fontSize: '11px', marginBottom: '8px', color: '#FFC107' }
          }, '🎮 Pet Controls: WASD to move, Spacebar to attack'),
          
          React.createElement('div', {
            key: 'petFeatures',
            style: { fontSize: '10px', color: '#888', lineHeight: '1.3' }
          }, [
            React.createElement('div', { key: 'feature1' }, '• Pet grows larger and has more range on higher level maps'),
            React.createElement('div', { key: 'feature2' }, '• Pet automatically follows character when out of range'),
            React.createElement('div', { key: 'feature3' }, '• Pet is restricted to stay within camera viewport (5% margin)'),
            React.createElement('div', { key: 'feature4' }, '• Pet cannot move beyond max distance from main character')
          ])
        ])
      ]),

      activeTab === 'logging' && React.createElement('div', { key: 'logging' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Console Logging Controls'),
        
        React.createElement('div', {
          key: 'controls',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('div', {
            key: 'allControls',
            style: { 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '12px',
              justifyContent: 'center'
            }
          }, [
            React.createElement('button', {
              key: 'allOn',
              onClick: () => toggleLogging('all'),
              style: {
                padding: '8px 12px',
                background: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid rgba(76, 175, 80, 0.5)',
                borderRadius: '8px',
                color: '#4CAF50',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }
            }, 'All Logging'),            React.createElement('button', {
              key: 'allOff',
              onClick: () => toggleLogging('none'),
              style: {
                padding: '8px 12px',
                background: 'rgba(244, 67, 54, 0.2)',
                border: '2px solid rgba(244, 67, 54, 0.5)',
                borderRadius: '8px',
                color: '#F44336',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold'
              }
            }, 'No Logging')
          ]),
          
          React.createElement('div', {
            key: 'categories',
            style: { 
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '8px'
            }
          }, Object.keys(debugConfig.logCategories).map(category =>
            React.createElement('label', {
              key: category,
              style: {
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px'
              }            }, [
              React.createElement('input', {
                key: `checkbox-${category}`,
                type: 'checkbox',
                checked: debugConfig.logCategories[category],
                onChange: () => toggleLogging(category),
                style: {
                  marginRight: '6px',
                  accentColor: '#a259ff'
                }
              }),
              React.createElement('span', {
                key: `label-${category}`,
                style: { 
                  color: debugConfig.logCategories[category] ? '#4CAF50' : '#888',
                  textTransform: 'capitalize'
                }
              }, category)
            ])
          ))
        ])
      ]),

      activeTab === 'analysis' && React.createElement('div', { key: 'analysis' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Automatic Analysis Tools'),
        
        React.createElement('div', {
          key: 'analysisControls',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('button', {
            key: 'analyzeBtn',
            onClick: analyzeMapProps,
            style: {
              width: '100%',
              padding: '12px 16px',
              marginBottom: '12px',
              background: 'rgba(255, 152, 0, 0.2)',
              border: '2px solid rgba(255, 152, 0, 0.5)',
              borderRadius: '12px',
              color: '#FF9800',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.2s ease',
              textShadow: '0 0 8px rgba(255, 152, 0, 0.3)'
            }
          }, '🔍 Analyze Props & Map Data'),
          
          React.createElement('div', {
            key: 'info',
            style: { 
              fontSize: '11px', 
              color: '#a259ff', 
              opacity: 0.7,
              textAlign: 'center',
              fontStyle: 'italic',
              lineHeight: '1.4'
            }
          }, 'Analyzes current map props, positions, tiles, and coordinates. Results are logged to console.')
        ]),

        React.createElement('div', {
          key: 'liveInfo',
          style: { 
            fontSize: '12px', 
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(162, 89, 255, 0.3)'
          }        }, [
          React.createElement('div', {
            key: 'currentData',
            style: { marginBottom: '8px' }
          }, React.createElement('strong', { style: { color: '#a259ff' } }, 'Live Tile & Prop Data:')),
          
          // Current Map Info
          React.createElement('div', {
            key: 'map-info',
            style: { fontSize: '10px', marginBottom: '4px', color: '#FFC107' }
          }, `📍 Current Map: ${mapManager?.currentMap || 'Unknown'}`),
          
          // Character position and tile with detailed info
          character && character.position ? 
            React.createElement('div', {
              key: 'char-detailed',
              style: { fontSize: '10px', marginBottom: '4px', background: 'rgba(76, 175, 80, 0.1)', padding: '4px', borderRadius: '4px' }
            }, [
              React.createElement('div', { key: 'char-pos' }, `🧙 Character: (${character.position.x.toFixed(1)}, ${character.position.y.toFixed(1)})`),
              React.createElement('div', { key: 'char-tile' }, `📐 Character Tile: (${Math.floor(character.position.x / 32)}, ${Math.floor(character.position.y / 32)})`)
            ]) :
            React.createElement('div', {
              key: 'no-char',
              style: { fontSize: '10px' }
            }, '❌ Character position not available'),
          
          // Portal coordinates and tiles with enhanced info
          mapManager?.portalManager?.portals?.length > 0 ? 
            mapManager.portalManager.portals.map((portal, index) => {
              const portalTileX = portal.position ? Math.floor(portal.position.x / 32) : 'N/A';
              const portalTileY = portal.position ? Math.floor(portal.position.y / 32) : 'N/A';
              return React.createElement('div', {
                key: `portal-detailed-${index}`,
                style: { fontSize: '10px', marginBottom: '4px', background: 'rgba(33, 150, 243, 0.1)', padding: '4px', borderRadius: '4px' }
              }, [
                React.createElement('div', { key: `portal-pos-${index}` }, `🌀 Portal ${index + 1}: (${portal.position?.x?.toFixed(1) || 'N/A'}, ${portal.position?.y?.toFixed(1) || 'N/A'})`),
                React.createElement('div', { key: `portal-tile-${index}` }, `📐 Portal Tile: (${portalTileX}, ${portalTileY})`),
                React.createElement('div', { key: `portal-target-${index}` }, `🎯 Target: ${portal.targetMap || 'Unknown'}`)
              ]);
            }) :
            React.createElement('div', {
              key: 'no-portals',
              style: { fontSize: '10px', color: '#888' }
            }, '❌ No portals found'),
          
          // Camera position
          camera && camera.position ?
            React.createElement('div', {
              key: 'cam-detailed',
              style: { fontSize: '10px', marginBottom: '4px', background: 'rgba(156, 39, 176, 0.1)', padding: '4px', borderRadius: '4px' }
            }, [
              React.createElement('div', { key: 'cam-pos' }, `📷 Camera: (${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)})`),
              React.createElement('div', { key: 'cam-tile' }, `📐 Camera Tile: (${Math.floor(camera.position.x / 32)}, ${Math.floor(camera.position.y / 32)})`)
            ]) :
            React.createElement('div', {
              key: 'no-cam',
              style: { fontSize: '10px' }
            }, '❌ Camera position not available'),
          
          // Tile Props Information (for Map1 and Map2 debugging)
          React.createElement('div', {
            key: 'props-section',
            style: { marginTop: '8px', borderTop: '1px solid rgba(162, 89, 255, 0.3)', paddingTop: '8px' }
          }, [
            React.createElement('div', {
              key: 'props-title',
              style: { fontSize: '10px', fontWeight: 'bold', color: '#a259ff', marginBottom: '4px' }
            }, '🎮 Tile Props Debug Info:'),            // Character tile props
            character && character.position ? (() => {
              // Get correct tile sizes for different map types
              let tileWidth = 32;
              let tileHeight = 32;
              let gridWidth = 32;
              
              if (mapManager?.currentMapInstance?.tileWidth && mapManager?.currentMapInstance?.tileHeight) {
                // Map1/Map2 style with custom tile sizes
                tileWidth = mapManager.currentMapInstance.tileWidth;
                tileHeight = mapManager.currentMapInstance.tileHeight;
                gridWidth = mapManager.currentMapInstance.gridSize || 16;
              } else if (mapManager?.currentMapInstance?.mapWidth) {
                // Standard tile map
                gridWidth = mapManager.currentMapInstance.mapWidth;
              }
              
              const charTileX = Math.floor(character.position.x / tileWidth);
              const charTileY = Math.floor(character.position.y / tileHeight);
              const correctTileIndex = charTileY * gridWidth + charTileX;
              
              // Calculate position within tile (for centering analysis)
              const tileLocalX = character.position.x % tileWidth;
              const tileLocalY = character.position.y % tileHeight;
              const tileCenterX = tileWidth / 2;
              const tileCenterY = tileHeight / 2;
              const distanceFromCenter = Math.sqrt(Math.pow(tileLocalX - tileCenterX, 2) + Math.pow(tileLocalY - tileCenterY, 2));
              
              return React.createElement('div', {
                key: 'char-tile-props',
                style: { fontSize: '9px', marginBottom: '3px', background: 'rgba(255, 193, 7, 0.1)', padding: '3px', borderRadius: '3px' }
              }, [
                React.createElement('div', { key: 'char-tile-info' }, `🔢 Character Tile Index: ${correctTileIndex} (was showing ${Math.floor(character.position.y / 32) * 32 + Math.floor(character.position.x / 32)})`),
                React.createElement('div', { key: 'char-grid-info' }, `📊 Grid: [${charTileX}, ${charTileY}] on ${mapManager?.currentMap || 'Unknown'}`),
                React.createElement('div', { key: 'char-tile-size' }, `📐 Tile Size: ${tileWidth}x${tileHeight}px`),
                React.createElement('div', { key: 'char-tile-pos' }, `📍 Position in Tile: (${tileLocalX.toFixed(0)}, ${tileLocalY.toFixed(0)}) | Distance from center: ${distanceFromCenter.toFixed(0)}px`)
              ]);
            })() : null,
              // Portal tile props
            mapManager?.portalManager?.portals?.map((portal, index) => {
              if (!portal.position) return null;
              
              // Get correct tile sizes for portals too
              let tileWidth = 32;
              let tileHeight = 32;
              let gridWidth = 32;
              
              if (mapManager?.currentMapInstance?.tileWidth && mapManager?.currentMapInstance?.tileHeight) {
                tileWidth = mapManager.currentMapInstance.tileWidth;
                tileHeight = mapManager.currentMapInstance.tileHeight;
                gridWidth = mapManager.currentMapInstance.gridSize || 16;
              } else if (mapManager?.currentMapInstance?.mapWidth) {
                gridWidth = mapManager.currentMapInstance.mapWidth;
              }
              
              const portalTileX = Math.floor(portal.position.x / tileWidth);
              const portalTileY = Math.floor(portal.position.y / tileHeight);
              const correctPortalTileIndex = portalTileY * gridWidth + portalTileX;
              
              // Calculate portal position within tile
              const portalLocalX = portal.position.x % tileWidth;
              const portalLocalY = portal.position.y % tileHeight;
              const tileCenterX = tileWidth / 2;
              const tileCenterY = tileHeight / 2;
              const portalDistanceFromCenter = Math.sqrt(Math.pow(portalLocalX - tileCenterX, 2) + Math.pow(portalLocalY - tileCenterY, 2));
              
              // Check if portal is properly centered
              const isWellCentered = portalDistanceFromCenter < Math.min(tileWidth, tileHeight) * 0.1; // Within 10% of tile size
              
              return React.createElement('div', {
                key: `portal-tile-props-${index}`,
                style: { fontSize: '9px', marginBottom: '3px', background: 'rgba(255, 152, 0, 0.1)', padding: '3px', borderRadius: '3px' }
              }, [
                React.createElement('div', { key: `portal-tile-idx-${index}` }, `🔢 Portal ${index + 1} Tile Index: ${correctPortalTileIndex}`),
                React.createElement('div', { key: `portal-grid-idx-${index}` }, `📊 Grid: [${portalTileX}, ${portalTileY}] → ${portal.targetMap || 'Unknown'}`),
                React.createElement('div', { key: `portal-center-${index}` }, `🎯 ${isWellCentered ? '✅ Well-centered' : '⚠️ Off-center'} in tile (${portalDistanceFromCenter.toFixed(0)}px from center)`),                React.createElement('div', { key: `portal-visibility-${index}` }, `👁️ Visible: ${portal.visible !== false}, Alpha: ${portal.alpha || 1}, Z-Index: ${portal.zIndex || 'default'}`)
              ]);
            }),
            
            // Portal vs Props analysis
            mapManager?.portalManager?.portals?.length > 0 ? React.createElement('div', {
              key: 'portal-analysis',
              style: { fontSize: '9px', marginTop: '4px', background: 'rgba(255, 64, 129, 0.1)', padding: '3px', borderRadius: '3px' }
            }, [
              React.createElement('div', { key: 'portal-analysis-title', style: { fontWeight: 'bold', color: '#e91e63' } }, '🔍 Portal Rendering Analysis:'),
              ...mapManager.portalManager.portals.map((portal, index) => {
                if (!portal.position) return null;
                
                // Get tile info
                let tileWidth = 32, tileHeight = 32;
                if (mapManager?.currentMapInstance?.tileWidth) {
                  tileWidth = mapManager.currentMapInstance.tileWidth;
                  tileHeight = mapManager.currentMapInstance.tileHeight;
                }
                
                const portalTileX = Math.floor(portal.position.x / tileWidth);
                const portalTileY = Math.floor(portal.position.y / tileHeight);
                
                // Check for props on the same tile
                let propsOnSameTile = 0;
                let overlappingProps = [];
                
                if (mapManager?.currentMapInstance?.props) {
                  mapManager.currentMapInstance.props.forEach((prop, propIndex) => {
                    let propX, propY;
                    if (prop.position && typeof prop.position.x === 'number') {
                      propX = prop.position.x;
                      propY = prop.position.y;
                    }
                    
                    if (propX !== undefined && propY !== undefined) {
                      const propTileX = Math.floor(propX / tileWidth);
                      const propTileY = Math.floor(propY / tileHeight);
                      
                      if (propTileX === portalTileX && propTileY === portalTileY) {
                        propsOnSameTile++;
                        const distance = Math.sqrt(Math.pow(propX - portal.position.x, 2) + Math.pow(propY - portal.position.y, 2));
                        overlappingProps.push(`Prop ${propIndex + 1} (${distance.toFixed(0)}px away)`);
                      }
                    }
                  });
                }
                
                return React.createElement('div', {
                  key: `portal-analysis-${index}`,
                  style: { fontSize: '8px', marginTop: '2px' }
                }, [                  React.createElement('div', { key: `portal-conflict-${index}` }, 
                    propsOnSameTile > 0 
                      ? `⚠️ Portal ${index + 1}: ${propsOnSameTile} props on same tile - ${overlappingProps.join(', ')}`
                      : `✅ Portal ${index + 1}: No prop conflicts on tile [${portalTileX}, ${portalTileY}]`
                  ),
                  propsOnSameTile > 0 ? React.createElement('div', { 
                    key: `portal-advice-${index}`, 
                    style: { color: '#ff5722', fontSize: '7px', fontStyle: 'italic' } 
                  }, '💡 Many props may hide portal - check z-index or move portal to center of tile') : null,
                  React.createElement('div', { key: `portal-layer-${index}` }, 
                    `📦 Layer: ${portal.parent?.constructor?.name || 'Unknown'}, Z-Index: ${portal.zIndex || 'default'}`
                  )
                ]);
              }).filter(Boolean)
            ]) : null,
            
            // Camera positioning suggestions
            character && camera && React.createElement('div', {
              key: 'camera-suggestions',
              style: { fontSize: '9px', marginTop: '4px', background: 'rgba(76, 175, 80, 0.1)', padding: '3px', borderRadius: '3px' }
            }, [
              React.createElement('div', { key: 'camera-title', style: { fontWeight: 'bold', color: '#4caf50' } }, '📷 Camera Positioning Suggestions:'),
              (() => {
                const distance = Math.sqrt(Math.pow(camera.position.x - character.position.x, 2) + Math.pow(camera.position.y - character.position.y, 2));
                const isWellCentered = distance < 100; // Within 100px
                
                return React.createElement('div', {
                  key: 'camera-advice',
                  style: { fontSize: '8px', marginTop: '2px' }
                }, [
                  React.createElement('div', { key: 'distance-info' }, 
                    `📏 Camera-Character distance: ${distance.toFixed(0)}px ${isWellCentered ? '✅ Well-centered' : '⚠️ Off-center'}`
                  ),
                  !isWellCentered ? React.createElement('div', { key: 'center-suggestion' }, 
                    '💡 Suggestion: Camera should center on character after teleport'
                  ) : null,
                  mapManager?.currentMap === 'maparea1' && React.createElement('div', { key: 'map1-advice' }, 
                    '🗺️ Map1 Note: Large tiles (4200x2970px) may cause camera lag'
                  )
                ].filter(Boolean));
              })()
            ]),
            // Map dimensions for reference
            mapManager?.currentMapInstance ? (() => {
              const instance = mapManager.currentMapInstance;
              let displayInfo = '';
              
              if (instance.tileWidth && instance.tileHeight) {
                // Map1/Map2 style
                const gridSize = instance.gridSize || 16;
                displayInfo = `📏 Grid: ${gridSize}x${gridSize} tiles (${instance.tileWidth}x${instance.tileHeight}px each) | Map: ${instance.mapWidth || 'Unknown'}x${instance.mapHeight || 'Unknown'}px`;
              } else {
                // Standard map
                displayInfo = `📏 Map Size: ${instance.mapWidth || 'Unknown'} x ${instance.mapHeight || 'Unknown'} pixels`;
              }
              
              return React.createElement('div', {
                key: 'map-dimensions',
                style: { fontSize: '9px', marginTop: '4px', color: '#888', fontStyle: 'italic' }
              }, displayInfo);
            })() : null
          ])
        ])
      ]),

      activeTab === 'combat' && React.createElement('div', { key: 'combat' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Combat Debug Controls'),
        
        React.createElement('div', {
          key: 'healthControls',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'healthTitle',
            style: { 
              color: '#ff4444', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #ff444488'
            }
          }, '❤️ Player Health Management'),
          
          React.createElement('div', {
            key: 'healthButtonGroup',
            style: { 
              display: 'flex',
              gap: '10px',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(162, 89, 255, 0.3)',
              marginBottom: '12px'
            }
          }, [
            React.createElement('button', {
              key: 'removeHeart',
              onClick: () => {
                if (onHealthChange) {
                  onHealthChange(-1); // Remove 1 heart
                }
              },
              style: {
                padding: '8px 16px',
                background: 'rgba(255, 68, 68, 0.2)',
                border: '2px solid #ff4444',
                borderRadius: '8px',
                color: '#ff4444',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '12px'
              }
            }, '💔 Remove Heart'),
            
            React.createElement('button', {
              key: 'addHeart',
              onClick: () => {
                if (onHealthChange) {
                  onHealthChange(1); // Add 1 heart
                }
              },
              style: {
                padding: '8px 16px',
                background: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid #4CAF50',
                borderRadius: '8px',
                color: '#4CAF50',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '12px'
              }
            }, '💚 Add Heart')
          ]),
          
          React.createElement('div', {
            key: 'healthInfo',
            style: { 
              fontSize: '12px', 
              color: '#a259ff', 
              opacity: 0.8,
              fontStyle: 'italic',
              textAlign: 'center'
            }
          }, 'Health range: 0-5 hearts. Going below 0 or above 5 will have no effect.')
        ]),

        React.createElement('div', {
          key: 'invulnerabilityControls',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'invulnTitle',
            style: { 
              color: '#44ff44', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #44ff4488'
            }
          }, '🛡️ Invulnerability'),
          
          React.createElement('div', {
            key: 'invulnToggleGroup',
            style: { 
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(162, 89, 255, 0.3)',
              marginBottom: '12px'
            }
          }, [
            React.createElement('input', {
              key: 'invulnToggle',
              type: 'checkbox',
              checked: debugConfig.invulnerability,
              onChange: (e) => {
                debugConfig.invulnerability = e.target.checked;
                debugLog(`Invulnerability ${e.target.checked ? 'enabled' : 'disabled'}`, 'debug');
                // Force UI update
                forceUpdate({});
              },
              style: {
                marginRight: '12px',
                accentColor: '#44ff44',
                transform: 'scale(1.2)'
              }
            }),
            React.createElement('label', {
              key: 'invulnLabel',
              style: { 
                color: '#44ff44',
                fontWeight: 'bold',
                fontSize: '13px',
                cursor: 'pointer'
              },
              onClick: () => {
                debugConfig.invulnerability = !debugConfig.invulnerability;
                debugLog(`Invulnerability ${debugConfig.invulnerability ? 'enabled' : 'disabled'}`, 'debug');
                forceUpdate({});
              }
            }, debugConfig.invulnerability ? 'Invulnerability ON' : 'Invulnerability OFF')
          ]),
          
          React.createElement('div', {
            key: 'invulnInfo',
            style: { 
              fontSize: '12px', 
              color: '#44ff44', 
              opacity: 0.8,
              fontStyle: 'italic',
              textAlign: 'center'
            }
          }, 'When enabled, player cannot die and health will not go below 1.')
        ])
      ]),

      activeTab === 'boss' && React.createElement('div', { key: 'boss' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Boss Debug Controls'),
        
        React.createElement('div', {
          key: 'bossControls',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'controlTitle',
            style: { 
              color: '#ff4444', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #ff444488'
            }
          }, '🎮 Boss Control'),
          
          React.createElement('div', {
            key: 'controlToggle',
            style: { 
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(162, 89, 255, 0.3)',
              marginBottom: '12px'
            }
          }, [
            React.createElement('input', {
              key: 'bossControlCheckbox',
              type: 'checkbox',
              checked: debugConfig.bossControlEnabled,
              onChange: () => {
                debugConfig.bossControlEnabled = !debugConfig.bossControlEnabled;
                debugLog(`Boss control ${debugConfig.bossControlEnabled ? 'enabled' : 'disabled'}`, 'debug');
                forceUpdate({});
              },
              style: {
                marginRight: '12px',
                accentColor: '#ff4444',
                transform: 'scale(1.2)'
              }
            }),
            React.createElement('label', {
              key: 'bossControlLabel',
              style: { 
                color: debugConfig.bossControlEnabled ? '#ff4444' : '#888',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              },
              onClick: () => {
                debugConfig.bossControlEnabled = !debugConfig.bossControlEnabled;
                debugLog(`Boss control ${debugConfig.bossControlEnabled ? 'enabled' : 'disabled'}`, 'debug');
                forceUpdate({});
              }
            }, debugConfig.bossControlEnabled ? '🎮 Boss Control: ON' : '🎮 Boss Control: OFF')
          ]),
          
          React.createElement('div', {
            key: 'bossControlInfo',
            style: {
              fontSize: '11px',
              color: debugConfig.bossControlEnabled ? '#4CAF50' : '#ff6b6b',
              background: debugConfig.bossControlEnabled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 107, 107, 0.1)',
              border: debugConfig.bossControlEnabled ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 107, 107, 0.3)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px',
              textAlign: 'center',
              fontWeight: 'bold'
            }
          }, debugConfig.bossControlEnabled ? 
            '✅ Boss controls enabled! Use Numpad 4/6/8/5 to move, Z/X/C to attack.' : 
            '⚠️ Boss controls disabled! Check the box above to enable boss controls.'
          )
        ]),
        
        React.createElement('div', {
          key: 'bossLogging',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'debugTitle',
            style: { 
              color: '#ffaa00', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #ffaa0088'
            }
          }, '� Boss Debug Logging'),
          
          React.createElement('div', {
            key: 'debugToggle',
            style: { 
              display: 'flex',
              alignItems: 'center',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 170, 0, 0.3)',
              marginBottom: '12px'
            }
          }, [
            React.createElement('input', {
              key: 'bossDebugCheckbox',
              type: 'checkbox',
              checked: debugConfig.logCategories.boss,
              onChange: () => toggleLogging('boss'),
              style: {
                marginRight: '12px',
                accentColor: '#ffaa00',
                transform: 'scale(1.2)'
              }
            }),
            React.createElement('label', {
              key: 'bossDebugLabel',
              style: { 
                color: debugConfig.logCategories.boss ? '#ffaa00' : '#888',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer'
              },
              onClick: () => toggleLogging('boss')
            }, debugConfig.logCategories.boss ? '� Boss Logging: ON' : '� Boss Logging: OFF')
          ]),
          
          React.createElement('div', {
            key: 'bossDebugWarning',
            style: {
              fontSize: '11px',
              color: debugConfig.logCategories.boss ? '#ffaa00' : '#888',
              background: debugConfig.logCategories.boss ? 'rgba(255, 170, 0, 0.1)' : 'rgba(136, 136, 136, 0.1)',
              border: debugConfig.logCategories.boss ? '1px solid rgba(255, 170, 0, 0.3)' : '1px solid rgba(136, 136, 136, 0.3)',
              borderRadius: '6px',
              padding: '8px',
              marginTop: '8px',
              textAlign: 'center',
              fontWeight: 'bold'
            }
          }, debugConfig.logCategories.boss ? 
            '✅ Boss debug logging enabled! Check console for detailed boss events.' : 
            '⚠️ Boss debug logging disabled! Enable to see detailed boss debug info.'
          )
        ]),
        
        React.createElement('div', {
          key: 'bossHealthControls',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'healthTitle',
            style: { 
              color: '#4CAF50', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #4CAF5088'
            }
          }, '❤️ Boss Health Controls (Always Available)'),
          
          React.createElement('div', {
            key: 'healthButtons',
            style: { 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              padding: '12px',
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '8px',
              border: '2px solid rgba(76, 175, 80, 0.3)'
            }
          }, [
            React.createElement('button', {
              key: 'addHealthAlways',
              onClick: () => {
                debugLog('Add boss health triggered (always available)', 'boss');
                // Add boss health using modifyHealth method to trigger phase transitions
                if (window.gameMapManager && window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
                  const boss = window.gameMapManager.mapXInstance.boss;
                  if (boss.modifyHealth && typeof boss.modifyHealth === 'function') {
                    boss.modifyHealth(5); // Add 5 HP with phase transition check
                    debugLog(`Boss health modified using modifyHealth method`, 'boss');
                  } else {
                    debugLog('Boss modifyHealth method not found', 'boss');
                  }
                } else {
                  debugLog('Boss entity not found - navigate to Map X and wait for boss spawn', 'boss');
                }
              },
              style: {
                padding: '12px 8px',
                background: 'rgba(76, 175, 80, 0.3)',
                border: '2px solid rgba(76, 175, 80, 0.7)',
                borderRadius: '8px',
                color: '#4CAF50',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }
            }, '💚 ADD BOSS HEALTH\n(+5 HP)'),
            
            React.createElement('button', {
              key: 'removeHealthAlways',
              onClick: () => {
                debugLog('Remove boss health triggered (always available)', 'boss');
                // Remove boss health using proper damage system
                if (window.gameMapManager && window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
                  const boss = window.gameMapManager.mapXInstance.boss;
                  if (boss.takeDamage && boss.currentHP !== undefined && boss.maxHP !== undefined) {
                    const oldHealth = boss.currentHP;
                    // Use takeDamage method instead of directly modifying HP
                    boss.takeDamage(5); // This will properly trigger death state if HP reaches 0
                    debugLog(`Boss took 5 damage: ${oldHealth} -> ${boss.currentHP}`, 'boss');
                  } else {
                    debugLog('Boss takeDamage method or health properties not found', 'boss');
                  }
                } else {
                  debugLog('Boss entity not found - navigate to Map X and wait for boss spawn', 'boss');
                }
              },
              style: {
                padding: '12px 8px',
                background: 'rgba(244, 67, 54, 0.3)',
                border: '2px solid rgba(244, 67, 54, 0.7)',
                borderRadius: '8px',
                color: '#F44336',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }
            }, '� REMOVE BOSS HEALTH\n(-5 HP)')
          ])
        ]),
        
        React.createElement('div', {
          key: 'bossActions',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'actionsTitle',
            style: { 
              color: '#ff6b6b', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #ff6b6b88'
            }
          }, '⚡ Other Boss Actions'),
          
          React.createElement('div', {
            key: 'actionButtons',
            style: { 
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '8px',
              padding: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(162, 89, 255, 0.3)'
            }
          }, [
            React.createElement('button', {
              key: 'forcePortalSwap',
              onClick: () => {
                debugLog('Force portal swap triggered', 'boss');
                // Force portal activation in Map X
                if (window.gameMapManager && window.gameMapManager.mapXInstance) {
                  if (window.gameMapManager.mapXInstance.enablePortal) {
                    debugLog('Calling enablePortal on MapX instance', 'boss');
                    
                    // Check if PortalManager has pending config, if not, set it manually
                    if (window.gameMapManager.portalManager && !window.gameMapManager.portalManager.pendingPortalConfig) {
                      debugLog('Pending portal config missing, setting it manually', 'boss');
                      window.gameMapManager.portalManager.pendingPortalConfig = {
                        x: 200,
                        y: 200,
                        w: 256,
                        h: 256,
                        targetMap: 'maparea0'
                      };
                      debugLog('Pending portal config restored', 'boss');
                    }
                    
                    window.gameMapManager.mapXInstance.enablePortal();
                    debugLog('Map X portal forced to activate', 'boss');
                    
                    // Additional debug info
                    debugLog(`Portal enabled state: ${window.gameMapManager.mapXInstance.portalEnabled}`, 'boss');
                    if (window.gameMapManager.portalManager) {
                      debugLog(`PortalManager exists: ${!!window.gameMapManager.portalManager}`, 'boss');
                      debugLog(`PortalManager mapId: ${window.gameMapManager.portalManager.mapId}`, 'boss');
                      debugLog(`Pending portal config: ${!!window.gameMapManager.portalManager.pendingPortalConfig}`, 'boss');
                      debugLog(`Portal count after force: ${window.gameMapManager.portalManager.portals.length}`, 'boss');
                    } else {
                      debugLog('PortalManager not found in MapManager', 'boss');
                    }
                  } else {
                    debugLog('Map X portal enablePortal method not found', 'boss');
                  }
                } else {
                  debugLog('Map X instance not found - navigate to Map X first', 'boss');
                }
              },
              style: {
                padding: '10px 8px',
                background: 'rgba(255, 152, 0, 0.2)',
                border: '2px solid rgba(255, 152, 0, 0.5)',
                borderRadius: '8px',
                color: '#FF9800',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textAlign: 'center'
              }
            }, '🌀 FORCE PORTAL SWAP\n(Skip 3min timer)')
          ])
        ]),
        
        React.createElement('div', {
          key: 'bossCooldowns',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'cooldownsTitle',
            style: { 
              color: '#9C27B0', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #9C27B088'
            }
          }, '⏱️ Cooldowns'),
          
          React.createElement('div', {
            key: 'cooldownDisplay',
            style: { 
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '12px',
              background: 'rgba(156, 39, 176, 0.1)',
              borderRadius: '8px',
              border: '2px solid rgba(156, 39, 176, 0.3)',
              fontFamily: "'Courier New', monospace",
              fontSize: '12px'
            }
          }, [
            React.createElement('div', {
              key: 'meleeCooldownItem',
              style: { 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                borderLeft: '3px solid #4CAF50'
              },
              className: 'cooldown-item',
              id: 'meleeCooldownItem'
            }, [
              React.createElement('span', {
                key: 'meleeLabel',
                style: { color: '#ffffff', fontWeight: 'bold', minWidth: '80px' }
              }, 'Melee (C):'),
              React.createElement('span', {
                key: 'meleeCooldown',
                style: { color: '#4CAF50', fontWeight: 'bold', textAlign: 'right', minWidth: '60px' },
                className: 'cooldown-time',
                id: 'meleeCooldown'
              }, 'Ready')
            ]),
            
            React.createElement('div', {
              key: 'zapCooldownItem',
              style: { 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                borderLeft: '3px solid #4CAF50'
              },
              className: 'cooldown-item',
              id: 'zapCooldownItem'
            }, [
              React.createElement('span', {
                key: 'zapLabel',
                style: { color: '#ffffff', fontWeight: 'bold', minWidth: '80px' }
              }, 'Zap (X):'),
              React.createElement('span', {
                key: 'zapCooldown',
                style: { color: '#4CAF50', fontWeight: 'bold', textAlign: 'right', minWidth: '60px' },
                className: 'cooldown-time',
                id: 'zapCooldown'
              }, 'Ready')
            ]),
            
            React.createElement('div', {
              key: 'rangeCooldownItem',
              style: { 
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: '4px',
                borderLeft: '3px solid #4CAF50'
              },
              className: 'cooldown-item',
              id: 'rangeCooldownItem'
            }, [
              React.createElement('span', {
                key: 'rangeLabel',
                style: { color: '#ffffff', fontWeight: 'bold', minWidth: '80px' }
              }, 'Range (Z):'),
              React.createElement('span', {
                key: 'rangeCooldown',
                style: { color: '#4CAF50', fontWeight: 'bold', textAlign: 'right', minWidth: '60px' },
                className: 'cooldown-time',
                id: 'rangeCooldown'
              }, 'Ready')
            ])
          ])
        ]),
        
        React.createElement('div', {
          key: 'bossInfo',
          style: { 
            fontSize: '12px', 
            background: 'rgba(255, 255, 255, 0.03)',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(162, 89, 255, 0.3)'
          }
        }, [
          React.createElement('div', {
            key: 'bossInfoTitle',
            style: { marginBottom: '8px' }
          }, React.createElement('strong', { style: { color: '#ff4444' } }, 'Boss AI Information:')),
          
          React.createElement('div', {
            key: 'bossAIInfo',
            style: { fontSize: '11px', marginBottom: '8px', color: '#FFC107' }
          }, '🤖 Boss controls are now handled by the BossAI component'),
          
          React.createElement('div', {
            key: 'controlsList',
            style: { fontSize: '10px', color: '#888', lineHeight: '1.3' }
          }, [
            React.createElement('div', { key: 'info1' }, '• Boss AI automatically handles all boss logic and controls'),
            React.createElement('div', { key: 'info2' }, '• Keyboard controls work when boss debugging is enabled'),
            React.createElement('div', { key: 'info3' }, '• Numpad 4/6/8/5: Move boss left/right/up/down'),
            React.createElement('div', { key: 'info4' }, '• Z/X/C: Range/bolt/melee attacks'),
            React.createElement('div', { key: 'info5' }, '• Force Portal: Instantly enables Map X portal (skip 3min timer)'),
            React.createElement('div', { key: 'info6' }, '• Add Boss Health: Increases boss health by 5 HP (max 40)'),
            React.createElement('div', { key: 'info7' }, '• Remove Boss Health: Decreases boss health by 5 HP (min 0)'),
            React.createElement('div', { key: 'info8' }, '• Boss AI can be fine-tuned in BossAI.js component'),
            React.createElement('div', { key: 'info9' }, '• All boss actions are logged when debugging is enabled')
          ])
        ])
      ]),

      activeTab === 'screens' && React.createElement('div', { key: 'screens' }, [
        React.createElement('h4', {
          key: 'title',
          style: { 
            color: '#a259ff', 
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 'bold',
            textShadow: '0 0 8px #a259ff88'
          }
        }, 'Screen Navigation'),
        
        React.createElement('div', {
          key: 'screenInfo',
          style: { 
            fontSize: '12px', 
            color: '#a259ff', 
            opacity: 0.8,
            marginBottom: '16px',
            padding: '8px',
            background: 'rgba(162, 89, 255, 0.1)',
            borderRadius: '6px'
          }
        }, 'Click any screen below to navigate directly to it for testing purposes.'),
        
        React.createElement('div', {
          key: 'menuScreens',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'menuTitle',
            style: { 
              color: '#00bcd4', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #00bcd488'
            }
          }, 'Menu Screens'),
          
          React.createElement('div', {
            key: 'menuButtons',
            style: { 
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px'
            }
          }, [
            React.createElement('button', {
              key: 'mainMenu',
              onClick: () => onNavigateToScreen && onNavigateToScreen('main-menu'),
              style: {
                padding: '10px 12px',
                background: 'rgba(33, 150, 243, 0.2)',
                border: '2px solid rgba(33, 150, 243, 0.5)',
                borderRadius: '10px',
                color: '#2196F3',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(33, 150, 243, 0.3)'
              }
            }, '🏠 Main Menu'),
            
            React.createElement('button', {
              key: 'introScreen',
              onClick: () => onNavigateToScreen && onNavigateToScreen('intro'),
              style: {
                padding: '10px 12px',
                background: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid rgba(76, 175, 80, 0.5)',
                borderRadius: '10px',
                color: '#4CAF50',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
              }
            }, '🌟 Intro Screen'),
            
            React.createElement('button', {
              key: 'loadingScreen',
              onClick: () => onNavigateToScreen && onNavigateToScreen('loading'),
              style: {
                padding: '10px 12px',
                background: 'rgba(255, 152, 0, 0.2)',
                border: '2px solid rgba(255, 152, 0, 0.5)',
                borderRadius: '10px',
                color: '#FF9800',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(255, 152, 0, 0.3)'
              }
            }, '⏳ Loading Screen'),
            
            React.createElement('button', {
              key: 'outroScreen',
              onClick: () => onNavigateToScreen && onNavigateToScreen('outro'),
              style: {
                padding: '10px 12px',
                background: 'rgba(156, 39, 176, 0.2)',
                border: '2px solid rgba(156, 39, 176, 0.5)',
                borderRadius: '10px',
                color: '#9C27B0',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(156, 39, 176, 0.3)'
              }
            }, '🎬 Outro Screen')
          ])
        ]),
        
        React.createElement('div', {
          key: 'gameScreens',
          style: { marginBottom: '16px' }
        }, [
          React.createElement('h5', {
            key: 'gameTitle',
            style: { 
              color: '#ff6b6b', 
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              textShadow: '0 0 8px #ff6b6b88'
            }
          }, 'Game Screens'),
          
          React.createElement('div', {
            key: 'gameButtons',
            style: { 
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '8px'
            }
          }, [
            React.createElement('button', {
              key: 'gameScreen',
              onClick: () => onNavigateToScreen && onNavigateToScreen('game'),
              style: {
                padding: '10px 12px',
                background: 'rgba(76, 175, 80, 0.2)',
                border: '2px solid rgba(76, 175, 80, 0.5)',
                borderRadius: '10px',
                color: '#4CAF50',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
              }
            }, '🎮 Game Screen'),
            
            React.createElement('button', {
              key: 'gameOverScreen',
              onClick: () => onNavigateToScreen && onNavigateToScreen('game-over'),
              style: {
                padding: '10px 12px',
                background: 'rgba(244, 67, 54, 0.2)',
                border: '2px solid rgba(244, 67, 54, 0.5)',
                borderRadius: '10px',
                color: '#F44336',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
                transition: 'all 0.2s ease',
                textShadow: '0 0 8px rgba(244, 67, 54, 0.3)'
              }
            }, '💀 Game Over Screen')
          ])
        ]),
        
        React.createElement('div', {
          key: 'screenNote',
          style: { 
            fontSize: '11px', 
            color: '#a259ff', 
            opacity: 0.7,
            textAlign: 'center',
            fontStyle: 'italic',
            marginTop: '16px',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px'
          }
        }, 'Note: Screen navigation will exit the current game state. Use for testing UI screens.')
      ])
    ])
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
