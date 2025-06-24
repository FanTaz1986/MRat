import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';

export default class Pet {
  constructor(app, initialX, initialY, mapId = 'maparea0') {
    this.app = app;
    this.mapId = mapId;
    this.position = { x: initialX, y: initialY };
    this.velocity = { x: 0, y: 0 };
    this.direction = 'right'; // default facing right
    this.isMoving = false;
    this.moveSpeed = 4;
    this.animationSpeed = 0.15;
    this.bounds = null;
    this.isAttacking = false;
    this.attackDuration = 100; // ms
    this.lastAttackTime = 0;

    // Animation frames by direction
    this.frameIndices = {
      right: 0,
      left: 0
    };

    // Animation timing
    this.lastFrameTime = 0;
    this.frameUpdateInterval = 250;

    // Setup input
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false
    };

    this.setupSprite();
    this.setupInputListeners();
    this.app.ticker.add(this.update, this);
  }

  setupSprite() {
    debugLog('Setting up pet sprite', 'pet');

    // Helper to create mirrored texture
    const createMirroredTexture = (path) => {
      const baseTexture = PIXI.BaseTexture.from(process.env.PUBLIC_URL + path);
      const frame = new PIXI.Rectangle(0, 0, baseTexture.width, baseTexture.height);
      const texture = new PIXI.Texture(baseTexture, frame);
      texture.defaultAnchor = new PIXI.Point(0.5, 0.5);
      texture._isMirrored = true;
      return texture;
    };

    // Helper to create normal texture
    const createTexture = (path) => {
      const texture = PIXI.Texture.from(process.env.PUBLIC_URL + path);
      texture.defaultAnchor = new PIXI.Point(0.5, 0.5);
      return texture;
    };

    // Animations for all levels
    this.animations = {
      // 0lvl
      idle_0: [createTexture('/Ziurke/0lvl/1_ziurke_still.png')],
      idle_left_0: [createMirroredTexture('/Ziurke/0lvl/1_ziurke_still.png')],
      move_0: [
        createTexture('/Ziurke/0lvl/1_ejimas_1.png'),
        createTexture('/Ziurke/0lvl/1_ejimas_2.png')
      ],
      move_left_0: [
        createMirroredTexture('/Ziurke/0lvl/1_ejimas_1.png'),
        createMirroredTexture('/Ziurke/0lvl/1_ejimas_2.png')
      ],
      attack_0: [createTexture('/Ziurke/0lvl/1_ziurke_spjauna.png')],
      attack_left_0: [createMirroredTexture('/Ziurke/0lvl/1_ziurke_spjauna.png')],
      // 1lvl
      idle_1: [createTexture('/Ziurke/1lvl/2_ziurke_still.png')],
      idle_left_1: [createMirroredTexture('/Ziurke/1lvl/2_ziurke_still.png')],
      move_1: [
        createTexture('/Ziurke/1lvl/2_ejimas_1.png'),
        createTexture('/Ziurke/1lvl/2_ejimas_2.png')
      ],
      move_left_1: [
        createMirroredTexture('/Ziurke/1lvl/2_ejimas_1.png'),
        createMirroredTexture('/Ziurke/1lvl/2_ejimas_2.png')
      ],
      attack_1: [createTexture('/Ziurke/1lvl/2_ziurke_spjauna.png')],
      attack_left_1: [createMirroredTexture('/Ziurke/1lvl/2_ziurke_spjauna.png')],
      // 2lvl
      idle_2: [createTexture('/Ziurke/2lvl/3_ziurke_still.png')],
      idle_left_2: [createMirroredTexture('/Ziurke/2lvl/3_ziurke_still.png')],
      move_2: [
        createTexture('/Ziurke/2lvl/3_ejimas_1.png'),
        createTexture('/Ziurke/2lvl/3_ejimas_2.png')
      ],
      move_left_2: [
        createMirroredTexture('/Ziurke/2lvl/3_ejimas_1.png'),
        createMirroredTexture('/Ziurke/2lvl/3_ejimas_2.png')
      ],
      attack_2: [createTexture('/Ziurke/2lvl/3_ziurke_spjauna.png')],
      attack_left_2: [createMirroredTexture('/Ziurke/2lvl/3_ziurke_spjauna.png')],
    };

    // Set current level (0, 1, or 2)
    this.currentLevel = 0;

    // Default to idle right for current level
    this.sprite = new PIXI.Sprite(this.animations[`idle_${this.currentLevel}`][0]);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = true;
    this.sprite.alpha = 1;

    // Scale to match character (assume 164px width as in Character.js)
    const desiredWidth = 164;
    const scale = desiredWidth / 2790;
    this.sprite.scale.set(scale);

    this.sprite.position.set(this.position.x, this.position.y);
    this.sprite.zIndex = 999; // Just below main character

    // Add to stage or relevant container in your game logic
    this.app.stage.addChild(this.sprite);
  }

  setupInputListeners() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    switch (e.key.toLowerCase()) {
      case 'w':
        this.keys.up = true;
        break;
      case 's':
        this.keys.down = true;
        break;
      case 'a':
        this.keys.left = true;
        break;
      case 'd':
        this.keys.right = true;
        break;
      case ' ':
        if (!this.isAttacking) {
          this.keys.attack = true;
          this.isAttacking = true;
          this.lastAttackTime = Date.now();
        }
        break;
      default:
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.key.toLowerCase()) {
      case 'w':
        this.keys.up = false;
        break;
      case 's':
        this.keys.down = false;
        break;
      case 'a':
        this.keys.left = false;
        break;
      case 'd':
        this.keys.right = false;
        break;
      case ' ':
        this.keys.attack = false;
        break;
      default:
        break;
    }
  }

  update = (delta) => {
    // Handle attack animation
    if (this.isAttacking) {
      const now = Date.now();
      if (now - this.lastAttackTime < this.attackDuration) {
        // Show attack frame
        if (this.direction === 'left') {
          this.sprite.texture = this.animations[`attack_left_${this.currentLevel}`][0];
          this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
        } else {
          this.sprite.texture = this.animations[`attack_${this.currentLevel}`][0];
          this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
        }
        return;
      } else {
        this.isAttacking = false;
      }
    }

    // Movement
    let dx = 0, dy = 0;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;

    // Normalize diagonal
    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    this.velocity.x = dx * this.moveSpeed * delta;
    this.velocity.y = dy * this.moveSpeed * delta;

    // Update direction
    if (dx < 0) this.direction = 'left';
    else if (dx > 0) this.direction = 'right';

    // Update position
    this.position.x += this.velocity.x;
    this.position.y += this.velocity.y;
    this.sprite.position.set(this.position.x, this.position.y);

    // Animation
    if (this.isAttacking) {
      // Already handled above
      return;
    } else if (dx !== 0 || dy !== 0) {
      // Moving
      const now = Date.now();
      if (!this.lastFrameTime || now - this.lastFrameTime > this.frameUpdateInterval) {
        this.lastFrameTime = now;
        this.frameIndices[this.direction] = (this.frameIndices[this.direction] + 1) % 2;
      }
      if (this.direction === 'left') {
        this.sprite.texture = this.animations[`move_left_${this.currentLevel}`][this.frameIndices.left];
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        this.sprite.texture = this.animations[`move_${this.currentLevel}`][this.frameIndices.right];
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    } else {
      // Idle
      if (this.direction === 'left') {
        this.sprite.texture = this.animations[`idle_left_${this.currentLevel}`][0];
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        this.sprite.texture = this.animations[`idle_${this.currentLevel}`][0];
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    }
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    this.sprite.destroy();
  }
}