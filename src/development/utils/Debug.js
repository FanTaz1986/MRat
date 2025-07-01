import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as PIXI from 'pixi.js';

// Debug configuration and state
let debugConfig = {
  showConsoleMessages: true,
  showStats: true,
  muteDebugLogs: false,
  logCategories: {
    general: true,
    portal: true,
    character: true,
    camera: true,
    map: true,
    audio: true,
    asset: true,
    game: true,
    system: true,
    rendering: true,
    collision: true,
    animation: true,
    input: true,
    performance: true,
    pet: true
  }
};

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
 * Simple debug overlay component
 */
function SimpleDebugOverlay({ 
  showDebug, 
  mapManager, 
  character, 
  camera,
  onClose,
  onNavigateToScreen
}) {  const [activeTab, setActiveTab] = useState('general');
  const [, forceUpdate] = useState({});

  if (!showDebug) return null;
  
  const triggerUpdate = () => {
    forceUpdate({});
  };

  const toggleLogging = (category) => {
    if (category === 'all') {
      const newValue = !Object.values(debugConfig.logCategories).every(v => v);
      Object.keys(debugConfig.logCategories).forEach(key => {
        debugConfig.logCategories[key] = newValue;
      });
    } else if (category === 'none') {
      Object.keys(debugConfig.logCategories).forEach(key => {
        debugConfig.logCategories[key] = false;
      });
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
      const charX = Math.floor(character.position.x / tileWidth);
      const charY = Math.floor(character.position.y / tileHeight);
      const charTileIndex = charY * gridWidth + charX;
      debugLog(`--- CHARACTER ANALYSIS ---`, 'system');
      debugLog(`Character Position: (${character.position.x.toFixed(1)}, ${character.position.y.toFixed(1)})`, 'system');
      debugLog(`Character Tile: (${charX}, ${charY}) | Tile Index: ${charTileIndex}`, 'system');
      debugLog(`Character Grid Width Used: ${gridWidth}`, 'system');
      debugLog(`Tile Size Used: ${tileWidth}x${tileHeight}`, 'system');
      
      // Check if character is within map bounds
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
      });
    } else {
      debugLog('Cannot teleport: map manager not available', 'map');
    }
  };
  const teleportToPortal = () => {
    if (mapManager && mapManager.portalManager && mapManager.portalManager.portals.length > 0) {
      const portal = mapManager.portalManager.portals[0];
      if (portal && portal.position && character && character.position) {
        character.position.x = portal.position.x;
        character.position.y = portal.position.y;
          // Center camera on character after teleporting to portal
        if (camera && camera.centerOn) {
          setTimeout(() => {
            camera.centerOn(character.position.x, character.position.y);
            debugLog(`Camera centered on character at portal: (${character.position.x}, ${character.position.y})`, 'portal');
          }, 50); // Small delay to ensure position is stable
        }
        
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
          camera.centerOn(character.position.x, character.position.y);
          debugLog(`Camera centered on character at spawn: (${character.position.x}, ${character.position.y})`, 'character');
        }, 50); // Small delay to ensure position is stable
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
    }, ['general', 'map', 'tools', 'logging', 'analysis', 'pet', 'screens'].map(tab => 
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
          }, '🌀 Teleport to Portal'),
          
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
                // Use the camera's centerOn method for proper centering
                if (camera.centerOn) {
                  camera.centerOn(character.position.x, character.position.y);
                  debugLog(`Camera centered on character at (${character.position.x}, ${character.position.y})`, 'camera');
                } else {
                  // Fallback to direct position setting
                  camera.position.x = character.position.x;
                  camera.position.y = character.position.y;
                  debugLog('Camera centered on character (fallback method)', 'camera');
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
                  if (camera.centerOn) {
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

/**
 * Create debug overlay system
 */
export function createDebugOverlay(app) {
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
    showDebug = !showDebug;
    renderDebugOverlay();
  }

  // Create debug button
  function createDebugButton() {
    const existingButton = document.getElementById('debug-toggle-button');
    if (existingButton) {
      existingButton.parentNode.removeChild(existingButton);
    }    const debugButton = document.createElement('button');
    debugButton.id = 'debug-toggle-button';
    debugButton.textContent = 'Debug';
    debugButton.style.position = 'fixed';
    debugButton.style.top = '20px';
    debugButton.style.right = '20px';
    debugButton.style.zIndex = '10000';
    debugButton.style.padding = '12px 20px';
    debugButton.style.fontSize = '14px';
    debugButton.style.background = 'rgba(30,0,60,0.9)';
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

  // Function to render the debug overlay
  function renderDebugOverlay() {
    if (isDestroyed || !debugContainer || !debugContainer.parentNode) {
      return;
    }
    
    if (root) {
      root.render(
        React.createElement(SimpleDebugOverlay, {
          showDebug,
          mapManager,
          character,
          camera,
          onClose: toggleDebug,
          onNavigateToScreen: (screenType) => {
            debugLog(`Debug: Navigating to screen: ${screenType}`, 'system');
            // This callback should be provided by the parent application
            // For now, we'll just log the request
            window.debugNavigateToScreen && window.debugNavigateToScreen(screenType);
          }
        })
      );
    }
  }

  // Initial render
  renderDebugOverlay();

  // Return debug system interface
  return {
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
    destroy: () => {
      isDestroyed = true;
      const button = document.getElementById('debug-toggle-button');
      if (button) button.remove();
      if (debugContainer && debugContainer.parentNode) {
        debugContainer.parentNode.removeChild(debugContainer);
      }
    }
  };
}

/**
 * Portal debug functionality (simplified)
 */
export function debugPortal(portal, character) {
  if (!portal) {
    debugLog('Portal is undefined', 'portal');
    return;
  }
  
  if (!portal.position) {
    debugLog('Portal position is undefined', 'portal');
    return;
  }
  
  debugLog(`Portal: ${portal.targetMap || 'Unknown'} at (${portal.position.x}, ${portal.position.y})`, 'portal');
  
  if (character && character.position) {
    const distance = Math.sqrt(
      Math.pow(character.position.x - portal.position.x, 2) + 
      Math.pow(character.position.y - portal.position.y, 2)
    );
    debugLog(`Distance to portal: ${distance.toFixed(1)}px`, 'portal');
  } else {
    debugLog('Character or character position is undefined', 'portal');
  }
}
