import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';

/**
 * HeartPickupManager handles all heart pickup-related operations for Map1
 */
export default class HeartPickupManager {
  constructor(app, gameContainer, tileWidth, tileHeight, gridSize = 16) {
    this.app = app;
    this.gameContainer = gameContainer;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.gridSize = gridSize;
    
    // Container for heart pickups
    this.heartContainer = new PIXI.Container();
    this.heartContainer.sortableChildren = true;
    this.heartContainer.zIndex = 15000; // Above props and enemies
    
    // Array to store all hearts
    this.hearts = [];
    
    // Animation properties
    this.animationOffset = 0;
    this.animationSpeed = 0.002; // Slow animation speed
    this.animationRange = 20; // 20 pixels up and down movement
    
    // Flash properties
    this.flashDuration = 1000; // 1 second flash duration
    this.flashCount = 6; // Number of flashes
    
    // Track which hearts have been collected
    this.collectedHearts = new Set();
    
    // Character reference for collision detection
    this.character = null;
    
    // Portal tiles for special heart spawning
    this.portalTiles = new Set();
    
    debugLog('HeartPickupManager initialized', 'pickup');
  }

  /**
   * Set portal tiles for special heart generation
   * @param {Array} portalTiles - Array of {x, y} tile coordinates
   */
  setPortalTiles(portalTiles) {
    this.portalTiles.clear();
    portalTiles.forEach(tile => {
      const tileKey = `${tile.x},${tile.y}`;
      this.portalTiles.add(tileKey);
    });
    debugLog(`HeartPickupManager: Set ${portalTiles.length} portal tiles`, 'pickup');
  }

  /**
   * Set character reference for collision detection
   * @param {Object} character - Character instance
   */
  setCharacter(character) {
    this.character = character;
    debugLog('HeartPickupManager: Character reference set', 'pickup');
  }

  /**
   * Generate hearts for all tiles in Map1
   */
  generateHearts() {
    debugLog('HeartPickupManager: Generating hearts for Map1', 'pickup');
    
    // Clear existing hearts
    this.clearHearts();
    
    // Get character starting position (should be around center of map)
    const characterStartTileX = Math.floor(this.gridSize / 2);
    const characterStartTileY = Math.floor(this.gridSize / 2);
    
    // Generate hearts for each tile
    for (let tileX = 0; tileX < this.gridSize; tileX++) {
      for (let tileY = 0; tileY < this.gridSize; tileY++) {
        this.generateHeartsForTile(tileX, tileY, characterStartTileX, characterStartTileY);
      }
    }
    
    debugLog(`HeartPickupManager: Generated ${this.hearts.length} hearts total`, 'pickup');
  }

  /**
   * Generate hearts for a specific tile
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @param {number} charStartTileX - Character starting tile X
   * @param {number} charStartTileY - Character starting tile Y
   */
  generateHeartsForTile(tileX, tileY, charStartTileX, charStartTileY) {
    const tileKey = `${tileX},${tileY}`;
    const isPortalTile = this.portalTiles.has(tileKey);
    const isNearCharacterStart = Math.abs(tileX - charStartTileX) <= 1 && Math.abs(tileY - charStartTileY) <= 1;
    
    // Seed random based on tile coordinates for deterministic generation
    let seed = (tileX * 13337 + tileY * 51234) % 99991;
    const seededRandom = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    
    let heartsToGenerate = 0;
    
    if (isNearCharacterStart) {
      // Near character starting place - guaranteed 1 heart at 100% chance
      heartsToGenerate = 1;
      const heart = this.createHeart(tileX, tileY, 1.0, true); // 100% chance, guaranteed
      this.hearts.push(heart);
      debugLog(`HeartPickupManager: Generated guaranteed heart near character start at tile (${tileX}, ${tileY})`, 'pickup');
    } else if (isPortalTile) {
      // Portal tiles have 2 possible hearts
      heartsToGenerate = 2;
      for (let i = 0; i < heartsToGenerate; i++) {
        const chance = seededRandom();
        if (chance <= 0.5) { // 50% chance for each heart
          const heart = this.createHeart(tileX, tileY, 0.5, false);
          this.hearts.push(heart);
        }
      }
      debugLog(`HeartPickupManager: Generated hearts for portal tile (${tileX}, ${tileY})`, 'pickup');
    } else {
      // Regular tiles have 1 possible heart with 50% chance
      const chance = seededRandom();
      if (chance <= 0.5) { // 50% chance
        const heart = this.createHeart(tileX, tileY, 0.5, false);
        this.hearts.push(heart);
      }
    }
  }

  /**
   * Create a heart pickup
   * @param {number} tileX - Tile X coordinate
   * @param {number} tileY - Tile Y coordinate
   * @param {number} spawnChance - Spawn chance (for logging)
   * @param {boolean} guaranteed - Whether this heart is guaranteed
   * @returns {Object} Heart object
   */
  createHeart(tileX, tileY, spawnChance, guaranteed = false) {
    // Use seeded random for deterministic position generation based on tile coordinates
    let positionSeed = (tileX * 13337 + tileY * 51234) % 99991;
    const seededPositionRandom = () => {
      positionSeed = (positionSeed * 9301 + 49297) % 233280;
      return positionSeed / 233280;
    };

    // Generate deterministic random position within the tile
    const margin = 50; // Keep hearts away from tile edges
    const randomX = margin + seededPositionRandom() * (this.tileWidth - 2 * margin);
    const randomY = margin + seededPositionRandom() * (this.tileHeight - 2 * margin);
    
    const worldX = tileX * this.tileWidth + randomX;
    const worldY = tileY * this.tileHeight + randomY;
    
    // Create heart sprite
    const heartSprite = PIXI.Sprite.from(process.env.PUBLIC_URL + '/Extra/HP/hearticon.png');
    heartSprite.anchor.set(0.5);
    heartSprite.position.set(worldX, worldY);
    
    // Scale the heart to an appropriate size
    const heartScale = 0.08; // 10 times smaller than original
    heartSprite.scale.set(heartScale);
    
    // Set z-index for proper layering
    heartSprite.zIndex = 16000;
    
    // High-quality rendering
    heartSprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    
    // Create heart object with deterministic animation offset
    const heart = {
      id: `heart_${tileX}_${tileY}_deterministic`,
      sprite: heartSprite,
      tileX: tileX,
      tileY: tileY,
      worldX: worldX,
      worldY: worldY,
      baseY: worldY, // Store original Y position for animation
      animationOffset: (tileX + tileY) * Math.PI * 0.1, // Deterministic animation phase based on tile coordinates
      isCollected: false,
      guaranteed: guaranteed,
      spawnChance: spawnChance
    };
    
    // Add to heart container
    this.heartContainer.addChild(heartSprite);
    
    debugLog(`HeartPickupManager: Created heart at world position (${worldX.toFixed(1)}, ${worldY.toFixed(1)}) in tile (${tileX}, ${tileY})${guaranteed ? ' [GUARANTEED]' : ''}`, 'pickup');
    
    return heart;
  }

  /**
   * Update all hearts (animation and collision detection)
   * @param {number} delta - Time delta
   */
  update(delta) {
    if (!this.character) return;
    
    // Update animation offset
    this.animationOffset += this.animationSpeed * delta;
    
    // Update each heart
    this.hearts.forEach(heart => {
      if (heart.isCollected) return;
      
      // Update floating animation
      const phaseOffset = heart.animationOffset;
      const floatY = Math.sin(this.animationOffset + phaseOffset) * this.animationRange;
      heart.sprite.y = heart.baseY + floatY;
      
      // Check collision with character
      this.checkHeartCollision(heart);
    });
  }

  /**
   * Check collision between heart and character
   * @param {Object} heart - Heart object
   */
  checkHeartCollision(heart) {
    if (!this.character || !this.character.position || heart.isCollected) return;
    
    const distance = Math.sqrt(
      Math.pow(heart.worldX - this.character.position.x, 2) +
      Math.pow(heart.worldY - this.character.position.y, 2)
    );
    
    const collisionDistance = 60; // Collision radius
    
    if (distance <= collisionDistance) {
      this.collectHeart(heart);
    }
  }

  /**
   * Collect a heart and add HP to player
   * @param {Object} heart - Heart object to collect
   */
  collectHeart(heart) {
    if (heart.isCollected) return;
    
    debugLog(`HeartPickupManager: Heart collected at (${heart.worldX.toFixed(1)}, ${heart.worldY.toFixed(1)})`, 'pickup');
    
    // Mark as collected
    heart.isCollected = true;
    this.collectedHearts.add(heart.id);
    
    // Try to heal the character
    if (this.character && this.character.heal) {
      const oldHP = this.character.currentHP;
      const newHP = this.character.heal(1); // Add 1 HP
      const actualHeal = newHP - oldHP;
      
      if (actualHeal > 0) {
        debugLog(`HeartPickupManager: Player healed for ${actualHeal} HP (${oldHP} -> ${newHP})`, 'pickup');
      } else {
        debugLog(`HeartPickupManager: Player already at max HP (${oldHP}/${this.character.maxHP})`, 'pickup');
      }
    }
    
    // Start flash animation before removing
    this.flashHeart(heart);
  }

  /**
   * Flash heart before removing it
   * @param {Object} heart - Heart object to flash
   */
  flashHeart(heart) {
    let flashCount = 0;
    const flashInterval = this.flashDuration / (this.flashCount * 2); // Each flash has on/off cycle
    
    const flashTimer = setInterval(() => {
      if (heart.sprite && heart.sprite.parent) {
        heart.sprite.visible = !heart.sprite.visible;
        flashCount++;
        
        if (flashCount >= this.flashCount * 2) {
          clearInterval(flashTimer);
          this.removeHeart(heart);
        }
      } else {
        clearInterval(flashTimer);
      }
    }, flashInterval);
  }

  /**
   * Remove heart from the game
   * @param {Object} heart - Heart object to remove
   */
  removeHeart(heart) {
    if (heart.sprite && heart.sprite.parent) {
      heart.sprite.parent.removeChild(heart.sprite);
      heart.sprite.destroy();
    }
    
    // Remove from hearts array
    const index = this.hearts.findIndex(h => h.id === heart.id);
    if (index !== -1) {
      this.hearts.splice(index, 1);
    }
    
    debugLog(`HeartPickupManager: Heart removed`, 'pickup');
  }

  /**
   * Clear all hearts
   */
  clearHearts() {
    this.hearts.forEach(heart => {
      if (heart.sprite && heart.sprite.parent) {
        heart.sprite.parent.removeChild(heart.sprite);
        heart.sprite.destroy();
      }
    });
    this.hearts = [];
    this.collectedHearts.clear();
    debugLog('HeartPickupManager: All hearts cleared', 'pickup');
  }

  /**
   * Add heart container to a parent container
   * @param {PIXI.Container} parentContainer - Parent container
   */
  addToContainer(parentContainer) {
    if (parentContainer && !this.heartContainer.parent) {
      parentContainer.addChild(this.heartContainer);
      debugLog('HeartPickupManager: Heart container added to parent', 'pickup');
    }
  }

  /**
   * Get heart container for adding to scene
   * @returns {PIXI.Container} Heart container
   */
  getContainer() {
    return this.heartContainer;
  }

  /**
   * Get statistics about hearts
   * @returns {Object} Heart statistics
   */
  getStats() {
    return {
      total: this.hearts.length,
      collected: this.collectedHearts.size,
      remaining: this.hearts.filter(h => !h.isCollected).length
    };
  }

  /**
   * Destroy the heart pickup manager
   */
  destroy() {
    this.clearHearts();
    
    if (this.heartContainer && this.heartContainer.parent) {
      this.heartContainer.parent.removeChild(this.heartContainer);
    }
    if (this.heartContainer) {
      this.heartContainer.destroy();
    }
    
    debugLog('HeartPickupManager: Destroyed', 'pickup');
  }
}
