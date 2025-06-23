import BasePropGenerator from './BasePropGenerator';
import { debugLog } from '../../development/utils/Debug';

/**
 * Map2PropGenerator - A prop generator for Map2
 * Extends BasePropGenerator to provide Map2-specific prop generation
 */
export default class Map2PropGenerator extends BasePropGenerator {
  /**
   * Create a new Map2PropGenerator
   * @param {number} tileWidth - The width of a single map tile
   * @param {number} tileHeight - The height of a single map tile (defaults to tileWidth if not provided)
   */
  constructor(tileWidth, tileHeight = null) {
    // For backwards compatibility, if only one parameter is passed, use it for both
    const actualTileHeight = tileHeight || tileWidth;
    
    // Call base class constructor with configuration for Map2
    super(tileWidth, {
      propDensity: 1.0,
      maxPropsPerTile: 30, // High prop density
      texturePath: "/2MAP/Props/"
    });
    
    // Store tile dimensions
    this.tileWidth = tileWidth;
    this.tileHeight = actualTileHeight;
    
    // Override base class tileSize for compatibility (using width)
    this.tileSize = tileWidth;
    
    // Grid size is 16x16
    this.gridSize = 16;
    
    // A-type props used everywhere (all tiles including portals)
    this.propTypesA = [
      { file: "1A.png", baseScale: 1.0, zIndex: 2, type: "prop" },
      { file: "2A.png", baseScale: 1.0, zIndex: 2, type: "prop" },
      { file: "3A.png", baseScale: 1.0, zIndex: 3, type: "prop" },
      { file: "4A.png", baseScale: 1.0, zIndex: 2, type: "prop" },
      { file: "5A.png", baseScale: 1.0, zIndex: 3, type: "prop" }
    ];
    
    // C-type props for portal areas with enhanced visual distinction
    this.portalProps = [
      { file: "1C.png", baseScale: 1.0, zIndex: 2, type: "prop", tint: 0xE0FFFF }, // Light cyan tint
    ];
    
    // Track portal tile locations (same as Map1)
    this.portalTiles = new Set();
  }
  
  /**
   * Set portal tile locations (same as Map1)
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
    
    // Generate between 15-30 props per tile (randomly)
    const minProps = 15;
    const maxProps = 30;
    let numProps = minProps + Math.floor(this.seededRandom() * (maxProps - minProps + 1));
    
    const props = [];
    
    // Select prop types based on tile type (same logic as Map1)
    let availableProps;
    const tileKey = `${tileX},${tileY}`;
    
    if (this.portalTiles.has(tileKey)) {
      // Portal tile - generate both A props (8-15) and C props (8-15) separately
      debugLog(`Tile (${tileX},${tileY}) is a PORTAL TILE - generating 8-15 A props + 8-15 C props`, 'map');
      
      // Generate A props (8-15)
      const aPropsMin = 8;
      const aPropsMax = 15;
      const numAProps = aPropsMin + Math.floor(this.seededRandom() * (aPropsMax - aPropsMin + 1));
      
      // Generate C props (8-15)
      const cPropsMin = 8;
      const cPropsMax = 15;
      const numCProps = cPropsMin + Math.floor(this.seededRandom() * (cPropsMax - cPropsMin + 1));
      
      // First, generate A props
      for (let i = 0; i < numAProps; i++) {
        // Get random position within tile
        const offsetX = this.seededRandom() * this.tileWidth;
        const offsetY = this.seededRandom() * this.tileHeight;
        
        // Calculate world position
        const worldX = tileX * this.tileWidth + offsetX;
        const worldY = tileY * this.tileHeight + offsetY;
        
        // Get random A prop type
        const propTypeIndex = Math.floor(this.seededRandom() * this.propTypesA.length);
        const propType = this.propTypesA[propTypeIndex];
        
        if (!propType) continue;
        
        // Random scale from 100% to 250% (1.0 to 2.5)
        const randomScale = 1.0 + this.seededRandom() * 1.5;
        const finalScale = propType.baseScale * randomScale;
        
        // Random mirroring (horizontal flip)
        const mirrored = this.seededRandom() < 0.5; // 50% chance
        
        // Portal area visual enhancements for A props
        const alpha = 0.85 + this.seededRandom() * 0.15; // 85% to 100% alpha
        
        // Create A prop
        const prop = {
          x: worldX,
          y: worldY,
          texturePath: `/2MAP/Props/${propType.file}`,
          scale: finalScale,
          rotation: 0,
          mirrored: mirrored,
          zIndex: propType.zIndex || 1,
          alpha: alpha,
          tint: 0xFFFFFF // Default white tint for A props
        };
        
        props.push(prop);
      }
      
      // Then, generate C props
      for (let i = 0; i < numCProps; i++) {
        // Get random position within tile
        const offsetX = this.seededRandom() * this.tileWidth;
        const offsetY = this.seededRandom() * this.tileHeight;
        
        // Calculate world position
        const worldX = tileX * this.tileWidth + offsetX;
        const worldY = tileY * this.tileHeight + offsetY;
        
        // Get random C prop type
        const propTypeIndex = Math.floor(this.seededRandom() * this.portalProps.length);
        const propType = this.portalProps[propTypeIndex];
        
        if (!propType) continue;
        
        // Random scale from 100% to 250% (1.0 to 2.5)
        const randomScale = 1.0 + this.seededRandom() * 1.5;
        const finalScale = propType.baseScale * randomScale;
        
        // Random mirroring (horizontal flip)
        const mirrored = this.seededRandom() < 0.5; // 50% chance
        
        // Portal area visual enhancements for C props
        const alpha = 0.85 + this.seededRandom() * 0.15; // 85% to 100% alpha
        const tint = propType.tint || 0xFFFFFF; // Cyan tint for C props
        
        // Create C prop
        const prop = {
          x: worldX,
          y: worldY,
          texturePath: `/2MAP/Props/${propType.file}`,
          scale: finalScale,
          rotation: 0,
          mirrored: mirrored,
          zIndex: propType.zIndex || 1,
          alpha: alpha,
          tint: tint // Apply cyan tint for C props
        };
        
        props.push(prop);
      }
      
      debugLog(`Tile (${tileX},${tileY}): Generated ${numAProps} A props + ${numCProps} C props = ${props.length} total props for PORTAL`, 'map');
      return props;
      
    } else {
      // Regular tile - use A props
      availableProps = [...this.propTypesA];
      debugLog(`Tile (${tileX},${tileY}) is a regular tile - using A props`, 'map');
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
      
      // Random scale from 100% to 250% (1.0 to 2.5) - same scaling for both A and C props
      const randomScale = 1.0 + this.seededRandom() * 1.5; // 1.0 to 2.5
      const finalScale = propType.baseScale * randomScale;
      
      // Random mirroring (horizontal flip)
      const mirrored = this.seededRandom() < 0.5; // 50% chance
      
      // No rotation for Map2 props (keep them upright)
      const rotation = 0;
      
      // Enhanced visual effects for portal areas (same as Map1)
      let alpha = 1.0;
      let tint = 0xFFFFFF; // Default white tint
      
      if (this.portalTiles.has(tileKey)) {
        // Portal area visual enhancements (same as Map1)
        
        // 1. Subtle magical glow effect (higher alpha for mystical look)
        alpha = 0.85 + this.seededRandom() * 0.15; // 85% to 100% alpha for subtle translucency
        
        // 2. Apply mystical tint if specified in prop type
        if (propType.tint) {
          tint = propType.tint;
        }
      }
      
      // Create prop with texture path
      const prop = {
        x: worldX,
        y: worldY,
        texturePath: `/2MAP/Props/${propType.file}`,
        scale: finalScale,
        rotation: rotation,
        mirrored: mirrored,
        zIndex: propType.zIndex || 1,
        alpha: alpha, // Apply mystical alpha for portal areas
        tint: tint // Apply mystical tint for portal areas
      };
      
      props.push(prop);
    }
    
    if (this.portalTiles.has(tileKey)) {
      // This should not be reached since portal tiles return early
      debugLog(`ERROR: Portal tile logic fallthrough for tile (${tileX},${tileY})`, 'map');
    } else {
      debugLog(`Tile (${tileX},${tileY}): Generated ${props.length} A props with random scales 100%-250%`, 'map');
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
    
    debugLog(`Map2PropGenerator: Generated total of ${allProps.length} props across all tiles`, 'map');
    return allProps;
  }

  /**
   * Legacy method for portal tile props (now updated to use C props for portal tiles)
   * @param {number} portalX - Portal X coordinate
   * @param {number} portalY - Portal Y coordinate
   * @returns {Array} Array of prop objects for the portal area
   */
  getPortalTileProps(portalX, portalY) {
    // Convert world coordinates to tile coordinates
    const tileX = Math.floor(portalX / this.tileWidth);
    const tileY = Math.floor(portalY / this.tileHeight);
    
    // Use the main prop generation method for this tile
    return this.getPropsForTile(tileX, tileY);
  }
}
