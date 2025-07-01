import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';

export default class Boss {
  constructor(app, initialX, initialY) {
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
      idle: 0, 
      atk1: 0, 
      atk3: 0,
      dead: 0
    };
    
    // Attack system
    this.isAttacking = false;
    this.attackCooldown = 2000; // 2 seconds between attacks
    this.lastAttackTime = 0;
    this.attackType = 'atk1'; // 'atk1' or 'atk3'
    
    this.setupSprite();
    this.app.ticker.add(this.update, this);
    
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
      idle: [
        createTexture('/Boss/Frames/boss_idle_1.png'),
        createTexture('/Boss/Frames/boss_idle_2.png')
      ],
      atk1: [
        createTexture('/Boss/Frames/boss_atk_1.png'),
        createTexture('/Boss/Frames/boss_atk_2.png')
      ],
      atk3: [
        createTexture('/Boss/Frames/boss_atk_3_1.png'),
        createTexture('/Boss/Frames/boss_atk3_2.png')
      ],
      dead: [
        createTexture('/Boss/Frames/boss_dead.png')
      ],
      paw: [
        createTexture('/Boss/Frames/paw.png')
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
    this.frameIndices.idle = 0; // Reset idle animation
    debugLog('Boss transitioned to ground phase!', 'boss');
    
    // Optional: Add transition effects, sounds, etc.
    // You could also move the boss to a different Y position (lower to ground)
  }
  
  // Enter death state
  enterDeathState() {
    this.phase = 'dead';
    this.frameIndices.dead = 0;
    this.isAttacking = false;
    debugLog('Boss defeated!', 'boss');
  }
  
  // Start attack sequence
  startAttack(attackType = 'atk1') {
    if (this.phase === 'dead') return;
    
    const now = Date.now();
    if (now - this.lastAttackTime < this.attackCooldown) return; // Cooldown not ready
    
    this.isAttacking = true;
    this.attackType = attackType;
    this.frameIndices[attackType] = 0;
    this.lastAttackTime = now;
    
    debugLog(`Boss started ${attackType} attack`, 'boss');
    
    // End attack after animation completes
    setTimeout(() => {
      this.isAttacking = false;
      debugLog(`Boss finished ${attackType} attack`, 'boss');
    }, this.frameUpdateInterval * this.animations[attackType].length);
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
      currentAnimation = this.animations.idle;
      frameKey = 'idle';
      // Idle animation cycles
      this.frameIndices.idle = (this.frameIndices.idle + 1) % currentAnimation.length;
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
        const attackTypes = ['atk1', 'atk3'];
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
        const attackTypes = ['atk1', 'atk3'];
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
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}
