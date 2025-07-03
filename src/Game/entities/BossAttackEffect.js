import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';
import { 
  playBossThunderExplosion, 
  playBossZapBoltExplosion, 
  playBossZapCone 
} from '../../utils/AudioManager';

/**
 * BossAttackEffect - Handles visual effects for boss attacks
 * Creates projectiles, area effects, and visual animations for boss abilities
 */
export default class BossAttackEffect {
  constructor(app, container) {
    this.app = app;
    this.container = container; // Container to add effects to
    this.activeEffects = [];
    
    // Load attack effect textures
    this.loadTextures();
    
    debugLog('BossAttackEffect system initialized', 'boss');
  }

  // Load all attack effect textures
  loadTextures() {
    this.textures = {
      thunder: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/thunder.png'),
      zapBolt1: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/zap_bolt1.png'),
      zapBolt2: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/zap_bolts2.png'),
      zapBolt3: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/zap_bolts3.png'),
      zapCone1: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/zap_cone1.png'),
      zapCone2: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/zap_cone2.png'),
      zapCone3: PIXI.Texture.from(process.env.PUBLIC_URL + '/Boss/atacks/zap_cone3.png')
    };

    // Set high quality rendering for all textures
    Object.values(this.textures).forEach(texture => {
      texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
      texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    });

    debugLog('Boss attack textures loaded', 'boss');
  }

  // Create thunder attack effect at target position
  createThunderAttack(targetX, targetY) {
    const effect = new PIXI.Sprite(this.textures.thunder);
    effect.anchor.set(0.5);
    effect.position.set(targetX, targetY);
    effect.scale.set(0.8);
    effect.alpha = 0;
    effect.zIndex = 1500;

    // Add to container
    this.container.addChild(effect);
    this.activeEffects.push(effect);

    // Play sound effect
    playBossThunderExplosion();

    // Animation: fade in, scale up, then fade out
    const startTime = Date.now();
    const duration = 1000; // 1 second effect

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.3) {
        // Fade in and scale up
        const fadeProgress = progress / 0.3;
        effect.alpha = fadeProgress;
        effect.scale.set(0.8 + fadeProgress * 0.4); // Scale from 0.8 to 1.2
      } else if (progress < 0.7) {
        // Hold at full intensity
        effect.alpha = 1;
        effect.scale.set(1.2);
      } else {
        // Fade out
        const fadeProgress = (progress - 0.7) / 0.3;
        effect.alpha = 1 - fadeProgress;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.destroyEffect(effect);
      }
    };

    animate();
    debugLog(`Thunder attack created at (${targetX}, ${targetY})`, 'boss');
  }

  // Create zap bolt projectile attack
  createZapBoltAttack(startX, startY, targetX, targetY) {
    // Create animated zap bolt with multiple frames
    const zapBoltTextures = [
      this.textures.zapBolt1,
      this.textures.zapBolt2,
      this.textures.zapBolt3
    ];

    const effect = new PIXI.AnimatedSprite(zapBoltTextures);
    effect.anchor.set(0.5);
    effect.position.set(startX, startY);
    effect.scale.set(0.6);
    effect.animationSpeed = 0.3;
    effect.loop = true;
    effect.play();
    effect.zIndex = 1400;

    // Calculate movement direction
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = 300; // pixels per second
    const duration = (distance / speed) * 1000; // Convert to milliseconds

    // Rotate to face target
    effect.rotation = Math.atan2(dy, dx);

    // Add to container
    this.container.addChild(effect);
    this.activeEffects.push(effect);

    // Animate movement
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Move towards target
      effect.position.x = startX + dx * progress;
      effect.position.y = startY + dy * progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Create explosion at target
        this.createZapBoltExplosion(targetX, targetY);
        this.destroyEffect(effect);
      }
    };

    animate();
    debugLog(`Zap bolt attack created from (${startX}, ${startY}) to (${targetX}, ${targetY})`, 'boss');
  }

  // Create zap bolt explosion at impact
  createZapBoltExplosion(x, y) {
    const effect = new PIXI.Sprite(this.textures.zapBolt3);
    effect.anchor.set(0.5);
    effect.position.set(x, y);
    effect.scale.set(0.5);
    effect.alpha = 0;
    effect.zIndex = 1500;

    this.container.addChild(effect);
    this.activeEffects.push(effect);

    // Play explosion sound
    playBossZapBoltExplosion();

    // Quick flash explosion
    const startTime = Date.now();
    const duration = 500;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.2) {
        // Quick fade in
        effect.alpha = progress / 0.2;
        effect.scale.set(0.5 + (progress / 0.2) * 0.3);
      } else {
        // Fade out
        const fadeProgress = (progress - 0.2) / 0.8;
        effect.alpha = 1 - fadeProgress;
        effect.scale.set(0.8 + fadeProgress * 0.4);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.destroyEffect(effect);
      }
    };

    animate();
  }

  // Create zap cone area attack
  createZapConeAttack(centerX, centerY, direction = 'right') {
    // Create animated cone effect
    const coneTextures = [
      this.textures.zapCone1,
      this.textures.zapCone2,
      this.textures.zapCone3
    ];

    const effect = new PIXI.AnimatedSprite(coneTextures);
    effect.anchor.set(0.5);
    effect.position.set(centerX, centerY);
    effect.scale.set(1.0);
    effect.animationSpeed = 0.2;
    effect.loop = true;
    effect.alpha = 0;
    effect.zIndex = 1450;

    // Flip for left direction
    if (direction === 'left') {
      effect.scale.x = -Math.abs(effect.scale.x);
    }

    this.container.addChild(effect);
    this.activeEffects.push(effect);

    // Play cone sound
    playBossZapCone();

    // Start animation
    effect.play();

    // Animate appearance and disappearance
    const startTime = Date.now();
    const duration = 2000; // 2 second effect

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      if (progress < 0.2) {
        // Fade in
        effect.alpha = progress / 0.2;
      } else if (progress < 0.8) {
        // Hold full intensity
        effect.alpha = 1;
      } else {
        // Fade out
        const fadeProgress = (progress - 0.8) / 0.2;
        effect.alpha = 1 - fadeProgress;
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.destroyEffect(effect);
      }
    };

    animate();
    debugLog(`Zap cone attack created at (${centerX}, ${centerY}) facing ${direction}`, 'boss');
  }

  // Destroy a specific effect
  destroyEffect(effect) {
    if (effect && effect.parent) {
      effect.parent.removeChild(effect);
    }
    if (effect) {
      if (effect.stop) effect.stop(); // Stop animation if it's an AnimatedSprite
      effect.destroy();
    }

    // Remove from active effects
    const index = this.activeEffects.indexOf(effect);
    if (index > -1) {
      this.activeEffects.splice(index, 1);
    }
  }

  // Clean up all active effects
  destroy() {
    this.activeEffects.forEach(effect => {
      this.destroyEffect(effect);
    });
    this.activeEffects = [];
    debugLog('BossAttackEffect system destroyed', 'boss');
  }
}
