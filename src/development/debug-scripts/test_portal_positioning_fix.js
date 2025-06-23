/**
 * Test script for fixing portal positioning and verifying the teleport functionality
 * Run this in the browser console after loading the game
 */

// Test portal positioning fix
function testPortalPositioningFix() {
    console.log('🔧 Testing Portal Positioning Fix');
    console.log('=' .repeat(50));
    
    // Get the map instance
    const map = window.map1Instance || window.currentMap;
    if (!map) {
        console.log('❌ No map instance found. Make sure the game is loaded.');
        return;
    }
    
    console.log('📍 Before fixing portal position:');
    map.debugCharacterVsPortalPosition();
    
    // Fix portal positioning
    const fixed = map.fixPortalPositioning();
    if (!fixed) {
        console.log('❌ Failed to fix portal positioning');
        return;
    }
    
    console.log('\n📍 After fixing portal position:');
    map.debugCharacterVsPortalPosition();
    
    // Get correct portal coordinates for teleporting
    const portalCoords = map.getPortalWorldCoordinates();
    if (portalCoords) {
        console.log(`\n🎯 Correct portal coordinates for teleporting: (${portalCoords.x}, ${portalCoords.y})`);
        console.log('💡 Use these coordinates in your debug menu instead of portal.x/portal.y');
    }
    
    // Test what props are at the portal location
    console.log('\n🔍 Testing props at portal location:');
    
    // Move character to portal coordinates and check surrounding props
    if (map.character && portalCoords) {
        const originalX = map.character.x;
        const originalY = map.character.y;
        
        // Temporarily move character to portal
        map.character.setPosition(portalCoords.x, portalCoords.y);
        
        // Check what's visible now
        const nearbyProps = map.getNearbyProps(portalCoords.x, portalCoords.y, 2048);
        const cProps = nearbyProps.filter(prop => {
            const textureName = map.getTextureNameSafe(prop);
            return textureName && textureName.includes('c_');
        });
        
        console.log(`Found ${nearbyProps.length} props near portal`);
        console.log(`Found ${cProps.length} C props near portal`);
        
        if (cProps.length > 0) {
            console.log('✅ SUCCESS: C props found at portal location!');
        } else {
            console.log('❌ ISSUE: No C props found at portal location');
        }
        
        // Restore original character position
        map.character.setPosition(originalX, originalY);
        console.log('🔄 Character position restored');
    }
    
    console.log('\n✅ Portal positioning test complete!');
}

// Helper function to teleport to correct portal coordinates
function teleportToPortalCorrectly() {
    const map = window.map1Instance || window.currentMap;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    const portalCoords = map.getPortalWorldCoordinates();
    if (!portalCoords) {
        console.log('❌ Could not get portal coordinates');
        return;
    }
    
    if (!map.character) {
        console.log('❌ No character found');
        return;
    }
    
    console.log(`🚀 Teleporting to portal at (${portalCoords.x}, ${portalCoords.y})`);
    map.character.setPosition(portalCoords.x, portalCoords.y);
    
    // Update camera to follow character
    if (map.cameras && map.cameras.main) {
        map.cameras.main.centerOn(portalCoords.x, portalCoords.y);
    }
    
    console.log('✅ Teleported to portal! You should now see only C props.');
}

console.log('Portal positioning test script loaded!');
console.log('Run testPortalPositioningFix() to test the fix');
console.log('Run teleportToPortalCorrectly() to teleport to the correct portal location');
