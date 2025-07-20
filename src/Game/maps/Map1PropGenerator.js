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
   * @param {number} gameSeed - Seed for random generation (ensures consistent layouts within game session)
   */
  constructor(tileWidth, tileHeight = null, gameSeed = null) {
    // For backwards compatibility, if only one parameter is passed, use it for both
    const actualTileHeight = tileHeight || tileWidth;
    
    // Call base class constructor with configuration for Map1
    super(tileWidth, {
      propDensity: 1.0,
      maxPropsPerTile: 30, // Tripled from 10 to 30 props per tile
      texturePath: "/1MAP/Props/",
      seed: gameSeed || 12345 // Use provided game seed or default
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
    
    // C-type props for portal areas (simplified, no visual enhancements)
    this.portalProps = [
      { file: "1CBush.png", scale: 1.0, zIndex: 2, type: "bush" },
      { file: "1CTree.png", scale: 2.0, zIndex: 3, type: "tree" },
      { file: "2CBush.png", scale: 1.0, zIndex: 2, type: "bush" },
      { file: "2CTree.png", scale: 2.0, zIndex: 3, type: "tree" },
      { file: "3CTree.png", scale: 2.0, zIndex: 3, type: "tree" }
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
   * Check if a tile is in proximity to a portal
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Object} Object with proximity flags
   */
  getPortalProximity(tileX, tileY) {
    const tileKey = `${tileX},${tileY}`;
    const isPortalTile = this.portalTiles.has(tileKey);
    
    // Check if adjacent to any portal tile (8-directional)
    let isAdjacentToPortal = false;
    let isOneAwayFromPortal = false;
    
    debugLog(`Checking portal proximity for tile (${tileX},${tileY}), portal tiles: [${Array.from(this.portalTiles).join(', ')}]`, 'map');
    
    for (const portalTileKey of this.portalTiles) {
      const [portalX, portalY] = portalTileKey.split(',').map(Number);
      
      const dx = Math.abs(tileX - portalX);
      const dy = Math.abs(tileY - portalY);
      const maxDistance = Math.max(dx, dy); // Chebyshev distance
      
      debugLog(`  Portal at (${portalX},${portalY}): dx=${dx}, dy=${dy}, maxDistance=${maxDistance}`, 'map');
      
      if (maxDistance === 1) {
        isAdjacentToPortal = true;
        debugLog(`  → Adjacent to portal at (${portalX},${portalY})`, 'map');
      } else if (maxDistance === 2) {
        isOneAwayFromPortal = true;
        debugLog(`  → One tile away from portal at (${portalX},${portalY})`, 'map');
      }
    }
    
    const result = { isPortalTile, isAdjacentToPortal, isOneAwayFromPortal };
    debugLog(`Portal proximity result for (${tileX},${tileY}): ${JSON.stringify(result)}`, 'map');
    return result;
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
    
    // NEW FEATURE: Check if this tile is around a portal for portal-finding props
    const { isPortalTile, isAdjacentToPortal, isOneAwayFromPortal } = this.getPortalProximity(tileX, tileY);
    
    if (isPortalTile) {
      // Portal tile - use ONLY C props (no grass or other props)
      availableProps = [...this.portalProps];
      debugLog(`Tile (${tileX},${tileY}) is a PORTAL TILE - using C props only`, 'map');
      
      // Reduce prop density in portal areas for cleaner, more mystical look
      const portalNumProps = Math.floor(numProps * 0.6); // 60% of normal density
      numProps = Math.max(8, portalNumProps); // Minimum 8 props for portal areas
      
    } else if (isAdjacentToPortal) {
      // Adjacent to portal - add 2-3 portal props + normal props
      debugLog(`Tile (${tileX},${tileY}) is ADJACENT to portal - adding 2-3 portal props + normal props`, 'map');
      
      // Determine normal props based on location
      if (tileX >= 6 && tileX <= 9 && tileY >= 6 && tileY <= 9) {
        availableProps = [...this.propTypesA, ...this.grassProps];
      } else {
        availableProps = [...this.propTypesB, ...this.grassProps];
      }
      
    } else if (isOneAwayFromPortal) {
      // One tile away from portal - add 1 portal prop + normal props
      debugLog(`Tile (${tileX},${tileY}) is ONE TILE AWAY from portal - adding 1 portal prop + normal props`, 'map');
      
      // Determine normal props based on location
      if (tileX >= 6 && tileX <= 9 && tileY >= 6 && tileY <= 9) {
        availableProps = [...this.propTypesA, ...this.grassProps];
      } else {
        availableProps = [...this.propTypesB, ...this.grassProps];
      }
      
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
      
      // Create prop with texture path (no special effects)
      const prop = {
        x: worldX,
        y: worldY,
        texturePath: `/1MAP/Props/${propType.file}`,
        scale: scale,
        rotation: rotation, // No rotation applied
        mirrored: mirrored,
        zIndex: propType.zIndex || 1,
        alpha: alpha, // Normal alpha
        tint: tint // Normal white tint
      };
      
      props.push(prop);
    }
    
    // Add portal-finding props based on proximity to portals
    const proximity = this.getPortalProximity(tileX, tileY);
    
    if (proximity.isAdjacentToPortal) {
      debugLog(`Tile (${tileX},${tileY}): Adding ${2 + Math.floor(this.seededRandom() * 2)} portal area props (adjacent to portal)`, 'map');
      // Adjacent to portal: add 2-3 portal area props (using C-type props with special tinting)
      const portalPropCount = 2 + Math.floor(this.seededRandom() * 2); // 2-3 props
      for (let i = 0; i < portalPropCount; i++) {
        // Random position within the tile
        const offsetX = this.seededRandom() * 1900; // Leave 200px margin on each side
        const offsetY = this.seededRandom() * 1285; // Leave 200px margin on each side
        const worldX = tileX * 2100 + 100 + offsetX;
        const worldY = tileY * 1485 + 100 + offsetY;
        
        // Use proper portal area props (C-type props) instead of portal sprites
        const portalPropTemplate = this.portalProps[Math.floor(this.seededRandom() * this.portalProps.length)];
        
        // Apply same scaling rules as normal props
        let scale = portalPropTemplate.scale || 1.0;
        if (portalPropTemplate.type === "tree" && portalPropTemplate.file.includes("C")) {
          // C trees: random scale from 2.0 to 2.5
          scale = 2.0 + this.seededRandom() * 0.5;
        } else if (portalPropTemplate.type === "bush" || portalPropTemplate.type === "grass") {
          // Random scale between 100% and 200%
          scale = 1.0 + this.seededRandom() * 1.0;
        }
        
        const portalProp = {
          x: worldX,
          y: worldY,
          texturePath: `/1MAP/Props/${portalPropTemplate.file}`,
          scale: scale, // Use proper scaling rules
          rotation: 0, // No rotation
          mirrored: this.seededRandom() < 0.5,
          zIndex: portalPropTemplate.zIndex,
          alpha: 1.0, // Normal alpha, no transparency
          tint: 0xFFFFFF // Normal white tint, no special effects
        };
        props.push(portalProp);
        debugLog(`Tile (${tileX},${tileY}): Added portal area prop ${i+1}/${portalPropCount} (${portalPropTemplate.file}) at (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`, 'map');
      }
    } else if (proximity.isOneAwayFromPortal) {
      debugLog(`Tile (${tileX},${tileY}): Adding 1 portal area prop (one tile away from portal)`, 'map');
      // One tile away from portal: add 1 portal area prop (using C-type props with special tinting)
      const offsetX = this.seededRandom() * 1900;
      const offsetY = this.seededRandom() * 1285;
      const worldX = tileX * 2100 + 100 + offsetX;
      const worldY = tileY * 1485 + 100 + offsetY;
      
      // Use proper portal area props (C-type props) instead of portal sprites
      const portalPropTemplate = this.portalProps[Math.floor(this.seededRandom() * this.portalProps.length)];
      
      // Apply same scaling rules as normal props
      let scale = portalPropTemplate.scale || 1.0;
      if (portalPropTemplate.type === "tree" && portalPropTemplate.file.includes("C")) {
        // C trees: random scale from 2.0 to 2.5
        scale = 2.0 + this.seededRandom() * 0.5;
      } else if (portalPropTemplate.type === "bush" || portalPropTemplate.type === "grass") {
        // Random scale between 100% and 200%
        scale = 1.0 + this.seededRandom() * 1.0;
      }
      
      const portalProp = {
        x: worldX,
        y: worldY,
        texturePath: `/1MAP/Props/${portalPropTemplate.file}`,
        scale: scale, // Use proper scaling rules
        rotation: 0, // No rotation
        mirrored: this.seededRandom() < 0.5,
        zIndex: portalPropTemplate.zIndex,
        alpha: 1.0, // Normal alpha, no transparency
        tint: 0xFFFFFF // Normal white tint, no special effects
      };
      props.push(portalProp);
      debugLog(`Tile (${tileX},${tileY}): Added distant portal area prop (${portalPropTemplate.file}) at (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`, 'map');
    } else if (proximity.isPortalTile) {
      debugLog(`Tile (${tileX},${tileY}): Is portal tile - no portal-finding props needed`, 'map');
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
