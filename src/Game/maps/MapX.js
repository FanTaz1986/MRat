import * as PIXI from 'pixi.js';
import MapObstacle from './MapObstacle';
import MapXPropGenerator from './MapXPropGenerator';
import { debugLog } from '../../development/utils/Debug';

export default class MapX {
  constructor(app, mapSize, layers) {
    this.app = app;
    this.mapId = 'mapareax';
    this.layers = layers; // MapManager's layers
    this.props = [];
    this.obstacles = [];      // MapX is a cave map with specific dimensions (half size)
    this.mapWidth = 2048;   // Cave width (half of 4096)
    this.mapHeight = 1556;  // Cave height (half of 3112)
    
    // Create simple background
    this.createBackground();
    
    // Map boundaries for character movement (with small buffer)
    this.mapBounds = {
      minX: 32,
      minY: 32,
      maxX: this.mapWidth - 32,
      maxY: this.mapHeight - 32
    };
    
    debugLog(`MapX initialized: ${this.mapWidth}x${this.mapHeight} (cave dimensions - half size)`, 'map');
  }  
  /**
   * Create simple background for MapX
   */
  createBackground() {
    // Create high-quality background texture
    const texture = PIXI.Texture.from(process.env.PUBLIC_URL + '/XMAP/play_area/cave.png');
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
    texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    
    // Create simple background sprite
    const background = new PIXI.Sprite(texture);
    background.width = this.mapWidth;
    background.height = this.mapHeight;
    background.x = 0;
    background.y = 0;
    background.zIndex = 0;
    background.roundPixels = false;
    
    // Add to background layer
    this.layers.background.addChild(background);
    
    debugLog(`MapX: Created high-quality background ${this.mapWidth}x${this.mapHeight} (cave - half size)`, 'map');
  }
  
  /**
   * Get bounds for MapX
   */
  getBounds() {
    return this.mapBounds;
  }    /**
   * Load props for MapX (simple implementation)
   */
  loadProps() {
    debugLog('Loading props for MapX (cave with 1A.png props)', 'map');
    
    // Add basic obstacles (map edges)
    this.addObstacles();
    
    // Generate props using MapXPropGenerator
    const propGenerator = new MapXPropGenerator(this.mapWidth);
    const propData = propGenerator.getAllProps();
    
    debugLog(`MapX: Generated ${propData.length} props`, 'map');
    
    // Create PIXI sprites for each prop
    propData.forEach((propConfig, index) => {
      try {
        const texturePath = process.env.PUBLIC_URL + '/XMAP/Props/' + propConfig.file;
        
        // Create texture with high-quality settings
        const texture = PIXI.Texture.from(texturePath);
        texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
        texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
        texture.baseTexture.resolution = Math.max(window.devicePixelRatio || 1, 2);
        
        const propSprite = new PIXI.Sprite(texture);
        
        // Set position
        propSprite.x = propConfig.x;
        propSprite.y = propConfig.y;
        
        // Set scale
        propSprite.scale.set(propConfig.scale);
        propSprite.roundPixels = false; // Enable sub-pixel positioning
          // Set rotation (convert degrees to radians)
        propSprite.rotation = (propConfig.rotation * Math.PI) / 180;
        
        // Set mirroring (horizontal flip) if specified
        if (propConfig.mirrored) {
          propSprite.scale.x = -Math.abs(propSprite.scale.x); // Flip horizontally
        }
        
        // Set z-index
        propSprite.zIndex = propConfig.zIndex || 2;
        
        // Set anchor to center for proper rotation
        propSprite.anchor.set(0.5);
        
        // Add to props layer
        this.layers.props.addChild(propSprite);
        this.props.push(propSprite);
        
        debugLog(`MapX: Created prop ${index + 1}/${propData.length} at (${propConfig.x}, ${propConfig.y}) scale:${propConfig.scale} rotation:${propConfig.rotation}° mirrored:${propConfig.mirrored || false}`, 'map');
        
      } catch (error) {
        debugLog(`MapX: Error creating prop ${index + 1}: ${error.message}`, 'map');
      }
    });
    
    debugLog(`MapX: Successfully loaded ${this.props.length} props`, 'map');
    
    return this.props;
  }
  
  /**
   * Add simple collision obstacles to the map
   */
  addObstacles() {
    this.obstacles = [];
    
    // Create map edge obstacles
    const edgeObstacles = [
      // Left edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: -50,
          width: 82, // 50 + 32 buffer
          height: this.mapHeight + 100
        },
        debug: false
      }),
      // Right edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: this.mapWidth - 32,
          y: -50,
          width: 82,
          height: this.mapHeight + 100
        },
        debug: false
      }),
      // Top edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: -50,
          width: this.mapWidth + 100,
          height: 82
        },
        debug: false
      }),
      // Bottom edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: this.mapHeight - 32,
          width: this.mapWidth + 100,
          height: 82
        },
        debug: false
      })
    ];
    
    this.obstacles.push(...edgeObstacles);
    
    debugLog(`MapX: Created ${this.obstacles.length} edge obstacles`, 'map');
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
    // Simple update - no complex effects
  }
  
  /**
   * Clean up resources when the map is unloaded
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
    
    debugLog('MapX: Cleaned up resources', 'map');
  }
}