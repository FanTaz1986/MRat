// Quick test to run the new auto portal prop testing function
// Run this in the browser console when the game is loaded

console.log('🚀 Running Auto Portal Prop Testing...');

if (window.game && window.game.mapManager && window.game.mapManager.currentMap) {
  const results = window.game.mapManager.currentMap.autoPortalPropTesting();
  console.log('🎯 Auto Portal Prop Testing Complete!');
  console.log('📊 Results Summary:', {
    totalTests: results.totalTests,
    passed: results.passedTests,
    failed: results.failedTests,
    warnings: results.warnings,
    successRate: `${((results.passedTests / results.totalTests) * 100).toFixed(1)}%`
  });
} else {
  console.log('❌ Game not loaded - cannot run tests');
}
