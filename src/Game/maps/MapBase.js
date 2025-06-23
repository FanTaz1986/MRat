import * as PIXI from 'pixi.js';

/**
 * BaseMap - Abstract base class for all map implementations 
 * Defines the common functionality that all maps should implement
 */
export default class MapBase {
  constructor(app, mapId, mapSize) {
    this.app = app;
    this.mapId = mapId;
    this.mapSize = mapSize;
    this.props = [];
    this.obstacles = [];
    this.layers = {
      background: new PIXI.Container(),
      props: new PIXI.Container(),
      character: new PIXI.Container(),
      foreground: new PIXI.Container(),
      ui: new PIXI.Container()
    };
    
    // Enable sortable children for props layer
    this.layers.props.sortableChildren = true;
  }
  
  /**
   * Initialize map containers and layers
   * @param {PIXI.Container} mapContainer - The main container for this map
   */
  initialize(mapContainer) {
    // Add layers to map container
    mapContainer.addChild(this.layers.background);
    mapContainer.addChild(this.layers.props);
    mapContainer.addChild(this.layers.character); 
    mapContainer.addChild(this.layers.foreground);
    
    // UI layer is added separately to the stage, as it doesn't move with camera
  }
  
  /**
   * Initialize the map background with a sprite
   * @param {string} backgroundImagePath - Path to the background image 
   */
  initBackground(backgroundImagePath) {
    const background = PIXI.Sprite.from(backgroundImagePath);
    background.width = this.mapSize;
    background.height = this.mapSize;
    this.layers.background.addChild(background);
  }
  
  /**
   * Load map-specific props - should be overridden by subclasses
   */
  loadProps() {
    console.warn('loadProps() not implemented for this map type');
  }
  
  /**
   * Add obstacles to the map - should be overridden by subclasses
   */
  addObstacles() {
    console.warn('addObstacles() not implemented for this map type');
  }
  
  /**
   * Get map boundaries
   * @returns {Object} Map boundaries object with minX, maxX, minY, maxY
   */
  getBounds() {
    return {
      minX: 96,
      maxX: this.mapSize - 96,
      minY: 96,
      maxY: this.mapSize - 96
    };
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
   * Update logic for the map
   * @param {number} delta - Time since last update
   */
  update(delta) {
    // Override in subclasses for map-specific updates
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
    
    // Clean up layers
    for (const layerName in this.layers) {
      const layer = this.layers[layerName];
      if (layer && layer.parent) {
        layer.parent.removeChild(layer);
        layer.destroy({children: true});
      }
    }
  }
}
