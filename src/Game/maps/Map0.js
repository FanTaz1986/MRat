import * as PIXI from 'pixi.js';
import MapObstacle from './MapObstacle';
import Map0PropGenerator from './Map0PropGenerator';
import PortalManager from '../engine/Portal/PortalManager';
import { debugLog } from '../../development/utils/Debug';

export default class Map0 {
  constructor(app, mapSize, layers, character = null, gameSeed = null) {
    this.app = app;
    this.mapId = 'maparea0';
    this.mapSize = mapSize; // Keep the original mapSize parameter
    this.character = character;
    this.layers = layers; // MapManager's layers
    this.props = [];
    this.obstacles = [];
    
    // Map0 is a single zone map (4200x2970), but we keep mapSize for compatibility
    this.mapWidth = 4200;
    this.mapHeight = 2970;
    
    // For portal positioning, we can still use a conceptual 16x16 grid
    this.gridSize = 16;
    this.tileWidth = this.mapWidth / this.gridSize;  // 262.5px
    this.tileHeight = this.mapHeight / this.gridSize; // 185.625px
    
    // Create prop generator with original mapSize and game seed for consistent generation
    this.propGenerator = new Map0PropGenerator(mapSize, gameSeed);
    
    // Special boundary for Map0 - only allow beach area
    this.mapBounds = {
      minX: 96,
      minY: this.mapSize * 0.75 + 96, // Use mapSize for compatibility
      maxX: this.mapSize - 96,
      maxY: this.mapSize - 96
    };    // Initialize portal manager with original mapSize (keep compatibility)
    this.portalManager = new PortalManager(app, 'maparea0', mapSize, mapSize); // Map0 is square
  }

  /**
   * Get custom bounds for Map0 (beach area)
   */
  getBounds() {
    return this.mapBounds;
  }
  
  /**
   * Load props for Map0
   */
  loadProps() {
    debugLog('Loading props for Map0', 'map');
    
    // Generate props using the dedicated prop generator
    const props = this.propGenerator.getAllProps();
    debugLog(`Generated ${props.length} props for Map0`, 'map');
    
    // Create prop sprites
    this.createPropSprites(props);
    
    // Add obstacles after loading props
    this.addObstacles();
    
    // Add portals to character layer for proper z-ordering
    this.portalManager.addToScene(this.layers.character);
    debugLog('Map0 portals added to MapManager character layer', 'map');
    
    return props;
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
    
    debugLog(`Creating ${props.length} props for Map0`, 'map');
      // Create new prop sprites with high-quality settings
    props.forEach(prop => {
      try {
        const texturePath = process.env.PUBLIC_URL + "/0MAP/Props/" + prop.file;
        
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
        sprite.rotation = (prop.rotation || 0) * Math.PI / 180;
        sprite.anchor.set(0.5);
        sprite.zIndex = prop.zIndex || 1;
        sprite.roundPixels = false; // Enable sub-pixel positioning
        
        // Handle mirroring (horizontal flip)
        if (prop.mirrored) {
          sprite.scale.x = -Math.abs(sprite.scale.x);
        }
        
        // Store texture filename for debugging
        sprite._textureFileName = prop.file;
        sprite._originalTexturePath = texturePath;
        
        // Add to MapManager's props layer
        this.layers.props.addChild(sprite);
        this.props.push(sprite);
        
        debugLog(`Loaded prop: ${prop.file}, scale: ${prop.scale.toFixed(2)}, rotation: ${prop.rotation.toFixed(0)}°, zIndex: ${sprite.zIndex}${prop.mirrored ? ', mirrored' : ''}`, 'map');
      } catch (error) {
        debugLog(`Failed to load prop: ${prop.file} - ${error.message}`, 'map');
      }
    });
    
    debugLog(`Map0: Created ${this.props.length} props`, 'map');
  }
  
  /**
   * Add collision obstacles to the map
   */
  addObstacles() {
    this.obstacles = [];
    
    // Create water boundary obstacles (3/4 of map is water)
    const waterObstacle = new MapObstacle({
      type: 'rect',
      shape: {
        x: 0,
        y: 0,
        width: this.mapSize,
        height: this.mapSize * 0.75
      },
      debug: false
    });
    
    // Create map edge obstacles
    const edgeObstacles = [
      // Left edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: -50,
          width: 100,
          height: this.mapSize + 100
        },
        debug: false
      }),
      // Right edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: this.mapSize - 50,
          y: -50,
          width: 100,
          height: this.mapSize + 100
        },
        debug: false
      }),
      // Bottom edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: this.mapSize - 50,
          width: this.mapSize + 100,
          height: 100
        },
        debug: false
      })
    ];
    
    // Add all obstacles
    this.obstacles.push(waterObstacle);
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
    console.log('🚀 Map0: Teleporting to portal...');
    
    if (!this.portalManager || this.portalManager.portals.length === 0) {
      console.log('❌ No portals found in Map0');
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
    
    // ALWAYS calculate correct position based on tile coordinates
    // Don't trust portal.sprite position if it's (0,0)
    let portalX, portalY;
    
    if (portal.sprite && portal.sprite.x !== 0 && portal.sprite.y !== 0) {
      // Use sprite position only if it's not at origin
      portalX = portal.sprite.x;
      portalY = portal.sprite.y;
      console.log('Using portal sprite position (non-zero)');
    } else {
      // Calculate correct position from tile coordinates
      portalX = (portal.tileX * (this.mapSize / 16)) + ((this.mapSize / 16) / 2);
      portalY = (portal.tileY * (this.mapSize / 16)) + ((this.mapSize / 16) / 2);
      console.log('Calculating portal position from tile coordinates');
    }
    
    console.log(`Map0: Portal tile: (${portal.tileX}, ${portal.tileY})`);
    console.log(`Map0: Portal calculated coordinates: (${portalX}, ${portalY})`);
    console.log(`Map0: Map dimensions: ${this.mapSize}x${this.mapSize}`);
    console.log(`Map0: Tile size: ${this.mapSize / 16}x${this.mapSize / 16}`);
    
    // Set character position
    character.sprite.x = portalX;
    character.sprite.y = portalY;
    
    // Update camera if available
    if (window.game && window.game.cameras && window.game.cameras.main) {
      window.game.cameras.main.centerOn(portalX, portalY);
    }
    
    console.log('✅ Map0: Teleported to portal successfully! You should now see only C props.');
    return true;
  }
  
  /**
   * Initialize enemies for Map0
   * Map0 (beach area) doesn't have enemies, so this is a no-op for compatibility
   */
  async initializeEnemies() {
    debugLog('Map0: No enemies to initialize (beach area)', 'map');
    return Promise.resolve();
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
    
    // Clean up obstacles
    this.obstacles.forEach(obstacle => obstacle.destroy());
    this.obstacles = [];
    
    // Clean up portal manager
    if (this.portalManager) {
      this.portalManager.destroy();
    }
  }
}