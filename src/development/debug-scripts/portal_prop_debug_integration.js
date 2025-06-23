// Auto Portal Prop Testing Integration Guide
// How to integrate the new autoPortalPropTesting() function into your debug menu

/* 
1. In your debug menu or console, you can call:
   window.game.mapManager.currentMap.autoPortalPropTesting()

2. For debug menu integration, add this option to your debug menu:
*/

// Example debug menu option:
const debugMenuOptions = [
  // ... your existing options ...
  {
    label: "🔄 Auto Portal Prop Testing",
    action: () => {
      if (window.game && window.game.mapManager && window.game.mapManager.currentMap) {
        const results = window.game.mapManager.currentMap.autoPortalPropTesting();
        
        // Optional: Show results in a popup or alert
        const summary = `Tests: ${results.totalTests} | Passed: ${results.passedTests} | Failed: ${results.failedTests} | Warnings: ${results.warnings}`;
        console.log(`Portal Prop Test Summary: ${summary}`);
        
        // Return results for further processing if needed
        return results;
      } else {
        console.log('❌ Game or map not loaded');
      }
    }
  }
];

/* 
3. Quick console commands for testing:

// Run all tests
window.game.mapManager.currentMap.autoPortalPropTesting()

// Just run texture name debug
window.game.mapManager.currentMap.debugTextureNames()

// Just run contamination check
window.game.mapManager.currentMap.debugPortalTileContamination()

// Find all C props
window.game.mapManager.currentMap.findAllCProps()

// Get props on portal tile
const portal = window.game.mapManager.currentMap.portalManager.portals[0];
window.game.mapManager.currentMap.getPropsOnTile(portal.tileX, portal.tileY)

4. The autoPortalPropTesting() function returns a detailed results object:
{
  timestamp: "2025-06-23T...",
  totalTests: 7,
  passedTests: 5,
  failedTests: 1,
  warnings: 1,
  errors: ["Error description"],
  findings: ["✅ Success message", "⚠️ Warning message"]
}

This makes it easy to programmatically check the status of your portal prop system.
*/

// ===============================================
// EXPANDED PORTAL PROP DEBUG COMMANDS FOR MENU
// ===============================================

// 1. AUTO PORTAL PROP TESTING (Comprehensive Analysis)
// ====================================================
function debugAutoPortalProps() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.autoPortalPropTesting();
}

// 2. COMPLETE PORTAL DIAGNOSIS (Full System Check)
// ================================================
function debugCompletePortalDiagnosis() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugCompletePortalDiagnosis();
}

// 3. TELEPORT TO PORTAL (Correct Coordinates)
// ===========================================
function debugTeleportToPortal() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.teleportToPortal();
}

// 4. FIX PORTAL POSITIONING
// =========================
function debugFixPortalPositioning() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.fixPortalPositioning();
}

// 5. TOGGLE C PROPS ONLY VIEW
// ===========================
function debugToggleCPropsOnly(enable = true) {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.toggleCPropsDebugMode(enable);
}

// 6. DEBUG CHARACTER LOCATION
// ===========================
function debugCharacterLocation() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugCharacterLocation();
}

// 7. DEBUG SPECIFIC TILE CONTENTS
// ===============================
function debugTileContents(tileX, tileY) {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    if (tileX === undefined || tileY === undefined) {
        console.log('Usage: debugTileContents(tileX, tileY)');
        console.log('Example: debugTileContents(13, 12) // Check portal tile');
        return;
    }
    
    return map.debugTileContents(tileX, tileY);
}

// 8. DEBUG SURROUNDING AREA
// =========================
function debugSurroundingArea(x, y, radius = 1024) {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    
    if (x === undefined || y === undefined) {
        // Use character position if no coordinates provided
        if (window.game && window.game.characterManager && window.game.characterManager.character) {
            const char = window.game.characterManager.character;
            x = char.sprite.x;
            y = char.sprite.y;
            console.log(`Using character position: (${x}, ${y})`);
        } else {
            console.log('Usage: debugSurroundingArea(x, y, radius)');
            console.log('Example: debugSurroundingArea(27648, 25600, 1024)');
            return;
        }
    }
    
    return map.debugSurroundingArea(x, y, radius);
}

// 9. REFRESH PORTAL SYSTEM
// ========================
function debugRefreshPortalSystem() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugRefreshPortalSystem();
}

// 10. FIND ALL C PROPS
// ====================
function debugFindAllCProps() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.findAllCProps();
}

// 11. HIGHLIGHT C PROPS
// ====================
function debugHighlightCProps(highlight = true) {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.highlightPortalCProps(highlight);
}

// 12. DEBUG PORTAL TILE CONTAMINATION
// ===================================
function debugPortalTileContamination() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugPortalTileContamination();
}

// 13. DEBUG CHARACTER VS PORTAL POSITION
// ======================================
function debugCharacterVsPortalPosition() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugCharacterVsPortalPosition();
}

// 14. ANALYZE TILE SIZE MISMATCH
// ==============================
function debugAnalyzeTileSizeMismatch() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.analyzeTileSizeMismatch();
}

// 15. DEBUG TEXTURE NAMES
// =======================
function debugTextureNames() {
    const map = window.currentMap || window.map1Instance;
    if (!map) {
        console.log('❌ No map instance found');
        return;
    }
    return map.debugTextureNames();
}

// ===============================================
// HOW TO INTEGRATE INTO YOUR DEBUG MENU
// ===============================================

/*
Add these buttons/commands to your debug menu:

1. "Auto Portal Props Test" -> debugAutoPortalProps()
2. "Complete Portal Diagnosis" -> debugCompletePortalDiagnosis()
3. "Teleport to Portal" -> debugTeleportToPortal()
4. "Fix Portal Position" -> debugFixPortalPositioning()
5. "Toggle C Props Only" -> debugToggleCPropsOnly(true)
6. "Show All Props" -> debugToggleCPropsOnly(false)
7. "Character Location" -> debugCharacterLocation()
8. "Debug Portal Tile" -> debugTileContents(13, 12)
9. "Debug Current Area" -> debugSurroundingArea()
10. "Refresh Portal System" -> debugRefreshPortalSystem()
11. "Find All C Props" -> debugFindAllCProps()
12. "Highlight C Props" -> debugHighlightCProps(true)
13. "Remove Highlights" -> debugHighlightCProps(false)
14. "Check Portal Contamination" -> debugPortalTileContamination()
15. "Character vs Portal" -> debugCharacterVsPortalPosition()

RECOMMENDED DEBUG MENU STRUCTURE:
┌─ Portal System ─────────────────┐
│ • Auto Portal Props Test        │
│ • Complete Portal Diagnosis     │
│ • Refresh Portal System         │
├─ Portal Navigation ─────────────┤
│ • Teleport to Portal            │
│ • Fix Portal Position           │
│ • Character vs Portal Position  │
├─ Props Visualization ──────────┤
│ • Toggle C Props Only           │
│ • Highlight C Props             │
│ • Find All C Props              │
├─ Detailed Analysis ─────────────┤
│ • Character Location            │
│ • Debug Current Area            │
│ • Debug Portal Tile (13,12)     │
│ • Check Portal Contamination    │
│ • Analyze Tile Size Mismatch    │
│ • Debug Texture Names           │
└─────────────────────────────────┘

QUICK FIXES FOR COMMON ISSUES:
1. Portal teleport goes to wrong place -> debugFixPortalPositioning()
2. See regular props at portal -> debugRefreshPortalSystem()
3. Can't see C props -> debugToggleCPropsOnly(true)
4. Need to analyze system -> debugCompletePortalDiagnosis()
*/

// LEGACY SUPPORT (OLD METHOD)
// ===========================
// OLD CODE (in your debug menu):
// map.character.setPosition(map.portal.x, map.portal.y);

// NEW CODE (use debugTeleportToPortal() instead):
// debugTeleportToPortal();
