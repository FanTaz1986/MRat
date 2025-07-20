import * as PIXI from 'pixi.js';

/**
 * EnemyAI manages AI behavior for enemies in different maps
 * Currently implements Map1 basic AI system
 */
export default class EnemyAI {
  constructor(app, gameContainer) {
    this.app = app;
    this.gameContainer = gameContainer;
    
    // AI configuration for Map1
    this.map1Config = {
      chaseRange: 2100, // 1 tile (each tile is 2100px) - reduced by half for shorter chase
      returnToStartThreshold: 2100, // Same as chase range
      attackRange: 30, // Close range for attack - reasonable touch distance
      patrolSpeed: 0.5, // Half speed for patrolling
      patrolRange: 1050, // Half a tile (1050px) for patrol area
      viewRange: 3150, // 1.5 tiles - range to detect player
      attackCooldown: 2000, // 2 seconds between attacks
      attackDamage: 1, // Damage dealt to character
      patrolChangeInterval: 3000, // Change patrol direction every 3 seconds
      patrolPauseChance: 0.3 // 30% chance to pause during patrol
    };
    
    // AI states
    this.AI_STATES = {
      IDLE: 'idle',
      PATROLLING: 'patrolling',
      CHASING: 'chasing',
      RETURNING: 'returning',
      ATTACKING: 'attacking',
      STUNNED: 'stunned'
    };
    
    // Debug settings
    this.debugEnabled = false;
    this.showAIDebugInfo = false;
    
    console.log('[ENEMY-AI] 🧠 EnemyAI system initialized');
  }
  
  /**
   * Initialize AI for an enemy when it spawns
   */
  initializeEnemyAI(enemy) {
    if (!enemy) return;
    
    // Store original spawn position
    enemy.aiData = {
      startPosition: { x: enemy.position.x, y: enemy.position.y },
      currentState: this.AI_STATES.PATROLLING, // Start with patrolling
      lastAttackTime: 0,
      chaseTarget: null,
      lastSeenPlayerTime: 0,
      isPlayerVisible: false,
      distanceFromStart: 0,
      maxChaseDistance: this.map1Config.chaseRange,
      originalSpeed: enemy.speed || 1.0,
      // Patrol data
      patrolTarget: null,
      lastPatrolChange: Date.now(),
      patrolDirection: this.getRandomDirection(),
      isPatrolPaused: false
    };
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 🧠 Initialized AI for ${enemy.type} slime at (${enemy.position.x.toFixed(1)}, ${enemy.position.y.toFixed(1)})`);
    }
  }
  
  /**
   * Update AI for all enemies
   */
  updateAI(enemies, character, delta) {
    if (!enemies || !character) return;
    
    enemies.forEach(enemy => {
      if (!enemy.isAlive || !enemy.aiData) return;
      
      this.updateEnemyAI(enemy, character, delta);
    });
  }
  
  /**
   * Update AI for a single enemy
   */
  updateEnemyAI(enemy, character, delta) {
    if (!enemy.aiData) {
      this.initializeEnemyAI(enemy);
    }
    
    const aiData = enemy.aiData;
    const currentTime = Date.now();
    
    // Calculate distances
    const distanceToPlayer = this.calculateDistance(enemy.position, character.position);
    const distanceFromStart = this.calculateDistance(enemy.position, aiData.startPosition);
    aiData.distanceFromStart = distanceFromStart;
    
    // Check if player is visible (within view range)
    aiData.isPlayerVisible = distanceToPlayer <= this.map1Config.viewRange;
    
    if (aiData.isPlayerVisible) {
      aiData.lastSeenPlayerTime = currentTime;
      aiData.chaseTarget = { x: character.position.x, y: character.position.y };
    }
    
    // State machine
    switch (aiData.currentState) {
      case this.AI_STATES.IDLE:
        this.handleIdleState(enemy, character, distanceToPlayer, currentTime);
        break;
        
      case this.AI_STATES.PATROLLING:
        this.handlePatrollingState(enemy, character, distanceToPlayer, currentTime);
        break;
        
      case this.AI_STATES.CHASING:
        this.handleChasingState(enemy, character, distanceToPlayer, distanceFromStart, currentTime);
        break;
        
      case this.AI_STATES.RETURNING:
        this.handleReturningState(enemy, distanceFromStart, currentTime);
        break;
        
      case this.AI_STATES.ATTACKING:
        this.handleAttackingState(enemy, character, distanceToPlayer, currentTime);
        break;
        
      case this.AI_STATES.STUNNED:
        this.handleStunnedState(enemy, currentTime);
        break;
        
      default:
        // Unknown state, reset to patrolling
        this.transitionToPatrol(enemy);
        break;
    }
    
    // Debug visualization
    if (this.showAIDebugInfo) {
      this.drawAIDebugInfo(enemy);
    }
  }
  
  /**
   * Handle idle state - waiting for player to come into view
   */
  handleIdleState(enemy, character, distanceToPlayer, currentTime) {
    const aiData = enemy.aiData;
    
    // If player is in view range, start chasing
    if (aiData.isPlayerVisible) {
      this.transitionToChase(enemy, character);
    } else {
      // If not chasing, go back to patrolling
      this.transitionToPatrol(enemy);
    }
  }
  
  /**
   * Handle patrolling state - small movements within tile area
   */
  handlePatrollingState(enemy, character, distanceToPlayer, currentTime) {
    const aiData = enemy.aiData;
    
    // If player is in view range, start chasing
    if (aiData.isPlayerVisible) {
      this.transitionToChase(enemy, character);
      return;
    }
    
    // Handle patrol behavior
    this.updatePatrolBehavior(enemy, currentTime);
  }
  
  /**
   * Handle chasing state - pursuing the player
   */
  handleChasingState(enemy, character, distanceToPlayer, distanceFromStart, currentTime) {
    const aiData = enemy.aiData;
    
    // Check if we've moved too far from start position
    if (distanceFromStart >= aiData.maxChaseDistance) {
      this.transitionToReturn(enemy);
      return;
    }
    
    // Check if player is close enough to attack
    if (distanceToPlayer <= this.map1Config.attackRange) {
      this.transitionToAttack(enemy, character);
      return;
    }
    
    // Check if player is still visible
    if (!aiData.isPlayerVisible) {
      // Lost sight of player, continue chasing for a short time
      const timeSinceLastSeen = currentTime - aiData.lastSeenPlayerTime;
      if (timeSinceLastSeen > 3000) { // 3 seconds grace period
        this.transitionToReturn(enemy);
        return;
      }
    }
    
    // Move towards player (don't modify speed - keep original)
    this.moveTowardsTarget(enemy, character.position, 1.0); // Use normal speed multiplier
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 🏃 ${enemy.type} chasing player - Distance: ${distanceToPlayer.toFixed(1)}px, From start: ${distanceFromStart.toFixed(1)}px`);
    }
  }
  
  /**
   * Handle returning state - going back to start position
   */
  handleReturningState(enemy, distanceFromStart, currentTime) {
    const aiData = enemy.aiData;
    
    // If close enough to start position, go back to patrolling
    if (distanceFromStart <= 50) {
      this.transitionToPatrol(enemy);
      return;
    }
    
    // If player comes back into view while returning, resume chase
    if (aiData.isPlayerVisible && distanceFromStart < aiData.maxChaseDistance * 0.8) {
      this.transitionToChase(enemy, aiData.chaseTarget);
      return;
    }
    
    // Move towards start position (don't modify speed - keep original)
    this.moveTowardsTarget(enemy, aiData.startPosition, 1.0); // Use normal speed multiplier
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 🔙 ${enemy.type} returning to start - Distance from start: ${distanceFromStart.toFixed(1)}px`);
    }
  }
  
  /**
   * Handle attacking state - performing attack animation and damage
   */
  handleAttackingState(enemy, character, distanceToPlayer, currentTime) {
    const aiData = enemy.aiData;
    
    // Check if attack cooldown has passed
    const timeSinceLastAttack = currentTime - aiData.lastAttackTime;
    if (timeSinceLastAttack < this.map1Config.attackCooldown) {
      return; // Still in cooldown
    }
    
    // If just entered attack state, immediately perform attack
    if (!aiData.attackAnimationStartTime) {
      // Stop enemy movement during attack animation
      enemy.speed = 0;
      
      // Perform attack immediately (damage and animation)
      this.performAttack(enemy, character);
      aiData.lastAttackTime = currentTime;
      aiData.attackAnimationStartTime = currentTime;
      
      if (this.debugEnabled) {
        console.log(`[ENEMY-AI] ⚔️ ${enemy.type} started attack animation`);
      }
      return;
    }
    
    // Keep enemy stopped during attack animation (1 second)
    const timeSinceAttackStart = currentTime - aiData.attackAnimationStartTime;
    if (timeSinceAttackStart < 1000) {
      // Still in attack animation - keep enemy stopped
      enemy.speed = 0;
      return;
    }
    
    // Attack animation finished - restore movement and decide next state
    aiData.attackAnimationStartTime = null; // Reset attack animation tracking
    enemy.speed = aiData.originalSpeed; // Restore movement speed
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] ✅ ${enemy.type} attack animation finished, resuming movement`);
    }
    
    // After attack animation, decide next state
    if (distanceToPlayer > this.map1Config.attackRange * 1.5) {
      // Player moved away, resume chasing
      this.transitionToChase(enemy, character);
    } else if (aiData.distanceFromStart >= aiData.maxChaseDistance) {
      // Too far from start, return
      this.transitionToReturn(enemy);
    } else {
      // Stay in attack range
      this.transitionToChase(enemy, character);
    }
  }
  
  /**
   * Handle stunned state - enemy is temporarily disabled
   */
  handleStunnedState(enemy, currentTime) {
    // Enemy doesn't move while stunned
    enemy.speed = 0;
    
    // This could be extended to handle hit stun from player attacks
  }
  
  /**
   * Transition to chase state
   */
  transitionToChase(enemy, target) {
    const aiData = enemy.aiData;
    aiData.currentState = this.AI_STATES.CHASING;
    // Don't modify enemy speed - keep original
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 🎯 ${enemy.type} started chasing player`);
    }
  }
  
  /**
   * Transition to return state
   */
  transitionToReturn(enemy) {
    const aiData = enemy.aiData;
    aiData.currentState = this.AI_STATES.RETURNING;
    // Don't modify enemy speed - keep original
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 🔙 ${enemy.type} returning to start position`);
    }
  }
  
  /**
   * Transition to patrol state
   */
  transitionToPatrol(enemy) {
    const aiData = enemy.aiData;
    aiData.currentState = this.AI_STATES.PATROLLING;
    // Don't modify enemy speed - keep original
    
    // Reset patrol data
    aiData.patrolDirection = this.getRandomDirection();
    aiData.lastPatrolChange = Date.now();
    aiData.isPatrolPaused = Math.random() < this.map1Config.patrolPauseChance;
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 🚶 ${enemy.type} started patrolling`);
    }
  }
  
  /**
   * Transition to idle state
   */
  transitionToIdle(enemy) {
    const aiData = enemy.aiData;
    aiData.currentState = this.AI_STATES.IDLE;
    // Don't modify enemy speed - keep original
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] 😴 ${enemy.type} in idle state`);
    }
  }
  
  /**
   * Transition to attack state
   */
  transitionToAttack(enemy, target) {
    const aiData = enemy.aiData;
    aiData.currentState = this.AI_STATES.ATTACKING;
    // Reset attack animation tracking when entering attack state
    aiData.attackAnimationStartTime = null;
    
    if (this.debugEnabled) {
      console.log(`[ENEMY-AI] ⚔️ ${enemy.type} attacking player`);
    }
  }
  
  /**
   * Perform attack on character
   */
  performAttack(enemy, character) {
    // Check if enemy is actually close enough to deal damage
    const distanceToCharacter = this.calculateDistance(enemy.position, character.position);
    
    // Only deal damage if slime is within attack range
    if (distanceToCharacter <= this.map1Config.attackRange) {
      // Deal damage to character
      if (character && character.takeDamage) {
        character.takeDamage(this.map1Config.attackDamage);
        
        // Make character flash red when hit
        this.showCharacterHitEffect(character);
        
        if (this.debugEnabled) {
          console.log(`[ENEMY-AI] 💥 ${enemy.type} attacked character for ${this.map1Config.attackDamage} damage at distance ${distanceToCharacter.toFixed(1)}px`);
        }
      }
    } else {
      if (this.debugEnabled) {
        console.log(`[ENEMY-AI] ❌ ${enemy.type} attack missed - too far from character (distance: ${distanceToCharacter.toFixed(1)}px, max: ${this.map1Config.attackRange}px)`);
      }
    }
    
    // Trigger attack animation regardless of hit/miss
    if (enemy.playAttackAnimation) {
      enemy.playAttackAnimation();
    } else if (enemy.setState) {
      enemy.setState('attack');
    }
  }
  
  /**
   * Show visual attack effect
   */
  showAttackEffect(enemy) {
    if (!enemy.sprite) return;
    
    // Simple flash effect
    const originalTint = enemy.sprite.tint;
    enemy.sprite.tint = 0xff0000; // Red flash
    
    setTimeout(() => {
      if (enemy.sprite && !enemy.sprite.destroyed) {
        enemy.sprite.tint = originalTint;
      }
    }, 200);
  }
  
  /**
   * Show red flash effect when character gets hit
   */
  showCharacterHitEffect(character) {
    if (!character.sprite) return;
    
    // Clear any existing timeout to prevent overlapping timers
    if (character._hitEffectTimeout) {
      clearTimeout(character._hitEffectTimeout);
      character._hitEffectTimeout = null;
    }
    
    // Always use normal white tint as the original (not the current tint in case character is already red)
    const originalTint = 0xFFFFFF; // Normal white tint
    
    // Flash red
    character.sprite.tint = 0xff0000; // Red flash
    
    // Restore original color after 300ms
    character._hitEffectTimeout = setTimeout(() => {
      if (character.sprite && !character.sprite.destroyed) {
        character.sprite.tint = originalTint;
      }
      character._hitEffectTimeout = null; // Clear the reference
    }, 300);
  }
  
  /**
   * Move enemy towards target position
   */
  moveTowardsTarget(enemy, targetPos, speedMultiplier) {
    const dx = targetPos.x - enemy.position.x;
    const dy = targetPos.y - enemy.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 10) { // Minimum movement threshold
      const moveSpeed = (enemy.aiData.originalSpeed * speedMultiplier) * 60; // Convert to pixels per second
      const moveDistance = Math.min(moveSpeed / 60, distance); // Frame-based movement
      
      const normalizedX = dx / distance;
      const normalizedY = dy / distance;
      
      enemy.position.x += normalizedX * moveDistance;
      enemy.position.y += normalizedY * moveDistance;
      
      // Update container position if it exists
      if (enemy.container) {
        enemy.container.x = enemy.position.x;
        enemy.container.y = enemy.position.y;
      }
      
      // Update enemy facing direction if available
      if (enemy.setDirection) {
        if (Math.abs(dx) > Math.abs(dy)) {
          enemy.setDirection(dx > 0 ? 'right' : 'left');
        } else {
          enemy.setDirection(dy > 0 ? 'down' : 'up');
        }
      }
    }
  }
  
  /**
   * Update patrol behavior for an enemy
   */
  updatePatrolBehavior(enemy, currentTime) {
    const aiData = enemy.aiData;
    
    // Check if it's time to change patrol direction or state
    const timeSinceLastChange = currentTime - aiData.lastPatrolChange;
    if (timeSinceLastChange > this.map1Config.patrolChangeInterval) {
      // Randomly decide to pause, change direction, or continue
      const rand = Math.random();
      if (rand < this.map1Config.patrolPauseChance) {
        aiData.isPatrolPaused = !aiData.isPatrolPaused;
      } else {
        aiData.patrolDirection = this.getRandomDirection();
        aiData.isPatrolPaused = false;
      }
      aiData.lastPatrolChange = currentTime;
    }
    
    // If not paused, move in patrol direction
    if (!aiData.isPatrolPaused) {
      this.moveInPatrolDirection(enemy);
    }
  }
  
  /**
   * Move enemy in current patrol direction
   */
  moveInPatrolDirection(enemy) {
    const aiData = enemy.aiData;
    const direction = aiData.patrolDirection;
    
    // Calculate target position based on direction (small movement)
    const patrolSpeed = aiData.originalSpeed * this.map1Config.patrolSpeed;
    const moveDistance = patrolSpeed * 2; // Small movement per frame
    
    let targetX = enemy.position.x;
    let targetY = enemy.position.y;
    
    switch (direction) {
      case 'up':
        targetY -= moveDistance;
        break;
      case 'down':
        targetY += moveDistance;
        break;
      case 'left':
        targetX -= moveDistance;
        break;
      case 'right':
        targetX += moveDistance;
        break;
      default:
        // Default to right movement if direction is invalid
        targetX += moveDistance;
        break;
    }
    
    // Check if the target position is within patrol range
    const distanceFromStart = this.calculateDistance(
      { x: targetX, y: targetY }, 
      aiData.startPosition
    );
    
    if (distanceFromStart <= this.map1Config.patrolRange) {
      // Move to target position
      enemy.position.x = targetX;
      enemy.position.y = targetY;
      
      // Update container position if it exists
      if (enemy.container) {
        enemy.container.x = targetX;
        enemy.container.y = targetY;
      }
      
      // Update enemy facing direction if available
      if (enemy.setDirection) {
        enemy.setDirection(direction);
      }
    } else {
      // Hit patrol boundary, choose new direction
      aiData.patrolDirection = this.getRandomDirection();
    }
  }
  
  /**
   * Get a random direction for patrol
   */
  getRandomDirection() {
    const directions = ['up', 'down', 'left', 'right'];
    return directions[Math.floor(Math.random() * directions.length)];
  }
  
  /**
   * Calculate distance between two positions
   */
  calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Draw debug information for AI
   */
  drawAIDebugInfo(enemy) {
    if (!enemy.aiData || !this.gameContainer) return;
    
    const aiData = enemy.aiData;
    
    // Draw chase range circle
    const chaseRangeGraphics = new PIXI.Graphics();
    chaseRangeGraphics.lineStyle(2, 0xff0000, 0.5);
    chaseRangeGraphics.drawCircle(aiData.startPosition.x, aiData.startPosition.y, aiData.maxChaseDistance);
    
    // Draw view range circle
    chaseRangeGraphics.lineStyle(2, 0x00ff00, 0.3);
    chaseRangeGraphics.drawCircle(enemy.position.x, enemy.position.y, this.map1Config.viewRange);
    
    // Draw line to start position
    chaseRangeGraphics.lineStyle(1, 0xffff00, 0.5);
    chaseRangeGraphics.moveTo(enemy.position.x, enemy.position.y);
    chaseRangeGraphics.lineTo(aiData.startPosition.x, aiData.startPosition.y);
    
    // Add to container temporarily
    this.gameContainer.addChild(chaseRangeGraphics);
    
    // Remove after one frame
    setTimeout(() => {
      if (chaseRangeGraphics.parent) {
        chaseRangeGraphics.parent.removeChild(chaseRangeGraphics);
      }
      chaseRangeGraphics.destroy();
    }, 100);
  }
  
  /**
   * Enable/disable AI debug mode
   */
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
    console.log(`[ENEMY-AI] 🧠 AI Debug mode ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Enable/disable AI debug visualization
   */
  setAIDebugVisualization(enabled) {
    this.showAIDebugInfo = enabled;
    console.log(`[ENEMY-AI] 👁️ AI Debug visualization ${enabled ? 'enabled' : 'disabled'}`);
  }
  
  /**
   * Get AI state for a specific enemy
   */
  getEnemyAIState(enemy) {
    return enemy.aiData ? enemy.aiData.currentState : 'none';
  }
  
  /**
   * Force enemy to specific AI state (for debugging)
   */
  forceEnemyState(enemy, state) {
    if (!enemy.aiData) {
      this.initializeEnemyAI(enemy);
    }
    
    enemy.aiData.currentState = state;
    console.log(`[ENEMY-AI] 🔧 Forced ${enemy.type} to state: ${state}`);
  }
  
  /**
   * Get AI statistics for all enemies
   */
  getAIStats(enemies) {
    if (!enemies) return {};
    
    const stats = {
      total: 0,
      idle: 0,
      chasing: 0,
      returning: 0,
      attacking: 0,
      stunned: 0
    };
    
    enemies.forEach(enemy => {
      if (enemy.isAlive && enemy.aiData) {
        stats.total++;
        const state = enemy.aiData.currentState;
        stats[state] = (stats[state] || 0) + 1;
      }
    });
    
    return stats;
  }
}
