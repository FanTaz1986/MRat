import * as PIXI from 'pixi.js';
import MapObstacle from './MapObstacle';
import Map1PropGenerator from './Map1PropGenerator';
import { debugLog } from '../../development/utils/Debug';

/**
 * Map1 - A grid-based gameplay map with tile-based background
 */
export default class Map1 {  constructor(app, mapWidth, mapHeight, layers) {
    debugLog(`Map1 constructor called - app: ${!!app}, mapWidth: ${mapWidth}, mapHeight: ${mapHeight}, layers: ${!!layers}`, 'map');
    
    this.app = app;
    this.mapId = 'maparea1';    this.mapWidth = mapWidth;   // 33600 (was 67200)
    this.mapHeight = mapHeight; // 23760 (was 47520)
    this.layers = layers; // MapManager's layers
    this.props = [];
    this.obstacles = [];
    this.backgroundTiles = [];
    
    // Grid settings
    this.gridSize = 16; // 16x16 grid
    this.tileWidth = mapWidth / this.gridSize;   // Each tile is 2100px wide (33600/16) - was 4200px
    this.tileHeight = mapHeight / this.gridSize; // Each tile is 1485px tall (23760/16) - was 2970px
    
    // For backwards compatibility, keep tileSize as the width (some code might still use it)
    this.tileSize = this.tileWidth;
    
    // Create prop generator with correct tile dimensions
    this.propGenerator = new Map1PropGenerator(this.tileWidth, this.tileHeight);
    
    // Map boundaries for character movement
    this.mapBounds = {
      minX: 0,
      minY: 0,
      maxX: mapWidth,
      maxY: mapHeight
    };

    // NOTE: PortalManager is now handled by MapManager, not by Map1
    // This prevents conflicts and ensures consistent portal data
    this.portalManager = null;
    debugLog('Map1 will use portal information passed from MapManager', 'map');
  }
  
  /**
   * Get bounds for Map1
   */
  getBounds() {
    return this.mapBounds;
  }
  /**
   * Create tile-based background
   * Center 4x4 tiles use 1Amap.png, remaining 240 tiles use 1Bmap.png
   * Each tile is stretched to fit the grid exactly (no overlap)
   */
  createTileBackground() {
    debugLog('Creating tile-based background for Map1', 'map');
    
    // Clear existing background tiles
    this.backgroundTiles.forEach(tile => {
      if (tile && tile.parent) {
        tile.parent.removeChild(tile);
        tile.destroy();
      }
    });
    this.backgroundTiles = [];

    // Create 16x16 grid of tiles, each tile stretched to fit grid exactly
    for (let tileX = 0; tileX < this.gridSize; tileX++) {
      for (let tileY = 0; tileY < this.gridSize; tileY++) {
        // Determine which texture to use
        // Center 4x4 area: tiles at positions (6,6) to (9,9) use 1Amap.png
        // All other tiles use 1Bmap.png
        let texturePath;
        if (tileX >= 6 && tileX <= 9 && tileY >= 6 && tileY <= 9) {
          texturePath = process.env.PUBLIC_URL + '/1MAP/play_area/1Amap.png';
          debugLog(`Tile (${tileX},${tileY}) using 1Amap.png stretched to ${this.tileWidth}x${this.tileHeight}`, 'map');
        } else {
          texturePath = process.env.PUBLIC_URL + '/1MAP/play_area/1Bmap.png';
        }

        // Create tile sprite stretched to fit grid exactly
        const tileSprite = PIXI.Sprite.from(texturePath);
        tileSprite.width = this.tileWidth;  // 4200px wide
        tileSprite.height = this.tileHeight; // 2970px tall
        tileSprite.position.set(tileX * this.tileWidth, tileY * this.tileHeight); // Position at tile grid coordinates
        tileSprite.zIndex = 0; // Background tiles should be at the bottom

        // Add to background layer
        this.layers.background.addChild(tileSprite);
        this.backgroundTiles.push(tileSprite);
      }
    }

    debugLog(`Created ${this.backgroundTiles.length} background tiles (each ${this.tileWidth}x${this.tileHeight}px)`, 'map');
    debugLog(`Tile positioning: ${this.tileWidth}x${this.tileHeight}px grid spacing with no overlap`, 'map');
    debugLog(`Grid size: ${this.gridSize}x${this.gridSize}`, 'map');
  }
    /**
   * Load props for Map1
   */
  loadProps() {
    debugLog('Loading props for Map1', 'map');
    debugLog('=== PORTAL TILE ANALYSIS START ===', 'map');
    
    // Portal tiles should have been set by MapManager before calling this method
    // This ensures proper exclusion of normal props from portal tiles
    debugLog('Portal tiles will be used from MapManager (set via propGenerator.setPortalTiles)', 'map');
    debugLog('=== PORTAL TILE ANALYSIS END ===', 'map');
    
    // Create tile-based background first
    this.createTileBackground();
    
    // Generate props using the dedicated prop generator
    debugLog('=== PROP GENERATION START ===', 'map');
    let props = [];
    try {
      props = this.propGenerator.getAllProps();
      if (!props || !Array.isArray(props)) {
        debugLog('ERROR: propGenerator.getAllProps() returned invalid data', 'map');
        props = [];
      }
    } catch (error) {
      debugLog(`ERROR: Failed to generate props: ${error.message}`, 'map');
      props = [];
    }
    debugLog(`Generated ${props.length} props for Map1`, 'map');
    
    // Debug the first few props to see what's being generated
    if (props.length > 0) {
      debugLog('Sample of generated props:', 'map');
      props.slice(0, 5).forEach((prop, index) => {
        debugLog(`  Prop ${index + 1}: ${prop.texturePath} at (${prop.x}, ${prop.y}) - tile approx (${Math.floor(prop.x / this.tileWidth)}, ${Math.floor(prop.y / this.tileHeight)})`, 'map');
      });
    }
    debugLog('=== PROP GENERATION END ===', 'map');
    
    // Create prop sprites
    this.createPropSprites(props);
    
    // Add obstacles after loading props
    this.addObstacles();
    
    // NOTE: Portals are managed by MapManager, not by Map1
    debugLog('Map1 props loaded. Portals are managed by MapManager.', 'map');
    
    return props;
  }

  /**
   * Create prop sprites from prop data
   * @param {Array} props - Array of prop objects
   */
  createPropSprites(props) {
    // Check if props is defined and is an array
    if (!props) {
      debugLog('ERROR: props parameter is undefined in createPropSprites', 'map');
      return;
    }
    
    if (!Array.isArray(props)) {
      debugLog(`ERROR: props parameter is not an array in createPropSprites: ${typeof props}`, 'map');
      return;
    }
    
    // Clear previous props if they exist
    if (this.props && Array.isArray(this.props)) {
      this.props.forEach(propSprite => {
        if (propSprite && propSprite.parent) {
          propSprite.parent.removeChild(propSprite);
        }
      });
    }
    
    this.props = [];
    
    debugLog(`Creating ${props.length} props for Map1`, 'map');

    // Create new prop sprites
    props.forEach(prop => {
      try {
        const texturePath = process.env.PUBLIC_URL + prop.texturePath;
        debugLog(`Loading prop texture: ${texturePath}`, 'map');
        console.log(`Loading prop texture: ${texturePath}`);
        
        // Check if texture exists in PIXI cache first
        if (!PIXI.utils.TextureCache[texturePath]) {
          debugLog(`Texture not in cache, preloading: ${texturePath}`, 'map');
          console.log(`Texture not in cache, preloading: ${texturePath}`);
        }
          const sprite = PIXI.Sprite.from(texturePath);
        const size = 128 * (prop.scale || 1);
        
        sprite.width = size;
        sprite.height = size;
        sprite.position.set(prop.x, prop.y);
        sprite.rotation = prop.rotation || 0; // Use radians directly, not degrees
        sprite.anchor.set(0.5);
        sprite.zIndex = prop.zIndex || 1;

        // Apply visual enhancements for portal areas
        if (prop.alpha !== undefined) {
          sprite.alpha = prop.alpha;
        }
        if (prop.tint !== undefined) {
          sprite.tint = prop.tint;
        }
        // Handle mirroring (horizontal flip)
        if (prop.mirrored) {
          sprite.scale.x = -Math.abs(sprite.scale.x);
        }

        // Store the original texture path for debugging (store the filename)
        sprite._originalTexturePath = prop.texturePath;
        sprite._textureFileName = prop.texturePath.split('/').pop();
        
        // Add debug info immediately
        debugLog(`Storing texture info for sprite: _originalTexturePath=${prop.texturePath}, _textureFileName=${sprite._textureFileName}`, 'map');
        
        // Add error handler for texture loading
        sprite.texture.baseTexture.on('error', (error) => {
          const errorMsg = `TEXTURE LOAD FAILED: ${texturePath} - ${error}`;
          debugLog(errorMsg, 'map');
          console.error(errorMsg, error);
          
          // Remove failed sprite from scene
          if (sprite.parent) {
            sprite.parent.removeChild(sprite);
          }
        });
        
        sprite.texture.baseTexture.on('loaded', () => {
          const successMsg = `TEXTURE LOADED SUCCESSFULLY: ${texturePath}`;
          debugLog(successMsg, 'map');
          console.log(successMsg);
        });
        
        // Add to MapManager's props layer
        this.layers.props.addChild(sprite);
        this.props.push(sprite);
        
      } catch (error) {
        const errorMsg = `Failed to create sprite for: ${prop.texturePath} - ${error.message}`;
        debugLog(errorMsg, 'map');
        console.error(errorMsg, error);
      }
    });
    
    debugLog(`Map1: Created ${this.props.length} props`, 'map');
  }

  /**
   * Add collision obstacles to the map
   */
  addObstacles() {
    this.obstacles = [];

    // Create map edge obstacles using the correct map dimensions
    const edgeObstacles = [
      // Left edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: -50,
          width: 100,
          height: this.mapHeight + 100
        },
        debug: false
      }),
      // Right edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: this.mapWidth - 50,
          y: -50,
          width: 100,
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
          height: 100
        },
        debug: false
      }),
      // Bottom edge
      new MapObstacle({
        type: 'rect',
        shape: {
          x: -50,
          y: this.mapHeight - 50,
          width: this.mapWidth + 100,
          height: 100
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
   * Clean up resources when map is unloaded
   */
  destroy() {
    // Clean up background tiles
    this.backgroundTiles.forEach(tile => {
      if (tile && tile.parent) {
        tile.parent.removeChild(tile);
        tile.destroy();
      }
    });
    this.backgroundTiles = [];
    
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

  /**
   * Robust teleport to portal method for debug menu
   * Gets the correct world coordinates for the portal and teleports character there
   */
  teleportToPortal() {
    console.log('🚀 Map1: Teleporting to portal...');
    
    if (!this.portalManager || this.portalManager.portals.length === 0) {
      console.log('❌ No portals found in Map1');
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
      portalX = (portal.tileX * this.tileWidth) + (this.tileWidth / 2);
      portalY = (portal.tileY * this.tileHeight) + (this.tileHeight / 2);
      console.log('Calculating portal position from tile coordinates');
    }
    
    console.log(`Map1: Portal tile: (${portal.tileX}, ${portal.tileY})`);
    console.log(`Map1: Portal calculated coordinates: (${portalX}, ${portalY})`);
    console.log(`Map1: Map dimensions: ${this.mapWidth}x${this.mapHeight}`);
    console.log(`Map1: Tile size: ${this.tileWidth}x${this.tileHeight}`);
    
    // Set character position
    character.sprite.x = portalX;
    character.sprite.y = portalY;
    
    // Update camera if available
    if (window.game && window.game.cameras && window.game.cameras.main) {
      window.game.cameras.main.centerOn(portalX, portalY);
    }
    
    console.log('✅ Map1: Teleported to portal successfully! You should now see only C props.');
    return true;
  }

  /**
   * Get the correct world coordinates for the portal based on its tile
   * This should be used by debug menu instead of portal sprite position
   */    
  getPortalWorldCoordinates() {
    if (!this.portalManager || this.portalManager.portals.length === 0) {
      console.log('❌ No portals found');
      return null;
    }
    
    const portal = this.portalManager.portals[0];
    
    // ALWAYS calculate from tile coordinates, don't trust sprite position if it's (0,0)
    let worldX, worldY;
    
    if (portal.sprite && portal.sprite.x !== 0 && portal.sprite.y !== 0) {
      // Use sprite position only if it's not at origin
      worldX = portal.sprite.x;
      worldY = portal.sprite.y;
      console.log(`Portal using sprite coordinates: (${worldX}, ${worldY})`);
    } else {
      // Calculate tile center (more reliable)
      worldX = (portal.tileX * this.tileWidth) + (this.tileWidth / 2);
      worldY = (portal.tileY * this.tileHeight) + (this.tileHeight / 2);
      console.log(`Portal calculated from tile (${portal.tileX}, ${portal.tileY}): (${worldX}, ${worldY})`);
      console.log(`Tile size: ${this.tileWidth}x${this.tileHeight}`);
    }
    
    return { x: worldX, y: worldY };
  }

  /**
   * Comprehensive portal debugging method to diagnose coordinate mismatches
   * Call this from the debug menu or console to get detailed portal information
   */
  debugPortalCoordinates() {
    console.log('🔍 === COMPREHENSIVE PORTAL DEBUG FOR MAP1 ===');
    
    if (!this.portalManager || this.portalManager.portals.length === 0) {
      console.log('❌ No portals found in Map1');
      return;
    }
    
    const portal = this.portalManager.portals[0];
    
    // Basic portal info
    console.log('📍 PORTAL BASIC INFO:');
    console.log(`   Portal ID: ${portal.id || 'N/A'}`);
    console.log(`   Portal Type: ${portal.type || 'N/A'}`);
    console.log(`   Tile Position: (${portal.tileX}, ${portal.tileY})`);
    
    // Map dimensions and tile calculations
    console.log('🗺️ MAP DIMENSION INFO:');
    console.log(`   Map Width: ${this.mapWidth}px`);
    console.log(`   Map Height: ${this.mapHeight}px`);
    console.log(`   Grid Size: ${this.gridSize}x${this.gridSize} tiles`);
    console.log(`   Calculated Tile Width: ${this.tileWidth}px`);
    console.log(`   Calculated Tile Height: ${this.tileHeight}px`);
    
    // Calculate expected world coordinates from tile position
    const expectedX = (portal.tileX * this.tileWidth) + (this.tileWidth / 2);
    const expectedY = (portal.tileY * this.tileHeight) + (this.tileHeight / 2);
    
    console.log('🧮 COORDINATE CALCULATIONS:');
    console.log(`   Expected World X: ${expectedX}px`);
    console.log(`   Expected World Y: ${expectedY}px`);
    console.log(`   Formula: (tileX * tileSize) + (tileSize / 2)`);
    console.log(`   X Calculation: (${portal.tileX} * ${this.tileWidth}) + ${this.tileWidth / 2} = ${expectedX}`);
    console.log(`   Y Calculation: (${portal.tileY} * ${this.tileHeight}) + ${this.tileHeight / 2} = ${expectedY}`);
    
    // Portal sprite information
    console.log('🎭 PORTAL SPRITE INFO:');
    if (portal.sprite) {
      console.log(`   Sprite exists: YES`);
      console.log(`   Sprite Position: (${portal.sprite.x}, ${portal.sprite.y})`);
      console.log(`   Sprite Anchor: (${portal.sprite.anchor.x}, ${portal.sprite.anchor.y})`);
      console.log(`   Sprite Scale: (${portal.sprite.scale.x}, ${portal.sprite.scale.y})`);
      console.log(`   Sprite Width: ${portal.sprite.width}px`);
      console.log(`   Sprite Height: ${portal.sprite.height}px`);
      console.log(`   Sprite Visible: ${portal.sprite.visible}`);
      console.log(`   Sprite Parent: ${portal.sprite.parent ? portal.sprite.parent.constructor.name : 'None'}`);
      
      // Check if sprite position matches expected
      const xDiff = Math.abs(portal.sprite.x - expectedX);
      const yDiff = Math.abs(portal.sprite.y - expectedY);
      console.log(`   Position Difference: X=${xDiff.toFixed(2)}px, Y=${yDiff.toFixed(2)}px`);
      
      if (xDiff > 1 || yDiff > 1) {
        console.log(`   ⚠️ WARNING: Sprite position doesn't match expected coordinates!`);
      } else {
        console.log(`   ✅ Sprite position matches expected coordinates`);
      }
      
      // Check if sprite is at problematic (0,0) position
      if (portal.sprite.x === 0 && portal.sprite.y === 0) {
        console.log(`   🚨 CRITICAL: Sprite is at (0,0) - this indicates a positioning bug!`);
      }
    } else {
      console.log(`   Sprite exists: NO`);
      console.log(`   🚨 CRITICAL: Portal has no sprite!`);
    }
    
    // Character position for reference
    console.log('👤 CHARACTER INFO:');
    if (window.game && window.game.characterManager && window.game.characterManager.character) {
      const character = window.game.characterManager.character;
      console.log(`   Character Position: (${character.sprite.x}, ${character.sprite.y})`);
      
      const distanceToExpected = Math.sqrt(
        Math.pow(character.sprite.x - expectedX, 2) + 
        Math.pow(character.sprite.y - expectedY, 2)
      );
      console.log(`   Distance to Portal: ${distanceToExpected.toFixed(2)}px`);
    } else {
      console.log(`   Character: NOT FOUND`);
    }
    
    // Props on portal tile
    console.log('🎯 PORTAL TILE PROPS:');
    if (this.propGenerator && this.propGenerator.getPropsAtTile) {
      const propsAtTile = this.propGenerator.getPropsAtTile(portal.tileX, portal.tileY);
      console.log(`   Props on portal tile: ${propsAtTile.length}`);
      propsAtTile.forEach((prop, index) => {
        console.log(`     ${index + 1}. ${prop.file} (type: ${prop.type || 'unknown'})`);
      });
      
      const cProps = propsAtTile.filter(prop => prop.type === 'C');
      const nonCProps = propsAtTile.filter(prop => prop.type !== 'C');
      console.log(`   C Props: ${cProps.length}, Non-C Props: ${nonCProps.length}`);
      
      if (nonCProps.length > 0) {
        console.log(`   ⚠️ WARNING: Portal tile has non-C props! This might cause visual issues.`);
      } else if (cProps.length > 0) {
        console.log(`   ✅ Portal tile has only C props - this is correct!`);
      } else {
        console.log(`   ℹ️ Portal tile has no props`);
      }
    } else {
      console.log(`   Cannot check props - propGenerator method not available`);
    }
    
    // Bounds checking
    console.log('🔲 BOUNDS CHECKING:');
    const bounds = this.getBounds ? this.getBounds() : { minX: 0, minY: 0, maxX: this.mapWidth, maxY: this.mapHeight };
    console.log(`   Map Bounds: minX=${bounds.minX}, minY=${bounds.minY}, maxX=${bounds.maxX}, maxY=${bounds.maxY}`);
    
    const inBounds = expectedX >= bounds.minX && expectedX <= bounds.maxX && 
                     expectedY >= bounds.minY && expectedY <= bounds.maxY;
    console.log(`   Portal in bounds: ${inBounds ? '✅ YES' : '❌ NO'}`);
    
    if (!inBounds) {
      console.log(`   🚨 CRITICAL: Portal is outside map bounds!`);
    }
    
    // Camera info
    console.log('📷 CAMERA INFO:');
    if (window.game && window.game.cameras && window.game.cameras.main) {
      const camera = window.game.cameras.main;
      console.log(`   Camera Position: (${camera.scrollX}, ${camera.scrollY})`);
      console.log(`   Camera Zoom: ${camera.zoom}`);
    } else {
      console.log(`   Camera: NOT FOUND`);
    }
    
    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (portal.sprite && (portal.sprite.x === 0 && portal.sprite.y === 0)) {
      console.log(`   1. Portal sprite is at (0,0) - use tile-based calculation for teleportation`);
    }
    if (!portal.sprite) {
      console.log(`   1. Portal has no sprite - check portal creation logic`);
    }
    
    console.log('🔍 === END PORTAL DEBUG ===');
    
    // Return useful data for further analysis
    return {
      portal,
      expectedCoordinates: { x: expectedX, y: expectedY },
      spriteCoordinates: portal.sprite ? { x: portal.sprite.x, y: portal.sprite.y } : null,
      coordinateMismatch: portal.sprite ? {
        x: Math.abs(portal.sprite.x - expectedX),
        y: Math.abs(portal.sprite.y - expectedY)
      } : null,
      inBounds,
      bounds
    };  }

  // Include other essential debugging methods here...
  getTextureNameSafe(prop) {
    try {
      // First try to get from stored filename (most reliable)
      if (prop && prop._textureFileName) {
        debugLog(`Getting texture name from _textureFileName: ${prop._textureFileName}`, 'map');
        return prop._textureFileName;
      }
      
      // Fallback to stored original texture path
      if (prop && prop._originalTexturePath) {
        const fileName = prop._originalTexturePath.split('/').pop();
        debugLog(`Getting texture name from _originalTexturePath: ${fileName}`, 'map');
        return fileName;
      }
      
      // Try to get from the actual texture
      if (prop && prop.texture && 
          prop.texture.baseTexture && 
          prop.texture.baseTexture.resource && 
          prop.texture.baseTexture.resource.src) {
        const fileName = prop.texture.baseTexture.resource.src.split('/').pop();
        debugLog(`Getting texture name from texture.baseTexture.resource.src: ${fileName}`, 'map');
        return fileName;
      }
      
      // Try alternative texture access methods
      if (prop && prop.texture && prop.texture.textureCacheIds && prop.texture.textureCacheIds.length > 0) {
        const cacheId = prop.texture.textureCacheIds[0];
        if (cacheId) {
          const fileName = cacheId.split('/').pop();
          debugLog(`Getting texture name from textureCacheIds: ${fileName}`, 'map');
          return fileName;
        }
      }
    } catch (error) {
      debugLog(`Error getting texture name: ${error.message}`, 'map');
      console.log(`Error getting texture name: ${error.message}`);
    }
    
    debugLog('Could not determine texture name, returning UNKNOWN_TEXTURE', 'map');
    return 'UNKNOWN_TEXTURE';
  }

  getPropsOnTile(tileX, tileY) {
    const msg1 = `\n=== Props on Tile (${tileX}, ${tileY}) ===`;
    const msg2 = `Using tile size: ${this.tileWidth}x${this.tileHeight}px (map size: ${this.mapWidth}x${this.mapHeight}, grid: ${this.gridSize}x${this.gridSize})`;
    debugLog(msg1, 'map');
    debugLog(msg2, 'map');
    console.log(msg1);
    console.log(msg2);
    
    if (!this.props || !Array.isArray(this.props)) {
      const msg = 'No props array found';
      debugLog(msg, 'map');
      console.log(msg);
      return [];
    }

    const propsOnTile = [];
    
    const expectedMinX = tileX * this.tileWidth;
    const expectedMaxX = (tileX + 1) * this.tileWidth;
    const expectedMinY = tileY * this.tileHeight;
    const expectedMaxY = (tileY + 1) * this.tileHeight;

    const boundsMsg = `Tile bounds: X(${expectedMinX}-${expectedMaxX}), Y(${expectedMinY}-${expectedMaxY})`;
    debugLog(boundsMsg, 'map');
    console.log(boundsMsg);

    this.props.forEach((prop, index) => {
      try {
        if (prop && prop.x !== undefined && prop.y !== undefined) {
          // Check if prop is within the tile bounds
          if (prop.x >= expectedMinX && prop.x < expectedMaxX && 
              prop.y >= expectedMinY && prop.y < expectedMaxY) {
            
            const textureName = this.getTextureNameSafe(prop);
            const propInfo = {
              index: index,
              x: prop.x,
              y: prop.y,
              texture: textureName,
              isCProp: textureName.includes('C'),
              sprite: prop
            };
            
            propsOnTile.push(propInfo);
            const propMsg = `Prop ${index}: ${textureName} at (${prop.x}, ${prop.y})`;
            debugLog(propMsg, 'map');
            console.log(propMsg);
          }
        }
      } catch (error) {
        const errorMsg = `Error checking prop ${index}: ${error.message}`;
        debugLog(errorMsg, 'map');
        console.log(errorMsg);
      }
    });

    const foundMsg = `Found ${propsOnTile.length} props on tile (${tileX}, ${tileY})`;
    debugLog(foundMsg, 'map');
    console.log(foundMsg);
    
    const cProps = propsOnTile.filter(p => p.isCProp);
    const regularProps = propsOnTile.filter(p => !p.isCProp);
    
    const summaryMsg = `C Props: ${cProps.length}, Regular Props: ${regularProps.length}`;
    debugLog(summaryMsg, 'map');
    console.log(summaryMsg);
    
    if (cProps.length > 0) {
      const cPropsMsg = `C Props found: ${cProps.map(p => p.texture).join(', ')}`;
      debugLog(cPropsMsg, 'map');
      console.log(cPropsMsg);
    }
    if (regularProps.length > 0) {
      const regularMsg = `Regular Props found: ${regularProps.map(p => p.texture).join(', ')}`;
      debugLog(regularMsg, 'map');
      console.log(regularMsg);
    }
    
    return propsOnTile;
  }
}