// Test script for portal props debugging
// Run this in the browser console when the game is loaded

function runPortalPropTests() {
    console.log('🔧 Running Portal Prop Tests...');
    
    if (!window.game || !window.game.mapManager || !window.game.mapManager.currentMap) {
        console.log('❌ Game not loaded or map not available');
        return;
    }
    
    const map = window.game.mapManager.currentMap;
    
    console.log('\n1️⃣ Testing texture name debug:');
    map.debugTextureNames();
    
    console.log('\n2️⃣ Testing portal contamination:');
    map.debugPortalTileContamination();
    
    console.log('\n3️⃣ Testing C props search:');
    const cProps = map.findAllCProps();
    console.log(`Found ${cProps.length} C props`);
    
    console.log('\n4️⃣ Testing portal tile props:');
    if (map.portalManager && map.portalManager.portals.length > 0) {
        const portal = map.portalManager.portals[0];
        map.getPropsOnTile(portal.tileX, portal.tileY);
    }
    
    console.log('✅ Portal prop tests complete');
}

// Auto-run when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(runPortalPropTests, 2000);
    });
} else {
    setTimeout(runPortalPropTests, 2000);
}

console.log('🔧 Portal prop test script loaded. Run runPortalPropTests() manually if needed.');
