import * as PIXI from 'pixi.js';
import Enemy from '../entities/Enemy.js';
import EnemyManagerDebug from './EnemyManagerDebug.js';
import EnemyAI from './EnemyAI.js';

/**
 * EnemyManager handles all enemy-related operations
 */
export default class EnemyManager {
  constructor(app, gameContainer) {
    this.app = app;
    this.gameContainer = gameContainer;
    this.enemies = [];
    this.enemyContainer = new PIXI.Container();
    
    // Enable sorting and set high z-index for visibility
    this.enemyContainer.sortableChildren = true;
    this.enemyContainer.zIndex = 10000;
    
    // Enable sorting on game container too if not already enabled
    if (gameContainer) {
      gameContainer.sortableChildren = true;
    }
    
    // Don't add to scene immediately - wait for proper world container
    this.worldContainer = null;
    this.addedToScene = false;
    
    // Initialize AI system
    this.enemyAI = new EnemyAI(app, gameContainer);
    
    // Initialize debug manager
    this.debug = new EnemyManagerDebug(this);
    
    // Player control
    this.playerControlledEnemy = null;
    
    // Input handling
    this.keys = {};
    this.setupInputHandling();
    
    // Update loop
    this.lastUpdate = Date.now();
    this.updateInterval = 16; // ~60 FPS
    this.startUpdateLoop();
  }
  
  // Method to set the world container (should be called by MapManager)
  setWorldContainer(worldContainer) {
    this.worldContainer = worldContainer;
    if (worldContainer && !this.addedToScene) {
      // Add enemy container to the world container (moves with camera)
      worldContainer.addChild(this.enemyContainer);
      this.addedToScene = true;
      
      // Log only if spawn debug is enabled (note: may not be set yet during initial setup)
      if (this.debug?.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 🌍 EnemyContainer added to world container:`, {
          worldContainerType: worldContainer.constructor.name,
          enemyContainerParent: this.enemyContainer.parent?.constructor?.name,
          enemyContainerPosition: { x: this.enemyContainer.x, y: this.enemyContainer.y },
          worldContainerPosition: { x: worldContainer.x, y: worldContainer.y }
        });
      }
    }
  }
  
  /**
   * Ensures the container hierarchy is valid before adding enemies.
   * This method extracts the critical fix logic that was previously only
   * running when spawn debug was enabled, making it always available.
   */
  ensureContainerHierarchy() {
    // Check if EnemyManager is properly added to world container
    if (this.worldContainer && !this.worldContainer.children.includes(this.enemyContainer)) {
      try {
        // Check if enemyContainer is destroyed and recreate if needed
        if (this.enemyContainer?.destroyed) {
          console.warn(`[ENEMY-MANAGER] ⚠️ CRITICAL: EnemyContainer is destroyed, recreating it...`);
          this.enemyContainer = new PIXI.Container();
          this.enemyContainer.sortableChildren = true;
          this.enemyContainer.zIndex = 10000;
          
          // Re-add all existing enemies to the new container
          if (this.enemies && this.enemies.length > 0) {
            this.enemies.forEach((existingEnemy, index) => {
              if (existingEnemy && existingEnemy.container && !existingEnemy.container.destroyed) {
                this.enemyContainer.addChild(existingEnemy.container);
              }
            });
          }
        }
        
        // Add EnemyManager to world container if not already added
        if (this.worldContainer && this.enemyContainer && 
            typeof this.worldContainer.addChild === 'function' && 
            this.enemyContainer.parent !== this.worldContainer) {
          
          this.worldContainer.addChild(this.enemyContainer);
          this.addedToScene = true;
        }
      } catch (fixError) {
        console.error(`[ENEMY-MANAGER] ❌ Container hierarchy fix failed:`, fixError);
      }
    }
  }
  
  setupInputHandling() {
    // Key event handlers
    const handleKeyDown = (event) => {
      this.keys[event.key.toLowerCase()] = true;
    };
    
    const handleKeyUp = (event) => {
      this.keys[event.key.toLowerCase()] = false;
    };
    
    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Store references for cleanup
    this.keyDownHandler = handleKeyDown;
    this.keyUpHandler = handleKeyUp;
  }
  
  startUpdateLoop() {
    const update = () => {
      const now = Date.now();
      const deltaTime = now - this.lastUpdate;
      
      if (deltaTime >= this.updateInterval) {
        this.update(deltaTime);
        this.lastUpdate = now;
      }
      
      requestAnimationFrame(update);
    };
    update();
  }
  
  update(deltaTime) {
    // Update all enemies
    this.enemies.forEach(enemy => {
      if (enemy && enemy.isAlive) {
        enemy.update(deltaTime);
      }
    });
    
    // Update AI for all enemies
    const character = window.gameMapManager?.character;
    if (character && this.enemyAI) {
      this.enemyAI.updateAI(this.enemies, character, deltaTime);
    }
    
    // Handle player control input
    this.handlePlayerControlInput();
    
    // Remove dead enemies
    this.cleanupDeadEnemies();
    
    // Handle periodic position logging
    if (this.debug?.positionLoggingEnabled) {
      const now = Date.now();
      if (now - this.debug.lastPositionLogTime >= this.debug.positionLogInterval) {
        this.debug.logAllSlimePositions();
        this.debug.lastPositionLogTime = now;
      }
    }
    
    // Handle periodic render analysis
    if (this.debug?.renderAnalysisEnabled) {
      const now = Date.now();
      if (now - this.debug.lastRenderAnalysisTime >= this.debug.renderAnalysisInterval) {
        console.log(`🔍 [DEBUG] Periodic render analysis triggered at ${new Date().toLocaleTimeString()}`);
        this.debug.performRenderAnalysis();
        this.debug.lastRenderAnalysisTime = now;
      }
    }
    
    // Handle periodic Map Enemy Debug analysis
    if (this.debug?.mapEnemyDebugEnabled) {
      const now = Date.now();
      if (now - this.debug.lastMapEnemyDebugTime >= 3000) { // Every 3 seconds
        console.log(`🗺️ [MAP-DEBUG] Periodic map enemy analysis triggered at ${new Date().toLocaleTimeString()}`);
        this.debug.performMapEnemyDebugAnalysis();
        this.debug.lastMapEnemyDebugTime = now;
      }
    }
  }
  
  handlePlayerControlInput() {
    if (!this.playerControlledEnemy || !this.playerControlledEnemy.isAlive) {
      return;
    }
    
    // Movement controls (UJHK)
    if (this.keys['u']) {
      this.playerControlledEnemy.moveUp();
    }
    if (this.keys['j']) {
      this.playerControlledEnemy.moveDown();
    }
    if (this.keys['h']) {
      this.playerControlledEnemy.moveLeft();
    }
    if (this.keys['k']) {
      this.playerControlledEnemy.moveRight();
    }
    
    // Attack control (V)
    if (this.keys['v']) {
      this.playerControlledEnemy.attack();
      // Prevent spam attacking
      this.keys['v'] = false;
    }
  }
  
  async spawnEnemy(type = 'red', x = null, y = null, hp = 1) {
    // Log detailed spawn attempt for debugging
    if (this.spawnDebugEnabled) {
      this.logDetailedSpawnAttempt(type, x, y, hp);
    }
    
    // Ensure world container is set before spawning
    if (!this.worldContainer || !this.addedToScene) {
      console.warn(`[ENEMY-MANAGER] ⚠️ Cannot spawn enemy: world container not set. Waiting for MapManager...`);
      return null;
    }
    
    // Handle coordinates - use provided world coordinates or generate fallback
    if (x === null || y === null) {
      // SIMPLIFIED FALLBACK: Generate coordinates around current camera view
      console.log(`[ENEMY-MANAGER] 📍 No coordinates provided, generating debug spawn position around current view`);
      
      // Get current camera/view center from world container position
      let cameraX = 0;
      let cameraY = 0;
      
      // The world container position tells us where the camera is looking
      if (this.worldContainer) {
        // World container position is inverted from camera position
        cameraX = -this.worldContainer.x;
        cameraY = -this.worldContainer.y;
        
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-MANAGER] 📹 Camera position from world container: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`);
          console.log(`[ENEMY-MANAGER] 📹 World container position: (${this.worldContainer.x.toFixed(1)}, ${this.worldContainer.y.toFixed(1)})`);
        }
      }
      
      // Get character position as additional reference if available
      if (window.gameMapManager && window.gameMapManager.character && window.gameMapManager.character.position) {
        const charX = window.gameMapManager.character.position.x;
        const charY = window.gameMapManager.character.position.y;
        
        // Use character position if it makes sense, otherwise use camera center
        if (Math.abs(charX - cameraX) < 2000 && Math.abs(charY - cameraY) < 2000) {
          cameraX = charX;
          cameraY = charY;
          console.log(`[ENEMY-MANAGER] 📍 Using character position as spawn center: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`);
        } else {
          console.log(`[ENEMY-MANAGER] 📍 Character too far from camera, using camera center: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`);
        }
      } else {
        console.log(`[ENEMY-MANAGER] � No character found, using camera center: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`);
      }
      
      // Generate spawn position around the camera center (within visible area)
      const spawnRadius = 400 + Math.random() * 400; // 400-800 pixels from center
      const angle = Math.random() * 2 * Math.PI;
      
      x = cameraX + Math.cos(angle) * spawnRadius;
      y = cameraY + Math.sin(angle) * spawnRadius;
      
      console.log(`[ENEMY-MANAGER] � Generated debug spawn coordinates: (${x.toFixed(1)}, ${y.toFixed(1)})`);
      console.log(`[ENEMY-MANAGER] 📍 Distance from camera center: ${spawnRadius.toFixed(1)} pixels`);
    } else {
      // USE PROVIDED WORLD COORDINATES (from Map1 tile system)
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 🎯 Using provided world coordinates: (${x.toFixed(1)}, ${y.toFixed(1)})`);
        console.log(`[ENEMY-MANAGER] 🎯 These coordinates are already in world space - no camera offset correction needed`);
      }
    }
    
    // Critical debug point: Log immediately after coordinate calculation
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-MANAGER] 🔧 CRITICAL: Post-coordinate calculation checkpoint`);
      console.log(`[ENEMY-MANAGER] 🔧 CRITICAL: Variables state:`, {
        x: x,
        y: y,
        xType: typeof x,
        yType: typeof y,
        xIsNull: x === null,
        yIsNull: y === null,
        xIsUndefined: x === undefined,
        yIsUndefined: y === undefined
      });
    }
    
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-MANAGER] 🎯 Spawning ${type} slime at coordinates (${x.toFixed(1)}, ${y.toFixed(1)}) with ${hp}HP`);
      
      // Add safety checks for potentially null objects
      let enemyContainerInfo = {};
      try {
        enemyContainerInfo = {
          hasEnemyContainer: !!this.enemyContainer,
          enemyContainerParent: this.enemyContainer?.parent?.constructor?.name,
          enemyContainerVisible: this.enemyContainer?.visible,
          enemyContainerAlpha: this.enemyContainer?.alpha,
          enemyContainerPosition: this.enemyContainer ? { x: this.enemyContainer.x, y: this.enemyContainer.y } : null,
          enemyContainerChildren: this.enemyContainer?.children?.length
        };
      } catch (containerError) {
        enemyContainerInfo = { error: `Failed to read container info: ${containerError.message}` };
      }
      
      let appInfo = {};
      try {
        appInfo = {
          hasApp: !!this.app,
          hasGameContainer: !!this.gameContainer,
          hasWorldContainer: !!this.worldContainer,
          addedToScene: this.addedToScene,
          appScreenSize: this.app?.screen ? { width: this.app.screen.width, height: this.app.screen.height } : null
        };
      } catch (appError) {
        appInfo = { error: `Failed to read app info: ${appError.message}` };
      }
      
      console.log(`[ENEMY-MANAGER] EnemyManager state:`, {
        ...appInfo,
        ...enemyContainerInfo
      });
    }
    
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-MANAGER] 🔧 PRE-CREATION: About to enter enemy creation pipeline...`);
      console.log(`[ENEMY-MANAGER] 🔧 PRE-CREATION: Final coordinates to use:`, { x, y, hp, type });
      console.log(`[ENEMY-MANAGER] 🔧 PRE-CREATION: App object details:`, {
        hasApp: !!this.app,
        appConstructor: this.app?.constructor?.name,
        appScreen: !!this.app?.screen,
        appRenderer: !!this.app?.renderer,
        appStage: !!this.app?.stage
      });
    }
    
    let enemy;
    try {
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 🔧 Step 1: Creating enemy instance...`);
        console.log(`[ENEMY-MANAGER] 🔧 Step 1a: Parameters validation:`, { 
          app: !!this.app, 
          appIsValid: this.app && typeof this.app === 'object',
          type, 
          x: typeof x, 
          y: typeof y, 
          hp: typeof hp,
          xValue: x,
          yValue: y,
          hpValue: hp
        });
        console.log(`[ENEMY-MANAGER] 🔧 Step 1b: About to call new Enemy(this.app, type, x, y, hp)...`);
        console.log(`[ENEMY-MANAGER] 🔧 Step 1c: Exact parameters:`, [this.app, type, x, y, hp]);
      }
      
      // Add try-catch around just the constructor call
      try {
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-MANAGER] 🔧 Step 1d: Calling Enemy constructor NOW...`);
        }
        enemy = new Enemy(this.app, type, x, y, hp);
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-MANAGER] 🔧 Step 1e: Enemy constructor completed successfully`);
        }
      } catch (constructorError) {
        console.error(`[ENEMY-MANAGER] ❌ Step 1 CONSTRUCTOR FAILED:`, constructorError);
        console.error(`[ENEMY-MANAGER] ❌ Constructor parameters were:`, { app: this.app, type, x, y, hp });
        throw constructorError;
      }
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] ✅ Step 1f: Enemy instance created successfully`);
        console.log(`[ENEMY-MANAGER] ✅ Step 1g: Enemy object validation:`, { 
          exists: !!enemy, 
          type: enemy?.type, 
          position: enemy?.position,
          hasContainer: !!enemy?.container,
          hasSprite: !!enemy?.sprite,
          isAlive: enemy?.isAlive
        });
      }
    } catch (error) {
      console.error(`[ENEMY-MANAGER] ❌ Step 1 FAILED: Failed to create enemy instance:`, error);
      console.error(`[ENEMY-MANAGER] ❌ Step 1 FAILED: Stack trace:`, error.stack);
      console.error(`[ENEMY-MANAGER] ❌ Step 1 FAILED: This.app state:`, {
        hasApp: !!this.app,
        appDetails: this.app,
        coordinates: { x, y },
        parameters: { type, hp }
      });
      return null;
    }
    
    try {
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 🔧 Step 2: Setting enemy debug properties...`);
        console.log(`[ENEMY-MANAGER] 🔧 Step 2a: Debug flags:`, {
          debugEnabled: this.debugEnabled,
          positionLoggingEnabled: this.positionLoggingEnabled,
          attackDebugEnabled: this.attackDebugEnabled,
          hitRegDebugEnabled: this.hitRegDebugEnabled,
          spawnDebugEnabled: this.debug?.spawnDebugEnabled
        });
      }
      
      enemy.setDebugEnabled(this.debug?.debugEnabled || this.debug?.positionLoggingEnabled);
      if (this.debug?.spawnDebugEnabled) console.log(`[ENEMY-MANAGER] 🔧 Step 2b: setDebugEnabled completed`);
      
      enemy.setAttackDebugEnabled(this.debug?.attackDebugEnabled);
      if (this.debug?.spawnDebugEnabled) console.log(`[ENEMY-MANAGER] 🔧 Step 2c: setAttackDebugEnabled completed`);
      
      enemy.setHitRegDebugEnabled(this.debug?.hitRegDebugEnabled);
      if (this.debug?.spawnDebugEnabled) console.log(`[ENEMY-MANAGER] 🔧 Step 2d: setHitRegDebugEnabled completed`);
      
      enemy.setSpawnDebugEnabled(this.debug?.spawnDebugEnabled);
      if (this.debug?.spawnDebugEnabled) console.log(`[ENEMY-MANAGER] 🔧 Step 2e: setSpawnDebugEnabled completed`);
      
      if (this.debug?.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] ✅ Step 2f: All enemy debug properties set successfully`);
      }
    } catch (error) {
      console.error(`[ENEMY-MANAGER] ❌ Step 2 FAILED: Failed to set enemy debug properties:`, error);
      console.error(`[ENEMY-MANAGER] ❌ Step 2 FAILED: Stack trace:`, error.stack);
      return null;
    }
    
    // Wait for enemy to initialize
    try {
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 🔧 Step 3: About to initialize enemy...`);
        console.log(`[ENEMY-MANAGER] 🔧 Step 3a: Enemy state before init:`, {
          hasEnemy: !!enemy,
          enemyType: enemy?.type,
          enemyPosition: enemy?.position,
          hasInit: typeof enemy?.init === 'function'
        });
      }
      
      await enemy.init();
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] ✅ Step 3b: Enemy initialized successfully`);
        console.log(`[ENEMY-MANAGER] ✅ Step 3c: Enemy state after init:`, {
          hasContainer: !!enemy.container,
          hasSprite: !!enemy.sprite,
          containerPosition: enemy.container?.position,
          spriteExists: !!enemy.sprite
        });
      }
    } catch (error) {
      console.error(`[ENEMY-MANAGER] ❌ Step 3 FAILED: Failed to initialize enemy:`, error);
      console.error(`[ENEMY-MANAGER] ❌ Step 3 FAILED: Stack trace:`, error.stack);
      return null;
    }
    
    if (enemy.container) {
      // CRITICAL: Ensure container hierarchy is valid before adding enemy
      this.ensureContainerHierarchy();
      
      this.enemyContainer.addChild(enemy.container);
      this.enemies.push(enemy);
      
      // Initialize AI for the new enemy
      if (this.enemyAI) {
        this.enemyAI.initializeEnemyAI(enemy);
        if (this.debug?.spawnDebugEnabled) {
          console.log(`[ENEMY-MANAGER] 🧠 AI initialized for ${enemy.type} slime`);
        }
      }
      
      // Force visibility check
      if (enemy.container.visible === false) {
        console.warn(`[ENEMY-MANAGER] ⚠️ Enemy container is not visible! Forcing visible=true`);
        enemy.container.visible = true;
      }
      
      // Apply pixel-perfect sizing after enemy is fully initialized
      this.applyPixelPerfectSize(enemy, enemy.currentHP);
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] ✅ Enemy added to containers:`, {
          enemyType: type,
          enemyHP: `${enemy.currentHP}/${enemy.maxHP}`,
          enemyScale: `${(enemy.currentScale * 100).toFixed(0)}%`,
          enemyPosition: { x: x.toFixed(1), y: y.toFixed(1) },
          enemyContainerExists: !!enemy.container,
          enemyContainerVisible: enemy.container.visible,
          enemyContainerAlpha: enemy.container.alpha,
          enemyContainerChildren: enemy.container.children.length,
          enemyContainerParent: enemy.container.parent?.constructor?.name,
          enemySpriteExists: !!enemy.sprite,
          enemySpriteVisible: enemy.sprite?.visible,
          enemySpriteAlpha: enemy.sprite?.alpha,
          enemySpriteTexture: enemy.sprite?.texture?.baseTexture?.resource?.url,
          enemyContainerWorldTransform: {
            tx: enemy.container.worldTransform?.tx,
            ty: enemy.container.worldTransform?.ty
          },
          enemyManagerContainerChildren: this.enemyContainer.children.length,
          totalEnemiesTracked: this.enemies.length,
          containerHierarchy: {
            gameContainer: this.gameContainer?.constructor?.name,
            enemyContainer: this.enemyContainer?.constructor?.name,
            enemyContainer_parent: this.enemyContainer.parent?.constructor?.name,
            enemy_container: enemy.container?.constructor?.name,
            enemy_sprite: enemy.sprite?.constructor?.name
          }
        });
        
        // Test visibility chain
        let currentContainer = enemy.container;
        const visibilityChain = [];
        while (currentContainer) {
          try {
            visibilityChain.push({
              name: currentContainer.constructor.name,
              visible: currentContainer.visible,
              alpha: currentContainer.alpha,
              worldVisible: currentContainer.worldVisible,
              position: currentContainer.position ? { x: currentContainer.position.x, y: currentContainer.position.y } : 
                       (currentContainer.x !== undefined && currentContainer.y !== undefined) ? { x: currentContainer.x, y: currentContainer.y } : null,
              scale: currentContainer.scale ? { x: currentContainer.scale.x, y: currentContainer.scale.y } : null,
              children: currentContainer.children?.length || 0
            });
          } catch (containerError) {
            visibilityChain.push({
              name: currentContainer.constructor?.name || 'Unknown',
              error: `Failed to read container properties: ${containerError.message}`
            });
          }
          currentContainer = currentContainer.parent;
        }
        console.log(`[ENEMY-MANAGER] 👁️ Visibility chain:`, visibilityChain);
        
        // EXPLICIT VALUES - Show key visibility info directly
        console.log(`[ENEMY-MANAGER] 🔍 KEY VISIBILITY INFO:`);
        visibilityChain.forEach((container, index) => {
          console.log(`  Container ${index}: ${container.name} - visible:${container.visible} alpha:${container.alpha} pos:${JSON.stringify(container.position)}`);
        });
        
        // Additional debug: Check if enemy is actually in the render tree
        console.log(`[ENEMY-MANAGER] 🔍 Enemy container hierarchy:`, {
          enemyContainerParent: enemy.container?.parent?.constructor?.name,
          enemyContainerInEnemyManager: this.enemyContainer.children.includes(enemy.container),
          enemyManagerInWorld: this.worldContainer?.children?.includes(this.enemyContainer),
          totalEnemiesInManager: this.enemies.length,
          totalContainersInEnemyContainer: this.enemyContainer.children.length
        });
        
        // EXPLICIT HIERARCHY VALUES
        console.log(`[ENEMY-MANAGER] 🔍 KEY HIERARCHY INFO:`);
        console.log(`  Enemy in EnemyManager: ${this.enemyContainer.children.includes(enemy.container)}`);
        console.log(`  EnemyManager in World: ${this.worldContainer?.children?.includes(this.enemyContainer)}`);
        console.log(`  Total enemies: ${this.enemies.length}`);
        console.log(`  Enemy container parent: ${enemy.container?.parent?.constructor?.name}`);
        
        // DEBUG: If EnemyManager not in world, try to fix it
        if (this.worldContainer && !this.worldContainer.children.includes(this.enemyContainer)) {
          console.warn(`[ENEMY-MANAGER] ⚠️ FIXING: EnemyManager not in world container, adding it now...`);
          try {
            // Check if enemyContainer is destroyed and recreate if needed
            if (this.enemyContainer?.destroyed) {
              console.warn(`[ENEMY-MANAGER] ⚠️ CRITICAL: EnemyContainer is destroyed, recreating it...`);
              this.enemyContainer = new PIXI.Container();
              this.enemyContainer.sortableChildren = true;
              console.log(`[ENEMY-MANAGER] ✅ RECREATED: New EnemyContainer created`);
              
              // Re-add all existing enemies to the new container
              if (this.enemies && this.enemies.length > 0) {
                console.log(`[ENEMY-MANAGER] 🔄 Re-adding ${this.enemies.length} existing enemies to new container...`);
                this.enemies.forEach((existingEnemy, index) => {
                  if (existingEnemy && existingEnemy.container && !existingEnemy.container.destroyed) {
                    this.enemyContainer.addChild(existingEnemy.container);
                    console.log(`[ENEMY-MANAGER] ✅ Re-added enemy ${index + 1}/${this.enemies.length}`);
                  }
                });
              }
            }
            
            // Additional safety checks before addChild
            const preFixValidation = {
              hasWorldContainer: !!this.worldContainer,
              hasEnemyContainer: !!this.enemyContainer,
              worldContainerChildren: this.worldContainer?.children?.length,
              enemyContainerParent: this.enemyContainer?.parent?.constructor?.name,
              worldContainerValid: this.worldContainer && typeof this.worldContainer.addChild === 'function',
              enemyContainerValid: this.enemyContainer && this.enemyContainer.parent !== this.worldContainer
            };
            console.log(`[ENEMY-MANAGER] 🔧 Pre-fix validation:`, preFixValidation);
            
            // EXPLICIT VALUES for debugging
            console.log(`[ENEMY-MANAGER] 🔧 EXPLICIT Pre-fix values:`);
            console.log(`  hasWorldContainer: ${!!this.worldContainer}`);
            console.log(`  hasEnemyContainer: ${!!this.enemyContainer}`);
            console.log(`  worldContainer type: ${this.worldContainer?.constructor?.name}`);
            console.log(`  enemyContainer type: ${this.enemyContainer?.constructor?.name}`);
            console.log(`  worldContainer children count: ${this.worldContainer?.children?.length}`);
            console.log(`  enemyContainer parent: ${this.enemyContainer?.parent?.constructor?.name}`);
            console.log(`  addChild function exists: ${typeof this.worldContainer?.addChild === 'function'}`);
            console.log(`  enemyContainer already has worldContainer as parent: ${this.enemyContainer?.parent === this.worldContainer}`);
            console.log(`  worldContainer destroyed: ${this.worldContainer?.destroyed}`);
            console.log(`  enemyContainer destroyed: ${this.enemyContainer?.destroyed}`);
            
            // Only proceed if both containers are valid and not already connected
            if (this.worldContainer && this.enemyContainer && 
                typeof this.worldContainer.addChild === 'function' && 
                this.enemyContainer.parent !== this.worldContainer) {
              
              this.worldContainer.addChild(this.enemyContainer);
              this.addedToScene = true;
              console.log(`[ENEMY-MANAGER] ✅ FIX APPLIED: EnemyManager added to world container`);
              console.log(`[ENEMY-MANAGER] 🔧 Post-fix validation:`, {
                enemyManagerInWorld: this.worldContainer.children.includes(this.enemyContainer),
                enemyContainerParent: this.enemyContainer.parent?.constructor?.name
              });
            } else {
              console.warn(`[ENEMY-MANAGER] ⚠️ FIX SKIPPED: Containers not valid for addChild operation`);
            }
          } catch (fixError) {
            console.error(`[ENEMY-MANAGER] ❌ FIX FAILED: Could not add EnemyManager to world container:`, fixError);
            const errorDetails = {
              errorMessage: fixError.message,
              worldContainer: !!this.worldContainer,
              enemyContainer: !!this.enemyContainer,
              worldContainerType: this.worldContainer?.constructor?.name,
              enemyContainerType: this.enemyContainer?.constructor?.name
            };
            console.log(`[ENEMY-MANAGER] 🔧 Fix error details:`, errorDetails);
            
            // EXPLICIT ERROR VALUES
            console.log(`[ENEMY-MANAGER] 🔧 EXPLICIT Error details:`);
            console.log(`  Error message: ${fixError.message}`);
            console.log(`  Error stack: ${fixError.stack}`);
            console.log(`  worldContainer exists: ${!!this.worldContainer}`);
            console.log(`  enemyContainer exists: ${!!this.enemyContainer}`);
            console.log(`  worldContainer._parentID: ${this.worldContainer?._parentID}`);
            console.log(`  enemyContainer._parentID: ${this.enemyContainer?._parentID}`);
            console.log(`  worldContainer destroyed: ${this.worldContainer?.destroyed}`);
            console.log(`  enemyContainer destroyed: ${this.enemyContainer?.destroyed}`);
          }
        }
        
        // Check if the enemy sprite is properly positioned on screen
        if (enemy.sprite && enemy.sprite.toGlobal && typeof enemy.sprite.toGlobal === 'function') {
          try {
            const spriteGlobalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
            const globalPositionData = {
              local: { x: enemy.sprite.x, y: enemy.sprite.y },
              global: { x: spriteGlobalPos.x, y: spriteGlobalPos.y },
              screenBounds: { width: this.app.screen.width, height: this.app.screen.height },
              isOnScreen: spriteGlobalPos.x >= 0 && spriteGlobalPos.x <= this.app.screen.width && 
                         spriteGlobalPos.y >= 0 && spriteGlobalPos.y <= this.app.screen.height
            };
            console.log(`[ENEMY-MANAGER] 📍 Enemy sprite global position:`, globalPositionData);
            
            // EXPLICIT GLOBAL POSITION VALUES
            console.log(`[ENEMY-MANAGER] 📍 EXPLICIT Global position:`);
            console.log(`  Local sprite position: (${enemy.sprite.x}, ${enemy.sprite.y})`);
            console.log(`  Global sprite position: (${spriteGlobalPos.x.toFixed(1)}, ${spriteGlobalPos.y.toFixed(1)})`);
            console.log(`  Screen bounds: ${this.app.screen.width} x ${this.app.screen.height}`);
            console.log(`  Is on screen: ${globalPositionData.isOnScreen}`);
            console.log(`  Container position: (${enemy.container.x.toFixed(1)}, ${enemy.container.y.toFixed(1)})`);
            console.log(`  EnemyManager position: (${this.enemyContainer.x}, ${this.enemyContainer.y})`);
            console.log(`  World container position: (${this.worldContainer?.x}, ${this.worldContainer?.y})`);
            
            // DEBUG: Check transform chain for massive offsets
            console.log(`[ENEMY-MANAGER] 🔍 TRANSFORM CHAIN DEBUG:`);
            let currentContainer = enemy.sprite;
            let level = 0;
            while (currentContainer && level < 10) {
              const globalPos = currentContainer.toGlobal ? currentContainer.toGlobal({ x: 0, y: 0 }) : { x: 'N/A', y: 'N/A' };
              console.log(`  Level ${level}: ${currentContainer.constructor.name}`);
              console.log(`    Local: (${currentContainer.x}, ${currentContainer.y})`);
              console.log(`    Scale: (${currentContainer.scale?.x}, ${currentContainer.scale?.y})`);
              console.log(`    Global: (${typeof globalPos.x === 'number' ? globalPos.x.toFixed(1) : globalPos.x}, ${typeof globalPos.y === 'number' ? globalPos.y.toFixed(1) : globalPos.y})`);
              console.log(`    Parent: ${currentContainer.parent?.constructor?.name || 'none'}`);
              currentContainer = currentContainer.parent;
              level++;
            }
          } catch (globalPosError) {
            console.warn(`[ENEMY-MANAGER] ⚠️ Could not get sprite global position:`, globalPosError);
            console.log(`[ENEMY-MANAGER] 📍 Enemy sprite local position only:`, {
              local: { x: enemy.sprite?.x, y: enemy.sprite?.y },
              spriteExists: !!enemy.sprite,
              spriteParent: enemy.sprite?.parent?.constructor?.name
            });
            
            // EXPLICIT SPRITE VALUES
            console.log(`[ENEMY-MANAGER] 📍 KEY SPRITE INFO:`);
            console.log(`  Sprite exists: ${!!enemy.sprite}`);
            console.log(`  Sprite position: (${enemy.sprite?.x}, ${enemy.sprite?.y})`);
            console.log(`  Sprite visible: ${enemy.sprite?.visible}`);
            console.log(`  Sprite alpha: ${enemy.sprite?.alpha}`);
            console.log(`  Sprite scale: (${enemy.sprite?.scale?.x}, ${enemy.sprite?.scale?.y})`);
            console.log(`  Container position: (${enemy.container?.x}, ${enemy.container?.y})`);
            console.log(`  Container visible: ${enemy.container?.visible}`);
            console.log(`  Container alpha: ${enemy.container?.alpha}`);
          }
        } else {
          console.log(`[ENEMY-MANAGER] 📍 Enemy sprite position (basic):`, {
            hasSprite: !!enemy.sprite,
            spriteX: enemy.sprite?.x,
            spriteY: enemy.sprite?.y,
            hasToGlobal: enemy.sprite && typeof enemy.sprite.toGlobal === 'function'
          });
        }
      }
      
      // Verify enemy position and visibility after spawn
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 🔍 Post-spawn verification for ${type} slime:`);
        
        // Immediate analysis
        this.performPostSpawnAnalysis(enemy, x, y);
        
        // Delayed verification and fixes
        setTimeout(() => {
          console.log(`[ENEMY-MANAGER] 🔄 Running delayed position verification...`);
          this.verifyAndFixEnemyPositions();
          
          // Second analysis after any fixes
          console.log(`[ENEMY-MANAGER] 🔄 Post-fix analysis:`);
          this.performPostSpawnAnalysis(enemy, x, y);
        }, 100); // Small delay to ensure everything is initialized
      }
      
      return enemy;
    } else {
      console.error('[ENEMY-MANAGER] ❌ Failed to create enemy container');
      if (this.debugEnabled) {
        console.log(`[ENEMY-MANAGER] Enemy init failed:`, {
          enemyExists: !!enemy,
          enemyType: enemy?.type,
          enemyContainer: !!enemy?.container,
          enemySprite: !!enemy?.sprite,
          enemyAnimations: enemy?.animations ? Object.keys(enemy.animations) : null
        });
      }
      return null;
    }
  }
  
  async spawnRedSlime() {
    // Generate proper world coordinates near character/camera (like Map1 does)
    const coords = this.generateDebugSpawnCoordinates();
    const enemy = await this.spawnEnemy('red', coords.x, coords.y, 1);
    
    // Enhanced debug output for coordinate and rendering comparison
    if (enemy && this.spawnDebugEnabled) {
      this.logDebugSpawnComparison(enemy, coords, 'RED SLIME');
    }
    
    return enemy;
  }
  
  async spawnBlueSlime() {
    // Generate proper world coordinates near character/camera (like Map1 does)
    const coords = this.generateDebugSpawnCoordinates();
    const enemy = await this.spawnEnemy('blue', coords.x, coords.y, 1);
    
    // Enhanced debug output for coordinate and rendering comparison
    if (enemy && this.spawnDebugEnabled) {
      this.logDebugSpawnComparison(enemy, coords, 'BLUE SLIME');
    }
    
    return enemy;
  }
  
  // Spawn a 5HP slime (50% bigger than normal)
  async spawn5HPSlime() {
    if (this.debugEnabled || this.positionLoggingEnabled) {
      console.log(`[ENEMY-MANAGER] 🔧 DEBUG: Spawning 5HP slime. Camera state:`, {
        hasGlobalCamera: !!window.globalCamera,
        globalCameraType: typeof window.globalCamera,
        cameraPosition: window.globalCamera?.position,
        cameraX: window.globalCamera?.x,
        cameraY: window.globalCamera?.y,
        hasGameMapManager: !!window.gameMapManager,
        hasCharacter: !!window.gameMapManager?.character
      });
    }
    
    // Generate proper world coordinates near character/camera (like Map1 does)
    const coords = this.generateDebugSpawnCoordinates();
    
    // Randomly choose red or blue
    const type = Math.random() < 0.5 ? 'red' : 'blue';
    const enemy = await this.spawnEnemy(type, coords.x, coords.y, 5);
    
    // Enhanced debug output for coordinate and rendering comparison
    if (enemy && this.spawnDebugEnabled) {
      this.logDebugSpawnComparison(enemy, coords, '5HP SLIME');
    }
    
    return enemy;
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
        if (this.worldContainer && this.app?.screen) {
          const charScreenX = centerX + this.worldContainer.x;
          const charScreenY = centerY + this.worldContainer.y;
          console.log(`[ENEMY-MANAGER] 📍 Character screen position: (${charScreenX.toFixed(1)}, ${charScreenY.toFixed(1)})`);
          console.log(`[ENEMY-MANAGER] 📍 Screen bounds: ${this.app.screen.width}×${this.app.screen.height}`);
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
        if (this.worldContainer && this.app?.screen) {
          const predictedScreenX = x + this.worldContainer.x;
          const predictedScreenY = y + this.worldContainer.y;
          const isOnScreen = predictedScreenX >= 0 && predictedScreenX <= this.app.screen.width && 
                            predictedScreenY >= 0 && predictedScreenY <= this.app.screen.height;
          
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
    if (this.worldContainer && this.app?.screen) {
      const screenCenterX = this.app.screen.width / 2;
      const screenCenterY = this.app.screen.height / 2;
      
      // Convert screen center to world coordinates
      const worldCenterX = screenCenterX - this.worldContainer.x;
      const worldCenterY = screenCenterY - this.worldContainer.y;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-MANAGER] 📍 Using screen center as reference:`);
        console.log(`[ENEMY-MANAGER] 📍 Screen center: (${screenCenterX}, ${screenCenterY})`);
        console.log(`[ENEMY-MANAGER] 📍 World container offset: (${this.worldContainer.x}, ${this.worldContainer.y})`);
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
        const screenX = x + this.worldContainer.x;
        const screenY = y + this.worldContainer.y;
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
  
  removeEnemy(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
      
      if (this.playerControlledEnemy === enemy) {
        this.playerControlledEnemy = null;
      }
      
      enemy.destroy();
      
      if (this.debugEnabled) {
        console.log(`Removed enemy. Total enemies: ${this.enemies.length}`);
      }
    }
  }
  
  cleanupDeadEnemies() {
    const deadEnemies = this.enemies.filter(enemy => !enemy.isAlive);
    deadEnemies.forEach(enemy => {
      // The enemy will destroy itself after fade animation
      // Just remove from our tracking
      const index = this.enemies.indexOf(enemy);
      if (index !== -1) {
        this.enemies.splice(index, 1);
        
        if (this.playerControlledEnemy === enemy) {
          this.playerControlledEnemy = null;
        }
      }
    });
  }
  
  clearAllEnemies() {
    this.enemies.forEach(enemy => {
      enemy.destroy();
    });
    this.enemies = [];
    this.playerControlledEnemy = null;
    
    if (this.debugEnabled) {
      console.log('All enemies cleared');
    }
  }
  
  setPlayerControl(enemy) {
    // Remove control from previous enemy
    if (this.playerControlledEnemy) {
      this.playerControlledEnemy.setPlayerControlled(false);
    }
    
    // Set new controlled enemy
    this.playerControlledEnemy = enemy;
    if (enemy) {
      enemy.setPlayerControlled(true);
      
      if (this.debugEnabled) {
        console.log(`Player now controls ${enemy.type} slime`);
      }
    } else {
      if (this.debugEnabled) {
        console.log('Player control disabled');
      }
    }
  }
  
  getRandomEnemy() {
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    if (aliveEnemies.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * aliveEnemies.length);
    return aliveEnemies[randomIndex];
  }
  
  getEnemyCount() {
    return this.enemies.filter(enemy => enemy.isAlive).length;
  }
  
  getEnemies() {
    return this.enemies.filter(enemy => enemy.isAlive);
  }
  
  setDebugEnabled(enabled) {
    if (this.debug) {
      this.debug.setDebugEnabled(enabled);
    }
  }
  
  setAttackDebugEnabled(enabled) {
    if (this.debug) {
      this.debug.setAttackDebugEnabled(enabled);
    }
  }
  
  setHitRegDebugEnabled(enabled) {
    if (this.debug) {
      this.debug.setHitRegDebugEnabled(enabled);
    }
  }
  
  setCoordinateDebugEnabled(enabled) {
    if (this.debug) {
      this.debug.setCoordinateDebugEnabled(enabled);
    }
  }
  
  setPositionLoggingEnabled(enabled) {
    if (this.debug) {
      this.debug.setPositionLoggingEnabled(enabled);
    }
  }
  
  setMapEnemyDebugEnabled(enabled) {
    if (this.debug) {
      this.debug.setMapEnemyDebugEnabled(enabled);
    }
  }
  
  setSpawnDebugEnabled(enabled) {
    if (this.debug) {
      this.debug.setSpawnDebugEnabled(enabled);
    }
  }

  // Force enemy spawning with coordinates verification
  forceSpawnEnemyWithVerification(type = 'red', x = null, y = null, hp = 1) {
    console.log(`[ENEMY-MANAGER] 🎯 === FORCE SPAWN WITH VERIFICATION ===`);
    console.log(`[ENEMY-MANAGER] 🎯 Attempting to spawn ${type} slime (${hp}HP) at (${x?.toFixed(1) || 'auto'}, ${y?.toFixed(1) || 'auto'})`);
    
    // Enable debug logging for this spawn
    const originalSpawnDebug = this.spawnDebugEnabled;
    this.spawnDebugEnabled = true;
    
    // Attempt spawn
    return this.spawnEnemy(type, x, y, hp).then(enemy => {
      // Restore original debug state
      this.spawnDebugEnabled = originalSpawnDebug;
      
      if (enemy) {
        console.log(`[ENEMY-MANAGER] ✅ Force spawn successful: ${type} slime (${hp}HP) created`);
        
        // Additional verification
        setTimeout(() => {
          console.log(`[ENEMY-MANAGER] 🔍 Post-spawn position check:`);
          if (enemy.position) {
            console.log(`  World Position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
          }
          if (enemy.sprite && enemy.sprite.toGlobal) {
            try {
              const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
              console.log(`  Screen Position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
            } catch (e) {
              console.log(`  Screen Position: Error - ${e.message}`);
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
    
    if (this.enemies.length === 0) {
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
    this.enemies.forEach((enemy, index) => {
      if (!enemy || !enemy.isAlive) return;
      
      // Calculate position in circle
      const angleStep = (2 * Math.PI) / this.enemies.length;
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
    
    console.log(`[ENEMY-MANAGER] 🏠 Repositioned ${this.enemies.length} enemies in starting formation`);
    
    // Verify positions after repositioning
    setTimeout(() => {
      this.verifyAndFixEnemyPositions();
    }, 100);
  }

  // Force all enemies to be visible and properly positioned
  forceEnemyVisibility() {
    console.log(`[ENEMY-MANAGER] 👁️ === FORCING ENEMY VISIBILITY ===`);
    
    if (this.enemies.length === 0) {
      console.log(`[ENEMY-MANAGER] 👁️ No enemies to make visible`);
      return 0;
    }
    
    let fixedCount = 0;
    
    this.enemies.forEach((enemy, index) => {
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
          console.log(`  ✅ Fixed container visibility`);
        }
        
        if (enemy.container.alpha < 1) {
          enemy.container.alpha = 1.0;
          enemyFixed = true;
          console.log(`  ✅ Fixed container alpha`);
        }
      }
      
      // Fix sprite visibility
      if (enemy.sprite) {
        if (!enemy.sprite.visible) {
          enemy.sprite.visible = true;
          enemyFixed = true;
          console.log(`  ✅ Fixed sprite visibility`);
        }
        
        if (enemy.sprite.alpha < 1) {
          enemy.sprite.alpha = 1.0;
          enemyFixed = true;
          console.log(`  ✅ Fixed sprite alpha`);
        }
        
        // Ensure sprite has proper size
        if (enemy.sprite.width <= 0 || enemy.sprite.height <= 0) {
          this.applyPixelPerfectSize(enemy, enemy.currentHP);
          enemyFixed = true;
          console.log(`  ✅ Fixed sprite size`);
        }
      }
      
      // Ensure enemy is in proper container hierarchy
      if (enemy.container && enemy.container.parent !== this.enemyContainer) {
        try {
          if (enemy.container.parent) {
            enemy.container.parent.removeChild(enemy.container);
          }
          this.enemyContainer.addChild(enemy.container);
          enemyFixed = true;
          console.log(`  ✅ Fixed container hierarchy`);
        } catch (hierarchyError) {
          console.log(`  ❌ Failed to fix hierarchy: ${hierarchyError.message}`);
        }
      }
      
      // Force z-index
      if (enemy.container) {
        enemy.container.zIndex = 1000 + index; // Ensure it's above background
        enemyFixed = true;
        console.log(`  ✅ Set z-index to ${1000 + index}`);
      }
      
      if (enemyFixed) {
        fixedCount++;
        console.log(`  ✅ Enemy ${index + 1} visibility fixed`);
      } else {
        console.log(`  ✅ Enemy ${index + 1} was already visible`);
      }
    });
    
    // Ensure EnemyManager container hierarchy
    this.ensureContainerHierarchy();
    
    // Force a render refresh
    if (this.app && this.app.renderer) {
      this.app.renderer.render(this.app.stage);
    }
    
    console.log(`[ENEMY-MANAGER] 👁️ Visibility forcing complete: ${fixedCount} enemies fixed`);
    console.log(`[ENEMY-MANAGER] 👁️ === END VISIBILITY FORCING ===`);
    
    return fixedCount;
  }
  
  setRenderAnalysisEnabled(enabled) {
    if (this.debug) {
      this.debug.setRenderAnalysisEnabled(enabled);
    }
  }

  // Debug method to add visual indicators to all enemies
  addDebugVisualIndicators() {
    this.enemies.forEach(enemy => {
      if (enemy.isAlive) {
        enemy.addDebugVisualIndicator();
      }
    });
    console.log(`[ENEMY-MANAGER] Added debug visual indicators to ${this.enemies.length} enemies`);
  }
  
  // Debug method to remove visual indicators from all enemies
  removeDebugVisualIndicators() {
    this.enemies.forEach(enemy => {
      enemy.removeDebugVisualIndicator();
    });
    console.log(`[ENEMY-MANAGER] Removed debug visual indicators from all enemies`);
  }
  
  // Debug method to force render refresh
  forceRenderRefresh() {
    if (this.app && this.app.renderer) {
      this.app.renderer.render(this.app.stage);
      console.log(`[ENEMY-MANAGER] Forced render refresh`);
    }
  }
  
  // Damage all enemies in a specific area (for boss attacks, etc.)
  damageEnemiesInArea(x, y, radius, damage) {
    let hitCount = 0;
    
    this.enemies.forEach(enemy => {
      if (!enemy.isAlive) return;
      
      const dx = enemy.position.x - x;
      const dy = enemy.position.y - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= radius) {
        enemy.takeDamage(damage);
        hitCount++;
      }
    });
    
    if (this.debugEnabled && hitCount > 0) {
      console.log(`Damaged ${hitCount} enemies in area (${x.toFixed(1)}, ${y.toFixed(1)}) radius ${radius}`);
    }
    
    return hitCount;
  }
  
  // Get enemy stats for debugging
  getStats() {
    const alive = this.enemies.filter(enemy => enemy.isAlive);
    const red = alive.filter(enemy => enemy.type === 'red').length;
    const blue = alive.filter(enemy => enemy.type === 'blue').length;
    const controlled = this.playerControlledEnemy ? this.playerControlledEnemy.type : 'none';
    
    return {
      total: alive.length,
      red,
      blue,
      controlled
    };
  }

  // Calculate pixel-perfect sizes for HP-based scaling
  calculatePixelSizesForHP() {
    // Based on render analysis: 1HP slime is ~73×41px, which is good
    const baseWidth = 73;   // 1HP slime width in pixels
    const baseHeight = 41;  // 1HP slime height in pixels
    const sizeIncreasePerHP = 0.15; // 15% size increase per HP
    
    const pixelSizes = {};
    
    for (let hp = 1; hp <= 5; hp++) {
      const sizeMultiplier = 1 + (hp - 1) * sizeIncreasePerHP;
      const width = Math.round(baseWidth * sizeMultiplier);
      const height = Math.round(baseHeight * sizeMultiplier);
      
      pixelSizes[hp] = { width, height };
    }
    
    console.log(`[ENEMY-MANAGER] 📐 Calculated pixel sizes for HP levels:`, pixelSizes);
    return pixelSizes;
  }

  // Apply pixel-perfect size to enemy based on HP
  applyPixelPerfectSize(enemy, targetHP) {
    if (!enemy || !enemy.sprite) {
      console.warn(`[ENEMY-MANAGER] ⚠️ Cannot apply pixel size: enemy or sprite missing`);
      return;
    }

    const pixelSizes = this.calculatePixelSizesForHP();
    const targetSize = pixelSizes[targetHP] || pixelSizes[1]; // Fallback to 1HP size
    
    // Set exact pixel dimensions
    enemy.sprite.width = targetSize.width;
    enemy.sprite.height = targetSize.height;
    
    // Update enemy's internal scale tracking to match the new size
    const textureWidth = enemy.sprite.texture?.width || 1440;
    const textureHeight = enemy.sprite.texture?.height || 800;
    const newScaleX = targetSize.width / textureWidth;
    const newScaleY = targetSize.height / textureHeight;
    
    // Update enemy's scale properties to reflect the change
    enemy.currentScale = newScaleX; // Use X scale as the reference
    
    if (this.hitRegDebugEnabled) {
      console.log(`[ENEMY-MANAGER] 📐 Applied pixel-perfect size to ${enemy.type} slime:`);
      console.log(`  Target HP: ${targetHP}`);
      console.log(`  New Size: ${targetSize.width}×${targetSize.height}px`);
      console.log(`  Scale Applied: (${newScaleX.toFixed(4)}, ${newScaleY.toFixed(4)})`);
      console.log(`  From Texture: ${textureWidth}×${textureHeight}px`);
    }
  }

  // Enhanced enemy positioning verification and fixing
  verifyAndFixEnemyPositions() {
    console.log(`[ENEMY-MANAGER] 🔍 === ENEMY POSITION VERIFICATION (${this.enemies.length} enemies) ===`);
    
    let fixedCount = 0;
    
    this.enemies.forEach((enemy, index) => {
      if (!enemy || !enemy.isAlive) {
        console.log(`[ENEMY-MANAGER] Enemy ${index + 1}: SKIPPED - Not alive or null`);
        return;
      }
      
      console.log(`[ENEMY-MANAGER] 🔍 Verifying Enemy ${index + 1} (${enemy.type}, ${enemy.currentHP}HP):`);
      
      // 1. Check container hierarchy
      let hierarchyOK = true;
      if (!enemy.container) {
        console.log(`  ❌ No container found`);
        hierarchyOK = false;
      } else if (!enemy.container.parent) {
        console.log(`  ❌ Container has no parent - not in scene tree`);
        hierarchyOK = false;
      } else if (enemy.container.parent !== this.enemyContainer) {
        console.log(`  ❌ Container parent is not EnemyManager container`);
        hierarchyOK = false;
      } else {
        console.log(`  ✅ Container hierarchy OK`);
      }
      
      // 2. Check world coordinates and screen visibility
      let positionOK = true;
      if (enemy.position) {
        const worldX = enemy.position.x;
        const worldY = enemy.position.y;
        
        console.log(`  📍 World Position: (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`);
        
        // Check if coordinates are reasonable (not NaN, not extremely large/small)
        if (isNaN(worldX) || isNaN(worldY)) {
          console.log(`  ❌ Invalid coordinates - contains NaN`);
          positionOK = false;
        } else if (Math.abs(worldX) > 50000 || Math.abs(worldY) > 50000) {
          console.log(`  ❌ Coordinates too extreme - might be outside map bounds`);
          positionOK = false;
        } else {
          console.log(`  ✅ World coordinates are reasonable`);
        }
        
        // Check screen position if possible
        if (enemy.sprite && enemy.sprite.toGlobal && typeof enemy.sprite.toGlobal === 'function') {
          try {
            const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
            const screenWidth = this.app?.screen?.width || 1920;
            const screenHeight = this.app?.screen?.height || 1080;
            
            console.log(`  📺 Screen Position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
            
            // Check if visible on screen (with margin)
            const margin = 200;
            const isOnScreen = globalPos.x >= -margin && globalPos.x <= screenWidth + margin &&
                              globalPos.y >= -margin && globalPos.y <= screenHeight + margin;
            
            console.log(`  👁️ On Screen: ${isOnScreen ? 'YES' : 'NO'} (${screenWidth}×${screenHeight} screen)`);
          } catch (globalError) {
            console.log(`  ⚠️ Cannot calculate screen position: ${globalError.message}`);
          }
        }
      } else {
        console.log(`  ❌ No position property found`);
        positionOK = false;
      }
      
      // 3. Check sprite properties
      let spriteOK = true;
      if (!enemy.sprite) {
        console.log(`  ❌ No sprite found`);
        spriteOK = false;
      } else {
        console.log(`  📏 Sprite Size: ${enemy.sprite.width.toFixed(1)}×${enemy.sprite.height.toFixed(1)}px`);
        console.log(`  👁️ Sprite Visible: ${enemy.sprite.visible}`);
        console.log(`  🎨 Sprite Alpha: ${enemy.sprite.alpha.toFixed(2)}`);
        
        if (!enemy.sprite.visible || enemy.sprite.alpha <= 0) {
          console.log(`  ❌ Sprite not visible (visible=${enemy.sprite.visible}, alpha=${enemy.sprite.alpha})`);
          spriteOK = false;
        } else {
          console.log(`  ✅ Sprite visibility OK`);
        }
      }
      
      // 4. Apply fixes if needed
      if (!hierarchyOK || !positionOK || !spriteOK) {
        console.log(`  🔧 APPLYING FIXES for Enemy ${index + 1}:`);
        
        // Fix hierarchy
        if (!hierarchyOK && enemy.container) {
          try {
            if (this.enemyContainer && enemy.container.parent !== this.enemyContainer) {
              this.enemyContainer.addChild(enemy.container);
              console.log(`    ✅ Fixed container hierarchy`);
            }
          } catch (hierarchyError) {
            console.log(`    ❌ Failed to fix hierarchy: ${hierarchyError.message}`);
          }
        }
        
        // Fix position if coordinates are invalid
        if (!positionOK && enemy.position) {
          // Generate new valid position near character or screen center
          let validX = 960; // Default screen center
          let validY = 540;
          
          if (window.gameMapManager && window.gameMapManager.character && window.gameMapManager.character.position) {
            const char = window.gameMapManager.character;
            validX = char.position.x + (Math.random() - 0.5) * 600; // Within 300px of character
            validY = char.position.y + (Math.random() - 0.5) * 600;
          }
          
          enemy.position.x = validX;
          enemy.position.y = validY;
          if (enemy.container) {
            enemy.container.x = validX;
            enemy.container.y = validY;
          }
          
          console.log(`    ✅ Fixed position to (${validX.toFixed(1)}, ${validY.toFixed(1)})`);
        }
        
        // Fix sprite visibility
        if (!spriteOK && enemy.sprite) {
          if (!enemy.sprite.visible) {
            enemy.sprite.visible = true;
            console.log(`    ✅ Fixed sprite visibility`);
          }
          if (enemy.sprite.alpha <= 0) {
            enemy.sprite.alpha = 1.0;
            console.log(`    ✅ Fixed sprite alpha`);
          }
        }
        
        fixedCount++;
      } else {
        console.log(`  ✅ Enemy ${index + 1} is properly positioned and visible`);
      }
      
      console.log(`  ---`);
    });
    
    console.log(`[ENEMY-MANAGER] 🔍 Verification complete: ${fixedCount} enemies fixed out of ${this.enemies.length}`);
    console.log(`[ENEMY-MANAGER] 🔍 === END POSITION VERIFICATION ===`);
    
    return fixedCount;
  }

  // Enhanced post-spawn analysis for deep visibility debugging
  performPostSpawnAnalysis(enemy, expectedWorldX, expectedWorldY) {
    console.log(`[ENEMY-MANAGER] 🔬 === POST-SPAWN DEEP ANALYSIS ===`);
    console.log(`[ENEMY-MANAGER] 🔬 Enemy Type: ${enemy.type} (${enemy.currentHP}HP)`);
    console.log(`[ENEMY-MANAGER] 🔬 Expected Position: (${expectedWorldX.toFixed(1)}, ${expectedWorldY.toFixed(1)})`);
    
    // 1. Container Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === CONTAINER ANALYSIS ===`);
    if (enemy.container) {
      console.log(`  📦 Container Position: (${enemy.container.x.toFixed(1)}, ${enemy.container.y.toFixed(1)})`);
      console.log(`  📦 Container Visible: ${enemy.container.visible}`);
      console.log(`  📦 Container Alpha: ${enemy.container.alpha}`);
      console.log(`  📦 Container Scale: (${enemy.container.scale.x.toFixed(3)}, ${enemy.container.scale.y.toFixed(3)})`);
      console.log(`  📦 Container ZIndex: ${enemy.container.zIndex}`);
      console.log(`  📦 Container Children: ${enemy.container.children.length}`);
      
      // Position accuracy check
      const positionMatch = Math.abs(enemy.container.x - expectedWorldX) < 1 && 
                           Math.abs(enemy.container.y - expectedWorldY) < 1;
      console.log(`  📍 Position Match: ${positionMatch ? '✅ ACCURATE' : '❌ MISMATCH'}`);
      if (!positionMatch) {
        const deltaX = enemy.container.x - expectedWorldX;
        const deltaY = enemy.container.y - expectedWorldY;
        console.log(`    Expected: (${expectedWorldX.toFixed(1)}, ${expectedWorldY.toFixed(1)})`);
        console.log(`    Actual: (${enemy.container.x.toFixed(1)}, ${enemy.container.y.toFixed(1)})`);
        console.log(`    Difference: (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
      }
    } else {
      console.log(`  ❌ NO CONTAINER FOUND`);
    }
    
    // 2. Sprite Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === SPRITE ANALYSIS ===`);
    if (enemy.sprite) {
      console.log(`  🖼️ Sprite Position: (${enemy.sprite.x.toFixed(1)}, ${enemy.sprite.y.toFixed(1)})`);
      console.log(`  🖼️ Sprite Size: ${enemy.sprite.width.toFixed(1)}×${enemy.sprite.height.toFixed(1)}px`);
      console.log(`  🖼️ Sprite Scale: (${enemy.sprite.scale.x.toFixed(3)}, ${enemy.sprite.scale.y.toFixed(3)})`);
      console.log(`  🖼️ Sprite Visible: ${enemy.sprite.visible}`);
      console.log(`  🖼️ Sprite Alpha: ${enemy.sprite.alpha.toFixed(2)}`);
      console.log(`  🖼️ Sprite Anchor: (${enemy.sprite.anchor?.x || 0}, ${enemy.sprite.anchor?.y || 0})`);
      
      // Texture info
      if (enemy.sprite.texture) {
        console.log(`  🖼️ Texture Size: ${enemy.sprite.texture.width}×${enemy.sprite.texture.height}px`);
        console.log(`  🖼️ Texture Valid: ${enemy.sprite.texture.valid}`);
      }
    } else {
      console.log(`  ❌ NO SPRITE FOUND`);
    }
    
    // 3. Screen Position Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === SCREEN POSITION ANALYSIS ===`);
    if (enemy.sprite && enemy.sprite.toGlobal) {
      try {
        const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
        const screenWidth = this.app?.screen?.width || 1920;
        const screenHeight = this.app?.screen?.height || 1080;
        
        console.log(`  📺 Global Position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
        console.log(`  📺 Screen Bounds: ${screenWidth}×${screenHeight}`);
        
        // Detailed visibility analysis
        const isVisibleX = globalPos.x >= 0 && globalPos.x <= screenWidth;
        const isVisibleY = globalPos.y >= 0 && globalPos.y <= screenHeight;
        const isFullyVisible = isVisibleX && isVisibleY;
        
        console.log(`  👁️ X-axis Visible: ${isVisibleX ? '✅' : '❌'} (${globalPos.x.toFixed(1)} in 0-${screenWidth})`);
        console.log(`  👁️ Y-axis Visible: ${isVisibleY ? '✅' : '❌'} (${globalPos.y.toFixed(1)} in 0-${screenHeight})`);
        console.log(`  👁️ Fully On Screen: ${isFullyVisible ? '✅ YES' : '❌ NO'}`);
        
        if (!isFullyVisible) {
          // Calculate how to fix position
          const centerX = screenWidth / 2;
          const centerY = screenHeight / 2;
          const targetWorldX = centerX - (this.worldContainer?.x || 0);
          const targetWorldY = centerY - (this.worldContainer?.y || 0);
          
          console.log(`  💡 SOLUTION: Move to world position (${targetWorldX.toFixed(1)}, ${targetWorldY.toFixed(1)}) to center on screen`);
          console.log(`  💡 Current world container offset: (${this.worldContainer?.x || 0}, ${this.worldContainer?.y || 0})`);
        }
      } catch (globalError) {
        console.log(`  ❌ Cannot calculate global position: ${globalError.message}`);
      }
    }
    
    // 4. Transform Chain Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === TRANSFORM CHAIN ANALYSIS ===`);
    let currentContainer = enemy.sprite;
    let level = 0;
    const maxLevels = 8;
    
    while (currentContainer && level < maxLevels) {
      const containerName = currentContainer.constructor.name;
      const localPos = { x: currentContainer.x || 0, y: currentContainer.y || 0 };
      const scale = { x: currentContainer.scale?.x || 1, y: currentContainer.scale?.y || 1 };
      
      console.log(`  🔗 Level ${level}: ${containerName}`);
      console.log(`    Position: (${localPos.x.toFixed(1)}, ${localPos.y.toFixed(1)})`);
      console.log(`    Scale: (${scale.x.toFixed(3)}, ${scale.y.toFixed(3)})`);
      console.log(`    Visible: ${currentContainer.visible !== false}`);
      console.log(`    Alpha: ${currentContainer.alpha || 1}`);
      
      // Try to get global position at each level
      if (currentContainer.toGlobal) {
        try {
          const globalAtLevel = currentContainer.toGlobal({ x: 0, y: 0 });
          console.log(`    Global: (${globalAtLevel.x.toFixed(1)}, ${globalAtLevel.y.toFixed(1)})`);
        } catch (e) {
          console.log(`    Global: Error - ${e.message}`);
        }
      }
      
      currentContainer = currentContainer.parent;
      level++;
    }
    
    // 5. Final Recommendations
    console.log(`[ENEMY-MANAGER] 🔬 === RECOMMENDATIONS ===`);
    
    if (enemy.sprite && enemy.sprite.toGlobal) {
      try {
        const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
        const screenWidth = this.app?.screen?.width || 1920;
        const screenHeight = this.app?.screen?.height || 1080;
        
        const isOnScreen = globalPos.x >= 0 && globalPos.x <= screenWidth && 
                          globalPos.y >= 0 && globalPos.y <= screenHeight;
        
        if (!isOnScreen) {
          console.log(`  ❌ ENEMY IS NOT VISIBLE ON SCREEN`);
          console.log(`  💡 Current screen position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
          console.log(`  💡 Screen bounds: 0-${screenWidth} × 0-${screenHeight}`);
          
          // Calculate corrected world position
          const correctedWorldX = (screenWidth / 2) - (this.worldContainer?.x || 0);
          const correctedWorldY = (screenHeight / 2) - (this.worldContainer?.y || 0);
          
          console.log(`  💡 TO FIX: Set world position to (${correctedWorldX.toFixed(1)}, ${correctedWorldY.toFixed(1)})`);
          console.log(`  💡 This would place enemy at screen center (${(screenWidth/2).toFixed(1)}, ${(screenHeight/2).toFixed(1)})`);
        } else {
          console.log(`  ✅ ENEMY IS VISIBLE ON SCREEN`);
        }
      } catch (e) {
        console.log(`  ⚠️ Cannot determine visibility: ${e.message}`);
      }
    }
    
    console.log(`[ENEMY-MANAGER] 🔬 === END POST-SPAWN ANALYSIS ===`);
  }

  // Enhanced detailed spawn attempt logging with deep coordinate and visibility analysis
  logDetailedSpawnAttempt(type, x, y, hp) {
    console.log(`[ENEMY-MANAGER] 📋 === DETAILED SPAWN ATTEMPT LOG ===`);
    console.log(`[ENEMY-MANAGER] 📋 Parameters:`);
    console.log(`  Type: ${type}`);
    console.log(`  Coordinates: (${x?.toFixed(1) || 'null'}, ${y?.toFixed(1) || 'null'})`);
    console.log(`  HP: ${hp}`);
    
    console.log(`[ENEMY-MANAGER] 📋 System State:`);
    console.log(`  World Container: ${!!this.worldContainer} (${this.worldContainer?.constructor?.name || 'N/A'})`);
    console.log(`  Added to Scene: ${this.addedToScene}`);
    console.log(`  Enemy Container: ${!!this.enemyContainer} (${this.enemyContainer?.children?.length || 0} children)`);
    console.log(`  Total Enemies Tracked: ${this.enemies.length}`);
    
    // Enhanced character and camera analysis
    console.log(`[ENEMY-MANAGER] 📋 === COORDINATE SYSTEM ANALYSIS ===`);
    
    // Character position analysis
    if (window.gameMapManager?.character?.position) {
      const char = window.gameMapManager.character;
      console.log(`  📍 Character World Position: (${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)})`);
      
      // Check if character has container for screen position
      if (char.container && char.container.toGlobal) {
        try {
          const charScreenPos = char.container.toGlobal({ x: 0, y: 0 });
          console.log(`  📍 Character Screen Position: (${charScreenPos.x.toFixed(1)}, ${charScreenPos.y.toFixed(1)})`);
        } catch (e) {
          console.log(`  📍 Character Screen Position: Error - ${e.message}`);
        }
      }
    } else {
      console.log(`  📍 Character: NOT FOUND`);
    }
    
    // Camera analysis
    if (window.gameMapManager?.camera) {
      const camera = window.gameMapManager.camera;
      console.log(`  📹 Camera Position: (${camera.x?.toFixed(1) || 'N/A'}, ${camera.y?.toFixed(1) || 'N/A'})`);
      console.log(`  📹 Camera Zoom: ${camera.zoom || 'N/A'}`);
      
      // Map container analysis (world container)
      if (camera.mapContainer) {
        console.log(`  📹 Map Container Position: (${camera.mapContainer.x?.toFixed(1)}, ${camera.mapContainer.y?.toFixed(1)})`);
        console.log(`  📹 Map Container Scale: (${camera.mapContainer.scale?.x || 1}, ${camera.mapContainer.scale?.y || 1})`);
      }
    } else {
      console.log(`  📹 Camera: NOT FOUND`);
    }
    
    // World container analysis
    if (this.worldContainer) {
      console.log(`  🌍 World Container Position: (${this.worldContainer.x?.toFixed(1)}, ${this.worldContainer.y?.toFixed(1)})`);
      console.log(`  🌍 World Container Scale: (${this.worldContainer.scale?.x || 1}, ${this.worldContainer.scale?.y || 1})`);
      console.log(`  🌍 World Container Visible: ${this.worldContainer.visible}`);
      console.log(`  🌍 World Container Alpha: ${this.worldContainer.alpha}`);
    }
    
    // Screen bounds analysis
    if (this.app?.screen) {
      console.log(`  📺 Screen Bounds: ${this.app.screen.width}×${this.app.screen.height}`);
      console.log(`  📺 Screen Center: (${(this.app.screen.width / 2).toFixed(1)}, ${(this.app.screen.height / 2).toFixed(1)})`);
    }
    
    // Map1 tile analysis for world coordinates
    console.log(`[ENEMY-MANAGER] 📋 === MAP1 TILE ANALYSIS ===`);
    if (x !== null && y !== null) {
      // Calculate which Map1 tile this position belongs to
      const tileWidth = 2100; // From Map1: mapWidth/gridSize = 33600/16
      const tileHeight = 1485; // From Map1: mapHeight/gridSize = 23760/16
      
      const tileX = Math.floor(x / tileWidth);
      const tileY = Math.floor(y / tileHeight);
      
      console.log(`  🗺️ Map1 Tile Coordinates: (${tileX}, ${tileY})`);
      console.log(`  🗺️ Map1 Tile Size: ${tileWidth}×${tileHeight}px`);
      console.log(`  🗺️ Map1 Tile World Bounds: (${tileX * tileWidth}, ${tileY * tileHeight}) to (${(tileX + 1) * tileWidth}, ${(tileY + 1) * tileHeight})`);
      
      // Check if this is in Map1's predefined spawn areas
      const isCenterTile = tileX >= 6 && tileX <= 9 && tileY >= 6 && tileY <= 9;
      console.log(`  🎯 Is Center Tile (6,6 to 9,9): ${isCenterTile ? '✅ YES' : '❌ NO'}`);
      
      if (isCenterTile) {
        console.log(`  ✅ This position SHOULD be compatible with Map1 center spawning!`);
      } else {
        console.log(`  ⚠️ This position is OUTSIDE Map1's center spawn area`);
        console.log(`  💡 Map1 center tiles span: (12600, 8910) to (18900, 13365)`);
        console.log(`  💡 Current position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
      }
    }
    
    // Predicted spawn position analysis (if coordinates provided)
    if (x !== null && y !== null) {
      console.log(`[ENEMY-MANAGER] 📋 === SPAWN POSITION PREDICTION ===`);
      console.log(`  🎯 Requested World Position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
      
      // Calculate predicted screen position based on world container transform
      if (this.worldContainer && this.app?.screen) {
        const predictedScreenX = x + this.worldContainer.x;
        const predictedScreenY = y + this.worldContainer.y;
        console.log(`  🎯 Predicted Screen Position: (${predictedScreenX.toFixed(1)}, ${predictedScreenY.toFixed(1)})`);
        
        const isOnScreen = predictedScreenX >= 0 && predictedScreenX <= this.app.screen.width && 
                          predictedScreenY >= 0 && predictedScreenY <= this.app.screen.height;
        console.log(`  🎯 Will Be On Screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
        
        if (!isOnScreen) {
          console.log(`  ⚠️ ISSUE: Spawn position will be OFF-SCREEN!`);
          console.log(`  💡 Screen bounds: 0-${this.app.screen.width} × 0-${this.app.screen.height}`);
          console.log(`  💡 Predicted position: ${predictedScreenX.toFixed(1)}, ${predictedScreenY.toFixed(1)}`);
          
          // Calculate how far off-screen
          const offScreenX = predictedScreenX < 0 ? Math.abs(predictedScreenX) : 
                           predictedScreenX > this.app.screen.width ? predictedScreenX - this.app.screen.width : 0;
          const offScreenY = predictedScreenY < 0 ? Math.abs(predictedScreenY) : 
                           predictedScreenY > this.app.screen.height ? predictedScreenY - this.app.screen.height : 0;
          
          if (offScreenX > 0 || offScreenY > 0) {
            console.log(`  💡 Distance off-screen: X=${offScreenX.toFixed(1)}px, Y=${offScreenY.toFixed(1)}px`);
          }
          
          // Provide Camera Fix Recommendation
          console.log(`[ENEMY-MANAGER] 💡 === CAMERA FIX RECOMMENDATION ===`);
          const correctCameraX = -x + (this.app.screen.width / 2);
          const correctCameraY = -y + (this.app.screen.height / 2);
          console.log(`  💡 To center this spawn on screen, set world container to:`);
          console.log(`  💡 worldContainer.x = ${correctCameraX.toFixed(1)}`);
          console.log(`  💡 worldContainer.y = ${correctCameraY.toFixed(1)}`);
          console.log(`  💡 Current world container: (${this.worldContainer.x}, ${this.worldContainer.y})`);
          console.log(`  💡 Difference: (${(correctCameraX - this.worldContainer.x).toFixed(1)}, ${(correctCameraY - this.worldContainer.y).toFixed(1)})`);
        }
      }
      
      // Distance from character analysis
      if (window.gameMapManager?.character?.position) {
        const char = window.gameMapManager.character;
        const distanceFromChar = Math.sqrt(
          Math.pow(x - char.position.x, 2) + Math.pow(y - char.position.y, 2)
        );
        console.log(`  📏 Distance from Character: ${distanceFromChar.toFixed(1)} pixels`);
        
        if (distanceFromChar > 1000) {
          console.log(`  ⚠️ WARNING: Spawn is FAR from character (${distanceFromChar.toFixed(0)}px away)`);
        }
      }
    }
    
    console.log(`[ENEMY-MANAGER] 📋 === END SPAWN ATTEMPT LOG ===`);
  }
  
  // Test method to manually trigger render analysis (for debugging)
  testRenderAnalysis() {
    console.log(`🔍 [TEST] Manual render analysis test triggered`);
    console.log(`🔍 [TEST] renderAnalysisEnabled: ${this.renderAnalysisEnabled}`);
    console.log(`🔍 [TEST] enemies.length: ${this.enemies.length}`);
    this.performRenderAnalysis();
  }

  // Comprehensive Map1 enemy system analysis vs actual spawned enemies
  performMapEnemyDebugAnalysis() {
    console.log(`🗺️ === MAP ENEMY DEBUG ANALYSIS ===`);
    console.log(`🗺️ Timestamp: ${new Date().toLocaleTimeString()}`);
    
    // 1. Check if we're in Map1
    const currentMapId = window.gameMapManager?.currentMap;
    const map1Instance = window.gameMapManager?.map1Instance;
    
    if (!currentMapId || currentMapId !== 'maparea1') {
      console.log(`🗺️ ❌ Not in Map1 (current: ${currentMapId || 'none'}), skipping analysis`);
      return;
    }
    
    console.log(`🗺️ ✅ Current map is Map1 (${currentMapId})`);
    console.log(`🗺️ ✅ Map1 instance found: ${!!map1Instance}`);
    
    // 2. Analyze Map1 enemy spawn data
    console.log(`🗺️ === MAP1 SPAWN DATA ANALYSIS ===`);
    console.log(`🗺️ Enemy data calculated: ${map1Instance?.isEnemyDataCalculated || 'N/A'}`);
    
    if (!map1Instance || !map1Instance.enemySpawnData) {
      console.log(`🗺️ ❌ No Map1 instance or enemy spawn data found - Map1 enemies not calculated yet`);
      console.log(`🗺️ 💡 Try triggering Map1 enemy spawn first`);
      return;
    }
    
    const centerEnemies = map1Instance.enemySpawnData.centerTiles || [];
    const portalEnemies = map1Instance.enemySpawnData.portalTiles || [];
    const otherEnemies = map1Instance.enemySpawnData.otherTiles || [];
    const totalPlanned = centerEnemies.length + portalEnemies.length + otherEnemies.length;
    
    console.log(`🗺️ PLANNED ENEMIES:`);
    console.log(`  Center tiles (1Amap): ${centerEnemies.length} enemies`);
    console.log(`  Portal tiles: ${portalEnemies.length} enemies`);
    console.log(`  Other tiles: ${otherEnemies.length} enemies`);
    console.log(`  TOTAL PLANNED: ${totalPlanned} enemies`);
    
    // 3. Analyze actually spawned enemies
    console.log(`🗺️ === ACTUALLY SPAWNED ENEMIES ===`);
    console.log(`🗺️ Total enemies in EnemyManager: ${this.enemies.length}`);
    
    const aliveEnemies = this.enemies.filter(enemy => enemy.isAlive);
    const redEnemies = aliveEnemies.filter(enemy => enemy.type === 'red');
    const blueEnemies = aliveEnemies.filter(enemy => enemy.type === 'blue');
    
    console.log(`🗺️ ACTUALLY SPAWNED:`);
    console.log(`  Alive enemies: ${aliveEnemies.length}`);
    console.log(`  Red slimes: ${redEnemies.length}`);
    console.log(`  Blue slimes: ${blueEnemies.length}`);
    console.log(`  Dead enemies: ${this.enemies.length - aliveEnemies.length}`);
    
    // 4. Character and camera analysis
    console.log(`🗺️ === PLAYER POSITION ANALYSIS ===`);
    let characterWorldPos = null;
    let characterTilePos = null;
    
    if (window.gameMapManager?.character?.position) {
      const char = window.gameMapManager.character;
      const tileWidth = 2100; // Map1 tile width
      const tileHeight = 1485; // Map1 tile height
      
      characterWorldPos = { x: char.position.x, y: char.position.y };
      characterTilePos = {
        x: Math.floor(char.position.x / tileWidth),
        y: Math.floor(char.position.y / tileHeight)
      };
      
      console.log(`🗺️ Character world position: (${characterWorldPos.x.toFixed(1)}, ${characterWorldPos.y.toFixed(1)})`);
      console.log(`🗺️ Character tile: (${characterTilePos.x}, ${characterTilePos.y})`);
      
      // Check if character is in center area
      const isInCenterArea = characterTilePos.x >= 6 && characterTilePos.x <= 9 && characterTilePos.y >= 6 && characterTilePos.y <= 9;
      console.log(`🗺️ Character in center area (1Amap): ${isInCenterArea ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log(`🗺️ ❌ Character position not found`);
    }
    
    // 5. Camera and visibility analysis
    console.log(`🗺️ === CAMERA & VISIBILITY ANALYSIS ===`);
    const camera = window.gameMapManager?.camera;
    let visibleWorldBounds = null;
    
    if (camera && camera.mapContainer) {
      const screenWidth = this.app?.screen?.width || 1920;
      const screenHeight = this.app?.screen?.height || 1080;
      
      console.log(`🗺️ Camera/world container position: (${camera.mapContainer.x.toFixed(1)}, ${camera.mapContainer.y.toFixed(1)})`);
      console.log(`🗺️ Screen size: ${screenWidth}×${screenHeight}`);
      
      // Calculate visible world bounds
      visibleWorldBounds = {
        minX: -camera.mapContainer.x,
        minY: -camera.mapContainer.y,
        maxX: -camera.mapContainer.x + screenWidth,
        maxY: -camera.mapContainer.y + screenHeight
      };
      
      console.log(`🗺️ Visible world bounds:`);
      console.log(`  X: ${visibleWorldBounds.minX.toFixed(1)} to ${visibleWorldBounds.maxX.toFixed(1)}`);
      console.log(`  Y: ${visibleWorldBounds.minY.toFixed(1)} to ${visibleWorldBounds.maxY.toFixed(1)}`);
      
    } else {
      console.log(`🗺️ ❌ Camera or map container not found`);
    }
    
    // 6. DETAILED COORDINATE & RENDERING ANALYSIS
    console.log(`🗺️ === COORDINATE & RENDERING COMPARISON ===`);
    
    // Analyze debug enemies (if any exist)
    const debugEnemies = aliveEnemies.filter(enemy => !enemy.map1SpawnId);
    const map1Enemies = aliveEnemies.filter(enemy => enemy.map1SpawnId);
    
    console.log(`🗺️ Enemy classification:`);
    console.log(`  Debug-spawned enemies: ${debugEnemies.length}`);
    console.log(`  Map1-spawned enemies: ${map1Enemies.length}`);
    
    if (debugEnemies.length > 0) {
      console.log(`🗺️ === DEBUG ENEMY ANALYSIS ===`);
      debugEnemies.forEach((enemy, index) => {
        console.log(`🗺️ Debug Enemy ${index + 1} (${enemy.type}, ${enemy.currentHP}HP):`);
        
        // World coordinates
        const worldX = enemy.position.x;
        const worldY = enemy.position.y;
        console.log(`  🌍 World position: (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`);
        
        // Screen coordinates
        if (camera?.mapContainer) {
          const screenX = worldX + camera.mapContainer.x;
          const screenY = worldY + camera.mapContainer.y;
          console.log(`  📺 Screen position: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
          
          // Check if on screen
          const isOnScreen = screenX >= 0 && screenX <= (this.app?.screen?.width || 1920) && 
                            screenY >= 0 && screenY <= (this.app?.screen?.height || 1080);
          console.log(`  👁️ On screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
        }
        
        // Container hierarchy
        console.log(`  🏗️ Container hierarchy:`);
        console.log(`    Enemy container: ${enemy.container ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`    Container visible: ${enemy.container?.visible ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`    Container alpha: ${enemy.container?.alpha || 'N/A'}`);
        console.log(`    Container parent: ${enemy.container?.parent?.constructor?.name || 'NONE'}`);
        
        // Sprite properties
        console.log(`  🎨 Sprite properties:`);
        console.log(`    Sprite exists: ${enemy.sprite ? '✅ YES' : '❌ NO'}`);
        console.log(`    Sprite visible: ${enemy.sprite?.visible ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`    Sprite alpha: ${enemy.sprite?.alpha || 'N/A'}`);
        console.log(`    Sprite size: ${enemy.sprite?.width || 'N/A'}×${enemy.sprite?.height || 'N/A'}`);
        console.log(`    Sprite scale: ${enemy.sprite?.scale?.x || 'N/A'}×${enemy.sprite?.scale?.y || 'N/A'}`);
        
        // Distance from character
        if (characterWorldPos) {
          const distanceFromChar = Math.sqrt(
            Math.pow(worldX - characterWorldPos.x, 2) + 
            Math.pow(worldY - characterWorldPos.y, 2)
          );
          console.log(`  📏 Distance from character: ${distanceFromChar.toFixed(1)} pixels`);
        }
      });
    }
    
    if (map1Enemies.length > 0) {
      console.log(`🗺️ === MAP1 ENEMY ANALYSIS ===`);
      map1Enemies.forEach((enemy, index) => {
        console.log(`🗺️ Map1 Enemy ${index + 1} (${enemy.type}, ${enemy.currentHP}HP, ID: ${enemy.map1SpawnId}):`);
        
        // World coordinates
        const worldX = enemy.position.x;
        const worldY = enemy.position.y;
        console.log(`  🌍 World position: (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`);
        
        // Screen coordinates
        if (camera?.mapContainer) {
          const screenX = worldX + camera.mapContainer.x;
          const screenY = worldY + camera.mapContainer.y;
          console.log(`  📺 Screen position: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
          
          // Check if on screen
          const isOnScreen = screenX >= 0 && screenX <= (this.app?.screen?.width || 1920) && 
                            screenY >= 0 && screenY <= (this.app?.screen?.height || 1080);
          console.log(`  �️ On screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
        }
        
        // Container hierarchy
        console.log(`  🏗️ Container hierarchy:`);
        console.log(`    Enemy container: ${enemy.container ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`    Container visible: ${enemy.container?.visible ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`    Container alpha: ${enemy.container?.alpha || 'N/A'}`);
        console.log(`    Container parent: ${enemy.container?.parent?.constructor?.name || 'NONE'}`);
        
        // Sprite properties
        console.log(`  🎨 Sprite properties:`);
        console.log(`    Sprite exists: ${enemy.sprite ? '✅ YES' : '❌ NO'}`);
        console.log(`    Sprite visible: ${enemy.sprite?.visible ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`    Sprite alpha: ${enemy.sprite?.alpha || 'N/A'}`);
        console.log(`    Sprite size: ${enemy.sprite?.width || 'N/A'}×${enemy.sprite?.height || 'N/A'}`);
        console.log(`    Sprite scale: ${enemy.sprite?.scale?.x || 'N/A'}×${enemy.sprite?.scale?.y || 'N/A'}`);
        
        // Distance from character
        if (characterWorldPos) {
          const distanceFromChar = Math.sqrt(
            Math.pow(worldX - characterWorldPos.x, 2) + 
            Math.pow(worldY - characterWorldPos.y, 2)
          );
          console.log(`  � Distance from character: ${distanceFromChar.toFixed(1)} pixels`);
        }
        
        // Find corresponding planned enemy data
        const allPlannedEnemies = [...centerEnemies, ...portalEnemies, ...otherEnemies];
        const plannedEnemy = allPlannedEnemies.find(planned => planned.id === enemy.map1SpawnId);
        if (plannedEnemy) {
          console.log(`  📋 Planned data:`);
          console.log(`    Planned position: (${plannedEnemy.position.x.toFixed(1)}, ${plannedEnemy.position.y.toFixed(1)})`);
          console.log(`    Position match: ${Math.abs(worldX - plannedEnemy.position.x) < 1 && Math.abs(worldY - plannedEnemy.position.y) < 1 ? '✅ YES' : '❌ NO'}`);
          console.log(`    Planned type: ${plannedEnemy.type}`);
          console.log(`    Type match: ${enemy.type === plannedEnemy.type ? '✅ YES' : '❌ NO'}`);
        }
      });
    }
    
    // 7. Check which planned enemies should be visible but aren't spawned
    if (visibleWorldBounds && totalPlanned > 0) {
      console.log(`🗺️ === MISSING ENEMIES ANALYSIS ===`);
      
      const checkMissingEnemies = (enemyList, category) => {
        const visibleButMissing = enemyList.filter(enemy => {
          const isVisible = enemy.position.x >= visibleWorldBounds.minX && 
                           enemy.position.x <= visibleWorldBounds.maxX &&
                           enemy.position.y >= visibleWorldBounds.minY && 
                           enemy.position.y <= visibleWorldBounds.maxY;
          return isVisible && !enemy.isSpawned;
        });
        
        if (visibleButMissing.length > 0) {
          console.log(`🗺️ ${category} enemies that should be visible but aren't spawned:`);
          visibleButMissing.forEach(enemy => {
            console.log(`  � Missing Enemy ${enemy.id}:`);
            console.log(`    Position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
            console.log(`    Type: ${enemy.type} (${enemy.hp}HP)`);
            console.log(`    Tile: (${Math.floor(enemy.position.x / 2100)}, ${Math.floor(enemy.position.y / 1485)})`);
            
            if (characterWorldPos) {
              const distance = Math.sqrt(
                Math.pow(enemy.position.x - characterWorldPos.x, 2) + 
                Math.pow(enemy.position.y - characterWorldPos.y, 2)
              );
              console.log(`    Distance from character: ${distance.toFixed(1)} pixels`);
            }
          });
        }
        
        return visibleButMissing.length;
      };
      
      const missingCenter = checkMissingEnemies(centerEnemies, 'CENTER');
      const missingPortal = checkMissingEnemies(portalEnemies, 'PORTAL');
      const missingOther = checkMissingEnemies(otherEnemies, 'OTHER');
      const totalMissing = missingCenter + missingPortal + missingOther;
      
      console.log(`🗺️ Missing enemies summary:`);
      console.log(`  Missing center enemies: ${missingCenter}`);
      console.log(`  Missing portal enemies: ${missingPortal}`);
      console.log(`  Missing other enemies: ${missingOther}`);
      console.log(`  TOTAL MISSING: ${totalMissing}`);
      
      if (totalMissing > 0) {
        console.log(`🗺️ 🚨 CRITICAL: ${totalMissing} enemies should be visible but are not spawned!`);
        console.log(`🗺️ 💡 This explains why you don't see Map1 enemies near the portal`);
      } else {
        console.log(`🗺️ 💡 All planned enemies in your current area are properly handled (off-screen enemies are normal)`);
        console.log(`🗺️ 💡 To see Map1 enemies, move to areas where they are planned:`);
        console.log(`🗺️ 💡 - Center area (1Amap): tiles (6-9, 6-9) - character currently at (${characterTilePos?.x || 'N/A'}, ${characterTilePos?.y || 'N/A'})`);
        console.log(`🗺️ 💡 - Portal areas: check the specific portal tile locations above`);
      }
    }
    
    // 8. Debug spawn vs Map1 spawn comparison
    console.log(`🗺️ === DEBUG vs MAP1 SPAWN COMPARISON ===`);
    console.log(`🗺️ Debug spawning process:`);
    console.log(`  1. Uses character position directly (${characterWorldPos ? `${characterWorldPos.x.toFixed(1)}, ${characterWorldPos.y.toFixed(1)}` : 'N/A'})`);
    console.log(`  2. Spawns within 100-300px of character`);
    console.log(`  3. Uses generateDebugSpawnCoordinates() method`);
    console.log(`  4. Guarantees immediate visibility`);
    console.log(`  5. No map1SpawnId assigned`);
    
    console.log(`🗺️ Map1 spawning process:`);
    console.log(`  1. Pre-calculates positions at map load using tile grid`);
    console.log(`  2. Uses ${totalPlanned} pre-planned spawn points`);
    console.log(`  3. Spawns only when positions become visible via updateEnemyVisibility()`);
    console.log(`  4. Assigns map1SpawnId for tracking`);
    console.log(`  5. May fail if visibility detection is broken`);
    
    console.log(`🗺️ Key differences:`);
    console.log(`  Debug enemies: ${debugEnemies.length} spawned, always visible`);
    console.log(`  Map1 enemies: ${map1Enemies.length} spawned from ${totalPlanned} planned`);
    console.log(`  Success rate: Debug=100%, Map1=${totalPlanned > 0 ? ((map1Enemies.length / totalPlanned) * 100).toFixed(1) : 0}%`);
    
    console.log(`🗺️ === END MAP ENEMY DEBUG ANALYSIS ===`);
  }

  // Manual trigger for Map1 enemy initialization at current character position
  async triggerMap1EnemySpawn() {
    console.log(`[ENEMY-MANAGER] 🗺️ === MANUAL MAP1 ENEMY SPAWN TRIGGER ===`);
    
    // Check if we're in Map1 and if Map1 is available
    if (!window.gameMapManager || !window.gameMapManager.currentMap) {
      console.log(`[ENEMY-MANAGER] ❌ No current map found`);
      return;
    }
    
    const currentMapId = window.gameMapManager.currentMap;
    const map1Instance = window.gameMapManager.map1Instance;
    
    if (currentMapId !== 'maparea1') {
      console.log(`[ENEMY-MANAGER] ❌ Current map is not Map1 (${currentMapId}), cannot trigger Map1 enemy spawn`);
      return;
    }
    
    if (!map1Instance) {
      console.log(`[ENEMY-MANAGER] ❌ Map1 instance not found`);
      return;
    }
    
    console.log(`[ENEMY-MANAGER] 🎯 Current Map1 enemy status:`);
    console.log(`  Enemy data calculated: ${map1Instance.isEnemyDataCalculated}`);
    console.log(`  Current enemies in manager: ${this.enemies.length}`);
    
    // Force recalculation of enemy spawn data for testing
    console.log(`[ENEMY-MANAGER] 🔄 Forcing recalculation of enemy spawn data...`);
    map1Instance.isEnemyDataCalculated = false;
    map1Instance.spawnedEnemyIds.clear();
    
    // Use Map1's proper enemy spawning system
    console.log(`[ENEMY-MANAGER] 🎯 Triggering Map1's initializeEnemies() method...`);
    
    try {
      await map1Instance.initializeEnemies();
      console.log(`[ENEMY-MANAGER] ✅ Map1 enemy spawning completed successfully`);
      
      // Show summary
      if (map1Instance.enemySpawnData) {
        console.log(`[ENEMY-MANAGER] 📊 Enemy spawn summary:`);
        console.log(`  Center tiles: ${map1Instance.enemySpawnData.centerTiles.length} enemies`);
        console.log(`  Portal tiles: ${map1Instance.enemySpawnData.portalTiles.length} enemies`);
        console.log(`  Other tiles: ${map1Instance.enemySpawnData.otherTiles.length} enemies`);
        console.log(`  Total planned: ${map1Instance.enemySpawnData.centerTiles.length + map1Instance.enemySpawnData.portalTiles.length + map1Instance.enemySpawnData.otherTiles.length} enemies`);
        console.log(`  Actually spawned: ${this.enemies.length} enemies`);
      }
    } catch (error) {
      console.log(`[ENEMY-MANAGER] ❌ Error during Map1 enemy spawning: ${error.message}`);
    }
    
    console.log(`[ENEMY-MANAGER] 🗺️ === END MANUAL MAP1 ENEMY SPAWN ===`);
  }

  // Spawn a test Map1 enemy at character location with detailed debug logging
  async spawnTestMap1Enemy() {
    console.log(`[ENEMY-MANAGER] 🧪 === TEST MAP1 ENEMY SPAWN ===`);
    
    // Get character position
    if (!window.gameMapManager?.character?.position) {
      console.log(`[ENEMY-MANAGER] ❌ Character position not found`);
      return null;
    }
    
    const char = window.gameMapManager.character;
    const charX = char.position.x;
    const charY = char.position.y;
    
    console.log(`[ENEMY-MANAGER] 🧪 Character position: (${charX.toFixed(1)}, ${charY.toFixed(1)})`);
    console.log(`[ENEMY-MANAGER] 🧪 Spawning 5HP test slime at character location...`);
    
    // Enable all debug logging for this spawn
    const originalSpawnDebug = this.spawnDebugEnabled;
    const originalDebugEnabled = this.debugEnabled;
    this.spawnDebugEnabled = true;
    this.debugEnabled = true;
    
    try {
      // Spawn the enemy using the regular spawn method but mark it as Map1
      const enemy = await this.spawnEnemy('red', charX, charY, 5);
      
      if (enemy) {
        // Mark this as a Map1 enemy with special test ID
        enemy.map1SpawnId = 'TEST_MAP1_ENEMY';
        enemy.isTestMap1Enemy = true;
        
        console.log(`[ENEMY-MANAGER] 🧪 ✅ Test Map1 enemy spawned successfully!`);
        console.log(`[ENEMY-MANAGER] 🧪 Enemy ID: ${enemy.map1SpawnId}`);
        console.log(`[ENEMY-MANAGER] 🧪 Enemy Type: ${enemy.type} (${enemy.currentHP}HP)`);
        console.log(`[ENEMY-MANAGER] 🧪 Enemy Position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
        
        // Perform detailed analysis on this specific enemy
        this.performTestMap1EnemyAnalysis(enemy);
        
        // Start focused monitoring of this enemy
        this.startTestEnemyMonitoring(enemy);
        
        return enemy;
      } else {
        console.log(`[ENEMY-MANAGER] 🧪 ❌ Failed to spawn test Map1 enemy`);
        return null;
      }
    } catch (error) {
      console.log(`[ENEMY-MANAGER] 🧪 ❌ Error spawning test Map1 enemy: ${error.message}`);
      return null;
    } finally {
      // Restore original debug settings
      this.spawnDebugEnabled = originalSpawnDebug;
      this.debugEnabled = originalDebugEnabled;
    }
  }

  // Detailed analysis of the test Map1 enemy
  performTestMap1EnemyAnalysis(enemy) {
    console.log(`[ENEMY-MANAGER] 🔬 === TEST MAP1 ENEMY DETAILED ANALYSIS ===`);
    console.log(`[ENEMY-MANAGER] 🔬 Enemy: ${enemy.map1SpawnId} (${enemy.type}, ${enemy.currentHP}HP)`);
    
    // 1. Position Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === POSITION ANALYSIS ===`);
    console.log(`  📍 World Position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
    
    // Character position comparison
    if (window.gameMapManager?.character?.position) {
      const char = window.gameMapManager.character;
      const deltaX = enemy.position.x - char.position.x;
      const deltaY = enemy.position.y - char.position.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      console.log(`  📍 Character Position: (${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)})`);
      console.log(`  📍 Position Delta: (${deltaX.toFixed(1)}, ${deltaY.toFixed(1)})`);
      console.log(`  📍 Distance from Character: ${distance.toFixed(1)} pixels`);
      console.log(`  📍 Position Match: ${distance < 10 ? '✅ EXACT' : distance < 50 ? '⚠️ CLOSE' : '❌ FAR'}`);
    }
    
    // Screen position analysis
    const camera = window.gameMapManager?.camera;
    if (camera?.mapContainer) {
      const screenX = enemy.position.x + camera.mapContainer.x;
      const screenY = enemy.position.y + camera.mapContainer.y;
      const screenWidth = this.app?.screen?.width || 1920;
      const screenHeight = this.app?.screen?.height || 1080;
      
      console.log(`  📺 Screen Position: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
      console.log(`  📺 Screen Bounds: 0-${screenWidth} × 0-${screenHeight}`);
      
      const isOnScreen = screenX >= 0 && screenX <= screenWidth && screenY >= 0 && screenY <= screenHeight;
      console.log(`  👁️ On Screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
      
      if (isOnScreen) {
        console.log(`  ✅ Enemy should be VISIBLE on screen!`);
      } else {
        console.log(`  ❌ Enemy is OFF-SCREEN - this is the problem!`);
        console.log(`  💡 Screen position: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
        console.log(`  💡 Screen bounds: (0, 0) to (${screenWidth}, ${screenHeight})`);
      }
    }
    
    // 2. Container Hierarchy Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === CONTAINER HIERARCHY ===`);
    console.log(`  📦 Enemy Container: ${enemy.container ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (enemy.container) {
      console.log(`  📦 Container Position: (${enemy.container.x.toFixed(1)}, ${enemy.container.y.toFixed(1)})`);
      console.log(`  📦 Container Visible: ${enemy.container.visible ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`  📦 Container Alpha: ${enemy.container.alpha.toFixed(2)}`);
      console.log(`  📦 Container Scale: (${enemy.container.scale.x.toFixed(3)}, ${enemy.container.scale.y.toFixed(3)})`);
      console.log(`  📦 Container ZIndex: ${enemy.container.zIndex || 'N/A'}`);
      console.log(`  📦 Container Children: ${enemy.container.children.length}`);
      console.log(`  📦 Container Parent: ${enemy.container.parent?.constructor?.name || 'NONE'}`);
      
      // Check if position matches
      const positionMatch = Math.abs(enemy.container.x - enemy.position.x) < 1 && 
                           Math.abs(enemy.container.y - enemy.position.y) < 1;
      console.log(`  📍 Position Sync: ${positionMatch ? '✅ SYNCED' : '❌ MISMATCH'}`);
      
      if (!positionMatch) {
        console.log(`    Expected: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
        console.log(`    Actual: (${enemy.container.x.toFixed(1)}, ${enemy.container.y.toFixed(1)})`);
      }
    }
    
    // 3. Sprite Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === SPRITE ANALYSIS ===`);
    console.log(`  🖼️ Sprite: ${enemy.sprite ? '✅ EXISTS' : '❌ MISSING'}`);
    
    if (enemy.sprite) {
      console.log(`  🖼️ Sprite Position: (${enemy.sprite.x.toFixed(1)}, ${enemy.sprite.y.toFixed(1)})`);
      console.log(`  🖼️ Sprite Size: ${enemy.sprite.width.toFixed(1)}×${enemy.sprite.height.toFixed(1)}px`);
      console.log(`  🖼️ Sprite Scale: (${enemy.sprite.scale.x.toFixed(3)}, ${enemy.sprite.scale.y.toFixed(3)})`);
      console.log(`  🖼️ Sprite Visible: ${enemy.sprite.visible ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`  🖼️ Sprite Alpha: ${enemy.sprite.alpha.toFixed(2)}`);
      console.log(`  🖼️ Sprite Anchor: (${enemy.sprite.anchor?.x || 0}, ${enemy.sprite.anchor?.y || 0})`);
      console.log(`  🖼️ Sprite Texture: ${enemy.sprite.texture?.valid ? '✅ VALID' : '❌ INVALID'}`);
      console.log(`  🖼️ Sprite Parent: ${enemy.sprite.parent?.constructor?.name || 'NONE'}`);
      
      // Global position calculation
      if (enemy.sprite.toGlobal) {
        try {
          const globalPos = enemy.sprite.toGlobal({ x: 0, y: 0 });
          console.log(`  🌐 Global Position: (${globalPos.x.toFixed(1)}, ${globalPos.y.toFixed(1)})`);
          
          const screenWidth = this.app?.screen?.width || 1920;
          const screenHeight = this.app?.screen?.height || 1080;
          const isGlobalOnScreen = globalPos.x >= 0 && globalPos.x <= screenWidth && 
                                  globalPos.y >= 0 && globalPos.y <= screenHeight;
          console.log(`  👁️ Global On Screen: ${isGlobalOnScreen ? '✅ YES' : '❌ NO'}`);
        } catch (e) {
          console.log(`  🌐 Global Position: ❌ ERROR - ${e.message}`);
        }
      }
    }
    
    // 4. HP and Scaling Analysis
    console.log(`[ENEMY-MANAGER] 🔬 === HP & SCALING ANALYSIS ===`);
    console.log(`  💖 HP: ${enemy.currentHP}/${enemy.maxHP}`);
    console.log(`  📏 Base Scale: ${enemy.baseScale || 'N/A'}`);
    console.log(`  📏 Scale Per HP: ${enemy.scalePerHP || 'N/A'}`);
    console.log(`  📏 Current Scale: ${enemy.currentScale || 'N/A'}`);
    
    const expectedScale = enemy.baseScale ? 
      (enemy.baseScale + (enemy.currentHP - 1) * (enemy.scalePerHP || 0.15)) : 'N/A';
    console.log(`  📏 Expected Scale: ${typeof expectedScale === 'number' ? expectedScale.toFixed(4) : expectedScale}`);
    
    if (typeof expectedScale === 'number' && enemy.currentScale) {
      const scaleMatch = Math.abs(enemy.currentScale - expectedScale) < 0.01;
      console.log(`  📏 Scale Match: ${scaleMatch ? '✅ CORRECT' : '❌ MISMATCH'}`);
    }
    
    // 5. Map1 vs Debug Comparison
    console.log(`[ENEMY-MANAGER] 🔬 === MAP1 vs DEBUG COMPARISON ===`);
    console.log(`  🆔 Map1 Spawn ID: ${enemy.map1SpawnId || 'NONE'}`);
    console.log(`  🧪 Is Test Enemy: ${enemy.isTestMap1Enemy ? '✅ YES' : '❌ NO'}`);
    console.log(`  🎯 Spawn Method: Map1 simulation (should behave like Map1 enemy)`);
    console.log(`  📍 Spawn Location: Character position (guaranteed on-screen)`);
    console.log(`  👁️ Visibility: Should be immediate and guaranteed`);
    
    console.log(`[ENEMY-MANAGER] 🔬 === END TEST ENEMY ANALYSIS ===`);
  }

  // Start monitoring the test enemy with periodic updates
  startTestEnemyMonitoring(enemy) {
    console.log(`[ENEMY-MANAGER] 📡 Starting focused monitoring of test Map1 enemy: ${enemy.map1SpawnId}`);
    
    // Store reference for monitoring
    this.testMap1Enemy = enemy;
    this.testEnemyMonitoringEnabled = true;
    
    // Start periodic monitoring every 2 seconds
    if (this.testEnemyMonitoringInterval) {
      clearInterval(this.testEnemyMonitoringInterval);
    }
    
    this.testEnemyMonitoringInterval = setInterval(() => {
      if (!this.testEnemyMonitoringEnabled || !this.testMap1Enemy || !this.testMap1Enemy.isAlive) {
        console.log(`[ENEMY-MANAGER] 📡 Test enemy monitoring stopped - enemy ${!this.testMap1Enemy ? 'removed' : 'dead'}`);
        this.stopTestEnemyMonitoring();
        return;
      }
      
      this.performTestEnemyPeriodicCheck();
    }, 2000);
    
    console.log(`[ENEMY-MANAGER] 📡 Test enemy monitoring started - checking every 2 seconds`);
  }

  // Periodic check of the test enemy
  performTestEnemyPeriodicCheck() {
    const enemy = this.testMap1Enemy;
    if (!enemy || !enemy.isAlive) return;
    
    console.log(`[ENEMY-MANAGER] 📡 === TEST ENEMY PERIODIC CHECK ===`);
    console.log(`[ENEMY-MANAGER] 📡 Time: ${new Date().toLocaleTimeString()}`);
    console.log(`[ENEMY-MANAGER] 📡 Enemy: ${enemy.map1SpawnId} (${enemy.type}, ${enemy.currentHP}HP)`);
    
    // Quick visibility check
    const camera = window.gameMapManager?.camera;
    if (camera?.mapContainer && enemy.position) {
      const screenX = enemy.position.x + camera.mapContainer.x;
      const screenY = enemy.position.y + camera.mapContainer.y;
      const screenWidth = this.app?.screen?.width || 1920;
      const screenHeight = this.app?.screen?.height || 1080;
      
      const isOnScreen = screenX >= 0 && screenX <= screenWidth && screenY >= 0 && screenY <= screenHeight;
      
      console.log(`[ENEMY-MANAGER] 📡 Quick Status:`);
      console.log(`  Position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
      console.log(`  Screen: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
      console.log(`  On Screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
      console.log(`  Container Visible: ${enemy.container?.visible ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`  Sprite Visible: ${enemy.sprite?.visible ? '✅ TRUE' : '❌ FALSE'}`);
      console.log(`  Container Alpha: ${enemy.container?.alpha || 'N/A'}`);
      console.log(`  Sprite Alpha: ${enemy.sprite?.alpha || 'N/A'}`);
      
      // Calculate distance from character
      if (window.gameMapManager?.character?.position) {
        const char = window.gameMapManager.character;
        const distance = Math.sqrt(
          Math.pow(enemy.position.x - char.position.x, 2) + 
          Math.pow(enemy.position.y - char.position.y, 2)
        );
        console.log(`  Distance from Character: ${distance.toFixed(1)} pixels`);
      }
      
      // Overall visibility assessment
      const shouldBeVisible = isOnScreen && enemy.container?.visible && enemy.sprite?.visible && 
                             (enemy.container?.alpha || 0) > 0 && (enemy.sprite?.alpha || 0) > 0;
      console.log(`  SHOULD BE VISIBLE: ${shouldBeVisible ? '✅ YES' : '❌ NO'}`);
      
      if (!shouldBeVisible) {
        console.log(`  ⚠️ PROBLEM DETECTED: Enemy should be visible but something is wrong!`);
        if (!isOnScreen) console.log(`    - Enemy is off-screen`);
        if (!enemy.container?.visible) console.log(`    - Container is not visible`);
        if (!enemy.sprite?.visible) console.log(`    - Sprite is not visible`);
        if ((enemy.container?.alpha || 0) <= 0) console.log(`    - Container alpha is 0`);
        if ((enemy.sprite?.alpha || 0) <= 0) console.log(`    - Sprite alpha is 0`);
      }
    }
    
    console.log(`[ENEMY-MANAGER] 📡 === END PERIODIC CHECK ===`);
  }

  // Stop monitoring the test enemy
  stopTestEnemyMonitoring() {
    console.log(`[ENEMY-MANAGER] 📡 Stopping test enemy monitoring`);
    
    this.testEnemyMonitoringEnabled = false;
    this.testMap1Enemy = null;
    
    if (this.testEnemyMonitoringInterval) {
      clearInterval(this.testEnemyMonitoringInterval);
      this.testEnemyMonitoringInterval = null;
    }
  }

  // Debug Map1's visibility detection system
  debugMap1VisibilityDetection() {
    console.log(`[ENEMY-MANAGER] 🔍 === MAP1 VISIBILITY DETECTION DEBUG ===`);
    
    const map1Instance = window.gameMapManager?.map1Instance;
    if (!map1Instance) {
      console.log(`[ENEMY-MANAGER] ❌ Map1 instance not found`);
      return;
    }

    if (!map1Instance.enemySpawnData) {
      console.log(`[ENEMY-MANAGER] ❌ Map1 enemy spawn data not found`);
      return;
    }

    // Get camera information
    const camera = window.gameMapManager?.camera;
    if (!camera) {
      console.log(`[ENEMY-MANAGER] ❌ Camera not found`);
      return;
    }

    const screenWidth = this.app?.screen?.width || 1920;
    const screenHeight = this.app?.screen?.height || 1080;
    
    // Calculate world bounds exactly like Map1 does
    let worldViewBounds = {
      minX: -camera.mapContainer.x,
      minY: -camera.mapContainer.y,
      maxX: -camera.mapContainer.x + screenWidth,
      maxY: -camera.mapContainer.y + screenHeight
    };
    
    // Add margin like Map1 does
    const spawnMargin = 200;
    worldViewBounds.minX -= spawnMargin;
    worldViewBounds.minY -= spawnMargin;
    worldViewBounds.maxX += spawnMargin;
    worldViewBounds.maxY += spawnMargin;

    console.log(`[ENEMY-MANAGER] 🔍 Map1 Visibility Detection State:`);
    console.log(`  Screen size: ${screenWidth}×${screenHeight}`);
    console.log(`  Camera position: (${camera.mapContainer.x.toFixed(1)}, ${camera.mapContainer.y.toFixed(1)})`);
    console.log(`  World view bounds: (${worldViewBounds.minX.toFixed(1)}, ${worldViewBounds.minY.toFixed(1)}) to (${worldViewBounds.maxX.toFixed(1)}, ${worldViewBounds.maxY.toFixed(1)})`);
    console.log(`  Spawn margin: ${spawnMargin}px`);

    // Check each planned enemy
    const centerEnemies = map1Instance.enemySpawnData.centerTiles || [];
    const portalEnemies = map1Instance.enemySpawnData.portalTiles || [];
    const otherEnemies = map1Instance.enemySpawnData.otherTiles || [];
    const allEnemies = [...centerEnemies, ...portalEnemies, ...otherEnemies];

    console.log(`[ENEMY-MANAGER] 🔍 Checking ${allEnemies.length} planned enemies:`);

    let visibleCount = 0;
    let spawnedCount = 0;
    let shouldSpawnCount = 0;

    allEnemies.forEach((enemyData, index) => {
      const isVisible = enemyData.position.x >= worldViewBounds.minX && 
                       enemyData.position.x <= worldViewBounds.maxX &&
                       enemyData.position.y >= worldViewBounds.minY && 
                       enemyData.position.y <= worldViewBounds.maxY;
      
      const isSpawned = enemyData.isSpawned || map1Instance.spawnedEnemyIds.has(enemyData.id);
      const shouldSpawn = isVisible && !isSpawned;

      if (isVisible) visibleCount++;
      if (isSpawned) spawnedCount++;
      if (shouldSpawn) shouldSpawnCount++;

      if (isVisible || isSpawned) {
        console.log(`[ENEMY-MANAGER] 🔍 Enemy ${index + 1} (${enemyData.id}):`);
        console.log(`  Position: (${enemyData.position.x.toFixed(1)}, ${enemyData.position.y.toFixed(1)})`);
        console.log(`  Type: ${enemyData.type} (${enemyData.hp}HP)`);
        console.log(`  Is Visible: ${isVisible ? '✅ YES' : '❌ NO'}`);
        console.log(`  Is Spawned: ${isSpawned ? '✅ YES' : '❌ NO'}`);
        console.log(`  Should Spawn: ${shouldSpawn ? '✅ YES' : '❌ NO'}`);
        
        if (isVisible && !isSpawned) {
          console.log(`  🚨 PROBLEM: Enemy is visible but not spawned!`);
          console.log(`  💡 Position (${enemyData.position.x.toFixed(1)}, ${enemyData.position.y.toFixed(1)}) is within bounds (${worldViewBounds.minX.toFixed(1)}, ${worldViewBounds.minY.toFixed(1)}) to (${worldViewBounds.maxX.toFixed(1)}, ${worldViewBounds.maxY.toFixed(1)})`);
        }
      }
    });

    console.log(`[ENEMY-MANAGER] 🔍 SUMMARY:`);
    console.log(`  Total planned: ${allEnemies.length}`);
    console.log(`  Currently visible: ${visibleCount}`);
    console.log(`  Already spawned: ${spawnedCount}`);
    console.log(`  Should spawn now: ${shouldSpawnCount}`);

    if (shouldSpawnCount > 0) {
      console.log(`[ENEMY-MANAGER] 🚨 CRITICAL: ${shouldSpawnCount} enemies should be spawning but aren't!`);
      console.log(`[ENEMY-MANAGER] 💡 This suggests Map1's spawnVisibleEnemies() method is not being called properly`);
    } else if (visibleCount === 0) {
      console.log(`[ENEMY-MANAGER] 💡 No enemies are in the visible area - this is normal`);
    } else {
      console.log(`[ENEMY-MANAGER] ✅ All visible enemies are properly spawned`);
    }

    console.log(`[ENEMY-MANAGER] 🔍 === END VISIBILITY DETECTION DEBUG ===`);
  }

  // Show exact coordinates of all planned Map1 enemies
  showAllMap1EnemyLocations() {
    console.log(`[ENEMY-MANAGER] 📍 === ALL MAP1 ENEMY LOCATIONS ===`);
    
    const map1Instance = window.gameMapManager?.map1Instance;
    if (!map1Instance?.enemySpawnData) {
      console.log(`[ENEMY-MANAGER] ❌ Map1 enemy data not available`);
      return;
    }

    const centerEnemies = map1Instance.enemySpawnData.centerTiles || [];
    const portalEnemies = map1Instance.enemySpawnData.portalTiles || [];
    const otherEnemies = map1Instance.enemySpawnData.otherTiles || [];

    // Character position for reference
    const char = window.gameMapManager?.character;
    if (char?.position) {
      console.log(`[ENEMY-MANAGER] 📍 CHARACTER POSITION:`);
      console.log(`  World: (${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)})`);
      const tileX = Math.floor(char.position.x / 2100);
      const tileY = Math.floor(char.position.y / 1485);
      console.log(`  Tile: (${tileX}, ${tileY})`);
    }

    // Current visible bounds
    const camera = window.gameMapManager?.camera;
    if (camera?.mapContainer) {
      const screenWidth = this.app?.screen?.width || 1920;
      const screenHeight = this.app?.screen?.height || 1080;
      const margin = 200;
      
      const bounds = {
        minX: -camera.mapContainer.x - margin,
        minY: -camera.mapContainer.y - margin,
        maxX: -camera.mapContainer.x + screenWidth + margin,
        maxY: -camera.mapContainer.y + screenHeight + margin
      };
      
      console.log(`[ENEMY-MANAGER] 📍 CURRENT VISIBLE BOUNDS:`);
      console.log(`  X: ${bounds.minX.toFixed(1)} to ${bounds.maxX.toFixed(1)}`);
      console.log(`  Y: ${bounds.minY.toFixed(1)} to ${bounds.maxY.toFixed(1)}`);
    }

    console.log(`[ENEMY-MANAGER] 📍 CENTER ENEMIES (${centerEnemies.length}):`);
    centerEnemies.forEach((enemy, index) => {
      const tileX = Math.floor(enemy.position.x / 2100);
      const tileY = Math.floor(enemy.position.y / 1485);
      console.log(`  ${index + 1}. ${enemy.type} (${enemy.hp}HP) at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) tile (${tileX}, ${tileY}) ID: ${enemy.id}`);
    });

    console.log(`[ENEMY-MANAGER] 📍 PORTAL ENEMIES (${portalEnemies.length}):`);
    portalEnemies.forEach((enemy, index) => {
      const tileX = Math.floor(enemy.position.x / 2100);
      const tileY = Math.floor(enemy.position.y / 1485);
      console.log(`  ${index + 1}. ${enemy.type} (${enemy.hp}HP) at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) tile (${tileX}, ${tileY}) ID: ${enemy.id}`);
    });

    console.log(`[ENEMY-MANAGER] 📍 OTHER ENEMIES (${otherEnemies.length}):`);
    otherEnemies.forEach((enemy, index) => {
      const tileX = Math.floor(enemy.position.x / 2100);
      const tileY = Math.floor(enemy.position.y / 1485);
      console.log(`  ${index + 1}. ${enemy.type} (${enemy.hp}HP) at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) tile (${tileX}, ${tileY}) ID: ${enemy.id}`);
    });

    // Distance analysis
    if (char?.position) {
      console.log(`[ENEMY-MANAGER] 📍 DISTANCE FROM CHARACTER:`);
      const allEnemies = [...centerEnemies, ...portalEnemies, ...otherEnemies];
      
      const sortedByDistance = allEnemies.map(enemy => {
        const distance = Math.sqrt(
          Math.pow(enemy.position.x - char.position.x, 2) + 
          Math.pow(enemy.position.y - char.position.y, 2)
        );
        return { ...enemy, distance };
      }).sort((a, b) => a.distance - b.distance);

      console.log(`  Closest 5 enemies to character:`);
      sortedByDistance.slice(0, 5).forEach((enemy, index) => {
        const tileX = Math.floor(enemy.position.x / 2100);
        const tileY = Math.floor(enemy.position.y / 1485);
        console.log(`    ${index + 1}. ${enemy.type} at tile (${tileX}, ${tileY}) - ${enemy.distance.toFixed(0)}px away`);
      });
    }

    console.log(`[ENEMY-MANAGER] 📍 === END ENEMY LOCATIONS ===`);
  }

  // Teleport character to the closest Map1 enemy location
  teleportToClosestEnemy() {
    console.log(`[ENEMY-MANAGER] 🚀 === TELEPORT TO CLOSEST ENEMY ===`);
    
    const map1Instance = window.gameMapManager?.map1Instance;
    if (!map1Instance?.enemySpawnData) {
      console.log(`[ENEMY-MANAGER] ❌ Map1 enemy data not available`);
      return;
    }

    const char = window.gameMapManager?.character;
    if (!char?.position) {
      console.log(`[ENEMY-MANAGER] ❌ Character position not available`);
      return;
    }

    // Get all enemies
    const centerEnemies = map1Instance.enemySpawnData.centerTiles || [];
    const portalEnemies = map1Instance.enemySpawnData.portalTiles || [];
    const otherEnemies = map1Instance.enemySpawnData.otherTiles || [];
    const allEnemies = [...centerEnemies, ...portalEnemies, ...otherEnemies];

    if (allEnemies.length === 0) {
      console.log(`[ENEMY-MANAGER] ❌ No enemies found to teleport to`);
      return;
    }

    // Find closest enemy
    const sortedByDistance = allEnemies.map(enemy => {
      const distance = Math.sqrt(
        Math.pow(enemy.position.x - char.position.x, 2) + 
        Math.pow(enemy.position.y - char.position.y, 2)
      );
      return { ...enemy, distance };
    }).sort((a, b) => a.distance - b.distance);

    const closestEnemy = sortedByDistance[0];
    const tileX = Math.floor(closestEnemy.position.x / 2100);
    const tileY = Math.floor(closestEnemy.position.y / 1485);

    console.log(`[ENEMY-MANAGER] 🚀 Closest enemy: ${closestEnemy.type} (${closestEnemy.hp}HP) at tile (${tileX}, ${tileY})`);
    console.log(`[ENEMY-MANAGER] 🚀 Enemy position: (${closestEnemy.position.x.toFixed(1)}, ${closestEnemy.position.y.toFixed(1)})`);
    console.log(`[ENEMY-MANAGER] 🚀 Distance: ${closestEnemy.distance.toFixed(0)} pixels`);

    // Teleport character to enemy location
    console.log(`[ENEMY-MANAGER] 🚀 Teleporting character from (${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)}) to (${closestEnemy.position.x.toFixed(1)}, ${closestEnemy.position.y.toFixed(1)})`);
    
    // Set character position
    char.position.x = closestEnemy.position.x;
    char.position.y = closestEnemy.position.y;
    
    // Update character container if it exists
    if (char.container) {
      char.container.x = closestEnemy.position.x;
      char.container.y = closestEnemy.position.y;
      console.log(`[ENEMY-MANAGER] 🚀 Updated character container position`);
    }

    // Force camera update
    if (window.gameMapManager?.camera) {
      console.log(`[ENEMY-MANAGER] 🚀 Updating camera position...`);
      // The camera should automatically follow the character, but we can force an update
      window.gameMapManager.camera.update(0); // Force camera update
    }

    console.log(`[ENEMY-MANAGER] 🚀 ✅ Teleport completed!`);
    console.log(`[ENEMY-MANAGER] 🚀 Now at enemy location - Map1 enemies should spawn!`);
    
    // Wait a moment, then check if enemies spawn
    setTimeout(() => {
      console.log(`[ENEMY-MANAGER] 🚀 Checking if enemies spawned after teleport...`);
      this.debugMap1VisibilityDetection();
    }, 1000);

    console.log(`[ENEMY-MANAGER] 🚀 === END TELEPORT ===`);
  }

  // Force Map1 to spawn all visible enemies now
  async forceMap1VisibleEnemySpawn() {
    console.log(`[ENEMY-MANAGER] 🔧 === FORCE MAP1 VISIBLE ENEMY SPAWN ===`);
    
    const map1Instance = window.gameMapManager?.map1Instance;
    if (!map1Instance) {
      console.log(`[ENEMY-MANAGER] ❌ Map1 instance not found`);
      return;
    }

    console.log(`[ENEMY-MANAGER] 🔧 Forcing Map1 to spawn visible enemies...`);
    
    try {
      await map1Instance.spawnVisibleEnemies();
      console.log(`[ENEMY-MANAGER] 🔧 ✅ Force spawn completed`);
      
      // Check results
      setTimeout(() => {
        this.debugMap1VisibilityDetection();
      }, 500);
      
    } catch (error) {
      console.log(`[ENEMY-MANAGER] 🔧 ❌ Error during force spawn: ${error.message}`);
    }
  }
  
  // Enhanced debug logging for debug spawn vs Map1 spawn comparison
  logDebugSpawnComparison(enemy, coords, spawnType) {
    console.log(`🎯 === DEBUG SPAWN COMPARISON: ${spawnType} ===`);
    
    // Character reference
    const char = window.gameMapManager?.character;
    const camera = window.gameMapManager?.camera;
    
    if (char?.position) {
      console.log(`🎯 Character world position: (${char.position.x.toFixed(1)}, ${char.position.y.toFixed(1)})`);
    }
    
    // Spawn coordinates analysis
    console.log(`🎯 Spawn coordinate generation:`);
    console.log(`  Requested coordinates: (${coords.x.toFixed(1)}, ${coords.y.toFixed(1)})`);
    console.log(`  Actual enemy position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
    console.log(`  Coordinate match: ${Math.abs(coords.x - enemy.position.x) < 1 && Math.abs(coords.y - enemy.position.y) < 1 ? '✅ YES' : '❌ NO'}`);
    
    if (char?.position) {
      const distanceFromChar = Math.sqrt(
        Math.pow(enemy.position.x - char.position.x, 2) + 
        Math.pow(enemy.position.y - char.position.y, 2)
      );
      console.log(`  Distance from character: ${distanceFromChar.toFixed(1)} pixels`);
    }
    
    // Screen position analysis
    if (camera?.mapContainer) {
      const screenX = enemy.position.x + camera.mapContainer.x;
      const screenY = enemy.position.y + camera.mapContainer.y;
      const screenWidth = this.app?.screen?.width || 1920;
      const screenHeight = this.app?.screen?.height || 1080;
      
      console.log(`🎯 Screen position analysis:`);
      console.log(`  World position: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
      console.log(`  Camera offset: (${camera.mapContainer.x.toFixed(1)}, ${camera.mapContainer.y.toFixed(1)})`);
      console.log(`  Screen position: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
      console.log(`  Screen bounds: 0,0 to ${screenWidth},${screenHeight}`);
      
      const isOnScreen = screenX >= 0 && screenX <= screenWidth && screenY >= 0 && screenY <= screenHeight;
      console.log(`  Is on screen: ${isOnScreen ? '✅ YES' : '❌ NO'}`);
      
      if (!isOnScreen) {
        console.log(`  ⚠️ Enemy spawned off-screen! This should not happen with debug spawning.`);
      }
    }
    
    // Rendering properties analysis
    console.log(`🎯 Rendering properties:`);
    console.log(`  Container exists: ${enemy.container ? '✅ YES' : '❌ NO'}`);
    console.log(`  Container visible: ${enemy.container?.visible ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`  Container alpha: ${enemy.container?.alpha || 'N/A'}`);
    console.log(`  Container position: (${enemy.container?.x || 'N/A'}, ${enemy.container?.y || 'N/A'})`);
    console.log(`  Container parent: ${enemy.container?.parent?.constructor?.name || 'NONE'}`);
    console.log(`  Container z-index: ${enemy.container?.zIndex || 'N/A'}`);
    
    console.log(`  Sprite exists: ${enemy.sprite ? '✅ YES' : '❌ NO'}`);
    console.log(`  Sprite visible: ${enemy.sprite?.visible ? '✅ TRUE' : '❌ FALSE'}`);
    console.log(`  Sprite alpha: ${enemy.sprite?.alpha || 'N/A'}`);
    console.log(`  Sprite size: ${enemy.sprite?.width || 'N/A'}×${enemy.sprite?.height || 'N/A'}`);
    console.log(`  Sprite scale: ${enemy.sprite?.scale?.x || 'N/A'}×${enemy.sprite?.scale?.y || 'N/A'}`);
    console.log(`  Sprite texture: ${enemy.sprite?.texture?.baseTexture?.resource?.url || 'N/A'}`);
    
    // HP and scaling analysis
    console.log(`🎯 HP and scaling:`);
    console.log(`  HP: ${enemy.currentHP}/${enemy.maxHP}`);
    console.log(`  Base scale: ${enemy.baseScale || 'N/A'}`);
    console.log(`  Scale per HP: ${enemy.scalePerHP || 'N/A'}`);
    console.log(`  Current scale: ${enemy.currentScale || 'N/A'}`);
    console.log(`  Expected scale: ${enemy.baseScale ? (enemy.baseScale + (enemy.currentHP - 1) * (enemy.scalePerHP || 0.15)).toFixed(4) : 'N/A'}`);
    
    // Container hierarchy analysis
    console.log(`🎯 Container hierarchy:`);
    let currentContainer = enemy.container;
    let level = 0;
    while (currentContainer && level < 5) {
      const container = currentContainer; // Extract for safe closure
      const globalPos = container.toGlobal ? 
        (() => {
          try {
            return container.toGlobal({ x: 0, y: 0 });
          } catch (e) {
            return { x: 'ERROR', y: 'ERROR' };
          }
        })() : { x: 'N/A', y: 'N/A' };
      
      console.log(`  Level ${level}: ${container.constructor?.name || 'Unknown'}`);
      console.log(`    Local: (${container.x || 0}, ${container.y || 0})`);
      console.log(`    Visible: ${container.visible ? '✅' : '❌'}`);
      console.log(`    Alpha: ${container.alpha || 0}`);
      console.log(`    Global: (${typeof globalPos.x === 'number' ? globalPos.x.toFixed(1) : globalPos.x}, ${typeof globalPos.y === 'number' ? globalPos.y.toFixed(1) : globalPos.y})`);
      
      currentContainer = currentContainer.parent;
      level++;
    }
    
    // Map1 comparison hint
    console.log(`🎯 Map1 comparison:`);
    console.log(`  Debug spawn method: Immediate, guaranteed visibility`);
    console.log(`  Map1 spawn method: Tile-based, visibility-dependent`);
    console.log(`  Debug enemy ID: None (no map1SpawnId)`);
    console.log(`  Map1 enemy ID: Would have map1SpawnId property`);
    
    console.log(`🎯 === END DEBUG SPAWN COMPARISON ===`);
  }
  
  destroy() {
    // Clean up event listeners
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
    }
    
    // Stop test enemy monitoring
    this.stopTestEnemyMonitoring();
    
    // Clean up enemies
    this.clearAllEnemies();
    
    // Clean up container
    if (this.enemyContainer && this.enemyContainer.parent) {
      this.enemyContainer.parent.removeChild(this.enemyContainer);
    }
    if (this.enemyContainer) {
      this.enemyContainer.destroy();
    }
    
    if (this.debugEnabled) {
      console.log('EnemyManager destroyed');
    }
  }
  
  // ============= AI CONTROL METHODS =============
  
  /**
   * Enable/disable AI debug mode
   */
  setAIDebugEnabled(enabled) {
    if (this.enemyAI) {
      this.enemyAI.setDebugEnabled(enabled);
    }
  }
  
  /**
   * Enable/disable AI debug visualization
   */
  setAIDebugVisualization(enabled) {
    if (this.enemyAI) {
      this.enemyAI.setAIDebugVisualization(enabled);
    }
  }
  
  /**
   * Get AI state for a specific enemy
   */
  getEnemyAIState(enemy) {
    if (this.enemyAI) {
      return this.enemyAI.getEnemyAIState(enemy);
    }
    return 'none';
  }
  
  /**
   * Force enemy to specific AI state (for debugging)
   */
  forceEnemyAIState(enemy, state) {
    if (this.enemyAI) {
      this.enemyAI.forceEnemyState(enemy, state);
    }
  }
  
  /**
   * Get AI statistics for all enemies
   */
  getAIStats() {
    if (this.enemyAI) {
      return this.enemyAI.getAIStats(this.enemies);
    }
    return {};
  }
  
  /**
   * Test AI behavior by forcing a random enemy to chase the player
   */
  testAIChase() {
    if (!this.enemyAI || this.enemies.length === 0) {
      console.log('[ENEMY-MANAGER] 🧠 No enemies or AI available for testing');
      return;
    }
    
    const character = window.gameMapManager?.character;
    if (!character) {
      console.log('[ENEMY-MANAGER] 🧠 No character found for AI testing');
      return;
    }
    
    const randomEnemy = this.enemies[Math.floor(Math.random() * this.enemies.length)];
    if (randomEnemy && randomEnemy.isAlive) {
      this.enemyAI.forceEnemyState(randomEnemy, 'chasing');
      console.log(`[ENEMY-MANAGER] 🧠 Forced ${randomEnemy.type} slime to chase player`);
    }
  }
  
  /**
   * Make all enemies return to their starting positions
   */
  makeAllEnemiesReturn() {
    if (!this.enemyAI) return;
    
    this.enemies.forEach(enemy => {
      if (enemy && enemy.isAlive) {
        this.enemyAI.forceEnemyState(enemy, 'returning');
      }
    });
    
    console.log(`[ENEMY-MANAGER] 🧠 Forced ${this.enemies.length} enemies to return to start`);
  }
  
  /**
   * Display AI status for all enemies
   */
  showAIStatus() {
    if (!this.enemyAI) {
      console.log('[ENEMY-MANAGER] 🧠 AI system not available');
      return;
    }
    
    console.log('[ENEMY-MANAGER] 🧠 === AI STATUS REPORT ===');
    
    const stats = this.getAIStats();
    console.log(`Total enemies: ${stats.total}`);
    console.log(`Idle: ${stats.idle || 0}`);
    console.log(`Chasing: ${stats.chasing || 0}`);
    console.log(`Returning: ${stats.returning || 0}`);
    console.log(`Attacking: ${stats.attacking || 0}`);
    console.log(`Stunned: ${stats.stunned || 0}`);
    
    this.enemies.forEach((enemy, index) => {
      if (enemy && enemy.isAlive && enemy.aiData) {
        const state = this.getEnemyAIState(enemy);
        const distanceFromStart = enemy.aiData.distanceFromStart || 0;
        console.log(`Enemy ${index + 1} (${enemy.type}): ${state} - Distance from start: ${distanceFromStart.toFixed(1)}px`);
      }
    });
    
    console.log('[ENEMY-MANAGER] 🧠 === END AI STATUS ===');
  }
}
