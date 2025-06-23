/**
 * BasePropGenerator - Base class for map prop generators
 * Provides common functionality for generating map props
 */
export default class BasePropGenerator {
  /**
   * Create a new prop generator
   * @param {number} tileSize - The size of a single map tile
   * @param {object} config - Configuration options
   */
  constructor(tileSize, config = {}) {
    this.tileSize = tileSize;
    this.config = {
      propDensity: config.propDensity || 1.0,
      maxPropsPerTile: config.maxPropsPerTile || 5,
      propTypes: config.propTypes || [],
      texturePath: config.texturePath || ''
    };
    
    // Seed for deterministic randomness
    this.seed = config.seed || 12345;
  }
  
  /**
   * Get a seeded random number
   * @returns {number} Random number between 0 and 1
   */
  seededRandom() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  
  /**
   * Generate props for a visible area around a tile
   * @param {number} centerTileX - Center tile X coordinate
   * @param {number} centerTileY - Center tile Y coordinate
   * @returns {Array} Array of prop objects
   */
  getVisibleAreaProps(centerTileX, centerTileY) {
    const props = [];
    const radius = 2; // Load props within 2 tiles of center
    
    for (let y = centerTileY - radius; y <= centerTileY + radius; y++) {
      for (let x = centerTileX - radius; x <= centerTileX + radius; x++) {
        // Generate props for this tile
        const tileProps = this.getPropsForTile(x, y);
        props.push(...tileProps);
      }
    }
    
    return props;
  }
  
  /**
   * Generate props for a specific tile
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Array} Array of prop objects
   */
  getPropsForTile(tileX, tileY) {
    // Re-seed based on tile coordinates for deterministic generation
    this.seed = (tileX * 13337 + tileY * 51234) % 99991;
    
    const props = [];
    const numProps = Math.floor(this.seededRandom() * this.config.maxPropsPerTile * this.config.propDensity);
    
    for (let i = 0; i < numProps; i++) {
      // Get random position within tile
      const offsetX = this.seededRandom() * this.tileSize;
      const offsetY = this.seededRandom() * this.tileSize;
      
      // Calculate world position
      const worldX = tileX * this.tileSize + offsetX;
      const worldY = tileY * this.tileSize + offsetY;
      
      // Get random prop type
      const propTypeIndex = Math.floor(this.seededRandom() * this.config.propTypes.length);
      const propType = this.config.propTypes[propTypeIndex];
      
      if (!propType) continue;
      
      // Create prop
      const prop = {
        x: worldX,
        y: worldY,
        texturePath: `${this.config.texturePath}${propType.file}`,
        scale: propType.scale || 1.0,
        rotation: this.seededRandom() * 360,
        zIndex: propType.zIndex || 1
      };
      
      props.push(prop);
    }
    
    return props;
  }
  
  /**
   * Generate props around the portal
   * @param {number} portalX - Portal X coordinate
   * @param {number} portalY - Portal Y coordinate
   * @returns {Array} Array of prop objects
   */
  getPortalAreaProps(portalX, portalY) {
    const tileX = Math.floor(portalX / this.tileSize);
    const tileY = Math.floor(portalY / this.tileSize);
    
    // Generate props for portal area (current tile + adjacent tiles)
    const props = [];
    for (let y = tileY - 1; y <= tileY + 1; y++) {
      for (let x = tileX - 1; x <= tileX + 1; x++) {
        if (x === tileX && y === tileY) {
          // For the tile containing the portal, add portal-specific props
          const portalProps = this.getPortalTileProps(portalX, portalY);
          props.push(...portalProps);
        } else {
          // For adjacent tiles, add regular props
          const tileProps = this.getPropsForTile(x, y);
          props.push(...tileProps);
        }
      }
    }
    
    return props;
  }
  
  /**
   * Generate props specifically for the portal tile
   * @param {number} portalX - Portal X coordinate
   * @param {number} portalY - Portal Y coordinate
   * @returns {Array} Array of prop objects
   */
  getPortalTileProps(portalX, portalY) {
    // This implementation can be overridden in child classes
    // By default, return an empty array
    return [];
  }
}
