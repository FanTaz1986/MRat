/**
 * MapXPropGenerator - A utility class for generating and managing props for MapX
 * Based on the original mappropsX.js file, adapted for the new PixiJS architecture
 */

export default class MapXPropGenerator {
  constructor(mapSize) {
    this.mapSize = mapSize;
      // Available props for MapX - just a single crystal prop
    this.propFiles = ["1A.png"];
  }
  
  /**
   * Get all props for the cave map
   * @returns {Array} Array of all prop objects
   */
  getAllProps() {
    // Generate 7 to 11 props randomly across the entire map
    const minProps = 7;
    const maxProps = 11;
    
    // Create seed for consistent generation
    let seed = 12345;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const count = minProps + Math.floor(seededRandom() * (maxProps - minProps + 1));
    const props = [];
      for (let i = 0; i < count; i++) {
      const x = Math.floor(seededRandom() * (this.mapSize - 128)) + 64;
      const y = Math.floor(seededRandom() * (this.mapSize - 128)) + 64;
      const scale = 0.15 + seededRandom() * 0.10; // 0.15 to 0.25 (15% to 25%)
      const rotation = seededRandom() < 0.5 ? 0 : 180; // 0° or 180°
      const mirrored = seededRandom() < 0.5; // 50% chance to be mirrored (horizontal flip)
      const zIndex = Math.floor(2 + seededRandom() * 3); // Dynamic z-indexing
      
      props.push({
        file: this.propFiles[0],
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
