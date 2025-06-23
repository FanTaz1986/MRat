import * as PIXI from 'pixi.js';
import { debugLog } from '../../development/utils/Debug';
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
    
    // Add to ticker for updates
    this.app.ticker.add(this.update, this);
  }
  setupSprite() {
    debugLog('Setting up character sprite', 'character');
    
    // Helper function to create texture with error handling
    const createTexture = (path) => {
      try {
        const texture = PIXI.Texture.from(process.env.PUBLIC_URL + path);
        debugLog(`Loading texture: ${path} - Valid: ${texture.valid}`, 'character');
        
        // Check if texture loaded successfully
        if (!texture.valid) {
          texture.on('update', () => {
            debugLog(`Texture loaded: ${path} - Valid: ${texture.valid}`, 'character');
          });
          texture.on('error', () => {
            debugLog(`Texture failed to load: ${path}`, 'character');
          });
        }
        
        return texture;
      } catch (error) {
        debugLog(`Error creating texture for ${path}: ${error.message}`, 'character');
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
      
      // Set sprite properties
      this.sprite.width = 192;
      this.sprite.height = 192;
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
    if (!this._lastUpdateDebugTime || now - this._lastUpdateDebugTime > 3000) {      debugLog(`Character update called, position: ${this.position.x}, ${this.position.y}`, 'character', 5000);
      debugLog(`Character sprite position: ${this.sprite.x}, ${this.sprite.y}`, 'character', 5000);
      debugLog(`Character sprite visible: ${this.sprite.visible}`, 'character', 5000);
      debugLog(`Character sprite alpha: ${this.sprite.alpha}`, 'character', 5000);        // Calculate screen position relative to camera/map container
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
        debugLog(`Character screen position: ${screenX}, ${screenY}`, 'rendering', 5000);
      debugLog(`Character in-view: ${inView}`, 'rendering', 5000);
      debugLog(`Map container offset used: ${mapOffsetX}, ${mapOffsetY}`, 'rendering', 5000);
      
      // Enhanced rendering analysis
      if (!inView) {
        const offScreenX = screenX < -margin ? Math.abs(screenX + margin) : (screenX > this.app.screen.width + margin ? screenX - (this.app.screen.width + margin) : 0);
        const offScreenY = screenY < -margin ? Math.abs(screenY + margin) : (screenY > this.app.screen.height + margin ? screenY - (this.app.screen.height + margin) : 0);
        debugLog(`Character culled - Outside screen bounds by X:${offScreenX.toFixed(1)}, Y:${offScreenY.toFixed(1)}`, 'rendering', 5000);
      }
      this._lastUpdateDebugTime = now;
    }

    // Calculate movement based on keys pressed
    let dx = 0;
    let dy = 0;
    
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
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
    this.stopFootstepSound();
    
    if (this.sprite.parent) {
      this.sprite.parent.removeChild(this.sprite);
    }
    
    this.sprite.destroy();
  }
}