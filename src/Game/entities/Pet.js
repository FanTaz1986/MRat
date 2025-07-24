import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';

// Projectile class for pet ranged attacks
class Projectile {
  constructor(app, startX, startY, direction, level, petAnimations, hitRegDebugEnabled = false, coordinateDebugEnabled = false) {
    this.app = app;
    this.position = { x: startX, y: startY };
    this.direction = direction; // 'left' or 'right'
    this.level = level;
    this.speed = level === 1 ? 12 : 24; // Level 1: 3x character speed (12), Level 2: 6x character speed (24) - 50% faster
    this.isActive = true;
    this.hitRegDebugEnabled = hitRegDebugEnabled; // For hit registration debugging
    this.coordinateDebugEnabled = coordinateDebugEnabled; // For coordinate space debugging
    
    console.log(`[HIT-REG-DEBUG] Projectile constructor: hitRegDebugEnabled = ${hitRegDebugEnabled}`);
    console.log(`[COORD-DEBUG] Projectile constructor: coordinateDebugEnabled = ${coordinateDebugEnabled}`);
    
    // Get screen dimensions for range calculation
    this.screenWidth = app.screen.width || 1536;
    this.screenHeight = app.screen.height || 695;
    
    // Calculate max range based on level (use world coordinates, not screen)
    const baseRange = 400; // Base range in world pixels
    this.maxRange = this.level === 1 ? baseRange * 0.5 : baseRange * 1.5; // Level 1: 200px, Level 2: 600px (2x increase)
    this.traveledDistance = 0;
    
    // Create sprite based on level - use only one sprite and mirror for left direction
    const textureKey = level === 1 ? 'projectile_1' : 'projectile_3'; // Level 2 uses projectile_3 for purple
    this.sprite = new PIXI.Sprite(petAnimations[textureKey][0]);
    this.sprite.anchor.set(0.5);
    this.sprite.position.set(startX, startY);
    
    // Calculate projectile scale - half the size of the pet
    // Get pet size for current level and calculate half size
    const petSizes = {
      1: 164 * 0.5, // Level 1 pet size (map1)
      2: 164 * 1.0  // Level 2 pet size (map2/mapx)
    };
    const petSize = petSizes[level] || petSizes[1];
    const projectileTargetSize = petSize * 0.5; // Half the pet size
    
    // Original projectile dimensions
    const originalSizes = {
      1: { width: 2179, height: 560 },
      2: { width: 2920, height: 647 }
    };
    const originalSize = originalSizes[level] || originalSizes[1];
    
    // Calculate scale to achieve target size (use the larger dimension for consistent scaling)
    const maxOriginalDimension = Math.max(originalSize.width, originalSize.height);
    const projectileScale = projectileTargetSize / maxOriginalDimension;
    
    // Add random vertical flip for variation (50% chance)
    const randomFlip = Math.random() < 0.5;
    const scaleY = randomFlip ? -projectileScale : projectileScale;
    
    // Set direction and velocity
    if (direction === 'left') {
      this.sprite.scale.set(-projectileScale, scaleY); // Mirror horizontally for left direction
      this.velocity = { x: -this.speed, y: 0 };
    } else {
      this.sprite.scale.set(projectileScale, scaleY);
      this.velocity = { x: this.speed, y: 0 };
    }
    
    // High-quality rendering
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.visible = true;
    this.sprite.alpha = 1.0;
    
    debugLog(`Projectile created: Level ${level}, Direction ${direction}, Range ${this.maxRange}px, Scale: ${projectileScale.toFixed(3)}, Flipped: ${randomFlip}`, 'pet');
    debugLog(`Projectile sprite size: ${this.sprite.width.toFixed(1)}x${this.sprite.height.toFixed(1)} at position (${startX}, ${startY})`, 'pet');
    debugLog(`Projectile velocity: (${this.velocity.x}, ${this.velocity.y})`, 'pet');
  }
  
  update(delta) {
    if (!this.isActive) return false;
    
    // Update position
    this.position.x += this.velocity.x * delta;
    this.position.y += this.velocity.y * delta;
    this.sprite.position.set(this.position.x, this.position.y);
    
    // Track traveled distance
    this.traveledDistance += Math.abs(this.velocity.x) * delta;
    
    // Check for collision with boss (only on Map X) - returns true if collision occurred
    if (this.checkBossCollision()) {
      if (this.hitRegDebugEnabled) {
        console.log(`[HIT-REG-DEBUG] Projectile destroyed by boss collision`);
      }
      return false; // Projectile was destroyed by collision
    }
    
    // Check for collision with slimes/enemies - returns true if collision occurred
    if (this.checkEnemyCollision()) {
      if (this.hitRegDebugEnabled) {
        console.log(`[HIT-REG-DEBUG] Projectile destroyed by enemy collision`);
      }
      return false; // Projectile was destroyed by collision
    }
    
    // Debug: Log position every so often
    if (Math.floor(this.traveledDistance) % 50 === 0) {
      debugLog(`Projectile at (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}), traveled: ${this.traveledDistance.toFixed(1)}`, 'pet');
    }
    
    // Check if projectile has traveled max range
    if (this.traveledDistance >= this.maxRange) {
      debugLog(`Projectile destroyed - reached max range: ${this.maxRange}px (traveled: ${this.traveledDistance.toFixed(1)}px)`, 'pet');
      this.destroy();
      return false;
    }
    
    return true;
  }
  
  // Check collision with boss and deal damage
  checkBossCollision() {
    // Only check collision on Map X where boss exists
    if (window.gameMapManager && 
        window.gameMapManager.currentMap === 'mapareax' && 
        window.gameMapManager.mapXInstance && 
        window.gameMapManager.mapXInstance.boss) {
      
      const boss = window.gameMapManager.mapXInstance.boss;
      
      // Check if boss is alive and not in dead phase
      if (boss.phase === 'dead' || boss.currentHP <= 0) {
        return false;
      }
      
      // Calculate distance between projectile and boss
      const dx = this.position.x - boss.position.x;
      const dy = this.position.y - boss.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Smaller collision radius so projectiles can fly deeper into boss before hitting
      // Boss collision radius (much smaller - center area only)
      const bossRadius = 80; // Reduced from 250 to 80 - projectiles fly deeper into boss
      // Projectile collision radius (50% bigger for more forgiving hits)
      const projectileRadius = 22.5; // Increased from 15 to 22.5 for 50% larger hitbox
      const collisionDistance = bossRadius + projectileRadius;
      
      // Debug: Log close approaches (when within twice the collision distance)
      if (distance <= collisionDistance * 2) {
        debugLog(`🔍 Projectile approaching boss: distance=${distance.toFixed(1)}, threshold=${collisionDistance}, projectile=(${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}), boss=(${boss.position.x.toFixed(1)}, ${boss.position.y.toFixed(1)})`, 'pet');
      }
      
      // Check if collision occurred
      if (distance <= collisionDistance) {
        debugLog(`🎯 Pet projectile HIT boss center! Distance: ${distance.toFixed(1)}, Collision threshold: ${collisionDistance}`, 'pet');
        
        // Deal 1 HP damage to boss
        if (boss.takeDamage && typeof boss.takeDamage === 'function') {
          const oldHP = boss.currentHP;
          boss.takeDamage(1);
          debugLog(`💥 Pet projectile dealt 1 damage to boss: ${oldHP} -> ${boss.currentHP} HP (${boss.currentHP}/${boss.maxHP})`, 'pet');
        } else {
          debugLog(`❌ Boss takeDamage method not available`, 'pet');
        }
        
        // Destroy the projectile on impact
        this.destroy();
        return true;
      }
    }
    return false;
  }
  
  // Check collision with slimes/enemies and deal damage
  checkEnemyCollision() {
    // Get enemy manager from global scope
    const enemyManager = window.globalEnemyManager;
    if (!enemyManager || !enemyManager.enemies) {
      if (this.hitRegDebugEnabled) {
        console.log(`[HIT-REG-DEBUG] No enemy manager or enemies available for collision detection`);
      }
      return false;
    }
    
    // Get pet for additional context
    const pet = window.globalPet;
    
    // Get camera position for coordinate space conversion
    let cameraOffset = { x: 0, y: 0 };
    
    // Try multiple methods to get camera offset
    // Method 1: Check if camera controller exists via global MapManager
    if (window.gameMapManager && window.gameMapManager.camera && window.gameMapManager.camera.mapContainer) {
      const mapContainer = window.gameMapManager.camera.mapContainer;
      cameraOffset.x = -mapContainer.x;
      cameraOffset.y = -mapContainer.y;
    }
    // Method 2: Use app stage position (common camera implementation)
    else if (this.app && this.app.stage && this.app.stage.position) {
      cameraOffset.x = -this.app.stage.position.x;
      cameraOffset.y = -this.app.stage.position.y;
    }
    // Method 3: Check enemy manager's game container position
    else if (enemyManager.gameContainer) {
      cameraOffset.x = -enemyManager.gameContainer.x;
      cameraOffset.y = -enemyManager.gameContainer.y;
    }
    
    // Convert projectile world position to camera-relative coordinates (same as enemies)
    const projectileCameraX = this.position.x - cameraOffset.x;
    const projectileCameraY = this.position.y - cameraOffset.y;
    
    if (this.hitRegDebugEnabled) {
      console.log(`[HIT-REG-DEBUG] Projectile collision check:`, {
        projectileWorldPos: { x: this.position.x.toFixed(1), y: this.position.y.toFixed(1) },
        projectileCameraPos: { x: projectileCameraX.toFixed(1), y: projectileCameraY.toFixed(1) },
        cameraOffset: { x: cameraOffset.x.toFixed(1), y: cameraOffset.y.toFixed(1) },
        projectileLevel: this.level,
        projectileDirection: this.direction,
        projectileVelocity: { x: this.velocity.x.toFixed(1), y: this.velocity.y.toFixed(1) },
        projectileSize: { width: this.sprite.width.toFixed(1), height: this.sprite.height.toFixed(1) },
        projectileRadius: 15, // Updated to 15 for 50% larger hitbox
        projectileAlive: this.isActive,
        traveledDistance: this.traveledDistance.toFixed(1),
        maxRange: this.maxRange,
        petPosition: pet ? { x: pet.position.x.toFixed(1), y: pet.position.y.toFixed(1) } : 'N/A',
        petLevel: pet ? pet.currentLevel : 'N/A',
        enemyCount: enemyManager.enemies.length,
        aliveEnemyCount: enemyManager.enemies.filter(e => e.isAlive).length
      });
    }
    
    // Check collision with each alive enemy
    for (let i = 0; i < enemyManager.enemies.length; i++) {
      const enemy = enemyManager.enemies[i];
      
      if (!enemy.isAlive || !enemy.container || !enemy.sprite) {
        if (this.hitRegDebugEnabled) {
          console.log(`[HIT-REG-DEBUG] Skipping enemy ${i} (${enemy.type}): alive=${enemy.isAlive}, container=${!!enemy.container}, sprite=${!!enemy.sprite}`);
        }
        continue;
      }
      
      // Detailed coordinate space analysis (when coordinate debug is enabled)
      if (this.coordinateDebugEnabled) {
        // Calculate enemy camera coordinates for coordinate space analysis
        const enemyCameraX = enemy.position.x - cameraOffset.x;
        const enemyCameraY = enemy.position.y - cameraOffset.y;
        
        console.log(`[COORD-DEBUG] 📐 COORDINATE SPACE ANALYSIS - Enemy ${i} (${enemy.type}):`);
        console.log(`[COORD-DEBUG] 🌍 World Coordinates:`);
        console.log(`[COORD-DEBUG]   Projectile World: (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);
        console.log(`[COORD-DEBUG]   Enemy World: (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
        console.log(`[COORD-DEBUG]   World Distance: ${Math.sqrt(Math.pow(this.position.x - enemy.position.x, 2) + Math.pow(this.position.y - enemy.position.y, 2)).toFixed(1)}`);
        
        console.log(`[COORD-DEBUG] 📹 Camera Coordinates:`);
        console.log(`[COORD-DEBUG]   Camera Offset: (${cameraOffset.x.toFixed(1)}, ${cameraOffset.y.toFixed(1)})`);
        console.log(`[COORD-DEBUG]   Projectile Camera: (${projectileCameraX.toFixed(1)}, ${projectileCameraY.toFixed(1)})`);
        console.log(`[COORD-DEBUG]   Enemy Camera: (${enemyCameraX.toFixed(1)}, ${enemyCameraY.toFixed(1)})`);
        console.log(`[COORD-DEBUG]   Camera Distance: ${Math.sqrt(Math.pow(projectileCameraX - enemyCameraX, 2) + Math.pow(projectileCameraY - enemyCameraY, 2)).toFixed(1)}`);
        
        console.log(`[COORD-DEBUG] 🎯 Collision Analysis:`);
        console.log(`[COORD-DEBUG]   Enemy Radius: ${(25 * enemy.currentScale).toFixed(1)} (scale: ${enemy.currentScale.toFixed(2)})`);
        console.log(`[COORD-DEBUG]   Projectile Radius: 10`);
        console.log(`[COORD-DEBUG]   Collision Threshold: ${(25 * enemy.currentScale + 10).toFixed(1)}`);
        
        // Compare different coordinate space calculations
        const worldDx = this.position.x - enemy.position.x;
        const worldDy = this.position.y - enemy.position.y;
        const worldDistance = Math.sqrt(worldDx * worldDx + worldDy * worldDy);
        
        const cameraDx = projectileCameraX - enemyCameraX;
        const cameraDy = projectileCameraY - enemyCameraY;
        const cameraDistance = Math.sqrt(cameraDx * cameraDx + cameraDy * cameraDy);
        
        // Current system (wrong): projectile camera vs enemy world
        const currentDx = projectileCameraX - enemy.position.x;
        const currentDy = projectileCameraY - enemy.position.y;
        const currentDistance = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
        
        console.log(`[COORD-DEBUG] 🔍 Distance Comparison:`);
        console.log(`[COORD-DEBUG]   World-to-World: ${worldDistance.toFixed(1)} (both in world coordinates)`);
        console.log(`[COORD-DEBUG]   Camera-to-Camera: ${cameraDistance.toFixed(1)} (both in camera coordinates) ✅ CORRECT`);
        console.log(`[COORD-DEBUG]   Current System: ${currentDistance.toFixed(1)} (projectile camera vs enemy world) ❌ WRONG`);
        console.log(`[COORD-DEBUG] 💡 Coordinate Issue: Current system mixes coordinate spaces!`);
      }
      
      // Calculate distance between projectile (in camera coordinates) and enemy center
      const dx = projectileCameraX - enemy.position.x;
      const dy = projectileCameraY - enemy.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Enemy collision radius (based on enemy scale/HP)
      const enemyRadius = 25 * enemy.currentScale; // Scales with HP
      // Projectile collision radius (50% bigger for more forgiving hits)
      const projectileRadius = 15; // Increased from 10 to 15 for 50% larger hitbox
      const collisionDistance = enemyRadius + projectileRadius;
      
      // COORDINATE SPACE FIX: Calculate what the distance SHOULD be if using correct coordinates
      // This is a temporary fix until we can safely change the coordinate system
      let correctedCollisionDistance = collisionDistance;
      
      // ALWAYS apply coordinate space correction to ensure hit detection works
      {
        // Calculate the correct distance for comparison
        const enemyCameraX = enemy.position.x - cameraOffset.x;
        const enemyCameraY = enemy.position.y - cameraOffset.y;
        const correctDx = projectileCameraX - enemyCameraX;
        const correctDy = projectileCameraY - enemyCameraY;
        const correctDistance = Math.sqrt(correctDx * correctDx + correctDy * correctDy);
        
        // If the current distance is much larger than correct distance, apply scaling
        if (distance > correctDistance * 10) { // Only apply if distance is significantly wrong
          const scaleFactor = distance / correctDistance;
          correctedCollisionDistance = collisionDistance * scaleFactor;
          
          if (this.coordinateDebugEnabled) {
            console.log(`[COORD-DEBUG] 🔧 COLLISION THRESHOLD CORRECTION:`);
            console.log(`[COORD-DEBUG]   Original threshold: ${collisionDistance.toFixed(1)}`);
            console.log(`[COORD-DEBUG]   Scale factor: ${scaleFactor.toFixed(1)} (distance ${distance.toFixed(1)} vs correct ${correctDistance.toFixed(1)})`);
            console.log(`[COORD-DEBUG]   Corrected threshold: ${correctedCollisionDistance.toFixed(1)}`);
            console.log(`[COORD-DEBUG]   Result: ${distance <= correctedCollisionDistance ? 'HIT!' : 'miss'}`);
          }
        }
      }
      
      if (this.hitRegDebugEnabled) {
        console.log(`[HIT-REG-DEBUG] Enemy ${i} (${enemy.type}) collision analysis:`);
        console.log(`  Projectile: worldPos(${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}) cameraPos(${projectileCameraX.toFixed(1)}, ${projectileCameraY.toFixed(1)}) radius=10`);
        console.log(`  Enemy: pos(${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)}) HP=${enemy.currentHP}/${enemy.maxHP} scale=${enemy.currentScale.toFixed(2)}`);
        console.log(`  Enemy: size=${enemy.sprite.width.toFixed(1)}x${enemy.sprite.height.toFixed(1)} visible=${enemy.sprite.visible} alpha=${enemy.sprite.alpha}`);
        console.log(`  Enemy: radius=${enemyRadius.toFixed(1)} hitStunned=${enemy.isHitStunned}`);
        console.log(`  Distance: ${distance.toFixed(1)} vs threshold=${correctedCollisionDistance.toFixed(1)} → ${distance <= correctedCollisionDistance ? 'HIT!' : 'miss'}`);
        console.log(`  Delta: dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
        console.log(`  CoordinateSpace: cameraOffset(${cameraOffset.x.toFixed(1)}, ${cameraOffset.y.toFixed(1)})`);
      }
      
      // Check if collision occurred (using corrected collision distance if coordinate debug is enabled)
      if (distance <= correctedCollisionDistance) {
        console.log(`🎯 Pet projectile HIT ${enemy.type} slime! Distance: ${distance.toFixed(1)}, Collision threshold: ${correctedCollisionDistance}`, 'pet');
        
        if (this.hitRegDebugEnabled) {
          console.log(`[HIT-REG-DEBUG] COLLISION CONFIRMED!`, {
            impactDetails: {
              projectileWorldPos: { x: this.position.x.toFixed(1), y: this.position.y.toFixed(1) },
              projectileCameraPos: { x: projectileCameraX.toFixed(1), y: projectileCameraY.toFixed(1) },
              enemyPosition: { x: enemy.position.x.toFixed(1), y: enemy.position.y.toFixed(1) },
              distance: distance.toFixed(1),
              threshold: collisionDistance.toFixed(1),
              overlap: (collisionDistance - distance).toFixed(1),
              coordinateCorrection: `World to Camera offset: (${cameraOffset.x.toFixed(1)}, ${cameraOffset.y.toFixed(1)})`
            }
          });
        }
        
        // Deal 1 HP damage to enemy
        if (enemy.takeDamage && typeof enemy.takeDamage === 'function') {
          const oldHP = enemy.currentHP;
          enemy.takeDamage(1);
          console.log(`💥 Pet projectile dealt 1 damage to ${enemy.type} slime: ${oldHP} -> ${enemy.currentHP} HP (${enemy.currentHP}/${enemy.maxHP})`, 'pet');
          
          if (this.hitRegDebugEnabled) {
            console.log(`[HIT-REG-DEBUG] Damage applied successfully:`, {
              enemyType: enemy.type,
              oldHP: oldHP,
              newHP: enemy.currentHP,
              maxHP: enemy.maxHP,
              hitStunApplied: enemy.isHitStunned,
              scaleTransition: enemy.isScaling
            });
          }
        } else {
          console.log(`❌ Enemy takeDamage method not available for ${enemy.type} slime`, 'pet');
        }
        
        // Destroy the projectile on impact
        this.destroy();
        return true;
      }
    }
    
    if (this.hitRegDebugEnabled) {
      console.log(`[HIT-REG-DEBUG] No collisions detected this frame`);
    }
    
    return false;
  }
  
  destroy() {
    this.isActive = false;
    try {
      if (this.sprite) {
        if (this.sprite.parent) {
          this.sprite.parent.removeChild(this.sprite);
        }
        this.sprite.destroy();
      }
    } catch (error) {
      console.warn('Error destroying projectile sprite:', error);
    }
  }
}

export default class Pet {
  constructor(app, initialX, initialY, mapId = 'maparea0') {
    this.app = app;
    this.mapId = mapId;
    this.position = { x: initialX, y: initialY };
    this.velocity = { x: 0, y: 0 };
    this.direction = 'right'; // default facing right
    this.isMoving = false;
    this.moveSpeed = 10.4; // Doubled from 5.2 for 2x speed
    this.animationSpeed = 0.15;
    this.bounds = null;
    this.isAttacking = false;
    this.attackDuration = 100; // ms
    this.lastAttackTime = 0;
    
    // Hit registration debugging
    this.hitRegDebugEnabled = false;
    
    // Projectile system for ranged attacks (level 1 and 2)
    this.projectiles = [];
    this.projectileSpeed = 8; // 2x character speed (4*2=8)
    this.attackIntervals = {
      0: null, // Level 0 has no ranged attack
      1: 2000, // Level 1: 2 seconds
      2: 1000  // Level 2: 1 second
    };
    this.lastRangedAttackTime = 0;
    this.canRangedAttack = true;
    
    // Hit registration debug property
    this.hitRegDebugEnabled = false;
    this.pendingProjectile = null; // Track pending projectile to spawn after attack animation
    this.projectileSpawned = false; // Flag to ensure projectile spawns only once per attack
    
    // Growth and range system
    this.characterReference = null; // Reference to main character
    this.baseRange = 164; // Base range (one character height) for map0
    this.currentRange = this.baseRange;
    
    // Pet scaling based on level/map
    this.baseScale = 0.7; // Base scale for map0
    this.currentScale = this.baseScale;
    this.isFollowing = false; // Whether pet is following the character
    this.followSpeed = 11.7; // Doubled from 5.85 for 2x speed - slightly faster than move speed when following
    
    // Character reference for following
    this.character = null;
    this.camera = null; // Reference to camera for viewport bounds
    
    // Distance limits based on character size
    this.baseMaxDistance = 164; // One character height at map0
    this.currentMaxDistance = this.baseMaxDistance;

    // Character movement tracking for auto-follow when at edge
    this.lastCharacterPosition = null;
    this.characterMovementThreshold = 2; // Very sensitive - any movement counts
    this.characterIsMoving = false;
    this.isAutoFollowing = false; // Whether pet is actively auto-following due to max range
    this.wasOutOfRange = false; // Hysteresis state for isOutOfRange() to prevent oscillation

    // Animation frames by direction
    this.frameIndices = {
      right: 0,
      left: 0
    };

    // Animation timing
    this.lastFrameTime = 0;
    this.frameUpdateInterval = 250;

    // Setup input
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false
    };

    // Controller input support
    this.controllerInput = { dx: 0, dy: 0 };
    
    this.setupSprite();
    this.setupInputListeners();
    this.app.ticker.add(this.update, this);
  }

  setupSprite() {
    debugLog('Setting up pet sprite', 'pet');

    // Helper to create mirrored texture with high quality
    const createMirroredTexture = (path) => {
      const baseTexture = PIXI.BaseTexture.from(process.env.PUBLIC_URL + path);
      
      // High-quality settings for pet textures
      baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
      baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
      
      const frame = new PIXI.Rectangle(0, 0, baseTexture.width, baseTexture.height);
      const texture = new PIXI.Texture(baseTexture, frame);
      texture.defaultAnchor = new PIXI.Point(0.5, 0.5);
      texture._isMirrored = true;
      return texture;
    };

    // Helper to create normal texture with high quality
    const createTexture = (path) => {
      const baseTexture = PIXI.BaseTexture.from(process.env.PUBLIC_URL + path);
      
      // High-quality settings for pet textures
      baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
      baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
      
      const texture = new PIXI.Texture(baseTexture);
      texture.defaultAnchor = new PIXI.Point(0.5, 0.5);
      return texture;
    };

    // Animations for all levels
    this.animations = {
      // 0lvl
      idle_0: [createTexture('/Ziurke/0lvl/1_ziurke_still.png')],
      idle_left_0: [createMirroredTexture('/Ziurke/0lvl/1_ziurke_still.png')],
      move_0: [
        createTexture('/Ziurke/0lvl/1_ejimas_1.png'),
        createTexture('/Ziurke/0lvl/1_ejimas_2.png')
      ],
      move_left_0: [
        createMirroredTexture('/Ziurke/0lvl/1_ejimas_1.png'),
        createMirroredTexture('/Ziurke/0lvl/1_ejimas_2.png')
      ],
      attack_0: [createTexture('/Ziurke/0lvl/1_ziurke_spjauna.png')],
      attack_left_0: [createMirroredTexture('/Ziurke/0lvl/1_ziurke_spjauna.png')],
      // 1lvl
      idle_1: [createTexture('/Ziurke/1lvl/2_ziurke_still.png')],
      idle_left_1: [createMirroredTexture('/Ziurke/1lvl/2_ziurke_still.png')],
      move_1: [
        createTexture('/Ziurke/1lvl/2_ejimas_1.png'),
        createTexture('/Ziurke/1lvl/2_ejimas_2.png')
      ],
      move_left_1: [
        createMirroredTexture('/Ziurke/1lvl/2_ejimas_1.png'),
        createMirroredTexture('/Ziurke/1lvl/2_ejimas_2.png')
      ],
      attack_1: [createTexture('/Ziurke/1lvl/2_ziurke_spjauna.png')],
      attack_left_1: [createMirroredTexture('/Ziurke/1lvl/2_ziurke_spjauna.png')],
      // 2lvl
      idle_2: [createTexture('/Ziurke/2lvl/3_ziurke_still.png')],
      idle_left_2: [createMirroredTexture('/Ziurke/2lvl/3_ziurke_still.png')],
      move_2: [
        createTexture('/Ziurke/2lvl/3_ejimas_1.png'),
        createTexture('/Ziurke/2lvl/3_ejimas_2.png')
      ],
      move_left_2: [
        createMirroredTexture('/Ziurke/2lvl/3_ejimas_1.png'),
        createMirroredTexture('/Ziurke/2lvl/3_ejimas_2.png')
      ],
      attack_2: [createTexture('/Ziurke/2lvl/3_ziurke_spjauna.png')],
      attack_left_2: [createMirroredTexture('/Ziurke/2lvl/3_ziurke_spjauna.png')],
      
      // Projectile textures for ranged attacks - use only one sprite with mirroring for left
      projectile_1: [createTexture('/Ziurke/atacks/projectile_toxic1.png')],
      projectile_3: [createTexture('/Ziurke/atacks/projectile_toxic3.png')]
    };

    // Set current level based on map
    this.currentLevel = this.getPetLevelForMap(this.mapId);
    
    // Calculate max distance based on level
    this.currentMaxDistance = this.baseMaxDistance * (1 + this.currentLevel);

    // Default to idle right for current level
    this.sprite = new PIXI.Sprite(this.animations[`idle_${this.currentLevel}`][0]);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = true;
    this.sprite.alpha = 1;

    // Scale based on map (different sizes for different maps) with high-quality scaling
    const petSize = this.getPetSizeForMap(this.mapId);
    const scale = petSize / 2790; // 2790 is original art width
    
    // Apply high-quality scaling for crisp pet rendering
    this.sprite.scale.set(scale);
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false; // Allow sub-pixel positioning for smooth movement

    this.sprite.position.set(this.position.x, this.position.y);
    this.sprite.zIndex = 999; // Just below main character (1000)

    // Don't add to stage here - let MapManager add it to the proper layer
    // this.app.stage.addChild(this.sprite);
    
    debugLog(`Pet: Initialized for map ${this.mapId} - Level: ${this.currentLevel}, Size: ${petSize}px, Scale: ${scale.toFixed(4)}`, 'pet');
  }

  setupInputListeners() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    // Pet controls - only WASD and spacebar, not teleport key 'T'
    switch (e.key.toLowerCase()) {
      case 'w':
        this.keys.up = true;
        debugLog('Pet: W key pressed (up)', 'pet');
        break;
      case 's':
        this.keys.down = true;
        debugLog('Pet: S key pressed (down)', 'pet');
        break;
      case 'a':
        this.keys.left = true;
        debugLog('Pet: A key pressed (left)', 'pet');
        break;
      case 'd':
        this.keys.right = true;
        debugLog('Pet: D key pressed (right)', 'pet');
        break;
      case ' ':
        e.preventDefault(); // Prevent default spacebar behavior
        if (!this.isAttacking) {
          this.performAttack();
        }
        break;
      default:
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.key.toLowerCase()) {
      case 'w':
        this.keys.up = false;
        debugLog('Pet: W key released (up)', 'pet');
        break;
      case 's':
        this.keys.down = false;
        debugLog('Pet: S key released (down)', 'pet');
        break;
      case 'a':
        this.keys.left = false;
        debugLog('Pet: A key released (left)', 'pet');
        break;
      case 'd':
        this.keys.right = false;
        debugLog('Pet: D key released (right)', 'pet');
        break;
      case ' ':
        this.keys.attack = false;
        break;
      default:
        break;
    }
  }

  // Handle attack based on pet level
  performAttack() {
    const now = Date.now();
    
    if (this.currentLevel === 0) {
      // Level 0: Melee attack only
      this.keys.attack = true;
      this.isAttacking = true;
      this.lastAttackTime = now;
      debugLog('Pet: Performing melee attack (Level 0)', 'pet');
    } else if (this.currentLevel === 1 || this.currentLevel === 2) {
      // Level 1 & 2: Check ranged attack cooldown
      const attackInterval = this.attackIntervals[this.currentLevel];
      
      if (this.canRangedAttack && (now - this.lastRangedAttackTime >= attackInterval)) {
        this.performRangedAttack();
        this.lastRangedAttackTime = now;
        this.canRangedAttack = false;
        
        // Reset cooldown after interval
        setTimeout(() => {
          this.canRangedAttack = true;
        }, attackInterval);
        
        debugLog(`Pet: Performing ranged attack (Level ${this.currentLevel}, Interval: ${attackInterval}ms)`, 'pet');
      } else {
        const remainingCooldown = attackInterval - (now - this.lastRangedAttackTime);
        debugLog(`Pet: Ranged attack on cooldown (${Math.max(0, remainingCooldown)}ms remaining)`, 'pet');
      }
    }
  }

  // Perform ranged attack (levels 1 and 2)
  performRangedAttack() {
    if (!this.sprite || !this.sprite.parent) return;
    
    if (this.hitRegDebugEnabled) {
      console.log(`[HIT-REG-DEBUG] Performing ranged attack:`, {
        petLevel: this.currentLevel,
        petPosition: { x: this.position.x.toFixed(1), y: this.position.y.toFixed(1) },
        petDirection: this.direction,
        attackTime: Date.now(),
        existingProjectiles: this.projectiles.length,
        canAttack: this.canRangedAttack
      });
    }
    
    // Set up pending projectile to spawn after attack animation
    this.pendingProjectile = {
      level: this.currentLevel,
      direction: this.direction
    };
    
    // Start attack animation - projectile will spawn when animation is shown
    this.keys.attack = true;
    this.isAttacking = true;
    this.lastAttackTime = Date.now();
  }

  // Spawn projectile from the front middle of the pet sprite
  spawnProjectileFromPet() {
    if (!this.sprite || !this.sprite.parent || !this.pendingProjectile) return;
    
    debugLog(`Attempting to spawn projectile - Pet position: (${this.position.x}, ${this.position.y}), Direction: ${this.pendingProjectile.direction}`, 'pet');
    
    if (this.hitRegDebugEnabled) {
      console.log(`[HIT-REG-DEBUG] Spawning projectile:`, {
        petPosition: { x: this.position.x.toFixed(1), y: this.position.y.toFixed(1) },
        petDirection: this.pendingProjectile.direction,
        projectileLevel: this.pendingProjectile.level,
        existingProjectileCount: this.projectiles.length
      });
    }
    
    // Calculate spawn position based on pet's world position and sprite size
    const petSize = this.getPetSizeForMap(this.mapId);
    const halfPetWidth = petSize * 0.5;
    const quarterPetHeight = petSize * 0.25;
    
    // Start projectile from bottom-front of the pet sprite (in world coordinates)
    let spawnX, spawnY;
    
    if (this.pendingProjectile.direction === 'left') {
      // Left direction: spawn from left edge (front) and bottom of pet
      spawnX = this.position.x - halfPetWidth; // Left edge of pet
      spawnY = this.position.y + quarterPetHeight; // Bottom area of pet
    } else {
      // Right direction: spawn from right edge (front) and bottom of pet
      spawnX = this.position.x + halfPetWidth; // Right edge of pet
      spawnY = this.position.y + quarterPetHeight; // Bottom area of pet
    }
    
    debugLog(`Projectile spawn position: (${spawnX.toFixed(1)}, ${spawnY.toFixed(1)}) - Pet world position: (${this.position.x}, ${this.position.y}), Pet size: ${petSize}px`, 'pet');
    
    if (this.hitRegDebugEnabled) {
      console.log(`[HIT-REG-DEBUG] Calculated spawn position:`, {
        spawnPosition: { x: spawnX.toFixed(1), y: spawnY.toFixed(1) },
        petSize: petSize,
        halfPetWidth: halfPetWidth,
        quarterPetHeight: quarterPetHeight,
        direction: this.pendingProjectile.direction
      });
    }
    
    // Create projectile at calculated position
    const projectile = new Projectile(
      this.app,
      spawnX,
      spawnY,
      this.pendingProjectile.direction,
      this.pendingProjectile.level,
      this.animations,
      this.hitRegDebugEnabled, // Pass debug state to projectile
      this.coordinateDebugEnabled // Pass coordinate debug state to projectile
    );
    
    // Add projectile sprite to the same container as pet
    this.sprite.parent.addChild(projectile.sprite);
    this.projectiles.push(projectile);
    
    debugLog(`Projectile created and added to container. Total projectiles: ${this.projectiles.length}`, 'pet');
    debugLog(`Projectile sprite visible: ${projectile.sprite.visible}, alpha: ${projectile.sprite.alpha}`, 'pet');
  }

  // Update all active projectiles
  updateProjectiles(delta) {
    // Update projectiles and remove inactive ones
    this.projectiles = this.projectiles.filter((projectile, index) => {
      const stillActive = projectile.update(delta);
      
      if (!stillActive && this.hitRegDebugEnabled) {
        console.log(`[HIT-REG-DEBUG] Projectile ${index} destroyed and filtered out. Remaining projectiles: ${this.projectiles.length - 1}`);
      }
      
      return stillActive;
    });
  }

  update = (delta) => {
    // Update projectiles first
    this.updateProjectiles(delta);
    
    // Handle attack animation
    if (this.isAttacking) {
      const now = Date.now();
      if (now - this.lastAttackTime < this.attackDuration) {
        // Show attack frame
        if (this.direction === 'left') {
          this.sprite.texture = this.animations[`attack_left_${this.currentLevel}`][0];
          // Ensure high-quality rendering for attack texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
          this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
        } else {
          this.sprite.texture = this.animations[`attack_${this.currentLevel}`][0];
          // Ensure high-quality rendering for attack texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
          this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
        }
        
        // Spawn projectile after attack animation frame is shown (and if we have a pending projectile)
        if (this.pendingProjectile && !this.projectileSpawned) {
          this.spawnProjectileFromPet();
          this.projectileSpawned = true; // Ensure we only spawn once per attack
        }
        
        return;
      } else {
        this.isAttacking = false;
        this.projectileSpawned = false; // Reset for next attack
        this.pendingProjectile = null; // Clear pending projectile
      }
    }

    // Track character movement for auto-follow logic
    this.updateCharacterMovementTracking();

    // Check auto-follow behavior first, before processing player input
    const playerControlling = this.keys.up || this.keys.down || this.keys.left || this.keys.right;
    
    // Stop auto-following if player takes control
    if (playerControlling && this.isAutoFollowing) {
      this.isAutoFollowing = false;
      debugLog('Pet auto-follow stopped: player took control', 'petAutoFollow');
    }
    
    if (this.character && !this.isAttacking && !playerControlling) {
      // Single unified follow check that handles both auto-follow and out-of-range scenarios
      const shouldFollow = this.shouldAutoFollowCharacter();
      
      debugLog(`Pet follow check: shouldFollow=${shouldFollow}, playerControlling=${playerControlling}, isAttacking=${this.isAttacking}`, 'petAutoFollow');
      
      if (shouldFollow) {
        debugLog(`Pet starting follow movement: speed=normal`, 'petAutoFollow');
        this.moveTowardsCharacter(delta);
        return; // Skip all other movement processing when following
      } else {
        debugLog(`Pet NOT following: no trigger conditions met`, 'petAutoFollow');
      }
    }

    // Movement - combine keyboard and controller input
    let dx = 0, dy = 0;
    
    // Keyboard input
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    
    // Debug keyboard input
    if (dx !== 0 || dy !== 0) {
      debugLog(`Pet: Keyboard input - dx: ${dx}, dy: ${dy}, keys: up=${this.keys.up}, down=${this.keys.down}, left=${this.keys.left}, right=${this.keys.right}`, 'pet');
    }
    
    // Controller input (left stick) - additive with keyboard
    const controllerMovement = this.applyControllerMovement();
    dx += controllerMovement.dx;
    dy += controllerMovement.dy;
    
    // Debug total movement
    if (dx !== 0 || dy !== 0) {
      debugLog(`Pet: Total movement - dx: ${dx.toFixed(3)}, dy: ${dy.toFixed(3)}, controller: dx=${controllerMovement.dx.toFixed(3)}, dy=${controllerMovement.dy.toFixed(3)}`, 'pet');
    }
    
    // Clamp combined input to -1 to 1 range
    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));
    
    // Normalize diagonal movement only if both inputs are at max
    if (Math.abs(dx) > 0.7 && Math.abs(dy) > 0.7) {
      dx *= 0.7071; // Math.sqrt(1/2)
      dy *= 0.7071;
    }

    this.velocity.x = dx * this.moveSpeed * delta;
    this.velocity.y = dy * this.moveSpeed * delta;

    // Apply slow zone system if moving away from character
    if (this.character && this.character.position && (dx !== 0 || dy !== 0)) {
      const currentDistance = Math.sqrt(
        Math.pow(this.position.x - this.character.position.x, 2) +
        Math.pow(this.position.y - this.character.position.y, 2)
      );
      
      // Calculate direction of movement relative to character
      const charToCurrentX = this.position.x - this.character.position.x;
      const charToCurrentY = this.position.y - this.character.position.y;
      const movementX = this.velocity.x;
      const movementY = this.velocity.y;
      
      // Dot product to determine if moving away from character
      const dotProduct = (charToCurrentX * movementX + charToCurrentY * movementY);
      const isMovingAwayFromCharacter = dotProduct > 0;
      
      // Apply slow zone only when moving away from character
      if (isMovingAwayFromCharacter) {
        const slowZoneThreshold = this.currentMaxDistance * 0.7; // 70% of max distance
        
        if (currentDistance > slowZoneThreshold) {
          // Calculate speed multiplier (1.0 at 70%, 0.0 at 100%)
          const slowZoneProgress = (currentDistance - slowZoneThreshold) / (this.currentMaxDistance - slowZoneThreshold);
          const speedMultiplier = Math.max(0, 1 - slowZoneProgress);
          
          // Apply speed reduction
          this.velocity.x *= speedMultiplier;
          this.velocity.y *= speedMultiplier;
          
          // Debug log slow zone effect (throttled)
          if (!this._lastSlowZoneLog || Date.now() - this._lastSlowZoneLog > 2000) {
            debugLog(`Pet slow zone: distance=${currentDistance.toFixed(1)}/${this.currentMaxDistance}, threshold=${slowZoneThreshold.toFixed(1)}, speedMultiplier=${speedMultiplier.toFixed(2)}`, 'pet');
            this._lastSlowZoneLog = Date.now();
          }
        }
      }
    }

    // Update direction
    if (dx < 0) this.direction = 'left';
    else if (dx > 0) this.direction = 'right';

    // Update position with proper boundary checking for each axis
    let newX = this.position.x + this.velocity.x;
    let newY = this.position.y + this.velocity.y;
    
    // Check if the pet would move out of allowed range from character
    if (this.character && this.character.position) {
      const futureDistance = Math.sqrt(
        Math.pow(newX - this.character.position.x, 2) +
        Math.pow(newY - this.character.position.y, 2)
      );
      
      // If the pet would move out of range, restrict movement
      if (futureDistance > this.currentMaxDistance) {
        // Calculate current distance to character
        const currentDistance = Math.sqrt(
          Math.pow(this.position.x - this.character.position.x, 2) +
          Math.pow(this.position.y - this.character.position.y, 2)
        );
        
        if (currentDistance < this.currentMaxDistance) {
          // Pet is within range but trying to move out - allow partial movement to edge
          const dx = newX - this.character.position.x;
          const dy = newY - this.character.position.y;
          const angle = Math.atan2(dy, dx);
          
          newX = this.character.position.x + Math.cos(angle) * this.currentMaxDistance;
          newY = this.character.position.y + Math.sin(angle) * this.currentMaxDistance;
        } else {
          // Pet is already at or beyond range - only allow movement that brings pet closer
          const charToCurrentX = this.position.x - this.character.position.x;
          const charToCurrentY = this.position.y - this.character.position.y;
          const charToNewX = newX - this.character.position.x;
          const charToNewY = newY - this.character.position.y;
          
          let xBlocked = false, yBlocked = false;
          
          // Check each axis separately - allow movement only if it reduces distance on that axis
          if (Math.abs(charToNewX) >= Math.abs(charToCurrentX)) {
            // X movement would move away from or stay same distance - revert X
            newX = this.position.x;
            xBlocked = true;
          }
          if (Math.abs(charToNewY) >= Math.abs(charToCurrentY)) {
            // Y movement would move away from or stay same distance - revert Y
            newY = this.position.y;
            yBlocked = true;
          }
          
          // Debug log when movement is blocked (throttled to avoid spam)
          if ((xBlocked || yBlocked) && (!this._lastRangeBlockLog || Date.now() - this._lastRangeBlockLog > 1000)) {
            debugLog(`Pet movement restricted - beyond range: X ${xBlocked ? 'blocked' : 'allowed'}, Y ${yBlocked ? 'blocked' : 'allowed'}, distance: ${currentDistance.toFixed(1)}/${this.currentMaxDistance}`, 'pet');
            this._lastRangeBlockLog = Date.now();
          }
        }
      }
    }
    
    // Check bounds independently for each axis to allow diagonal movement when possible
    
    // Map bounds check
    if (this.bounds) {
      newX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newX));
      newY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, newY));
    }
    
    // Camera viewport bounds check - handle each axis separately
    // Only log camera bounds check occasionally to avoid spam
    const now = Date.now();
    if (!this._lastCameraBoundsLog || now - this._lastCameraBoundsLog > 5000) {
      debugLog(`Pet: Camera bounds check (throttled logging)`, 'pet');
      this._lastCameraBoundsLog = now;
    }
    
    const cameraBounds = this.getCameraBounds();
    if (cameraBounds) {
      // Check X axis independently
      if (newX < cameraBounds.minX || newX > cameraBounds.maxX) {
        const oldX = newX;
        newX = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, newX));
        debugLog(`Pet X restricted: ${oldX.toFixed(1)} -> ${newX.toFixed(1)} (bounds: ${cameraBounds.minX.toFixed(1)} to ${cameraBounds.maxX.toFixed(1)})`, 'pet');
        debugLog(`Screen W: ${this.app.screen.width}, Camera X: ${this.camera.position.x.toFixed(1)}, Zoom: ${this.camera.zoom}`, 'pet');
      }
      
      // Check Y axis independently  
      if (newY < cameraBounds.minY || newY > cameraBounds.maxY) {
        const oldY = newY;
        newY = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, newY));
        debugLog(`Pet Y restricted: ${oldY.toFixed(1)} -> ${newY.toFixed(1)} (bounds: ${cameraBounds.minY.toFixed(1)} to ${cameraBounds.maxY.toFixed(1)})`, 'pet');
        debugLog(`Screen H: ${this.app.screen.height}, Camera Y: ${this.camera.position.y.toFixed(1)}, Zoom: ${this.camera.zoom}`, 'pet');
      }
    } else {
      debugLog(`Pet: Camera bounds could not be retrieved - pet movement will not be restricted to viewport`, 'pet');
    }
    
    this.position.x = newX;
    this.position.y = newY;
    this.sprite.position.set(this.position.x, this.position.y);

    // FINAL SAFETY NET: Always enforce max range as last step
    // This catches any edge cases where pet might end up outside range
    this.enforceMaxRangePosition();

    // Animation
    if (this.isAttacking) {
      // Already handled above
      return;
    } else if (dx !== 0 || dy !== 0) {
      // Moving
      const now = Date.now();
      if (!this.lastFrameTime || now - this.lastFrameTime > this.frameUpdateInterval) {
        this.lastFrameTime = now;
        this.frameIndices[this.direction] = (this.frameIndices[this.direction] + 1) % 2;
      }
      if (this.direction === 'left') {
        const leftMoveAnim = this.animations[`move_left_${this.currentLevel}`];
        if (leftMoveAnim && leftMoveAnim[this.frameIndices.left]) {
          this.sprite.texture = leftMoveAnim[this.frameIndices.left];
          // Ensure high-quality rendering for new texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        const rightMoveAnim = this.animations[`move_${this.currentLevel}`];
        if (rightMoveAnim && rightMoveAnim[this.frameIndices.right]) {
          this.sprite.texture = rightMoveAnim[this.frameIndices.right];
          // Ensure high-quality rendering for new texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    } else {
      // Idle
      if (this.direction === 'left') {
        const leftIdleAnim = this.animations[`idle_left_${this.currentLevel}`];
        if (leftIdleAnim && leftIdleAnim[0]) {
          this.sprite.texture = leftIdleAnim[0];
          // Ensure high-quality rendering for new texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        const rightIdleAnim = this.animations[`idle_${this.currentLevel}`];
        if (rightIdleAnim && rightIdleAnim[0]) {
          this.sprite.texture = rightIdleAnim[0];
          // Ensure high-quality rendering for new texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    }
  }

  // Set character reference for following behavior
  setCharacter(character) {
    this.character = character;
    debugLog('Pet: Character reference set for following behavior', 'pet');
  }

  // Set camera reference for viewport bounds checking
  setCamera(camera) {
    this.camera = camera;
    debugLog(`Pet: Camera reference set for viewport bounds. Camera object: ${camera ? 'Available' : 'NULL'}`, 'pet');
    if (camera) {
      debugLog(`Pet: Camera position: (${camera.position?.x || 'undefined'}, ${camera.position?.y || 'undefined'}), zoom: ${camera.zoom || 'undefined'}`, 'pet');
    } else {
      debugLog('Pet: WARNING - Camera reference is NULL!', 'pet');
    }
  }

  // Get the pet sprite for adding to containers
  getSprite() {
    return this.sprite;
  }

  // Calculate pet size based on current map
  getPetSizeForMap(mapId) {
    const characterSize = 164; // Base character size
    
    switch (mapId) {
      case 'maparea0':
        return characterSize * 0.25; // 2x larger - 1/4 of character size
      case 'maparea1':
        return characterSize * 0.5;  // 2x larger - 1/2 of character size  
      case 'maparea2':
      case 'mapareax':
        return characterSize * 1.0;  // 2x larger - same as character size
      default:
        return characterSize * 0.25;  // Default to smallest size
    }
  }

  // Calculate pet level based on map
  getPetLevelForMap(mapId) {
    switch (mapId) {
      case 'maparea0':
        return 0; // Smallest level
      case 'maparea1':
        return 1; // Medium level
      case 'maparea2':
      case 'mapareax':
        return 2; // Largest level
      default:
        return 0;
    }
  }

  // Update pet when map changes
  updateForMap(mapId) {
    this.mapId = mapId;
    this.currentLevel = this.getPetLevelForMap(mapId);
    
    // Clean up existing projectiles when changing maps
    this.projectiles.forEach(projectile => {
      projectile.destroy();
    });
    this.projectiles = [];
    
    // Reset attack cooldowns for new map
    this.canRangedAttack = true;
    this.lastRangedAttackTime = 0;
    this.pendingProjectile = null;
    this.projectileSpawned = false;
    
    // Update max distance based on level (100% more each level)
    this.currentMaxDistance = this.baseMaxDistance * (1 + this.currentLevel);
    
    // IMPORTANT: Check if pet is now out of range after map change and reposition if needed
    this.enforceMaxRangePosition();
    
    // Update sprite size with high-quality scaling
    const newSize = this.getPetSizeForMap(mapId);
    const scale = newSize / 2790; // 2790 is original art width
    this.sprite.scale.set(Math.abs(scale), Math.abs(scale));
    
    // Ensure high-quality rendering after resize
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false;
    
    // Preserve direction when updating scale
    if (this.direction === 'left') {
      this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
    }
    
    debugLog(`Pet: Updated for map ${mapId} - Level: ${this.currentLevel}, Size: ${newSize}px, Max Distance: ${this.currentMaxDistance}px`, 'pet');
  }

  // Set bounds for the pet (prevent it from going outside map)
  setBounds(bounds) {
    this.bounds = bounds;
    debugLog(`Pet bounds set: ${JSON.stringify(bounds)}`, 'pet');
  }

  // Enforce that pet is within max range of character - universal position enforcement
  enforceMaxRangePosition() {
    if (!this.character || !this.character.position) {
      debugLog('Pet enforceMaxRangePosition: No character reference', 'pet');
      return;
    }

    const currentDistance = Math.sqrt(
      Math.pow(this.position.x - this.character.position.x, 2) +
      Math.pow(this.position.y - this.character.position.y, 2)
    );

    if (currentDistance > this.currentMaxDistance) {
      // Pet is out of range - move it to the edge of max range in the same direction
      const angle = Math.atan2(
        this.position.y - this.character.position.y,
        this.position.x - this.character.position.x
      );
      
      const oldX = this.position.x;
      const oldY = this.position.y;
      
      this.position.x = this.character.position.x + Math.cos(angle) * this.currentMaxDistance;
      this.position.y = this.character.position.y + Math.sin(angle) * this.currentMaxDistance;
      this.sprite.position.set(this.position.x, this.position.y);
      
      debugLog(`Pet enforceMaxRangePosition: moved from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}) - was ${currentDistance.toFixed(1)}px from character, max allowed: ${this.currentMaxDistance}px`, 'pet');
    } else {
      debugLog(`Pet enforceMaxRangePosition: position OK - ${currentDistance.toFixed(1)}px from character, max allowed: ${this.currentMaxDistance}px`, 'pet');
    }
  }

  // Get current camera viewport bounds in world coordinates
  getCameraBounds() {
    if (!this.camera) {
      return null;
    }
    
    // Throttle debug logging to avoid spam
    const now = Date.now();
    const shouldLog = !this._lastBoundsLog || now - this._lastBoundsLog > 5000;
    
    if (shouldLog) {
      debugLog(`Pet: Camera reference exists. Position: (${this.camera.position?.x || 'undefined'}, ${this.camera.position?.y || 'undefined'})`, 'pet');
      debugLog(`Pet: Camera zoom: ${this.camera.zoom || 'undefined'}`, 'pet');
      debugLog(`Pet: Screen dimensions: ${this.app.screen.width}x${this.app.screen.height}`, 'pet');
      this._lastBoundsLog = now;
    }
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // The camera position represents the top-left corner of the viewport in world coordinates
    // But we need to account for zoom - the viewport size in world coordinates is screen size / zoom
    const viewportWidth = screenWidth / this.camera.zoom;
    const viewportHeight = screenHeight / this.camera.zoom;
    
    if (shouldLog) {
      debugLog(`Pet: Viewport size in world coordinates: ${viewportWidth.toFixed(1)}x${viewportHeight.toFixed(1)}`, 'pet');
    }
    
    // Camera position is already the top-left corner in world coordinates
    const viewportLeft = this.camera.position.x;
    const viewportTop = this.camera.position.y;
    const viewportRight = this.camera.position.x + viewportWidth;
    const viewportBottom = this.camera.position.y + viewportHeight;
    
    // Apply 5% margin from the edges
    const marginX = viewportWidth * 0.05;
    const marginY = viewportHeight * 0.05;
    
    const bounds = {
      minX: viewportLeft + marginX,
      minY: viewportTop + marginY,
      maxX: viewportRight - marginX,
      maxY: viewportBottom - marginY
    };
    
    if (shouldLog) {
      debugLog(`Pet: Calculated viewport bounds: (${bounds.minX.toFixed(1)}, ${bounds.minY.toFixed(1)}) to (${bounds.maxX.toFixed(1)}, ${bounds.maxY.toFixed(1)})`, 'pet');
    }
    
    return bounds;
  }

  // Check if pet should auto-follow (simplified logic)
  shouldAutoFollowCharacter() {
    if (!this.character || !this.character.position) {
      debugLog('Pet auto-follow check: No character reference', 'petAutoFollow');
      return false;
    }

    // Calculate current distance to character
    const currentDistance = Math.sqrt(
      Math.pow(this.position.x - this.character.position.x, 2) +
      Math.pow(this.position.y - this.character.position.y, 2)
    );

    // If already auto-following, continue until we reach the character (no interruptions)
    if (this.isAutoFollowing) {
      debugLog(`Pet auto-follow active: distance=${currentDistance.toFixed(1)}, stop threshold=5px`, 'petAutoFollow');

      // Stop auto-following only when we get close to the character (within 5px)
      if (currentDistance <= 5) {
        this.isAutoFollowing = false;
        debugLog(`Pet auto-follow completed: reached character at distance ${currentDistance.toFixed(1)}`, 'petAutoFollow');
        return false;
      }

      return true; // Continue auto-following until we reach the character
    }

    // Only allow auto-follow if pet is within reasonable range (max 150% of max distance)
    // This prevents auto-follow from triggering when pet is teleported or glitched far away
    const maxReasonableDistance = this.currentMaxDistance * 1.5;
    if (currentDistance > maxReasonableDistance) {
      debugLog(`Pet auto-follow blocked: too far away (${currentDistance.toFixed(1)} > ${maxReasonableDistance.toFixed(1)})`, 'petAutoFollow');
      return false;
    }

    // Start auto-follow immediately if pet hits max range (95% or more)
    // No need to wait for character movement - if pet is at edge, it should follow back
    const triggerThreshold = this.currentMaxDistance * 0.95;
    const atMaxRange = currentDistance >= triggerThreshold;
    const rangePercentage = (currentDistance / this.currentMaxDistance * 100).toFixed(1);

    debugLog(`Pet follow check: distance=${currentDistance.toFixed(1)}/${this.currentMaxDistance} (${rangePercentage}%), at max range=${atMaxRange}, character moving=${this.characterIsMoving}`, 'petAutoFollow');

    if (atMaxRange) {
      this.isAutoFollowing = true;
      debugLog(`Pet auto-follow started: distance=${currentDistance.toFixed(1)}/${this.currentMaxDistance}, hit max range trigger`, 'petAutoFollow');
      return true;
    }

    return false;
  }

  // Move pet towards character when out of range or during auto-follow
  moveTowardsCharacter(delta) {
    if (!this.character || !this.character.position) {
      debugLog('Pet moveTowardsCharacter: No character reference', 'petAutoFollow');
      return;
    }
    
    const dx = this.character.position.x - this.position.x;
    const dy = this.character.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    debugLog(`Pet moveTowardsCharacter: distance=${distance.toFixed(1)}, auto-following=${this.isAutoFollowing}, delta=${delta.toFixed(3)}`, 'petAutoFollow');
    
    if (distance > 0) {
      // Normalize direction and apply speed
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      // Use normal speed for auto-follow to prevent teleporting
      const followSpeed = this.moveSpeed * (this.isAutoFollowing ? 1 : 1); // Same speed for both cases
      
      debugLog(`Pet moveTowardsCharacter: direction=(${normalizedDx.toFixed(3)}, ${normalizedDy.toFixed(3)}), speed=${followSpeed.toFixed(1)} (base=${this.moveSpeed})`, 'petAutoFollow');
      
      // Move towards character
      const oldX = this.position.x;
      const oldY = this.position.y;
      this.position.x += normalizedDx * followSpeed * delta;
      this.position.y += normalizedDy * followSpeed * delta;
      
      debugLog(`Pet moveTowardsCharacter: moved from (${oldX.toFixed(1)}, ${oldY.toFixed(1)}) to (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`, 'petAutoFollow');
      
      // IMPORTANT: Enforce max range BEFORE camera bounds to prevent camera pushing pet too far
      const newDistance = Math.sqrt(
        Math.pow(this.position.x - this.character.position.x, 2) +
        Math.pow(this.position.y - this.character.position.y, 2)
      );
      
      if (newDistance > this.currentMaxDistance) {
        // Even during follow, don't go beyond max range
        const angle = Math.atan2(
          this.position.y - this.character.position.y,
          this.position.x - this.character.position.x
        );
        this.position.x = this.character.position.x + Math.cos(angle) * this.currentMaxDistance;
        this.position.y = this.character.position.y + Math.sin(angle) * this.currentMaxDistance;
        debugLog(`Pet moveTowardsCharacter: enforced max range - clamped to ${this.currentMaxDistance}px from character`, 'petAutoFollow');
      }
      
      // Only apply camera bounds if they don't push pet outside character range
      const cameraBounds = this.getCameraBounds();
      if (cameraBounds) {
        const clampedX = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, this.position.x));
        const clampedY = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, this.position.y));
        
        // Check if camera clamping would put pet outside character range
        const clampedDistance = Math.sqrt(
          Math.pow(clampedX - this.character.position.x, 2) +
          Math.pow(clampedY - this.character.position.y, 2)
        );
        
        if (clampedDistance <= this.currentMaxDistance && (clampedX !== this.position.x || clampedY !== this.position.y)) {
          debugLog(`Pet moveTowardsCharacter: clamped by camera bounds from (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}) to (${clampedX.toFixed(1)}, ${clampedY.toFixed(1)})`, 'petAutoFollow');
          this.position.x = clampedX;
          this.position.y = clampedY;
        } else if (clampedDistance > this.currentMaxDistance) {
          debugLog(`Pet moveTowardsCharacter: camera bounds ignored - would push pet outside character range (${clampedDistance.toFixed(1)} > ${this.currentMaxDistance})`, 'petAutoFollow');
        }
      } else {
        debugLog('Pet moveTowardsCharacter: No camera bounds available', 'petAutoFollow');
      }
      
      this.sprite.position.set(this.position.x, this.position.y);
      
      // Update direction based on movement
      if (normalizedDx < 0) {
        this.direction = 'left';
      } else if (normalizedDx > 0) {
        this.direction = 'right';
      }
      
      // Update animation while following
      const now = Date.now();
      if (!this.lastFrameTime || now - this.lastFrameTime > this.frameUpdateInterval) {
        this.lastFrameTime = now;
        this.frameIndices[this.direction] = (this.frameIndices[this.direction] + 1) % 2;
      }
      
      if (this.direction === 'left') {
        this.sprite.texture = this.animations[`move_left_${this.currentLevel}`][this.frameIndices.left];
        // Ensure high-quality rendering for following texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        this.sprite.texture = this.animations[`move_${this.currentLevel}`][this.frameIndices.right];
        // Ensure high-quality rendering for following texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    }
  }

  // Controller movement support - smooth analog input
  setControllerMovement(dx, dy) {
    this.controllerInput = { dx, dy };
  }

  // Apply controller input to movement (in addition to keyboard)
  applyControllerMovement() {
    if (this.controllerInput) {
      const { dx, dy } = this.controllerInput;
      
      // Apply deadzone and get normalized movement
      const deadzone = 0.15;
      let controllerDx = 0, controllerDy = 0;
      
      if (Math.abs(dx) > deadzone) {
        controllerDx = dx;
      }
      if (Math.abs(dy) > deadzone) {
        controllerDy = dy;
      }
      
      return { dx: controllerDx, dy: controllerDy };
    }
    return { dx: 0, dy: 0 };
  }

  // Track character movement for intelligent auto-follow behavior
  updateCharacterMovementTracking() {
    if (!this.character || !this.character.position) {
      this.characterIsMoving = false;
      debugLog('Character movement tracking: No character reference', 'petAutoFollow');
      return;
    }

    const currentCharPos = { x: this.character.position.x, y: this.character.position.y };
    
    // Initialize tracking on first update
    if (!this.lastCharacterPosition) {
      this.lastCharacterPosition = { ...currentCharPos };
      this.characterIsMoving = false;
      debugLog(`Character movement tracking initialized at (${currentCharPos.x.toFixed(1)}, ${currentCharPos.y.toFixed(1)})`, 'petAutoFollow');
      return;
    }

    // Calculate character movement since last frame
    const charMovementX = currentCharPos.x - this.lastCharacterPosition.x;
    const charMovementY = currentCharPos.y - this.lastCharacterPosition.y;
    const charMovementDistance = Math.sqrt(charMovementX * charMovementX + charMovementY * charMovementY);

    // Check if character moved significantly
    const wasMoving = this.characterIsMoving;
    this.characterIsMoving = charMovementDistance > this.characterMovementThreshold;

    // Log movement state changes
    if (wasMoving !== this.characterIsMoving) {
      debugLog(`Character movement state changed: ${wasMoving ? 'moving' : 'stopped'} → ${this.characterIsMoving ? 'moving' : 'stopped'} (distance=${charMovementDistance.toFixed(3)}, threshold=${this.characterMovementThreshold})`, 'petAutoFollow');
    }

    // Log detailed movement every few frames when debugging
    if (Date.now() % 500 < 16) { // Log roughly every 500ms
      debugLog(`Character movement: distance=${charMovementDistance.toFixed(3)}, threshold=${this.characterMovementThreshold}, moving=${this.characterIsMoving}, pos=(${currentCharPos.x.toFixed(1)}, ${currentCharPos.y.toFixed(1)})`, 'petAutoFollow');
    }

    // Update last position for next frame
    this.lastCharacterPosition = { ...currentCharPos };
  }
  
  setHitRegDebugEnabled(enabled) {
    console.log(`[HIT-REG-DEBUG] Pet.setHitRegDebugEnabled called with: ${enabled}`);
    this.hitRegDebugEnabled = enabled;
    
    // Update all existing projectiles
    if (this.projectiles && this.projectiles.length > 0) {
      this.projectiles.forEach(projectile => {
        projectile.hitRegDebugEnabled = enabled;
      });
      console.log(`[HIT-REG-DEBUG] Updated ${this.projectiles.length} existing projectiles with debug state: ${enabled}`);
    }
    
    if (enabled) {
      console.log(`[HIT-REG-DEBUG] Hit registration debugging enabled for pet and ${this.projectiles ? this.projectiles.length : 0} projectiles`);
    } else {
      console.log(`[HIT-REG-DEBUG] Hit registration debugging disabled for pet`);
    }
  }
  
  setCoordinateDebugEnabled(enabled) {
    console.log(`[COORD-DEBUG] Pet.setCoordinateDebugEnabled called with: ${enabled}`);
    this.coordinateDebugEnabled = enabled;
    
    // Update all existing projectiles
    if (this.projectiles && this.projectiles.length > 0) {
      this.projectiles.forEach(projectile => {
        projectile.coordinateDebugEnabled = enabled;
      });
      console.log(`[COORD-DEBUG] Updated ${this.projectiles.length} existing projectiles with coordinate debug state: ${enabled}`);
    }
    
    if (enabled) {
      console.log(`[COORD-DEBUG] Coordinate space debugging enabled for pet and ${this.projectiles ? this.projectiles.length : 0} projectiles`);
    } else {
      console.log(`[COORD-DEBUG] Coordinate space debugging disabled for pet`);
    }
  }

  destroy() {
    // Safe ticker cleanup
    try {
      if (this.app && this.app.ticker && typeof this.app.ticker.remove === 'function') {
        this.app.ticker.remove(this.update, this);
      }
    } catch (error) {
      console.warn('Error removing pet from ticker:', error);
    }
    
    // Safe event listener cleanup
    try {
      window.removeEventListener('keydown', this.handleKeyDown);
      window.removeEventListener('keyup', this.handleKeyUp);
    } catch (error) {
      console.warn('Error removing pet event listeners:', error);
    }
    
    // Clean up all projectiles safely
    if (this.projectiles && this.projectiles.length > 0) {
      this.projectiles.forEach(projectile => {
        try {
          if (projectile && typeof projectile.destroy === 'function') {
            projectile.destroy();
          }
        } catch (error) {
          console.warn('Error destroying pet projectile:', error);
        }
      });
    }
    this.projectiles = [];
    
    // Safe sprite cleanup
    if (this.sprite) {
      try {
        if (this.sprite.parent && typeof this.sprite.parent.removeChild === 'function') {
          this.sprite.parent.removeChild(this.sprite);
        }
        if (typeof this.sprite.destroy === 'function') {
          this.sprite.destroy();
        }
      } catch (error) {
        console.warn('Error destroying pet sprite:', error);
      }
    }
  }
}