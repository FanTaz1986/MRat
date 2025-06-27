import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';

export default class Boss {
  constructor(app, initialX, initialY) {
    this.app = app;
    this.position = { x: initialX, y: initialY };
    this.direction = 'right';
    this.isMoving = false;
    this.animationSpeed = 0.15;
    this.lastFrameTime = 0;
    this.frameUpdateInterval = 250;
    this.frameIndices = { idle: 0, atk: 0, fly: 0 };
    this.setupSprite();
    this.app.ticker.add(this.update, this);
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
    debugLog('Setting up boss sprite', 'boss');
    const createTexture = (path) => this.createHighQualityTexture(path);
    // Animations
    this.animations = {
      idle: [
        createTexture('/Boss/Frames/boss_idle_1.png'),
        createTexture('/Boss/Frames/boss_idle_2.png')
      ],
      fly: [
        createTexture('/Boss/Frames/boss_fly_1.png'),
        createTexture('/Boss/Frames/boss_fly_2.png')
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
    // Default to idle
    this.sprite = new PIXI.Sprite(this.animations.idle[0]);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = true;
    this.sprite.alpha = 1;
    // High-quality scaling
    const desiredWidth = 300; // Adjust as needed for boss size
    const scale = desiredWidth / this.sprite.texture.width;
    this.sprite.scale.set(scale);
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false;
    this.sprite.position.set(this.position.x, this.position.y);
    this.sprite.zIndex = 2000;
    this.app.stage.addChild(this.sprite);
    debugLog('Boss sprite initialized', 'boss');
  }

  update = (delta) => {
    // Example: simple idle animation
    const now = Date.now();
    if (!this.lastFrameTime || now - this.lastFrameTime > this.frameUpdateInterval) {
      this.lastFrameTime = now;
      this.frameIndices.idle = (this.frameIndices.idle + 1) % this.animations.idle.length;
      this.sprite.texture = this.animations.idle[this.frameIndices.idle];
      this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    }
    // ...add more animation logic as needed
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
