import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';
import BossAttackEffect from './BossAttackEffect';
import BossAttackLogic from './BossAttackLogic';
import BossAudio from './BossAudio';


export default class Boss {
  constructor(app, initialX, initialY, container = null) {
    this.app = app;
    this.position = { x: initialX, y: initialY };
    this.direction = 'right'; // Boss faces right by default, can be mirrored
    this.isMoving = false;
    this.animationSpeed = 0.15;
    this.lastFrameTime = 0;
    this.frameUpdateInterval = 300; // Slower animation for boss presence
    
    // Boss stats and phases
    this.maxHP = 40; // Set to 40 HP as specified in requirements
    this.currentHP = 40;
    this.phase = 'fly'; // 'fly' or 'ground'
    this.phaseTransitioned = false;
    this.actualPhase = 'fly'; // Track the actual phase (not affected by temporary attack animations)
    
    // Animation frame tracking
    this.frameIndices = { 
      fly: 0, 
      land: 0, 
      melee: 0, 
      range: 0,
      dead: 0
    };
    
    // Attack system with state management
    this.isAttacking = false;
    this.attackCooldown = 2000; // 2 seconds between attacks
    this.lastAttackTime = 0;
    this.attackType = 'melee'; // 'melee' or 'range'
    
    // Attack sequence state management
    this.activeAttackSequence = null; // 'bolt', 'range', 'melee', or null
    this.attackSequenceTimeouts = []; // Track all active timeouts for cleanup
    
    // Individual attack cooldown system with phase-dependent durations
    this.attackCooldowns = {
      melee: {
        lastUsed: 0,
        duration: 1000 // 1 second for melee
      },
      bolt: {
        lastUsed: 0,
        phase1Duration: 4000, // 4 seconds in phase 1 (fly)
        phase2Duration: 6000  // 6 seconds in phase 2 (ground)
      },
      range: {
        lastUsed: 0,
        phase1Duration: 1000, // 1 second in phase 1 (fly)
        phase2Duration: 1000  // 1 second in phase 2 (ground)
      }
    };
    
    // Land phase movement system
    this.isLandPhaseMoving = false; // Track if land phase movement sequence is active
    this.isFlyPhaseMoving = false; // Track if fly phase movement sequence is active
    this.isMeleeAttacking = false; // Track if melee attack sequence is active (prevents movement)
    
    // Attack effects system
    this.attackEffects = null;
    this.parentContainer = container; // Store the parent container (character layer)
    this.effectsContainer = container || app.stage;
    
    // Initialize attack logic system
    this.attackLogic = new BossAttackLogic(this);
    
    // Initialize audio system
    this.audioManager = new BossAudio(this);
    
    // Create boss container for organized layering
    this.container = new PIXI.Container();
    this.container.name = 'BossContainer';
    this.container.zIndex = 2000; // High z-index for boss
    this.container.position.set(this.position.x, this.position.y); // Position the container
    
    this.setupSprite();
    this.setupAttackEffects();
    this.app.ticker.add(this.update, this);
    
    // Start boss room music and fly sound
    this.audioManager.startBossRoomAudio();
    
    debugLog(`Boss created at (${initialX}, ${initialY}) with ${this.maxHP} HP`, 'boss');
    debugLog(`Boss container position: (${this.container.position.x}, ${this.container.position.y})`, 'boss');
    debugLog(`Boss parent container: ${this.parentContainer ? this.parentContainer.name || 'unnamed' : 'none'}`, 'boss');
  }

  // High-quality texture loader with error handling
  createHighQualityTexture(path) {
    try {
      const fullPath = process.env.PUBLIC_URL + path;
      const baseTexture = PIXI.BaseTexture.from(fullPath);
      baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
      baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
      
      // Add error handling
      baseTexture.on('error', (error) => {
        debugLog(`❌ Failed to load boss texture: ${path} - ${error.message}`, 'boss');
      });
      
      baseTexture.on('loaded', () => {
        debugLog(`✅ Boss texture loaded successfully: ${path}`, 'boss');
      });
      
      const texture = new PIXI.Texture(baseTexture);
      return texture;
    } catch (error) {
      debugLog(`❌ Error creating boss texture ${path}: ${error.message}`, 'boss');
      return null;
    }
  }

  setupSprite() {
    debugLog('Setting up boss sprite with phase system', 'boss');
    const createTexture = (path) => this.createHighQualityTexture(path);
    
    // Load all animations - art is right side only, we'll mirror for left
    this.animations = {
      fly: [
        createTexture('/Boss/Frames/boss_fly_1.png'),
        createTexture('/Boss/Frames/boss_fly_2.png')
      ],
      land: [
        createTexture('/Boss/Frames/boss_land_1.png'),
        createTexture('/Boss/Frames/boss_land_2.png')
      ],
      melee: [
        createTexture('/Boss/Frames/boss_atk_melle_1.png'),
        createTexture('/Boss/Frames/boss_atk_melle_2.png'),
        createTexture('/Boss/Frames/boss_atk_melle_paw.png')
      ],
      range: [
        createTexture('/Boss/Frames/boss_atk_range.png'),
        createTexture('/Boss/Frames/boss_atk_zap_bolt.png')
      ],
      dead: [
        createTexture('/Boss/Frames/boss_dead.png')
      ],
      bolt: [
        createTexture('/Boss/atacks/zap_bolt1.png'),
        createTexture('/Boss/atacks/zap_bolts2.png'),
        createTexture('/Boss/atacks/zap_bolts3.png')
      ],
      thunder: [
        createTexture('/Boss/atacks/thunder.png')
      ],
      zapCone: [
        createTexture('/Boss/atacks/zap_cone1.png'),
        createTexture('/Boss/atacks/zap_cone2.png'),
        createTexture('/Boss/atacks/zap_cone3.png')
      ]
    };
    
    // Start with fly phase
    this.sprite = new PIXI.Sprite(this.animations.fly[0]);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = true;
    this.sprite.alpha = 1;
    
    // High-quality scaling - boss should be impressive (25% bigger than before)
    const desiredWidth = 500; // Increased from 400 to 500 (25% bigger)
    const scale = desiredWidth / this.sprite.texture.width;
    this.sprite.scale.set(scale);
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false;
    
    // Position sprite at (0,0) relative to container (container is positioned)
    this.sprite.position.set(0, 0);
    this.sprite.zIndex = 1; // Relative to boss container
    
    // Apply direction (mirroring)
    this.updateDirection();
    
    // Add sprite to boss container, then container to the provided layer (not stage directly)
    this.container.addChild(this.sprite);
    
    // Add container to the provided parent container (character layer) instead of app.stage
    if (this.parentContainer && this.parentContainer !== this.app.stage) {
      this.parentContainer.addChild(this.container);
      debugLog(`Boss container added to character layer (${this.parentContainer.name || 'unnamed layer'})`, 'boss');
    } else {
      this.app.stage.addChild(this.container);
      debugLog('Boss container added to app.stage (fallback)', 'boss');
    }
    
    debugLog(`Boss sprite initialized in ${this.phase} phase at world position (${this.position.x}, ${this.position.y})`, 'boss');
  }
  
  // Setup attack effects system
  setupAttackEffects() {
    this.attackEffects = new BossAttackEffect(this.app, this.effectsContainer);
    debugLog('Boss attack effects system initialized', 'boss');
  }
  
  // Update sprite direction (mirroring)
  updateDirection() {
    if (this.sprite) {
      if (this.direction === 'left') {
        this.sprite.scale.x = -Math.abs(this.sprite.scale.x); // Mirror horizontally
      } else {
        this.sprite.scale.x = Math.abs(this.sprite.scale.x); // Face right (original)
      }
    }
  }
  
  // Change boss direction
  setDirection(direction) {
    if (this.direction !== direction) {
      this.direction = direction;
      this.updateDirection();
      debugLog(`Boss facing ${direction}`, 'boss');
    }
  }
  
  // Take damage and handle phase transition
  takeDamage(damage) {
    // Use modifyHealth with negative value for damage
    return this.modifyHealth(-damage);
  }
  
  // Modify boss health and handle phase transitions (for both damage and healing)
  modifyHealth(amount) {
    const oldHP = this.currentHP;
    this.currentHP = Math.max(0, Math.min(this.maxHP, this.currentHP + amount));
    
    debugLog(`Boss health changed by ${amount}, HP: ${this.currentHP}/${this.maxHP} (was ${oldHP})`, 'boss');
    
    // Handle phase transitions based on HP percentage
    const hpPercentage = this.currentHP / this.maxHP;
    const hpPercentageDisplay = (hpPercentage * 100).toFixed(1);
    
    debugLog(`Current actualPhase: ${this.actualPhase}, phaseTransitioned: ${this.phaseTransitioned}, HP%: ${hpPercentageDisplay}%`, 'boss');
    
    // Use actualPhase for transition logic (not affected by temporary attack animations)
    // Transition to ground phase when HP drops to 50% or below
    if (hpPercentage <= 0.5 && this.actualPhase === 'fly' && !this.phaseTransitioned) {
      debugLog('Triggering transition to ground phase', 'boss');
      this.transitionToGroundPhase();
    }
    
    // Transition back to fly phase when HP goes above 50% (for debugging/healing)
    if (hpPercentage > 0.5 && this.actualPhase === 'ground' && this.phaseTransitioned) {
      debugLog('Triggering transition back to fly phase', 'boss');
      this.transitionToFlyPhase();
    }
    
    // Debug logging for phase transition conditions
    if (hpPercentage > 0.5 && this.actualPhase === 'ground') {
      debugLog(`HP > 50% and in ground actualPhase - phaseTransitioned: ${this.phaseTransitioned} (need true for transition)`, 'boss');
    }
    if (hpPercentage <= 0.5 && this.actualPhase === 'fly') {
      debugLog(`HP ≤ 50% and in fly actualPhase - phaseTransitioned: ${this.phaseTransitioned} (need false for transition)`, 'boss');
    }
    
    // Check for death
    if (this.currentHP <= 0) {
      this.enterDeathState();
    }
    
    return this.currentHP;
  }
  
  // Transition from fly phase to ground phase
  transitionToGroundPhase() {
    this.phase = 'ground';
    this.actualPhase = 'ground';
    this.phaseTransitioned = true;
    this.frameIndices.land = 0; // Reset land animation
    
    // Handle audio transition
    this.audioManager.onPhaseTransition('ground');
    
    debugLog('Boss transitioned to ground phase!', 'boss');
    
    // Optional: Add transition effects, sounds, etc.
    // You could also move the boss to a different Y position (lower to ground)
  }
  
  // Transition from ground phase back to fly phase (for healing/debugging)
  transitionToFlyPhase() {
    this.phase = 'fly';
    this.actualPhase = 'fly';
    this.phaseTransitioned = false; // Reset transition flag
    this.frameIndices.fly = 0; // Reset fly animation
    
    // Handle audio transition
    this.audioManager.onPhaseTransition('fly');
    
    debugLog('Boss transitioned back to fly phase!', 'boss');
  }
  
  // Enter death state
  enterDeathState() {
    this.phase = 'dead';
    this.frameIndices.dead = 0;
    this.isAttacking = false;
    
    // Play death sound and stop all other audio
    this.audioManager.playDeathSound();
    
    debugLog('Boss defeated!', 'boss');
    
    // Trigger portal activation when boss dies
    this.triggerPortalOnDeath();
  }
  
  // Trigger portal activation when boss is defeated
  triggerPortalOnDeath() {
    try {
      // Use global reference to enable portal
      if (window.gameMapManager && window.gameMapManager.mapXInstance) {
        debugLog('Boss death triggering portal activation', 'boss');
        window.gameMapManager.mapXInstance.enablePortal();
        debugLog('Portal enabled after boss death', 'boss');
      } else {
        debugLog('Could not enable portal after boss death - MapX instance not found', 'boss');
      }
    } catch (error) {
      debugLog(`Error enabling portal after boss death: ${error.message}`, 'boss');
    }
  }
  

  // Start attack sequence (delegated to BossAttackLogic)
  startAttack(attackType = 'melee', targetX = null, targetY = null) {
    debugLog(`Boss startAttack called: ${attackType}`, 'boss');
    if (this.attackLogic) {
      this.attackLogic.startAttack(attackType, targetX, targetY);
    } else {
      debugLog('Attack logic not initialized', 'boss');
    }
  }
  

  
  update = (delta) => {
    const now = Date.now();
    
    // Update animation frames
    if (!this.lastFrameTime || now - this.lastFrameTime > this.frameUpdateInterval) {
      this.lastFrameTime = now;
      this.updateAnimation();
    }
    
    // Phase-specific behavior
    if (this.phase === 'fly') {
      this.updateFlyPhase();
    } else if (this.phase === 'ground') {
      this.updateGroundPhase();
    }
    // Dead phase doesn't need updates (just plays death animation once)
  }
  
  updateAnimation() {
    if (!this.sprite || !this.animations) return;
    
    let currentAnimation;
    let frameKey;
    
    // Determine which animation to play
    if (this.phase === 'dead') {
      currentAnimation = this.animations.dead;
      frameKey = 'dead';
      // Death animation plays once
      if (this.frameIndices.dead < currentAnimation.length - 1) {
        this.frameIndices.dead++;
      }
    } else if (this.isAttacking) {
      // Special attack sequences (bolt, range, melee) control their own animations manually
      // Only cycle animations for standard attack types that exist in the animations object
      if (this.animations[this.attackType]) {
        currentAnimation = this.animations[this.attackType];
        frameKey = this.attackType;
        // Attack animation cycles
        this.frameIndices[frameKey] = (this.frameIndices[frameKey] + 1) % currentAnimation.length;
      } else {
        // For special sequences (bolt, range, melee), don't interfere - they control their own textures
        // But we still need to continue to apply the texture if it was manually set
        if (this.sprite.texture && this.sprite.texture.baseTexture) {
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        }
        return;
      }
    } else if (this.phase === 'fly') {
      currentAnimation = this.animations.fly;
      frameKey = 'fly';
      // Fly animation cycles
      this.frameIndices.fly = (this.frameIndices.fly + 1) % currentAnimation.length;
    } else if (this.phase === 'ground') {
      currentAnimation = this.animations.land;
      frameKey = 'land';
      // Land animation cycles
      this.frameIndices.land = (this.frameIndices.land + 1) % currentAnimation.length;
    }
    
    // Update sprite texture
    if (currentAnimation && frameKey !== undefined) {
      const frameIndex = this.frameIndices[frameKey];
      if (currentAnimation[frameIndex]) {
        this.sprite.texture = currentAnimation[frameIndex];
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      }
    }
  }
  
  updateFlyPhase() {
    // Flying phase behavior - boss hovers in place (no automatic player tracking)
    // Boss only moves when commanded via debug controls (manual movement only)
    
    // Optional: Add subtle hovering animation
    // const time = Date.now() * 0.001;
    // const hoverOffset = Math.sin(time) * 2; // Subtle 2-pixel hover
    // this.container.position.y = this.position.y + hoverOffset;
  }
  
  updateGroundPhase() {
    // Ground phase behavior - boss stands in place (no automatic player tracking)  
    // Boss only moves when commanded via debug controls (manual movement only)
    // No automatic aggression or player following
  }
  
  // Get boss state for UI/debug
  getState() {
    return {
      hp: this.currentHP,
      maxHP: this.maxHP,
      phase: this.phase,
      isAttacking: this.isAttacking,
      direction: this.direction,
      position: { ...this.position }
    };
  }
  
  // Check if specific attack type is on cooldown
  isAttackOnCooldown(attackType) {
    const currentTime = Date.now();
    const cooldownData = this.attackCooldowns[attackType];
    
    if (!cooldownData) return false;
    
    let cooldownDuration;
    if (attackType === 'melee') {
      cooldownDuration = cooldownData.duration;
    } else {
      // Phase-dependent cooldowns for bolt and range
      const isPhaseOne = this.phase === 'fly';
      cooldownDuration = isPhaseOne ? cooldownData.phase1Duration : cooldownData.phase2Duration;
    }
    
    return (currentTime - cooldownData.lastUsed) < cooldownDuration;
  }

  // Get remaining cooldown time for specific attack
  getRemainingCooldown(attackType) {
    const currentTime = Date.now();
    const cooldownData = this.attackCooldowns[attackType];
    
    if (!cooldownData) return 0;
    
    let cooldownDuration;
    if (attackType === 'melee') {
      cooldownDuration = cooldownData.duration;
    } else {
      // Phase-dependent cooldowns for bolt and range
      const isPhaseOne = this.phase === 'fly';
      cooldownDuration = isPhaseOne ? cooldownData.phase1Duration : cooldownData.phase2Duration;
    }
    
    const elapsed = currentTime - cooldownData.lastUsed;
    const remaining = Math.max(0, cooldownDuration - elapsed);
    
    return remaining;
  }

  // Get cooldown info for debug display
  getCooldownInfo() {
    return {
      melee: {
        remaining: this.getRemainingCooldown('melee'),
        onCooldown: this.isAttackOnCooldown('melee'),
        duration: this.attackCooldowns.melee.duration
      },
      bolt: {
        remaining: this.getRemainingCooldown('bolt'),
        onCooldown: this.isAttackOnCooldown('bolt'),
        duration: this.phase === 'fly' ? this.attackCooldowns.bolt.phase1Duration : this.attackCooldowns.bolt.phase2Duration
      },
      range: {
        remaining: this.getRemainingCooldown('range'),
        onCooldown: this.isAttackOnCooldown('range'),
        duration: this.phase === 'fly' ? this.attackCooldowns.range.phase1Duration : this.attackCooldowns.range.phase2Duration
      }
    };
  }
  
  // Move boss (for AI or scripted movement)
  moveTo(x, y) {
    // Prevent movement during melee attack
    if (this.isMeleeAttacking) {
      debugLog('Boss movement blocked - melee attack in progress', 'boss');
      return;
    }
    
    const oldX = this.position.x;
    const oldY = this.position.y;
    
    // For debug movement, use simple direct movement without complex sequences
    // The complex movement sequences should only be used for AI behavior, not debug controls
    this.executeMovement(x, y, oldX, oldY);
  }
  
  // Move boss with AI behavior (complex sequences for dramatic effect)
  moveToWithAI(x, y) {
    // Prevent movement during melee attack
    if (this.isMeleeAttacking) {
      debugLog('Boss AI movement blocked - melee attack in progress', 'boss');
      return;
    }
    
    const oldX = this.position.x;
    const oldY = this.position.y;
    
    // Special behavior for both phases - use actualPhase for movement decisions
    if (this.actualPhase === 'ground' && this.phaseTransitioned) {
      this.performLandPhaseMovement(x, y, oldX, oldY);
      return;
    }
    
    if (this.actualPhase === 'fly') {
      this.performFlyPhaseMovement(x, y, oldX, oldY);
      return;
    }
    
    // Normal movement fallback
    this.executeMovement(x, y, oldX, oldY);
  }

  // Execute land phase movement with pause and attack frame
  performLandPhaseMovement(x, y, oldX, oldY) {
    debugLog('Land phase movement: Starting pause (0.3s) -> attack frame (0.5s) -> pause (0.3s) -> move sequence', 'boss');
    
    // Prevent multiple movement sequences if already moving
    if (this.isLandPhaseMoving) {
      debugLog('Land phase movement already in progress, ignoring new movement command', 'boss');
      return;
    }
    
    this.isLandPhaseMoving = true;
    
    // Step 1: Stop for 0.3 seconds
    debugLog('Land phase step 1: Stopping for 0.3s', 'boss');
    
    setTimeout(() => {
      // Step 2: Show attack frame for 0.5 seconds
      const originalTexture = this.sprite.texture;
      this.sprite.texture = this.animations.melee[0]; // Use first melee frame as attack frame
      debugLog('Land phase step 2: Showing attack frame for 0.5s', 'boss');
      
      setTimeout(() => {
        // Step 3: Stop for another 0.3 seconds
        this.sprite.texture = originalTexture; // Restore original texture
        debugLog('Land phase step 3: Stopping for another 0.3s', 'boss');
        
        setTimeout(() => {
          // Step 4: Execute the movement
          this.executeMovement(x, y, oldX, oldY);
          this.isLandPhaseMoving = false;
          debugLog('Land phase step 4: Movement executed', 'boss');
        }, 300); // 0.3 seconds
        
      }, 500); // 0.5 seconds for attack frame
      
    }, 300); // 0.3 seconds
  }
  
  // Execute fly phase movement with land, attack frame, and take off
  performFlyPhaseMovement(x, y, oldX, oldY) {
    debugLog('Fly phase movement: Starting land (0.5s) -> attack frame (0.5s) -> take off (0.5s) -> move sequence', 'boss');
    
    // Prevent multiple movement sequences if already moving
    if (this.isFlyPhaseMoving) {
      debugLog('Fly phase movement already in progress, ignoring new movement command', 'boss');
      return;
    }
    
    this.isFlyPhaseMoving = true;
    
    // Step 1: Switch to land animation for 0.5 seconds
    const originalPhase = this.phase;
    this.phase = 'ground';
    this.frameIndices.land = 0;
    debugLog('Fly phase step 1: Switching to LAND animation for 0.5s', 'boss');
    
    setTimeout(() => {
      // Step 2: Show attack frame for 0.5 seconds
      this.sprite.texture = this.animations.melee[0]; // Use first melee frame as attack frame
      debugLog('Fly phase step 2: Showing attack frame for 0.5s', 'boss');
      
      setTimeout(() => {
        // Step 3: Take off (return to fly) for 0.5 seconds
        this.phase = originalPhase;
        this.frameIndices[originalPhase] = 0;
        debugLog('Fly phase step 3: Taking off (returning to FLY) for 0.5s', 'boss');
        
        setTimeout(() => {
          // Step 4: Execute movement
          this.executeMovement(x, y, oldX, oldY);
          this.isFlyPhaseMoving = false;
          debugLog('Fly phase step 4: Movement executed', 'boss');
        }, 500); // 0.5 seconds for take off
        
      }, 500); // 0.5 seconds for attack frame
      
    }, 500); // 0.5 seconds for land animation
  }
  
  // Execute actual movement
  executeMovement(x, y, oldX, oldY) {
    this.position.x = x;
    this.position.y = y;
    if (this.container) {
      this.container.position.set(x, y);
      debugLog(`Boss container repositioned to (${x}, ${y})`, 'boss');
    }
    
    debugLog(`Boss moved from (${oldX}, ${oldY}) to (${x}, ${y})`, 'boss');
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
    
    // Clear all active attack sequence timeouts
    this.attackSequenceTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.attackSequenceTimeouts = [];
    this.activeAttackSequence = null;
    
    // Stop all boss audio
    this.audioManager.destroy();
    
    // Clean up attack effects
    if (this.attackEffects) {
      this.attackEffects.destroy();
    }
    
    // Clean up container and sprite
    if (this.container && this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    if (this.container) {
      this.container.destroy(true); // true = destroy children too
    }
    
    debugLog('Boss destroyed, attack sequences cleared, and audio cleaned up', 'boss');
  }
}
