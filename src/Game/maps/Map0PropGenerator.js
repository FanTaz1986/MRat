/**
 * Map0PropGenerator - A utility class for generating and managing props for Map0
 * This is a more advanced version of the original mapprops0.js file
 * Modified to only use 1A.png and 2A.png rocks with random rotation and size
 */

export default class Map0PropGenerator {
  constructor(mapSize) {
    this.mapSize = mapSize;
    
    // Available props for Map0 - only using rock props (1A.png and 2A.png)
    this.propFiles = {
      rocks: ["1A.png", "2A.png"]
    };
  }  /**
   * Generate props for a specific tile area
   * @param {string} tileKey - Key to seed random generation
   * @param {Object} options - Options for prop generation
   * @returns {Array} Array of prop objects
   */
  generateProps(tileKey, options = {}) {
    const {
      density = 'low', // Changed from medium to low to reduce props by 50%
      // Adjusted to only use bottom 25% of map as playable area
      yStart = this.mapSize * 0.75,
      yEnd = this.mapSize - 64,
      // Expanded scale range to 50%-200% as required
      scaleRange = { min: 0.5, max: 2.0 }
    } = options;
      // No duplicate portal location declaration here - moved to below
    
    // Create seed from tile key
    let seed = 0;
    for (let i = 0; i < tileKey.length; i++) {
      seed += tileKey.charCodeAt(i);
    }
    
    // Seeded random function
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };    // Further reduce prop count by 50% as requested
    const densityMap = {
      low: 2, // Reduced from 3 to 2 (50% reduction)
      medium: 3, // Reduced from 5 to 3 (40% reduction)
      high: 4 // Reduced from 8 to 4 (50% reduction)
    };
    const count = densityMap[density] || densityMap.low; // Default to low density now
    
    // Generate prop array
    const props = [];
    
    // Use only rock props (1A.png and 2A.png)
    const availableProps = this.propFiles.rocks;
    
    // Get portal position (approximately 90% of width, 90% of height)
    const portalX = this.mapSize * 0.90;
    const portalY = this.mapSize - this.mapSize * 0.10;
    
    // Clear area around portal - increased to 300 units for better visibility
    const portalClearRadius = 300; // Much larger clear area around portal
    
    // Generate random props
    for (let i = 0; i < count; i++) {
      // X coordinate spans full width (0-100%)
      const x = Math.floor(seededRandom() * (this.mapSize - 128)) + 64;
      // Y coordinate only in bottom 25% of map
      const y = Math.floor(seededRandom() * (yEnd - yStart)) + yStart;
      
      // Skip props that are too close to the portal
      const distToPortal = Math.sqrt(Math.pow(x - portalX, 2) + Math.pow(y - portalY, 2));
      if (distToPortal < portalClearRadius) {
        // Try again with this prop
        i--;
        continue;
      }
      
      // Non-linear scaling - favor smaller rocks (more 50% rocks, fewer 200%)
      // Use a power function to bias toward smaller scales
      const scalePower = 2.5; // Higher value = more bias toward smaller scales
      const scaleRandom = Math.pow(seededRandom(), scalePower);
      const scale = scaleRange.min + scaleRandom * (scaleRange.max - scaleRange.min);
        // Random rotation as required
      const rotation = Math.floor(seededRandom() * 360);
      const propIndex = Math.floor(seededRandom() * availableProps.length);
      
      // Random mirroring (horizontal flip) - 50% chance
      const mirrored = seededRandom() < 0.5;
      
      // Vary z-index based on y position for better depth perception
      // Props further back (higher on screen) should be "behind" props closer to player
      const normalizedY = (y - yStart) / (yEnd - yStart); // 0 = top, 1 = bottom of play area
      const zIndex = Math.floor(1 + normalizedY * 4); // 1-5 based on position
      
      props.push({
        file: availableProps[propIndex],
        x,
        y,
        scale,
        rotation,
        zIndex,
        mirrored
      });
    }
    
    // Add special landmark props if requested
    if (options.addLandmarks) {
      const landmarks = this.generateLandmarks(seededRandom);
      props.push(...landmarks);
    }
    
    return props;
  }
  /**
   * Generate landmark props for the map
   * @param {Function} seededRandom - Seeded random function
   * @returns {Array} Array of landmark prop objects
   */
  generateLandmarks(seededRandom) {
    // Calculate landmarks in the playable area (bottom 25%)
    const playableMinY = this.mapSize * 0.75;
    const playableMaxY = this.mapSize - 64;
    
    // Create a mix of small and medium-sized rocks as landmarks
    // Avoiding too many large rocks (non-linear scale distribution)
    const getNonLinearScale = () => {
      // Power curve for non-linear scaling, favoring smaller rocks
      const scalePower = 3.0; // Higher value = more small rocks
      const baseScale = 0.5 + Math.pow(seededRandom(), scalePower) * 1.5; // 0.5-2.0 range, biased toward lower values
      return Math.min(baseScale, 2.0); // Cap at 2.0
    };
      return [
      // Landmark rocks, now properly positioned in the playable area
      { 
        file: '1A.png', 
        x: 400 + seededRandom() * 400, 
        y: playableMinY + seededRandom() * (playableMaxY - playableMinY) * 0.8, 
        scale: getNonLinearScale(), 
        rotation: seededRandom() * 360, 
        zIndex: 4,
        mirrored: seededRandom() < 0.5
      },
      { 
        file: '2A.png', 
        x: 1000 + seededRandom() * 400, 
        y: playableMinY + seededRandom() * (playableMaxY - playableMinY) * 0.7, 
        scale: getNonLinearScale(), 
        rotation: seededRandom() * 360, 
        zIndex: 4,
        mirrored: seededRandom() < 0.5
      },
      { 
        file: '1A.png', 
        x: 1600 + seededRandom() * 400, 
        y: playableMinY + seededRandom() * (playableMaxY - playableMinY) * 0.9, 
        scale: getNonLinearScale(), 
        rotation: seededRandom() * 360, 
        zIndex: 3,
        mirrored: seededRandom() < 0.5
      },
      { 
        file: '2A.png', 
        x: 800 + seededRandom() * 300, 
        y: playableMinY + seededRandom() * (playableMaxY - playableMinY) * 0.6, 
        scale: getNonLinearScale(), 
        rotation: seededRandom() * 360, 
        zIndex: 3,
        mirrored: seededRandom() < 0.5
      },
      { 
        file: '1A.png', 
        x: 1200 + seededRandom() * 400, 
        y: playableMaxY - seededRandom() * 100, 
        scale: getNonLinearScale(), 
        rotation: seededRandom() * 360, 
        zIndex: 5,
        mirrored: seededRandom() < 0.5
      }
    ];
  }
  /**
   * Get props for a specific region of the map
   * @param {string} regionId - Region identifier
   * @returns {Array} Array of prop objects for the region
   */
  getRegionProps(regionId) {
    // Calculate playable area bounds
    const playableYStart = this.mapSize * 0.75; // Only bottom 25% is playable
    const playableYEnd = this.mapSize - 64;
    
    switch(regionId) {      
      case 'beach': 
        // Main beach area (bottom 15% of map)
        return this.generateProps(`beach_${this.mapSize}`, { 
          density: 'high',
          addLandmarks: true,
          yStart: this.mapSize * 0.85,  // Bottom 15%
          yEnd: playableYEnd,
          scaleRange: { min: 0.5, max: 1.8 }
        });
        
      case 'shallows':
        // We'll redefine shallows to be in the playable area
        // Middle of playable area (between 75% and 85% of map height)
        return this.generateProps(`shallows_${this.mapSize}`, {
          density: 'medium',
          yStart: playableYStart,
          yEnd: this.mapSize * 0.85,
          scaleRange: { min: 0.5, max: 1.5 }
        });
        
      case 'treasures':
        // Scattered throughout playable area
        return this.generateProps(`treasures_${this.mapSize}`, {
          density: 'low',
          yStart: playableYStart,
          yEnd: playableYEnd,
          scaleRange: { min: 0.5, max: 1.2 } // Smaller scale for "treasure" rocks
        });
        
      default:
        // Default covers the entire playable area
        return this.generateProps(`default_${this.mapSize}`, {
          density: 'medium',
          yStart: playableYStart,
          yEnd: playableYEnd,
          addLandmarks: true,
          scaleRange: { min: 0.5, max: 1.5 }
        });
    }
  }
  
  /**
   * Get all props for the map
   * @returns {Array} Combined array of all props
   */
  getAllProps() {
    const beachProps = this.getRegionProps('beach');
    const shallowsProps = this.getRegionProps('shallows');
    const treasureProps = this.getRegionProps('treasures');
    return [...beachProps, ...shallowsProps, ...treasureProps];
  }
}
