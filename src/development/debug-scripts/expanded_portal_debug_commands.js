/**
 * EXPANDED PORTAL PROP DEBUG COMMANDS TEST SCRIPT
 * ===============================================
 * 
 * This script demonstrates all the new debug commands available for 
 * portal and prop system analysis. Run in browser console.
 */

console.log('🚀 Loading Expanded Portal Prop Debug Commands...');
console.log('================================================');

// Helper function to get map instance
function getMapInstance() {
    return window.currentMap || window.map1Instance || (window.game && window.game.mapManager && window.game.mapManager.currentMap);
}

// 1. AUTO PORTAL PROPS TEST (Enhanced)
function testAutoPortalProps() {
    console.log('\n🔄 === AUTO PORTAL PROPS TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.autoPortalPropTesting();
}

// 2. COMPLETE PORTAL DIAGNOSIS (NEW)
function testCompletePortalDiagnosis() {
    console.log('\n🏥 === COMPLETE PORTAL DIAGNOSIS ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugCompletePortalDiagnosis();
}

// 3. TELEPORT TO PORTAL (NEW)
function testTeleportToPortal() {
    console.log('\n🚀 === TELEPORT TO PORTAL TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.teleportToPortal();
}

// 4. CHARACTER LOCATION DEBUG (NEW)
function testCharacterLocation() {
    console.log('\n🚶 === CHARACTER LOCATION TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugCharacterLocation();
}

// 5. TILE CONTENTS DEBUG (NEW)
function testTileContents() {
    console.log('\n🔲 === TILE CONTENTS TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    // Test portal tile
    console.log('Testing portal tile (13, 12):');
    const portalTileResult = map.debugTileContents(13, 12);
    
    // Test character's current tile
    if (window.game && window.game.characterManager && window.game.characterManager.character) {
        const char = window.game.characterManager.character;
        const charTileX = Math.floor(char.sprite.x / map.tileSize);
        const charTileY = Math.floor(char.sprite.y / map.tileSize);
        
        console.log(`\nTesting character's tile (${charTileX}, ${charTileY}):`);
        const charTileResult = map.debugTileContents(charTileX, charTileY);
        
        return { portalTile: portalTileResult, characterTile: charTileResult };
    }
    
    return { portalTile: portalTileResult };
}

// 6. SURROUNDING AREA DEBUG (NEW)
function testSurroundingArea() {
    console.log('\n🔍 === SURROUNDING AREA TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    // Test around character's position
    if (window.game && window.game.characterManager && window.game.characterManager.character) {
        const char = window.game.characterManager.character;
        console.log('Testing area around character:');
        return map.debugSurroundingArea(char.sprite.x, char.sprite.y, 1024);
    } else {
        // Test around portal if no character
        const portalCoords = map.getPortalWorldCoordinates();
        if (portalCoords) {
            console.log('Testing area around portal:');
            return map.debugSurroundingArea(portalCoords.x, portalCoords.y, 1024);
        }
    }
    
    console.log('❌ No valid position found for testing');
    return null;
}

// 7. C PROPS VISIBILITY TOGGLE (NEW)
function testCPropsToggle() {
    console.log('\n🌳 === C PROPS VISIBILITY TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    console.log('Enabling C props only mode...');
    const result1 = map.toggleCPropsDebugMode(true);
    
    console.log('Waiting 3 seconds then restoring normal view...');
    setTimeout(() => {
        console.log('Restoring normal view...');
        const result2 = map.toggleCPropsDebugMode(false);
        console.log('C props visibility test complete');
    }, 3000);
    
    return result1;
}

// 8. PORTAL SYSTEM REFRESH (NEW)
function testPortalSystemRefresh() {
    console.log('\n🔄 === PORTAL SYSTEM REFRESH TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugRefreshPortalSystem();
}

// 9. FIX PORTAL POSITIONING (NEW)
function testFixPortalPositioning() {
    console.log('\n🔧 === FIX PORTAL POSITIONING TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    console.log('Before fix:');
    map.debugCharacterVsPortalPosition();
    
    console.log('\nApplying fix...');
    const result = map.fixPortalPositioning();
    
    console.log('\nAfter fix:');
    map.debugCharacterVsPortalPosition();
    
    return result;
}

// 10. C PROPS HIGHLIGHTING (NEW)
function testCPropsHighlighting() {
    console.log('\n✨ === C PROPS HIGHLIGHTING TEST ===');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    console.log('Highlighting C props...');
    map.highlightPortalCProps(true);
    
    console.log('Waiting 3 seconds then removing highlights...');
    setTimeout(() => {
        console.log('Removing highlights...');
        map.highlightPortalCProps(false);
        console.log('Highlighting test complete');
    }, 3000);
    
    return true;
}

// RUN ALL TESTS FUNCTION
function runAllPortalTests() {
    console.log('🧪 === RUNNING ALL PORTAL TESTS ===');
    console.log('This will run all available portal debug commands...\n');
    
    const results = {};
    
    try {
        // Basic system check
        console.log('1/10 Running Auto Portal Props Test...');
        results.autoPortalProps = testAutoPortalProps();
        
        // Wait a bit between tests
        setTimeout(() => {
            console.log('2/10 Running Complete Portal Diagnosis...');
            results.completeDiagnosis = testCompletePortalDiagnosis();
            
            setTimeout(() => {
                console.log('3/10 Running Character Location Test...');
                results.characterLocation = testCharacterLocation();
                
                setTimeout(() => {
                    console.log('4/10 Running Tile Contents Test...');
                    results.tileContents = testTileContents();
                    
                    setTimeout(() => {
                        console.log('5/10 Running Surrounding Area Test...');
                        results.surroundingArea = testSurroundingArea();
                        
                        setTimeout(() => {
                            console.log('6/10 Running Portal Positioning Fix...');
                            results.positionFix = testFixPortalPositioning();
                            
                            setTimeout(() => {
                                console.log('7/10 Running Portal System Refresh...');
                                results.systemRefresh = testPortalSystemRefresh();
                                
                                setTimeout(() => {
                                    console.log('8/10 Running C Props Highlighting Test...');
                                    results.highlighting = testCPropsHighlighting();
                                    
                                    setTimeout(() => {
                                        console.log('9/10 Running C Props Visibility Test...');
                                        results.visibility = testCPropsToggle();
                                        
                                        setTimeout(() => {
                                            console.log('10/10 Running Teleport Test...');
                                            results.teleport = testTeleportToPortal();
                                            
                                            setTimeout(() => {
                                                console.log('\n🎉 === ALL TESTS COMPLETE ===');
                                                console.log('Results summary:');
                                                Object.entries(results).forEach(([test, result]) => {
                                                    const status = result ? '✅' : '❌';
                                                    console.log(`${status} ${test}: ${result ? 'PASSED' : 'FAILED'}`);
                                                });
                                                
                                                console.log('\n💡 All debug commands are now available!');
                                                console.log('You can run individual tests or integrate them into your debug menu.');
                                            }, 1000);
                                        }, 1000);
                                    }, 4000); // Wait for visibility toggle
                                }, 1000);
                            }, 4000); // Wait for highlighting
                        }, 1000);
                    }, 1000);
                }, 1000);
            }, 1000);
        }, 1000);
        
    } catch (error) {
        console.log(`❌ Error running tests: ${error.message}`);
        return { error: error.message };
    }
    
    return results;
}

// QUICK ACCESS FUNCTIONS
function quickPortalFix() {
    console.log('🚀 Quick Portal Fix - Running essential fixes...');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    // Fix portal positioning
    console.log('1. Fixing portal positioning...');
    map.fixPortalPositioning();
    
    // Refresh portal system
    console.log('2. Refreshing portal system...');
    map.debugRefreshPortalSystem();
    
    // Teleport to portal
    console.log('3. Teleporting to portal...');
    map.teleportToPortal();
    
    console.log('✅ Quick portal fix complete!');
    return true;
}

function quickDiagnosis() {
    console.log('🏥 Quick Diagnosis - Running system check...');
    const map = getMapInstance();
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    return map.debugCompletePortalDiagnosis();
}

// Display available commands
console.log('✅ Expanded Portal Debug Commands Loaded!');
console.log('\n📋 Available Commands:');
console.log('=====================');
console.log('• testAutoPortalProps() - Comprehensive system analysis');
console.log('• testCompletePortalDiagnosis() - Full diagnostic check');
console.log('• testTeleportToPortal() - Teleport to correct portal location');
console.log('• testCharacterLocation() - Check character position and tile');
console.log('• testTileContents() - Analyze specific tile contents');
console.log('• testSurroundingArea() - Check props around position');
console.log('• testCPropsToggle() - Toggle C props visibility');
console.log('• testPortalSystemRefresh() - Refresh entire portal system');
console.log('• testFixPortalPositioning() - Fix portal positioning');
console.log('• testCPropsHighlighting() - Highlight C props');
console.log('');
console.log('🚀 Quick Access:');
console.log('===============');
console.log('• runAllPortalTests() - Run all tests sequentially');
console.log('• quickPortalFix() - Fix common portal issues');
console.log('• quickDiagnosis() - Quick system diagnosis');
console.log('');
console.log('💡 Start with: quickDiagnosis() or runAllPortalTests()');
