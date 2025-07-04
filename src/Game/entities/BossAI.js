/**
 * BossAI.js
 * 
 * Boss AI component that handles all boss-related debug controls and logic.
 * This component is designed for easy fine-tuning and future expansion of boss functionality.
 */

import { debugLog } from '../../development/utils/Debug.js';

class BossAI {
  constructor(bossEntity = null) {
    this.bossEntity = bossEntity;
    this.isDebugMode = false;
    
    // Bind methods to preserve context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.moveBoss = this.moveBoss.bind(this);
    this.performAttack = this.performAttack.bind(this);
    
    // Movement configuration
    this.movementSpeed = 20; // pixels per movement command (increased for easier debug movement)
    this.attackCooldown = 1000; // milliseconds
    this.lastAttackTime = 0;
    
    debugLog('BossAI initialized', 'boss');
  }

  /**
   * Set the boss entity that this AI will control
   */
  setBossEntity(bossEntity) {
    this.bossEntity = bossEntity;
    debugLog('BossAI entity set', 'boss');
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled) {
    this.isDebugMode = enabled;
    debugLog(`BossAI debug mode ${enabled ? 'enabled' : 'disabled'}`, 'boss');
  }

  /**
   * Handle keyboard input for boss controls
   */
  handleKeyDown(event) {
    // Check debug config with multiple fallback methods
    this.checkDebugConfigAndExecute(event);
  }

  /**
   * Check debug configuration and execute boss controls if enabled
   */
  async checkDebugConfigAndExecute(event) {
    try {
      // Method 1: Try dynamic import
      const debugModule = await import('../../development/utils/Debug.js');
      if (debugModule.debugConfig && debugModule.debugConfig.logCategories && debugModule.debugConfig.logCategories.boss) {
        this.executeBossControls(event);
        return;
      }
    } catch (error) {
      // Dynamic import failed, try other methods
      console.warn('Dynamic import failed in BossAI:', error);
    }

    // Method 2: Check global window object
    if (window.game && window.game.debugConfig && window.game.debugConfig.logCategories && window.game.debugConfig.logCategories.boss) {
      this.executeBossControls(event);
      return;
    }

    // Method 3: Check if debug system exists globally
    if (window.globalDebugOverlay && window.globalDebugOverlay.debugConfig && window.globalDebugOverlay.debugConfig.logCategories && window.globalDebugOverlay.debugConfig.logCategories.boss) {
      this.executeBossControls(event);
      return;
    }

    // If no debug config found or boss debugging is disabled, do nothing
  }

  /**
   * Execute boss controls based on keyboard input
   */
  executeBossControls(event) {
    const { key, code } = event;
    
    // Movement controls (Numpad)
    switch (code) {
      case 'Numpad4':
        event.preventDefault();
        this.moveBoss('left');
        break;
      case 'Numpad6':
        event.preventDefault();
        this.moveBoss('right');
        break;
      case 'Numpad8':
        event.preventDefault();
        this.moveBoss('up');
        break;
      case 'Numpad5':
        event.preventDefault();
        this.moveBoss('down');
        break;
      default:
        // Not a boss movement key
        break;
    }

    // Attack controls (Letter keys)
    switch (key.toLowerCase()) {
      case 'z':
        event.preventDefault();
        this.performAttack('range');
        break;
      case 'x':
        event.preventDefault();
        this.performAttack('bolt');
        break;
      case 'c':
        event.preventDefault();
        this.performAttack('melee');
        break;
      default:
        // Not a boss attack key
        break;
    }
  }

  /**
   * Move the boss in the specified direction
   */
  moveBoss(direction) {
    debugLog(`Boss move ${direction.toUpperCase()} command`, 'boss');
    
    if (!this.bossEntity || !this.bossEntity.position) {
      debugLog('No boss entity available for movement', 'boss');
      return;
    }

    const currentPos = this.bossEntity.position;
    let newX = currentPos.x;
    let newY = currentPos.y;

    switch (direction) {
      case 'left':
        newX -= this.movementSpeed;
        break;
      case 'right':
        newX += this.movementSpeed;
        break;
      case 'up':
        newY -= this.movementSpeed;
        break;
      case 'down':
        newY += this.movementSpeed;
        break;
      default:
        debugLog(`Invalid boss movement direction: ${direction}`, 'boss');
        return;
    }

    // Apply movement bounds (use map bounds, not screen bounds)
    // Allow boss to move anywhere in the map, not just visible screen area
    newX = Math.max(-200, Math.min(newX, 2500)); // Map width bounds with buffer
    newY = Math.max(-200, Math.min(newY, 2000)); // Map height bounds with buffer

    // Update boss position using the boss's moveTo method
    this.bossEntity.moveTo(newX, newY);
    debugLog(`Boss moved to (${newX.toFixed(1)}, ${newY.toFixed(1)})`, 'boss');
  }

  /**
   * Perform the specified attack type
   */
  performAttack(attackType) {
    const currentTime = Date.now();
    
    // Check cooldown
    if (currentTime - this.lastAttackTime < this.attackCooldown) {
      debugLog(`Boss ${attackType} attack on cooldown`, 'boss');
      return;
    }

    debugLog(`Boss ${attackType.toUpperCase()} ATTACK command`, 'boss');
    
    if (!this.bossEntity) {
      debugLog('No boss entity available for attack', 'boss');
      return;
    }

    // Update last attack time
    this.lastAttackTime = currentTime;

    // Perform attack based on type
    switch (attackType) {
      case 'range':
        this.performRangeAttack();
        break;
      case 'bolt':
        this.performBoltAttack();
        break;
      case 'melee':
        this.performMeleeAttack();
        break;
      default:
        debugLog(`Invalid boss attack type: ${attackType}`, 'boss');
        return;
    }
  }

  /**
   * Perform a range attack
   */
  performRangeAttack() {
    debugLog('Boss executing range attack - area damage in front', 'boss');
    
    // TODO: Implement actual range attack logic
    // - Create projectiles or area effect
    // - Apply damage to player if in range
    // - Visual/audio effects
    
    if (this.bossEntity && this.bossEntity.performRangeAttack) {
      this.bossEntity.performRangeAttack();
    }
  }

  /**
   * Perform a bolt attack
   */
  performBoltAttack() {
    debugLog('Boss executing bolt attack - lightning projectile', 'boss');
    
    // TODO: Implement actual bolt attack logic
    // - Create lightning bolt projectile
    // - Track player position for targeting
    // - Apply electrical damage
    
    if (this.bossEntity && this.bossEntity.performBoltAttack) {
      this.bossEntity.performBoltAttack();
    }
  }

  /**
   * Perform a melee attack
   */
  performMeleeAttack() {
    debugLog('Boss executing melee attack - close combat damage', 'boss');
    
    // TODO: Implement actual melee attack logic
    // - Check if player is within melee range
    // - Apply close combat damage
    // - Knockback effect
    
    if (this.bossEntity && this.bossEntity.performMeleeAttack) {
      this.bossEntity.performMeleeAttack();
    }
  }

  /**
   * Get boss information for UI display
   */
  getBossInfo() {
    if (!this.bossEntity) {
      return {
        exists: false,
        health: 0,
        maxHealth: 0,
        position: { x: 0, y: 0 },
        isActive: false
      };
    }

    return {
      exists: true,
      health: this.bossEntity.health || 0,
      maxHealth: this.bossEntity.maxHealth || 40,
      position: {
        x: this.bossEntity.position?.x || 0,
        y: this.bossEntity.position?.y || 0
      },
      isActive: this.bossEntity.isActive !== false
    };
  }

  /**
   * Update boss AI (called from game loop)
   */
  update(deltaTime) {
    if (!this.bossEntity || !this.bossEntity.isActive) return;

    // TODO: Implement automatic AI behavior when not in debug mode
    // - Patrol patterns
    // - Player detection and tracking
    // - Automatic attack timing
    // - State machine for different boss phases
  }

  /**
   * Cleanup and remove event listeners
   */
  destroy() {
    this.bossEntity = null;
    debugLog('BossAI destroyed', 'boss');
  }
}

export default BossAI;
