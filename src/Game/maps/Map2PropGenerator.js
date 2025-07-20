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
   * @param {number} gameSeed - Seed for random generation (ensures consistent layouts within game session)
   */
  constructor(tileWidth, tileHeight = null, gameSeed = null) {
    // For backwards compatibility, if only one parameter is passed, use it for both
    const actualTileHeight = tileHeight || tileWidth;
    
    // Call base class constructor with configuration for Map2
    super(tileWidth, {
      propDensity: 1.0,
      maxPropsPerTile: 30, // High prop density
      texturePath: "/2MAP/Props/",
      seed: gameSeed || 12345 // Use provided game seed or default
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
    
    // C-type props for portal areas (no special tint)
    this.portalProps = [
      { file: "1C.png", baseScale: 1.0, zIndex: 2, type: "prop" },
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
        
        // Create A prop
        const prop = {
          x: worldX,
          y: worldY,
          texturePath: `/2MAP/Props/${propType.file}`,
          scale: finalScale,
          rotation: 0,
          mirrored: mirrored,
          zIndex: propType.zIndex || 1,
          alpha: 1.0,
          tint: 0xFFFFFF
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
        
        // Create C prop
        const prop = {
          x: worldX,
          y: worldY,
          texturePath: `/2MAP/Props/${propType.file}`,
          scale: finalScale,
          rotation: 0,
          mirrored: mirrored,
          zIndex: propType.zIndex || 1,
          alpha: 1.0,
          tint: 0xFFFFFF
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
      
      // Create prop with texture path
      const prop = {
        x: worldX,
        y: worldY,
        texturePath: `/2MAP/Props/${propType.file}`,
        scale: finalScale,
        rotation: rotation,
        mirrored: mirrored,
        zIndex: propType.zIndex || 1,
        alpha: 1.0,
        tint: 0xFFFFFF
      };
      
      props.push(prop);
    }
    
    if (this.portalTiles.has(tileKey)) {
      // This should not be reached since portal tiles return early
      debugLog(`ERROR: Portal tile logic fallthrough for tile (${tileX},${tileY})`, 'map');
    } else {
      debugLog(`Tile (${tileX},${tileY}): Generated ${props.length} A props with random scales 100%-250%`, 'map');
    }

    // Add portal-finding props based on proximity to portals
    const proximity = this.getPortalProximity(tileX, tileY);
    
    if (proximity.adjacent) {
      // Adjacent to portal: add 2-3 portal area props (using C-type props)
      const portalPropCount = 2 + Math.floor(this.seededRandom() * 2); // 2-3 props
      for (let i = 0; i < portalPropCount; i++) {
        // Random position within the tile
        const offsetX = this.seededRandom() * (this.tileWidth - 200) + 100; // Leave 100px margin
        const offsetY = this.seededRandom() * (this.tileHeight - 200) + 100; // Leave 100px margin
        const worldX = tileX * this.tileWidth + offsetX;
        const worldY = tileY * this.tileHeight + offsetY;
        
        // Use proper portal area props (C-type props) instead of portal sprites
        const portalPropTemplate = this.portalProps[Math.floor(this.seededRandom() * this.portalProps.length)];
        
        // Apply same scaling rules as normal props (100% to 250%)
        const randomScale = 1.0 + this.seededRandom() * 1.5;
        const finalScale = portalPropTemplate.baseScale * randomScale;
        
        const portalProp = {
          x: worldX,
          y: worldY,
          texturePath: `/2MAP/Props/${portalPropTemplate.file}`,
          scale: finalScale, // Use proper scaling rules
          rotation: 0, // No rotation
          mirrored: this.seededRandom() < 0.5,
          zIndex: portalPropTemplate.zIndex,
          alpha: 1.0, // Normal alpha, no transparency
          tint: 0xFFFFFF // Normal white tint, no special effects
        };
        props.push(portalProp);
      }
    } else if (proximity.oneAway) {
      // One tile away from portal: add 1 portal area prop (using C-type props)
      const offsetX = this.seededRandom() * (this.tileWidth - 200) + 100;
      const offsetY = this.seededRandom() * (this.tileHeight - 200) + 100;
      const worldX = tileX * this.tileWidth + offsetX;
      const worldY = tileY * this.tileHeight + offsetY;
      
      // Use proper portal area props (C-type props) instead of portal sprites
      const portalPropTemplate = this.portalProps[Math.floor(this.seededRandom() * this.portalProps.length)];
      
      // Apply same scaling rules as normal props (100% to 250%)
      const randomScale = 1.0 + this.seededRandom() * 1.5;
      const finalScale = portalPropTemplate.baseScale * randomScale;
      
      const portalProp = {
        x: worldX,
        y: worldY,
        texturePath: `/2MAP/Props/${portalPropTemplate.file}`,
        scale: finalScale, // Use proper scaling rules
        rotation: 0, // No rotation
        mirrored: this.seededRandom() < 0.5,
        zIndex: portalPropTemplate.zIndex,
        alpha: 1.0, // Normal alpha, no transparency
        tint: 0xFFFFFF // Normal white tint, no special effects
      };
      props.push(portalProp);
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

  /**
   * Get portal proximity information for a tile
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @returns {Object} Proximity info {adjacent: boolean, oneAway: boolean}
   */
  getPortalProximity(tileX, tileY) {
    let adjacent = false;
    let oneAway = false;

    // Check all tiles within 2 tile radius
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue; // Skip the current tile
        
        const checkX = tileX + dx;
        const checkY = tileY + dy;
        
        // Ensure we're within map bounds
        if (checkX >= 0 && checkX < this.gridSize && checkY >= 0 && checkY < this.gridSize) {
          const checkKey = `${checkX},${checkY}`;
          
          if (this.portalTiles.has(checkKey)) {
            const distance = Math.abs(dx) + Math.abs(dy); // Manhattan distance
            
            if (distance === 1) {
              adjacent = true;
            } else if (distance === 2) {
              oneAway = true;
            }
          }
        }
      }
    }

    return { adjacent, oneAway };
  }
}
