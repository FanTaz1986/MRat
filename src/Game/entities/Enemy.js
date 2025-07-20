import * as PIXI from 'pixi.js';

/**
 * Enemy class for managing slimes and other enemies
 */
export default class Enemy {
  constructor(app, type = 'red', x = 100, y = 100, hp = 1) {
    this.app = app;
    this.type = type; // 'red' or 'blue'
    this.position = { x, y };
    
    // Debug properties
    this.spawnDebugEnabled = false; // Will be set by EnemyManager
    
    this.state = 'idle'; // 'idle', 'move', 'attack'
    this.direction = 'right'; // 'left', 'right', 'up', 'down'
    
    // Speed based on type: red = same as character (4), blue = 25% slower (3)
    this.speed = type === 'red' ? 4 : 3; // Red: same as character speed, Blue: 25% slower
    
    // HP system
    this.maxHP = hp;
    this.currentHP = hp;
    this.baseScale = 1.0; // Base scale for 1HP slime
    this.scalePerHP = 0.15; // 15% bigger per HP point
    // Scale is based on CURRENT HP: 1HP=1.0x, 2HP=1.15x, 3HP=1.30x, etc.
    this.currentScale = this.baseScale + (this.currentHP - 1) * this.scalePerHP;
    
    this.health = 100; // Legacy health system (kept for compatibility)
    this.maxHealth = 100;
    this.isAlive = true;
    this.isPlayerControlled = false;
    
    // Animation properties
    this.animations = {};
    this.sprite = null;
    this.container = null;
    this.frameIndex = 0;
    this.frameUpdateInterval = 300; // 300ms between frame updates (was 100ms)
    this.lastFrameUpdate = 0;
    
    // Attack animation properties
    this.attackStartTime = 0;
    this.attackDuration = 1000; // 1000ms (1 second) attack duration
    this.isAttacking = false;
    this.attackCooldownStart = 0;
    this.attackCooldownDuration = 2000; // 2000ms (2 seconds) cooldown
    
    // Movement properties
    this.velocity = { x: 0, y: 0 };
    this.targetPosition = null;
    this.moveStartTime = 0;
    this.moveDuration = 1000; // ms for idle movement
    
    // Hit stun properties
    this.isHitStunned = false;
    this.hitStunStartTime = 0;
    this.hitStunDuration = 1000; // 1 second hit stun
    this.isScaling = false;
    this.scaleTransitionStartTime = 0;
    this.scaleTransitionDuration = 300; // 300ms scale transition
    this.previousScale = this.currentScale;
    this.targetScale = this.currentScale;
    
    // Debug properties
    this.debugEnabled = false;
    this.attackDebugEnabled = false;
    this.hitRegDebugEnabled = false;
    
    // Note: Constructor logging removed to prevent spam. 
    // Enable 'Spawn Debug' checkbox to see detailed creation logs.
    // Note: init() will be called separately by EnemyManager
  }
  
  async init() {
    try {
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-INIT] 🔧 Step D1: Starting Enemy init() method`);
        console.log(`[ENEMY-CONSTRUCTOR] Creating ${this.type} slime at coordinates (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)}) with ${this.currentHP}HP`);
        console.log(`[ENEMY-INIT] 🔧 Step D2: About to load textures...`);
      }
      
      await this.loadTextures();
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-INIT] ✅ Step D3: Textures loaded successfully`);
        console.log(`[ENEMY-INIT] 🔧 Step D4: About to create sprite...`);
      }
      
      this.createSprite();
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-INIT] ✅ Step D5: Sprite created successfully`);
        console.log(`[ENEMY-INIT] 🔧 Step D6: About to set state to idle...`);
      }
      
      this.setState('idle');
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-INIT] ✅ Step D7: State set to idle successfully`);
      }
      
      if (this.debugEnabled) {
        // Calculate world coordinates by adding camera offset with enhanced null checking
        let cameraX = 0, cameraY = 0;
        
        try {
          const camera = window.globalCamera || { x: 0, y: 0 };
          if (camera && typeof camera === 'object') {
            if (camera.position && typeof camera.position === 'object') {
              cameraX = camera.position.x || 0;
              cameraY = camera.position.y || 0;
            } else if (typeof camera.x !== 'undefined' && typeof camera.y !== 'undefined') {
              cameraX = camera.x || 0;
              cameraY = camera.y || 0;
            }
          }
        } catch (error) {
          console.warn(`[ENEMY-INIT] ⚠️ Error accessing camera position, using default:`, error);
          cameraX = 0;
          cameraY = 0;
        }
        
        const worldX = this.position.x + cameraX;
        const worldY = this.position.y + cameraY;
        console.log(`Enemy ${this.type} slime created at screen:(${this.position.x}, ${this.position.y}) world:(${worldX}, ${worldY}) HP:${this.currentHP}/${this.maxHP} scale:${this.currentScale.toFixed(2)}`);
        
        // Only log container position if container exists (it's created later in createSprite)
        if (this.container && this.container.position) {
          console.log(`[ENEMY-INIT] Final position check - this.position: (${this.position.x}, ${this.position.y}), container.position: (${this.container.position.x}, ${this.container.position.y})`);
        } else {
          console.log(`[ENEMY-INIT] Final position check - this.position: (${this.position.x}, ${this.position.y}), container: not yet created`);
        }
      }
    } catch (error) {
      console.error('Failed to initialize enemy:', error);
    }
  }
  
  async loadTextures() {
    // DEV SERVER FIX: Use preloaded textures from App.js asset manifest
    // This ensures textures are always available regardless of loading timing
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-TEXTURE] Loading textures for ${this.type} slime using preloaded assets...`);
    }
    
    // Map to preloaded asset names from App.js
    const preloadedAssetNames = {
      red: {
        idle: 'red_slime_idle',
        move: 'red_slime_move', 
        attack: 'red_slime_attack'
      },
      blue: {
        idle: 'blue_slime_idle',
        move: 'blue_slime_move',
        attack: 'blue_slime_attack'
      }
    };
    
    const typeAssets = preloadedAssetNames[this.type];
    
    if (!typeAssets) {
      console.error(`[ENEMY-TEXTURE] ❌ Unknown enemy type: ${this.type}`);
      return;
    }
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-TEXTURE] Looking for preloaded assets:`, typeAssets);
    }
    
    // Load textures from preloaded cache
    for (const [state, assetName] of Object.entries(typeAssets)) {
      let texture = null;
      
      try {
        // First try to get from PIXI Assets cache
        if (PIXI.Assets.cache.has(assetName)) {
          texture = PIXI.Assets.cache.get(assetName);
          
          if (texture && texture.baseTexture && texture.baseTexture.valid) {
            this.animations[state] = texture;
            if (this.debugEnabled) {
              console.log(`[ENEMY-TEXTURE] ✅ Found preloaded ${state} texture: ${assetName}`);
            }
            continue;
          }
        }
        
        // If not in cache, try loading the original file path as fallback
        const fallbackPaths = {
          red: {
            idle: '/1MAP/Enemies/Red_slime_idle.png.png',  // Note: double .png extension
            move: '/1MAP/Enemies/Red_slime_move.png',      
            attack: '/1MAP/Enemies/Red_slime_attack.png'
          },
          blue: {
            idle: '/1MAP/Enemies/Blue_slime_idle.png',
            move: '/1MAP/Enemies/Blue_slime_move.png',
            attack: '/1MAP/Enemies/Blue_slime_attack.png'
          }
        };
        
        const fallbackPath = fallbackPaths[this.type][state];
        if (fallbackPath) {
          if (this.debugEnabled) {
            console.log(`[ENEMY-TEXTURE] ⚠️ Asset '${assetName}' not preloaded, trying fallback: ${fallbackPath}`);
          }
          
          // Add to cache and load
          const fullPath = process.env.PUBLIC_URL + fallbackPath;
          if (!PIXI.Assets.cache.has(fallbackPath)) {
            PIXI.Assets.add({ alias: fallbackPath, src: fullPath });
          }
          
          texture = await PIXI.Assets.load(fallbackPath);
          
          if (texture && texture.baseTexture && texture.baseTexture.valid) {
            this.animations[state] = texture;
            if (this.debugEnabled) {
              console.log(`[ENEMY-TEXTURE] ✅ Loaded fallback ${state} texture: ${fallbackPath}`);
            }
            continue;
          }
        }
        
        // If still no texture, create procedural fallback
        if (this.debugEnabled) {
          console.warn(`[ENEMY-TEXTURE] 🎨 Creating procedural fallback for ${state} (${this.type} slime)`);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Draw a simple slime shape as fallback
          const color = this.type === 'red' ? '#ff6666' : '#6666ff';
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(16, 20, 12, 0, Math.PI * 2);
          ctx.fill();
          
          // Add simple eyes
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(12, 16, 3, 0, Math.PI * 2);
          ctx.arc(20, 16, 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Add pupils
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(12, 16, 1, 0, Math.PI * 2);
          ctx.arc(20, 16, 1, 0, Math.PI * 2);
          ctx.fill();
          
          // Add state indicator
          if (state === 'attack') {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(8, 8);
            ctx.lineTo(24, 24);
            ctx.moveTo(24, 8);
            ctx.lineTo(8, 24);
            ctx.stroke();
          }
        }
        
        texture = PIXI.Texture.from(canvas);
        this.animations[state] = texture;
        
        if (this.debugEnabled) {
          console.log(`[ENEMY-TEXTURE] ✅ Procedural fallback created for ${state}`);
        }
        
      } catch (error) {
        console.error(`[ENEMY-TEXTURE] ❌ Failed to load ${state} texture:`, error);
        
        // Create a simple white square as ultimate fallback
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = this.type === 'red' ? '#ff0000' : '#0000ff';
          ctx.fillRect(0, 0, 16, 16);
        }
        
        this.animations[state] = PIXI.Texture.from(canvas);
        if (this.debugEnabled) {
          console.log(`[ENEMY-TEXTURE] ✅ Ultimate fallback created for ${state}`);
        }
      }
    }
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-TEXTURE] Final animations object for ${this.type} slime:`, {
        animationsKeys: Object.keys(this.animations),
        animationsValid: Object.entries(this.animations).map(([key, tex]) => ({
          state: key,
          hasTexture: !!tex,
          width: tex?.width,
          height: tex?.height,
          textureSource: tex?.source?.resource?.src || tex?.baseTexture?.resource?.src,
          textureName: tex?.source?.resource?.src?.split('/').pop() || tex?.baseTexture?.resource?.src?.split('/').pop()
        }))
      });
    }
  }
  
  createSprite() {
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-SPRITE] Creating sprite for ${this.type} slime with animations:`, {
        hasIdleTexture: !!this.animations.idle,
        hasMoveTexture: !!this.animations.move,
        hasAttackTexture: !!this.animations.attack,
        idleTextureInfo: this.animations.idle ? {
          width: this.animations.idle.width,
          height: this.animations.idle.height,
          valid: this.animations.idle.valid
        } : null
      });
    }
    
    // Create container for the enemy
    this.container = new PIXI.Container();
    this.container.position.set(this.position.x, this.position.y);
    
    if (this.spawnDebugEnabled) {
      console.log(`[ENEMY-SPRITE] Container created at position: (${this.position.x}, ${this.position.y})`);
      console.log(`[ENEMY-SPRITE] Container.position set to: (${this.container.position.x}, ${this.container.position.y})`);
    }
    
    // Create sprite
    if (this.animations.idle) {
      this.sprite = new PIXI.Sprite(this.animations.idle);
      this.sprite.anchor.set(0.5, 0.5);
      
      // Apply pixel-perfect sizing instead of scale calculations
      this.applyPixelPerfectSize();
      
      // Ensure sprite is visible
      this.sprite.alpha = 1.0;
      this.sprite.visible = true;
      
      this.container.addChild(this.sprite);
      
      // Set reasonable z-index
      this.container.zIndex = 100;
      this.sprite.zIndex = 2;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-SPRITE] ✅ Sprite created successfully:`, {
          spriteExists: !!this.sprite,
          spriteVisible: this.sprite.visible,
          spriteAlpha: this.sprite.alpha,
          spritePosition: { x: this.sprite.x, y: this.sprite.y },
          spriteScale: { x: this.sprite.scale.x, y: this.sprite.scale.y },
          spriteSize: { width: this.sprite.width, height: this.sprite.height },
          spriteAnchor: { x: this.sprite.anchor.x, y: this.sprite.anchor.y },
          containerPosition: { x: this.container.x, y: this.container.y },
          containerVisible: this.container.visible,
          containerAlpha: this.container.alpha,
          containerChildren: this.container.children.length,
          textureSource: this.sprite.texture?.source?.resource?.src,
          hpInfo: { 
            maxHP: this.maxHP, 
            currentHP: this.currentHP, 
            hpScale: this.currentScale,
            pixelSize: { width: this.sprite.width, height: this.sprite.height }
          },
          textureSize: { width: this.sprite.texture.width, height: this.sprite.texture.height }
        });
      }
      
      // DEV SERVER FIX: Add post-creation visibility verification
      // This helps ensure enemies are actually rendered during development server hot-reload
      setTimeout(() => {
        this.verifyVisibility();
      }, 10); // Reduced from 100ms to 10ms for faster enemy loading
      
    } else {
      console.error(`[ENEMY-SPRITE] ❌ No idle texture available for ${this.type} slime - cannot create sprite`);
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-SPRITE] Available animations:`, Object.keys(this.animations));
        console.log(`[ENEMY-SPRITE] Animation details:`, this.animations);
      }
    }
  }
  
  // DEV SERVER FIX: Add visibility verification method
  verifyVisibility() {
    if (!this.sprite || !this.container) {
      if (this.spawnDebugEnabled) {
        console.warn(`[ENEMY-VISIBILITY] ⚠️ Sprite or container missing during visibility check`);
      }
      return;
    }
    
    const isVisible = this.sprite.visible && this.container.visible && 
                     this.sprite.alpha > 0 && this.container.alpha > 0 &&
                     this.sprite.scale.x > 0 && this.sprite.scale.y > 0;
    
    if (this.spawnDebugEnabled || this.coordinateDebugEnabled) {
      console.log(`[ENEMY-VISIBILITY] Visibility check for ${this.type} slime:`, {
        spriteVisible: this.sprite.visible,
        containerVisible: this.container.visible,
        spriteAlpha: this.sprite.alpha,
        containerAlpha: this.container.alpha,
        spriteScale: { x: this.sprite.scale.x, y: this.sprite.scale.y },
        spriteSize: { width: this.sprite.width, height: this.sprite.height },
        position: { x: this.position.x, y: this.position.y },
        containerPosition: { x: this.container.x, y: this.container.y },
        parentContainer: this.container.parent?.constructor?.name || 'none',
        isVisible: isVisible,
        textureValid: this.sprite.texture?.valid,
        inDisplayList: this.container.parent !== null
      });
    }
    
    // If not visible, try to fix common issues
    if (!isVisible) {
      if (this.spawnDebugEnabled) {
        console.warn(`[ENEMY-VISIBILITY] 🔧 Enemy not visible, attempting fixes...`);
      }
      
      // Ensure visibility flags are set
      if (!this.sprite.visible) {
        this.sprite.visible = true;
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-VISIBILITY] ✅ Fixed: sprite.visible set to true`);
        }
      }
      
      if (!this.container.visible) {
        this.container.visible = true;
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-VISIBILITY] ✅ Fixed: container.visible set to true`);
        }
      }
      
      // Ensure alpha values are correct
      if (this.sprite.alpha <= 0) {
        this.sprite.alpha = 1.0;
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-VISIBILITY] ✅ Fixed: sprite.alpha set to 1.0`);
        }
      }
      
      if (this.container.alpha <= 0) {
        this.container.alpha = 1.0;
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-VISIBILITY] ✅ Fixed: container.alpha set to 1.0`);
        }
      }
      
      // Ensure scale is reasonable
      if (this.sprite.scale.x <= 0 || this.sprite.scale.y <= 0) {
        const screenWidth = 1536;
        const baseTargetWidth = 64;
        const targetScreenPercent = 0.0025; // 0.25% of screen width for smaller pet-like size
        const baseScale = (screenWidth * targetScreenPercent) / baseTargetWidth;
        const finalScale = baseScale * this.currentScale;
        
        this.sprite.scale.set(finalScale, finalScale);
        if (this.spawnDebugEnabled) {
          console.log(`[ENEMY-VISIBILITY] ✅ Fixed: sprite scale set to ${finalScale.toFixed(3)}`);
        }
      }
      
      // Force a re-render by updating the texture
      if (this.sprite.texture && !this.sprite.texture.valid) {
        if (this.animations.idle && this.animations.idle.valid) {
          this.sprite.texture = this.animations.idle;
          if (this.spawnDebugEnabled) {
            console.log(`[ENEMY-VISIBILITY] ✅ Fixed: sprite texture refreshed`);
          }
        }
      }
      
      // Final verification
      const isNowVisible = this.sprite.visible && this.container.visible && 
                          this.sprite.alpha > 0 && this.container.alpha > 0 &&
                          this.sprite.scale.x > 0 && this.sprite.scale.y > 0;
      
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-VISIBILITY] Post-fix visibility: ${isNowVisible ? '✅ VISIBLE' : '❌ STILL NOT VISIBLE'}`);
      }
    } else {
      if (this.spawnDebugEnabled) {
        console.log(`[ENEMY-VISIBILITY] ✅ Enemy is properly visible`);
      }
    }
  }

  setState(newState) {
    if (this.state === newState) return;
    
    const oldState = this.state;
    
    // Debug log potential attack interruptions
    if (this.isAttacking && oldState === 'attack' && newState !== 'attack') {
      if (this.attackDebugEnabled) {
        console.warn(`[ATTACK-DEBUG] ${this.type} slime attack INTERRUPTED:`, {
          oldState,
          newState,
          attackElapsed: `${Date.now() - this.attackStartTime}ms`,
          expectedDuration: `${this.attackDuration}ms`,
          wasPlayerControlled: this.isPlayerControlled,
          timestamp: new Date().toLocaleTimeString(),
          stackTrace: new Error().stack
        });
      }
    }
    
    this.state = newState;
    this.frameIndex = 0;
    this.lastFrameUpdate = Date.now();
    
    // Handle attack state initialization
    if (newState === 'attack') {
      this.isAttacking = true;
      this.attackStartTime = Date.now();
      
      // Stop all movement when attacking
      this.velocity.x = 0;
      this.velocity.y = 0;
      
      if (this.attackDebugEnabled) {
        console.log(`[ATTACK-DEBUG] ${this.type} slime attack STARTED:`, {
          attackDuration: `${this.attackDuration}ms`,
          attackCooldown: `${this.attackCooldownDuration}ms`,
          startTime: this.attackStartTime,
          expectedEndTime: this.attackStartTime + this.attackDuration,
          currentTexture: this.getTextureName(this.sprite?.texture),
          targetTexture: 'Red_slime_attack.png or Blue_slime_attack.png',
          velocityStopped: 'yes',
          timestamp: new Date().toLocaleTimeString()
        });
      }
      
      if (this.debugEnabled) {
        console.log(`Enemy ${this.type} starting attack for ${this.attackDuration}ms`);
      }
    } else {
      this.isAttacking = false;
    }
    
    // Only set initial texture when state changes, updateAnimation() will handle frame cycling
    if (this.sprite && this.animations[newState] && this.animations[newState].valid) {
      const oldTexture = this.sprite.texture;
      this.sprite.texture = this.animations[newState];
      
      if (this.debugEnabled) {
        console.log(`Enemy ${this.type} state changed: ${oldState} → ${newState}`, {
          oldTextureName: this.getTextureName(oldTexture),
          newTextureName: this.getTextureName(this.sprite.texture),
          textureChanged: oldTexture !== this.sprite.texture,
          availableAnimations: Object.keys(this.animations),
          spriteVisible: this.sprite.visible,
          spriteAlpha: this.sprite.alpha,
          isAttacking: this.isAttacking
        });
      }
    } else {
      if (this.debugEnabled) {
        console.error(`Enemy ${this.type} cannot change to state ${newState}:`, {
          hasSprite: !!this.sprite,
          hasAnimation: !!this.animations[newState],
          availableAnimations: Object.keys(this.animations)
        });
      }
    }
  }
  
  update(deltaTime) {
    if (!this.isAlive) return;
    
    // Handle hit stun timing
    if (this.isHitStunned) {
      const hitStunElapsed = Date.now() - this.hitStunStartTime;
      if (hitStunElapsed >= this.hitStunDuration) {
        this.isHitStunned = false;
        if (this.debugEnabled) {
          console.log(`Enemy ${this.type} hit stun ended after ${hitStunElapsed}ms`);
        }
      } else {
        // Keep velocity at zero during hit stun
        this.velocity.x = 0;
        this.velocity.y = 0;
      }
    }
    
    // Handle smooth scale transitions
    if (this.isScaling) {
      this.updateScale();
    }
    
    this.updateAnimation(deltaTime);
    
    if (this.isPlayerControlled) {
      this.updatePlayerControl();
    } else {
      this.updateAI(deltaTime);
    }
    
    this.updatePosition();
  }
  
  updateAnimation(deltaTime) {
    const now = Date.now();
    
    // Handle attack animation timing
    if (this.isAttacking && this.state === 'attack') {
      const attackElapsed = now - this.attackStartTime;
      const attackRemaining = this.attackDuration - attackElapsed;
      
      if (this.attackDebugEnabled) {
        // Log detailed attack timing every 100ms during attack
        if (attackElapsed % 100 < 50) { // Roughly every 100ms
          console.log(`[ATTACK-DEBUG] ${this.type} slime attack timing:`, {
            attackElapsed: `${attackElapsed}ms`,
            attackDuration: `${this.attackDuration}ms`,
            attackRemaining: `${attackRemaining}ms`,
            attackProgress: `${Math.round((attackElapsed / this.attackDuration) * 100)}%`,
            currentTexture: this.getTextureName(this.sprite?.texture),
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
      
      if (attackElapsed >= this.attackDuration) {
        // Attack duration finished, return to idle and start cooldown
        this.isAttacking = false;
        this.attackCooldownStart = now; // Start cooldown timer
        this.setState('idle');
        
        if (this.attackDebugEnabled) {
          console.log(`[ATTACK-DEBUG] ${this.type} slime attack COMPLETED:`, {
            actualDuration: `${attackElapsed}ms`,
            expectedDuration: `${this.attackDuration}ms`,
            durationAccuracy: `${attackElapsed - this.attackDuration}ms difference`,
            cooldownStarted: `${this.attackCooldownDuration}ms`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
        
        if (this.debugEnabled) {
          console.log(`Enemy ${this.type} attack finished, returning to idle. Cooldown started for ${this.attackCooldownDuration}ms`);
        }
        return;
      }
      
      // Keep showing attack frame during attack duration
      if (this.animations.attack && this.sprite && this.animations.attack.valid) {
        const previousTexture = this.getTextureName(this.sprite.texture);
        this.sprite.texture = this.animations.attack;
        
        if (this.attackDebugEnabled && !previousTexture?.includes('attack')) {
          console.log(`[ATTACK-DEBUG] ${this.type} slime texture switched to attack frame:`, {
            previousTexture,
            newTexture: this.getTextureName(this.sprite.texture),
            attackElapsed: `${attackElapsed}ms`,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      }
      return;
    }
    
    // Only cycle frames when actively moving (not attacking)
    if (this.state === 'move' && now - this.lastFrameUpdate >= this.frameUpdateInterval) {
      // Get current texture name
      const currentTexture = this.sprite?.texture;
      const currentTextureName = this.getTextureName(currentTexture);
      
      // Alternate between move and idle textures for walking animation
      if (currentTextureName?.includes('move')) {
        // Switch to idle frame
        if (this.animations.idle && this.animations.idle.valid) {
          this.sprite.texture = this.animations.idle;
          if (this.debugEnabled) {
            console.log(`Enemy ${this.type} frame cycle: move → idle`);
          }
        }
      } else {
        // Switch to move frame
        if (this.animations.move && this.animations.move.valid) {
          this.sprite.texture = this.animations.move;
          if (this.debugEnabled) {
            console.log(`Enemy ${this.type} frame cycle: idle → move`);
          }
        }
      }
      
      this.lastFrameUpdate = now;
    }
    
    // If idle, ensure we're showing idle texture and stop any cycling
    if (this.state === 'idle') {
      if (this.animations.idle && this.sprite && this.animations.idle.valid) {
        const currentTextureName = this.getTextureName(this.sprite.texture);
        if (!currentTextureName?.includes('idle')) {
          this.sprite.texture = this.animations.idle;
          if (this.debugEnabled) {
            console.log(`Enemy ${this.type} forced to idle frame`);
          }
        }
      }
    }
  }
  
  // Helper method to extract texture name
  getTextureName(texture) {
    if (!texture) return 'none';
    if (texture.source?.resource?.src) return texture.source.resource.src.split('/').pop();
    if (texture.baseTexture?.resource?.src) return texture.baseTexture.resource.src.split('/').pop();
    if (texture._source?.resource?.src) return texture._source.resource.src.split('/').pop();
    return 'unknown';
  }
  
  updatePlayerControl() {
    // Player control is handled by input system
    // This method updates movement based on player input
    const prevVelX = this.velocity.x;
    const prevVelY = this.velocity.y;
    
    this.velocity.x *= 0.8; // Add some friction
    this.velocity.y *= 0.8;
    
    // Update state based on movement with more sensitive threshold
    // But don't interrupt attacks
    const isMoving = Math.abs(this.velocity.x) > 0.05 || Math.abs(this.velocity.y) > 0.05;
    const wasMoving = Math.abs(prevVelX) > 0.05 || Math.abs(prevVelY) > 0.05;
    
    // Only change state if not currently attacking
    if (!this.isAttacking) {
      if (isMoving && this.state !== 'move') {
        this.setState('move');
      } else if (!isMoving && this.state !== 'idle') {
        this.setState('idle');
      }
    }
    
    if (this.debugEnabled && (isMoving !== wasMoving)) {
      console.log(`Enemy ${this.type} movement state:`, {
        velocity: { x: this.velocity.x.toFixed(2), y: this.velocity.y.toFixed(2) },
        isMoving,
        currentState: this.state,
        isAttacking: this.isAttacking,
        stateChangeBlocked: this.isAttacking ? 'yes (attacking)' : 'no'
      });
    }
  }
  
  updateAI(deltaTime) {
    // AI completely disabled - no automatic movement or attacks
    // Only manual control via player input allowed
  }
  
  setRandomTarget() {
    // Get camera position for relative movement
    const gameContainer = this.container?.parent?.parent; // Get gameContainer
    let cameraX = 0, cameraY = 0;
    
    if (gameContainer) {
      const camera = gameContainer.children.find(child => child.name === 'camera');
      if (camera) {
        try {
          if (camera.position) {
            cameraX = -camera.position.x;
            cameraY = -camera.position.y;
          } else {
            cameraX = -camera.x;
            cameraY = -camera.y;
          }
        } catch (error) {
          console.warn(`[ENEMY-UPDATE] ⚠️ Error accessing camera position:`, error);
          cameraX = -gameContainer.x;
          cameraY = -gameContainer.y;
        }
      } else {
        cameraX = -gameContainer.x;
        cameraY = -gameContainer.y;
      }
    }
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const marginX = screenWidth * 0.2;  // 20% margin
    const marginY = screenHeight * 0.2; // 20% margin
    
    // Create target within safe area (center 60% of screen)
    const safeWidth = screenWidth - 2 * marginX;
    const safeHeight = screenHeight - 2 * marginY;
    
    this.targetPosition = {
      x: cameraX + marginX + Math.random() * safeWidth,
      y: cameraY + marginY + Math.random() * safeHeight
    };
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} new target: (${this.targetPosition.x.toFixed(1)}, ${this.targetPosition.y.toFixed(1)})`);
    }
  }
  
  updatePosition() {
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    
    // Keep within world/map bounds (not screen bounds since enemies are in world coordinates)
    // Get map bounds from global map manager if available
    let worldBounds = null;
    if (window.gameMapManager && window.gameMapManager.currentMap && window.gameMapManager.currentMap.getBounds) {
      worldBounds = window.gameMapManager.currentMap.getBounds();
    }
    
    if (worldBounds) {
      const margin = 40;
      this.position.x = Math.max(worldBounds.minX + margin, Math.min(worldBounds.maxX - margin, this.position.x));
      this.position.y = Math.max(worldBounds.minY + margin, Math.min(worldBounds.maxY - margin, this.position.y));
    }
    // Note: Removed screen boundary clamping since enemies are now in world coordinates
    
    // Update container position
    if (this.container) {
      this.container.position.set(this.position.x, this.position.y);
      
      if (this.debugEnabled) {
        // Log position updates occasionally
        if (Math.random() < 0.01) { // 1% chance to log
          const worldPos = this.container.toGlobal({ x: 0, y: 0 });
          console.log(`[ENEMY-POSITION] ${this.type} position update:`, {
            localPosition: { x: this.position.x.toFixed(1), y: this.position.y.toFixed(1) },
            containerPosition: { x: this.container.x.toFixed(1), y: this.container.y.toFixed(1) },
            worldPosition: { x: worldPos.x.toFixed(1), y: worldPos.y.toFixed(1) },
            screenBounds: { 
              width: this.app.screen.width, 
              height: this.app.screen.height 
            },
            onScreen: worldPos.x >= 0 && worldPos.x <= this.app.screen.width && 
                     worldPos.y >= 0 && worldPos.y <= this.app.screen.height
          });
        }
      }
    }
  }
  
  // Debug method to add visual indicator
  addDebugVisualIndicator() {
    if (!this.container || this.debugIndicator) return;
    
    // Create a simple colored circle as debug indicator (larger and more visible)
    this.debugIndicator = new PIXI.Graphics();
    
    // Use correct PIXI.Graphics API for drawing circles
    this.debugIndicator.beginFill(this.type === 'red' ? 0xff0000 : 0x0000ff, 0.8);
    this.debugIndicator.drawCircle(0, 0, 50); // x, y, radius
    this.debugIndicator.endFill();
    
    // Add a white border for better visibility
    this.debugIndicator.lineStyle(3, 0xffffff, 1);
    this.debugIndicator.drawCircle(0, 0, 50);
    
    this.container.addChild(this.debugIndicator);
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-DEBUG] Added large visual indicator (radius 50) to ${this.type} slime at position:`, {
        containerPosition: { x: this.container.x, y: this.container.y },
        indicatorVisible: this.debugIndicator.visible,
        indicatorAlpha: this.debugIndicator.alpha
      });
    }
  }
  
  // Debug method to remove visual indicator
  removeDebugVisualIndicator() {
    if (this.debugIndicator && this.container) {
      this.container.removeChild(this.debugIndicator);
      this.debugIndicator.destroy();
      this.debugIndicator = null;
      
      if (this.debugEnabled) {
        console.log(`[ENEMY-DEBUG] Removed visual indicator from ${this.type} slime`);
      }
    }
  }
  
  // Player control methods
  moveUp() {
    if (this.isPlayerControlled && !this.isAttacking && !this.isHitStunned) {
      this.velocity.y = -this.speed * 2;
      this.direction = 'up';
    }
  }
  
  moveDown() {
    if (this.isPlayerControlled && !this.isAttacking && !this.isHitStunned) {
      this.velocity.y = this.speed * 2;
      this.direction = 'down';
    }
  }
  
  moveLeft() {
    if (this.isPlayerControlled && !this.isAttacking && !this.isHitStunned) {
      this.velocity.x = -this.speed * 2;
      this.direction = 'left';
      if (this.sprite) {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x); // Flip horizontally
      }
    }
  }
  
  moveRight() {
    if (this.isPlayerControlled && !this.isAttacking && !this.isHitStunned) {
      this.velocity.x = this.speed * 2;
      this.direction = 'right';
      if (this.sprite) {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x); // Normal orientation
      }
    }
  }
  
  canAttack() {
    if (!this.isAlive || this.isAttacking) return false;
    
    const now = Date.now();
    if (this.attackCooldownStart > 0 && (now - this.attackCooldownStart) < this.attackCooldownDuration) {
      return false;
    }
    
    return true;
  }
  
  getAttackCooldownRemaining() {
    if (!this.attackCooldownStart) return 0;
    
    const now = Date.now();
    const elapsed = now - this.attackCooldownStart;
    const remaining = Math.max(0, this.attackCooldownDuration - elapsed);
    
    return remaining;
  }
  
  attack() {
    if (!this.isAlive || this.isAttacking) return;
    
    // Check if attack is on cooldown
    const now = Date.now();
    if (this.attackCooldownStart > 0 && (now - this.attackCooldownStart) < this.attackCooldownDuration) {
      const remainingCooldown = this.attackCooldownDuration - (now - this.attackCooldownStart);
      if (this.debugEnabled) {
        console.log(`Enemy ${this.type} attack on cooldown for ${(remainingCooldown / 1000).toFixed(1)}s more`);
      }
      return;
    }
    
    this.setState('attack');
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} attacks! Will return to idle after ${this.attackDuration}ms, then ${this.attackCooldownDuration}ms cooldown`);
    }
    
    // Attack timing is now handled by updateAnimation() method
    // No setTimeout needed - updateAnimation will automatically return to idle after 1000ms
  }
  
  takeDamage(amount = 1) {
    if (!this.isAlive) return;
    
    this.currentHP -= amount;
    
    if (this.currentHP <= 0) {
      this.currentHP = 0;
      this.die();
    } else {
      // Start hit stun effect
      this.isHitStunned = true;
      this.hitStunStartTime = Date.now();
      
      // Stop all movement during hit stun
      this.velocity.x = 0;
      this.velocity.y = 0;
      
      // Start smooth scale transition
      this.startScaleTransition();
    }
    
    // Also update legacy health system for compatibility
    this.health = (this.currentHP / this.maxHP) * this.maxHealth;
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} took ${amount} HP damage. HP: ${this.currentHP}/${this.maxHP} (Scale: ${this.currentScale.toFixed(2)}x) - Hit stunned for ${this.hitStunDuration}ms`);
    }
  }
  
  // Start smooth scale transition when taking damage
  startScaleTransition() {
    this.previousScale = this.currentScale;
    // Target scale is based on new CURRENT HP after damage
    this.targetScale = this.baseScale + (this.currentHP - 1) * this.scalePerHP;
    this.isScaling = true;
    this.scaleTransitionStartTime = Date.now();
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} starting scale transition: ${this.previousScale.toFixed(2)}x -> ${this.targetScale.toFixed(2)}x over ${this.scaleTransitionDuration}ms (HP: ${this.currentHP}/${this.maxHP})`);
    }
  }
  
  // Update sprite scale based on current HP (with smooth transition support)
  updateScale() {
    // If we're in a scaling transition, interpolate between previous and target scale
    if (this.isScaling) {
      const elapsed = Date.now() - this.scaleTransitionStartTime;
      const progress = Math.min(elapsed / this.scaleTransitionDuration, 1.0);
      
      // Smooth easing function (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate scale
      this.currentScale = this.previousScale + (this.targetScale - this.previousScale) * easedProgress;
      
      // End transition when complete
      if (progress >= 1.0) {
        this.isScaling = false;
        this.currentScale = this.targetScale;
        
        if (this.debugEnabled) {
          console.log(`Enemy ${this.type} scale transition completed: ${this.currentScale.toFixed(2)}x`);
        }
      }
    } else {
      // Normal scale update (immediate) - scale based on CURRENT HP
      this.currentScale = this.baseScale + (this.currentHP - 1) * this.scalePerHP;
    }
    
    // Apply pixel-perfect sizing instead of PIXI scale multipliers
    this.applyPixelPerfectSize();
    
    if (this.debugEnabled && !this.isScaling) {
      console.log(`Enemy ${this.type} scale updated: ${this.currentScale.toFixed(2)}x (HP: ${this.currentHP}/${this.maxHP})`);
    }
  }

  // Calculate pixel-perfect sizes for HP-based scaling
  getPixelSizesForHP() {
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
    
    return pixelSizes;
  }

  // Apply pixel-perfect size based on current HP
  applyPixelPerfectSize() {
    if (!this.sprite) {
      return;
    }

    const pixelSizes = this.getPixelSizesForHP();
    
    // During scaling transition, interpolate between HP sizes
    if (this.isScaling) {
      const previousHP = Math.round((this.previousScale - this.baseScale) / this.scalePerHP + 1);
      const targetHP = Math.round((this.targetScale - this.baseScale) / this.scalePerHP + 1);
      
      const previousSize = pixelSizes[Math.max(1, Math.min(5, previousHP))] || pixelSizes[1];
      const targetSize = pixelSizes[Math.max(1, Math.min(5, targetHP))] || pixelSizes[1];
      
      // Interpolate between sizes during transition
      const elapsed = Date.now() - this.scaleTransitionStartTime;
      const progress = Math.min(elapsed / this.scaleTransitionDuration, 1.0);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentWidth = Math.round(previousSize.width + (targetSize.width - previousSize.width) * easedProgress);
      const currentHeight = Math.round(previousSize.height + (targetSize.height - previousSize.height) * easedProgress);
      
      this.sprite.width = currentWidth;
      this.sprite.height = currentHeight;
      
      if (this.hitRegDebugEnabled) {
        console.log(`[ENEMY-SCALING] Transitioning ${this.type} size: ${currentWidth}×${currentHeight}px (${(progress * 100).toFixed(1)}% complete)`);
      }
    } else {
      // Use exact pixel size for current HP
      const targetSize = pixelSizes[Math.max(1, Math.min(5, this.currentHP))] || pixelSizes[1];
      
      this.sprite.width = targetSize.width;
      this.sprite.height = targetSize.height;
      
      if (this.hitRegDebugEnabled) {
        console.log(`[ENEMY-SCALING] Applied ${this.type} pixel size: ${targetSize.width}×${targetSize.height}px for ${this.currentHP}HP`);
      }
    }
    
    if (this.debugEnabled && !this.isScaling) {
      console.log(`Enemy ${this.type} scale updated: ${this.currentScale.toFixed(2)}x (HP: ${this.currentHP}/${this.maxHP})`);
    }
  }
  
  // Heal the slime and increase size
  heal(amount = 1) {
    if (!this.isAlive) return;
    
    const oldHP = this.currentHP;
    this.currentHP = Math.min(this.maxHP, this.currentHP + amount);
    
    if (this.currentHP !== oldHP) {
      // Start smooth scale transition for healing too
      this.startScaleTransition();
      
      // Update legacy health system for compatibility
      this.health = (this.currentHP / this.maxHP) * this.maxHealth;
      
      if (this.debugEnabled) {
        console.log(`Enemy ${this.type} healed ${amount} HP. HP: ${this.currentHP}/${this.maxHP} (Scale: ${this.targetScale.toFixed(2)}x)`);
      }
    }
  }
  
  // Get HP info for debugging
  getHPInfo() {
    return {
      currentHP: this.currentHP,
      maxHP: this.maxHP,
      scale: this.currentScale,
      sizeMultiplier: `${(this.currentScale * 100).toFixed(0)}%`,
      isAlive: this.isAlive
    };
  }
  
  die() {
    this.isAlive = false;
    this.setState('idle');
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} died`);
    }
    
    // Fade out animation
    if (this.container) {
      const fadeOut = () => {
        this.container.alpha -= 0.05;
        if (this.container.alpha <= 0) {
          this.destroy();
        } else {
          requestAnimationFrame(fadeOut);
        }
      };
      fadeOut();
    }
  }
  
  destroy() {
    if (this.container && this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    if (this.container) {
      this.container.destroy();
    }
    this.container = null;
    this.sprite = null;
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} destroyed`);
    }
  }
  
  setPlayerControlled(controlled) {
    this.isPlayerControlled = controlled;
    if (controlled) {
      this.velocity.x = 0;
      this.velocity.y = 0;
      this.targetPosition = null;
    }
    
    if (this.debugEnabled) {
      console.log(`Enemy ${this.type} player control: ${controlled}`);
    }
  }
  
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
  }
  
  setAttackDebugEnabled(enabled) {
    this.attackDebugEnabled = enabled;
    if (this.attackDebugEnabled) {
      console.log(`[ATTACK-DEBUG] Attack debugging enabled for ${this.type} slime`);
    }
  }
  
  setHitRegDebugEnabled(enabled) {
    this.hitRegDebugEnabled = enabled;
    if (this.hitRegDebugEnabled) {
      console.log(`[HIT-REG-DEBUG] Hit registration debugging enabled for ${this.type} slime at position (${this.position.x.toFixed(1)}, ${this.position.y.toFixed(1)})`);
    }
  }
  
  setSpawnDebugEnabled(enabled) {
    this.spawnDebugEnabled = enabled;
  }
  
  // ============= AI SUPPORT METHODS =============
  
  /**
   * Set enemy facing direction
   */
  setDirection(direction) {
    this.direction = direction;
    
    // Update sprite facing if available
    if (this.sprite) {
      switch (direction) {
        case 'left':
          this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
          break;
        case 'right':
          this.sprite.scale.x = Math.abs(this.sprite.scale.x);
          break;
        default:
          // Up and down don't change sprite flip for now
          break;
      }
    }
  }
  
  /**
   * Play attack animation (stub for now)
   */
  playAttackAnimation() {
    this.setState('attack');
    this.isAttacking = true;
    this.attackStartTime = Date.now();
    
    // Reset to idle after attack duration
    setTimeout(() => {
      if (this.isAttacking) {
        this.setState('idle');
        this.isAttacking = false;
      }
    }, this.attackDuration);
  }
}
