/**
 * ImageErrorHandler.js
 * 
 * Utility to intercept and handle image loading errors in the game.
 * This helps prevent uncaught promise rejections from image loading failures.
 */

/**
 * Initialize the global image error handling system
 * This patches the global Image prototype to catch errors before they become uncaught promises
 */
export function initImageErrorHandling() {
  // Only run once
  if (window.__imageErrorHandlingInitialized) return;
  
  try {
    // Create a placeholder for missing images
    const createPlaceholderImage = () => {
      // Create a 16x16 canvas with a checkerboard pattern
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw purple checkerboard pattern to indicate missing asset
        ctx.fillStyle = '#8a2be2'; // Blueviolet
        ctx.fillRect(0, 0, 16, 16);
        ctx.fillStyle = '#ff00ff'; // Magenta
        ctx.fillRect(0, 0, 8, 8);
        ctx.fillRect(8, 8, 8, 8);
        
        // Add text to indicate error
        ctx.fillStyle = 'white';
        ctx.font = '5px Arial';
        ctx.fillText('ERR', 2, 10);
        
        return canvas.toDataURL();
      }
      
      // Fallback if canvas isn't supported
      return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // 1x1 transparent gif
    };
    
    const placeholderDataURL = createPlaceholderImage();
    
    // Store original Image constructor
    const OriginalImage = window.Image;
    
    // Create a wrapped Image constructor
    function WrappedImage() {
      const img = new OriginalImage();
      
      // Intercept the src setter
      const originalSrcDescriptor = Object.getOwnPropertyDescriptor(OriginalImage.prototype, 'src');
      
      // Only wrap once
      if (!img.__wrapped) {
        img.__wrapped = true;
        
        // Add our own error handler
        img.addEventListener('error', function(e) {
          console.warn(`Failed to load image: ${img.src}`);
          
          // Replace with placeholder and prevent error propagation
          if (!img.dataset.isPlaceholder) {
            console.log(`Using placeholder for: ${img.src}`);
            img.dataset.isPlaceholder = 'true';
            img.dataset.originalSrc = img.src;
            img.src = placeholderDataURL;
            
            // Stop error from propagating
            e.stopPropagation();
          }
        }, true); // Capture phase to get it before other handlers
        
        // Object.defineProperty overrides are needed for some libraries
        if (originalSrcDescriptor && originalSrcDescriptor.set) {
          Object.defineProperty(img, 'src', {
            set: function(value) {
              // Reset placeholder flag when src changes
              if (img.dataset && img.dataset.isPlaceholder) {
                delete img.dataset.isPlaceholder;
              }
              return originalSrcDescriptor.set.call(this, value);
            },
            get: originalSrcDescriptor.get,
            configurable: true
          });
        }
      }
      
      return img;
    }
    
    // Copy prototype and properties
    WrappedImage.prototype = OriginalImage.prototype;
    
    // Replace global Image constructor if possible
    try {
      window.Image = WrappedImage;
    } catch(e) {
      console.warn('Could not override Image constructor, error handling is limited:', e);
    }
    
    // Also add a global error handler for uncaught image errors
    window.addEventListener('error', function(event) {
      if (event.target && event.target.tagName === 'IMG') {
        console.warn('Global image error caught:', event.target.src);
        event.preventDefault();
        event.stopPropagation();
        return false; // Prevent default error handling
      }
    }, true);
    
    console.log('Image error handling initialized successfully');
    window.__imageErrorHandlingInitialized = true;
  } catch (err) {
    console.error('Failed to initialize image error handling:', err);
  }
}

/**
 * Create a data URL for a fallback image with specified dimensions and text
 * Can be used to create custom placeholder images when needed
 */
export function createFallbackImage(width = 32, height = 32, text = '404') {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Draw checker pattern
      ctx.fillStyle = '#FF69B4'; // Hot pink 
      ctx.fillRect(0, 0, width, height);
      
      // Add a grid
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      
      // Draw grid lines
      for (let i = 0; i < width; i += 8) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      
      for (let i = 0; i < height; i += 8) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(width, i);
        ctx.stroke();
      }
      
      // Draw text
      ctx.fillStyle = 'white';
      ctx.font = `${Math.max(10, height/4)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, width/2, height/2);
      
      return canvas.toDataURL();
    }
  } catch (e) {
    console.error('Failed to create fallback image:', e);
  }
  
  return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
}
