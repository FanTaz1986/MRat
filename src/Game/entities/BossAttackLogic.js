import * as PIXI from 'pixi.js';
import { debugLog, isInvulnerable } from '../../development/utils/Debug';

/**
 * BossAttackLogic.js
 * 
 * Handles all boss attack sequences and logic.
 * Separated from main Boss class to improve code organization.
 */
export default class BossAttackLogic {
  constructor(boss) {
    this.boss = boss;
    this.app = boss.app;
    this.attackSequenceTimeouts = [];
  }

  /**
   * Get the appropriate logging category based on attack type
   */
  getAttackLogCategory(attackType) {
    switch (attackType) {
      case 'range':
      case 'rangeSequence':
        return 'bossattackz';
      case 'bolt':
      case 'boltSequence':
        return 'bossattackx';
      case 'melee':
      case 'meleeSequence':
        return 'bossattackc';
      default:
        return 'boss';
    }
  }

  /**
   * Start attack sequence
   */
  startAttack(attackType = 'melee', targetX = null, targetY = null) {
    if (this.boss.phase === 'dead') return;
    
    const logCategory = this.getAttackLogCategory(attackType);
    debugLog(`🎯 startAttack called: type=${attackType}, activeSequence=${this.boss.activeAttackSequence}, target=(${targetX}, ${targetY})`, logCategory);
    
    // Special handling for melee attacks - they can always interrupt other attacks
    if (attackType === 'melee') {
      debugLog('🥊 MELEE ATTACK (C) - checking for interruption', logCategory);
      
      // Prevent duplicate melee attacks
      if (this.boss.activeAttackSequence === 'melee') {
        debugLog('🚫 MELEE ATTACK already active - ignoring duplicate request', logCategory);
        return;
      }
      
      // Check melee cooldown
      if (this.boss.isAttackOnCooldown(attackType)) {
        const remainingMs = this.boss.getRemainingCooldown(attackType);
        debugLog(`🕐 Boss ${attackType} attack on cooldown for ${(remainingMs/1000).toFixed(1)}s more`, logCategory);
        return;
      }
      
      // Force stop all other attacks (melee can interrupt anything)
      if (this.boss.activeAttackSequence) {
        debugLog(`🚫 INTERRUPTING ${this.boss.activeAttackSequence} attack to start melee attack`, logCategory);
        this.stopAllOtherAttacks();
      }
      
      // Update last used time for melee attack
      this.boss.attackCooldowns[attackType].lastUsed = Date.now();
      
      // Set active attack sequence to melee
      this.boss.activeAttackSequence = attackType;
      
      debugLog('🥊 MELEE ATTACK (C) - starting sequence immediately', logCategory);
      this.startMeleeAttackSequence(targetX, targetY);
      return;
    }
    
    // For non-melee attacks, prevent overlapping attack sequences
    if (this.boss.activeAttackSequence !== null) {
      debugLog(`Boss ${attackType} attack blocked - ${this.boss.activeAttackSequence} attack already in progress`, logCategory);
      return;
    }
    
    // Check specific attack cooldown
    if (this.boss.isAttackOnCooldown(attackType)) {
      const remainingMs = this.boss.getRemainingCooldown(attackType);
      debugLog(`🕐 Boss ${attackType} attack on cooldown for ${(remainingMs/1000).toFixed(1)}s more`, logCategory);
      
      // Show cooldown details for range attacks
      if (attackType === 'range') {
        const cooldownInfo = this.boss.attackCooldowns[attackType];
        const phaseDuration = this.boss.phase === 'fly' ? cooldownInfo.phase1Duration : cooldownInfo.phase2Duration;
        debugLog(`⚡ Range attack cooldown: ${phaseDuration}ms (${phaseDuration/1000}s) in ${this.boss.phase} phase`, logCategory);
      }
      
      return;
    }

    // Update last used time for this specific attack
    this.boss.attackCooldowns[attackType].lastUsed = Date.now();
    
    // Enhanced attack start logging with cooldown information
    if (attackType === 'range') {
      const cooldownInfo = this.boss.attackCooldowns[attackType];
      const phaseDuration = this.boss.phase === 'fly' ? cooldownInfo.phase1Duration : cooldownInfo.phase2Duration;
      debugLog(`⚡ Boss RANGE attack started - cooldown: ${phaseDuration}ms (${phaseDuration/1000}s) in ${this.boss.phase} phase`, logCategory);
      debugLog(`⚡ NEW FEATURE: Range attack cooldown reduced to 1 second (was 10s/5s)`, logCategory);
    } else {
      debugLog(`Boss ${attackType.toUpperCase()} attack started`, logCategory);
    }
    
    // Set active attack sequence to prevent overlapping
    this.boss.activeAttackSequence = attackType;
    
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
    
    this.boss.isAttacking = true;
    this.boss.attackType = attackType;
    this.boss.frameIndices[attackType] = 0;
    
    debugLog(`Boss started ${attackType} attack`, logCategory);
    
    // End attack after animation completes
    const timeoutId = setTimeout(() => {
      this.boss.isAttacking = false;
      this.boss.activeAttackSequence = null;
      debugLog(`Boss finished ${attackType} attack`, logCategory);
    }, this.boss.frameUpdateInterval * this.boss.animations[attackType].length);
    
    this.attackSequenceTimeouts.push(timeoutId);
  }

  /**
   * Stop all other attacks when melee (C) is started
   */
  stopAllOtherAttacks() {
    if (this.boss.activeAttackSequence && this.boss.activeAttackSequence !== 'melee') {
      debugLog(`INTERRUPTING ${this.boss.activeAttackSequence} attack to start melee attack`, this.getAttackLogCategory('melee'));
      
      // Clear all active timeouts immediately
      this.attackSequenceTimeouts.forEach(timeoutId => {
        clearTimeout(timeoutId);
      });
      this.attackSequenceTimeouts = [];
      
      // Reset all attack states immediately
      this.boss.isAttacking = false;
      this.boss.isMeleeAttacking = false;
      this.boss.isFlyPhaseMoving = false;
      this.boss.isLandPhaseMoving = false;
      
      // Force return to actual phase immediately
      this.boss.phase = this.boss.actualPhase;
      this.boss.frameIndices[this.boss.actualPhase] = 0;
      
      debugLog(`Force-stopped ${this.boss.activeAttackSequence} attack, returned to ${this.boss.actualPhase} phase`, this.getAttackLogCategory('melee'));
    }
    
    // Always clear the active sequence before starting melee
    this.boss.activeAttackSequence = null;
  }

  /**
   * Special bolt attack sequence: fly -> land -> bolt -> land -> fly
   */
  startBoltAttackSequence(targetX = null, targetY = null) {
    const now = Date.now();
    this.boss.lastAttackTime = now;
    
    const logCategory = this.getAttackLogCategory('bolt');
    debugLog('Boss started BOLT attack sequence: fly -> land -> bolt -> land -> fly', logCategory);
    
    // Store original phase to return to it (use actualPhase, not temporary phase)
    const originalPhase = this.boss.actualPhase;
    this.boss.isAttacking = true;
    this.boss.attackType = 'boltSequence'; // Use different identifier to avoid animation conflicts
    
    // Default target position if not provided
    if (targetX === null || targetY === null) {
      targetX = this.boss.position.x + (this.boss.direction === 'right' ? 150 : -150);
      targetY = this.boss.position.y;
    }
    
    // Step 1: Switch to land animation for 0.5 seconds
    this.boss.phase = 'ground'; // Temporary phase change for animation
    this.boss.frameIndices.land = 0;
    debugLog('Bolt sequence step 1: Switching to LAND animation (0.5s)', logCategory);
    
    const timeout1 = setTimeout(() => {
      if (this.boss.activeAttackSequence !== 'bolt') return; // Check if sequence was cancelled
      
      // Step 2: Switch to bolt animation for 0.5 seconds
      this.boss.sprite.texture = this.boss.animations.range[1]; // boss_atk_zap_bolt.png
      debugLog('Bolt sequence step 2: Switching to BOLT animation (0.5s)', logCategory);
      
      // Execute bolt attack effects
      this.executeBoltAttack(targetX, targetY);
      
      const timeout2 = setTimeout(() => {
        if (this.boss.activeAttackSequence !== 'bolt') return; // Check if sequence was cancelled
        
        // Step 3: Switch back to land animation for 0.5 seconds
        this.boss.phase = 'ground';
        this.boss.frameIndices.land = 0;
        debugLog('Bolt sequence step 3: Switching back to LAND animation (0.5s)', logCategory);
        
        const timeout3 = setTimeout(() => {
          if (this.boss.activeAttackSequence !== 'bolt') return; // Check if sequence was cancelled
          
          // Step 4: Return to original phase (fly)
          this.boss.phase = originalPhase;
          this.boss.frameIndices[originalPhase] = 0;
          this.boss.isAttacking = false;
          this.boss.activeAttackSequence = null; // Clear active sequence
          debugLog('Bolt sequence step 4: Returning to original phase - sequence complete', logCategory);
        }, 500); // 0.5 seconds
        
        this.attackSequenceTimeouts.push(timeout3);
      }, 500); // 0.5 seconds
      
      this.attackSequenceTimeouts.push(timeout2);
    }, 500); // 0.5 seconds
    
    this.attackSequenceTimeouts.push(timeout1);
  }

  /**
   * Execute bolt attack effects
   */
  executeBoltAttack(targetX, targetY) {
    // Play range charge up sound for bolt
    this.boss.audioManager.playRangeChargeSound();
    
    // Create bolt projectile
    this.createBoltProjectile(targetX, targetY);
    
    const logCategory = this.getAttackLogCategory('bolt');
    debugLog(`Boss executed bolt attack, creating projectile targeting (${targetX}, ${targetY})`, logCategory);
  }

  /**
   * Create and animate bolt projectile
   */
  createBoltProjectile(targetX, targetY) {
    const logCategory = this.getAttackLogCategory('bolt');
    debugLog('🔫 Creating bolt projectile with animated sprites', logCategory);
    
    // Safety check for bolt textures
    if (!this.boss.animations.bolt || this.boss.animations.bolt.length < 3) {
      debugLog('❌ Bolt textures not found - need zap_bolt1.png, zap_bolt2.png, zap_bolt3.png', logCategory);
      return;
    }
    
    // Additional safety check for individual texture validity
    const validTextures = this.boss.animations.bolt.filter(texture => texture && texture.valid);
    if (validTextures.length === 0) {
      debugLog('❌ All bolt textures are invalid or null', logCategory);
      return;
    }
    
    // Create projectile sprite starting with random frame from valid textures
    const randomFrame = Math.floor(Math.random() * validTextures.length);
    const selectedTexture = validTextures[randomFrame];
    const projectileSprite = new PIXI.Sprite(selectedTexture);
    
    // Additional null check for the created sprite
    if (!projectileSprite) {
      debugLog('❌ Failed to create bolt projectile sprite', logCategory);
      return;
    }
    
    projectileSprite.anchor.set(0.5, 0.5);
    
    // Scale bolt sprite (1600x650 is very large, scale it down significantly)
    const targetWidth = 200;  // Reasonable width for projectile
    const targetHeight = 81;  // Maintain aspect ratio (1600x650 ratio)
    const scaleX = targetWidth / 1600;
    const scaleY = targetHeight / 650;
    projectileSprite.scale.set(scaleX, scaleY);
    
    // Handle projectile direction based on boss direction
    const isMovingLeft = this.boss.direction === 'left';
    if (isMovingLeft) {
      // Flip horizontally for left-facing projectile
      projectileSprite.scale.x = -Math.abs(scaleX);
      debugLog('🔄 Bolt projectile flipped for left-facing attack', logCategory);
    } else {
      projectileSprite.scale.x = Math.abs(scaleX);
      debugLog('➡️ Bolt projectile using right-facing orientation', logCategory);
    }
    
    // Position projectile at boss front (during boss_atk_zap_bolt.png frame)
    const bossWidth = this.boss.sprite && this.boss.sprite.width ? this.boss.sprite.width : 100; // Default width if sprite is null
    
    // CORRECTED: Use relative position to boss container, positioned in front of sprite
    const relativeX = (isMovingLeft ? -bossWidth * 0.25 : bossWidth * 0.25); // More in front of boss (25% of width)
    const relativeY = 0; // Same Y as boss (0 relative to boss container)
    
    debugLog(`🔍 Boss position: (${this.boss.position.x}, ${this.boss.position.y}), bossWidth: ${bossWidth}, direction: ${isMovingLeft ? 'left' : 'right'}`, logCategory);
    debugLog(`🔧 Using relative position: (${relativeX}, ${relativeY}) - positioned in front of sprite`, logCategory);
    
    projectileSprite.position.set(relativeX, relativeY);
    
    // Add projectile to container with safety checks
    const parentContainer = this.boss.sprite && this.boss.sprite.parent;
    if (parentContainer && !parentContainer.destroyed) {
      parentContainer.addChild(projectileSprite);
      projectileSprite.zIndex = 999; // In front of most things but behind UI
      
      debugLog(`🔫 Bolt projectile created at relative (${relativeX}, ${relativeY}) - Boss at (${this.boss.position.x}, ${this.boss.position.y})`, logCategory);
      debugLog(`📏 Bolt projectile size: ${targetWidth}x${targetHeight} (scale: ${Math.abs(scaleX).toFixed(3)}, ${scaleY.toFixed(3)})`, logCategory);
      debugLog(`🏗️ Container info: name="${parentContainer.name || 'unnamed'}", position=(${parentContainer.position.x}, ${parentContainer.position.y})`, logCategory);
      debugLog(`🎯 Projectile world position: (${projectileSprite.position.x}, ${projectileSprite.position.y})`, logCategory);
      debugLog(`📦 Boss container position: (${this.boss.container ? this.boss.container.position.x : 'no container'}, ${this.boss.container ? this.boss.container.position.y : 'no container'})`, logCategory);
      
      // Check if there's a parent container hierarchy issue
      let currentParent = parentContainer;
      let depth = 0;
      while (currentParent && depth < 5) {
        const transform = currentParent.transform;
        debugLog(`📋 Container hierarchy ${depth}: name="${currentParent.name || 'unnamed'}", position=(${currentParent.position.x}, ${currentParent.position.y}), scale=(${currentParent.scale.x}, ${currentParent.scale.y}), rotation=${currentParent.rotation}`, logCategory);
        if (transform) {
          debugLog(`🔄 Transform matrix ${depth}: tx=${transform.tx}, ty=${transform.ty}, a=${transform.a}, d=${transform.d}`, logCategory);
        }
        currentParent = currentParent.parent;
        depth++;
      }
      
      // Debug projectile anchor and texture info
      debugLog(`⚓ Projectile anchor: (${projectileSprite.anchor.x}, ${projectileSprite.anchor.y})`, logCategory);
      debugLog(`🖼️ Projectile texture: ${projectileSprite.texture ? `${projectileSprite.texture.width}x${projectileSprite.texture.height}` : 'no texture'}`, logCategory);
      
      // Debug app/stage info
      debugLog(`🎮 App stage position: (${this.app.stage.position.x}, ${this.app.stage.position.y})`, logCategory);
      debugLog(`🎮 App stage scale: (${this.app.stage.scale.x}, ${this.app.stage.scale.y})`, logCategory);
      debugLog(`📱 App screen size: ${this.app.screen.width}x${this.app.screen.height}`, logCategory);
      
      // Check actual screen coordinates
      const globalPos = projectileSprite.toGlobal(new PIXI.Point(0, 0));
      debugLog(`🌍 Projectile global screen position: (${globalPos.x}, ${globalPos.y})`, logCategory);
      
      // Check boss sprite screen position for comparison
      if (this.boss.sprite) {
        const bossGlobalPos = this.boss.sprite.toGlobal(new PIXI.Point(0, 0));
        debugLog(`👹 Boss global screen position: (${bossGlobalPos.x}, ${bossGlobalPos.y})`, logCategory);
      }
    } else {
      debugLog('❌ Failed to add bolt projectile to container - parent container is null or destroyed', logCategory);
      projectileSprite.destroy();
      return;
    }
    
    // Animation and movement system
    let lastFrameTime = Date.now();
    const frameInterval = 30; // 30ms between frame changes
    
    // Movement parameters - simple horizontal movement
    const speed = 8; // Projectile speed (pixels per frame)
    const directionX = isMovingLeft ? -1 : 1; // Simple left (-1) or right (1) movement
    
    debugLog(`🎯 Bolt projectile direction: horizontal ${isMovingLeft ? 'left' : 'right'} (${directionX})`, logCategory);
    
    // Get camera/screen bounds for projectile travel
    const screenWidth = this.app.screen.width;
    const cameraX = this.app.stage.position.x || 0;
    
    // Calculate screen bounds in world coordinates
    const leftBound = -cameraX - 100; // Screen left edge with buffer
    const rightBound = -cameraX + screenWidth + 100; // Screen right edge with buffer
    
    debugLog(`🎯 Bolt projectile travel bounds: left=${leftBound}, right=${rightBound}`, logCategory);
    
    // Animation loop
    const animateProjectile = () => {
      // Safety check
      if (!projectileSprite || projectileSprite.destroyed) {
        debugLog('❌ Bolt projectile destroyed during animation', logCategory);
        return;
      }
      
      // Update frame animation every 30ms
      const now = Date.now();
      if (now - lastFrameTime >= frameInterval) {
        // Apply frame with random flip
        const shouldFlip = Math.random() < 0.5; // 50% chance to flip
        
        // Use validTextures array to ensure we get a valid texture
        const validTextures = this.boss.animations.bolt.filter(texture => texture && texture.valid);
        if (validTextures.length > 0) {
          const randomValidFrame = Math.floor(Math.random() * validTextures.length);
          const texture = validTextures[randomValidFrame];
          
          if (texture && !texture.destroyed) {
            projectileSprite.texture = texture;
                // Apply random flip while maintaining movement direction
          if (shouldFlip) {
            projectileSprite.scale.x = (isMovingLeft ? 1 : -1) * Math.abs(scaleX); // Flipped
          } else {
            projectileSprite.scale.x = (isMovingLeft ? -1 : 1) * Math.abs(scaleX); // Normal
          }
          }
        }
        
        lastFrameTime = now;
      }
      
      // Move projectile in straight horizontal line
      projectileSprite.position.x += speed * directionX;
      // Y position stays the same (no vertical movement)
      
      // Debug position tracking every few frames
      if (Math.random() < 0.01) { // 1% chance to log position (reduces spam)
        debugLog(`📍 Projectile position: (${projectileSprite.position.x.toFixed(1)}, ${projectileSprite.position.y.toFixed(1)})`, logCategory);
      }
      
      // Check if projectile has left the screen
      const projectileX = projectileSprite.position.x;
      const hasLeftScreen = isMovingLeft ? (projectileX < leftBound) : (projectileX > rightBound);
      
      if (hasLeftScreen) {
        // Projectile has left screen, destroy it
        debugLog(`🔫 Bolt projectile left screen at x=${projectileX}, destroying`, logCategory);
        try {
          if (projectileSprite.parent) {
            projectileSprite.parent.removeChild(projectileSprite);
          }
          projectileSprite.destroy();
        } catch (error) {
          debugLog(`⚠️ Error destroying bolt projectile: ${error.message}`, logCategory);
        }
        return;
      }
      
      // Continue animation
      requestAnimationFrame(animateProjectile);
    };
    
    // Start animation
    requestAnimationFrame(animateProjectile);
    debugLog('🚀 Bolt projectile animation started', logCategory);
  }

  /**
   * Special range attack sequence: fly → land → range (1.0s) → land + thunder → fly
   * Phase 1 (fly): Thunder strikes execute after range animation completes
   * Phase 2 (ground): Zap cone executes during range animation
   */
  startRangeAttackSequence(targetX = null, targetY = null) {
    const now = Date.now();
    this.boss.lastAttackTime = now;
    
    const logCategory = this.getAttackLogCategory('range');
    debugLog('⚡ Boss started RANGE attack sequence: fly → land (0.5s) → range (1.0s) → land (0.5s) + thunder → fly', logCategory);
    debugLog('⚡ NEW THUNDER STRIKE SYSTEM: 1 at character start position + 3 random, 50px hit radius', logCategory);
    
    // Enhanced boss state logging
    debugLog(`🎯 Range attack sequence initiated at time: ${now}`, logCategory);
    debugLog(`🎯 Boss current phase: ${this.boss.phase}, actualPhase: ${this.boss.actualPhase}`, logCategory);
    debugLog(`🎯 Boss position: (${this.boss.position.x.toFixed(1)}, ${this.boss.position.y.toFixed(1)})`, logCategory);
    debugLog(`🎯 Boss direction: ${this.boss.direction}`, logCategory);
    
    // Store original phase to return to it (use actualPhase, not temporary phase)
    const originalPhase = this.boss.actualPhase;
    this.boss.isAttacking = true;
    this.boss.attackType = 'rangeSequence'; // Use different identifier to avoid animation conflicts
    
    debugLog(`🎯 Original phase stored: ${originalPhase}`, logCategory);
    debugLog(`🎯 Boss attack state: isAttacking=${this.boss.isAttacking}, attackType=${this.boss.attackType}`, logCategory);
    
    // Enhanced target position calculation
    if (targetX === null || targetY === null) {
      const defaultOffset = this.boss.direction === 'right' ? 200 : -200;
      targetX = this.boss.position.x + defaultOffset;
      targetY = this.boss.position.y;
      debugLog(`🎯 Target position calculated: (${targetX.toFixed(1)}, ${targetY.toFixed(1)}) [offset: ${defaultOffset}]`, logCategory);
    } else {
      debugLog(`🎯 Target position provided: (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`, logCategory);
    }
    
    // Enhanced timeout management tracking
    const timeoutsBefore = this.attackSequenceTimeouts.length;
    debugLog(`🎯 Attack sequence timeouts before: ${timeoutsBefore}`, logCategory);
    
    // Step 1: Switch to land animation for 0.5 seconds
    this.boss.phase = 'ground'; // Temporary phase change for animation
    this.boss.frameIndices.land = 0;
    debugLog('⚡ Range sequence step 1: Switching to LAND animation for 0.5s', logCategory);
    debugLog(`🎯 Boss phase changed: ${originalPhase} → ground`, logCategory);
    
    const timeout1 = setTimeout(() => {
      if (this.boss.activeAttackSequence !== 'range') {
        debugLog('Range sequence step 1: sequence cancelled', logCategory);
        return;
      }
      
      // Step 2: Switch to range animation (boss_atk_range.png) for 1.0 seconds
      this.boss.sprite.texture = this.boss.animations.range[0]; // boss_atk_range.png
      debugLog('Range sequence step 2: Switching to boss_atk_range.png for 1.0s', logCategory);
      debugLog(`🎯 Range texture applied: ${this.boss.animations.range[0].width}x${this.boss.animations.range[0].height}`, logCategory);
      
      // Execute range attack effects (only for Phase 2 - Phase 1 thunder strikes will execute later)
      debugLog('🎯 Executing range attack effects', logCategory);
      this.executeRangeAttackSequence(targetX, targetY);
      
      const timeout2 = setTimeout(() => {
        if (this.boss.activeAttackSequence !== 'range') {
          debugLog('Range sequence step 2: sequence cancelled', logCategory);
          return;
        }
        
        // Step 3: Switch back to land animation for 0.5 seconds
        this.boss.phase = 'ground';
        this.boss.frameIndices.land = 0;
        debugLog('Range sequence step 3: Switching back to LAND animation for 0.5s', logCategory);
        
        // Execute Phase 1 thunder strikes AFTER range animation completes
        if (originalPhase === 'fly' && this.boss.storedCharacterPosition) {
          debugLog('🎯 Phase 1 attack: Executing thunder strikes after range animation', logCategory);
          this.executeThunderAttack(this.boss.storedCharacterPosition);
          // Clear stored position
          this.boss.storedCharacterPosition = null;
        }
        
        const timeout3 = setTimeout(() => {
          if (this.boss.activeAttackSequence !== 'range') {
            debugLog('Range sequence step 3: sequence cancelled', logCategory);
            return;
          }
          
          // Step 4: Return to original phase (fly)
          this.boss.phase = originalPhase;
          this.boss.frameIndices[originalPhase] = 0;
          this.boss.isAttacking = false;
          this.boss.activeAttackSequence = null; // Clear active sequence
          debugLog('Range sequence step 4: Returning to original phase - sequence complete', logCategory);
          debugLog(`🎯 Boss phase restored: ground → ${originalPhase}`, logCategory);
          debugLog(`🎯 Boss attack state cleared: isAttacking=${this.boss.isAttacking}, activeAttackSequence=${this.boss.activeAttackSequence}`, logCategory);
          
          const totalTime = Date.now() - now;
          debugLog(`🎯 Range attack sequence completed in ${totalTime}ms`, logCategory);
        }, 500); // 0.5 seconds
        
        this.attackSequenceTimeouts.push(timeout3);
      }, 1000); // 1.0 second for range animation (changed from 500ms)
      
      this.attackSequenceTimeouts.push(timeout2);
    }, 500); // 0.5 seconds
    
    this.attackSequenceTimeouts.push(timeout1);
    
    const timeoutsAfter = this.attackSequenceTimeouts.length;
    debugLog(`🎯 Attack sequence timeouts after: ${timeoutsBefore} → ${timeoutsAfter} (+${timeoutsAfter - timeoutsBefore})`, logCategory);
  }

  /**
   * Execute range attack effects for sequence
   */
  executeRangeAttackSequence(targetX, targetY) {
    // Enhanced audio feedback
    this.boss.audioManager.playRangeChargeSound();
    
    // Enhanced phase detection and logging
    const currentPhase = this.boss.actualPhase || this.boss.phase;
    const logCategory = this.getAttackLogCategory('range');
    debugLog(`🎯 RANGE ATTACK: Boss in ${currentPhase} phase`, logCategory);
    debugLog(`🎯 Range attack target: (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`, logCategory);
    debugLog(`🎯 Range attack execution time: ${Date.now()}`, logCategory);
    
    // Enhanced phase-specific attack selection
    if (currentPhase === 'fly') {
      // Phase 1 (Fly): Thunder attack
      debugLog('🎯 Executing Phase 1 range attack: Thunder strikes', logCategory);
      this.executePhaseOneRangeAttack();
    } else if (currentPhase === 'ground') {
      // Phase 2 (Ground): Zap cone attack
      debugLog('🎯 Executing Phase 2 range attack: Zap cone', logCategory);
      this.executePhaseTwoRangeAttack();
    } else {
      // Default to phase 1 attack
      debugLog(`⚠️ Unknown phase ${currentPhase}, defaulting to thunder attack`, logCategory);
      this.executePhaseOneRangeAttack();
    }
  }

  /**
   * Phase 1 Range Attack: Thunder strikes
   */
  executePhaseOneRangeAttack() {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('⚡ Executing PHASE 1 range attack: Thunder strikes (delayed until after range animation)', logCategory);
    
    // Enhanced boss container hierarchy debugging
    debugLog(`⚡ Boss container hierarchy check - Boss at (${this.boss.position.x}, ${this.boss.position.y})`, logCategory);
    if (this.boss.sprite && this.boss.sprite.parent) {
      debugLog(`⚡ Boss sprite parent container: ${this.boss.sprite.parent.constructor.name}`, logCategory);
      debugLog(`⚡ Boss sprite parent destroyed: ${this.boss.sprite.parent.destroyed}`, logCategory);
      debugLog(`⚡ Boss sprite parent position: (${this.boss.sprite.parent.position.x}, ${this.boss.sprite.parent.position.y})`, logCategory);
    } else {
      debugLog('❌ Boss sprite or parent container not available', logCategory);
    }
    
    // Enhanced character position logging with detailed calculations
    let characterPosition = { x: this.boss.position.x + 200, y: this.boss.position.y }; // Default fallback
    
    if (window.gameMapManager && window.gameMapManager.character) {
      const character = window.gameMapManager.character;
      characterPosition = { x: character.position.x, y: character.position.y };
      
      // Calculate distance from boss to character
      const distanceX = Math.abs(character.position.x - this.boss.position.x);
      const distanceY = Math.abs(character.position.y - this.boss.position.y);
      const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
      
      debugLog(`⚡ THUNDER ATTACK: Character feet logged at (${characterPosition.x}, ${characterPosition.y})`, logCategory);
      debugLog(`⚡ Boss-Character distance: X=${distanceX.toFixed(1)}, Y=${distanceY.toFixed(1)}, Total=${totalDistance.toFixed(1)}`, logCategory);
      
      // Enhanced character sprite information
      if (character.sprite) {
        debugLog(`⚡ Character sprite size: ${character.sprite.width}x${character.sprite.height}`, logCategory);
        debugLog(`⚡ Character sprite scale: (${character.sprite.scale.x}, ${character.sprite.scale.y})`, logCategory);
      }
    } else {
      debugLog('⚠️ Character not found for thunder attack positioning', logCategory);
    }
    
    // Store character position for later use (thunder strikes will execute after range animation)
    this.boss.storedCharacterPosition = characterPosition;
    
    // Initialize thunder debug tracking data
    if (!window.thunderDebugData) {
      window.thunderDebugData = {};
    }
    
    // Store attack start data for debug tracking
    const currentPhase = this.boss.actualPhase || this.boss.phase;
    const distanceFromBoss = Math.sqrt(
      Math.pow(characterPosition.x - this.boss.position.x, 2) + 
      Math.pow(characterPosition.y - this.boss.position.y, 2)
    );
    
    window.thunderDebugData.lastAttackTime = Date.now();
    window.thunderDebugData.attackStartData = {
      bossX: this.boss.position.x,
      bossY: this.boss.position.y,
      characterX: characterPosition.x,
      characterY: characterPosition.y,
      distance: distanceFromBoss,
      phase: currentPhase
    };
    window.thunderDebugData.strikePositions = [];
    window.thunderDebugData.characterHitData = null;
    
    debugLog(`⚡ Thunder debug data initialized - Boss: (${this.boss.position.x.toFixed(1)}, ${this.boss.position.y.toFixed(1)}), Character: (${characterPosition.x.toFixed(1)}, ${characterPosition.y.toFixed(1)})`, logCategory);
    
    // Enhanced attack timing and sequence management
    debugLog(`⚡ Thunder attack sequence timing - Current time: ${Date.now()}`, logCategory);
    debugLog(`⚡ Thunder attack sequence - Active timeouts: ${this.attackSequenceTimeouts.length}`, logCategory);
    debugLog(`⚡ Character position stored for thunder strikes: (${characterPosition.x}, ${characterPosition.y})`, logCategory);
    debugLog(`⚡ Thunder strikes will execute AFTER range animation completes (1 second delay)`, logCategory);
    
    // NO IMMEDIATE THUNDER EXECUTION - thunder strikes will be triggered from step 3 of the sequence
  }

  /**
   * Phase 2 Range Attack: Zap cone
   */
  executePhaseTwoRangeAttack() {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('🌀 Executing PHASE 2 range attack: Zap cone', logCategory);
    
    // Enhanced boss state and positioning debugging
    debugLog(`🌀 Boss phase 2 range attack - Boss at (${this.boss.position.x}, ${this.boss.position.y})`, logCategory);
    debugLog(`🌀 Boss direction: ${this.boss.direction}`, logCategory);
    debugLog(`🌀 Boss sprite dimensions: ${this.boss.sprite.width}x${this.boss.sprite.height}`, logCategory);
    
    // Enhanced texture validation with detailed checks
    if (!this.boss.animations.zapCone || this.boss.animations.zapCone.length < 3) {
      debugLog('❌ Zap cone textures not found - need zap_cone1.png, zap_cone2.png, zap_cone3.png', logCategory);
      debugLog(`❌ Available zap cone textures: ${this.boss.animations.zapCone ? this.boss.animations.zapCone.length : 0}`, logCategory);
      return;
    }
    
    // Enhanced texture validation for each frame
    for (let i = 0; i < this.boss.animations.zapCone.length; i++) {
      const texture = this.boss.animations.zapCone[i];
      debugLog(`🌀 Zap cone texture ${i + 1}: valid=${texture && !texture.destroyed && texture.valid}`, logCategory);
      if (texture && !texture.destroyed && texture.valid) {
        debugLog(`🌀 Zap cone texture ${i + 1} size: ${texture.width}x${texture.height}`, logCategory);
      }
    }
    
    // Enhanced container hierarchy debugging
    if (this.boss.sprite && this.boss.sprite.parent) {
      debugLog(`🌀 Boss sprite parent container: ${this.boss.sprite.parent.constructor.name}`, logCategory);
      debugLog(`🌀 Boss sprite parent destroyed: ${this.boss.sprite.parent.destroyed}`, logCategory);
      debugLog(`🌀 Boss sprite parent children count: ${this.boss.sprite.parent.children.length}`, logCategory);
    }
    
    // Start zap cone animation immediately (no delay for phase 2)
    debugLog('🌀 Starting zap cone creation immediately (no delay for phase 2)', logCategory);
    this.createZapConeAttack();
  }

  /**
   * Create zap cone attack animation
   */
  createZapConeAttack() {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('🌀 Creating zap cone attack animation', logCategory);
    
    // Enhanced random frame selection with detailed logging
    const randomFrame = Math.floor(Math.random() * 3); // 0, 1, or 2
    debugLog(`🌀 Selected random zap cone frame: ${randomFrame + 1} (out of 3)`, logCategory);
    
    const coneTexture = this.boss.animations.zapCone[randomFrame];
    
    // Enhanced texture validation
    if (!coneTexture || coneTexture.destroyed || !coneTexture.valid) {
      debugLog('❌ Zap cone texture invalid', logCategory);
      debugLog(`❌ Texture state: exists=${!!coneTexture}, destroyed=${coneTexture?.destroyed}, valid=${coneTexture?.valid}`, logCategory);
      return;
    }
    
    debugLog(`🌀 Zap cone texture loaded: ${coneTexture.width}x${coneTexture.height}`, logCategory);
    
    // Enhanced sprite creation with detailed logging
    const coneSprite = new PIXI.Sprite(coneTexture);
    debugLog('🌀 Zap cone sprite created successfully', logCategory);
    
    coneSprite.anchor.set(0.0, 1.0); // Bottom-left anchor (cone emanates from boss)
    debugLog('🌀 Zap cone anchor set to bottom-left (0.0, 1.0)', logCategory);
    
    // Enhanced scaling calculations with detailed logging
    const bossWidth = this.boss.sprite.width;
    const bossHeight = this.boss.sprite.height;
    const targetWidth = bossWidth * 2.5; // 2.5x boss width
    const targetHeight = bossHeight * 2.0; // 2x boss height
    const originalWidth = 4090; // Original zap cone texture width
    const originalHeight = 3112; // Original zap cone texture height
    const scaleX = targetWidth / originalWidth;
    const scaleY = targetHeight / originalHeight;
    
    debugLog(`🌀 Zap cone scaling calculation:`, logCategory);
    debugLog(`🌀 - Boss size: ${bossWidth}x${bossHeight}`, logCategory);
    debugLog(`🌀 - Target size: ${targetWidth}x${targetHeight}`, logCategory);
    debugLog(`🌀 - Original texture: ${originalWidth}x${originalHeight}`, logCategory);
    debugLog(`🌀 - Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`, logCategory);
    
    // Enhanced direction handling with detailed logging
    const isLeftFacing = this.boss.direction === 'left';
    debugLog(`🌀 Boss direction: ${this.boss.direction} (isLeftFacing: ${isLeftFacing})`, logCategory);
    
    if (isLeftFacing) {
      // Flip horizontally for left-facing boss
      coneSprite.scale.set(-Math.abs(scaleX), scaleY);
      debugLog('🔄 Zap cone flipped for left-facing boss', logCategory);
      debugLog(`🔄 Applied scale: X=${-Math.abs(scaleX).toFixed(4)}, Y=${scaleY.toFixed(4)}`, logCategory);
    } else {
      // Normal right-facing orientation
      coneSprite.scale.set(scaleX, scaleY);
      debugLog('➡️ Zap cone using right-facing orientation', logCategory);
      debugLog(`➡️ Applied scale: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`, logCategory);
    }
    
    // Enhanced positioning calculations with detailed logging
    const frontOffset = isLeftFacing ? -bossWidth * 0.3 : bossWidth * 0.3; // 30% boss width forward
    const topOffset = -bossHeight * 0.4; // 40% boss height upward
    const coneX = this.boss.position.x + frontOffset;
    const coneY = this.boss.position.y + topOffset;
    
    debugLog(`🌀 Zap cone positioning calculation:`, logCategory);
    debugLog(`🌀 - Boss position: (${this.boss.position.x}, ${this.boss.position.y})`, logCategory);
    debugLog(`🌀 - Front offset: ${frontOffset.toFixed(1)} (${isLeftFacing ? 'left' : 'right'})`, logCategory);
    debugLog(`🌀 - Top offset: ${topOffset.toFixed(1)} (upward)`, logCategory);
    debugLog(`🌀 - Final cone position: (${coneX.toFixed(1)}, ${coneY.toFixed(1)})`, logCategory);
    
    coneSprite.position.set(coneX, coneY);
    
    // Enhanced final sprite measurements
    const finalWidth = Math.abs(coneSprite.width);
    const finalHeight = coneSprite.height;
    debugLog(`🌀 Zap cone final measurements:`, logCategory);
    debugLog(`🌀 - Final size: ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}`, logCategory);
    debugLog(`🌀 - Scale applied: ${coneSprite.scale.x.toFixed(4)}, ${coneSprite.scale.y.toFixed(4)}`, logCategory);
    
    // Enhanced container addition with detailed error handling
    if (this.boss.sprite.parent && !this.boss.sprite.parent.destroyed) {
      debugLog(`🌀 Adding zap cone to container: ${this.boss.sprite.parent.constructor.name}`, logCategory);
      debugLog(`🌀 Container children before add: ${this.boss.sprite.parent.children.length}`, logCategory);
      
      try {
        this.boss.sprite.parent.addChild(coneSprite);
        coneSprite.zIndex = 950; // Above most game elements
        
        debugLog(`🌀 Zap cone added successfully - zIndex: ${coneSprite.zIndex}`, logCategory);
        debugLog(`🌀 Container children after add: ${this.boss.sprite.parent.children.length}`, logCategory);
        
        // Start animation with frame changes
        debugLog('🌀 Starting zap cone animation sequence', logCategory);
        this.animateZapCone(coneSprite, randomFrame);
        
      } catch (error) {
        debugLog(`❌ Error adding zap cone to container: ${error.message}`, logCategory);
        debugLog(`❌ Error stack: ${error.stack}`, logCategory);
        coneSprite.destroy();
        return;
      }
    } else {
      debugLog('❌ Failed to add zap cone to container - parent is null or destroyed', logCategory);
      if (this.boss.sprite.parent) {
        debugLog(`❌ Parent destroyed state: ${this.boss.sprite.parent.destroyed}`, logCategory);
      } else {
        debugLog('❌ Parent container is null', logCategory);
      }
      coneSprite.destroy();
      return;
    }
  }

  /**
   * Animate zap cone with random frame changes
   */
  animateZapCone(coneSprite, startFrame) {
    let currentFrame = startFrame;
    let lastFrameTime = Date.now();
    const frameInterval = 30; // 30ms between frame changes
    const animationDuration = 2000; // 2 seconds total animation
    const startTime = Date.now();
    
    const logCategory = this.getAttackLogCategory('range');
    debugLog('🌀 Starting zap cone animation with random frame changes', logCategory);
    debugLog(`🌀 Animation parameters: duration=${animationDuration}ms, frameInterval=${frameInterval}ms`, logCategory);
    debugLog(`🌀 Starting frame: ${startFrame + 1}, startTime: ${startTime}`, logCategory);
    
    // Enhanced frame change tracking
    let frameChangeCount = 0;
    let lastLogTime = startTime;
    const logInterval = 500; // Log every 500ms during animation
    
    const animateFrame = () => {
      // Enhanced safety checks with detailed logging
      if (!coneSprite || coneSprite.destroyed) {
        debugLog('❌ Zap cone destroyed during animation', logCategory);
        debugLog(`❌ Animation cancelled after ${frameChangeCount} frame changes`, logCategory);
        return;
      }
      
      const now = Date.now();
      const elapsed = now - startTime;
      
      // Enhanced progress logging
      if (now - lastLogTime >= logInterval) {
        const progress = (elapsed / animationDuration * 100).toFixed(1);
        debugLog(`🌀 Zap cone animation progress: ${progress}% (${elapsed}ms elapsed)`, logCategory);
        debugLog(`🌀 Current frame: ${currentFrame + 1}, frame changes: ${frameChangeCount}`, logCategory);
        lastLogTime = now;
      }
      
      // Check if animation should end
      if (elapsed >= animationDuration) {
        // Enhanced animation completion logging
        debugLog('🌀 Zap cone animation complete - checking for character damage', logCategory);
        debugLog(`🌀 Total animation time: ${elapsed}ms, frame changes: ${frameChangeCount}`, logCategory);
        
        this.checkZapConeDamage(coneSprite);
        
        // Enhanced cleanup with detailed logging
        setTimeout(() => {
          if (coneSprite && !coneSprite.destroyed) {
            try {
              const parentContainer = coneSprite.parent;
              if (parentContainer) {
                debugLog(`🌀 Removing zap cone from container: ${parentContainer.constructor.name}`, logCategory);
                debugLog(`🌀 Container children before removal: ${parentContainer.children.length}`, logCategory);
                parentContainer.removeChild(coneSprite);
                debugLog(`🌀 Container children after removal: ${parentContainer.children.length}`, logCategory);
              } else {
                debugLog('🌀 Zap cone has no parent container for removal', logCategory);
              }
              
              coneSprite.destroy();
              debugLog('🌀 Zap cone destroyed after animation', logCategory);
            } catch (error) {
              debugLog(`⚠️ Error destroying zap cone: ${error.message}`, logCategory);
              debugLog(`⚠️ Error stack: ${error.stack}`, logCategory);
            }
          } else {
            debugLog('🌀 Zap cone already destroyed or null', logCategory);
          }
        }, 200);
        return;
      }
      
      // Enhanced frame update with detailed logging
      if (now - lastFrameTime >= frameInterval) {
        const previousFrame = currentFrame;
        // Randomly change frame
        currentFrame = Math.floor(Math.random() * 3);
        
        const newTexture = this.boss.animations.zapCone[currentFrame];
        if (newTexture && !newTexture.destroyed) {
          coneSprite.texture = newTexture;
          frameChangeCount++;
          
          if (currentFrame !== previousFrame) {
            debugLog(`🌀 Frame changed: ${previousFrame + 1} → ${currentFrame + 1} (total changes: ${frameChangeCount})`, logCategory);
          }
        } else {
          debugLog(`❌ Invalid texture for frame ${currentFrame + 1}`, logCategory);
        }
        
        lastFrameTime = now;
      }
      
      // Continue animation
      requestAnimationFrame(animateFrame);
    };
    
    // Start animation
    debugLog('🌀 Starting requestAnimationFrame loop', logCategory);
    requestAnimationFrame(animateFrame);
  }

  /**
   * Check if character is within zap cone damage area
   */
  checkZapConeDamage(coneSprite) {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('🌀 Checking zap cone damage collision', logCategory);
    
    if (!window.gameMapManager || !window.gameMapManager.character) {
      debugLog('⚠️ Character not found for zap cone damage check', logCategory);
      debugLog('⚠️ gameMapManager or character is null/undefined', logCategory);
      return;
    }
    
    const character = window.gameMapManager.character;
    const characterX = character.position.x;
    const characterY = character.position.y;
    
    debugLog(`🌀 Character position for damage check: (${characterX.toFixed(1)}, ${characterY.toFixed(1)})`, logCategory);
    
    // Enhanced bounds calculation with detailed logging
    const coneBounds = coneSprite.getBounds();
    debugLog(`🌀 Zap cone bounds: x=${coneBounds.x.toFixed(1)}, y=${coneBounds.y.toFixed(1)}, w=${coneBounds.width.toFixed(1)}, h=${coneBounds.height.toFixed(1)}`, logCategory);
    
    // Enhanced collision detection with detailed logging
    const leftBound = coneBounds.x;
    const rightBound = coneBounds.x + coneBounds.width;
    const topBound = coneBounds.y;
    const bottomBound = coneBounds.y + coneBounds.height;
    
    debugLog(`🌀 Collision bounds: left=${leftBound.toFixed(1)}, right=${rightBound.toFixed(1)}, top=${topBound.toFixed(1)}, bottom=${bottomBound.toFixed(1)}`, logCategory);
    
    const isInConeX = characterX >= leftBound && characterX <= rightBound;
    const isInConeY = characterY >= topBound && characterY <= bottomBound;
    let isInCone = isInConeX && isInConeY;
    
    debugLog(`🌀 Collision check: X=${isInConeX} (${characterX.toFixed(1)} in ${leftBound.toFixed(1)}-${rightBound.toFixed(1)})`, logCategory);
    debugLog(`🌀 Collision check: Y=${isInConeY} (${characterY.toFixed(1)} in ${topBound.toFixed(1)}-${bottomBound.toFixed(1)})`, logCategory);
    debugLog(`🌀 Final collision result: ${isInCone}`, logCategory);
    
    // Enhanced character size consideration
    if (character.sprite) {
      const charWidth = character.sprite.width;
      const charHeight = character.sprite.height;
      debugLog(`🌀 Character sprite size: ${charWidth}x${charHeight}`, logCategory);
      
      // Check character center point as well
      const charCenterX = characterX + charWidth / 2;
      const charCenterY = characterY + charHeight / 2;
      const isCenterInCone = charCenterX >= leftBound && charCenterX <= rightBound &&
                             charCenterY >= topBound && charCenterY <= bottomBound;
      
      debugLog(`🌀 Character center: (${charCenterX.toFixed(1)}, ${charCenterY.toFixed(1)})`, logCategory);
      debugLog(`🌀 Character center in cone: ${isCenterInCone}`, logCategory);
      
      if (isCenterInCone && !isInCone) {
        debugLog('🌀 Character center is in cone but position is not - using center collision', logCategory);
        isInCone = true;
      }
    }
    
    if (isInCone) {
      debugLog(`💥 ZAP CONE HIT CHARACTER at (${characterX.toFixed(1)}, ${characterY.toFixed(1)})!`, logCategory);
      debugLog(`💥 Damage will be applied to character`, logCategory);
      
      // Enhanced damage application with invulnerability check
      if (isInvulnerable()) {
        debugLog('🛡️ Character is invulnerable - damage blocked', logCategory);
      } else {
        debugLog('💥 Applying zap cone damage to character', logCategory);
        this.damageCharacter();
      }
    } else {
      debugLog(`🌀 Character avoided zap cone attack at (${characterX.toFixed(1)}, ${characterY.toFixed(1)})`, logCategory);
      const distanceFromCone = Math.sqrt(
        Math.pow(Math.max(0, leftBound - characterX, characterX - rightBound), 2) +
        Math.pow(Math.max(0, topBound - characterY, characterY - bottomBound), 2)
      );
      debugLog(`🌀 Distance from cone: ${distanceFromCone.toFixed(1)} pixels`, logCategory);
    }
  }

  /**
   * Execute thunder attack with multiple strike locations
   */
  executeThunderAttack(characterPosition) {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('⚡ Executing THUNDER ATTACK with multiple strikes', logCategory);
    
    // Enhanced safety checks with detailed logging
    if (!this.boss.animations.thunder || !this.boss.animations.thunder[0]) {
      debugLog('❌ Thunder texture not found - need thunder.png', logCategory);
      debugLog(`❌ Thunder animations available: ${this.boss.animations.thunder ? 'exists' : 'null'}`, logCategory);
      if (this.boss.animations.thunder) {
        debugLog(`❌ Thunder animations length: ${this.boss.animations.thunder.length}`, logCategory);
      }
      return;
    }
    
    const thunderTexture = this.boss.animations.thunder[0];
    debugLog(`⚡ Thunder texture loaded: ${thunderTexture.width}x${thunderTexture.height}`, logCategory);
    debugLog(`⚡ Thunder texture state: destroyed=${thunderTexture.destroyed}, valid=${thunderTexture.valid}`, logCategory);
    
    // Enhanced character sprite size detection
    let characterHeight = 64; // Default character height
    if (window.gameMapManager && window.gameMapManager.character && window.gameMapManager.character.sprite) {
      const characterSprite = window.gameMapManager.character.sprite;
      characterHeight = characterSprite.height;
      debugLog(`📏 Character sprite detected: ${characterSprite.width}x${characterSprite.height}`, logCategory);
      debugLog(`📏 Character sprite scale: (${characterSprite.scale.x}, ${characterSprite.scale.y})`, logCategory);
      debugLog(`📏 Character sprite position: (${characterSprite.position.x}, ${characterSprite.position.y})`, logCategory);
    } else {
      debugLog('📏 Character sprite not found - using default height: 64px', logCategory);
    }
    
    // Enhanced thunder scaling calculations with detailed logging
    const thunderOriginalWidth = 4090;
    const thunderOriginalHeight = 3112;
    const targetHeight = characterHeight * 0.75; // 0.75x character height (2x smaller than previous 1.5x)
    const targetWidth = (thunderOriginalWidth / thunderOriginalHeight) * targetHeight; // Maintain aspect ratio
    const scaleX = targetWidth / thunderOriginalWidth;
    const scaleY = targetHeight / thunderOriginalHeight;
    
    debugLog(`⚡ Thunder scaling calculation:`, logCategory);
    debugLog(`⚡ - Original thunder texture: ${thunderOriginalWidth}x${thunderOriginalHeight}`, logCategory);
    debugLog(`⚡ - Character height: ${characterHeight}px`, logCategory);
    debugLog(`⚡ - Target size: ${targetWidth.toFixed(1)}x${targetHeight.toFixed(1)} (0.75x character height)`, logCategory);
    debugLog(`⚡ - Scale factors: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`, logCategory);
    
    // Enhanced attack locations with detailed screen bounds analysis
    const attackLocations = [];
    
    // 1. Character position (primary target)
    attackLocations.push({
      x: characterPosition.x,
      y: characterPosition.y,
      type: 'character'
    });
    
    debugLog(`⚡ Primary target (character): (${characterPosition.x.toFixed(1)}, ${characterPosition.y.toFixed(1)})`, logCategory);
    
    // 2-4. Three random screen positions for dramatic effect
    const screenBounds = this.getScreenBounds();
    debugLog(`⚡ Screen bounds: left=${screenBounds.left.toFixed(1)}, right=${screenBounds.right.toFixed(1)}, top=${screenBounds.top.toFixed(1)}, bottom=${screenBounds.bottom.toFixed(1)}`, logCategory);
    debugLog(`⚡ Screen dimensions: ${(screenBounds.right - screenBounds.left).toFixed(1)}x${(screenBounds.bottom - screenBounds.top).toFixed(1)}`, logCategory);
    
    for (let i = 0; i < 3; i++) {
      const randomX = screenBounds.left + Math.random() * (screenBounds.right - screenBounds.left);
      const randomY = screenBounds.top + Math.random() * (screenBounds.bottom - screenBounds.top);
      
      attackLocations.push({
        x: randomX,
        y: randomY,
        type: 'random'
      });
      
      debugLog(`⚡ Random strike ${i + 1}: (${randomX.toFixed(1)}, ${randomY.toFixed(1)})`, logCategory);
    }
    
    debugLog(`⚡ Thunder strike locations: ${attackLocations.length} total`, logCategory);
    
    // Update thunder debug data with strike positions
    if (window.thunderDebugData && window.thunderDebugData.strikePositions) {
      window.thunderDebugData.strikePositions = attackLocations.map(location => ({
        x: location.x,
        y: location.y,
        type: location.type
      }));
      
      debugLog(`⚡ Thunder debug data updated with ${attackLocations.length} strike positions`, logCategory);
    }
    
    // Enhanced container hierarchy check
    if (this.boss.sprite && this.boss.sprite.parent) {
      debugLog(`⚡ Thunder strikes will be added to container: ${this.boss.sprite.parent.constructor.name}`, logCategory);
      debugLog(`⚡ Container children before strikes: ${this.boss.sprite.parent.children.length}`, logCategory);
      debugLog(`⚡ Container position: (${this.boss.sprite.parent.position.x}, ${this.boss.sprite.parent.position.y})`, logCategory);
    }
    
    // Enhanced attack timing with detailed logging
    debugLog(`⚡ Thunder strikes will be staggered by 100ms each`, logCategory);
    const startTime = Date.now();
    
    // Create thunder strikes at all locations
    attackLocations.forEach((location, index) => {
      const strikeDelay = index * 100; // Stagger strikes by 100ms each
      debugLog(`⚡ Scheduling thunder strike ${index + 1} at (${location.x.toFixed(1)}, ${location.y.toFixed(1)}) with ${strikeDelay}ms delay`, logCategory);
      
      const strikeTimeout = setTimeout(() => {
        if (this.boss.phase === 'dead') {
          debugLog(`⚡ Thunder strike ${index + 1} cancelled - boss is dead`, logCategory);
          return;
        }
        debugLog(`⚡ Executing thunder strike ${index + 1} at time ${Date.now() - startTime}ms`, logCategory);
        this.createThunderStrike(location.x, location.y, scaleX, scaleY, location.type, index);
      }, strikeDelay);
      
      this.attackSequenceTimeouts.push(strikeTimeout);
    });
    
    debugLog(`⚡ All thunder strikes scheduled - total timeouts: ${this.attackSequenceTimeouts.length}`, logCategory);
  }

  /**
   * Create individual thunder strike
   */
  createThunderStrike(x, y, scaleX, scaleY, strikeType, index) {
    const logCategory = this.getAttackLogCategory('range');
    debugLog(`⚡ Creating thunder strike ${index + 1} at (${x.toFixed(1)}, ${y.toFixed(1)}) [${strikeType}]`, logCategory);
    
    // Enhanced texture validation - now checking all thunder frames
    const thunderTextures = this.boss.animations.thunder;
    if (!thunderTextures || thunderTextures.length === 0) {
      debugLog('❌ No thunder textures available', logCategory);
      return;
    }
    
    // Validate all thunder frames
    const validFrames = [];
    for (let i = 0; i < thunderTextures.length; i++) {
      const texture = thunderTextures[i];
      if (texture && !texture.destroyed && texture.valid) {
        validFrames.push(i);
      }
    }
    
    if (validFrames.length === 0) {
      debugLog('❌ No valid thunder texture frames found', logCategory);
      return;
    }
    
    debugLog(`⚡ Found ${validFrames.length} valid thunder frames: [${validFrames.join(', ')}]`, logCategory);
    
    // Start with random frame
    const initialFrameIndex = validFrames[Math.floor(Math.random() * validFrames.length)];
    const initialTexture = thunderTextures[initialFrameIndex];
    
    debugLog(`⚡ Thunder texture frame ${initialFrameIndex} selected (${initialTexture.width}x${initialTexture.height})`, logCategory);
    
    // Enhanced sprite creation with detailed logging
    const thunderSprite = new PIXI.Sprite(initialTexture);
    debugLog(`⚡ Thunder sprite ${index + 1} created successfully with frame ${initialFrameIndex}`, logCategory);
    
    thunderSprite.anchor.set(0.5, 0.5); // Center anchor for better visibility on character
    debugLog(`⚡ Thunder sprite ${index + 1} anchor set to center (0.5, 0.5)`, logCategory);
    
    // Enhanced scaling with detailed logging
    thunderSprite.scale.set(scaleX, scaleY);
    debugLog(`⚡ Thunder sprite ${index + 1} initial scale: X=${scaleX.toFixed(4)}, Y=${scaleY.toFixed(4)}`, logCategory);
    
    // Enhanced random flip with detailed logging
    const shouldFlip = Math.random() < 0.5;
    if (shouldFlip) {
      thunderSprite.scale.x = -Math.abs(scaleX);
      debugLog(`⚡ Thunder strike ${index + 1} flipped horizontally (scale.x = ${thunderSprite.scale.x.toFixed(4)})`, logCategory);
    } else {
      debugLog(`⚡ Thunder strike ${index + 1} using normal orientation`, logCategory);
    }
    
    // Enhanced positioning with detailed logging
    thunderSprite.position.set(x, y);
    debugLog(`⚡ Thunder sprite ${index + 1} positioned at (${x.toFixed(1)}, ${y.toFixed(1)})`, logCategory);
    
    // Enhanced final measurements
    const finalWidth = Math.abs(thunderSprite.width);
    const finalHeight = thunderSprite.height;
    debugLog(`⚡ Thunder sprite ${index + 1} final size: ${finalWidth.toFixed(1)}x${finalHeight.toFixed(1)}`, logCategory);
    
    // Enhanced container addition with detailed error handling
    if (this.boss.sprite.parent && !this.boss.sprite.parent.destroyed) {
      debugLog(`⚡ Adding thunder sprite ${index + 1} to container: ${this.boss.sprite.parent.constructor.name}`, logCategory);
      
      try {
        const childrenBefore = this.boss.sprite.parent.children.length;
        this.boss.sprite.parent.addChild(thunderSprite);
        thunderSprite.zIndex = 1100; // Above character (1000) but below UI (2000+)
        
        // Force container to sort children by zIndex (important for proper layering)
        this.boss.sprite.parent.sortChildren();
        
        debugLog(`⚡ Thunder sprite ${index + 1} added successfully - zIndex: ${thunderSprite.zIndex}`, logCategory);
        debugLog(`⚡ Container children: ${childrenBefore} → ${this.boss.sprite.parent.children.length}`, logCategory);
        debugLog(`⚡ Container sortChildren() called to ensure proper z-index ordering`, logCategory);
        
        // Enhanced damage detection - check if character is actually at the thunder strike position
        const currentCharacterPosition = this.getCurrentCharacterPosition();
        if (currentCharacterPosition) {
          // Check if character is close enough to the thunder strike to take damage
          const distance = Math.sqrt(
            Math.pow(currentCharacterPosition.x - x, 2) + 
            Math.pow(currentCharacterPosition.y - y, 2)
          );
          
          const hitRadius = 50; // Thunder strike hit radius
          const isCharacterHit = distance <= hitRadius;
          
          if (strikeType === 'character') {
            debugLog(`💥 THUNDER STRIKE ${index + 1} at stored character position (${x.toFixed(1)}, ${y.toFixed(1)})`, logCategory);
            debugLog(`💥 Current character position: (${currentCharacterPosition.x.toFixed(1)}, ${currentCharacterPosition.y.toFixed(1)})`, logCategory);
            debugLog(`💥 Distance from strike: ${distance.toFixed(1)}px, hit radius: ${hitRadius}px`, logCategory);
          }
          
          if (isCharacterHit) {
            debugLog(`💥 THUNDER STRIKE ${index + 1} HIT CHARACTER! Distance: ${distance.toFixed(1)}px`, logCategory);
            
            // Enhanced invulnerability check
            if (isInvulnerable()) {
              debugLog(`🛡️ Character is invulnerable - thunder strike ${index + 1} damage blocked`, logCategory);
            } else {
              debugLog(`💥 Applying thunder strike ${index + 1} damage to character`, logCategory);
              this.damageCharacterFromThunder();
            }
          } else {
            debugLog(`⚡ Thunder strike ${index + 1} missed character - distance: ${distance.toFixed(1)}px > ${hitRadius}px`, logCategory);
          }
          
          // Update thunder debug data with hit information
          if (window.thunderDebugData && window.thunderDebugData.strikePositions && window.thunderDebugData.strikePositions[index]) {
            window.thunderDebugData.strikePositions[index].hitCharacter = isCharacterHit;
            window.thunderDebugData.strikePositions[index].distance = distance;
            window.thunderDebugData.strikePositions[index].hitRadius = hitRadius;
            
            // Update character hit data
            if (isCharacterHit) {
              if (!window.thunderDebugData.characterHitData) {
                const startData = window.thunderDebugData.attackStartData;
                const distanceMoved = Math.sqrt(
                  Math.pow(currentCharacterPosition.x - startData.characterX, 2) + 
                  Math.pow(currentCharacterPosition.y - startData.characterY, 2)
                );
                
                window.thunderDebugData.characterHitData = {
                  x: currentCharacterPosition.x,
                  y: currentCharacterPosition.y,
                  distanceMoved: distanceMoved,
                  strikesHit: 1
                };
              } else {
                window.thunderDebugData.characterHitData.strikesHit++;
              }
            }
          }
        } else {
          debugLog(`⚡ Thunder strike ${index + 1} created but no character position available for hit detection`, logCategory);
        }
        
        // Enhanced animation start with frame switching
        debugLog(`⚡ Starting frame-switching animation for thunder strike ${index + 1}`, logCategory);
        this.animateThunderStrike(thunderSprite, index, thunderTextures, validFrames);
        
      } catch (error) {
        debugLog(`❌ Error adding thunder sprite ${index + 1} to container: ${error.message}`, logCategory);
        debugLog(`❌ Error stack: ${error.stack}`, logCategory);
        thunderSprite.destroy();
      }
    } else {
      debugLog(`❌ Failed to add thunder strike ${index + 1} to container`, logCategory);
      if (this.boss.sprite.parent) {
        debugLog(`❌ Parent destroyed state: ${this.boss.sprite.parent.destroyed}`, logCategory);
      } else {
        debugLog(`❌ Parent container is null`, logCategory);
      }
      thunderSprite.destroy();
    }
  }

  /**
   * Animate thunder strike with frame switching and mirroring
   */
  animateThunderStrike(thunderSprite, index, thunderTextures, validFrames) {
    const logCategory = this.getAttackLogCategory('range');
    debugLog(`⚡ Starting frame-switching animation for thunder strike ${index + 1}`, logCategory);
    
    let frameCount = 0;
    let currentFrameIndex = validFrames.indexOf(thunderTextures.indexOf(thunderSprite.texture));
    let framesOnCurrentTexture = 0;
    const maxFramesPerTexture = 2; // No frame stays for more than 2 frames
    const totalFrames = 8; // Total animation frames (4 flashes × 2 frames each)
    const frameInterval = 100; // 100ms between frames
    
    debugLog(`⚡ Animation parameters: ${totalFrames} frames, ${frameInterval}ms interval, max ${maxFramesPerTexture} per texture`, logCategory);
    debugLog(`⚡ Starting with frame index ${currentFrameIndex} from ${validFrames.length} valid frames`, logCategory);
    
    const frameStartTime = Date.now();
    
    const animateFrame = () => {
      // Enhanced safety checks
      if (!thunderSprite || thunderSprite.destroyed) {
        debugLog(`❌ Thunder sprite ${index + 1} destroyed during frame animation (frame ${frameCount})`, logCategory);
        return;
      }
      
      frameCount++;
      framesOnCurrentTexture++;
      
      // Check if we need to switch frames
      if (framesOnCurrentTexture >= maxFramesPerTexture || frameCount === 1) {
        // Switch to a different random frame
        let newFrameIndex;
        do {
          newFrameIndex = Math.floor(Math.random() * validFrames.length);
        } while (newFrameIndex === currentFrameIndex && validFrames.length > 1);
        
        currentFrameIndex = newFrameIndex;
        const frameArrayIndex = validFrames[currentFrameIndex];
        const newTexture = thunderTextures[frameArrayIndex];
        
        // Apply new texture
        thunderSprite.texture = newTexture;
        
        // Randomly flip the sprite for mirroring effect
        const shouldFlip = Math.random() < 0.5;
        const scaleX = Math.abs(thunderSprite.scale.x);
        thunderSprite.scale.x = shouldFlip ? -scaleX : scaleX;
        
        framesOnCurrentTexture = 1;
        
        const elapsedTime = Date.now() - frameStartTime;
        debugLog(`⚡ Thunder strike ${index + 1} frame ${frameCount}: switched to texture ${frameArrayIndex}, flipped=${shouldFlip} (${elapsedTime}ms)`, logCategory);
      } else {
        const elapsedTime = Date.now() - frameStartTime;
        debugLog(`⚡ Thunder strike ${index + 1} frame ${frameCount}: continuing texture ${validFrames[currentFrameIndex]} (${elapsedTime}ms)`, logCategory);
      }
      
      if (frameCount < totalFrames) {
        // Continue animation
        debugLog(`⚡ Thunder strike ${index + 1} scheduling next frame in ${frameInterval}ms`, logCategory);
        setTimeout(animateFrame, frameInterval);
      } else {
        // Enhanced final cleanup with detailed logging
        const totalElapsedTime = Date.now() - frameStartTime;
        debugLog(`⚡ Thunder strike ${index + 1} frame animation complete after ${totalElapsedTime}ms`, logCategory);
        
        setTimeout(() => {
          if (thunderSprite && !thunderSprite.destroyed) {
            try {
              const parentContainer = thunderSprite.parent;
              if (parentContainer) {
                debugLog(`⚡ Removing thunder sprite ${index + 1} from container: ${parentContainer.constructor.name}`, logCategory);
                debugLog(`⚡ Container children before removal: ${parentContainer.children.length}`, logCategory);
                parentContainer.removeChild(thunderSprite);
                debugLog(`⚡ Container children after removal: ${parentContainer.children.length}`, logCategory);
              } else {
                debugLog(`⚡ Thunder sprite ${index + 1} has no parent container for removal`, logCategory);
              }
              
              thunderSprite.destroy();
              debugLog(`⚡ Thunder strike ${index + 1} destroyed after animation`, logCategory);
            } catch (error) {
              debugLog(`⚠️ Error destroying thunder strike ${index + 1}: ${error.message}`, logCategory);
              debugLog(`⚠️ Error stack: ${error.stack}`, logCategory);
            }
          } else {
            debugLog(`⚡ Thunder sprite ${index + 1} already destroyed or null`, logCategory);
          }
        }, 200); // Brief delay before cleanup
      }
    };
    
    // Start frame animation
    debugLog(`⚡ Starting frame animation for thunder strike ${index + 1}`, logCategory);
    animateFrame();
  }

  /**
   * Get current character position for hit detection
   */
  getCurrentCharacterPosition() {
    const logCategory = this.getAttackLogCategory('range');
    
    if (window.gameMapManager && window.gameMapManager.character && window.gameMapManager.character.position) {
      const character = window.gameMapManager.character;
      const position = {
        x: character.position.x,
        y: character.position.y
      };
      
      debugLog(`⚡ Current character position retrieved: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`, logCategory);
      
      // Add sprite information for better debugging
      if (character.sprite) {
        debugLog(`⚡ Character sprite bounds: ${character.sprite.width.toFixed(1)}x${character.sprite.height.toFixed(1)}`, logCategory);
        debugLog(`⚡ Character sprite scale: (${character.sprite.scale.x.toFixed(3)}, ${character.sprite.scale.y.toFixed(3)})`, logCategory);
      }
      
      return position;
    } else {
      debugLog('⚠️ Cannot get current character position - character or position not available', logCategory);
      return null;
    }
  }

  /**
   * Damage character from thunder attack
   */
  damageCharacterFromThunder() {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('⚡ Thunder strike attempting to damage character', logCategory);
    
    if (window.gameMapManager && window.gameMapManager.character) {
      const character = window.gameMapManager.character;
      debugLog(`⚡ Character found for thunder damage: position (${character.position.x.toFixed(1)}, ${character.position.y.toFixed(1)})`, logCategory);
      
      // Enhanced invulnerability check
      if (isInvulnerable()) {
        debugLog('🛡️ Character is invulnerable - thunder damage blocked', logCategory);
        return;
      }
      
      debugLog('⚡ Character is vulnerable - applying thunder damage', logCategory);
      this.damageCharacter(); // Use existing damage method
    } else {
      debugLog('⚠️ Character not found for thunder damage', logCategory);
      debugLog('⚠️ gameMapManager or character is null/undefined', logCategory);
    }
  }

  /**
   * Get screen bounds for random strike positioning
   */
  getScreenBounds() {
    const logCategory = this.getAttackLogCategory('range');
    debugLog('⚡ Calculating screen bounds for thunder strike placement', logCategory);
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    const cameraX = this.app.stage.position.x || 0;
    const cameraY = this.app.stage.position.y || 0;
    
    debugLog(`⚡ Screen dimensions: ${screenWidth}x${screenHeight}`, logCategory);
    debugLog(`⚡ Camera position: (${cameraX.toFixed(1)}, ${cameraY.toFixed(1)})`, logCategory);
    
    const bounds = {
      left: -cameraX,
      right: -cameraX + screenWidth,
      top: -cameraY,
      bottom: -cameraY + screenHeight
    };
    
    debugLog(`⚡ Calculated bounds: left=${bounds.left.toFixed(1)}, right=${bounds.right.toFixed(1)}, top=${bounds.top.toFixed(1)}, bottom=${bounds.bottom.toFixed(1)}`, logCategory);
    
    return bounds;
  }

  /**
   * Special melee attack sequence
   */
  startMeleeAttackSequence(targetX = null, targetY = null) {
    const now = Date.now();
    this.boss.lastAttackTime = now;
    
    const logCategory = this.getAttackLogCategory('melee');
    debugLog('🥊 Boss started MELEE attack sequence: land_1 -> melee_1 -> melee_2 -> land_2 -> normal', logCategory);
    debugLog(`🔍 MELEE SEQUENCE: Starting from actualPhase=${this.boss.actualPhase}, phase=${this.boss.phase}`, logCategory);
    
    // Check if sequence is already running
    if (this.boss.activeAttackSequence === 'melee' && this.boss.isMeleeAttacking) {
      debugLog('⚠️ Melee sequence already running - preventing duplicate start', logCategory);
      return;
    }
    
    // Store original phase and animation state (use actualPhase, not temporary phase)
    const originalPhase = this.boss.actualPhase;
    this.boss.isAttacking = true;
    this.boss.attackType = 'meleeSequence'; // Use different identifier to avoid animation conflicts
    
    // Prevent movement during melee attack
    this.boss.isMeleeAttacking = true;
    
    // Default target position if not provided
    if (targetX === null || targetY === null) {
      targetX = this.boss.position.x + (this.boss.direction === 'right' ? 100 : -100);
      targetY = this.boss.position.y;
    }
    
    debugLog(`🎯 Melee target: (${targetX}, ${targetY})`, logCategory);
    
    // Step 1: Show boss_land_1 for 0.2 seconds
    this.boss.sprite.texture = this.boss.animations.land[0]; // boss_land_1.png
    debugLog('Melee sequence step 1: Showing boss_land_1 (0.2s) - INTERRUPTION COMPLETE', logCategory);
    
    const timeout1 = setTimeout(() => {
      if (this.boss.activeAttackSequence !== 'melee') {
        debugLog('Melee sequence step 1: sequence cancelled', logCategory);
        return; // Check if sequence was cancelled
      }
      
      // Step 2: Show boss_atk_melle_1 for 0.2 seconds
      this.boss.sprite.texture = this.boss.animations.melee[0]; // boss_atk_melle_1.png
      debugLog('Melee sequence step 2: Showing boss_atk_melle_1 (0.2s)', logCategory);
      
      // Play melee attack sound
      this.boss.audioManager.playMeleeAttackSound();
      
      // Execute paw swipe attack after a brief delay (during boss_atk_melle_1 frame)
      const pawSwipeDelay = setTimeout(() => {
        if (this.boss.activeAttackSequence !== 'melee') return;
        this.executePawSwipeAttack();
      }, 100); // 0.1 seconds delay, then paw swipe for 0.4 seconds
      
      this.attackSequenceTimeouts.push(pawSwipeDelay);
      
      const timeout2 = setTimeout(() => {
        if (this.boss.activeAttackSequence !== 'melee') {
          debugLog('Melee sequence step 2: sequence cancelled', logCategory);
          return; // Check if sequence was cancelled
        }
        
        // Step 3: Show boss_atk_melle_2 for 0.2 seconds
        this.boss.sprite.texture = this.boss.animations.melee[1]; // boss_atk_melle_2.png
        debugLog('Melee sequence step 3: Showing boss_atk_melle_2 (0.2s)', logCategory);
        
        const timeout3 = setTimeout(() => {
          if (this.boss.activeAttackSequence !== 'melee') {
            debugLog('Melee sequence step 3: sequence cancelled', logCategory);
            return; // Check if sequence was cancelled
          }
          
          // Step 4: Show boss_land_2 for 0.2 seconds
          this.boss.sprite.texture = this.boss.animations.land[1]; // boss_land_2.png
          debugLog('Melee sequence step 4: Showing boss_land_2 (0.2s)', logCategory);
          
          const timeout4 = setTimeout(() => {
            if (this.boss.activeAttackSequence !== 'melee') {
              debugLog('Melee sequence step 4: sequence cancelled', logCategory);
              return; // Check if sequence was cancelled
            }
            
            // Step 5: Return to normal animation
            this.boss.phase = originalPhase;
            this.boss.frameIndices[originalPhase] = 0;
            this.boss.isAttacking = false;
            this.boss.isMeleeAttacking = false; // Allow movement again
            this.boss.activeAttackSequence = null; // Clear active sequence
            debugLog(`Melee sequence step 5: Returning to ${originalPhase} animation - sequence complete`, logCategory);
          }, 200); // 0.2 seconds
          
          this.attackSequenceTimeouts.push(timeout4);
        }, 200); // 0.2 seconds
        
        this.attackSequenceTimeouts.push(timeout3);
      }, 200); // 0.2 seconds
      
      this.attackSequenceTimeouts.push(timeout2);
    }, 200); // 0.2 seconds
    
    this.attackSequenceTimeouts.push(timeout1);
  }

  /**
   * Execute paw swipe attack - damages character regardless of location
   */
  executePawSwipeAttack() {
    const logCategory = this.getAttackLogCategory('melee');
    debugLog('🐾 Boss executing PAW SWIPE attack - character takes damage!', logCategory);
    debugLog(`🔍 INVULNERABILITY STATUS: ${isInvulnerable() ? 'ENABLED' : 'DISABLED'}`, logCategory);
    
    // Safety check: ensure boss sprite and animations are valid
    if (!this.boss.sprite || this.boss.sprite.destroyed || !this.boss.animations || !this.boss.animations.melee) {
      debugLog('❌ Boss sprite or animations destroyed/missing - aborting paw swipe', logCategory);
      return;
    }
    
    // Check if paw animation exists
    if (!this.boss.animations.melee[2]) {
      debugLog('❌ Paw swipe texture (boss_atk_melle_paw.png) not found in animations.melee[2]', logCategory);
      debugLog(`Available melee textures: ${this.boss.animations.melee ? this.boss.animations.melee.length : 'none'}`, logCategory);
      return;
    }
    
    // Additional safety check for texture validity
    const pawTexture = this.boss.animations.melee[2];
    if (!pawTexture || pawTexture.destroyed || !pawTexture.valid || !pawTexture.baseTexture || pawTexture.baseTexture.destroyed) {
      debugLog('❌ Paw texture is null, destroyed, or invalid', logCategory);
      return;
    }
    
    // Safety check: ensure boss container exists
    if (!this.boss.sprite.parent || this.boss.sprite.parent.destroyed) {
      debugLog('❌ Boss container destroyed - aborting paw swipe', logCategory);
      return;
    }
    
    // Get character position for paw target
    let characterPosition = { x: this.boss.position.x + 200, y: this.boss.position.y }; // Default fallback
    
    // Try to get actual character position
    if (window.gameMapManager && window.gameMapManager.character) {
      const character = window.gameMapManager.character;
      characterPosition = { x: character.position.x, y: character.position.y };
      debugLog(`🎯 Character found at position: (${characterPosition.x}, ${characterPosition.y})`, logCategory);
    } else {
      debugLog('⚠️ Character not found, using default position', logCategory);
    }
    
    // Create a separate paw sprite for the attack animation with try-catch
    let pawSprite;
    try {
      pawSprite = new PIXI.Sprite(pawTexture);
      pawSprite.anchor.set(0.5, 0.5);
    } catch (error) {
      debugLog(`❌ Failed to create paw sprite: ${error.message}`, logCategory);
      return;
    }
    
    // New paw sprite dimensions: 569x507 (right-facing by default)
    const originalPawWidth = 569;
    const originalPawHeight = 507;
    
    // Scale paw to smaller size
    const targetPawSize = 50;
    const aspectRatio = originalPawWidth / originalPawHeight;
    const finalWidth = targetPawSize * aspectRatio;
    const finalHeight = targetPawSize;
    
    const scaleX = finalWidth / originalPawWidth;
    const scaleY = finalHeight / originalPawHeight;
    pawSprite.scale.set(scaleX, scaleY);
    
    // Handle paw direction based on boss direction
    if (this.boss.direction === 'left') {
      // Flip the paw horizontally for left-facing attack
      pawSprite.scale.x = -Math.abs(scaleX);
      debugLog('🔄 Paw flipped for left-facing boss attack', logCategory);
    } else {
      // Keep original right-facing orientation
      pawSprite.scale.x = Math.abs(scaleX);
      debugLog('➡️ Paw using right-facing orientation', logCategory);
    }
    
    // Position paw at character location
    const pawWidth = finalWidth;
    const pawHeight = finalHeight;
    const pawX = characterPosition.x;
    const characterTopY = characterPosition.y - 30;
    const characterCenterY = characterPosition.y;
    const startY = characterTopY;
    const endY = characterCenterY;
    
    debugLog(`🎯 COLLISION DEBUG: Character at (${characterPosition.x}, ${characterPosition.y})`, logCategory);
    debugLog(`🎯 PAW POSITIONING: pawX=${pawX}, startY=${startY}, endY=${endY}`, logCategory);
    debugLog(`📏 PAW SIZE: width=${pawWidth}, height=${pawHeight}`, logCategory);
    
    pawSprite.position.set(pawX, startY);
    
    // Add paw sprite to container
    try {
      let targetContainer = this.boss.sprite.parent;
      if (window.gameMapManager && window.gameMapManager.character && window.gameMapManager.character.sprite && window.gameMapManager.character.sprite.parent) {
        targetContainer = window.gameMapManager.character.sprite.parent;
        debugLog('🎯 Using character container for paw positioning', logCategory);
      }
      
      targetContainer.addChild(pawSprite);
      pawSprite.zIndex = 1000;
      
      const worldPos = pawSprite.toGlobal(new PIXI.Point(0, 0));
      debugLog(`🌍 PAW WORLD POSITION: (${worldPos.x}, ${worldPos.y})`, logCategory);
      debugLog(`🔍 PAW LOCAL POSITION: (${pawSprite.position.x}, ${pawSprite.position.y})`, logCategory);
    } catch (error) {
      debugLog(`❌ Failed to add paw sprite to container: ${error.message}`, logCategory);
      pawSprite.destroy();
      return;
    }
    
    // Animate paw vertically downward
    const animationDuration = 450;
    const startTime = Date.now();
    
    const animatePaw = () => {
      if (!pawSprite || pawSprite.destroyed || !this.boss.sprite || this.boss.sprite.destroyed) {
        debugLog('❌ Paw or boss sprite destroyed during animation', logCategory);
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Eased movement
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      pawSprite.position.x = pawX;
      pawSprite.position.y = startY + (endY - startY) * easeProgress;
      
      if (progress < 1) {
        requestAnimationFrame(animatePaw);
      } else {
        // Animation complete - damage character and cleanup
        debugLog('💥 PAW SWIPE COMPLETE - Character takes damage!', logCategory);
        this.damageCharacter();
        
        // Clean up paw sprite
        setTimeout(() => {
          if (pawSprite && !pawSprite.destroyed) {
            try {
              if (pawSprite.parent) {
                pawSprite.parent.removeChild(pawSprite);
              }
              pawSprite.destroy();
              debugLog('🐾 Paw sprite destroyed after animation', logCategory);
            } catch (error) {
              debugLog(`⚠️ Error destroying paw sprite: ${error.message}`, logCategory);
            }
          }
        }, 200);
      }
    };
    
    requestAnimationFrame(animatePaw);
    debugLog('🚀 Paw swipe animation started - vertical swipe from above character', logCategory);
  }

  /**
   * Damage the character (for all attack types)
   */
  damageCharacter() {
    try {
      if (window.gameMapManager && window.gameMapManager.character) {
        const character = window.gameMapManager.character;
        
        // Check if character has takeDamage method
        if (character.takeDamage && typeof character.takeDamage === 'function') {
          // Check invulnerability before dealing damage
          if (isInvulnerable()) {
            debugLog('🛡️ Character is invulnerable - no damage taken', 'boss');
            return;
          }
          
          // Deal damage to character
          character.takeDamage(1); // 1 damage per boss attack
          debugLog('💥 Boss attack damaged character (-1 HP)', 'boss');
        } else {
          debugLog('❌ Character takeDamage method not found', 'boss');
        }
      } else {
        debugLog('❌ Character not found for damage', 'boss');
      }
    } catch (error) {
      debugLog(`❌ Error damaging character: ${error.message}`, 'boss');
    }
  }

  /**
   * Clean up all attack timeouts
   */
  cleanup() {
    // Clear all active timeouts
    this.attackSequenceTimeouts.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.attackSequenceTimeouts = [];
    
    debugLog('BossAttackLogic cleaned up', 'boss');
  }
}
