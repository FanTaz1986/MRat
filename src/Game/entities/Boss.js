import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';
import BossAttackEffect from './BossAttackEffect';
import { 
  playBossRoomMusic, 
  stopBossRoomMusic,
  playBossFlySound, 
  stopBossFlySound,
  playBossLandSound,
  playBossMeleeAttack,
  playBossRangeChargeUp,
  playBossDeathSound
} from '../../utils/AudioManager';

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
        phase1Duration: 10000, // 10 seconds in phase 1 (fly)
        phase2Duration: 5000   // 5 seconds in phase 2 (ground)
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
    
    // Create boss container for organized layering
    this.container = new PIXI.Container();
    this.container.name = 'BossContainer';
    this.container.zIndex = 2000; // High z-index for boss
    this.container.position.set(this.position.x, this.position.y); // Position the container
    
    // Audio state
    this.isFlyingSoundPlaying = false;
    this.isBossRoomMusicPlaying = false;
    
    this.setupSprite();
    this.setupAttackEffects();
    this.app.ticker.add(this.update, this);
    
    // Start boss room music and fly sound
    this.startBossRoomAudio();
    
    debugLog(`Boss created at (${initialX}, ${initialY}) with ${this.maxHP} HP`, 'boss');
    debugLog(`Boss container position: (${this.container.position.x}, ${this.container.position.y})`, 'boss');
    debugLog(`Boss parent container: ${this.parentContainer ? this.parentContainer.name || 'unnamed' : 'none'}`, 'boss');
  }

  // High-quality texture loader
  createHighQualityTexture(path) {
    const baseTexture = PIXI.BaseTexture.from(process.env.PUBLIC_URL + path);
    baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
    baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    return new PIXI.Texture(baseTexture);
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
  
  // Start boss room audio
  startBossRoomAudio() {
    if (!this.isBossRoomMusicPlaying) {
      playBossRoomMusic();
      this.isBossRoomMusicPlaying = true;
    }
    
    if (this.phase === 'fly' && !this.isFlyingSoundPlaying) {
      playBossFlySound();
      this.isFlyingSoundPlaying = true;
    }
  }
  
  // Stop boss room audio
  stopBossRoomAudio() {
    if (this.isBossRoomMusicPlaying) {
      stopBossRoomMusic();
      this.isBossRoomMusicPlaying = false;
    }
    
    if (this.isFlyingSoundPlaying) {
      stopBossFlySound();
      this.isFlyingSoundPlaying = false;
    }
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
    
    // Stop fly sound and play land sound
    if (this.isFlyingSoundPlaying) {
      stopBossFlySound();
      this.isFlyingSoundPlaying = false;
    }
    playBossLandSound();
    
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
    
    // Start fly sound and stop land sound if needed
    if (!this.isFlyingSoundPlaying) {
      playBossFlySound();
      this.isFlyingSoundPlaying = true;
    }
    
    debugLog('Boss transitioned back to fly phase!', 'boss');
  }
  
  // Enter death state
  enterDeathState() {
    this.phase = 'dead';
    this.frameIndices.dead = 0;
    this.isAttacking = false;
    
    // Stop all boss audio and play death sound
    this.stopBossRoomAudio();
    playBossDeathSound(() => {
      debugLog('Boss death sound finished', 'boss');
    });
    
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
  
  // Start attack sequence
  startAttack(attackType = 'melee', targetX = null, targetY = null) {
    if (this.phase === 'dead') return;
    
    // Special handling for melee attacks - they can always interrupt other attacks
    if (attackType === 'melee') {
      debugLog('MELEE ATTACK (C) - checking for interruption', 'boss');
      
      // Check melee cooldown
      if (this.isAttackOnCooldown(attackType)) {
        const remainingMs = this.getRemainingCooldown(attackType);
        debugLog(`Boss ${attackType} attack on cooldown for ${(remainingMs/1000).toFixed(1)}s more`, 'boss');
        return;
      }
      
      // Force stop all other attacks (melee can interrupt anything)
      this.stopAllOtherAttacks();
      
      // Update last used time for melee attack
      this.attackCooldowns[attackType].lastUsed = Date.now();
      
      // Set active attack sequence to melee
      this.activeAttackSequence = attackType;
      
      debugLog('MELEE ATTACK (C) - starting sequence immediately', 'boss');
      this.startMeleeAttackSequence(targetX, targetY);
      return;
    }
    
    // For non-melee attacks, prevent overlapping attack sequences
    if (this.activeAttackSequence !== null) {
      debugLog(`Boss ${attackType} attack blocked - ${this.activeAttackSequence} attack already in progress`, 'boss');
      return;
    }
    
    // Check specific attack cooldown
    if (this.isAttackOnCooldown(attackType)) {
      const remainingMs = this.getRemainingCooldown(attackType);
      debugLog(`Boss ${attackType} attack on cooldown for ${(remainingMs/1000).toFixed(1)}s more`, 'boss');
      return;
    }

    // Update last used time for this specific attack
    this.attackCooldowns[attackType].lastUsed = Date.now();
    
    debugLog(`Boss ${attackType.toUpperCase()} attack started`, 'boss');
    
    // Set active attack sequence to prevent overlapping
    this.activeAttackSequence = attackType;
    
    // Handle special bolt attack sequence
    if (attackType === 'bolt') {
      this.startBoltAttackSequence(targetX, targetY);
      return;
    }
    
    // Handle special range attack sequence
    if (attackType === 'range') {
      this.startRangeAttackSequence(targetX, targetY);
      return;
    }
    
    this.isAttacking = true;
    this.attackType = attackType;
    this.frameIndices[attackType] = 0;
    
    debugLog(`Boss started ${attackType} attack`, 'boss');
    
    // End attack after animation completes
    const timeoutId = setTimeout(() => {
      this.isAttacking = false;
      this.activeAttackSequence = null;
      debugLog(`Boss finished ${attackType} attack`, 'boss');
    }, this.frameUpdateInterval * this.animations[attackType].length);
    
    this.attackSequenceTimeouts.push(timeoutId);
  }
  
  // Stop all other attacks when melee (C) is started
  stopAllOtherAttacks() {
    if (this.activeAttackSequence && this.activeAttackSequence !== 'melee') {
      debugLog(`INTERRUPTING ${this.activeAttackSequence} attack to start melee attack`, 'boss');
      
      // Clear all active timeouts immediately
      this.attackSequenceTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.attackSequenceTimeouts = [];
      
      // Reset all attack states immediately
      this.isAttacking = false;
      this.isMeleeAttacking = false;
      this.isFlyPhaseMoving = false;
      this.isLandPhaseMoving = false;
      
      // Force return to actual phase immediately
      this.phase = this.actualPhase;
      this.frameIndices[this.actualPhase] = 0;
      
      debugLog(`Force-stopped ${this.activeAttackSequence} attack, returned to ${this.actualPhase} phase`, 'boss');
    }
    
    // Always clear the active sequence before starting melee
    this.activeAttackSequence = null;
  }
  
  // Special bolt attack sequence: fly -> land -> bolt -> land -> fly
  startBoltAttackSequence(targetX = null, targetY = null) {
    const now = Date.now();
    this.lastAttackTime = now;
    
    debugLog('Boss started BOLT attack sequence: fly -> land -> bolt -> land -> fly', 'boss');
    
    // Store original phase to return to it (use actualPhase, not temporary phase)
    const originalPhase = this.actualPhase;
    this.isAttacking = true;
    this.attackType = 'boltSequence'; // Use different identifier to avoid animation conflicts
    
    // Default target position if not provided
    if (targetX === null || targetY === null) {
      targetX = this.position.x + (this.direction === 'right' ? 150 : -150);
      targetY = this.position.y;
    }
    
    // Step 1: Switch to land animation for 0.5 seconds
    this.phase = 'ground'; // Temporary phase change for animation
    this.frameIndices.land = 0;
    debugLog('Bolt sequence step 1: Switching to LAND animation (0.5s)', 'boss');
    
    const timeout1 = setTimeout(() => {
      if (this.activeAttackSequence !== 'bolt') return; // Check if sequence was cancelled
      
      // Step 2: Switch to bolt animation for 0.5 seconds
      this.sprite.texture = this.animations.range[1]; // boss_atk_zap_bolt.png
      debugLog('Bolt sequence step 2: Switching to BOLT animation (0.5s)', 'boss');
      
      // Execute bolt attack effects
      this.executeBoltAttack(targetX, targetY);
      
      const timeout2 = setTimeout(() => {
        if (this.activeAttackSequence !== 'bolt') return; // Check if sequence was cancelled
        
        // Step 3: Switch back to land animation for 0.5 seconds
        this.phase = 'ground';
        this.frameIndices.land = 0;
        debugLog('Bolt sequence step 3: Switching back to LAND animation (0.5s)', 'boss');
        
        const timeout3 = setTimeout(() => {
          if (this.activeAttackSequence !== 'bolt') return; // Check if sequence was cancelled
          
          // Step 4: Return to original phase (fly)
          this.phase = originalPhase;
          this.frameIndices[originalPhase] = 0;
          this.isAttacking = false;
          this.activeAttackSequence = null; // Clear active sequence
          debugLog('Bolt sequence step 4: Returning to original phase - sequence complete', 'boss');
        }, 500); // 0.5 seconds
        
        this.attackSequenceTimeouts.push(timeout3);
      }, 500); // 0.5 seconds
      
      this.attackSequenceTimeouts.push(timeout2);
    }, 500); // 0.5 seconds
    
    this.attackSequenceTimeouts.push(timeout1);
  }
  
  // Execute bolt attack effects
  executeBoltAttack(targetX, targetY) {
    // Play range charge up sound for bolt
    playBossRangeChargeUp();
    
    // Spell effects disabled - to be added later
    // this.attackEffects.createZapBoltAttack(this.position.x, this.position.y, targetX, targetY);
    
    debugLog(`Boss executed bolt attack, targeting (${targetX}, ${targetY}) - effects disabled`, 'boss');
  }

  // Special range attack sequence: fly -> land -> range -> land -> fly
  startRangeAttackSequence(targetX = null, targetY = null) {
    const now = Date.now();
    this.lastAttackTime = now;
    
    debugLog('Boss started RANGE attack sequence: fly -> land (0.5s) -> range (0.5s) -> land (0.5s) -> fly', 'boss');
    
    // Store original phase to return to it (use actualPhase, not temporary phase)
    const originalPhase = this.actualPhase;
    this.isAttacking = true;
    this.attackType = 'rangeSequence'; // Use different identifier to avoid animation conflicts
    
    // Default target position if not provided
    if (targetX === null || targetY === null) {
      targetX = this.position.x + (this.direction === 'right' ? 200 : -200);
      targetY = this.position.y;
    }
    
    // Step 1: Switch to land animation for 0.5 seconds
    this.phase = 'ground'; // Temporary phase change for animation
    this.frameIndices.land = 0;
    debugLog('Range sequence step 1: Switching to LAND animation for 0.5s', 'boss');
    
    const timeout1 = setTimeout(() => {
      if (this.activeAttackSequence !== 'range') return; // Check if sequence was cancelled
      
      // Step 2: Switch to range animation (boss_atk_range.png) for 0.5 seconds
      this.sprite.texture = this.animations.range[0]; // boss_atk_range.png
      debugLog('Range sequence step 2: Switching to boss_atk_range.png for 0.5s', 'boss');
      
      // Execute range attack effects
      this.executeRangeAttackSequence(targetX, targetY);
      
      const timeout2 = setTimeout(() => {
        if (this.activeAttackSequence !== 'range') return; // Check if sequence was cancelled
        
        // Step 3: Switch back to land animation for 0.5 seconds
        this.phase = 'ground';
        this.frameIndices.land = 0;
        debugLog('Range sequence step 3: Switching back to LAND animation for 0.5s', 'boss');
        
        const timeout3 = setTimeout(() => {
          if (this.activeAttackSequence !== 'range') return; // Check if sequence was cancelled
          
          // Step 4: Return to original phase (fly)
          this.phase = originalPhase;
          this.frameIndices[originalPhase] = 0;
          this.isAttacking = false;
          this.activeAttackSequence = null; // Clear active sequence
          debugLog('Range sequence step 4: Returning to original phase - sequence complete', 'boss');
        }, 500); // 0.5 seconds
        
        this.attackSequenceTimeouts.push(timeout3);
      }, 500); // 0.5 seconds
      
      this.attackSequenceTimeouts.push(timeout2);
    }, 500); // 0.5 seconds
    
    this.attackSequenceTimeouts.push(timeout1);
  }
  
  // Execute range attack effects for sequence
  executeRangeAttackSequence(targetX, targetY) {
    // Play range charge up sound
    playBossRangeChargeUp();
    
    // Spell effects disabled - to be added later
    // Random range attack type for visual variety
    // const rangeAttacks = ['thunder', 'zapBolt', 'zapCone'];
    // const randomAttack = rangeAttacks[Math.floor(Math.random() * rangeAttacks.length)];
    
    debugLog(`Boss executed range attack in sequence, targeting (${targetX}, ${targetY}) - effects disabled`, 'boss');
  }

  // Special melee attack sequence: boss_land_1 -> boss_atk_melle_1 -> boss_atk_melle_2 -> boss_land_2 -> normal
  startMeleeAttackSequence(targetX = null, targetY = null) {
    const now = Date.now();
    this.lastAttackTime = now;
    
    debugLog('Boss started MELEE attack sequence: land_1 -> melee_1 -> melee_2 -> land_2 -> normal', 'boss');
    debugLog(`MELEE SEQUENCE: Starting from actualPhase=${this.actualPhase}, phase=${this.phase}`, 'boss');
    
    // Store original phase and animation state (use actualPhase, not temporary phase)
    const originalPhase = this.actualPhase;
    this.isAttacking = true;
    this.attackType = 'meleeSequence'; // Use different identifier to avoid animation conflicts
    
    // Prevent movement during melee attack
    this.isMeleeAttacking = true;
    
    // Default target position if not provided
    if (targetX === null || targetY === null) {
      targetX = this.position.x + (this.direction === 'right' ? 100 : -100);
      targetY = this.position.y;
    }
    
    // Step 1: Show boss_land_1 for 0.1 seconds
    this.sprite.texture = this.animations.land[0]; // boss_land_1.png
    debugLog('Melee sequence step 1: Showing boss_land_1 (0.1s) - INTERRUPTION COMPLETE', 'boss');
    
    const timeout1 = setTimeout(() => {
      if (this.activeAttackSequence !== 'melee') {
        debugLog('Melee sequence step 1: sequence cancelled', 'boss');
        return; // Check if sequence was cancelled
      }
      
      // Step 2: Show boss_atk_melle_1 for 0.1 seconds
      this.sprite.texture = this.animations.melee[0]; // boss_atk_melle_1.png
      debugLog('Melee sequence step 2: Showing boss_atk_melle_1 (0.1s)', 'boss');
      
      // Play melee attack sound
      playBossMeleeAttack();
      
      const timeout2 = setTimeout(() => {
        if (this.activeAttackSequence !== 'melee') {
          debugLog('Melee sequence step 2: sequence cancelled', 'boss');
          return; // Check if sequence was cancelled
        }
        
          // Step 3: Show boss_atk_melle_2 for 0.1 seconds
          this.sprite.texture = this.animations.melee[1]; // boss_atk_melle_2.png
          debugLog('Melee sequence step 3: Showing boss_atk_melle_2 (0.1s)', 'boss');
          
          // Spell effects disabled - to be added later
          // this.attackEffects.createZapBoltExplosion(targetX, targetY);
          
          const timeout3 = setTimeout(() => {
            if (this.activeAttackSequence !== 'melee') {
              debugLog('Melee sequence step 3: sequence cancelled', 'boss');
              return; // Check if sequence was cancelled
            }
            
          // Step 4: Show boss_land_2 for 0.1 seconds
          this.sprite.texture = this.animations.land[1]; // boss_land_2.png
          debugLog('Melee sequence step 4: Showing boss_land_2 (0.1s)', 'boss');
          
          const timeout4 = setTimeout(() => {
            if (this.activeAttackSequence !== 'melee') {
              debugLog('Melee sequence step 4: sequence cancelled', 'boss');
              return; // Check if sequence was cancelled
            }
            
            // Step 5: Return to normal animation
            this.phase = originalPhase;
            this.frameIndices[originalPhase] = 0;
            this.isAttacking = false;
            this.isMeleeAttacking = false; // Allow movement again
            this.activeAttackSequence = null; // Clear active sequence
            debugLog(`Melee sequence step 5: Returning to ${originalPhase} animation - sequence complete`, 'boss');
          }, 100); // 0.1 seconds
          
          this.attackSequenceTimeouts.push(timeout4);
        }, 100); // 0.1 seconds
        
        this.attackSequenceTimeouts.push(timeout3);
      }, 100); // 0.1 seconds
      
      this.attackSequenceTimeouts.push(timeout2);
    }, 100); // 0.1 seconds
    
    this.attackSequenceTimeouts.push(timeout1);
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
    this.stopBossRoomAudio();
    
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
