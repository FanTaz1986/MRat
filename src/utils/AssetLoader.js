import * as PIXI from 'pixi.js';
// Removed @pixi/sound import - using Howler.js exclusively now
import { initImageErrorHandling, createFallbackImage } from './ImageErrorHandler';

// Initialize image error handling
initImageErrorHandling();

// Portal frame constants
export const PORTAL_ASSET_KEYS = {
  FRAME_1: 'portal_frame_0',
  FRAME_2: 'portal_frame_1',
  FRAME_3: 'portal_frame_2',
  FRAME_4: 'portal_frame_3'
};

// Central asset loader with state
export function createAssetLoader() {
  let loadedAssets = {};
  let portalFramesLoaded = false;
  
  return {
    /**
     * Load assets defined in a manifest
     * @param {Object} manifest - Object containing arrays of images, sprites, and audio assets
     * @param {Function} progressCallback - Function to receive loading progress
     * @returns {Promise} Promise that resolves with loaded assets
     */
    loadAssets(manifest, progressCallback) {
      return new Promise((resolve) => {
        // Count total assets to track progress
        const totalAssets = (
          (manifest.images?.length || 0) + 
          (manifest.sprites?.length || 0) + 
          (manifest.audio?.length || 0) +
          (manifest.portalFrames ? 4 : 0) // Portal frames count
        );
        
        let loadedCount = 0;
        
        // Update progress helper
        const updateProgress = () => {
          loadedCount++;
          const progress = Math.floor((loadedCount / totalAssets) * 100);
          if (progressCallback) progressCallback(progress);
          if (loadedCount === totalAssets) resolve(loadedAssets);
        };          // Load images with improved error handling and fallback textures
        if (manifest.images?.length) {
          manifest.images.forEach(item => {
            const url = process.env.PUBLIC_URL + item.url;
            
            // Create a promise to load the image with error handling
            const loadWithFallback = async () => {
              try {
                // First check if the file exists before loading with PIXI
                const response = await fetch(url, { method: 'HEAD' }).catch(() => ({ ok: false }));
                
                if (!response.ok) {
                  throw new Error(`File not found: ${url}`);
                }
                
                // Now try to load it with PIXI
                return await PIXI.Assets.load(url);
              } catch (error) {
                console.warn(`Failed to load asset: ${item.name} (${url})`, error);
                
                // Create a fallback texture
                const fallbackImg = createFallbackImage(32, 32, item.name.substring(0, 4));
                const base64Texture = await PIXI.Assets.load(fallbackImg);
                
                console.log(`Created fallback texture for: ${item.name}`);
                return base64Texture;
              }
            };
            
            // Run the load with fallback process
            loadWithFallback()
              .then(texture => {
                console.log(`Asset loaded (or fallback created): ${item.name}`);
                loadedAssets[item.name] = texture;
                updateProgress();
              })
              .catch(finalError => {
                // This should rarely happen since we have multiple fallbacks
                console.error(`Critical asset loading failure for ${item.name}:`, finalError);
                
                // Create an empty texture as last resort
                const emptyTexture = PIXI.Texture.EMPTY;
                loadedAssets[item.name] = emptyTexture;
                
                // Continue loading process
                updateProgress();
              });
          });
        }        // Load sprite sheets with improved validation
        if (manifest.sprites?.length) {
          manifest.sprites.forEach(item => {
            const url = process.env.PUBLIC_URL + item.url;
            console.log(`Loading spritesheet: ${item.name} from ${url}`);
            
            // Skip loading if sprites array is empty (used for progress calc only)
            if (!item.url || item.url === '') {
              console.log(`Skipping empty spritesheet entry: ${item.name}`);
              updateProgress();
              return;
            }
            
            try {
              // We need to handle potential missing sprite sheet files gracefully
              fetch(url)
                .then(response => {
                  if (!response.ok) {
                    throw new Error(`Spritesheet file not found: ${url} (${response.status})`);
                  }
                  return response.json();
                })
                .then(jsonData => {
                  if (!jsonData || !jsonData.frames) {
                    throw new Error(`Invalid spritesheet format: missing 'frames' property`);
                  }
                  
                  if (jsonData.meta && jsonData.meta.image) {
                    // Also check that the image file exists
                    const imageUrl = process.env.PUBLIC_URL + 
                      (jsonData.meta.image.startsWith('/') ? '' : '/') + 
                      (url.substring(0, url.lastIndexOf('/') + 1)) + 
                      jsonData.meta.image;
                    
                    console.log(`Checking spritesheet image: ${imageUrl}`);
                    return fetch(imageUrl, { method: 'HEAD' })
                      .then(imageResponse => {
                        if (!imageResponse.ok) {
                          throw new Error(`Spritesheet image not found: ${imageUrl}`);
                        }
                        console.log(`Spritesheet image exists: ${imageUrl}`);
                        return PIXI.Assets.load(url);
                      });
                  } else {
                    console.log(`No image specified in spritesheet, using individual frames`);
                    // Create a fake spritesheet data
                    loadedAssets[item.name] = {
                      frames: jsonData.frames || {},
                      animations: jsonData.animations || jsonData.meta?.animations || {}
                    };
                    return null;
                  }
                })
                .then(spritesheet => {
                  if (spritesheet) {
                    console.log(`Successfully loaded spritesheet: ${item.name}`);
                    loadedAssets[item.name] = spritesheet;
                  }
                  updateProgress();
                })
                .catch(error => {
                  console.warn(`Spritesheet error for ${item.name}: ${error.message}`);
                  console.warn(`URL was: ${url}`);
                  console.warn('Creating empty placeholder for missing spritesheet');
                  
                  // Create an empty placeholder so the game can continue
                  loadedAssets[item.name] = { 
                    frames: {}, 
                    animations: {},
                    textures: {}
                  };
                  
                  // Continue loading
                  updateProgress();
                });
            } catch (err) {
              console.error(`Fatal error loading spritesheet ${item.name}:`, err);
              updateProgress(); // Still update progress
            }
          });
        }
          // Load audio - skip registration as Howler loads on demand
        // Just update progress for each audio asset to maintain loading bar accuracy
        if (manifest.audio?.length) {
          manifest.audio.forEach(item => {
            // We don't actually load audio here - AudioManager handles this on demand
            console.log(`Audio asset registered (will load on demand): ${item.name}`);
            // We just need to maintain the progress count
            updateProgress();
          });
        }
        
        // Load portal frames if requested
        if (manifest.portalFrames) {
          this.loadPortalAssets(() => {
            portalFramesLoaded = true;
            // Portal has 4 frames, so update progress for each
            updateProgress();
            updateProgress();
            updateProgress();
            updateProgress();
          });
        }
        
        // Handle empty manifest
        if (totalAssets === 0) {
          resolve(loadedAssets);
        }
      });
    },
    
    /**
     * Load portal-specific assets
     * @param {Function} onComplete - Callback when loading completes
     */
    loadPortalAssets(onComplete) {
      // If portal frames were already loaded, just call the completion handler
      if (portalFramesLoaded) {
        onComplete?.();
        return;
      }
      
      const portalFrames = [
        process.env.PUBLIC_URL + "/Portal/portal1.png",
        process.env.PUBLIC_URL + "/Portal/portal2.png",
        process.env.PUBLIC_URL + "/Portal/portal3.png",
        process.env.PUBLIC_URL + "/Portal/portal4.png"
      ];
      
      // Create textures array for all frames
      const textures = [];
      let framesLoaded = 0;
      
      // Load each frame
      portalFrames.forEach((frameUrl, index) => {
        PIXI.Assets.load(frameUrl).then(texture => {
          // Store in loadedAssets
          const key = `portal_frame_${index}`;
          loadedAssets[key] = texture;
          textures[index] = texture;
          
          framesLoaded++;
          if (framesLoaded === portalFrames.length) {
            // All frames loaded
            loadedAssets['portal_frames'] = textures;
            portalFramesLoaded = true;
            onComplete?.();
          }
        }).catch(error => {
          console.warn(`Failed to load portal frame ${index}:`, error);
          framesLoaded++;
          if (framesLoaded === portalFrames.length) {
            onComplete?.();
          }
        });
      });
    },
    
    /**
     * Get a loaded asset by name
     * @param {string} name - Asset name
     * @returns {*} The loaded asset or undefined
     */
    getAsset(name) {
      return loadedAssets[name];
    },
    
    /**
     * Check if portal assets are loaded
     * @returns {boolean} True if loaded
     */
    arePortalAssetsLoaded() {
      return portalFramesLoaded;
    },
    
    /**
     * Get all portal frame textures
     * @returns {Array} Array of portal frame textures
     */
    getPortalFrames() {
      return loadedAssets['portal_frames'] || [];
    }
  };
}

// Create and export a singleton instance for common use
export const mainAssetLoader = createAssetLoader();