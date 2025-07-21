import * as PIXI from 'pixi.js';
import MapObstacle from './MapObstacle';
import MapXPropGenerator from './MapXPropGenerator';
import Boss from '../entities/Boss';
import { debugLog } from '../../development/utils/Debug';

export default class MapX {
  constructor(app, mapSize, layers, gameSeed = null) {
    this.app = app;
    this.mapId = 'mapareax';
    this.layers = layers; // MapManager's layers
    this.gameSeed = gameSeed; // Store game seed for prop generation
    this.props = [];
    this.obstacles = [];

    // Boss fight system
    this.boss = null;
    this.bossSpawned = false;
    this.bossTimer = 0;
    this.bossFightDuration = 3 * 60 * 1000; // 3 minutes in milliseconds
    this.portalEnabled = false;
    this.onPortalEnabled = null; // Callback for when portal should be enabled
    
    // Portal location (same as in PortalManager)
    this.portalPosition = { x: 200, y: 200 };
    
    // Boss initial spawn location (top-left corner as requested)
    this.bossSpawnPosition = { x: 300, y: 300 }; // Top-left area of MapX
    
    // MapX is a cave map with specific dimensions (half size)
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
    debugLog('Loading props for MapX (cave with 1B, 2B, 3B props - 3x variety, size, and quantity)', 'map');
    
    // Add basic obstacles (map edges)
    this.addObstacles();
    
    // Generate props using MapXPropGenerator with game seed
    const propGenerator = new MapXPropGenerator(this.mapWidth, this.gameSeed);
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
    
    // Initialize boss immediately so BossUI appears right away
    this.initializeBoss();
    
    // Spawn boss at portal location (activates boss fight)
    this.spawnBoss();
    
    return this.props;
  }

  /**
   * Spawn boss at portal location
   */
  spawnBoss() {
    // Create boss if it doesn't exist
    if (!this.boss) {
      this.createBoss();
    }
    
    if (this.bossSpawned) {
      debugLog('Boss already spawned, skipping spawn', 'boss');
      return;
    }

    // Mark boss as spawned (for gameplay logic)
    this.bossSpawned = true;
    this.bossTimer = 0;
    
    debugLog(`Boss spawned (activated) - boss fight begins!`, 'boss');
  }

  /**
   * Enable portal after 3 minutes (boss stays active)
   */
  enablePortal() {
    if (this.portalEnabled) {
      return; // Already enabled
    }

    try {
      // Enable portal without removing boss
      this.portalEnabled = true;
      if (this.onPortalEnabled) {
        this.onPortalEnabled();
      }
      
      debugLog('Portal enabled after 3 minutes (boss remains active)', 'boss');
      
    } catch (error) {
      debugLog(`Error enabling portal: ${error.message}`, 'boss');
    }
  }

  /**
   * Set callback for when portal should be enabled
   */
  setPortalEnabledCallback(callback) {
    this.onPortalEnabled = callback;
  }

  /**
   * Check if portal should be available
   */
  isPortalAvailable() {
    return this.portalEnabled;
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
    // Update boss if spawned
    if (this.boss && this.bossSpawned) {
      // Update boss timer
      this.bossTimer += this.app.ticker.deltaMS;
      
      // Update boss
      this.boss.update(delta);
      
      // Check if 3 minutes have passed to enable portal (boss stays active)
      if (this.bossTimer >= this.bossFightDuration && !this.portalEnabled) {
        debugLog('3 minutes elapsed, enabling portal (boss remains active)', 'boss');
        this.enablePortal();
      }
    }
  }
  
  /**
   * Clean up resources when the map is unloaded
   */
  destroy() {
    // Clean up boss (if still active)
    if (this.boss) {
      try {
        this.boss.destroy();
        if (this.boss.container && this.boss.container.parent) {
          this.boss.container.parent.removeChild(this.boss.container);
        }
        this.boss = null;
        debugLog('MapX: Boss cleaned up during map destruction', 'map');
      } catch (error) {
        debugLog(`MapX: Error cleaning up boss: ${error.message}`, 'map');
      }
    }
    
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
    
    debugLog('MapX: Cleaned up resources (boss remains active until map change)', 'map');
  }

  /**
   * Get boss information for UI display
   */
  getBossInfo() {
    const hasBoss = !!this.boss;
    const isSpawned = this.bossSpawned;
    const result = {
      isVisible: hasBoss, // Always show UI when boss exists, regardless of spawn status
      currentHealth: hasBoss ? (this.boss.currentHP || 0) : 0,
      maxHealth: hasBoss ? (this.boss.maxHP || 40) : 40
    };
    
    debugLog(`getBossInfo: hasBoss=${hasBoss}, isSpawned=${isSpawned}, visible=${result.isVisible}, health=${result.currentHealth}/${result.maxHealth}`, 'boss');
    
    if (!hasBoss) {
      return {
        isVisible: false,
        currentHealth: 0,
        maxHealth: 40,
        position: {
          x: this.bossSpawnPosition.x,
          y: this.bossSpawnPosition.y
        }
      };
    }
    
    return {
      isVisible: true, // Always show UI when boss exists
      currentHealth: this.boss.currentHP || 0,
      maxHealth: this.boss.maxHP || 40,
      position: {
        x: this.boss.position.x,
        y: this.boss.position.y
      }
    };
  }

  /**
   * Initialize boss immediately when player enters Map X
   * This ensures BossUI appears right away
   */
  initializeBoss() {
    if (!this.boss) {
      this.createBoss();
    }
  }

  /**
   * Create boss entity (separate from spawning)
   */
  createBoss() {
    if (this.boss) {
      debugLog('Boss already exists, skipping creation', 'boss');
      return;
    }

    try {
      // Create boss at center of map for better visibility
      this.boss = new Boss(
        this.app, 
        this.bossSpawnPosition.x, 
        this.bossSpawnPosition.y, 
        this.layers.character
      );
      
      // Boss already starts with 40 HP from constructor, no need to override
      debugLog(`Boss created at top-left location (${this.bossSpawnPosition.x}, ${this.bossSpawnPosition.y}) with ${this.boss.maxHP} HP`, 'boss');
      debugLog(`Boss entity created: ${!!this.boss}`, 'boss');
      
    } catch (error) {
      debugLog(`Error creating boss: ${error.message}`, 'boss');
    }
  }
}