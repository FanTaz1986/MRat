import * as PIXI from 'pixi.js';
import { debugLog, isInvulnerable } from '../../development/utils/Debug';
import { playFootstepLoop, stopFootstepLoop, getFootstepSoundsForMap } from '../../utils/AudioManager';

export default class Character {
  constructor(app, initialX, initialY, mapId = 'maparea0') {
    this.app = app;
    this.mapId = mapId;
    this.position = { x: initialX, y: initialY };
    this.velocity = { x: 0, y: 0 };
    this.direction = 'down';
    this.isMoving = false;
    this.moveSpeed = 4;
    this.animationSpeed = 0.15;
    this.bounds = null;
    this.footstepPlaying = false;
    
    // Health system
    this.maxHP = 5; // Character has 5 HP maximum
    this.currentHP = 3; // Character starts with 3 HP
    this.health = 3; // For compatibility with different access patterns
    
    // Controller/Gamepad support
    this.gamepadConnected = false;
    this.gamepadIndex = -1;
    this.gamepadDeadzone = 0.15; // Deadzone threshold for analog sticks
    this.gamepadSensitivity = 1.0; // Sensitivity multiplier
    this.lastGamepadCheck = 0;
    this.gamepadCheckInterval = 100; // Check every 100ms
    
    // Controller button states (for edge detection)
    this.gamepadButtons = {
      rightBumper: false,
      leftBumper: false,
      lastRightBumper: false,
      lastLeftBumper: false
    };
    
    // Pet reference for controller-based pet control
    this.pet = null;
    
    // Animation frames by direction (using the same structure as your original code)
    this.frameIndices = {
      up: 0,
      down: 0,
      left: 0,
      right: 0
    };
    
    // Animation timing
    this.lastFrameTime = 0;
    this.frameUpdateInterval = 250;
    
    // Create character sprite
    this.setupSprite();
    
    // Setup input handling
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false
    };
    
    this.setupInputListeners();
    
    // Initialize gamepad support
    this.initializeGamepadSupport();
    
    // Enable controller debugging
    this.enableControllerDebugging();
    
    // Add to ticker for updates
    this.app.ticker.add(this.update, this);
  }
  setupSprite() {
    debugLog('Setting up character sprite', 'character');
    
    // Helper function to create texture with error handling and high-quality scaling
    const createTexture = (path) => {
      try {
        // Use the high-quality texture method
        const texture = this.createHighQualityTexture(path);
        
        debugLog(`Loading HQ texture: ${path} - Valid: ${texture.valid}`, 'character');
        
        // Check if texture loaded successfully
        if (!texture.valid) {
          texture.on('update', () => {
            debugLog(`HQ Texture loaded: ${path} - Valid: ${texture.valid}`, 'character');
          });
          texture.on('error', () => {
            debugLog(`HQ Texture failed to load: ${path}`, 'character');
          });
        }
        
        return texture;
      } catch (error) {
        debugLog(`Error creating HQ texture for ${path}: ${error.message}`, 'character');
        return PIXI.Texture.EMPTY;
      }
    };
    
    // Create animations for each direction with error handling
    this.animations = {
      down: [
        createTexture('/Main_char_frames/0F.png'),
        createTexture('/Main_char_frames/1F.png'),
        createTexture('/Main_char_frames/2F.png')
      ],
      up: [
        createTexture('/Main_char_frames/0B.png'),
        createTexture('/Main_char_frames/1B.png'),
        createTexture('/Main_char_frames/2B.png')
      ],
      left: [
        createTexture('/Main_char_frames/0L.png'),
        createTexture('/Main_char_frames/1L.png'),
        createTexture('/Main_char_frames/2L.png'),
        createTexture('/Main_char_frames/3L.png'),
        createTexture('/Main_char_frames/4L.png')
      ],
      right: [
        createTexture('/Main_char_frames/0R.png'),
        createTexture('/Main_char_frames/1R.png'),
        createTexture('/Main_char_frames/2R.png'),
        createTexture('/Main_char_frames/3R.png'),
        createTexture('/Main_char_frames/4R.png')
      ]
    };
    
    // Frame counts - matching your React implementation
    this.frameCount = {
      up: 2,
      down: 2,
      right: 4,
      left: 4,
    };
    
    // Create animated sprite with down animation as default
    try {
      debugLog('Creating character sprite with direction: down', 'character');
      debugLog(`Animation frames available: ${Object.keys(this.animations).map(dir => 
        `${dir}: ${this.animations[dir].length} frames`).join(', ')}`, 'character');
      
      // Check if we have valid textures
      const validTextures = this.animations.down.filter(texture => texture && texture !== PIXI.Texture.EMPTY);
      if (validTextures.length === 0) {
        debugLog('No valid textures found, creating fallback sprite', 'character');
        throw new Error('No valid textures available');
      }      
      // Create the animated sprite
      this.sprite = new PIXI.AnimatedSprite(this.animations.down);
      debugLog('AnimatedSprite created successfully', 'character');
      
      this.sprite.anchor.set(0.5);
      this.sprite.visible = true;
      this.sprite.alpha = 1;
      
      debugLog(`Character sprite properties - Visible: ${this.sprite.visible}, Alpha: ${this.sprite.alpha}`, 'character');
      
      // Enhanced scaling for high-quality character art
      const desiredWidth = 164; // Target in-game size
      const scale = desiredWidth / 2970; // 2970 is your art's width
      
      // Option 1: Standard high-quality scaling
      this.sprite.scale.set(scale);
      
      // Option 2: Enable supersampling for ultra-high quality (uncomment if needed)
      // const desiredHeight = 164; // Assuming square for now, adjust as needed
      // const supersampledSprite = this.createSuperSampledSprite(this.sprite, desiredWidth, desiredHeight);
      // if (supersampledSprite) {
      //   this.sprite.destroy();
      //   this.sprite = supersampledSprite;
      // }
      
      // Force high-quality rendering for character sprite
      this.sprite.filters = []; // Clear any existing filters
      this.sprite.texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
      
      // Enable sub-pixel positioning for smoother movement
      this.sprite.roundPixels = false;
      
      this.sprite.position.set(this.position.x, this.position.y);
      this.sprite.zIndex = 1000; // Higher z-index to ensure it's on top
      
      // Stop the animation initially
      if (this.sprite.gotoAndStop && typeof this.sprite.gotoAndStop === 'function') {
        this.sprite.gotoAndStop(0);
        debugLog('Animation stopped at frame 0', 'character');
      }
      
    } catch (err) {
      debugLog(`Error creating character sprite: ${err.message}`, 'character');
      // Create a very visible fallback sprite
      this.sprite = new PIXI.Graphics();
      this.sprite.beginFill(0xFF0000); // Red background
      this.sprite.drawRect(-48, -48, 96, 96);
      this.sprite.endFill();
      
      // Add white border
      this.sprite.lineStyle(4, 0xFFFFFF);
      this.sprite.drawRect(-48, -48, 96, 96);
      
      // Add text
      this.sprite.beginFill(0xFFFFFF);
      this.sprite.drawRect(-24, -6, 48, 12);
      this.sprite.endFill();
      
      this.sprite.position.set(this.position.x, this.position.y);
      this.sprite.zIndex = 1000;
      this.sprite.visible = true;
      this.sprite.alpha = 1;
      
      // Mark this as a fallback sprite
      this.sprite.isFallbackSprite = true;
      debugLog('Created fallback sprite - highly visible red rectangle', 'character');
    }
  }
  
  setupInputListeners() {
    // Binding this to event handlers to prevent scope issues
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }
  
  handleKeyDown(e) {
    switch(e.key) {
      case 'ArrowUp':
        this.keys.up = true;
        break;
      case 'ArrowDown':
        this.keys.down = true;
        break;
      case 'ArrowLeft':
        this.keys.left = true;
        break;
      case 'ArrowRight':
        this.keys.right = true;
        break;
      default:
        break;
    }
  }
  
  handleKeyUp(e) {
    switch(e.key) {
      case 'ArrowUp':
        this.keys.up = false;
        break;
      case 'ArrowDown':
        this.keys.down = false;
        break;
      case 'ArrowLeft':
        this.keys.left = false;
        break;
      case 'ArrowRight':
        this.keys.right = false;
        break;
      default:
        break;
    }
  }
  update(delta) {
    // Debug logging once per 3 seconds to avoid console spam
    const now = Date.now();
    if (!this._lastUpdateDebugTime || now - this._lastUpdateDebugTime > 10000) { // 10 seconds instead of 3
      debugLog(`Character update called, position: ${this.position.x}, ${this.position.y}`, 'character');
      debugLog(`Character sprite position: ${this.sprite.x}, ${this.sprite.y}`, 'character');
      debugLog(`Character sprite visible: ${this.sprite.visible}`, 'character');
      debugLog(`Character sprite alpha: ${this.sprite.alpha}`, 'character');
      
      // Controller status debug info
      if (this.gamepadConnected) {
        const controllerStatus = this.getControllerStatus();
        debugLog(`Controller connected: ${controllerStatus.index}, sens: ${controllerStatus.sensitivity}, deadzone: ${controllerStatus.deadzone}`, 'character');
      } else {
        debugLog('No controller connected - using keyboard only', 'character');
      }        // Calculate screen position relative to camera/map container
      // Find the map container by traversing up the parent chain
      let mapContainer = this.sprite.parent;
      while (mapContainer && mapContainer.parent && mapContainer.parent !== this.app.stage) {
        mapContainer = mapContainer.parent;
      }
      
      const mapOffsetX = mapContainer ? mapContainer.x : 0;
      const mapOffsetY = mapContainer ? mapContainer.y : 0;
      
      const screenX = this.sprite.x + mapOffsetX;
      const screenY = this.sprite.y + mapOffsetY;
      
      // Check if character is within screen bounds for rendering optimization
      const margin = 100; // Render margin outside screen
      const inView = screenX >= -margin && screenX <= this.app.screen.width + margin && 
                     screenY >= -margin && screenY <= this.app.screen.height + margin;
      
      // Only log rendering info occasionally to avoid spam
      if (now - this._lastUpdateDebugTime > 10000) { // 10 seconds instead of 3
        debugLog(`Character screen position: ${screenX}, ${screenY}`, 'rendering');
        debugLog(`Character in-view: ${inView}`, 'rendering');
        debugLog(`Map container offset used: ${mapOffsetX}, ${mapOffsetY}`, 'rendering');
      }
      
      // Enhanced rendering analysis
      if (!inView && now - this._lastUpdateDebugTime > 10000) {
        const offScreenX = screenX < -margin ? Math.abs(screenX + margin) : (screenX > this.app.screen.width + margin ? screenX - (this.app.screen.width + margin) : 0);
        const offScreenY = screenY < -margin ? Math.abs(screenY + margin) : (screenY > this.app.screen.height + margin ? screenY - (this.app.screen.height + margin) : 0);
        debugLog(`Character culled - Outside screen bounds by X:${offScreenX.toFixed(1)}, Y:${offScreenY.toFixed(1)}`, 'rendering');
      }
      this._lastUpdateDebugTime = now;
    }

    // Calculate movement based on keys pressed and gamepad input
    let dx = 0;
    let dy = 0;
    
    // Keyboard input
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    
    // Gamepad input (additive with keyboard) - right stick controls character
    const gamepadInput = this.updateGamepadInput();
    dx += gamepadInput.character.dx;
    dy += gamepadInput.character.dy;
    
    // Handle gamepad buttons for pet and teleport
    this.handleGamepadButtons(gamepadInput.buttons);
    
    // Apply gamepad input to pet movement (left stick controls pet)
    this.applyGamepadToPet(gamepadInput);
    
    // Clamp combined input to -1 to 1 range
    dx = Math.max(-1, Math.min(1, dx));
    dy = Math.max(-1, Math.min(1, dy));
    
    // Normalize diagonal movement only if both inputs are at max
    if (Math.abs(dx) > 0.7 && Math.abs(dy) > 0.7) {
      dx *= 0.7071; // Math.sqrt(1/2)
      dy *= 0.7071;
    }
    
    // Update velocity with delta time for smooth movement
    this.velocity.x = dx * this.moveSpeed * delta;
    this.velocity.y = dy * this.moveSpeed * delta;
    
    // Check if moving
    const wasMoving = this.isMoving;
    this.isMoving = dx !== 0 || dy !== 0;
    
    // Update position
    if (this.isMoving) {
      // Determine direction for animation
      let newDirection = this.direction;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDirection = dx > 0 ? 'right' : 'left';
      } else {
        newDirection = dy > 0 ? 'down' : 'up';
      }
        // Update direction if changed
      if (newDirection !== this.direction) {
        this.direction = newDirection;
        this.frameIndices[this.direction] = 0;
        
        // Only update animation properties for AnimatedSprites
        if (!this.sprite.isFallbackSprite && this.sprite.textures && this.sprite.gotoAndStop) {
          this.sprite.textures = this.animations[this.direction];
          this.sprite.gotoAndStop(0);
        } else if (this.animations[this.direction] && this.animations[this.direction][0]) {
          // For regular sprites or fallback sprites, just set the texture
          this.sprite.texture = this.animations[this.direction][0];
        }
      }
      
      // Apply movement with bounds check
      const newX = this.position.x + this.velocity.x;
      const newY = this.position.y + this.velocity.y;
      
      if (this.bounds) {
        this.position.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX, newX));
        this.position.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY, newY));
      } else {
        this.position.x = newX;
        this.position.y = newY;
      }
      
      // Update sprite position
      this.sprite.position.set(this.position.x, this.position.y);
      
      // Handle animation frames based on timing
      const now = Date.now();
      if (now - this.lastFrameTime > this.frameUpdateInterval) {
        this.lastFrameTime = now;
        
        // Increment frame index
        this.frameIndices[this.direction] = (this.frameIndices[this.direction] + 1) % this.frameCount[this.direction];
          // Update texture
        if (!this.sprite.isFallbackSprite && this.animations[this.direction] && this.animations[this.direction][this.frameIndices[this.direction]]) {
          this.sprite.texture = this.animations[this.direction][this.frameIndices[this.direction]];
        }
      }
    }
    
    // Handle movement state changes
    if (this.isMoving !== wasMoving) {
      if (this.isMoving) {
        this.playFootstepSound();      } else {
        this.stopFootstepSound();
        // Reset to idle frame (only for non-fallback sprites)
        if (!this.sprite.isFallbackSprite) {
          const idleFrames = {
            'up': 0,
            'down': 0,
            'left': 0,
            'right': 0
          };
          if (this.animations[this.direction] && this.animations[this.direction][idleFrames[this.direction]]) {
            this.sprite.texture = this.animations[this.direction][idleFrames[this.direction]];
          }
        }
      }
    }
    
    // Signal camera update if needed
    if (this.onPositionChanged && (this.velocity.x !== 0 || this.velocity.y !== 0)) {
      this.onPositionChanged(this.position.x, this.position.y);
    }
  }
  
  playFootstepSound() {
    if (!this.footstepPlaying) {
      this.footstepPlaying = true;
      const sounds = getFootstepSoundsForMap(this.mapId);
      playFootstepLoop(sounds, this.mapId);
    }
  }
  
  stopFootstepSound() {
    if (this.footstepPlaying) {
      this.footstepPlaying = false;
      stopFootstepLoop();
    }
  }
  
  setMapId(mapId) {
    this.mapId = mapId;
    // If moving, restart footsteps with new map sounds
    if (this.isMoving) {
      this.stopFootstepSound();
      this.playFootstepSound();
    }
  }
  
  setBounds(bounds) {
    this.bounds = bounds;
  }
  
  setOnPositionChanged(callback) {
    this.onPositionChanged = callback;
  }
  
  destroy() {
    this.app.ticker.remove(this.update, this);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    
    // Clean up gamepad event listeners
    if (this.gamepadConnected) {
      debugLog('Cleaning up gamepad support', 'character');
      this.gamepadConnected = false;
      this.gamepadIndex = -1;
    }
    
    this.stopFootstepSound();
    
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    
    this.sprite.destroy();
  }
  
  // Health management methods
  takeDamage(amount) {
    // Check for invulnerability from debug menu
    const invulnerable = isInvulnerable();
    debugLog(`🔍 DAMAGE CHECK: isInvulnerable() = ${invulnerable}, damage amount = ${amount}`, 'character');
    
    if (invulnerable) {
      debugLog(`💜 Character invulnerable - prevented ${amount} damage (HP stays at ${this.currentHP})`, 'character');
      return this.currentHP; // No damage taken
    }
    
    const oldHP = this.currentHP;
    this.currentHP = Math.max(0, this.currentHP - amount);
    this.health = this.currentHP; // Keep both properties in sync
    
    debugLog(`Character took ${amount} damage! HP: ${oldHP} -> ${this.currentHP}`, 'character');
    
    // Handle death if needed
    if (this.currentHP <= 0) {
      this.handleDeath();
    }
    
    return this.currentHP;
  }
  
  modifyHealth(amount) {
    // Check for invulnerability when taking damage (negative amount)
    if (amount < 0 && isInvulnerable()) {
      debugLog(`💜 Character invulnerable - prevented ${Math.abs(amount)} damage via modifyHealth (HP stays at ${this.currentHP})`, 'character');
      return this.currentHP; // No damage taken
    }
    
    const oldHP = this.currentHP;
    this.currentHP = Math.max(0, Math.min(this.maxHP, this.currentHP + amount));
    this.health = this.currentHP; // Keep both properties in sync
    
    debugLog(`Character health modified by ${amount}! HP: ${oldHP} -> ${this.currentHP}`, 'character');
    
    if (amount < 0 && this.currentHP <= 0) {
      this.handleDeath();
    }
    
    return this.currentHP;
  }
  
  heal(amount) {
    return this.modifyHealth(amount);
  }
  
  handleDeath() {
    debugLog('Character has died!', 'character');
    // TODO: Implement death logic (game over screen, respawn, etc.)
    // For now, just log the event
  }
  
  // Get current health status
  getHealthStatus() {
    return {
      current: this.currentHP,
      max: this.maxHP,
      percentage: (this.currentHP / this.maxHP) * 100
    };
  }

  // Create high-quality texture specifically for character art
  createHighQualityTexture(path) {
    const texture = PIXI.Texture.from(process.env.PUBLIC_URL + path);
    
    // Apply high-quality settings
    texture.baseTexture.scaleMode = PIXI.SCALE_MODES.LINEAR;
    texture.baseTexture.mipmap = PIXI.MIPMAP_MODES.ON;
    texture.baseTexture.wrapMode = PIXI.WRAP_MODES.CLAMP;
    
    // Force high resolution for oversampling
    texture.baseTexture.resolution = Math.max(window.devicePixelRatio || 1, 2);
    
    return texture;
  }
  
  // Create super high-quality render texture for photorealistic character
  createSuperSampledSprite(originalSprite, targetWidth, targetHeight) {
    const app = this.app;
    
    // Create a render texture at 4x the target resolution for supersampling
    const supersampleFactor = 4;
    const renderTexture = PIXI.RenderTexture.create({
      width: targetWidth * supersampleFactor,
      height: targetHeight * supersampleFactor,
      resolution: 1
    });
    
    // Create a temporary sprite scaled up for rendering
    const tempSprite = new PIXI.Sprite(originalSprite.texture);
    tempSprite.anchor.set(0.5);
    tempSprite.position.set(
      (targetWidth * supersampleFactor) / 2,
      (targetHeight * supersampleFactor) / 2
    );
    
    // Scale the temp sprite to fill the supersampled render texture
    const scaleX = (targetWidth * supersampleFactor) / originalSprite.texture.width;
    const scaleY = (targetHeight * supersampleFactor) / originalSprite.texture.height;
    tempSprite.scale.set(scaleX, scaleY);
    
    // Render the upscaled sprite to the render texture
    app.renderer.render(tempSprite, renderTexture);
    
    // Create final sprite from the supersampled render texture
    const finalSprite = new PIXI.Sprite(renderTexture);
    finalSprite.anchor.set(0.5);
    finalSprite.scale.set(1 / supersampleFactor); // Scale down to target size
    
    // Clean up temporary sprite
    tempSprite.destroy();
    
    return finalSprite;
  }
  
  initializeGamepadSupport() {
    debugLog('Initializing gamepad support', 'character');
    
    // Check if gamepad API is supported
    if (!navigator.getGamepads) {
      debugLog('Gamepad API not supported in this browser', 'character');
      return;
    }
    
    // Listen for gamepad connection events
    window.addEventListener('gamepadconnected', (e) => {
      debugLog(`Gamepad connected: ${e.gamepad.id} at index ${e.gamepad.index}`, 'character');
      this.gamepadConnected = true;
      this.gamepadIndex = e.gamepad.index;
      this.logGamepadInfo(e.gamepad);
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
      debugLog(`Gamepad disconnected: ${e.gamepad.id} at index ${e.gamepad.index}`, 'character');
      if (e.gamepad.index === this.gamepadIndex) {
        this.gamepadConnected = false;
        this.gamepadIndex = -1;
      }
    });
    
    // Check for already connected gamepads
    this.checkExistingGamepads();
  }
  
  checkExistingGamepads() {
    const gamepads = navigator.getGamepads();
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        debugLog(`Found existing gamepad: ${gamepads[i].id} at index ${i}`, 'character');
        this.gamepadConnected = true;
        this.gamepadIndex = i;
        this.logGamepadInfo(gamepads[i]);
        break;
      }
    }
  }
  
  logGamepadInfo(gamepad) {
    debugLog(`Gamepad Info - ID: ${gamepad.id}`, 'character');
    debugLog(`Gamepad Info - Buttons: ${gamepad.buttons.length}, Axes: ${gamepad.axes.length}`, 'character');
    debugLog(`Gamepad Info - Mapping: ${gamepad.mapping}`, 'character');
  }
  
  updateGamepadInput() {
    if (!this.gamepadConnected || this.gamepadIndex === -1) {
      return { 
        character: { dx: 0, dy: 0 }, 
        pet: { dx: 0, dy: 0 },
        buttons: { rightBumper: false, leftBumper: false }
      };
    }
    
    // Throttle gamepad checks for performance
    const now = Date.now();
    if (now - this.lastGamepadCheck < this.gamepadCheckInterval) {
      return this.lastGamepadInput || { 
        character: { dx: 0, dy: 0 }, 
        pet: { dx: 0, dy: 0 },
        buttons: { rightBumper: false, leftBumper: false }
      };
    }
    this.lastGamepadCheck = now;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    
    if (!gamepad) {
      debugLog('Gamepad disconnected during update', 'character');
      this.gamepadConnected = false;
      this.gamepadIndex = -1;
      return { 
        character: { dx: 0, dy: 0 }, 
        pet: { dx: 0, dy: 0 },
        buttons: { rightBumper: false, leftBumper: false }
      };
    }
    
    let characterDx = 0, characterDy = 0;
    let petDx = 0, petDy = 0;
    
    // Right stick controls character (axes 2 and 3)
    if (gamepad.axes.length >= 4) {
      const rightStickX = gamepad.axes[2];
      const rightStickY = gamepad.axes[3];
      
      // Apply deadzone for character movement
      if (Math.abs(rightStickX) > this.gamepadDeadzone) {
        characterDx = rightStickX * this.gamepadSensitivity;
      }
      if (Math.abs(rightStickY) > this.gamepadDeadzone) {
        characterDy = rightStickY * this.gamepadSensitivity;
      }
    }
    
    // Left stick controls pet (axes 0 and 1)
    if (gamepad.axes.length >= 2) {
      const leftStickX = gamepad.axes[0];
      const leftStickY = gamepad.axes[1];
      
      // Apply deadzone for pet movement
      if (Math.abs(leftStickX) > this.gamepadDeadzone) {
        petDx = leftStickX * this.gamepadSensitivity;
      }
      if (Math.abs(leftStickY) > this.gamepadDeadzone) {
        petDy = leftStickY * this.gamepadSensitivity;
      }
    }
    
    // Read shoulder buttons (standard gamepad mapping)
    let rightBumper = false;
    let leftBumper = false;
    
    if (gamepad.buttons.length >= 16) {
      // Right bumper (R1): button 5
      rightBumper = gamepad.buttons[5] && gamepad.buttons[5].pressed;
      // Left bumper (L1): button 4  
      leftBumper = gamepad.buttons[4] && gamepad.buttons[4].pressed;
    }
    
    // Also check D-pad for character movement (backup)
    if (gamepad.buttons.length >= 16) {
      // D-pad: up (12), down (13), left (14), right (15)
      if (gamepad.buttons[12] && gamepad.buttons[12].pressed) characterDy -= 1;
      if (gamepad.buttons[13] && gamepad.buttons[13].pressed) characterDy += 1;
      if (gamepad.buttons[14] && gamepad.buttons[14].pressed) characterDx -= 1;
      if (gamepad.buttons[15] && gamepad.buttons[15].pressed) characterDx += 1;
    }
    
    // Clamp values to -1 to 1 range
    characterDx = Math.max(-1, Math.min(1, characterDx));
    characterDy = Math.max(-1, Math.min(1, characterDy));
    petDx = Math.max(-1, Math.min(1, petDx));
    petDy = Math.max(-1, Math.min(1, petDy));
    
    const result = { 
      character: { dx: characterDx, dy: characterDy }, 
      pet: { dx: petDx, dy: petDy },
      buttons: { rightBumper, leftBumper }
    };
    this.lastGamepadInput = result;
    return result;
  }
  
  // Controller configuration methods
  setGamepadSensitivity(sensitivity) {
    this.gamepadSensitivity = Math.max(0.1, Math.min(2.0, sensitivity));
    debugLog(`Gamepad sensitivity set to ${this.gamepadSensitivity}`, 'character');
  }
  
  setGamepadDeadzone(deadzone) {
    this.gamepadDeadzone = Math.max(0.0, Math.min(0.9, deadzone));
    debugLog(`Gamepad deadzone set to ${this.gamepadDeadzone}`, 'character');
  }
  
  getControllerStatus() {
    return {
      connected: this.gamepadConnected,
      index: this.gamepadIndex,
      sensitivity: this.gamepadSensitivity,
      deadzone: this.gamepadDeadzone,
      lastInput: this.lastGamepadInput || { dx: 0, dy: 0 }
    };
  }
  
  // Debug method to test controller input
  testControllerInput() {
    if (!this.gamepadConnected) {
      debugLog('No controller connected for testing', 'character');
      return;
    }
    
    const input = this.updateGamepadInput();
    debugLog(`Controller test - dx: ${input.dx.toFixed(3)}, dy: ${input.dy.toFixed(3)}`, 'character');
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[this.gamepadIndex];
    if (gamepad) {
      debugLog(`Raw axes - X: ${gamepad.axes[0]?.toFixed(3)}, Y: ${gamepad.axes[1]?.toFixed(3)}`, 'character');
      
      // Log pressed buttons
      const pressedButtons = [];
      for (let i = 0; i < gamepad.buttons.length; i++) {
        if (gamepad.buttons[i].pressed) {
          pressedButtons.push(i);
        }
      }
      if (pressedButtons.length > 0) {
        debugLog(`Pressed buttons: ${pressedButtons.join(', ')}`, 'character');
      }
    }
  }
  
  // Make controller methods globally accessible for debugging
  enableControllerDebugging() {
    if (typeof window !== 'undefined') {
      window.characterController = {
        testInput: () => this.testControllerInput(),
        setSensitivity: (value) => this.setGamepadSensitivity(value),
        setDeadzone: (value) => this.setGamepadDeadzone(value),
        getStatus: () => this.getControllerStatus(),
        info: () => {
          const status = this.getControllerStatus();
          console.log('🎮 Controller Status:', status);
          if (status.connected) {
            console.log('💡 Try: characterController.testInput() to test input');
            console.log('💡 Try: characterController.setSensitivity(1.5) to change sensitivity');
            console.log('💡 Try: characterController.setDeadzone(0.2) to change deadzone');
          } else {
            console.log('❌ No controller connected. Connect a gamepad and refresh the page.');
          }
        }
      };
      
      debugLog('Controller debugging enabled. Use window.characterController.info() for help', 'character');
    }
  }
  
  // Handle gamepad buttons for pet attack and teleport
  handleGamepadButtons(buttons) {
    // Right bumper: Pet attack (edge detection)
    if (buttons.rightBumper && !this.gamepadButtons.lastRightBumper) {
      if (this.pet && this.pet.performAttack) {
        debugLog('Controller: Right bumper pressed - triggering pet attack', 'character');
        this.pet.performAttack();
      } else {
        debugLog('Controller: Right bumper pressed but pet not available', 'character');
      }
    }
    
    // Left bumper: Teleport/Portal use (edge detection)
    if (buttons.leftBumper && !this.gamepadButtons.lastLeftBumper) {
      debugLog('Controller: Left bumper pressed - attempting teleport/portal use', 'character');
      this.tryPortalTeleport();
    }
    
    // Update button states for next frame
    this.gamepadButtons.lastRightBumper = buttons.rightBumper;
    this.gamepadButtons.lastLeftBumper = buttons.leftBumper;
  }
  
  // Set pet reference for controller integration
  setPetReference(pet) {
    this.pet = pet;
    debugLog('Pet reference set for controller integration', 'character');
  }
  
  // Apply gamepad input to pet movement
  applyGamepadToPet(gamepadInput) {
    if (this.pet && gamepadInput.pet) {
      // Apply left stick input to pet movement (additive with WASD, don't override keyboard)
      const { dx, dy } = gamepadInput.pet;
      
      // Set direct movement for smooth analog control (this will be added to keyboard input)
      if (this.pet.setControllerMovement) {
        this.pet.setControllerMovement(dx, dy);
      }
    }
  }
  
  // Try to use portal/teleport
  tryPortalTeleport() {
    try {
      // Check if we're near a portal and can teleport
      if (window.gamePortalManager && window.gamePortalManager.checkPlayerAtPortal) {
        const portalResult = window.gamePortalManager.checkPlayerAtPortal(this.position.x, this.position.y);
        if (portalResult.isAtPortal) {
          debugLog('Controller: Player at portal, initiating teleport', 'character');
          // Simulate T key press for portal
          const event = new KeyboardEvent('keydown', { key: 't', keyCode: 84 });
          document.dispatchEvent(event);
        } else {
          debugLog('Controller: Not at portal, cannot teleport', 'character');
        }
      } else {
        debugLog('Controller: Portal manager not available', 'character');
      }
    } catch (error) {
      debugLog(`Controller: Error attempting teleport: ${error.message}`, 'character');
    }
  }
}