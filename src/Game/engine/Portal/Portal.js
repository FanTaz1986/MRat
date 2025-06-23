import * as PIXI from 'pixi.js';
import { playPortalSound } from '../../../utils/AudioManager';
import { portalFrames, portalAnimationTiming } from './portalFrames';
import { debugLog } from '../../../development/utils/Debug';

export default class Portal {
  constructor(app, x, y, width = 256, height = 256, targetMap) {
    this.app = app;
    this.position = { x, y };
    this.width = width;
    this.height = height;
    this.targetMap = targetMap;
    this.interactionRadius = Math.max(width, height) / 2;
    this.isActive = true;
    
    // Create container for portal
    this.container = new PIXI.Container();
    this.container.position.set(x, y);
    this.container.zIndex = 5;
    
    // Setup animation
    this.setupAnimation();
      // Add to ticker for animation
    this.animationSpeed = portalAnimationTiming; // ms per frame from portalFrames.js
    this.lastFrameTime = 0;
    this.app.ticker.add(this.update, this);
  }
    setupAnimation() {
    try {      // Use portal frames imported from portalFrames.js
      const portalFramePaths = portalFrames.map(path => process.env.PUBLIC_URL + path);
      
      // Load portal frame textures with error handling
      this.portalFrames = [];
      portalFramePaths.forEach((path, index) => {        try {
          const texture = PIXI.Texture.from(path);
          this.portalFrames.push(texture);
        } catch (err) {
          debugLog(`Failed to load portal texture ${index} from ${path}: ${err.message}`, 'portal');
        }
      });
        // Only proceed if we have at least one valid frame
      if (this.portalFrames.length === 0) {
        debugLog('No portal frames could be loaded', 'portal');
        return;
      }
      // Create sprite with first frame
      this.sprite = new PIXI.Sprite(this.portalFrames[0]);
      this.sprite.anchor.set(0.5);
      this.sprite.width = this.width;
      this.sprite.height = this.height;
      
      // Add to container
      this.container.addChild(this.sprite);
        // Current frame index
      this.currentFrame = 0;
    } catch (err) {
      debugLog(`Error setting up portal animation: ${err.message}`, 'portal');
    }
  }
    update(delta) {    try {
      // First check if sprite exists
      if (!this.sprite) {
        debugLog('Portal update: sprite is null or undefined', 'portal');
        return;
      }

      // Check if portalFrames exists and has elements
      if (!this.portalFrames || this.portalFrames.length === 0) {
        debugLog('Portal update: portalFrames is null, undefined, or empty', 'portal');
        return;
      }
      
      // Handle animation timing
      const now = Date.now();
      if (now - this.lastFrameTime > this.animationSpeed) {
        this.lastFrameTime = now;
        this.currentFrame = (this.currentFrame + 1) % this.portalFrames.length;
        
        // Check if the current frame texture exists
        const nextTexture = this.portalFrames[this.currentFrame];        if (nextTexture) {
          this.sprite.texture = nextTexture;
        } else {
          debugLog(`Portal update: texture at index ${this.currentFrame} is null or undefined`, 'portal');
        }
      }
    } catch (err) {
      debugLog(`Error in Portal.update: ${err.message}`, 'portal');
    }
  }
  isCharacterOnPortal(character) {    // Safety checks for character and character.position
    if (!character || !this.isActive) {
      return false;
    }
    
    // Safety check for character.position
    if (!character.position) {
      return false;
    }
      try {
      const dx = Math.abs(character.position.x - this.position.x);
      const dy = Math.abs(character.position.y - this.position.y);      
      return dx < this.interactionRadius && dy < this.interactionRadius;
    } catch (err) {
      debugLog(`Error checking character-portal collision: ${err.message}`, 'portal');
      return false;
    }
  }
  
  showPrompt(onConfirm) {
    // Create and return DOM element for portal prompt
    const promptElement = document.createElement('div');
    promptElement.setAttribute('data-portal-prompt', 'true');
    promptElement.style.position = 'fixed';
    promptElement.style.left = '50%';
    promptElement.style.top = '50%';
    promptElement.style.transform = 'translate(-50%, -50%)';
    promptElement.style.width = '400px';
    promptElement.style.color = '#a259ff';
    promptElement.style.background = 'rgba(30,0,60,0.97)';
    promptElement.style.border = '2px solid #a259ff';
    promptElement.style.borderRadius = '18px';
    promptElement.style.padding = '24px 0';
    promptElement.style.textAlign = 'center';
    promptElement.style.fontSize = '2rem';
    promptElement.style.zIndex = '200';
    promptElement.style.fontWeight = 'bold';
    promptElement.style.boxShadow = '0 0 32px #a259ff55';
    promptElement.style.textShadow = '0 0 24px #a259ff88, 0 0 2px #fff';
    promptElement.style.letterSpacing = '2px';
    promptElement.style.userSelect = 'none';
    promptElement.style.pointerEvents = 'none';
    promptElement.textContent = 'press spacebar to teleport to next map';
      document.body.appendChild(promptElement);
      // Cleanup function
    const cleanup = () => {
      document.removeEventListener('keydown', handleSpace);
      if (promptElement.parentNode) promptElement.parentNode.removeChild(promptElement);
    };
      // Space handler
    const handleSpace = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        playPortalSound(() => {
          if (onConfirm) {            try {
              onConfirm(this.targetMap);
            } catch (err) {
              debugLog(`Error in portal teleport callback: ${err.message}`, 'portal');
            }
          } else {
            debugLog('onConfirm callback is missing!', 'portal');
          }
          
          cleanup();
        });
      }
    };
      document.addEventListener('keydown', handleSpace);
    
    // Return cleanup function
    return cleanup;
  }
  
  /**
   * Update the position of the portal
   * @param {number} x - New X position
   * @param {number} y - New Y position
   */
  setPosition(x, y) {
    this.position = { x, y };
    this.container.position.set(x, y);
  }
    destroy() {    try {
      // Remove ticker update
      if (this.app && this.app.ticker) {
        this.app.ticker.remove(this.update, this);
      }
      
      // Reset references to textures
      this.portalFrames = null;
      this.sprite = null;
      
      // Remove container from parent
      if (this.container && this.container.parent) {
        this.container.parent.removeChild(this.container);
      }
      
      // Destroy container and children
      if (this.container) {
        this.container.destroy({ children: true, texture: true, baseTexture: true });
        this.container = null;
      }
        // Nullify references
      this.app = null;
      this.position = null;
    } catch (err) {
      debugLog(`Error destroying portal: ${err.message}`, 'portal');
    }
  }
}