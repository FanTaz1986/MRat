import * as PIXI from 'pixi.js';
import MapObstacle from './MapObstacle';
import Map1PropGenerator from './Map1PropGenerator';
import HeartPickupManager from '../engine/HeartPickupManager';
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
    
    // Enemy spawning system - calculated once during map loading and remembered
    this.enemySpawnData = null; // Will store all enemy spawn positions and properties
    this.spawnedEnemyIds = new Set(); // Track which enemies have been spawned to prevent duplicates
    this.isEnemyDataCalculated = false; // Flag to ensure enemy positions are calculated only once
    
    // Heart pickup system
    this.heartPickupManager = new HeartPickupManager(app, layers.foreground, this.tileWidth, this.tileHeight, this.gridSize);
    debugLog('Map1: HeartPickupManager initialized', 'map');
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
    
    // Generate heart pickups after props are loaded
    this.generateHeartPickups();
    
    // NOTE: Portals are managed by MapManager, not by Map1
    debugLog('Map1 props loaded. Portals are managed by MapManager.', 'map');
    
    return props;
  }

  /**
   * Generate heart pickups for Map1
   */
  generateHeartPickups() {
    debugLog('Map1: Generating heart pickups', 'map');
    
    // Set portal tiles if available from prop generator
    if (this.propGenerator && this.propGenerator.portalTiles) {
      const portalTilesArray = Array.from(this.propGenerator.portalTiles).map(tileKey => {
        const [x, y] = tileKey.split(',').map(Number);
        return { x, y };
      });
      this.heartPickupManager.setPortalTiles(portalTilesArray);
      debugLog(`Map1: Set ${portalTilesArray.length} portal tiles for heart pickup manager`, 'map');
    }
    
    // Generate hearts
    this.heartPickupManager.generateHearts();
    
    // Add heart container to the foreground layer
    this.heartPickupManager.addToContainer(this.layers.foreground);
    
    const stats = this.heartPickupManager.getStats();
    debugLog(`Map1: Heart pickup generation complete - ${stats.total} hearts created`, 'map');
  }

  /**
   * Calculate enemy spawn data once during map loading
   * This is called once when Map1 is first loaded and positions are remembered
   */
  calculateEnemySpawnData() {
    if (this.isEnemyDataCalculated) {
      debugLog('Enemy spawn data already calculated, skipping recalculation', 'map');
      return;
    }
    
    debugLog('Calculating enemy spawn data for Map1', 'map');
    
    // Safe zone settings - approximately 1920x1080 screen size around starting position
    const SAFE_ZONE_CENTER_X = 16800; // Character starting position X
    const SAFE_ZONE_CENTER_Y = 11880; // Character starting position Y
    const SAFE_ZONE_WIDTH = 1920;     // 1080p screen width
    const SAFE_ZONE_HEIGHT = 1080;    // 1080p screen height
    
    debugLog(`Safe zone configured: Center(${SAFE_ZONE_CENTER_X}, ${SAFE_ZONE_CENTER_Y}), Size(${SAFE_ZONE_WIDTH}x${SAFE_ZONE_HEIGHT})`, 'map');
    debugLog(`Safe zone bounds: X(${SAFE_ZONE_CENTER_X - SAFE_ZONE_WIDTH/2} to ${SAFE_ZONE_CENTER_X + SAFE_ZONE_WIDTH/2}), Y(${SAFE_ZONE_CENTER_Y - SAFE_ZONE_HEIGHT/2} to ${SAFE_ZONE_CENTER_Y + SAFE_ZONE_HEIGHT/2})`, 'map');
    
    this.enemySpawnData = {
      centerTiles: [], // 1Amap.png tiles (6,6 to 9,9)
      portalTiles: [], // Portal tiles
      otherTiles: []   // All other tiles
    };
    
    // Helper function to get random position within a tile
    const getRandomPositionInTile = (tileX, tileY) => {
      const margin = 100; // Keep enemies away from tile edges
      const x = (tileX * this.tileWidth) + margin + Math.random() * (this.tileWidth - 2 * margin);
      const y = (tileY * this.tileHeight) + margin + Math.random() * (this.tileHeight - 2 * margin);
      return { x, y };
    };
    
    // Helper function to check if position is within safe zone
    const isInSafeZone = (x, y) => {
      const halfWidth = SAFE_ZONE_WIDTH / 2;
      const halfHeight = SAFE_ZONE_HEIGHT / 2;
      return (x >= SAFE_ZONE_CENTER_X - halfWidth && x <= SAFE_ZONE_CENTER_X + halfWidth) &&
             (y >= SAFE_ZONE_CENTER_Y - halfHeight && y <= SAFE_ZONE_CENTER_Y + halfHeight);
    };

    // Helper function to create enemy spawn info
    const createEnemySpawn = (tileX, tileY, type, hp, spawnId) => {
      const position = getRandomPositionInTile(tileX, tileY);
      
      // Check if position is in safe zone - if so, skip this enemy
      if (isInSafeZone(position.x, position.y)) {
        debugLog(`Skipping enemy spawn in safe zone at (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`, 'map');
        return null; // Return null to indicate this enemy should be skipped
      }
      
      return {
        id: spawnId,
        tileX,
        tileY,
        type,
        hp,
        position: position,
        isSpawned: false // Track if this enemy has been spawned
      };
    };
    
    let spawnIdCounter = 1; // Unique ID for each enemy spawn
    
    // 1. CENTER TILES (1Amap.png tiles: 6,6 to 9,9) - 1-3 blue slimes, HP 1-3
    debugLog('Calculating center tile enemy spawns (1Amap.png tiles)', 'map');
    const centerTileCoords = [];
    for (let x = 6; x <= 9; x++) {
      for (let y = 6; y <= 9; y++) {
        centerTileCoords.push([x, y]);
      }
    }
    
    // Add 1-3 blue slimes per 1Amap tile, HP 1-3
    let totalCenterBlueSlimes = 0;
    for (let i = 0; i < centerTileCoords.length; i++) {
      const tile = centerTileCoords[i];
      const slimesInThisTile = 1 + Math.floor(Math.random() * 3); // 1-3 slimes per tile
      
      for (let j = 0; j < slimesInThisTile; j++) {
        const hp = 1 + Math.floor(Math.random() * 3); // 1-3 HP
        const enemySpawn = createEnemySpawn(tile[0], tile[1], 'blue', hp, `center_${spawnIdCounter++}`);
        
        // Only add enemy if it's not in safe zone
        if (enemySpawn !== null) {
          this.enemySpawnData.centerTiles.push(enemySpawn);
          totalCenterBlueSlimes++;
          
          debugLog(`Planned center blue slime (${hp}HP) in 1Amap tile (${tile[0]},${tile[1]}) at (${enemySpawn.position.x.toFixed(1)}, ${enemySpawn.position.y.toFixed(1)})`, 'map');
        }
      }
    }
    
    debugLog(`Total center blue slimes planned: ${totalCenterBlueSlimes} (in ${centerTileCoords.length} 1Amap tiles)`, 'map');
    
    // 2. PORTAL TILES - Get from propGenerator or fallback
    debugLog('Calculating portal tile enemy spawns', 'map');
    let portalTileCoords = [];
    
    if (this.propGenerator && this.propGenerator.portalTiles && this.propGenerator.portalTiles.length > 0) {
      portalTileCoords = this.propGenerator.portalTiles;
      debugLog(`Found ${portalTileCoords.length} portal tiles from propGenerator`, 'map');
    } else {
      // Fallback: generate some portal tiles (corners and edges)
      portalTileCoords = [
        [0, 0], [0, 15], [15, 0], [15, 15], // Corners
        [7, 0], [8, 0], [7, 15], [8, 15],   // Top/bottom edges
        [0, 7], [0, 8], [15, 7], [15, 8]    // Left/right edges
      ];
      debugLog(`Using fallback portal tiles: ${portalTileCoords.length} tiles`, 'map');
    }
    
    if (portalTileCoords.length > 0) {
      let totalPortalBlueSlimes = 0;
      let totalPortalRedSlimes = 0;
      
      // 4 random blue slimes HP 3-5 in portal tiles
      for (let i = 0; i < 4; i++) {
        const randomTile = portalTileCoords[Math.floor(Math.random() * portalTileCoords.length)];
        const hp = 3 + Math.floor(Math.random() * 3); // 3-5 HP
        
        const enemySpawn = createEnemySpawn(randomTile[0], randomTile[1], 'blue', hp, `portal_blue_${spawnIdCounter++}`);
        
        // Only add enemy if it's not in safe zone
        if (enemySpawn !== null) {
          this.enemySpawnData.portalTiles.push(enemySpawn);
          totalPortalBlueSlimes++;
          
          debugLog(`Planned portal blue slime (${hp}HP) in portal tile (${randomTile[0]},${randomTile[1]}) at (${enemySpawn.position.x.toFixed(1)}, ${enemySpawn.position.y.toFixed(1)})`, 'map');
        }
      }
      
      // 1 red slime 5HP in portal tile
      const randomTile5HP = portalTileCoords[Math.floor(Math.random() * portalTileCoords.length)];
      const enemySpawn5HP = createEnemySpawn(randomTile5HP[0], randomTile5HP[1], 'red', 5, `portal_red_5hp_${spawnIdCounter++}`);
      
      // Only add enemy if it's not in safe zone
      if (enemySpawn5HP !== null) {
        this.enemySpawnData.portalTiles.push(enemySpawn5HP);
        totalPortalRedSlimes++;
        debugLog(`Planned portal red slime (5HP) in portal tile (${randomTile5HP[0]},${randomTile5HP[1]}) at (${enemySpawn5HP.position.x.toFixed(1)}, ${enemySpawn5HP.position.y.toFixed(1)})`, 'map');
      }
      
      // 2 red slimes 2-3 HP in portal tiles
      for (let i = 0; i < 2; i++) {
        const randomTile = portalTileCoords[Math.floor(Math.random() * portalTileCoords.length)];
        const hp = 2 + Math.floor(Math.random() * 2); // 2-3 HP
        
        const enemySpawn = createEnemySpawn(randomTile[0], randomTile[1], 'red', hp, `portal_red_${spawnIdCounter++}`);
        
        // Only add enemy if it's not in safe zone
        if (enemySpawn !== null) {
          this.enemySpawnData.portalTiles.push(enemySpawn);
          totalPortalRedSlimes++;
          
          debugLog(`Planned portal red slime (${hp}HP) in portal tile (${randomTile[0]},${randomTile[1]}) at (${enemySpawn.position.x.toFixed(1)}, ${enemySpawn.position.y.toFixed(1)})`, 'map');
        }
      }
      
      debugLog(`Total portal slimes: ${totalPortalBlueSlimes} blue, ${totalPortalRedSlimes} red`, 'map');
    }
    
    // 3. OTHER TILES (1Bmap.png tiles - all remaining tiles) - 2-4 slimes HP 2-4, 1-2 red slimes HP 1-2
    debugLog('Calculating other tile enemy spawns (1Bmap.png tiles)', 'map');
    const otherTileCoords = [];
    const portalTileSet = new Set(portalTileCoords.map(t => `${t[0]},${t[1]}`));
    
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        // Skip center tiles (1Amap.png) and portal tiles
        const isCenterTile = (x >= 6 && x <= 9 && y >= 6 && y <= 9);
        const isPortalTile = portalTileSet.has(`${x},${y}`);
        
        if (!isCenterTile && !isPortalTile) {
          otherTileCoords.push([x, y]);
        }
      }
    }
    
    debugLog(`Found ${otherTileCoords.length} 1Bmap tiles for enemy spawning`, 'map');
    
    // Every 1Bmap tile gets enemies: 2-4 blue slimes (2-4 HP) + 1-2 red slimes (1-2 HP) per tile
    let totalOtherBlueSlimes = 0;
    let totalOtherRedSlimes = 0;
    
    for (const [tileX, tileY] of otherTileCoords) {
      // 2-4 blue slimes per tile
      const blueSlimesPerTile = 2 + Math.floor(Math.random() * 3); // 2-4
      for (let i = 0; i < blueSlimesPerTile; i++) {
        const hp = 2 + Math.floor(Math.random() * 3); // 2-4 HP
        
        const enemySpawn = createEnemySpawn(tileX, tileY, 'blue', hp, `other_blue_${spawnIdCounter++}`);
        
        // Only add enemy if it's not in safe zone
        if (enemySpawn !== null) {
          this.enemySpawnData.otherTiles.push(enemySpawn);
          totalOtherBlueSlimes++;
          
          debugLog(`Planned 1Bmap blue slime (${hp}HP) in tile (${tileX},${tileY}) at (${enemySpawn.position.x.toFixed(1)}, ${enemySpawn.position.y.toFixed(1)})`, 'map');
        }
      }
      
      // 1-2 red slimes per tile
      const redSlimesPerTile = 1 + Math.floor(Math.random() * 2); // 1-2
      for (let i = 0; i < redSlimesPerTile; i++) {
        const hp = 1 + Math.floor(Math.random() * 2); // 1-2 HP
        
        const enemySpawn = createEnemySpawn(tileX, tileY, 'red', hp, `other_red_${spawnIdCounter++}`);
        
        // Only add enemy if it's not in safe zone
        if (enemySpawn !== null) {
          this.enemySpawnData.otherTiles.push(enemySpawn);
          totalOtherRedSlimes++;
          
          debugLog(`Planned 1Bmap red slime (${hp}HP) in tile (${tileX},${tileY}) at (${enemySpawn.position.x.toFixed(1)}, ${enemySpawn.position.y.toFixed(1)})`, 'map');
        }
      }
    }
    
    debugLog(`Total 1Bmap slimes: ${totalOtherBlueSlimes} blue, ${totalOtherRedSlimes} red`, 'map');
    
    // FINAL SUMMARY REPORT
    const totalCenterBlue = totalCenterBlueSlimes;
    const totalPortalBlue = 4; // Always 4 blue slimes
    const totalPortalRed = 3; // Always 1 (HP 5) + 2 (HP 2-3) = 3 red slimes
    const totalOtherBlue = totalOtherBlueSlimes;
    const totalOtherRed = totalOtherRedSlimes;
    
    const grandTotalBlue = totalCenterBlue + totalPortalBlue + totalOtherBlue;
    const grandTotalRed = totalPortalRed + totalOtherRed;
    const grandTotal = grandTotalBlue + grandTotalRed;
    
    debugLog('=== MAP1 ENEMY DISTRIBUTION REPORT ===', 'map');
    debugLog(`1Amap tiles (center): ${totalCenterBlue} blue slimes (HP 1-3)`, 'map');
    debugLog(`Portal tiles: ${totalPortalBlue} blue slimes (HP 3-5) + ${totalPortalRed} red slimes (1×HP5, 2×HP2-3)`, 'map');
    debugLog(`1Bmap tiles (other): ${totalOtherBlue} blue slimes (HP 2-4) + ${totalOtherRed} red slimes (HP 1-2)`, 'map');
    debugLog(`TOTAL: ${grandTotalBlue} blue slimes + ${grandTotalRed} red slimes = ${grandTotal} enemies`, 'map');
    debugLog('=== MIN/MAX ENEMY COUNTS ===', 'map');
    debugLog('1Amap tiles: 16-48 blue slimes (1-3 per tile × 16 tiles)', 'map');
    debugLog('Portal tiles: 7 enemies total (4 blue + 3 red)', 'map');
    
    // Calculate 1Bmap tile counts - every tile gets 2-4 blue + 1-2 red = 3-6 enemies per tile
    const otherTileCount = otherTileCoords.length;
    const minOtherEnemies = otherTileCount * 3; // (2 blue + 1 red) per tile
    const maxOtherEnemies = otherTileCount * 6; // (4 blue + 2 red) per tile
    debugLog(`1Bmap tiles: ${minOtherEnemies}-${maxOtherEnemies} enemies (3-6 per tile × ${otherTileCount} tiles)`, 'map');
    
    const overallMin = 16 + 7 + minOtherEnemies; // 1Amap min + portal + 1Bmap min
    const overallMax = 48 + 7 + maxOtherEnemies; // 1Amap max + portal + 1Bmap max
    debugLog(`OVERALL RANGE: ${overallMin}-${overallMax} total enemies per Map1 load`, 'map');
    debugLog('==========================================', 'map');
    
    this.isEnemyDataCalculated = true;
    
    const totalEnemies = this.enemySpawnData.centerTiles.length + 
                        this.enemySpawnData.portalTiles.length + 
                        this.enemySpawnData.otherTiles.length;
    
    debugLog(`Enemy spawn data calculation complete: ${totalEnemies} enemies planned`, 'map');
    debugLog(`  Center tiles: ${this.enemySpawnData.centerTiles.length} enemies`, 'map');
    debugLog(`  Portal tiles: ${this.enemySpawnData.portalTiles.length} enemies`, 'map');
    debugLog(`  Other tiles: ${this.enemySpawnData.otherTiles.length} enemies`, 'map');
  }

  /**
   * Spawn enemies based on screen visibility
   * This is called periodically to spawn enemies when their world position becomes visible
   */
  async spawnVisibleEnemies() {
    if (!this.enemySpawnData || !window.globalEnemyManager) {
      return;
    }
    
    const enemyManager = window.globalEnemyManager;
    
    // Get current camera/screen information for visibility calculations
    const camera = window.gameMapManager?.camera;
    if (!camera) {
      return;
    }
    
    const screenWidth = this.app?.screen?.width || 1920;
    const screenHeight = this.app?.screen?.height || 1080;
    
    // Calculate world bounds that are currently visible on screen
    let worldViewBounds = {
      minX: -camera.mapContainer.x,
      minY: -camera.mapContainer.y,
      maxX: -camera.mapContainer.x + screenWidth,
      maxY: -camera.mapContainer.y + screenHeight
    };
    
    // Add margin to spawn enemies slightly off-screen for smooth appearance
    const spawnMargin = 200;
    worldViewBounds.minX -= spawnMargin;
    worldViewBounds.minY -= spawnMargin;
    worldViewBounds.maxX += spawnMargin;
    worldViewBounds.maxY += spawnMargin;
    
    // Helper function to check if a position is visible
    const isPositionVisible = (x, y) => {
      return x >= worldViewBounds.minX && x <= worldViewBounds.maxX &&
             y >= worldViewBounds.minY && y <= worldViewBounds.maxY;
    };
    
    // Helper function to spawn enemy and mark as spawned
    const spawnEnemyFromData = async (enemyData) => {
      if (enemyData.isSpawned || this.spawnedEnemyIds.has(enemyData.id)) {
        return; // Already spawned
      }
      
      if (isPositionVisible(enemyData.position.x, enemyData.position.y)) {
        debugLog(`Spawning ${enemyData.type} slime (${enemyData.hp}HP) at visible position (${enemyData.position.x.toFixed(1)}, ${enemyData.position.y.toFixed(1)})`, 'map');
        
        const enemy = await enemyManager.spawnEnemy(enemyData.type, enemyData.position.x, enemyData.position.y, enemyData.hp);
        if (enemy) {
          enemyData.isSpawned = true;
          this.spawnedEnemyIds.add(enemyData.id);
          
          // Store reference to Map1 spawn data in enemy for persistence
          enemy.map1SpawnId = enemyData.id;
          
          debugLog(`✅ Successfully spawned ${enemyData.type} slime (${enemyData.hp}HP) with ID ${enemyData.id}`, 'map');
        } else {
          debugLog(`❌ Failed to spawn ${enemyData.type} slime (${enemyData.hp}HP) with ID ${enemyData.id}`, 'map');
        }
      }
    };
    
    // Check and spawn enemies from all categories
    const allEnemyData = [
      ...this.enemySpawnData.centerTiles,
      ...this.enemySpawnData.portalTiles,
      ...this.enemySpawnData.otherTiles
    ];
    
    for (const enemyData of allEnemyData) {
      await spawnEnemyFromData(enemyData);
    }
  }

  /**
   * Initialize enemies for Map1 based on tile locations
   * This method now calculates enemy positions and spawns only visible ones
   */
  async initializeEnemies() {
    debugLog('Initializing enemies for Map1', 'map');
    
    if (!window.globalEnemyManager) {
      debugLog('ERROR: Global EnemyManager not available for enemy spawning', 'map');
      return;
    }
    
    // Calculate enemy spawn data if not already done
    this.calculateEnemySpawnData();
    
    // Spawn enemies that are currently visible
    await this.spawnVisibleEnemies();
    
    debugLog('Map1 enemy initialization complete', 'map');
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
        debugLog(`Loading prop texture: ${texturePath}`, 'map');
        
        // Check if texture exists in PIXI cache first
        if (!PIXI.utils.TextureCache[texturePath]) {
          debugLog(`Texture not in cache, preloading: ${texturePath}`, 'map');
          debugLog(`Texture not in cache, preloading: ${texturePath}`, 'map');
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
        sprite.rotation = prop.rotation || 0; // Use radians directly, not degrees
        sprite.anchor.set(0.5);
        sprite.zIndex = prop.zIndex || 1;
        sprite.roundPixels = false; // Enable sub-pixel positioning

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
    // Check and spawn enemies based on screen visibility
    this.updateEnemyVisibility();
    
    // Update heart pickup manager (for floating animation and collision detection)
    if (this.heartPickupManager) {
      this.heartPickupManager.update(delta);
    }
    
    // Map-specific update logic can go here
    // Portal updates are handled by MapManager's updatePortals method
  }
  
  /**
   * Update enemy visibility and spawn enemies when they come into view
   * This should be called periodically (e.g., in Map1's update method)
   */
  updateEnemyVisibility() {
    // Only check every 500ms to avoid performance issues
    if (!this._lastEnemyVisibilityCheck) {
      this._lastEnemyVisibilityCheck = Date.now();
    }
    
    const now = Date.now();
    if (now - this._lastEnemyVisibilityCheck < 500) {
      return; // Too early to check again
    }
    
    this._lastEnemyVisibilityCheck = now;
    
    // Spawn enemies that are now visible (but don't wait for it)
    this.spawnVisibleEnemies().catch(error => {
      debugLog(`Error spawning visible enemies: ${error.message}`, 'map');
    });
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