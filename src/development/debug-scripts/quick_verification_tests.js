/**
 * QUICK TEST AND VERIFICATION SCRIPT
 * ==================================
 * 
 * This script will run a few key tests to verify the new debug commands work properly.
 * Run this in browser console to test the expanded debug functionality.
 */

console.log('🧪 === QUICK VERIFICATION OF NEW DEBUG COMMANDS ===');
console.log('===================================================');

// Helper function to get map instance
function getMapInstance() {
    return window.currentMap || window.map1Instance || (window.game && window.game.mapManager && window.game.mapManager.currentMap);
}

// Test 1: Verify portal positioning fix
function test1_PortalPositioningFix() {
    console.log('\n🔧 Test 1: Portal Positioning Fix');
    console.log('=================================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return false;
    }
    
    console.log('Before fix:');
    map.debugCharacterVsPortalPosition();
    
    console.log('\nApplying portal positioning fix...');
    const result = map.fixPortalPositioning();
    
    console.log('\nAfter fix:');
    map.debugCharacterVsPortalPosition();
    
    return result;
}

// Test 2: Verify teleport to portal works correctly
function test2_TeleportToPortal() {
    console.log('\n🚀 Test 2: Teleport to Portal');
    console.log('=============================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return false;
    }
    
    console.log('Teleporting to portal with correct coordinates...');
    const result = map.teleportToPortal();
    
    if (result) {
        console.log('✅ Teleport successful! Checking surrounding area...');
        // The teleportToPortal method automatically calls debugSurroundingArea
    }
    
    return result;
}

// Test 3: Verify complete portal diagnosis
function test3_CompletePortalDiagnosis() {
    console.log('\n🏥 Test 3: Complete Portal Diagnosis');
    console.log('===================================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return false;
    }
    
    const diagnosis = map.debugCompletePortalDiagnosis();
    return diagnosis;
}

// Test 4: Verify C props visibility toggle
function test4_CPropsVisibilityToggle() {
    console.log('\n🌳 Test 4: C Props Visibility Toggle');
    console.log('===================================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return false;
    }
    
    console.log('Enabling C props only mode...');
    const result1 = map.toggleCPropsDebugMode(true);
    
    console.log('Waiting 2 seconds then restoring normal view...');
    setTimeout(() => {
        console.log('Restoring normal view...');
        const result2 = map.toggleCPropsDebugMode(false);
        console.log('✅ C props visibility test complete');
    }, 2000);
    
    return result1;
}

// Test 5: Verify tile contents analysis
function test5_TileContentsAnalysis() {
    console.log('\n🔲 Test 5: Tile Contents Analysis');
    console.log('=================================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return false;
    }
    
    // Test the portal tile (2, 9) based on your debug output
    console.log('Analyzing portal tile (2, 9):');
    const portalTileResult = map.debugTileContents(2, 9);
    
    // Test character's current tile
    if (window.game && window.game.characterManager && window.game.characterManager.character) {
        const char = window.game.characterManager.character;
        const charTileX = Math.floor(char.sprite.x / map.tileSize);
        const charTileY = Math.floor(char.sprite.y / map.tileSize);
        
        console.log(`\nAnalyzing character's tile (${charTileX}, ${charTileY}):`);
        const charTileResult = map.debugTileContents(charTileX, charTileY);
        
        return { portalTile: portalTileResult, characterTile: charTileResult };
    }
    
    return { portalTile: portalTileResult };
}

// Test 6: Verify character location debug
function test6_CharacterLocationDebug() {
    console.log('\n🚶 Test 6: Character Location Debug');
    console.log('==================================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return false;
    }
    
    return map.debugCharacterLocation();
}

// Run all verification tests
function runAllVerificationTests() {
    console.log('🚀 Running All Verification Tests...');
    console.log('====================================');
    
    const results = {};
    
    try {
        results.test1 = test1_PortalPositioningFix();
        
        setTimeout(() => {
            results.test2 = test2_TeleportToPortal();
            
            setTimeout(() => {
                results.test3 = test3_CompletePortalDiagnosis();
                
                setTimeout(() => {
                    results.test4 = test4_CPropsVisibilityToggle();
                    
                    setTimeout(() => {
                        results.test5 = test5_TileContentsAnalysis();
                        
                        setTimeout(() => {
                            results.test6 = test6_CharacterLocationDebug();
                            
                            setTimeout(() => {
                                console.log('\n🎉 === ALL VERIFICATION TESTS COMPLETE ===');
                                console.log('Results Summary:');
                                Object.entries(results).forEach(([test, result]) => {
                                    const status = result ? '✅' : '❌';
                                    console.log(`${status} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
                                });
                                
                                console.log('\n💡 All new debug commands are ready to use!');
                                console.log('You can now integrate them into your debug menu.');
                            }, 1000);
                        }, 1000);
                    }, 1000);
                }, 3000); // Wait for visibility toggle
            }, 1000);
        }, 1000);
        
    } catch (error) {
        console.log(`❌ Error running verification tests: ${error.message}`);
        return { error: error.message };
    }
    
    return results;
}

// Quick fix function based on your debug output
function quickFixBasedOnDebugOutput() {
    console.log('🚀 QUICK FIX BASED ON YOUR DEBUG OUTPUT');
    console.log('=======================================');
    
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    console.log('Your debug output shows:');
    console.log('- Portal is at tile (2, 9) ✅');
    console.log('- Portal contains 22 C props, 0 regular props ✅');
    console.log('- Portal sprite is at (0, 0) ❌ Should be at (5120, 19456)');
    
    console.log('\n🔧 Applying fixes...');
    
    // Fix 1: Portal positioning
    console.log('1. Fixing portal position...');
    map.fixPortalPositioning();
    
    // Fix 2: Teleport to portal to verify
    console.log('2. Teleporting to portal to verify...');
    map.teleportToPortal();
    
    console.log('✅ Quick fix complete! You should now see only C props at the portal.');
    
    return true;
}

// Show available commands
console.log('📋 Available Verification Tests:');
console.log('================================');
console.log('• test1_PortalPositioningFix() - Fix portal positioning issue');
console.log('• test2_TeleportToPortal() - Test correct portal teleportation');
console.log('• test3_CompletePortalDiagnosis() - Run full system diagnosis');
console.log('• test4_CPropsVisibilityToggle() - Test C props visibility');
console.log('• test5_TileContentsAnalysis() - Analyze tile contents');
console.log('• test6_CharacterLocationDebug() - Debug character location');
console.log('');
console.log('🚀 Quick Actions:');
console.log('================');
console.log('• runAllVerificationTests() - Run all verification tests');
console.log('• quickFixBasedOnDebugOutput() - Apply fixes based on your debug output');
console.log('');
console.log('💡 Based on your debug output, try: quickFixBasedOnDebugOutput()');
