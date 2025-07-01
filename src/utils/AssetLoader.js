import * as PIXI from 'pixi.js';
// Modern PixiJS v7+ asset loading - no deprecated imports
import { initImageErrorHandling, createFallbackImage } from './ImageErrorHandler';
import { debugLog } from '../development/utils/Debug';

// Initialize image error handling
initImageErrorHandling();

// Portal frame constants
export const PORTAL_ASSET_KEYS = {
  FRAME_1: 'portal_frame_0',
  FRAME_2: 'portal_frame_1',
  FRAME_3: 'portal_frame_2',
  FRAME_4: 'portal_frame_3'
};

/**
 * Modern PixiJS v7+ Asset Loader using PIXI.Assets API
 */
export function createAssetLoader() {
  let loadedAssets = {};
  let portalFramesLoaded = false;
  let isLoading = false; // Prevent multiple simultaneous loads
  
  return {
    /**
     * Load assets using modern PIXI.Assets API
     */
    async loadAssets(manifest, progressCallback) {
      // Prevent multiple simultaneous loads
      if (isLoading) {
        console.warn('Asset loading already in progress, skipping duplicate call');
        return loadedAssets;
      }
      
      isLoading = true;
      
      try {
        const totalAssets = (
          (manifest.images?.length || 0) + 
          (manifest.sprites?.length || 0) + 
          (manifest.audio?.length || 0) +
          (manifest.portalFrames ? 4 : 0)
        );
        
        let loadedCount = 0;
        
        const updateProgress = () => {
          loadedCount++;
          const progress = Math.floor((loadedCount / totalAssets) * 100);
          if (progressCallback) progressCallback(progress);
        };
        // Load images using modern PIXI.Assets
        if (manifest.images?.length) {
          for (const item of manifest.images) {
            try {
              const url = process.env.PUBLIC_URL + item.url;
              
              // Check if asset is already loaded to avoid "already has key" warnings
              let texture;
              if (PIXI.Assets.cache.has(item.name)) {
                texture = PIXI.Assets.cache.get(item.name);
                debugLog(`Asset already cached: ${item.name}`, 'asset');
              } else {
                // Add to PIXI.Assets cache first, then load
                PIXI.Assets.add({ alias: item.name, src: url });
                texture = await PIXI.Assets.load(item.name);
                debugLog(`Asset loaded: ${item.name}`, 'asset');
              }
              
              loadedAssets[item.name] = texture;
              updateProgress();
            } catch (error) {
              console.warn(`Failed to load ${item.name}:`, error);
              
              // Create fallback texture using modern API
              try {
                const fallbackImg = createFallbackImage(32, 32, item.name.substring(0, 4));
                const fallbackTexture = await PIXI.Assets.load(fallbackImg);
                loadedAssets[item.name] = fallbackTexture;
                debugLog(`Created fallback texture for: ${item.name}`, 'asset');
              } catch (fallbackError) {
                // Use PIXI.Texture.WHITE as ultimate fallback
                loadedAssets[item.name] = PIXI.Texture.WHITE;
                console.warn(`Using white texture fallback for: ${item.name}`);
              }
              updateProgress();
            }
          }
        }
        
        // Handle audio assets (register for on-demand loading)
        if (manifest.audio?.length) {
          manifest.audio.forEach(item => {
            debugLog(`Audio asset registered (will load on demand): ${item.name}`, 'asset');
            updateProgress();
          });
        }
        
        // Load sprites using modern PIXI.Assets
        if (manifest.sprites?.length) {
          for (const item of manifest.sprites) {
            if (!item.url || item.url === '') {
              debugLog(`Skipping empty spritesheet entry: ${item.name}`, 'asset');
              updateProgress();
              continue;
            }
            
            try {
              const url = process.env.PUBLIC_URL + item.url;
              
              // Check if spritesheet is already loaded
              let spritesheet;
              if (PIXI.Assets.cache.has(item.name)) {
                spritesheet = PIXI.Assets.cache.get(item.name);
                debugLog(`Spritesheet already cached: ${item.name}`, 'asset');
              } else {
                PIXI.Assets.add({ alias: item.name, src: url });
                spritesheet = await PIXI.Assets.load(item.name);
                debugLog(`Spritesheet loaded: ${item.name}`, 'asset');
              }
              
              loadedAssets[item.name] = spritesheet;
              updateProgress();
            } catch (error) {
              console.warn(`Failed to load spritesheet ${item.name}:`, error);
              loadedAssets[item.name] = { frames: {}, animations: {}, textures: {} };
              updateProgress();
            }
          }
        }
        
        // Load portal frames if requested
        if (manifest.portalFrames) {
          await this.loadPortalAssets();
          for (let i = 0; i < 4; i++) {
            updateProgress();
          }
        }
        
        return loadedAssets;
      } catch (error) {
        console.error('Asset loading failed:', error);
        return loadedAssets;
      } finally {
        isLoading = false;
      }
    },
    
    /**
     * Load portal assets using modern PIXI.Assets
     */
    async loadPortalAssets() {
      if (portalFramesLoaded) return;
      
      const portalFrames = [
        process.env.PUBLIC_URL + "/Portal/portal1.png",
        process.env.PUBLIC_URL + "/Portal/portal2.png", 
        process.env.PUBLIC_URL + "/Portal/portal3.png",
        process.env.PUBLIC_URL + "/Portal/portal4.png"
      ];
      
      const textures = [];
      
      for (let i = 0; i < portalFrames.length; i++) {
        try {
          const alias = `portal_frame_${i}`;
          
          // Check if portal frame is already loaded
          let texture;
          if (PIXI.Assets.cache.has(alias)) {
            texture = PIXI.Assets.cache.get(alias);
          } else {
            PIXI.Assets.add({ alias, src: portalFrames[i] });
            texture = await PIXI.Assets.load(alias);
          }
          
          loadedAssets[alias] = texture;
          textures[i] = texture;
        } catch (error) {
          console.warn(`Failed to load portal frame ${i}:`, error);
          textures[i] = PIXI.Texture.WHITE;
        }
      }
      
      loadedAssets['portal_frames'] = textures;
      portalFramesLoaded = true;
    },
    
    /**
     * Check if assets have been loaded
     */
    areAssetsLoaded() {
      return Object.keys(loadedAssets).length > 0;
    },
    
    /**
     * Get a loaded asset by name
     */
    getAsset(name) {
      return loadedAssets[name];
    },
    
    /**
     * Check if portal assets are loaded
     */
    arePortalAssetsLoaded() {
      return portalFramesLoaded;
    },
    
    /**
     * Get all portal frame textures
     */
    getPortalFrames() {
      return loadedAssets['portal_frames'] || [];
    },
    
    /**
     * Modern cleanup using PIXI.Assets.unload
     */
    async cleanup() {
      try {
        // Unload all assets using modern API
        const aliases = Object.keys(loadedAssets);
        for (const alias of aliases) {
          try {
            await PIXI.Assets.unload(alias);
          } catch (error) {
            // Asset might not be in PIXI.Assets cache, ignore
          }
        }
        
        loadedAssets = {};
        portalFramesLoaded = false;
      } catch (error) {
        console.warn('Error during asset cleanup:', error);
      }
    }
  };
}

// Create and export a singleton instance for common use
export const mainAssetLoader = createAssetLoader();