import Portal from './Portal';
import { portalFrames } from './portalFrames';
import { debugLog } from '../../../development/utils/Debug';

export default class PortalManager {
  constructor(app, mapId, mapSize, mapHeight) {
    this.app = app;
    this.mapId = mapId;
    this.mapSize = mapSize;
    this.mapHeight = mapHeight || mapSize; // Default to mapSize if height not provided (for square maps)
    this.portals = [];
    this.promptCleanupFn = null;
    this.isPromptActive = false;
    this.forcePrompt = false;
    this.onTeleportCallback = null;
    this.pendingPortalConfig = null; // For delayed portal creation (Map X)
    this.sceneContainer = null; // Store reference to the layer where portals should be added
    
    // Create portals for this map
    this.createPortals();
  }
  
  createPortals() {
    let portalConfig = null;
    
    // Get portal configuration for this map
    switch (this.mapId) {
      case 'maparea0':
        portalConfig = this.getPortalPosition0();
        break;
      case 'maparea1':
        portalConfig = this.getPortalPosition1();
        break;
      case 'mapareax':
        // For Map X, don't create portal immediately - boss needs to be defeated first
        portalConfig = this.getPortalPositionX();
        this.pendingPortalConfig = portalConfig; // Store config for later
        debugLog('MapX: Portal creation delayed until boss fight ends', 'portal');
        return; // Exit early, don't create portal yet
      case 'maparea2':
        portalConfig = this.getPortalPosition2();
        break;
      default:
        console.warn(`No portal configuration for map ${this.mapId}`);
        return;
    }
      // Create portal if we have a configuration
    if (portalConfig) {
      const portal = new Portal(
        this.app,
        portalConfig.x,
        portalConfig.y,
        portalConfig.w,
        portalConfig.h,
        portalConfig.targetMap,
        this.sceneContainer // Pass the layer so portal stays in world space
      );
      
      // Store tile coordinates if available
      if (portalConfig.tileX !== undefined && portalConfig.tileY !== undefined) {
        portal.tileX = portalConfig.tileX;
        portal.tileY = portalConfig.tileY;
      }
      
      this.portals.push(portal);
    }
  }

  /**
   * Create portal for Map X after boss fight ends
   */
  enableMapXPortal() {
    if (this.mapId !== 'mapareax' || !this.pendingPortalConfig) {
      debugLog('MapX: Cannot enable portal - not Map X or no pending config', 'portal');
      return;
    }

    try {
      const portalConfig = this.pendingPortalConfig;
      
      const portal = new Portal(
        this.app,
        portalConfig.x,
        portalConfig.y,
        portalConfig.w,
        portalConfig.h,
        portalConfig.targetMap,
        this.sceneContainer // Pass the layer so portal stays in world space
      );
      
      // Store tile coordinates if available
      if (portalConfig.tileX !== undefined && portalConfig.tileY !== undefined) {
        portal.tileX = portalConfig.tileX;
        portal.tileY = portalConfig.tileY;
      }
      
      this.portals.push(portal);
      this.pendingPortalConfig = null; // Clear pending config
      
      debugLog(`MapX: Portal enabled at (${portalConfig.x}, ${portalConfig.y}) after boss fight`, 'portal');
      
    } catch (error) {
      debugLog(`MapX: Error enabling portal: ${error.message}`, 'portal');
    }
  }
    // Portal position configurations - same logic as your original functions
  getPortalPosition0() {
    return {
      x: this.mapSize * 0.90,
      y: this.mapSize - this.mapSize * 0.10,
      w: 256,
      h: 256,
      targetMap: 'maparea1'
    };
  }    getPortalPositionX() {
    // MapX is a cave with dimensions 2048x1556 (half size), place portal at top-left
    const topLeftX = 200;   // Near top-left corner
    const topLeftY = 200;   // Near top-left corner
    
    debugLog(`MapX portal positioned at top-left: (${topLeftX}, ${topLeftY})`, 'portal');
    console.log(`🚪 MapX portal positioned at top-left: (${topLeftX}, ${topLeftY})`);
    
    return {
      x: topLeftX,
      y: topLeftY,
      w: 256,
      h: 256,
      targetMap: 'maparea0'
    };
  }getPortalPosition1() {
    // Portal positioned randomly 6-7 tiles away from center of the 16x16 grid
    // Center is at tile (8,8), character needs to explore to find the portal
    
    const centerTileX = 8;
    const centerTileY = 8;
    const minDistance = 6;
    const maxDistance = 7;
    
    // Find all valid positions that are 6-7 tiles away from center
    const validPositions = [];
    
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        // Calculate distance from center using Chebyshev distance (max of dx, dy)
        // This gives us the "tile ring" distance which is more appropriate for a grid
        const distance = Math.max(Math.abs(x - centerTileX), Math.abs(y - centerTileY));
        
        if (distance >= minDistance && distance <= maxDistance) {
          validPositions.push({ x, y, distance });
        }
      }
    }
    
    // Randomly select one of the valid positions
    const selectedPosition = validPositions[Math.floor(Math.random() * validPositions.length)];
    const tileX = selectedPosition.x;
    const tileY = selectedPosition.y;
    const actualDistance = selectedPosition.distance;
      const tileWidth = 2100;  // 33600 / 16 (was 4200, now 2x smaller)
    const tileHeight = 1485; // 23760 / 16 (was 2970, now 2x smaller)
    
    // Calculate tile center in world coordinates
    const tileCenterX = tileX * tileWidth + tileWidth / 2;
    const tileCenterY = tileY * tileHeight + tileHeight / 2;
      // Add small random offset within 15% of tile size around center
    const maxOffsetX = tileWidth * 0.15;  // 15% of tile width
    const maxOffsetY = tileHeight * 0.15; // 15% of tile height
    const offsetX = (Math.random() - 0.5) * 2 * maxOffsetX; // -15% to +15%
    const offsetY = (Math.random() - 0.5) * 2 * maxOffsetY; // -15% to +15%
    
    const worldX = tileCenterX + offsetX;
    const worldY = tileCenterY + offsetY;
    
    debugLog(`Portal randomly placed at tile (${tileX},${tileY}), ${actualDistance} tiles from center (${centerTileX},${centerTileY})`, 'portal');
    debugLog(`Total valid positions found: ${validPositions.length}`, 'portal');
    debugLog(`🚪 Portal randomly positioned at tile (${tileX},${tileY}) = world coordinates (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) - ${actualDistance} tiles from center`, 'portal');
    debugLog(`🎯 Character must explore to find the portal! (${validPositions.length} possible locations were available)`, 'portal');
    
    return {
      x: worldX,
      y: worldY,
      w: 256,
      h: 256,
      targetMap: 'maparea2',
      tileX: tileX,
      tileY: tileY
    };
  }
  getPortalPosition2() {
    // Portal positioned randomly 6-7 tiles away from center of the 16x16 grid (same as Map1)
    // Center is at tile (8,8), character needs to explore to find the portal
    
    const centerTileX = 8;
    const centerTileY = 8;
    const minDistance = 6;
    const maxDistance = 7;
    
    // Find all valid positions that are 6-7 tiles away from center
    const validPositions = [];
    
    for (let x = 0; x < 16; x++) {
      for (let y = 0; y < 16; y++) {
        // Calculate distance from center using Chebyshev distance (max of dx, dy)
        // This gives us the "tile ring" distance which is more appropriate for a grid
        const distance = Math.max(Math.abs(x - centerTileX), Math.abs(y - centerTileY));
        
        if (distance >= minDistance && distance <= maxDistance) {
          validPositions.push({ x, y, distance });
        }
      }
    }
    
    // Randomly select one of the valid positions
    const selectedPosition = validPositions[Math.floor(Math.random() * validPositions.length)];
    const tileX = selectedPosition.x;
    const tileY = selectedPosition.y;
    const actualDistance = selectedPosition.distance;
    
    const tileWidth = 2100;  // 33600 / 16 (same as Map1)
    const tileHeight = 1485; // 23760 / 16 (same as Map1)
    
    // Calculate tile center in world coordinates
    const tileCenterX = tileX * tileWidth + tileWidth / 2;
    const tileCenterY = tileY * tileHeight + tileHeight / 2;
    
    // Add small random offset within 15% of tile size around center
    const maxOffsetX = tileWidth * 0.15;  // 15% of tile width
    const maxOffsetY = tileHeight * 0.15; // 15% of tile height
    const offsetX = (Math.random() - 0.5) * 2 * maxOffsetX; // -15% to +15%
    const offsetY = (Math.random() - 0.5) * 2 * maxOffsetY; // -15% to +15%
    
    const worldX = tileCenterX + offsetX;
    const worldY = tileCenterY + offsetY;
    
    debugLog(`Map2: Portal randomly placed at tile (${tileX},${tileY}), ${actualDistance} tiles from center (${centerTileX},${centerTileY})`, 'portal');
    debugLog(`Map2: Total valid positions found: ${validPositions.length}`, 'portal');
    debugLog(`🚪 Map2: Portal randomly positioned at tile (${tileX},${tileY}) = world coordinates (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) - ${actualDistance} tiles from center`, 'portal');
    debugLog(`🎯 Map2: Character must explore to find the portal! (${validPositions.length} possible locations were available)`, 'portal');
    
    return {
      x: worldX,
      y: worldY,
      w: 256,
      h: 256,
      targetMap: 'mapareax',
      tileX: tileX,
      tileY: tileY
    };
  }
  
  // Add portals to the scene
  addToScene(container) {
    this.sceneContainer = container; // Store reference for future use
    this.portals.forEach(portal => {
      container.addChild(portal.container);
    });
  }
    // Update to check for character-portal interactions
  update(character) {
    if (!character) {
      console.warn('PortalManager.update: Character is null or undefined');
      return;
    }    
    if (!character.position) {
      console.warn('PortalManager.update: Character position is null or undefined');
      return;
    }
    
    let characterOnPortal = false;
    let activePortal = null;
    
    // Check if character is on any portal
    for (const portal of this.portals) {
      if (portal.isCharacterOnPortal(character)) {
        characterOnPortal = true;
        activePortal = portal;
        debugLog(`Character on portal: ${portal.id || 'unknown'} at (${portal.x}, ${portal.y})`, 'portal');
        break;
      }
    }
    
    // Handle portal prompt visibility
    if ((characterOnPortal || this.forcePrompt) && !this.isPromptActive) {
      this.isPromptActive = true;
      
      // Special handling for MapX portals
      if (this.mapId === 'mapareax') {
        // Show escape prompt for MapX
        this.promptCleanupFn = activePortal.showEscapePrompt(() => {
          // Trigger outro screen directly via screen navigation callback
          if (window.debugNavigateToScreen) {
            window.debugNavigateToScreen('OUTRO');
          } else {
            debugLog('Cannot trigger outro: debugNavigateToScreen not available', 'portal');
          }
          
          this.isPromptActive = false;
          this.promptCleanupFn = null;
        });
      } else {
        // Normal portal prompt for other maps
        this.promptCleanupFn = activePortal.showPrompt((targetMap) => {
          if (this.onTeleportCallback) {
            this.onTeleportCallback(targetMap);
          }
          
          this.isPromptActive = false;
          this.promptCleanupFn = null;
        });
      }
    } 
    else if (!characterOnPortal && !this.forcePrompt && this.isPromptActive) {
      // Clean up prompt when character leaves portal
      if (this.promptCleanupFn) {
        this.promptCleanupFn();
        this.promptCleanupFn = null;
      }
      
      this.isPromptActive = false;
    }
  }
  
  // Set callback for teleport action
  setOnTeleport(callback) {
    this.onTeleportCallback = callback;
  }
  
  // Force portal prompt (for debugging)
  setForcePrompt(force) {
    this.forcePrompt = force;
  }
  
  // Get portals for external use (debug menu)
  getPortals() {
    return this.portals.map(portal => ({
      x: portal.position.x,
      y: portal.position.y,
      w: portal.width,
      h: portal.height,
      targetMap: portal.targetMap
    }));
  }
  
  /**
   * Set a custom position for a specific portal
   * @param {string} targetMap - The target map ID
   * @param {Object} position - Position {x, y} for the portal
   */
  setCustomPortalPosition(targetMap, position) {
    // Find a portal that leads to the target map
    const portal = this.portals.find(p => p.targetMap === targetMap);
    
    if (portal) {
      // Update portal position
      portal.setPosition(position.x, position.y);
      return true;
    }
    
    // If no portal found, create a new one
    const newPortal = new Portal(
      this.app,
      position.x,
      position.y,
      128, // default width
      128, // default height
      targetMap
    );
    
    this.portals.push(newPortal);
    if (this.container) {
      newPortal.addToContainer(this.container);
    }
    
    return true;
  }
  
  // Clean up
  destroy() {
    // Clean up prompt if active
    if (this.promptCleanupFn) {
      this.promptCleanupFn();
      this.promptCleanupFn = null;
    }
    
    // Clean up all portals
    this.portals.forEach(portal => portal.destroy());
    this.portals = [];
  }
  
  getPortalImg(portal, portalFrameIdx, offset) {
    if (!portal) return null;
    const portalFrameSrc = portalFrames[portalFrameIdx % portalFrames.length];
    return (
      <img
        src={portalFrameSrc}
        alt=""
        style={{
          width: portal.w,
          height: portal.h,
          position: 'absolute',
          left: portal.x - offset.x - portal.w / 2,
          top: portal.y - offset.y - portal.h / 2,
          zIndex: 5,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
        draggable={false}
        onError={(e) => {
          e.target.style.display = 'none';
        }}
      />
    );
  }
}