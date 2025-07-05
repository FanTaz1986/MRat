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
    
    // Movement configuration based on character speed (4)
    this.characterMoveSpeed = 4; // Base character move speed
    this.flyPhaseMoveSpeed = this.characterMoveSpeed * 2; // 2x character speed (8)
    this.groundPhaseMoveSpeed = this.characterMoveSpeed * 0.5; // 50% of character speed (2)
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
   * This function NEVER auto-enables boss logging - it only checks if logging is already enabled
   */
  async checkDebugConfigAndExecute(event) {
    try {
      // Method 1: Try dynamic import
      const debugModule = await import('../../development/utils/Debug.js');
      if (debugModule.debugConfig && debugModule.debugConfig.logCategories && debugModule.debugConfig.logCategories.boss) {
        // Boss debugging is manually enabled - allow controls
        this.executeBossControls(event);
        return;
      }
    } catch (error) {
      // Dynamic import failed, try other methods
      console.warn('Dynamic import failed in BossAI:', error);
    }

    // Method 2: Check global window object
    if (window.game && window.game.debugConfig && window.game.debugConfig.logCategories && window.game.debugConfig.logCategories.boss) {
      // Boss debugging is manually enabled - allow controls
      this.executeBossControls(event);
      return;
    }

    // Method 3: Check if debug system exists globally
    if (window.globalDebugOverlay && window.globalDebugOverlay.debugConfig && window.globalDebugOverlay.debugConfig.logCategories && window.globalDebugOverlay.debugConfig.logCategories.boss) {
      // Boss debugging is manually enabled - allow controls
      this.executeBossControls(event);
      return;
    }

    // Boss debugging is disabled - do nothing (no auto-enabling)
    // User must manually check the "Boss Debugging" checkbox in the debug menu
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
   * Move the boss in the specified direction with phase-dependent speed
   */
  moveBoss(direction) {
    debugLog(`Boss move ${direction.toUpperCase()} command`, 'boss');
    
    if (!this.bossEntity || !this.bossEntity.position) {
      debugLog('No boss entity available for movement', 'boss');
      return;
    }

    // Get current movement speed based on boss phase
    let currentMoveSpeed;
    if (this.bossEntity.phase === 'fly') {
      currentMoveSpeed = this.flyPhaseMoveSpeed; // 2x character speed
    } else if (this.bossEntity.phase === 'ground') {
      currentMoveSpeed = this.groundPhaseMoveSpeed; // 50% character speed
    } else {
      currentMoveSpeed = this.characterMoveSpeed; // Default speed
    }
    
    debugLog(`Boss movement speed: ${currentMoveSpeed} (phase: ${this.bossEntity.phase})`, 'boss');

    const currentPos = this.bossEntity.position;
    let newX = currentPos.x;
    let newY = currentPos.y;

    switch (direction) {
      case 'left':
        newX -= currentMoveSpeed;
        // Update boss direction to face left
        if (this.bossEntity.setDirection) {
          this.bossEntity.setDirection('left');
        }
        break;
      case 'right':
        newX += currentMoveSpeed;
        // Update boss direction to face right
        if (this.bossEntity.setDirection) {
          this.bossEntity.setDirection('right');
        }
        break;
      case 'up':
        newY -= currentMoveSpeed;
        break;
      case 'down':
        newY += currentMoveSpeed;
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
    debugLog(`Boss moved to (${newX.toFixed(1)}, ${newY.toFixed(1)}) with speed ${currentMoveSpeed} (${this.bossEntity.phase} phase)`, 'boss');
  }

  /**
   * Perform the specified attack type
   */
  performAttack(attackType) {
    debugLog(`Boss ${attackType.toUpperCase()} ATTACK command`, 'boss');
    
    if (!this.bossEntity) {
      debugLog('No boss entity available for attack', 'boss');
      return;
    }

    // Check if this specific attack is on cooldown
    if (this.bossEntity.isAttackOnCooldown && this.bossEntity.isAttackOnCooldown(attackType)) {
      const remaining = this.bossEntity.getRemainingCooldown(attackType);
      debugLog(`Boss ${attackType} attack on cooldown for ${(remaining/1000).toFixed(1)}s more`, 'boss');
      return;
    }

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
    
    if (this.bossEntity && this.bossEntity.startAttack) {
      // Get target position (in front of boss)
      const targetX = this.bossEntity.position.x + (this.bossEntity.direction === 'right' ? 200 : -200);
      const targetY = this.bossEntity.position.y;
      
      this.bossEntity.startAttack('range', targetX, targetY);
      debugLog(`Boss range attack started, targeting (${targetX}, ${targetY})`, 'boss');
    } else {
      debugLog('Boss entity or startAttack method not available', 'boss');
    }
  }

  /**
   * Perform a bolt attack
   */
  performBoltAttack() {
    debugLog('Boss executing bolt attack - lightning projectile with animation sequence', 'boss');
    
    if (this.bossEntity && this.bossEntity.startAttack) {
      // Get target position (in front of boss)
      const targetX = this.bossEntity.position.x + (this.bossEntity.direction === 'right' ? 150 : -150);
      const targetY = this.bossEntity.position.y;
      
      // Call startAttack with 'bolt' type to trigger the special sequence
      this.bossEntity.startAttack('bolt', targetX, targetY);
      debugLog(`Boss bolt attack sequence started, targeting (${targetX}, ${targetY})`, 'boss');
    } else {
      debugLog('Boss entity or startAttack method not available', 'boss');
    }
  }

  /**
   * Perform a melee attack
   */
  performMeleeAttack() {
    debugLog('Boss executing melee attack - close combat damage', 'boss');
    
    if (this.bossEntity && this.bossEntity.startAttack) {
      // Get target position (close to boss)
      const targetX = this.bossEntity.position.x + (this.bossEntity.direction === 'right' ? 100 : -100);
      const targetY = this.bossEntity.position.y;
      
      this.bossEntity.startAttack('melee', targetX, targetY);
      debugLog(`Boss melee attack started, targeting (${targetX}, ${targetY})`, 'boss');
    } else {
      debugLog('Boss entity or startAttack method not available', 'boss');
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
