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
    this.moveSpeed = 5.2; // Increased by 30% from 4
    this.animationSpeed = 0.15;
    this.bounds = null;
    this.isAttacking = false;
    this.attackDuration = 100; // ms
    this.lastAttackTime = 0;
    
    // Growth and range system
    this.characterReference = null; // Reference to main character
    this.baseRange = 164; // Base range (one character height) for map0
    this.currentRange = this.baseRange;
    
    // Pet scaling based on level/map
    this.baseScale = 0.7; // Base scale for map0
    this.currentScale = this.baseScale;
    this.isFollowing = false; // Whether pet is following the character
    this.followSpeed = 5.85; // Increased by 30% from 4.5 - slightly faster than move speed when following
    
    // Character reference for following
    this.character = null;
    this.camera = null; // Reference to camera for viewport bounds
    
    // Distance limits based on character size
    this.baseMaxDistance = 164; // One character height at map0
    this.currentMaxDistance = this.baseMaxDistance;

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

    // Helper to create mirrored texture with high quality
    const createMirroredTexture = (path) => {
      const baseTexture = PIXI.BaseTexture.from(process.env.PUBLIC_URL + path);
      
      // High-quality settings for pet textures
      baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
      baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
      
      const frame = new PIXI.Rectangle(0, 0, baseTexture.width, baseTexture.height);
      const texture = new PIXI.Texture(baseTexture, frame);
      texture.defaultAnchor = new PIXI.Point(0.5, 0.5);
      texture._isMirrored = true;
      return texture;
    };

    // Helper to create normal texture with high quality
    const createTexture = (path) => {
      const baseTexture = PIXI.BaseTexture.from(process.env.PUBLIC_URL + path);
      
      // High-quality settings for pet textures
      baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
      baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
      
      const texture = new PIXI.Texture(baseTexture);
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

    // Set current level based on map
    this.currentLevel = this.getPetLevelForMap(this.mapId);
    
    // Calculate max distance based on level
    this.currentMaxDistance = this.baseMaxDistance * (1 + this.currentLevel);

    // Default to idle right for current level
    this.sprite = new PIXI.Sprite(this.animations[`idle_${this.currentLevel}`][0]);
    this.sprite.anchor.set(0.5);
    this.sprite.visible = true;
    this.sprite.alpha = 1;

    // Scale based on map (different sizes for different maps) with high-quality scaling
    const petSize = this.getPetSizeForMap(this.mapId);
    const scale = petSize / 2790; // 2790 is original art width
    
    // Apply high-quality scaling for crisp pet rendering
    this.sprite.scale.set(scale);
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false; // Allow sub-pixel positioning for smooth movement

    this.sprite.position.set(this.position.x, this.position.y);
    this.sprite.zIndex = 999; // Just below main character (1000)

    // Don't add to stage here - let MapManager add it to the proper layer
    // this.app.stage.addChild(this.sprite);
    
    debugLog(`Pet: Initialized for map ${this.mapId} - Level: ${this.currentLevel}, Size: ${petSize}px, Scale: ${scale.toFixed(4)}`, 'pet');
  }

  setupInputListeners() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  handleKeyDown(e) {
    // Pet controls - only WASD and spacebar, not teleport key 'T'
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
        e.preventDefault(); // Prevent default spacebar behavior
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
          // Ensure high-quality rendering for attack texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
          this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
        } else {
          this.sprite.texture = this.animations[`attack_${this.currentLevel}`][0];
          // Ensure high-quality rendering for attack texture
          this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
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

    // Update position with proper boundary checking for each axis
    let newX = this.position.x + this.velocity.x;
    let newY = this.position.y + this.velocity.y;
    
    // Check if the pet would move out of allowed range from character
    if (this.character && this.character.position) {
      const futureDistance = Math.sqrt(
        Math.pow(newX - this.character.position.x, 2) +
        Math.pow(newY - this.character.position.y, 2)
      );
      
      // If the pet would move out of range, restrict movement
      if (futureDistance > this.currentMaxDistance) {
        // Calculate the maximum allowed position
        const currentDistance = Math.sqrt(
          Math.pow(this.position.x - this.character.position.x, 2) +
          Math.pow(this.position.y - this.character.position.y, 2)
        );
        
        if (currentDistance < this.currentMaxDistance) {
          // Pet is within range but trying to move out - allow partial movement
          const dx = newX - this.character.position.x;
          const dy = newY - this.character.position.y;
          const angle = Math.atan2(dy, dx);
          
          newX = this.character.position.x + Math.cos(angle) * this.currentMaxDistance;
          newY = this.character.position.y + Math.sin(angle) * this.currentMaxDistance;
        } else {
          // Pet is already at or beyond range - don't allow movement away from character
          newX = this.position.x;
          newY = this.position.y;
        }
      }
    }
    
    // Check bounds independently for each axis to allow diagonal movement when possible
    
    // Map bounds check
    if (this.bounds) {
      newX = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newX));
      newY = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, newY));
    }
    
    // Camera viewport bounds check - handle each axis separately
    // Only log camera bounds check occasionally to avoid spam
    const now = Date.now();
    if (!this._lastCameraBoundsLog || now - this._lastCameraBoundsLog > 5000) {
      debugLog(`Pet: Camera bounds check (throttled logging)`, 'pet');
      this._lastCameraBoundsLog = now;
    }
    
    const cameraBounds = this.getCameraBounds();
    if (cameraBounds) {
      // Check X axis independently
      if (newX < cameraBounds.minX || newX > cameraBounds.maxX) {
        const oldX = newX;
        newX = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, newX));
        debugLog(`Pet X restricted: ${oldX.toFixed(1)} -> ${newX.toFixed(1)} (bounds: ${cameraBounds.minX.toFixed(1)} to ${cameraBounds.maxX.toFixed(1)})`, 'pet');
        debugLog(`Screen W: ${this.app.screen.width}, Camera X: ${this.camera.position.x.toFixed(1)}, Zoom: ${this.camera.zoom}`, 'pet');
      }
      
      // Check Y axis independently  
      if (newY < cameraBounds.minY || newY > cameraBounds.maxY) {
        const oldY = newY;
        newY = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, newY));
        debugLog(`Pet Y restricted: ${oldY.toFixed(1)} -> ${newY.toFixed(1)} (bounds: ${cameraBounds.minY.toFixed(1)} to ${cameraBounds.maxY.toFixed(1)})`, 'pet');
        debugLog(`Screen H: ${this.app.screen.height}, Camera Y: ${this.camera.position.y.toFixed(1)}, Zoom: ${this.camera.zoom}`, 'pet');
      }
    } else {
      debugLog(`Pet: Camera bounds could not be retrieved - pet movement will not be restricted to viewport`, 'pet');
    }
    
    this.position.x = newX;
    this.position.y = newY;
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
        // Ensure high-quality rendering for new texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        this.sprite.texture = this.animations[`move_${this.currentLevel}`][this.frameIndices.right];
        // Ensure high-quality rendering for new texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    } else {
      // Idle
      if (this.direction === 'left') {
        this.sprite.texture = this.animations[`idle_left_${this.currentLevel}`][0];
        // Ensure high-quality rendering for new texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        this.sprite.texture = this.animations[`idle_${this.currentLevel}`][0];
        // Ensure high-quality rendering for new texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    }

    // Check following behavior (only when not being controlled by player)
    const playerControlling = this.keys.up || this.keys.down || this.keys.left || this.keys.right;
    
    if (this.character && !this.isAttacking && !playerControlling) {
      if (this.isOutOfRange()) {
        this.moveTowardsCharacter(delta);
        return; // Skip other animations when following
      }
    }
  }

  // Set character reference for following behavior
  setCharacter(character) {
    this.character = character;
    debugLog('Pet: Character reference set for following behavior', 'pet');
  }

  // Set camera reference for viewport bounds checking
  setCamera(camera) {
    this.camera = camera;
    debugLog(`Pet: Camera reference set for viewport bounds. Camera object: ${camera ? 'Available' : 'NULL'}`, 'pet');
    if (camera) {
      debugLog(`Pet: Camera position: (${camera.position?.x || 'undefined'}, ${camera.position?.y || 'undefined'}), zoom: ${camera.zoom || 'undefined'}`, 'pet');
    } else {
      debugLog('Pet: WARNING - Camera reference is NULL!', 'pet');
    }
  }

  // Get the pet sprite for adding to containers
  getSprite() {
    return this.sprite;
  }

  // Calculate pet size based on current map
  getPetSizeForMap(mapId) {
    const characterSize = 164; // Base character size
    
    switch (mapId) {
      case 'maparea0':
        return characterSize * 0.25; // 2x larger - 1/4 of character size
      case 'maparea1':
        return characterSize * 0.5;  // 2x larger - 1/2 of character size  
      case 'maparea2':
      case 'mapareax':
        return characterSize * 1.0;  // 2x larger - same as character size
      default:
        return characterSize * 0.25;  // Default to smallest size
    }
  }

  // Calculate pet level based on map
  getPetLevelForMap(mapId) {
    switch (mapId) {
      case 'maparea0':
        return 0; // Smallest level
      case 'maparea1':
        return 1; // Medium level
      case 'maparea2':
      case 'mapareax':
        return 2; // Largest level
      default:
        return 0;
    }
  }

  // Update pet when map changes
  updateForMap(mapId) {
    this.mapId = mapId;
    this.currentLevel = this.getPetLevelForMap(mapId);
    
    // Update max distance based on level (100% more each level)
    this.currentMaxDistance = this.baseMaxDistance * (1 + this.currentLevel);
    
    // Update sprite size with high-quality scaling
    const newSize = this.getPetSizeForMap(mapId);
    const scale = newSize / 2790; // 2790 is original art width
    this.sprite.scale.set(Math.abs(scale), Math.abs(scale));
    
    // Ensure high-quality rendering after resize
    this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    this.sprite.roundPixels = false;
    
    // Preserve direction when updating scale
    if (this.direction === 'left') {
      this.sprite.scale.x = -Math.abs(this.sprite.scale.x);
    }
    
    debugLog(`Pet: Updated for map ${mapId} - Level: ${this.currentLevel}, Size: ${newSize}px, Max Distance: ${this.currentMaxDistance}px`, 'pet');
  }

  // Set bounds for the pet (prevent it from going outside map)
  setBounds(bounds) {
    this.bounds = bounds;
    debugLog(`Pet bounds set: ${JSON.stringify(bounds)}`, 'pet');
  }

  // Get current camera viewport bounds in world coordinates
  getCameraBounds() {
    if (!this.camera) {
      return null;
    }
    
    // Throttle debug logging to avoid spam
    const now = Date.now();
    const shouldLog = !this._lastBoundsLog || now - this._lastBoundsLog > 5000;
    
    if (shouldLog) {
      debugLog(`Pet: Camera reference exists. Position: (${this.camera.position?.x || 'undefined'}, ${this.camera.position?.y || 'undefined'})`, 'pet');
      debugLog(`Pet: Camera zoom: ${this.camera.zoom || 'undefined'}`, 'pet');
      debugLog(`Pet: Screen dimensions: ${this.app.screen.width}x${this.app.screen.height}`, 'pet');
      this._lastBoundsLog = now;
    }
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // The camera position represents the top-left corner of the viewport in world coordinates
    // But we need to account for zoom - the viewport size in world coordinates is screen size / zoom
    const viewportWidth = screenWidth / this.camera.zoom;
    const viewportHeight = screenHeight / this.camera.zoom;
    
    if (shouldLog) {
      debugLog(`Pet: Viewport size in world coordinates: ${viewportWidth.toFixed(1)}x${viewportHeight.toFixed(1)}`, 'pet');
    }
    
    // Camera position is already the top-left corner in world coordinates
    const viewportLeft = this.camera.position.x;
    const viewportTop = this.camera.position.y;
    const viewportRight = this.camera.position.x + viewportWidth;
    const viewportBottom = this.camera.position.y + viewportHeight;
    
    // Apply 5% margin from the edges
    const marginX = viewportWidth * 0.05;
    const marginY = viewportHeight * 0.05;
    
    const bounds = {
      minX: viewportLeft + marginX,
      minY: viewportTop + marginY,
      maxX: viewportRight - marginX,
      maxY: viewportBottom - marginY
    };
    
    if (shouldLog) {
      debugLog(`Pet: Calculated viewport bounds: (${bounds.minX.toFixed(1)}, ${bounds.minY.toFixed(1)}) to (${bounds.maxX.toFixed(1)}, ${bounds.maxY.toFixed(1)})`, 'pet');
    }
    
    return bounds;
  }

  // Check if pet is too far from character
  isOutOfRange() {
    if (!this.character || !this.character.position) {
      return false;
    }
    
    const distance = Math.sqrt(
      Math.pow(this.position.x - this.character.position.x, 2) +
      Math.pow(this.position.y - this.character.position.y, 2)
    );
    
    return distance > this.currentMaxDistance;
  }

  // Move pet towards character when out of range
  moveTowardsCharacter(delta) {
    if (!this.character || !this.character.position) {
      return;
    }
    
    const dx = this.character.position.x - this.position.x;
    const dy = this.character.position.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      // Normalize direction and apply speed
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      // Move at double speed when following
      const followSpeed = this.moveSpeed * 2;
      
      this.position.x += normalizedDx * followSpeed * delta;
      this.position.y += normalizedDy * followSpeed * delta;
      
      // Ensure pet doesn't go outside camera viewport when following
      const cameraBounds = this.getCameraBounds();
      if (cameraBounds) {
        this.position.x = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, this.position.x));
        this.position.y = Math.max(cameraBounds.minY, Math.min(cameraBounds.maxY, this.position.y));
      }
      
      this.sprite.position.set(this.position.x, this.position.y);
      
      // Update direction based on movement
      if (normalizedDx < 0) {
        this.direction = 'left';
      } else if (normalizedDx > 0) {
        this.direction = 'right';
      }
      
      // Update animation while following
      const now = Date.now();
      if (!this.lastFrameTime || now - this.lastFrameTime > this.frameUpdateInterval) {
        this.lastFrameTime = now;
        this.frameIndices[this.direction] = (this.frameIndices[this.direction] + 1) % 2;
      }
      
      if (this.direction === 'left') {
        this.sprite.texture = this.animations[`move_left_${this.currentLevel}`][this.frameIndices.left];
        // Ensure high-quality rendering for following texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(-Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      } else {
        this.sprite.texture = this.animations[`move_${this.currentLevel}`][this.frameIndices.right];
        // Ensure high-quality rendering for following texture
        this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
        this.sprite.scale.set(Math.abs(this.sprite.scale.x), Math.abs(this.sprite.scale.y));
      }
    }
  }

  destroy() {
    this.app.ticker.remove(this.update, this);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    if (this.sprite && this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    if (this.sprite) {
      this.sprite.destroy();
    }
  }
}