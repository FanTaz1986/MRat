import * as PIXI from 'pixi.js';
import MapBase from './MapBase';
import MapObstacle from './MapObstacle';

/**
 * GameplayMap - Base class for gameplay maps (Map1, Map2, etc.)
 * This class provides common functionality for grid-based maps with props and portals
 */
export default class GameplayMap extends MapBase {
  /**
   * Create a new gameplay map
   * @param {PIXI.Application} app - The PIXI application
   * @param {string} mapId - The map ID
   * @param {number} mapSize - The size of a single map tile
   * @param {PIXI.Container} mapContainer - The container for this map
   * @param {object} config - Map configuration
   * @param {number} config.gridSize - The grid size (number of tiles per row/column)
   * @param {Array<string>} config.backgroundImages - The background image paths
   * @param {object} config.propGenerator - The prop generator instance for this map
   * @param {boolean} config.useDualBackground - Whether to use dual background system (center/outer areas)
   * @param {object} config.specialEffects - Special visual effects for this map
   */
  constructor(app, mapId, mapSize, mapContainer, config) {
    super(app, mapId, mapSize);
    
    // Store configuration
    this.config = config;
    
    // Grid settings
    this.gridSize = config.gridSize || 16;
    this.tileSize = mapSize;
    this.totalMapSize = mapSize * this.gridSize;
    
    // Initialize map
    this.initialize(mapContainer);
    
    // Set up prop generator
    this.propGenerator = config.propGenerator;
    
    // Map boundaries for character movement
    this.mapBounds = {
      minX: 96,
      minY: 96,
      maxX: this.totalMapSize - 96,
      maxY: this.totalMapSize - 96
    };
    
    // Current visible tile area - center of the grid
    this.currentCenterTile = { 
      x: Math.floor(this.gridSize / 2), 
      y: Math.floor(this.gridSize / 2) 
    };
    
    // Initialize backgrounds based on config
    if (config.useDualBackground) {
      this.initDualBackgroundSystem(config.backgroundImages);
    } else {
      this.initBackground(config.backgroundImages[0]);
    }
    
    // Create special effects if specified
    if (config.specialEffects) {
      if (config.specialEffects.distance) {
        this.createDistanceOverlay();
      }
      if (config.specialEffects.fog) {
        this.createFogEffect();
      }
    }
    
    // Generate portal position
    this.portalPosition = this.generatePortalPosition();
  }
  
  /**
   * Initialize a dual background system (center area uses a different texture than outer areas)
   * @param {Array<string>} backgroundImages - Array of background image paths [centerImage, outerImage]
   */
  initDualBackgroundSystem(backgroundImages) {
    // Create background container for the grid
    this.bgContainer = new PIXI.Container();
    this.layers.background.addChild(this.bgContainer);
    
    // Store image paths
    this.mapAImage = backgroundImages[0]; // Center image
    this.mapBImage = backgroundImages[1] || backgroundImages[0]; // Outer image, fallback to center if not provided
    
    // We'll lazily load the backgrounds as the character moves around
    this.loadedBackgrounds = {};
    
    // Load the central tiles immediately
    this.preloadCentralTiles();
  }
  
  /**
   * Preload the central tiles of the map
   */
  preloadCentralTiles() {
    const centerTileX = Math.floor(this.gridSize / 2);
    const centerTileY = Math.floor(this.gridSize / 2);
    
    // Load 2x2 central area
    for (let y = centerTileY - 1; y <= centerTileY + 1; y++) {
      for (let x = centerTileX - 1; x <= centerTileX + 1; x++) {
        const tileKey = `${x}_${y}`;
        
        // Skip if outside grid bounds
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
        
        // Skip if already loaded
        if (this.loadedBackgrounds && this.loadedBackgrounds[tileKey]) continue;
        
        // Create background sprite for this tile
        const bgSprite = PIXI.Sprite.from(this.mapAImage);
        bgSprite.width = this.tileSize;
        bgSprite.height = this.tileSize;
        bgSprite.position.set(x * this.tileSize, y * this.tileSize);
        this.bgContainer.addChild(bgSprite);
        
        // Mark as loaded
        if (!this.loadedBackgrounds) this.loadedBackgrounds = {};
        this.loadedBackgrounds[tileKey] = bgSprite;
      }
    }
  }
  
  /**
   * Create a distance-based visual effect
   */
  createDistanceOverlay() {
    this.distanceOverlay = new PIXI.Graphics();
    this.layers.foreground.addChild(this.distanceOverlay);
    
    // Initial state (will be updated in update method)
    this.updateDistanceOverlay({ 
      x: this.tileSize * Math.floor(this.gridSize / 2), 
      y: this.tileSize * Math.floor(this.gridSize / 2) 
    });
  }
  
  /**
   * Create a fog effect for the map
   */
  createFogEffect() {
    // Create fog container
    this.fogContainer = new PIXI.Container();
    this.fogContainer.alpha = 0.4;
    this.layers.foreground.addChild(this.fogContainer);
    
    // Create fog texture
    const fogTexture = PIXI.Texture.from(
      process.env.PUBLIC_URL + '/2MAP/Effects/fog.png'
    );
    
    // Create multiple fog layers with different speeds
    this.fogLayers = [];
    
    for (let i = 0; i < 3; i++) {
      const fogSprite = new PIXI.TilingSprite(
        fogTexture,
        this.totalMapSize + 512,
        this.totalMapSize + 512
      );
      
      fogSprite.position.set(-256, -256);
      fogSprite.alpha = 0.3 - i * 0.08;
      fogSprite.tileScale.set(0.5 + i * 0.25);
      fogSprite.blendMode = PIXI.BLEND_MODES.SCREEN;
      
      // Store offset for animation
      fogSprite._offset = { x: 0, y: 0 };
      fogSprite._speed = { 
        x: 0.2 + i * 0.1,
        y: 0.1 + i * 0.05
      };
      
      this.fogLayers.push(fogSprite);
      this.fogContainer.addChild(fogSprite);
    }
  }
  
  /**
   * Generate a deterministic but pseudo-random portal position for this map
   * @returns {Object} Portal position {x, y}
   */
  generatePortalPosition() {
    // Create a deterministic but "random" portal position based on map ID
    const seed = this.mapId.charCodeAt(0) + this.mapId.charCodeAt(this.mapId.length - 1);
    let randomSeed = seed;
    
    const seededRandom = () => {
      randomSeed = (randomSeed * 9301 + 49297) % 233280;
      return randomSeed / 233280;
    };
    
    // Generate position in one of the outer tiles (not center)
    // Distance from center is 6 tiles as requested
    const angle = seededRandom() * 2 * Math.PI;
    const radius = 6;  // 6 tiles away from center
    
    const centerTileX = Math.floor(this.gridSize / 2);
    const centerTileY = Math.floor(this.gridSize / 2);
    
    // Polar coordinates to determine tile position
    const tileX = Math.floor(centerTileX + Math.cos(angle) * radius);
    const tileY = Math.floor(centerTileY + Math.sin(angle) * radius);
    
    // Ensure tile coordinates are within grid boundaries
    const clampedTileX = Math.max(0, Math.min(this.gridSize - 1, tileX));
    const clampedTileY = Math.max(0, Math.min(this.gridSize - 1, tileY));
    
    // Position within the tile
    const offsetX = Math.floor(seededRandom() * (this.tileSize - 200)) + 100;
    const offsetY = Math.floor(seededRandom() * (this.tileSize - 200)) + 100;
    
    return {
      x: clampedTileX * this.tileSize + offsetX,
      y: clampedTileY * this.tileSize + offsetY
    };
  }
  
  /**
   * Get the portal position
   * @returns {Object} Portal position {x, y}
   */
  getPortalPosition() {
    return this.portalPosition;
  }
  
  /**
   * Get map boundaries
   * @returns {Object} Map boundaries
   */
  getBounds() {
    return this.mapBounds;
  }
  
  /**
   * Get tile coordinates from world position
   * @param {number} x - World X coordinate
   * @param {number} y - World Y coordinate
   * @returns {Object} Tile coordinates {x, y}
   */
  getTileFromPosition(x, y) {
    return {
      x: Math.floor(x / this.tileSize),
      y: Math.floor(y / this.tileSize)
    };
  }
  
  /**
   * Check if a position is in the center area
   * @param {Object} position - World position {x, y}
   * @returns {boolean} True if in center area
   */
  isInCenterArea(position) {
    const centerX = this.totalMapSize / 2;
    const centerY = this.totalMapSize / 2;
    const dx = Math.abs(position.x - centerX) / this.tileSize;
    const dy = Math.abs(position.y - centerY) / this.tileSize;
    return Math.max(dx, dy) <= 2;
  }
  
  /**
   * Update the distance overlay effect based on character position
   * @param {Object} charPosition - Character position {x, y}
   */
  updateDistanceOverlay(charPosition) {
    if (!this.distanceOverlay) return;
    
    const centerX = this.totalMapSize / 2;
    const centerY = this.totalMapSize / 2;
    
    // Calculate distance from center (normalized to tiles)
    const dx = Math.abs(charPosition.x - centerX) / this.tileSize;
    const dy = Math.abs(charPosition.y - centerY) / this.tileSize;
    const distance = Math.max(dx, dy);
    
    // No overlay for distance <= 2
    if (distance <= 2) {
      this.distanceOverlay.clear();
      return;
    }
    
    // Create purple overlay for distance > 2
    this.distanceOverlay.clear();
    this.distanceOverlay.beginFill(0x8000FF, 0.15);
    this.distanceOverlay.drawRect(0, 0, this.app.screen.width, this.app.screen.height);
    this.distanceOverlay.endFill();
  }
  
  /**
   * Load background tiles around a specific position
   * @param {Object} position - Position to load around {x, y}
   */
  loadBackgroundAroundPosition(position) {
    if (!this.config.useDualBackground) return;
    
    // Get current tile
    const currentTile = this.getTileFromPosition(position.x, position.y);
    
    // If center tile hasn't changed, skip
    if (currentTile.x === this.currentCenterTile.x && 
        currentTile.y === this.currentCenterTile.y) {
      return;
    }
    
    // Update center tile
    this.currentCenterTile = currentTile;
    
    // Load visible tiles (current + radius)
    const visibleRadius = 2;
    
    for (let y = currentTile.y - visibleRadius; y <= currentTile.y + visibleRadius; y++) {
      for (let x = currentTile.x - visibleRadius; x <= currentTile.x + visibleRadius; x++) {
        // Skip if outside grid bounds
        if (x < 0 || x >= this.gridSize || y < 0 || y >= this.gridSize) continue;
        
        const tileKey = `${x}_${y}`;
        
        // Skip if already loaded
        if (this.loadedBackgrounds[tileKey]) continue;
        
        // Determine which background image to use based on distance from center
        const centerTileX = Math.floor(this.gridSize / 2);
        const centerTileY = Math.floor(this.gridSize / 2);
        const distFromCenter = Math.max(
          Math.abs(x - centerTileX),
          Math.abs(y - centerTileY)
        );
        
        const backgroundPath = distFromCenter <= 2 ? this.mapAImage : this.mapBImage;
        
        // Create background sprite for this tile
        const bgSprite = PIXI.Sprite.from(backgroundPath);
        bgSprite.width = this.tileSize;
        bgSprite.height = this.tileSize;
        bgSprite.position.set(x * this.tileSize, y * this.tileSize);
        this.bgContainer.addChild(bgSprite);
        
        // Mark as loaded
        this.loadedBackgrounds[tileKey] = bgSprite;
      }
    }
    
    // Unload tiles that are too far away
    const maxDistance = visibleRadius + 1;
    for (const tileKey in this.loadedBackgrounds) {
      const [x, y] = tileKey.split('_').map(Number);
      
      if (Math.abs(x - currentTile.x) > maxDistance || 
          Math.abs(y - currentTile.y) > maxDistance) {
        // Unload this tile's background
        const bgSprite = this.loadedBackgrounds[tileKey];
        if (bgSprite && bgSprite.parent) {
          bgSprite.parent.removeChild(bgSprite);
          bgSprite.destroy();
        }
        delete this.loadedBackgrounds[tileKey];
      }
    }
  }
  
  /**
   * Load props for the map
   */
  loadProps() {
    // Initially load props for the central area
    this.loadPropsAroundPosition({ 
      x: this.totalMapSize / 2, 
      y: this.totalMapSize / 2 
    });
    
    // Add obstacle after loading props
    this.addObstacles();
    
    // Also load portal-specific props
    this.loadPortalAreaProps();
    
    return this.props;
  }
  
  /**
   * Load props around a specific position
   * @param {Object} position - Position to load props around
   */
  loadPropsAroundPosition(position) {
    // Get tile coordinates for the position
    const tile = this.getTileFromPosition(position.x, position.y);
    
    // Generate props for the visible area
    const props = this.propGenerator.getVisibleAreaProps(tile.x, tile.y);
    
    // Create prop sprites
    this.createPropSprites(props);
  }
  
  /**
   * Load props specifically for the portal area
   */
  loadPortalAreaProps() {
    // Get and create portal area props
    const portalProps = this.propGenerator.getPortalAreaProps(
      this.portalPosition.x,
      this.portalPosition.y
    );
    
    // Create prop sprites
    this.createPropSprites(portalProps);
  }
  
  /**
   * Create prop sprites from prop data
   * @param {Array} props - Array of prop objects
   */
  createPropSprites(props) {
    if (!props || !Array.isArray(props)) return;
    
    // Create new prop sprites
    props.forEach(prop => {
      try {
        // Get texture path from prop data
        const texturePath = process.env.PUBLIC_URL + prop.texturePath;
        const sprite = PIXI.Sprite.from(texturePath);
        const size = 128 * (prop.scale || 1);
        
        sprite.width = size;
        sprite.height = size;
        sprite.position.set(prop.x, prop.y);
        sprite.rotation = (prop.rotation || 0) * Math.PI / 180;
        sprite.anchor.set(0.5);
        sprite.zIndex = prop.zIndex || 1;
        
        this.layers.props.addChild(sprite);
        this.props.push(sprite);
      } catch (error) {
        console.warn(`Failed to load prop: ${prop.texturePath || '(unknown)'}`, error);
      }
    });
  }
  
  /**
   * Add collision obstacles for the map
   */
  addObstacles() {
    // Create edge obstacles
    const edgeObstacles = [
      // Left edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: -50,
          width: 100,
          height: this.totalMapSize + 100
        },
        debug: false
      }),
      // Right edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: this.totalMapSize - 50,
          y: -50,
          width: 100,
          height: this.totalMapSize + 100
        },
        debug: false
      }),
      // Top edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: -50,
          width: this.totalMapSize + 100,
          height: 100
        },
        debug: false
      }),
      // Bottom edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: this.totalMapSize - 50,
          width: this.totalMapSize + 100,
          height: 100
        },
        debug: false
      })
    ];
    
    // Add all obstacles
    this.obstacles.push(...edgeObstacles);
    
    // Add collision for large props (trees, etc.)
    this.props.forEach(propSprite => {
      // Only consider larger props as obstacles
      if (propSprite.width > 100 && 
          !propSprite.name?.toLowerCase().includes('grass')) {
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
   * Update fog effect animation
   * @param {number} delta - Time since last update
   */
  updateFogEffect(delta) {
    if (!this.fogLayers) return;
    
    // Animate each fog layer
    this.fogLayers.forEach(fogLayer => {
      // Update offset
      fogLayer._offset.x += fogLayer._speed.x * delta;
      fogLayer._offset.y += fogLayer._speed.y * delta;
      
      // Apply offset to sprite
      fogLayer.tilePosition.x = fogLayer._offset.x;
      fogLayer.tilePosition.y = fogLayer._offset.y;
    });
  }
  
  /**
   * Update method called each frame
   * @param {number} delta - Time since last update
   */
  update(delta) {
    // Get character position from follow target (if available)
    if (this.app.followTarget && this.app.followTarget.getPosition) {
      const charPosition = this.app.followTarget.getPosition();
      
      // Load/unload backgrounds based on character position
      this.loadBackgroundAroundPosition(charPosition);
      
      // Update distance overlay
      if (this.distanceOverlay) {
        this.updateDistanceOverlay(charPosition);
      }
      
      // Load props if we moved to a new tile
      const currentTile = this.getTileFromPosition(charPosition.x, charPosition.y);
      if (currentTile.x !== this.currentCenterTile.x || 
          currentTile.y !== this.currentCenterTile.y) {
        this.loadPropsAroundPosition(charPosition);
      }
    }
    
    // Update fog effect if present
    if (this.fogLayers) {
      this.updateFogEffect(delta);
    }
  }
  
  /**
   * Clean up resources when the map is unloaded
   */
  destroy() {
    // Clear loaded backgrounds
    if (this.loadedBackgrounds) {
      for (const tileKey in this.loadedBackgrounds) {
        const bgSprite = this.loadedBackgrounds[tileKey];
        if (bgSprite && bgSprite.parent) {
          bgSprite.parent.removeChild(bgSprite);
          bgSprite.destroy();
        }
      }
      this.loadedBackgrounds = {};
    }
    
    // Clear fog layers
    if (this.fogLayers) {
      this.fogLayers.forEach(fogLayer => {
        if (fogLayer.parent) {
          fogLayer.parent.removeChild(fogLayer);
        }
        fogLayer.destroy();
      });
      this.fogLayers = null;
    }
    
    // Call parent class destroy method
    super.destroy();
  }
}
