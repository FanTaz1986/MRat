import * as PIXI from 'pixi.js';
import MapObstacle from './MapObstacle';
import Map2PropGenerator from './Map2PropGenerator';
import { debugLog } from '../../development/utils/Debug';

/**
 * Map2 - A swamp-themed gameplay map
 * This map features dark atmosphere and fog effects
 */
export default class Map2 {
  constructor(app, mapWidth, mapHeight, layers, gameSeed = null) {
    debugLog(`Map2 constructor called - app: ${!!app}, mapWidth: ${mapWidth}, mapHeight: ${mapHeight}, layers: ${!!layers}, gameSeed: ${gameSeed}`, 'map');
    
    this.app = app;
    this.mapId = 'maparea2';
    
    // Use Map1's correct dimensions system
    this.mapWidth = mapWidth;   // 33600 (same as Map1)
    this.mapHeight = mapHeight; // 23760 (same as Map1)
    this.layers = layers; // MapManager's layers
    this.props = [];
    this.obstacles = [];
    this.backgroundTiles = [];
    
    // Grid settings (same as Map1)
    this.gridSize = 16; // 16x16 grid
    this.tileWidth = mapWidth / this.gridSize;   // Each tile is 2100px wide (33600/16)
    this.tileHeight = mapHeight / this.gridSize; // Each tile is 1485px tall (23760/16)
    
    // For backwards compatibility, keep tileSize as the width (some code might still use it)
    this.tileSize = this.tileWidth;
    
    // Create prop generator with correct tile dimensions and game seed
    this.propGenerator = new Map2PropGenerator(this.tileWidth, this.tileHeight, gameSeed);
      // Map boundaries for character movement (use slightly smaller bounds to prevent edge walking)
    this.mapBounds = {
      minX: 32,
      minY: 32,
      maxX: mapWidth - 32,
      maxY: mapHeight - 32
    };

    // NOTE: PortalManager is now handled by MapManager, not by Map2
    // This prevents conflicts and ensures consistent portal data
    this.portalManager = null;
    debugLog('Map2 will use portal information passed from MapManager', 'map');
  }
    /**
   * Get bounds for Map2
   */
  getBounds() {
    return this.mapBounds;
  }
    /**
   * Set the portal manager for this map
   * @param {PortalManager} portalManager - The portal manager instance
   */
  setPortalManager(portalManager) {
    this.portalManager = portalManager;
    debugLog(`Map2: Portal manager set with ${portalManager?.portals?.length || 0} portals`, 'map');
    
    // Log portal details for debugging
    if (portalManager && portalManager.portals.length > 0) {
      portalManager.portals.forEach((portal, index) => {
        debugLog(`Map2: Portal ${index}: tile(${portal.tileX}, ${portal.tileY}), pos(${portal.x}, ${portal.y})`, 'map');
      });
    }
  }
    /**
   * Load props for Map2
   */
  loadProps() {
    debugLog('Loading props for Map2', 'map');
    
    // First, create the repeating background tiles
    this.createBackgroundTiles();
    
    // Generate props using the dedicated prop generator
    const props = this.propGenerator.getAllProps();
    debugLog(`Generated ${props.length} props for Map2`, 'map');
    
    // Create prop sprites
    this.createPropSprites(props);
    
    // Add obstacles after loading props
    this.addObstacles();
    
    // Add portals to character layer for proper z-ordering (only if portal manager exists)
    if (this.portalManager) {
      this.portalManager.addToScene(this.layers.character);
      debugLog('Map2 portals added to MapManager character layer', 'map');
    } else {
      debugLog('Map2: No portal manager available, skipping portal setup', 'map');
    }
    
    return props;
  }
    /**
   * Create repeating background tiles for the 16x16 grid
   * Each tile shows the same background image repeated
   */
  createBackgroundTiles() {
    debugLog('Creating background tiles for Map2 (16x16 grid with repeated background)', 'map');
    debugLog(`Map2 dimensions: ${this.mapWidth}x${this.mapHeight}, tile size: ${this.tileWidth}x${this.tileHeight}`, 'map');
    
    // Clear existing background tiles
    this.backgroundTiles.forEach(tile => {
      if (tile && tile.parent) {
        tile.parent.removeChild(tile);
        tile.destroy();
      }
    });
    this.backgroundTiles = [];
    
    // Background image path for Map2
    const backgroundImagePath = process.env.PUBLIC_URL + '/2MAP/play_area/1Amap.png';
    
    // Create 16x16 grid of background tiles
    for (let tileY = 0; tileY < this.gridSize; tileY++) {
      for (let tileX = 0; tileX < this.gridSize; tileX++) {
        try {
          // Create high-quality texture for background tile
          const texture = PIXI.Texture.from(backgroundImagePath);
          texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
          texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
          texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
          
          // Create sprite for this tile
          const tileSprite = new PIXI.Sprite(texture);
          
          // Set tile size to match our tile dimensions (2100x1485 like Map1)
          tileSprite.width = this.tileWidth;   // 2100px
          tileSprite.height = this.tileHeight; // 1485px
          
          // Position the tile in the grid
          tileSprite.x = tileX * this.tileWidth;
          tileSprite.y = tileY * this.tileHeight;
          
          // Set low z-index so it appears behind everything
          tileSprite.zIndex = 0;
          tileSprite.roundPixels = false;
          
          // Add to background layer
          this.layers.background.addChild(tileSprite);
          this.backgroundTiles.push(tileSprite);
          
          debugLog(`Created background tile (${tileX}, ${tileY}) at position (${tileSprite.x}, ${tileSprite.y}) size ${tileSprite.width}x${tileSprite.height}`, 'map');
        } catch (error) {
          debugLog(`Failed to create background tile (${tileX}, ${tileY}): ${error.message}`, 'map');
        }
      }
    }
    
    debugLog(`Map2: Created ${this.backgroundTiles.length} background tiles (16x16 grid, each ${this.tileWidth}x${this.tileHeight})`, 'map');
  }
  
  /**
   * Create prop sprites from prop data
   * @param {Array} props - Array of prop objects
   */
  createPropSprites(props) {
    // Clear previous props if they exist
    this.props.forEach(propSprite => {
      if (propSprite && propSprite.parent) {
        propSprite.parent.removeChild(propSprite);
      }
    });
    
    this.props = [];
    
    debugLog(`Creating ${props.length} props for Map2`, 'map');
      // Create new prop sprites
    props.forEach(prop => {
      try {
        // Handle both old format (prop.file) and new format (prop.texturePath)
        let texturePath;
        let fileName;
        
        if (prop.texturePath) {
          // New format with full texture path
          texturePath = process.env.PUBLIC_URL + prop.texturePath;
          fileName = prop.texturePath.split('/').pop();
        } else if (prop.file) {
          // Old format with just filename
          texturePath = process.env.PUBLIC_URL + "/2MAP/Props/" + prop.file;
          fileName = prop.file;
        } else {
          debugLog(`Prop missing texture information: ${JSON.stringify(prop)}`, 'map');
          return;
        }
        
        // Create texture with high-quality settings
        const texture = PIXI.Texture.from(texturePath);
        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
        texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
        texture.baseTexture.resolution = Math.max(window.devicePixelRatio || 1, 2);
        
        const sprite = new PIXI.Sprite(texture);
        const size = 128 * (prop.scale || 1);
        
        sprite.width = size;
        sprite.height = size;
        sprite.position.set(prop.x, prop.y);
        sprite.rotation = (prop.rotation || 0);
        sprite.anchor.set(0.5);
        sprite.zIndex = prop.zIndex || 1;
        sprite.roundPixels = false; // Enable sub-pixel positioning
        
        // Handle mirroring (horizontal flip)
        if (prop.mirrored) {
          sprite.scale.x = -Math.abs(sprite.scale.x);
        }
        
        // Apply visual effects for portal areas
        if (prop.alpha !== undefined) {
          sprite.alpha = prop.alpha;
        }
        
        if (prop.tint !== undefined) {
          sprite.tint = prop.tint;
        }
        
        // Store texture filename for debugging
        sprite._textureFileName = fileName;
        sprite._originalTexturePath = texturePath;
        
        // Add to MapManager's props layer
        this.layers.props.addChild(sprite);
        this.props.push(sprite);
        
        debugLog(`Loaded prop: ${fileName}, scale: ${prop.scale.toFixed(2)}, rotation: ${(prop.rotation * 180 / Math.PI).toFixed(0)}°, zIndex: ${sprite.zIndex}${prop.mirrored ? ', mirrored' : ''}`, 'map');
      } catch (error) {
        debugLog(`Failed to load prop: ${prop.file || prop.texturePath} - ${error.message}`, 'map');
      }
    });
    
    debugLog(`Map2: Created ${this.props.length} props`, 'map');
  }
    /**
   * Add collision obstacles to the map
   */
  addObstacles() {
    this.obstacles = [];
      // Create map edge obstacles (more restrictive to prevent edge walking)
    const edgeObstacles = [
      // Left edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -100,
          y: -100,
          width: 132, // 100 + 32 buffer
          height: this.mapHeight + 200
        },
        debug: false
      }),
      // Right edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: this.mapWidth - 32,
          y: -100,
          width: 132, // 100 + 32 buffer
          height: this.mapHeight + 200
        },
        debug: false
      }),
      // Top edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -100,
          y: -100,
          width: this.mapWidth + 200,
          height: 132 // 100 + 32 buffer
        },
        debug: false
      }),
      // Bottom edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -100,
          y: this.mapHeight - 32,
          width: this.mapWidth + 200,
          height: 132 // 100 + 32 buffer
        },
        debug: false
      })
    ];
    
    // Add all obstacles
    this.obstacles.push(...edgeObstacles);
    
    // Add collision for large props
    this.props.forEach(propSprite => {
      // Only consider larger props as obstacles
      if (propSprite.width > 100) {
        const propObstacle = new MapObstacle({
          type: 'circle',
          shape: {
            x: propSprite.position.x,
            y: propSprite.position.y,
            radius: propSprite.width * 0.3 // Smaller than visual size for better gameplay
          },
          debug: false
        });
        this.obstacles.push(propObstacle);
      }
    });
    
    // Add debug visuals if needed
    if (this.app.debug) {
      this.obstacles.forEach(obstacle => {
        obstacle.debug = true;
        obstacle.updateDebugGraphics();
        obstacle.addDebugToContainer(this.layers.foreground);
      });
    }
  }
  
  /**
   * Check if a position collides with any obstacle
   * @param {number} x - X position to check
   * @param {number} y - Y position to check
   * @param {number} radius - Collision radius
   * @returns {boolean} True if position collides with an obstacle
   */
  checkCollision(x, y, radius = 32) {
    for (const obstacle of this.obstacles) {
      if (obstacle.checkCollision(x, y, radius)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Update method for any per-frame logic
   * @param {number} delta - Time since last update
   */
  update(delta) {
    // Map-specific update logic can go here
    // Portal updates are handled by MapManager's updatePortals method
  }
  
  /**
   * Robust teleport to portal method for debug menu
   * Gets the correct world coordinates for the portal and teleports character there
   */
  teleportToPortal() {
    console.log('🚀 Map2: Teleporting to portal...');
    
    if (!this.portalManager || this.portalManager.portals.length === 0) {
      console.log('❌ No portals found in Map2');
      return false;
    }
    
    const portal = this.portalManager.portals[0];
    
    // Get character reference
    let character = null;
    if (window.game && window.game.characterManager && window.game.characterManager.character) {
      character = window.game.characterManager.character;
    }
    
    if (!character) {
      console.log('❌ No character found for teleportation');
      return false;
    }
    
    // Use the portal's actual sprite position (which includes proper positioning)
    let portalX, portalY;
    if (portal.sprite) {
      portalX = portal.sprite.x;
      portalY = portal.sprite.y;
    } else {
      // Fallback: calculate tile center if sprite not available
      portalX = (portal.tileX * this.tileWidth) + (this.tileWidth / 2);
      portalY = (portal.tileY * this.tileHeight) + (this.tileHeight / 2);
    }
    
    console.log(`Map2: Portal coordinates: (${portalX}, ${portalY})`);
    console.log(`Map2: Portal tile: (${portal.tileX}, ${portal.tileY})`);
    
    // Set character position
    character.sprite.x = portalX;
    character.sprite.y = portalY;
    
    // Update camera if available
    if (window.game && window.game.cameras && window.game.cameras.main) {
      window.game.cameras.main.centerOn(portalX, portalY);
    }
    
    console.log('✅ Map2: Teleported to portal successfully! You should now see only C props.');
    return true;
  }
    /**
   * Clean up resources when map is unloaded
   */
  destroy() {
    // Clean up props
    this.props.forEach(prop => {
      if (prop && prop.parent) {
        prop.parent.removeChild(prop);
        prop.destroy();
      }
    });
    this.props = [];
    
    // Clean up background tiles
    this.backgroundTiles.forEach(tile => {
      if (tile && tile.parent) {
        tile.parent.removeChild(tile);
        tile.destroy();
      }
    });
    this.backgroundTiles = [];
    
    // Clean up obstacles
    this.obstacles.forEach(obstacle => obstacle.destroy());
    this.obstacles = [];
    
    // Clean up portal manager
    if (this.portalManager) {
      this.portalManager.destroy();
    }
  }
}