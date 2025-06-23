# Debug Analysis System Enhancements

## Summary of Changes Made

### 1. Fixed Tile Size Calculations
- **Problem**: Debug system was using hardcoded 32x32 tile size for all maps
- **Solution**: Added dynamic tile size detection for Map1/Map2 (4200x2970px tiles) vs standard maps (32x32px tiles)
- **Impact**: Correct tile coordinates and indices are now displayed

### 2. Enhanced Character Analysis
- **Added**: Position within tile calculation (distance from tile center)
- **Added**: Corrected tile index calculation showing both old and new values
- **Added**: Visual indicators for tile centering

### 3. Enhanced Portal Analysis
- **Added**: Portal position within tile (is portal centered?)
- **Added**: Portal visibility properties (visible, alpha, z-index)
- **Added**: Portal rendering layer information
- **Added**: Distance from tile center analysis

### 4. New Portal vs Props Conflict Detection
- **Added**: Analysis of props on the same tile as portals
- **Added**: Detection of overlapping sprites that might hide portals
- **Added**: Layer and z-index conflict analysis

### 5. Camera Positioning Analysis
- **Added**: Camera-character distance calculation
- **Added**: Camera centering suggestions
- **Added**: Map-specific advice (e.g., Map1 large tile issues)

### 6. Enhanced Tools Tab
- **Added**: "Center Camera on Character" button
- **Added**: "Center Camera on Portal" button
- **Added**: Manual camera centering tools

### 7. Improved Props Analysis
- **Fixed**: Detection of PIXI sprites vs raw data objects
- **Added**: Support for both prop types (sprites and data)
- **Added**: Better texture and name extraction from sprites
- **Added**: Proper tile size calculations for prop positions

### 8. Enhanced Portal-Character Tile Comparison
- **Added**: Exact tile matching detection
- **Added**: Adjacent tile warnings
- **Added**: Pixel distance calculations
- **Added**: Specific warnings for same-tile portal/character situations

## Key Debugging Features for Your Issue

### Your Current Situation:
- Character and Portal both at tile (15, 1) - top-right corner
- Character: (65348.5, 4725.9)
- Portal: (65348.5, 4725.9) 
- Camera: (63889.3, 4691.2) - off-center from character

### New Debug Information Available:
1. **Correct tile indices** using 4200x2970 tile size
2. **Portal centering analysis** - is portal at center of tile?
3. **Prop conflict detection** - are there props hiding the portal?
4. **Camera distance warnings** - camera is 1459px away from character
5. **Layer analysis** - which rendering layer is the portal on?
6. **Z-index conflicts** - are other sprites rendering over the portal?

### Recommended Actions:
1. Open the **Analysis tab** to see the enhanced tile information
2. Check the **Portal vs Props analysis** for conflicts
3. Use the **Tools tab** to center camera on character
4. Look for portal visibility issues (alpha, z-index, layer conflicts)

## Files Modified:
- `src/development/utils/Debug.js` - Enhanced analysis functions and UI
- Added proper PIXI sprite property detection
- Fixed tile calculations for large maps
- Added camera control tools

## Next Steps:
1. Test the enhanced debug overlay in Map1
2. Use the Analysis tab to identify portal visibility issues
3. Use camera centering tools to improve view
4. Check for prop conflicts on the same tile as portal
