/**
 * MapXPropGenerator - A utility class for generating and managing props for MapX
 * Based on the original mappropsX.js file, adapted for the new PixiJS architecture
 */

export default class MapXPropGenerator {
  constructor(mapSize, gameSeed = null) {
    this.mapSize = mapSize;
    this.gameSeed = gameSeed || 12345; // Use provided game seed or default
    // Available props for MapX - using 1B, 2B, 3B props (3x variety)
    this.propFiles = ["1B.png", "2B.png", "3B.png"];
  }
  
  /**
   * Get all props for the cave map
   * @returns {Array} Array of all prop objects
   */
  getAllProps() {
    // Generate 32 to 50 props randomly across the entire map (3x more + 50% extra than original 7-11)
    const minProps = 32;
    const maxProps = 50;
    
    // Create seed for consistent generation using game seed
    let seed = this.gameSeed;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = minProps + Math.floor(seededRandom() * (maxProps - minProps + 1));
    const props = [];
    
    for (let i = 0; i < count; i++) {
      const x = Math.floor(seededRandom() * (this.mapSize - 384)) + 192; // Adjusted for larger props
      const y = Math.floor(seededRandom() * (this.mapSize - 384)) + 192; // Adjusted for larger props
      
      // Randomly select from 1B, 2B, 3B props first to get correct dimensions
      const propFile = this.propFiles[Math.floor(seededRandom() * this.propFiles.length)];
      
      // Original prop dimensions
      const propDimensions = {
        "1B.png": { width: 504, height: 740 },
        "2B.png": { width: 311, height: 421 },
        "3B.png": { width: 541, height: 899 }
      };
      
      const originalDimensions = propDimensions[propFile];
      
      // Target size: 37.5% to 150% of character height (164px) - 50% larger than before
      const characterHeight = 164;
      const minTargetHeight = characterHeight * 0.375; // 61.5px (was 41px)
      const maxTargetHeight = characterHeight * 1.5;   // 246px (was 164px)
      
      // Random target height between 25% and 100% of character height
      const targetHeight = minTargetHeight + seededRandom() * (maxTargetHeight - minTargetHeight);
      
      // Calculate scale based on original prop height to achieve target height
      const scale = targetHeight / originalDimensions.height;
      
      // Simple rotation: normal (0°) or flipped (180°) only
      const rotation = seededRandom() < 0.5 ? 0 : 180;
      
      // Mirroring (horizontal flip) - 50% chance
      const mirrored = seededRandom() < 0.5;
      
      const zIndex = Math.floor(2 + seededRandom() * 3); // Dynamic z-indexing
      
      props.push({
        file: propFile,
        x,
        y,
        scale,
        rotation,
        mirrored,
        zIndex
      });
    }
    
    return props;
  }
}
