/**
 * PixiErrorHandler.js
 * 
 * Modern PixiJS v7+ error handling and initialization
 * Uses current PixiJS APIs without deprecated fallbacks
 */

import * as PIXI from 'pixi.js';

/**
 * Initialize modern PixiJS v7+ settings and error handling
 */
export function initPixiErrorHandling() {
  if (window.__pixiErrorHandlingInitialized) return;
  
  try {
    // Modern PixiJS v7.4+ settings - no deprecated APIs
    PIXI.settings.PREFER_ENV = PIXI.ENV.WEBGL2;
    PIXI.settings.ROUND_PIXELS = false;
    
    // Disable hello message using v7.4 compatible API
    if (PIXI.settings.RENDER_OPTIONS) {
      PIXI.settings.RENDER_OPTIONS.hello = false;
    }
    
    // Set high precision for shaders using v7.4 compatible API
    if (PIXI.Program && PIXI.Program.defaultFragmentPrecision !== undefined) {
      PIXI.Program.defaultFragmentPrecision = PIXI.PRECISION.HIGH;
    }
    
    // Modern texture settings for v7.4
    if (PIXI.BaseTexture && PIXI.BaseTexture.defaultOptions) {
      PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.LINEAR;
      PIXI.BaseTexture.defaultOptions.mipmap = PIXI.MIPMAP_MODES.ON;
    }
    
    // Create a custom error handler for textures
    const originalGetTexture = PIXI.Texture.from;
    PIXI.Texture.from = function(source, options) {
      try {
        const texture = originalGetTexture.call(this, source, options);
        
        // Add error handler to the texture
        if (texture && texture.baseTexture) {
          texture.baseTexture.once('error', (error) => {
            console.warn(`PixiJS Texture loading error for: ${source}`, error);
            
            // Create a placeholder texture with a warning pattern
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              // Draw error pattern
              ctx.fillStyle = '#FF00FF'; // Magenta background
              ctx.fillRect(0, 0, 32, 32);
              ctx.fillStyle = '#000000'; // Black X
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(32, 32);
              ctx.moveTo(32, 0);
              ctx.lineTo(0, 32);
              ctx.stroke();
              
              // Try to replace the failed texture
              try {
                const placeholder = PIXI.Texture.from(canvas);
                texture.baseTexture.resource = placeholder.baseTexture.resource;
                texture.baseTexture.update();
              } catch (e) {
                console.error('Failed to create placeholder texture', e);
              }
            }
          });
        }
        
        return texture;
      } catch (err) {
        console.warn(`Error creating texture from ${source}:`, err);
        
        // Return an empty texture instead of throwing
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return PIXI.Texture.from(canvas);
      }
    };    // Fix the ImageResource to prevent uncaught errors
    if (PIXI.ImageResource) {
      // Override the load method to catch errors properly
      const originalImageResourceLoad = PIXI.ImageResource.prototype.load;
      
      PIXI.ImageResource.prototype.load = function() {
        if (this.source && !this.source._errorHandlerAttached) {
          // Add error handler to source element
          this.source.addEventListener('error', (event) => {
            console.warn(`Failed to load image: ${this.url || 'unknown'}`);
            
            // Create a placeholder image instead of throwing
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 32;
              canvas.height = 32;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#FF00FF'; // Magenta for missing textures
                ctx.fillRect(0, 0, 32, 32);
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(32, 32);
                ctx.moveTo(32, 0);
                ctx.lineTo(0, 32);
                ctx.stroke();
                ctx.font = '10px Arial';
                ctx.fillStyle = '#FFFFFF';
                ctx.fillText('ERR', 5, 20);
                
                // Replace the source with our canvas
                this.source = canvas;
                
                // Mark as loaded to avoid further errors
                this.valid = true;
              }
            } catch (e) {
              console.error('Failed to create placeholder image:', e);
            }
            
            // Prevent this error from bubbling up as an unhandled rejection
            event.preventDefault();
            event.stopPropagation();
          }, { once: true });
          
          this.source._errorHandlerAttached = true;
        }
        
        return originalImageResourceLoad.call(this);
      };
    }
  
    // Handle errors in Assets system (PixiJS v7+)
    if (PIXI.Assets) {
      // Add a global error handler for asset loading
      const originalLoad = PIXI.Assets.load;
      PIXI.Assets.load = function(url, onProgress) {
        return originalLoad.call(this, url, onProgress)
          .catch(error => {
            console.warn(`PixiJS Assets error loading: ${url}`, error);
            
            // Return a placeholder/dummy asset depending on the requested asset type
            if (typeof url === 'string') {
              if (url.endsWith('.json')) {
                // Return empty JSON data
                return { frames: {}, meta: { image: null } };
              } else if (url.match(/\.(png|jpg|jpeg|gif|webp)$/i)) {
                // Return empty texture
                const canvas = document.createElement('canvas');
                canvas.width = 32;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = '#FF00FF'; // Magenta for missing textures
                  ctx.fillRect(0, 0, 32, 32);
                }
                return PIXI.Texture.from(canvas);
              }
            }
            
            // Generic fallback for unknown asset types
            return null;
          });
      };
    }
    
    // Set up global unhandled rejection handler for PIXI-related promises
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (error && (
          (error.stack && error.stack.includes('pixi.js')) || 
          (error.message && (
            error.message.toLowerCase().includes('texture') ||
            error.message.toLowerCase().includes('pixi') ||
            error.message.toLowerCase().includes('image')
          ))
        )) {
        console.warn('Suppressing unhandled PixiJS error:', error);
        event.preventDefault(); // Prevent the error from showing in the console
      }
    });
    
    // Suppress PIXI Assets resolver warnings about overwriting keys
    const originalConsoleWarn = console.warn;
    console.warn = function(...args) {
      const message = args.join(' ');
      
      // Suppress specific PIXI resolver warnings
      if (message.includes('[Resolver] already has key:') && message.includes('overwriting')) {
        // These warnings are expected when hot-reloading or re-initializing
        return;
      }
      
      // Suppress Assets BaseTexture warnings
      if (message.includes('A BaseTexture managed by Assets was destroyed') ||
          message.includes('Use Assets.unload() instead of destroying the BaseTexture')) {
        return;
      }
      
      // Call original console.warn for other messages
      originalConsoleWarn.apply(console, args);
    };
    
    // Modern error handling initialized silently
    window.__pixiErrorHandlingInitialized = true;
  } catch (error) {
    console.warn('Failed to initialize PixiJS error handling:', error);
  }
}

/**
 * Create a fallback texture with specified dimensions and text
 * @param {number} width - Width of the texture
 * @param {number} height - Height of the texture
 * @param {string} text - Text to display in the texture
 * @returns {PIXI.Texture} - A new texture
 */
export function createFallbackTexture(width = 32, height = 32, text = 'ERR') {
  try {
    // Create a canvas to draw our texture
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw error pattern
      ctx.fillStyle = '#FF00FF'; // Magenta - common color for missing textures
      ctx.fillRect(0, 0, width, height);
      
      // Draw black X
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(width, height);
      ctx.moveTo(width, 0);
      ctx.lineTo(0, height);
      ctx.stroke();
      
      // Draw text
      ctx.fillStyle = '#FFFFFF'; // White
      ctx.font = `${Math.max(8, height/4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width/2, height/2);
      
      // Convert to PIXI texture
      return PIXI.Texture.from(canvas);
    }
  } catch (e) {
    console.error('Failed to create fallback texture:', e);
  }
  
  // Last resort - return empty texture
  return PIXI.Texture.EMPTY;
}
