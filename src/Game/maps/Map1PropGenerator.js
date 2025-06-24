import BasePropGenerator from './BasePropGenerator';
import { debugLog } from '../../development/utils/Debug';

/**
 * Map1PropGenerator - A prop generator for Map1
 * Extends BasePropGenerator to provide Map1-specific prop generation
 */
export default class Map1PropGenerator extends BasePropGenerator {
  /**
   * Create a new Map1PropGenerator
   * @param {number} tileWidth - The width of a single map tile (4200px)
   * @param {number} tileHeight - The height of a single map tile (2970px)
   */
  constructor(tileWidth, tileHeight = null) {
    // For backwards compatibility, if only one parameter is passed, use it for both
    const actualTileHeight = tileHeight || tileWidth;
    
    // Call base class constructor with configuration for Map1
    super(tileWidth, {
      propDensity: 1.0,
      maxPropsPerTile: 30, // Tripled from 10 to 30 props per tile
      texturePath: "/1MAP/Props/"
    });
    
    // Store tile dimensions
    this.tileWidth = tileWidth;
    this.tileHeight = actualTileHeight;
    
    // Override base class tileSize for compatibility (using width)
    this.tileSize = tileWidth;
    
    // Grid size is 16x16
    this.gridSize = 16;
    
    // A-type props for central map areas (trees made 100% larger - 2x scale)
    this.propTypesA = [
      { file: "1ABush.png", scale: 1.0, zIndex: 2, type: "bush" },
      { file: "1ATree.png", scale: 2.4, zIndex: 3, type: "tree" }, // 1.2 * 2 = 2.4 (100% larger)
      { file: "2ATree.png", scale: 2.2, zIndex: 3, type: "tree" }, // 1.1 * 2 = 2.2 (100% larger)
      { file: "3ATree.png", scale: 2.6, zIndex: 3, type: "tree" }, // 1.3 * 2 = 2.6 (100% larger)
      { file: "4Atree.png", scale: 2.4, zIndex: 3, type: "tree" }  // 1.2 * 2 = 2.4 (100% larger)
    ];
    
    // B-type props for outer map areas (trees made 100% larger - 2x scale)
    this.propTypesB = [
      { file: "1BBush.png", scale: 1.0, zIndex: 2, type: "bush" },
      { file: "1BTree.png", scale: 2.4, zIndex: 3, type: "tree" }, // 1.2 * 2 = 2.4 (100% larger)
      { file: "2BTree.png", scale: 2.2, zIndex: 3, type: "tree" }, // 1.1 * 2 = 2.2 (100% larger)
      { file: "3BTree.png", scale: 2.6, zIndex: 3, type: "tree" }  // 1.3 * 2 = 2.6 (100% larger)
    ];
    
    // C-type props for portal areas with enhanced visual distinction
    this.portalProps = [
      { file: "1CBush.png", scale: 1.0, zIndex: 2, type: "bush", tint: 0xE0FFFF }, // Light cyan tint
      { file: "1CTree.png", scale: 2.0, zIndex: 3, type: "tree", tint: 0xE6E6FA }, // Lavender tint
      { file: "2CBush.png", scale: 1.0, zIndex: 2, type: "bush", tint: 0xF0FFFF }, // Azure tint
      { file: "2CTree.png", scale: 2.0, zIndex: 3, type: "tree", tint: 0xF5F5DC }, // Beige tint
      { file: "3CTree.png", scale: 2.0, zIndex: 3, type: "tree", tint: 0xF0F8FF }  // Alice blue tint
    ];
    
    // Grass props (available in all areas)
    this.grassProps = [
      { file: "1Grass.png", scale: 1.0, zIndex: 1, type: "grass" },
      { file: "2Grass.png", scale: 1.0, zIndex: 1, type: "grass" },
      { file: "3Grass.png", scale: 1.0, zIndex: 1, type: "grass" },
      { file: "4Grass.png", scale: 1.0, zIndex: 1, type: "grass" }
    ];
    
    // Track portal tile locations
    this.portalTiles = new Set();
  }
  
  /**
   * Set portal tile locations
   * @param {Array} portalTiles - Array of {x, y} tile coordinates
   */
  setPortalTiles(portalTiles) {
    this.portalTiles.clear();
    debugLog(`Setting ${portalTiles.length} portal tiles`, 'map');
    portalTiles.forEach(tile => {
      const tileKey = `${tile.x},${tile.y}`;
      this.portalTiles.add(tileKey);
      debugLog(`Added portal tile: ${tileKey}`, 'map');
    });
    debugLog(`Portal tiles set: [${Array.from(this.portalTiles).join(', ')}]`, 'map');
  }
  
  /**
   * Generate props for a tile based on its position
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Array} Array of prop objects
   */
  getPropsForTile(tileX, tileY) {
    // Re-seed based on tile coordinates for deterministic generation
    this.seed = (tileX * 13337 + tileY * 51234) % 99991;
    
    // Generate between 15-30 props per tile (tripled from 5-10)
    const minProps = 15;
    const maxProps = 30;
    let numProps = minProps + Math.floor(this.seededRandom() * (maxProps - minProps + 1));
    
    const props = [];
    
    // Select prop types based on tile type
    let availableProps;
    const tileKey = `${tileX},${tileY}`;
    
    if (this.portalTiles.has(tileKey)) {
      // Portal tile - use ONLY C props (no grass or other props)
      availableProps = [...this.portalProps];
      debugLog(`Tile (${tileX},${tileY}) is a PORTAL TILE - using C props only`, 'map');
      
      // Reduce prop density in portal areas for cleaner, more mystical look
      const portalNumProps = Math.floor(numProps * 0.6); // 60% of normal density
      numProps = Math.max(8, portalNumProps); // Minimum 8 props for portal areas
      
    } else if (tileX >= 6 && tileX <= 9 && tileY >= 6 && tileY <= 9) {
      // Central 4x4 area (tiles 6-9, 6-9) - use A props
      availableProps = [...this.propTypesA, ...this.grassProps];
      debugLog(`Tile (${tileX},${tileY}) is in CENTRAL 4x4 area - using A props`, 'map');
    } else {
      // Outer area - use B props
      availableProps = [...this.propTypesB, ...this.grassProps];
    }
    
    for (let i = 0; i < numProps; i++) {
      // Get random position within tile
      const offsetX = this.seededRandom() * this.tileWidth;
      const offsetY = this.seededRandom() * this.tileHeight;
      
      // Calculate world position
      const worldX = tileX * this.tileWidth + offsetX;
      const worldY = tileY * this.tileHeight + offsetY;
      
      // Get random prop type
      const propTypeIndex = Math.floor(this.seededRandom() * availableProps.length);
      const propType = availableProps[propTypeIndex];
      
      if (!propType) continue;
      
      // Determine scale based on prop type
      let scale = propType.scale || 1.0;
      
      // Apply scaling based on prop type and context
      if (propType.type === "tree" && propType.file.includes("C")) {
        // C trees: random scale from 2.0 to 2.5
        scale = 2.0 + this.seededRandom() * 0.5;
      } else if (propType.type === "bush" || propType.type === "grass") {
        // Random scale between 100% and 200%
        scale = 1.0 + this.seededRandom() * 1.0;
      }

      // Enhanced visual effects for portal areas
      let alpha = 1.0;
      let tint = 0xFFFFFF; // Default white tint
      let rotation = 0;

      
      // Random mirroring (horizontal flip) for all props
      const mirrored = this.seededRandom() < 0.5; // 50% chance
      
      // Create prop with texture path and visual enhancements
      const prop = {
        x: worldX,
        y: worldY,
        texturePath: `/1MAP/Props/${propType.file}`,
        scale: scale,
        rotation: rotation, // Apply magical rotation for portal areas
        mirrored: mirrored,
        zIndex: propType.zIndex || 1,
        alpha: alpha, // Apply mystical alpha for portal areas
        tint: tint // Apply mystical tint for portal areas
      };
      
      props.push(prop);
    }
    
    return props;
  }
  
  /**
   * Generate all props for the entire map
   * @returns {Array} Array of all prop objects for the map
   */
  getAllProps() {
    const allProps = [];
    
    // Generate props for each tile in the 16x16 grid
    for (let tileX = 0; tileX < this.gridSize; tileX++) {
      for (let tileY = 0; tileY < this.gridSize; tileY++) {
        const tileProps = this.getPropsForTile(tileX, tileY);
        allProps.push(...tileProps);
      }
    }
    
    return allProps;
  }
}
