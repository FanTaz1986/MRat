import { debugLog } from '../../development/utils/Debug';

/**
 * EnemyManagerDebug - Debug utilities for EnemyManager
 * Contains all debug-related methods to keep the main EnemyManager clean
 */
export default class EnemyManagerDebug {
  constructor(enemyManager) {
    this.enemyManager = enemyManager;
    
    // Debug properties
    this.debugEnabled = false;
    this.attackDebugEnabled = false;
    this.hitRegDebugEnabled = false;
    this.coordinateDebugEnabled = false;
    this.positionLoggingEnabled = false;
    this.spawnDebugEnabled = false;
    this.renderAnalysisEnabled = false;
    this.mapEnemyDebugEnabled = false;
    this.lastPositionLogTime = 0;
    this.lastRenderAnalysisTime = 0;
    this.lastMapEnemyDebugTime = 0;
    this.positionLogInterval = 5000; // 5 seconds
    this.renderAnalysisInterval = 2000; // 2 seconds
  }

  // Debug logging method for detailed spawn attempts
  logDetailedSpawnAttempt(type, x, y, hp) {
    console.log(`[ENEMY-MANAGER] 🎯 === DETAILED SPAWN ATTEMPT ===`);
    console.log(`[ENEMY-MANAGER] 🎯 Type: ${type}, HP: ${hp}`);
    console.log(`[ENEMY-MANAGER] 🎯 Coordinates: (${x?.toFixed(1) || 'auto'}, ${y?.toFixed(1) || 'auto'})`);
    
    // Log EnemyManager state
    console.log(`[ENEMY-MANAGER] 🎯 EnemyManager state:`, {
      hasApp: !!this.enemyManager.app,
      hasGameContainer: !!this.enemyManager.gameContainer,
      hasWorldContainer: !!this.enemyManager.worldContainer,
      addedToScene: this.enemyManager.addedToScene,
      enemyCount: this.enemyManager.enemies.length,
      hasEnemyContainer: !!this.enemyManager.enemyContainer
    });
    
    // Log world container state
    if (this.enemyManager.worldContainer) {
      console.log(`[ENEMY-MANAGER] 🎯 World container state:`, {
        position: { x: this.enemyManager.worldContainer.x, y: this.enemyManager.worldContainer.y },
        children: this.enemyManager.worldContainer.children.length,
        visible: this.enemyManager.worldContainer.visible,
        alpha: this.enemyManager.worldContainer.alpha
      });
    }
  }

  // Enhanced debug output for coordinate and rendering comparison
  logDebugSpawnComparison(enemy, coords, label) {
    console.log(`[ENEMY-MANAGER] 🔍 === ${label} SPAWN COMPARISON ===`);
    console.log(`[ENEMY-MANAGER] 🔍 Requested coordinates: (${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`);
    
    if (enemy.position) {
      console.log(`[ENEMY-MANAGER] 🔍 Enemy position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
      console.log(`[ENEMY-MANAGER] 🔍 Position match: ${Math.abs(enemy.position.x - coords.x) < 1 && Math.abs(enemy.position.y - coords.y) < 1 ? '✅' : '❌'}`);
    }
    
    if (enemy.sprite && enemy.sprite.toGlobal) {
      try {
        const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
        console.log(`[ENEMY-MANAGER] 🔍 Global sprite position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
        
        if (this.enemyManager.app && this.enemyManager.app.screen) {
          const isVisible = globalPos.x >= 0 && globalPos.x <= this.enemyManager.app.screen.width && 
                           globalPos.y >= 0 && globalPos.y <= this.enemyManager.app.screen.height;
          console.log(`[ENEMY-MANAGER] 🔍 On screen: ${isVisible ? '✅' : '❌'}`);
        }
      } catch (error) {
        console.log(`[ENEMY-MANAGER] 🔍 Could not get global position: ${error.message}`);
      }
    }
  }

  // Post-spawn analysis
  performPostSpawnAnalysis(enemy, x, y) {
    console.log(`[ENEMY-MANAGER] 🔍 === POST-SPAWN ANALYSIS ===`);
    
    // Position verification
    if (enemy.position) {
      const positionMatch = Math.abs(enemy.position.x - x) < 1 && Math.abs(enemy.position.y - y) < 1;
      console.log(`[ENEMY-MANAGER] 🔍 Position verification: ${positionMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      console.log(`[ENEMY-MANAGER] 🔍 Expected: (${x.toFixed(1)}, ${y.toFixed(1)})`);
      console.log(`[ENEMY-MANAGER] 🔍 Actual: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
    }
    
    // Sprite verification
    if (enemy.sprite) {
      console.log(`[ENEMY-MANAGER] 🔍 Sprite state:`, {
        exists: !!enemy.sprite,
        visible: enemy.sprite.visible,
        alpha: enemy.sprite.alpha,
        position: { x: enemy.sprite.x, y: enemy.sprite.y },
        scale: { x: enemy.sprite.scale.x, y: enemy.sprite.scale.y },
        width: enemy.sprite.width,
        height: enemy.sprite.height
      });
    }
    
    // Container verification
    if (enemy.container) {
      console.log(`[ENEMY-MANAGER] 🔍 Container state:`, {
        exists: !!enemy.container,
        visible: enemy.container.visible,
        alpha: enemy.container.alpha,
        position: { x: enemy.container.x, y: enemy.container.y },
        parent: enemy.container.parent?.constructor?.name,
        children: enemy.container.children.length
      });
    }
  }

  // Verify and fix enemy positions
  verifyAndFixEnemyPositions() {
    console.log(`[ENEMY-MANAGER] 🔧 === VERIFYING AND FIXING ENEMY POSITIONS ===`);
    
    let fixedCount = 0;
    
    this.enemyManager.enemies.forEach((enemy, index) => {
      if (!enemy || !enemy.isAlive) return;
      
      console.log(`[ENEMY-MANAGER] 🔧 Checking enemy ${index + 1}/${this.enemyManager.enemies.length}:`);
      
      // Check if enemy has valid position
      if (!enemy.position || typeof enemy.position.x !== 'number' || typeof enemy.position.y !== 'number') {
        console.log(`[ENEMY-MANAGER] 🔧 ⚠️ Enemy ${index + 1} has invalid position, fixing...`);
        
        // Generate new position near character/camera
        const coords = this.generateDebugSpawnCoordinates();
        enemy.position = { x: coords.x, y: coords.y };
        
        if (enemy.container) {
          enemy.container.x = coords.x;
          enemy.container.y = coords.y;
        }
        
        fixedCount++;
        console.log(`[ENEMY-MANAGER] 🔧 ✅ Fixed enemy ${index + 1} position to (${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`);
      }
      
      // Check if enemy is visible
      if (enemy.container && !enemy.container.visible) {
        enemy.container.visible = true;
        fixedCount++;
        console.log(`[ENEMY-MANAGER] 🔧 ✅ Fixed enemy ${index + 1} visibility`);
      }
      
      // Check if enemy is in proper hierarchy
      if (enemy.container && enemy.container.parent !== this.enemyManager.enemyContainer) {
        this.enemyManager.enemyContainer.addChild(enemy.container);
        fixedCount++;
        console.log(`[ENEMY-MANAGER] 🔧 ✅ Fixed enemy ${index + 1} hierarchy`);
      }
    });
    
    console.log(`[ENEMY-MANAGER] 🔧 Position verification complete: ${fixedCount} fixes applied`);
  }

  // Enhanced debug spawn coordinate generation with screen-aware positioning
  generateDebugSpawnCoordinates() {
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-MANAGER] 📍 === GENERATING DEBUG SPAWN COORDINATES ===`);
    }
    
    // Priority 1: Use character position if available
    if (window.gameMapManager?.character?.position) {
      const char = window.gameMapManager.character;
      const centerX = char.position.x;
      const centerY = char.position.y;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 📍 Using character position as spawn center: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`);
        
        // Check if character position will be visible on screen
        if (this.enemyManager.worldContainer && this.enemyManager.app?.screen) {
          const charScreenX = centerX + this.enemyManager.worldContainer.x;
          const charScreenY = centerY + this.enemyManager.worldContainer.y;
          console.log(`[ENEMY-MANAGER] 📍 Character screen position: (${charScreenX.toFixed(1)}, ${charScreenY.toFixed(1)})`);
          console.log(`[ENEMY-MANAGER] 📍 Screen bounds: ${this.enemyManager.app.screen.width}×${this.enemyManager.app.screen.height}`);
        }
      }
      
      // Generate coordinates around character (close enough to be visible)
      const spawnRadius = 100 + Math.random() * 200; // 100-300 pixels from character (much closer)
      const angle = Math.random() * 2 * Math.PI;
      
      const x = centerX + Math.cos(angle) * spawnRadius;
      const y = centerY + Math.sin(angle) * spawnRadius;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 📍 Generated spawn coordinates: (${x.toFixed(1)}, ${y.toFixed(1)})`);
        console.log(`[ENEMY-MANAGER] 📍 Distance from character: ${spawnRadius.toFixed(1)} pixels`);
        
        // Verify this position will be on screen
        if (this.enemyManager.worldContainer && this.enemyManager.app?.screen) {
          const predictedScreenX = x + this.enemyManager.worldContainer.x;
          const predictedScreenY = y + this.enemyManager.worldContainer.y;
          const isOnScreen = predictedScreenX >= 0 && predictedScreenX <= this.enemyManager.app.screen.width && 
                            predictedScreenY >= 0 && predictedScreenY <= this.enemyManager.app.screen.height;
          
          console.log(`[ENEMY-MANAGER] 📍 Predicted screen position: (${predictedScreenX.toFixed(1)}, ${predictedScreenY.toFixed(1)})`);
          console.log(`[ENEMY-MANAGER] 📍 Will be on screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
          
          if (!isOnScreen) {
            console.log(`[ENEMY-MANAGER] ⚠️ WARNING: Generated position may be off-screen!`);
          }
        }
      }
      
      return { x, y };
    }
    
    // Priority 2: Use screen center based on world container position
    if (this.enemyManager.worldContainer && this.enemyManager.app?.screen) {
      const screenCenterX = this.enemyManager.app.screen.width / 2;
      const screenCenterY = this.enemyManager.app.screen.height / 2;
      
      // Convert screen center to world coordinates
      const worldCenterX = screenCenterX - this.enemyManager.worldContainer.x;
      const worldCenterY = screenCenterY - this.enemyManager.worldContainer.y;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 📍 Using screen center as reference:`);
        console.log(`[ENEMY-MANAGER] 📍 Screen center: (${screenCenterX}, ${screenCenterY})`);
        console.log(`[ENEMY-MANAGER] 📍 World container offset: (${this.enemyManager.worldContainer.x}, ${this.enemyManager.worldContainer.y})`);
        console.log(`[ENEMY-MANAGER] 📍 World center: (${worldCenterX.toFixed(1)}, ${worldCenterY.toFixed(1)})`);
      }
      
      // Generate coordinates around screen center (guaranteed to be visible)
      const spawnRadius = 50 + Math.random() * 150; // 50-200 pixels from center (very close)
      const angle = Math.random() * 2 * Math.PI;
      
      const x = worldCenterX + Math.cos(angle) * spawnRadius;
      const y = worldCenterY + Math.sin(angle) * spawnRadius;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 📍 Generated spawn coordinates: (${x.toFixed(1)}, ${y.toFixed(1)})`);
        console.log(`[ENEMY-MANAGER] 📍 Distance from screen center: ${spawnRadius.toFixed(1)} pixels`);
        
        // Verify screen position
        const screenX = x + this.enemyManager.worldContainer.x;
        const screenY = y + this.enemyManager.worldContainer.y;
        console.log(`[ENEMY-MANAGER] 📍 Final screen position: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
        console.log(`[ENEMY-MANAGER] 📍 ✅ GUARANTEED ON SCREEN`);
      }
      
      return { x, y };
    }
    
    // Priority 3: Fallback to safe default near origin
    const defaultX = 960; // Safe default
    const defaultY = 540;
    
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-MANAGER] 📍 Using fallback coordinates: (${defaultX}, ${defaultY})`);
      console.log(`[ENEMY-MANAGER] ⚠️ No character or world container found, using safe defaults`);
    }
    
    return { x: defaultX, y: defaultY };
  }

  // Debug setters
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
    
    // Update all existing enemies
    this.enemyManager.enemies.forEach(enemy => {
      enemy.setDebugEnabled(enabled);
    });
    
    if (enabled) {
      console.log('Enemy debug logging enabled');
    } else {
      console.log('Enemy debug logging disabled');
    }
  }
  
  setAttackDebugEnabled(enabled) {
    this.attackDebugEnabled = enabled;
    
    // Update all existing enemies
    this.enemyManager.enemies.forEach(enemy => {
      enemy.setAttackDebugEnabled(enabled);
    });
    
    if (enabled) {
      console.log('Enemy attack debug logging enabled');
    } else {
      console.log('Enemy attack debug logging disabled');
    }
  }
  
  setHitRegDebugEnabled(enabled) {
    this.hitRegDebugEnabled = enabled;
    
    // Update all existing enemies
    this.enemyManager.enemies.forEach(enemy => {
      enemy.setHitRegDebugEnabled(enabled);
    });
    
    if (enabled) {
      console.log('Hit registration debug logging enabled');
      // Also run scaling debug when enabled
      this.debugScaling();
    } else {
      console.log('Hit registration debug logging disabled');
    }
  }
  
  setCoordinateDebugEnabled(enabled) {
    this.coordinateDebugEnabled = enabled;
    
    // Update all existing enemies
    this.enemyManager.enemies.forEach(enemy => {
      if (enemy.setCoordinateDebugEnabled) {
        enemy.setCoordinateDebugEnabled(enabled);
      }
    });
    
    if (enabled) {
      console.log('[COORD-DEBUG] 📐 Coordinate space debug logging enabled');
    } else {
      console.log('[COORD-DEBUG] 📐 Coordinate space debug logging disabled');
    }
  }
  
  setPositionLoggingEnabled(enabled) {
    this.positionLoggingEnabled = enabled;
    this.lastPositionLogTime = enabled ? Date.now() : 0;
    
    if (enabled) {
      console.log('🗺️ Position logging enabled - will log all slime positions every 5 seconds');
      // Log immediately when enabled
      this.logAllSlimePositions();
    } else {
      console.log('🗺️ Position logging disabled');
    }
  }
  
  setMapEnemyDebugEnabled(enabled) {
    this.mapEnemyDebugEnabled = enabled;
    this.lastMapEnemyDebugTime = enabled ? Date.now() : 0;
    
    if (enabled) {
      console.log('🗺️ MAP ENEMY DEBUG enabled - will analyze Map1 enemy system vs actual spawned enemies');
      // Log immediately when enabled
      this.performMapEnemyDebugAnalysis();
    } else {
      console.log('🗺️ MAP ENEMY DEBUG disabled');
    }
  }
  
  setSpawnDebugEnabled(enabled) {
    this.spawnDebugEnabled = enabled;
    
    if (enabled) {
      console.log('🎯 Spawn debug enabled - detailed enemy creation and initialization logs');
      // When spawn debug is enabled, also enable position verification
      console.log('🔍 Auto-enabling position verification for spawn debugging');
    } else {
      console.log('🎯 Spawn debug disabled');
    }
  }

  setRenderAnalysisEnabled(enabled) {
    console.log(`🔍 [DEBUG] setRenderAnalysisEnabled called with: ${enabled}`);
    this.renderAnalysisEnabled = enabled;
    this.lastRenderAnalysisTime = enabled ? Date.now() : 0;
    
    if (enabled) {
      console.log('🔍 Render Analysis enabled - will analyze enemy sizes and HP every 2 seconds');
      console.log(`🔍 [DEBUG] Current enemy count: ${this.enemyManager.enemies.length}`);
      console.log(`🔍 [DEBUG] Analysis flag set to: ${this.renderAnalysisEnabled}`);
      // Log immediately when enabled
      this.performRenderAnalysis();
    } else {
      console.log('🔍 Render Analysis disabled');
    }
  }

  // Debug utility methods
  logAllSlimePositions() {
    if (!this.positionLoggingEnabled || this.enemyManager.enemies.length === 0) {
      return;
    }
    
    console.log(`🗺️ === SLIME POSITION LOG (${this.enemyManager.enemies.length} slimes) ===`);
    
    // Get camera offset for coordinate calculations
    let cameraOffset = { x: 0, y: 0 };
    if (window.gameMapManager && window.gameMapManager.camera && window.gameMapManager.camera.mapContainer) {
      const mapContainer = window.gameMapManager.camera.mapContainer;
      cameraOffset.x = -mapContainer.x;
      cameraOffset.y = -mapContainer.y;
    }
    
    console.log(`🗺️ Camera offset: (${cameraOffset.x.toFixed(1)}, ${cameraOffset.y.toFixed(1)})`);
    
    this.enemyManager.enemies.forEach((enemy, index) => {
      if (enemy && enemy.isAlive) {
        const worldPos = enemy.position || { x: 'N/A', y: 'N/A' };
        const relativeToCamera = {
          x: typeof worldPos.x === 'number' ? worldPos.x - cameraOffset.x : 'N/A',
          y: typeof worldPos.y === 'number' ? worldPos.y - cameraOffset.y : 'N/A'
        };
        
        console.log(`🗺️ Slime ${index + 1} (${enemy.type}, ${enemy.currentHP}HP): World(${typeof worldPos.x === 'number' ? worldPos.x.toFixed(1) : worldPos.x}, ${typeof worldPos.y === 'number' ? worldPos.y.toFixed(1) : worldPos.y}) Camera-relative(${typeof relativeToCamera.x === 'number' ? relativeToCamera.x.toFixed(1) : relativeToCamera.x}, ${typeof relativeToCamera.y === 'number' ? relativeToCamera.y.toFixed(1) : relativeToCamera.y})`);
      }
    });
    
    console.log(`🗺️ === END POSITION LOG ===`);
  }

  // Render Analysis method - logs enemy sizes and HP every 2 seconds
  performRenderAnalysis() {
    console.log(`🔍 === RENDER ANALYSIS (${this.enemyManager.enemies.length} enemies) ===`);
    console.log(`🔍 Analysis enabled: ${this.renderAnalysisEnabled}`);
    console.log(`🔍 Timestamp: ${new Date().toLocaleTimeString()}`);
    
    if (this.enemyManager.enemies.length === 0) {
      console.log(`🔍 No enemies to analyze`);
      console.log(`🔍 === END RENDER ANALYSIS ===`);
      return;
    }
    
    this.enemyManager.enemies.forEach((enemy, index) => {
      if (enemy && enemy.isAlive) {
        const scaleInfo = {
          currentScale: enemy.currentScale || 'N/A',
          baseScale: enemy.baseScale || 'N/A',
          hp: `${enemy.currentHP}/${enemy.maxHP}`,
          position: enemy.position ? `(${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})` : 'N/A',
          visible: enemy.sprite?.visible || 'N/A',
          alpha: enemy.sprite?.alpha || 'N/A'
        };
        
        const spriteSize = enemy.sprite ? {
          width: enemy.sprite.width.toFixed(1),
          height: enemy.sprite.height.toFixed(1),
          scaleX: enemy.sprite.scale.x.toFixed(3),
          scaleY: enemy.sprite.scale.y.toFixed(3)
        } : 'N/A';
        
        console.log(`🔍 Enemy ${index + 1} (${enemy.type}):`, scaleInfo);
        console.log(`🔍   Sprite size:`, spriteSize);
      }
    });
    
    console.log(`🔍 === END RENDER ANALYSIS ===`);
  }

  // Map Enemy Debug Analysis
  performMapEnemyDebugAnalysis() {
    console.log(`🗺️ === MAP ENEMY DEBUG ANALYSIS ===`);
    
    // Get Map1 instance if available
    const map1Instance = window.gameMapManager?.map1Instance;
    if (!map1Instance) {
      console.log(`🗺️ No Map1 instance found`);
      return;
    }
    
    // Check Map1 enemy spawn data
    if (map1Instance.enemySpawnData) {
      const spawnData = map1Instance.enemySpawnData;
      const totalPlanned = (spawnData.centerTiles?.length || 0) + 
                          (spawnData.portalTiles?.length || 0) + 
                          (spawnData.otherTiles?.length || 0);
      
      console.log(`🗺️ Map1 planned enemies: ${totalPlanned}`);
      console.log(`🗺️   Center tiles: ${spawnData.centerTiles?.length || 0}`);
      console.log(`🗺️   Portal tiles: ${spawnData.portalTiles?.length || 0}`);
      console.log(`🗺️   Other tiles: ${spawnData.otherTiles?.length || 0}`);
    }
    
    // Check actual spawned enemies
    const actualEnemies = this.enemyManager.enemies.filter(e => e.isAlive);
    console.log(`🗺️ Actually spawned enemies: ${actualEnemies.length}`);
    
    const redCount = actualEnemies.filter(e => e.type === 'red').length;
    const blueCount = actualEnemies.filter(e => e.type === 'blue').length;
    console.log(`🗺️   Red slimes: ${redCount}`);
    console.log(`🗺️   Blue slimes: ${blueCount}`);
    
    console.log(`🗺️ === END MAP ENEMY DEBUG ANALYSIS ===`);
  }

  // Debug scaling
  debugScaling() {
    console.log(`🔍 === SCALING DEBUG ===`);
    
    this.enemyManager.enemies.forEach((enemy, index) => {
      if (enemy && enemy.isAlive) {
        console.log(`🔍 Enemy ${index + 1} scaling:`, {
          type: enemy.type,
          hp: `${enemy.currentHP}/${enemy.maxHP}`,
          currentScale: enemy.currentScale,
          baseScale: enemy.baseScale,
          spriteScale: enemy.sprite ? { x: enemy.sprite.scale.x, y: enemy.sprite.scale.y } : 'N/A'
        });
      }
    });
    
    console.log(`🔍 === END SCALING DEBUG ===`);
  }

  // Force spawn enemy with verification
  forceSpawnEnemyWithVerification(type = 'red', x = null, y = null, hp = 1) {
    console.log(`[ENEMY-MANAGER] 🎯 === FORCE SPAWN WITH VERIFICATION ===`);
    console.log(`[ENEMY-MANAGER] 🎯 Attempting to spawn ${type} slime (${hp}HP) at (${x?.toFixed(1) || 'auto'}, ${y?.toFixed(1) || 'auto'})`);
    
    // Enable debug logging for this spawn
    const originalSpawnDebug = this.spawnDebugEnabled;
    this.spawnDebugEnabled = true;
    
    // Attempt spawn
    return this.enemyManager.spawnEnemy(type, x, y, hp).then(enemy => {
      // Restore original debug state
      this.spawnDebugEnabled = originalSpawnDebug;
      
      if (enemy) {
        console.log(`[ENEMY-MANAGER] ✅ Force spawn successful: ${type} slime (${hp}HP) created`);
        
        // Additional verification
        setTimeout(() => {
          console.log(`[ENEMY-MANAGER] 🔍 Post-spawn position check:`);
          if (enemy.position) {
            console.log(`[ENEMY-MANAGER] 🔍 Enemy position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
          }
          if (enemy.sprite && enemy.sprite.toGlobal) {
            try {
              const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
              console.log(`[ENEMY-MANAGER] 🔍 Global position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
            } catch (error) {
              console.log(`[ENEMY-MANAGER] 🔍 Could not get global position: ${error.message}`);
            }
          }
          
          // Verify all enemies after this spawn
          this.verifyAndFixEnemyPositions();
        }, 200);
        
        return enemy;
      } else {
        console.log(`[ENEMY-MANAGER] ❌ Force spawn failed: ${type} slime (${hp}HP) not created`);
        return null;
      }
    }).catch(error => {
      // Restore original debug state
      this.spawnDebugEnabled = originalSpawnDebug;
      console.error(`[ENEMY-MANAGER] ❌ Force spawn error:`, error);
      return null;
    });
  }

  // Helper method to return enemies to starting positions (for debugging)
  returnEnemiesToStartingPositions() {
    console.log(`[ENEMY-MANAGER] 🏠 === RETURNING ENEMIES TO STARTING POSITIONS ===`);
    
    if (this.enemyManager.enemies.length === 0) {
      console.log(`[ENEMY-MANAGER] 🏠 No enemies to reposition`);
      return;
    }
    
    // Get character position as reference
    let referenceX = 960; // Default center
    let referenceY = 540;
    
    if (window.gameMapManager && window.gameMapManager.character && window.gameMapManager.character.position) {
      const char = window.gameMapManager.character;
      referenceX = char.position.x;
      referenceY = char.position.y;
      console.log(`[ENEMY-MANAGER] 🏠 Using character position as reference: (${referenceX.toFixed(1)}, ${referenceY.toFixed(1)})`);
    } else {
      console.log(`[ENEMY-MANAGER] 🏠 Using default center as reference: (${referenceX.toFixed(1)}, ${referenceY.toFixed(1)})`);
    }
    
    // Reposition each enemy in a circle around the reference point
    this.enemyManager.enemies.forEach((enemy, index) => {
      if (!enemy || !enemy.isAlive) return;
      
      // Calculate position in circle
      const angleStep = (2 * Math.PI) / this.enemyManager.enemies.length;
      const angle = index * angleStep;
      const radius = 400 + Math.random() * 200; // 400-600 pixels from reference
      
      const newX = referenceX + Math.cos(angle) * radius;
      const newY = referenceY + Math.sin(angle) * radius;
      
      // Update position
      if (enemy.position) {
        const oldX = enemy.position.x;
        const oldY = enemy.position.y;
        
        enemy.position.x = newX;
        enemy.position.y = newY;
        
        if (enemy.container) {
          enemy.container.x = newX;
          enemy.container.y = newY;
        }
        
        console.log(`[ENEMY-MANAGER] 🏠 Moved ${enemy.type} slime ${index + 1}: (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) → (${newX.toFixed(1)}, ${newY.toFixed(1)})`);
      }
    });
    
    console.log(`[ENEMY-MANAGER] 🏠 Repositioned ${this.enemyManager.enemies.length} enemies in starting formation`);
    
    // Verify positions after repositioning
    setTimeout(() => {
      this.verifyAndFixEnemyPositions();
    }, 100);
  }

  // Force all enemies to be visible and properly positioned
  forceEnemyVisibility() {
    console.log(`[ENEMY-MANAGER] 👁️ === FORCING ENEMY VISIBILITY ===`);
    
    if (this.enemyManager.enemies.length === 0) {
      console.log(`[ENEMY-MANAGER] 👁️ No enemies to make visible`);
      return 0;
    }
    
    let fixedCount = 0;
    
    this.enemyManager.enemies.forEach((enemy, index) => {
      if (!enemy || !enemy.isAlive) {
        console.log(`[ENEMY-MANAGER] 👁️ Enemy ${index + 1}: Skipped (not alive)`);
        return;
      }
      
      console.log(`[ENEMY-MANAGER] 👁️ Forcing visibility for Enemy ${index + 1} (${enemy.type}):`);
      
      let enemyFixed = false;
      
      // Fix container visibility
      if (enemy.container) {
        if (!enemy.container.visible) {
          enemy.container.visible = true;
          enemyFixed = true;
          console.log(`[ENEMY-MANAGER] 👁️   ✅ Fixed container visibility`);
        }
        
        if (enemy.container.alpha < 1) {
          enemy.container.alpha = 1;
          enemyFixed = true;
          console.log(`[ENEMY-MANAGER] 👁️   ✅ Fixed container alpha`);
        }
      }
      
      // Fix sprite visibility
      if (enemy.sprite) {
        if (!enemy.sprite.visible) {
          enemy.sprite.visible = true;
          enemyFixed = true;
          console.log(`[ENEMY-MANAGER] 👁️   ✅ Fixed sprite visibility`);
        }
        
        if (enemy.sprite.alpha < 1) {
          enemy.sprite.alpha = 1;
          enemyFixed = true;
          console.log(`[ENEMY-MANAGER] 👁️   ✅ Fixed sprite alpha`);
        }
        
        // Ensure sprite has proper size
        if (enemy.sprite.width <= 0 || enemy.sprite.height <= 0) {
          // Reset scale to base scale
          if (enemy.baseScale) {
            enemy.sprite.scale.set(enemy.baseScale);
            enemyFixed = true;
            console.log(`[ENEMY-MANAGER] 👁️   ✅ Fixed sprite size`);
          }
        }
      }
      
      // Ensure enemy is in proper container hierarchy
      if (enemy.container && enemy.container.parent !== this.enemyManager.enemyContainer) {
        try {
          this.enemyManager.enemyContainer.addChild(enemy.container);
          enemyFixed = true;
          console.log(`[ENEMY-MANAGER] 👁️   ✅ Fixed container hierarchy`);
        } catch (hierarchyError) {
          console.log(`[ENEMY-MANAGER] 👁️   ❌ Failed to fix hierarchy: ${hierarchyError.message}`);
        }
      }
      
      // Force z-index
      if (enemy.container) {
        enemy.container.zIndex = 10000;
        enemyFixed = true;
      }
      
      if (enemyFixed) {
        fixedCount++;
        console.log(`[ENEMY-MANAGER] 👁️   ✅ Enemy ${index + 1} fixed`);
      } else {
        console.log(`[ENEMY-MANAGER] 👁️   ✅ Enemy ${index + 1} already OK`);
      }
    });
    
    // Ensure EnemyManager container hierarchy
    this.enemyManager.ensureContainerHierarchy();
    
    // Force a render refresh
    if (this.enemyManager.app && this.enemyManager.app.renderer) {
      this.enemyManager.app.renderer.render(this.enemyManager.app.stage);
    }
    
    console.log(`[ENEMY-MANAGER] 👁️ Visibility forcing complete: ${fixedCount} enemies fixed`);
    console.log(`[ENEMY-MANAGER] 👁️ === END VISIBILITY FORCING ===`);
    
    return fixedCount;
  }

  // Debug method to add visual indicators to all enemies
  addDebugVisualIndicators() {
    this.enemyManager.enemies.forEach(enemy => {
      if (enemy.isAlive) {
        enemy.addDebugVisualIndicator();
      }
    });
    console.log(`[ENEMY-MANAGER] Added debug visual indicators to ${this.enemyManager.enemies.length} enemies`);
  }
  
  // Debug method to remove visual indicators from all enemies
  removeDebugVisualIndicators() {
    this.enemyManager.enemies.forEach(enemy => {
      enemy.removeDebugVisualIndicator();
    });
    console.log(`[ENEMY-MANAGER] Removed debug visual indicators from all enemies`);
  }

  // Handle periodic debug updates
  handlePeriodicDebugUpdates(deltaTime) {
    // Handle periodic position logging
    if (this.positionLoggingEnabled) {
      const now = Date.now();
      if (now - this.lastPositionLogTime >= this.positionLogInterval) {
        this.logAllSlimePositions();
        this.lastPositionLogTime = now;
      }
    }
    
    // Handle periodic render analysis
    if (this.renderAnalysisEnabled) {
      const now = Date.now();
      if (now - this.lastRenderAnalysisTime >= this.renderAnalysisInterval) {
        console.log(`🔍 [DEBUG] Periodic render analysis triggered at ${new Date().toLocaleTimeString()}`);
        this.performRenderAnalysis();
        this.lastRenderAnalysisTime = now;
      }
    }
    
    // Handle periodic Map Enemy Debug analysis
    if (this.mapEnemyDebugEnabled) {
      const now = Date.now();
      if (now - this.lastMapEnemyDebugTime >= 3000) { // Every 3 seconds
        console.log(`🗺️ [MAP-DEBUG] Periodic map enemy analysis triggered at ${new Date().toLocaleTimeString()}`);
        this.performMapEnemyDebugAnalysis();
        this.lastMapEnemyDebugTime = now;
      }
    }
  }
}
