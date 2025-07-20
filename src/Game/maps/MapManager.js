import * as PIXI from 'pixi.js';
import Character from '../entities/Character';
import Pet from '../entities/Pet';
import CameraController from '../engine/CameraController';
import PortalManager from '../engine/Portal/PortalManager';
import Map0 from './Map0';
import Map1 from './Map1';
import Map2 from './Map2';
import MapX from './MapX';
import { playAmbianceForMap, stopAmbiance } from '../../utils/AudioManager';
import { debugLog } from '../../development/utils/Debug';

export default class MapManager {
  constructor(app, gameSeed = null) {
    debugLog('MapManager constructor called with: app=' + !!app + ', appType=' + typeof app + ', appConstructor=' + app?.constructor?.name + ', hasStage=' + !!app?.stage + ', stageType=' + typeof app?.stage + ', stageConstructor=' + app?.stage?.constructor?.name + ', gameSeed=' + gameSeed, 'system');
    
    // Safety check: Ensure we receive a valid PIXI app
    if (!app) {
      throw new Error('MapManager constructor: PIXI app is required');
    }
    
    if (!app.stage) {
      console.error('MapManager constructor debug info:', {
        app: !!app,
        appType: typeof app,
        appConstructor: app.constructor?.name,
        hasStage: !!app.stage,
        stageType: typeof app.stage,
        appKeys: Object.keys(app),
        appProto: Object.getPrototypeOf(app)?.constructor?.name
      });
      throw new Error('MapManager constructor: PIXI app must have a stage. App exists but stage is missing.');
    }
    
    debugLog('MapManager constructor: Validation passed, creating MapManager...', 'system');
    
    this.app = app;
    this.gameSeed = gameSeed; // Store game seed for passing to maps
    this.currentMap = null;
    this.character = null;
    this.pet = null;
    this.camera = null;
    this.mapContainer = null;
    this.portalManager = null;
    this.onMapChanged = null;
    
    // Map configurations
    this.mapConfigs = {
      maparea0: {
        mapSize: 1024 * 2,
        bgImage: process.env.PUBLIC_URL + '/0MAP/play_area/Jura.png',
        initialCharPos: { x: 1024 * 2 * 0.10, y: 1024 * 2 - 1024 * 2 * 0.10 },
        bounds: {
          minX: 96,
          minY: 1024 * 2 * 0.75 + 96,
          maxX: 1024 * 2 - 96,
          maxY: 1024 * 2 - 96
        }
      },      maparea1: {
        mapSize: 33600, // Total gameplay area 33600x23760 (16x16 grid, each tile 2100x1485) - 2x smaller tiles
        mapHeight: 23760,
        bgImage: process.env.PUBLIC_URL + '/1MAP/play_area/1Amap.png',
        initialCharPos: { x: 33600 * 0.5, y: 23760 * 0.5 }, // Center of map (16800, 11880)
        bounds: {
          minX: 0,
          minY: 0,
          maxX: 33600,
          maxY: 23760
        }      },maparea2: {
        mapSize: 33600, // Same as Map1: Total gameplay area 33600x23760 (16x16 grid, each tile 2100x1485)
        mapHeight: 23760, // Same as Map1
        bgImage: process.env.PUBLIC_URL + '/2MAP/play_area/1Amap.png',
        initialCharPos: { x: 33600 * 0.5, y: 23760 * 0.5 }, // Center of map (16800, 11880)
        bounds: {
          minX: 0,
          minY: 0,
          maxX: 33600,
          maxY: 23760
        }
      },      mapareax: {
        mapSize: 2048, // Cave width (half size)
        mapHeight: 1556, // Cave height (half size)
        bgImage: process.env.PUBLIC_URL + '/XMAP/play_area/cave.png',
        initialCharPos: { x: 1741, y: 1167 }, // 15% from right and 25% from bottom
        bounds: {
          minX: 32,
          minY: 32,
          maxX: 2048 - 32,
          maxY: 1556 - 32
        }
      }
    };
    
    // Bind method contexts
    this.updatePortals = this.updatePortals.bind(this);
  }  loadMap(mapId, onLoaded, previousMap = null, targetPosition = null) {
    debugLog(`Loading map: ${mapId}`, 'map');
    if (targetPosition) {
      debugLog(`Teleporting to position: (${targetPosition.x}, ${targetPosition.y})`, 'map');
    }
    
    // Safety check: Ensure PIXI app and stage are valid
    if (!this.app) {
      console.error('PIXI app is null in MapManager.loadMap');
      return;
    }
    
    if (!this.app.stage) {
      console.error('PIXI app stage is null in MapManager.loadMap');
      return;
    }
    
    // Clean up old map
    this.unloadCurrentMap();
    
    // Get map configuration
    const mapConfig = this.mapConfigs[mapId];
    if (!mapConfig) {
      console.error(`Map configuration not found for ${mapId}`);
      return;
    }
    
    // Create main container for this map
    this.mapContainer = new PIXI.Container();
    this.app.stage.addChild(this.mapContainer);
    
    // Create layers with proper z-indexing
    this.backgroundLayer = new PIXI.Container();
    this.propsLayer = new PIXI.Container();
    this.characterLayer = new PIXI.Container();
    this.foregroundLayer = new PIXI.Container();
    this.uiLayer = new PIXI.Container();
    
    // Enable sortableChildren for prop layer
    this.propsLayer.sortableChildren = true;
    
    // Add layers to map container in order
    this.mapContainer.addChild(this.backgroundLayer);
    this.mapContainer.addChild(this.propsLayer);
    this.mapContainer.addChild(this.characterLayer);
    this.mapContainer.addChild(this.foregroundLayer);
    
    // Enable sortable children for character layer to respect zIndex
    this.characterLayer.sortableChildren = true;
    
    // UI layer gets added outside the map container so it doesn't move with camera
    this.app.stage.addChild(this.uiLayer);    // Create high-quality background
    const background = PIXI.Sprite.from(mapConfig.bgImage);
    
    // Apply high-quality settings to background
    background.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    background.texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
    background.texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    background.roundPixels = false;
    
    // Handle maparea1's new size structure
    if (mapId === 'maparea1') {
      background.width = mapConfig.mapSize;  // 67200
      background.height = mapConfig.mapHeight; // 47520
    } else if (typeof mapConfig.mapSize === 'object') {
      background.width = mapConfig.mapSize.width;
      background.height = mapConfig.mapSize.height;
    } else {
      background.width = mapConfig.mapSize;
      background.height = mapConfig.mapSize;
    }    this.backgroundLayer.addChild(background);// Create character
    // Use target position if teleporting, otherwise use map's initial position
    const characterPosition = targetPosition || mapConfig.initialCharPos;
    debugLog(`Creating character at position: ${characterPosition.x}, ${characterPosition.y}`, 'character');
    this.character = new Character(
      this.app, 
      characterPosition.x, 
      characterPosition.y,
      mapId
    );
    this.character.setBounds(mapConfig.bounds);
    
    // Add character to character layer
    debugLog(`Adding character sprite to characterLayer for map: ${mapId}`, 'character');
    debugLog(`Character sprite exists: ${!!this.character.sprite}`, 'character');
    debugLog(`Character layer exists: ${!!this.characterLayer}`, 'character');
    debugLog(`Character layer children before adding: ${this.characterLayer.children.length}`, 'character');
    
    this.characterLayer.addChild(this.character.sprite);
    
    debugLog(`Character layer children after adding: ${this.characterLayer.children.length}`, 'character');
    debugLog(`Character sprite in layer: ${this.characterLayer.children.includes(this.character.sprite)}`, 'character');
    
    // Ensure character has higher zIndex than props and is always on top
    this.character.sprite.zIndex = 1000;
    debugLog(`Character sprite zIndex set to: ${this.character.sprite.zIndex}`, 'character');
    
    // Make sure the character layer has sortable children
    this.characterLayer.sortableChildren = true;
    debugLog(`Character layer sortableChildren enabled: ${this.characterLayer.sortableChildren}`, 'character');
    
    // Create pet companion
    const petStartPosition = {
      x: characterPosition.x + (targetPosition ? 50 : 100), // Closer when teleporting
      y: characterPosition.y + (targetPosition ? 0 : 20)    // Slightly offset when not teleporting
    };
    this.pet = new Pet(this.app, petStartPosition.x, petStartPosition.y, mapId);
    this.pet.setCharacter(this.character); // Connect pet to character for following behavior
    // Note: Camera reference will be set after camera is created
    this.pet.setBounds(mapConfig.bounds); // Set map boundaries for pet
    
    // Register pet globally for debugging
    window.globalPet = this.pet;
    
    // Connect character and pet for controller integration
    this.character.setPetReference(this.pet);
    debugLog('Character and pet connected for controller integration', 'character');
    
    // Add pet to character layer with proper z-indexing
    this.characterLayer.addChild(this.pet.getSprite());
    
    debugLog(`Pet created at position: ${petStartPosition.x}, ${petStartPosition.y}`, 'pet');
    debugLog(`Pet level for map ${mapId}: ${this.pet.currentLevel}`, 'pet');
    debugLog(`Pet max distance: ${this.pet.currentMaxDistance}px`, 'pet');
    debugLog(`Pet sprite added to character layer with z-index: ${this.pet.getSprite().zIndex}`, 'pet');
    
    // Debug layer hierarchy    debugLog(`Map container children count: ${this.mapContainer.children.length}`, 'character');
    debugLog(`Background layer index: ${this.mapContainer.getChildIndex(this.backgroundLayer)}`, 'character');
    debugLog(`Props layer index: ${this.mapContainer.getChildIndex(this.propsLayer)}`, 'character');
    debugLog(`Character layer index: ${this.mapContainer.getChildIndex(this.characterLayer)}`, 'character');
    debugLog(`Foreground layer index: ${this.mapContainer.getChildIndex(this.foregroundLayer)}`, 'character');

    // Create camera controller with standard zoom (no special zoom for maps)
    const initialZoom = 1.0;
    this.camera = new CameraController(
      this.app,
      this.mapContainer,
      mapConfig.mapSize,
      mapConfig.mapHeight || mapConfig.mapSize, // Use mapHeight if available, otherwise use mapSize
      initialZoom
    );
    this.camera.follow(this.character);
    
    // Set up global camera reference for EnemyManager
    window.globalCamera = this.camera;
    
    // Now that camera is created, connect it to the pet for viewport bounds
    this.pet.setCamera(this.camera);
    debugLog('Pet camera reference set after camera creation', 'pet');
    
    // Connect EnemyManager to the world container (characterLayer moves with camera)
    if (window.globalEnemyManager) {
      window.globalEnemyManager.setWorldContainer(this.characterLayer);
      debugLog('EnemyManager connected to character layer for world positioning', 'enemies');
    }    // Create portal manager
    this.portalManager = new PortalManager(this.app, mapId, mapConfig.mapSize, mapConfig.mapHeight);
    // Add portals to character layer so they can be properly z-ordered with character
    this.portalManager.addToScene(this.characterLayer);    this.portalManager.setOnTeleport((targetMap) => {
      debugLog(`TELEPORT TRIGGERED from ${mapId} to ${targetMap}`, 'portal');
      
      // Safety check: Ensure PIXI app is still valid before teleporting
      if (!this.app || !this.app.stage) {
        console.error('Cannot teleport: PIXI app or stage is null');
        return;
      }
      
      if (targetMap) {
        // Store previous map before loading new one
        const previousMap = this.currentMap;
        
        // Calculate spawn position for the target map (center of map)
        const targetMapConfig = this.mapConfigs[targetMap];
        let spawnPosition = null;
        
        if (targetMapConfig) {          if (targetMap === 'maparea1') {
            // For map1, spawn at center: 33600x23760, so center is (16800, 11880) - was 67200x47520
            spawnPosition = { 
              x: targetMapConfig.mapSize * 0.5, 
              y: targetMapConfig.mapHeight * 0.5 
            };          } else if (targetMap === 'maparea2') {
            // For map2, spawn at center: 33600x23760, so center is (16800, 11880)
            spawnPosition = { 
              x: targetMapConfig.mapSize * 0.5,    // 33600 * 0.5 = 16800
              y: targetMapConfig.mapHeight * 0.5   // 23760 * 0.5 = 11880
            };
          } else {
            // For other maps, use the configured initial position
            spawnPosition = targetMapConfig.initialCharPos;
          }
          
          debugLog(`Calculated spawn position for ${targetMap}: (${spawnPosition.x}, ${spawnPosition.y})`, 'portal');
        }
          // Create a special callback to center camera after map loads
        const centerCameraAfterLoad = () => {
          debugLog('Map loaded after teleport, centering camera on character', 'portal');
          
          // Use a small delay to ensure character position is stable after teleport
          setTimeout(() => {
            if (this.camera && this.character && this.character.position) {
              // Force immediate camera centering
              this.camera.centerOn(this.character.position.x, this.character.position.y);
              debugLog(`Camera centered at: (${this.camera.position.x}, ${this.camera.position.y})`, 'portal');
              debugLog(`Character position: (${this.character.position.x}, ${this.character.position.y})`, 'portal');
              
              // Double-check that camera is following
              this.camera.follow(this.character);
              debugLog('Camera follow re-enabled after teleport', 'portal');
            } else {
              debugLog('WARNING: Camera or character not available for centering after teleport', 'portal');
            }
          }, 150); // 150ms delay to ensure everything is properly initialized after teleport
        };
        
        this.loadMap(targetMap, centerCameraAfterLoad, previousMap, spawnPosition);
      } else {
        console.error('Teleport failed: targetMap is null or undefined');
      }
    });
    
    // Add portal update to ticker
    if (this.app && this.app.ticker) {
      this.app.ticker.add(this.updatePortals);
    } else {
      console.warn('Cannot add portal updates to ticker: app or ticker is null');
    }
    
    // Load map props
    this.loadMapProps(mapId);
    
    // Play map ambiance
    playAmbianceForMap(mapId);
    
    // Store current map ID
    this.currentMap = mapId;
    
    // Notify that map is loaded
    if (onLoaded) {
      onLoaded();
    }
      // Call onMapChanged callback if defined
    if (this.onMapChanged) {
      this.onMapChanged(mapId, previousMap);
    }
  }
  
  loadMapProps(mapId) {
    debugLog(`Loading props for ${mapId}`, 'map');
    
    switch (mapId) {
      case 'maparea0':
        this.loadMapArea0Props();
        break;
      case 'maparea1':
        this.loadMapArea1Props();
        break;
      case 'maparea2':
        this.loadMapArea2Props();
        break;
      case 'mapareax':
        this.loadMapAreaXProps();
        break;
      default:
        console.warn(`No prop loading implemented for ${mapId}`);
    }
  }
  loadMapArea0Props() {
    // Create layers object to pass to Map0
    const layers = {
      background: this.backgroundLayer,
      props: this.propsLayer,
      character: this.characterLayer,
      foreground: this.foregroundLayer,
      ui: this.uiLayer
    };
    
    // Create a Map0 instance with the layers and pass the character reference
    this.map0Instance = new Map0(this.app, this.mapConfigs.maparea0.mapSize, layers, this.character, this.gameSeed);
    
    // This will generate and load all props
    this.map0Instance.loadProps();
    
    // Use the Map0's custom bounds
    const map0Bounds = this.map0Instance.getBounds();
    if (map0Bounds && this.character) {
      this.character.setBounds(map0Bounds);
    }
    
    // Add update to ticker
    this.updateMap0 = (delta) => {
      if (this.map0Instance) {
        try {
          // Limit update frequency to avoid too many loops
          const now = Date.now();
          if (!this._lastMap0Update || now - this._lastMap0Update > 16) {  // ~60fps
            this.map0Instance.update(delta);
            this._lastMap0Update = now;
          }
        } catch (error) {
          console.error("Error in map0 update:", error);
        }
      }
    };
    
    this.app.ticker.add(this.updateMap0);
  }  loadMapArea1Props() {
    // Create layers object to pass to Map1
    const layers = {
      background: this.backgroundLayer,
      props: this.propsLayer,
      character: this.characterLayer,
      foreground: this.foregroundLayer,
      ui: this.uiLayer
    };
    
    // Create Map1 instance with correct dimensions (67200x47520 total area)
    const mapConfig = this.mapConfigs.maparea1;
    this.map1Instance = new Map1(this.app, mapConfig.mapSize, mapConfig.mapHeight, layers, this.gameSeed);
    
    // CRITICAL FIX: Pass portal information from MapManager's PortalManager to Map1
    // This ensures that Map1's prop generator knows about portal locations
    if (this.portalManager && this.portalManager.portals.length > 0) {
      const portalTiles = this.portalManager.portals.map(portal => ({
        x: portal.tileX,
        y: portal.tileY
      })).filter(tile => tile.x !== undefined && tile.y !== undefined);
      
      debugLog(`MapManager: Passing ${portalTiles.length} portal tiles to Map1 prop generator`, 'map');
      debugLog(`Portal tiles being passed: ${JSON.stringify(portalTiles)}`, 'map');
      
      // Set portal tiles in Map1's prop generator before loading props
      this.map1Instance.propGenerator.setPortalTiles(portalTiles);
    } else {
      debugLog('MapManager: No portals found to pass to Map1 prop generator', 'map');
    }
    
    // Generate props (now with correct portal exclusions)
    this.map1Instance.loadProps();
    
    // Set character reference for heart pickup manager
    if (this.map1Instance.heartPickupManager && this.character) {
      this.map1Instance.heartPickupManager.setCharacter(this.character);
      debugLog('MapManager: Set character reference for Map1 heart pickup manager', 'map');
    }
    
    // Initialize enemies for Map1 (with small delay to ensure everything is set up)
    if (this.map1Instance.initializeEnemies) {
      setTimeout(() => {
        this.map1Instance.initializeEnemies().catch(error => {
          debugLog(`Error initializing Map1 enemies: ${error.message}`, 'map');
        });
      }, 100); // 100ms delay to ensure world container is set
    }
    
    // Add update to ticker
    this.updateMap1 = (delta) => {
      if (this.map1Instance) {
        try {
          // Limit update frequency to avoid too many loops
          const now = Date.now();
          if (!this._lastMap1Update || now - this._lastMap1Update > 16) {  // ~60fps
            this.map1Instance.update(delta);
            this._lastMap1Update = now;
          }
        } catch (error) {
          console.error("Error in map1 update:", error);
        }
      }
    };
    
    this.app.ticker.add(this.updateMap1);
  }
  loadMapArea2Props() {
    // Create layers object to pass to Map2
    const layers = {
      background: this.backgroundLayer,
      props: this.propsLayer,
      character: this.characterLayer,
      foreground: this.foregroundLayer,
      ui: this.uiLayer
    };    // Create Map2 instance with correct dimensions (33600x23760 total area - same as Map1)
    const mapConfig = this.mapConfigs.maparea2;
    this.map2Instance = new Map2(this.app, mapConfig.mapSize, mapConfig.mapHeight, layers, this.gameSeed);
    
    // Set the portal manager for Map2
    this.map2Instance.setPortalManager(this.portalManager);
    
    // CRITICAL: Pass portal information from MapManager's PortalManager to Map2
    // This ensures that Map2's prop generator knows about portal locations
    if (this.portalManager && this.portalManager.portals.length > 0) {
      const portalTiles = this.portalManager.portals.map(portal => ({
        x: portal.tileX,
        y: portal.tileY
      })).filter(tile => tile.x !== undefined && tile.y !== undefined);
      
      debugLog(`MapManager: Passing ${portalTiles.length} portal tiles to Map2 prop generator`, 'map');
      debugLog(`Portal tiles being passed: ${JSON.stringify(portalTiles)}`, 'map');
      
      // Set portal tiles in Map2's prop generator before loading props
      this.map2Instance.propGenerator.setPortalTiles(portalTiles);
    } else {
      debugLog('MapManager: No portals found to pass to Map2 prop generator', 'map');
    }
    
    // Generate props (now with correct portal exclusions)
    this.map2Instance.loadProps();
    
    // Add update to ticker
    this.updateMap2 = (delta) => {
      if (this.map2Instance) {
        try {
          // Limit update frequency to avoid too many loops
          const now = Date.now();
          if (!this._lastMap2Update || now - this._lastMap2Update > 16) {  // ~60fps
            this.map2Instance.update(delta);
            this._lastMap2Update = now;
          }
        } catch (error) {
          console.error("Error in map2 update:", error);
        }
      }
    };
    
    this.app.ticker.add(this.updateMap2);
  }
  loadMapAreaXProps() {
    // Create layers object to pass to MapX
    const layers = {
      background: this.backgroundLayer,
      props: this.propsLayer,
      character: this.characterLayer,
      foreground: this.foregroundLayer,
      ui: this.uiLayer
    };
    
    // Create MapX instance
    this.mapXInstance = new MapX(this.app, this.mapConfigs.mapareax.mapSize, layers, this.gameSeed);
    
    // Set up portal enable callback - connect MapX to PortalManager
    this.mapXInstance.setPortalEnabledCallback(() => {
      if (this.portalManager && this.portalManager.enableMapXPortal) {
        debugLog('MapManager: Boss fight ended, enabling Map X portal', 'map');
        this.portalManager.enableMapXPortal();
      }
    });
    
    // Generate props (this will also spawn the boss)
    this.mapXInstance.loadProps();
    
    // Add update to ticker
    this.updateMapX = (delta) => {
      if (this.mapXInstance) {
        try {
          // Limit update frequency to avoid too many loops
          const now = Date.now();
          if (!this._lastMapXUpdate || now - this._lastMapXUpdate > 16) {  // ~60fps
            this.mapXInstance.update(delta);
            this._lastMapXUpdate = now;
          }
        } catch (error) {
          console.error("Error in updateMapX:", error);
        }
      }
    };
    
    this.app.ticker.add(this.updateMapX);
  }
  
  // Create high-quality texture for map assets
  createHighQualityTexture(path) {
    const texture = PIXI.Texture.from(path);
    
    // Apply high-quality settings
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
    texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    texture.baseTexture.resolution = Math.max(window.devicePixelRatio || 1, 2);
    
    return texture;
  }

  getPortals() {
    return this.portalManager ? this.portalManager.getPortals() : [];
  }
  
  setForcePortalPrompt(force) {
    if (this.portalManager) {
      this.portalManager.setForcePrompt(force);
      return true;
    }
    return false;
  }
  
  handleResize() {
    if (this.camera) {
      this.camera.resize();
    }
  }
  
  updatePortals() {
    // First check if required objects exist
    if (!this.portalManager) {
      console.error('Portal manager missing in updatePortals');
      return;
    }
    
    if (!this.character) {
      // Don't log this too often to avoid console spam
      if (!this._lastCharacterMissingLog || Date.now() - this._lastCharacterMissingLog > 2000) {
        console.error('Character missing in updatePortals');
        this._lastCharacterMissingLog = Date.now();
      }
      return;
    }
    
    // Now check if character.position exists
    if (!this.character.position) {
      console.error('Character position is undefined in updatePortals');
      return;
    }
    
    try {      // Debug info - less frequent to reduce console spam
      if (!this._debugPortalInfo || Date.now() - this._lastDebugTime > 5000) {
        debugLog(`Character position: {x: ${this.character.position.x}, y: ${this.character.position.y}}`, 'character');
        debugLog(`Portals: ${JSON.stringify(this.portalManager.getPortals().map(p => ({
          position: p.position,
          targetMap: p.targetMap,
          interactionRadius: p.interactionRadius
        })))}`, 'portal');
        this._debugPortalInfo = true;
        this._lastDebugTime = Date.now();
      }
      
      // Limit update frequency to avoid too many loops
      const now = Date.now();
      if (!this._lastPortalUpdate || now - this._lastPortalUpdate > 16) {  // ~60fps
        this.portalManager.update(this.character);
        this._lastPortalUpdate = now;
      }
    } catch (error) {
      console.error("Error in updatePortals:", error);
    }
  }
    unloadCurrentMap() {
    // Stop ambiance
    stopAmbiance();
    
    // Safety check: Ensure PIXI app is valid before cleanup
    if (!this.app) {
      console.warn('PIXI app is null in unloadCurrentMap, skipping cleanup');
      return;
    }
    
    // Clean up map0 instance if it exists
    if (this.map0Instance) {
      if (this.app.ticker) {
        this.app.ticker.remove(this.updateMap0);
      }
      this.map0Instance.destroy();
      this.map0Instance = null;
    }
    
    // Clean up map1 instance if it exists
    if (this.map1Instance) {
      if (this.app.ticker) {
        this.app.ticker.remove(this.updateMap1);
      }
      this.map1Instance.destroy();
      this.map1Instance = null;
    }
    
    // Clean up map2 instance if it exists
    if (this.map2Instance) {
      if (this.app.ticker) {
        this.app.ticker.remove(this.updateMap2);
      }
      this.map2Instance.destroy();
      this.map2Instance = null;
    }
    
    // Clean up mapX instance if it exists
    if (this.mapXInstance) {
      if (this.app.ticker) {
        this.app.ticker.remove(this.updateMapX);
      }
      this.mapXInstance.destroy();
      this.mapXInstance = null;
    }
    
    // Clear follow target reference
    if (this.app && this.app.followTarget) {
      this.app.followTarget = null;
    }
    
    // Clean up portal manager
    if (this.portalManager) {
      if (this.app && this.app.ticker) {
        this.app.ticker.remove(this.updatePortals);
      }
      this.portalManager.destroy();
      this.portalManager = null;
    }
    
    // Destroy character
    if (this.character) {
      this.character.destroy();
      this.character = null;
    }
    
    // Destroy pet
    if (this.pet) {
      this.pet.destroy();
      this.pet = null;
    }
    
    // Destroy camera
    if (this.camera) {
      this.camera.destroy();
      this.camera = null;
    }
    
    // Remove UI layer
    if (this.uiLayer && this.uiLayer.parent) {
      this.uiLayer.parent.removeChild(this.uiLayer);
      this.uiLayer.destroy({ children: true });
      this.uiLayer = null;
    }
    
    // Remove and destroy map container
    if (this.mapContainer && this.mapContainer.parent) {
      this.mapContainer.parent.removeChild(this.mapContainer);
      this.mapContainer.destroy({ children: true });
      this.mapContainer = null;
    }
      // Reset current map
    this.currentMap = null;
  }
  
  /**
   * Get the current map instance (the actual map object, not just the ID)
   * This allows debug console access via window.game.mapManager.currentMapInstance
   */
  get currentMapInstance() {
    switch(this.currentMap) {
      case 'maparea0':
        return this.map0Instance;
      case 'maparea1':
        return this.map1Instance;
      case 'maparea2':
        return this.map2Instance;
      case 'mapareax':
        return this.mapXInstance;
      default:
        return null;
    }
  }

  /**
   * Get the spawn point for the current map (center for map1 and map2, initial position for others)
   * This is used by debug functions to teleport to spawn
   */
  getCurrentMapSpawnPoint() {
    const mapConfig = this.mapConfigs[this.currentMap];
    if (!mapConfig) {
      return { x: 100, y: 100 }; // Fallback position
    }

    // Use the configured initial position for all maps to ensure consistency
    // This ensures teleport to spawn uses the same position as initial map load
    return mapConfig.initialCharPos;
  }

  destroy() {
    this.unloadCurrentMap();
    this.mapConfigs = null;
    this.onMapChanged = null;
  }
}
