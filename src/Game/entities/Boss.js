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
    this.maxHP = 100;
    this.currentHP = 100;
    this.phase = 'fly'; // 'fly' or 'ground'
    this.phaseTransitioned = false;
    
    // Animation frame tracking
    this.frameIndices = { 
      fly: 0, 
      land: 0, 
      melee: 0, 
      range: 0,
      dead: 0
    };
    
    // Attack system
    this.isAttacking = false;
    this.attackCooldown = 2000; // 2 seconds between attacks
    this.lastAttackTime = 0;
    this.attackType = 'melee'; // 'melee' or 'range'
    
    // Attack effects system
    this.attackEffects = null;
    this.effectsContainer = container || app.stage;
    
    // Audio state
    this.isFlyingSoundPlaying = false;
    this.isBossRoomMusicPlaying = false;
    
    this.setupSprite();
    this.setupAttackEffects();
    this.app.ticker.add(this.update, this);
    
    // Start boss room music and fly sound
    this.startBossRoomAudio();
    
    debugLog(`Boss created at (${initialX}, ${initialY}) with ${this.maxHP} HP`, 'boss');
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
    
    // High-quality scaling - boss should be impressive
    const desiredWidth = 400; // Large boss size
    const scale = desiredWidth / this.sprite.texture.width;
    this.sprite.scale.set(scale);
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false;
    
    // Position sprite
    this.sprite.position.set(this.position.x, this.position.y);
    this.sprite.zIndex = 2000; // High z-index for boss
    
    // Apply direction (mirroring)
    this.updateDirection();
    
    this.app.stage.addChild(this.sprite);
    debugLog(`Boss sprite initialized in ${this.phase} phase`, 'boss');
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
    this.currentHP = Math.max(0, this.currentHP - damage);
    debugLog(`Boss took ${damage} damage, HP: ${this.currentHP}/${this.maxHP}`, 'boss');
    
    // Check for phase transition at 50% HP
    if (this.currentHP <= this.maxHP / 2 && this.phase === 'fly' && !this.phaseTransitioned) {
      this.transitionToGroundPhase();
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
  }
  
  // Start attack sequence
  startAttack(attackType = 'melee', targetX = null, targetY = null) {
    if (this.phase === 'dead') return;
    
    const now = Date.now();
    if (now - this.lastAttackTime < this.attackCooldown) return; // Cooldown not ready
    
    this.isAttacking = true;
    this.attackType = attackType;
    this.frameIndices[attackType] = 0;
    this.lastAttackTime = now;
    
    debugLog(`Boss started ${attackType} attack`, 'boss');
    
    // Handle attack-specific effects and audio
    if (attackType === 'melee') {
      // Play melee attack sound
      playBossMeleeAttack();
      
      // Create melee visual effect (if target position provided)
      if (targetX !== null && targetY !== null && this.attackEffects) {
        // Create a small impact effect at target
        setTimeout(() => {
          this.attackEffects.createZapBoltExplosion(targetX, targetY);
        }, this.frameUpdateInterval); // Delay to sync with animation
      }
    } else if (attackType === 'range') {
      // Play range charge up sound
      playBossRangeChargeUp();
      
      // Create range attack effects
      setTimeout(() => {
        this.executeRangeAttack(targetX, targetY);
      }, this.frameUpdateInterval * 1.5); // Delay for charge up
    }
    
    // End attack after animation completes
    setTimeout(() => {
      this.isAttacking = false;
      debugLog(`Boss finished ${attackType} attack`, 'boss');
    }, this.frameUpdateInterval * this.animations[attackType].length);
  }
  
  // Execute range attack with visual effects
  executeRangeAttack(targetX = null, targetY = null) {
    if (!this.attackEffects) return;
    
    // Default target position if not provided
    if (targetX === null || targetY === null) {
      targetX = this.position.x + (this.direction === 'right' ? 200 : -200);
      targetY = this.position.y;
    }
    
    // Random range attack type
    const rangeAttacks = ['thunder', 'zapBolt', 'zapCone'];
    const randomAttack = rangeAttacks[Math.floor(Math.random() * rangeAttacks.length)];
    
    switch (randomAttack) {
      case 'thunder':
        this.attackEffects.createThunderAttack(targetX, targetY);
        break;
      case 'zapBolt':
        this.attackEffects.createZapBoltAttack(
          this.position.x, 
          this.position.y, 
          targetX, 
          targetY
        );
        break;
      case 'zapCone':
        this.attackEffects.createZapConeAttack(
          this.position.x, 
          this.position.y, 
          this.direction
        );
        break;
      default:
        // Fallback to thunder attack
        this.attackEffects.createThunderAttack(targetX, targetY);
        break;
    }
    
    debugLog(`Boss executed ${randomAttack} range attack`, 'boss');
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
      currentAnimation = this.animations[this.attackType];
      frameKey = this.attackType;
      // Attack animation cycles
      this.frameIndices[frameKey] = (this.frameIndices[frameKey] + 1) % currentAnimation.length;
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
    // Flying phase behavior - boss hovers and occasionally attacks
    const now = Date.now();
    
    // Random attack chance
    if (!this.isAttacking && now - this.lastAttackTime > this.attackCooldown) {
      if (Math.random() < 0.01) { // 1% chance per frame to attack
        const attackTypes = ['melee', 'range'];
        const randomAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        this.startAttack(randomAttack);
      }
    }
    
    // Optional: Add hovering movement pattern
    // this.position.y += Math.sin(now * 0.001) * 0.5; // Subtle hovering
    // this.sprite.position.y = this.position.y;
  }
  
  updateGroundPhase() {
    // Ground phase behavior - boss is more aggressive
    const now = Date.now();
    
    // More frequent attacks in ground phase
    if (!this.isAttacking && now - this.lastAttackTime > this.attackCooldown * 0.7) { // 30% faster attacks
      if (Math.random() < 0.015) { // 1.5% chance per frame to attack
        const attackTypes = ['melee', 'range'];
        const randomAttack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
        this.startAttack(randomAttack);
      }
    }
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
  
  // Move boss (for AI or scripted movement)
  moveTo(x, y) {
    this.position.x = x;
    this.position.y = y;
    if (this.sprite) {
      this.sprite.position.set(x, y);
    }
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
    
    // Stop all boss audio
    this.stopBossRoomAudio();
    
    // Clean up attack effects
    if (this.attackEffects) {
      this.attackEffects.destroy();
    }
    
    // Clean up sprite
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
    
    debugLog('Boss destroyed and audio cleaned up', 'boss');
  }
}
