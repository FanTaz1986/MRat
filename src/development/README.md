# Development Tools and Scripts

This folder contains all development-related utilities, debug scripts, and testing tools for the game project.

## Structure

### `/utils/`
- `Debug.js` - **Simplified debug system** with clean UI and essential controls

### `/debug-scripts/`
- `expanded_portal_debug_commands.js` - Extended portal debugging commands
- `portal_prop_debug_integration.js` - Portal and prop integration testing
- `test_portal_props.js` - Portal property testing
- `test_portal_positioning_fix.js` - Portal positioning validation
- `run_auto_portal_test.js` - Automated portal testing suite
- `quick_verification_tests.js` - Quick validation tests

## Debug System Features

The new simplified debug system includes:

### **General Tab**
- Current map information
- Character position (X, Y coordinates) 
- Camera position
- Basic game state info

### **Map Tab**
- **🌀 Teleport to Portal** button - Instantly teleport character to the first portal
- **🏠 Teleport to Starting Position** button - Return character to map spawn point
- Portal information display (positions and target maps)

## Usage

The debug system is automatically imported in the main game files. Access it via the floating 🔧 button in the top-right corner.

```javascript
import { debugLog, createDebugOverlay, debugPortal } from '../development/utils/Debug';
```

## Changes Made

- ✅ **Removed complex debug controls** (prop analysis, auto-debugging, etc.)
- ✅ **Simplified to 2 tabs**: General info + Map controls  
- ✅ **Clean teleportation buttons** instead of manual coordinate input
- ✅ **Removed all prop and portal debug tools** - keeping only essential teleport functions
- ✅ **Modern, clean UI** with proper styling and responsive design
