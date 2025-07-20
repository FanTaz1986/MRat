import { debugLog } from '../../development/utils/Debug';

export default class CameraController {
  constructor(app, mapContainer, mapWidth, mapHeight, initialZoom = 2.0) {
    this.app = app;
    this.mapContainer = mapContainer;
    this.mapWidth = mapWidth;
    this.mapHeight = mapHeight;
    
    // Initial position
    this.position = { x: 0, y: 0 };
    
    // Zoom level (2.0 = 2x zoom in)
    this.zoom = initialZoom;
    
    // Target to follow
    this.target = null;
    
    // Edge margins (percentage of screen size)
    this.edgeMargin = 0.05;
    
    // Apply initial zoom
    this.mapContainer.scale.set(this.zoom);
    
    // Update bound to this instance
    this.update = this.update.bind(this);
    
    // Add to ticker
    this.app.ticker.add(this.update);
  }
    follow(character) {
    debugLog(`Camera following character at position: ${character.position.x}, ${character.position.y}`, 'camera');
    this.target = character;
    // Center camera on character initially
    this.centerOn(character.position.x, character.position.y);
    debugLog('Camera centered on character', 'camera');
  }
    centerOn(x, y) {
    // Safety check for coordinates first
    if (x === null || x === undefined || y === null || y === undefined) {
      console.warn('Camera centerOn called with invalid coordinates:', { x, y });
      return;
    }
    
    if (isNaN(x) || isNaN(y)) {
      console.warn('Camera centerOn called with NaN coordinates:', { x, y });
      return;
    }
    
    // Safety check for app and screen
    if (!this.app || !this.app.screen) {
      console.warn('Camera centerOn called but app.screen is not available');
      return;
    }
    
    if (!this.mapContainer) {
      console.warn('Camera centerOn called but mapContainer is null');
      return;
    }
    
    // Check if mapContainer is destroyed
    if (this.mapContainer.destroyed) {
      console.warn('Camera centerOn called but mapContainer is destroyed');
      return;
    }
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // Safety check for screen dimensions
    if (!screenWidth || !screenHeight) {
      console.warn('Camera centerOn called but screen dimensions are invalid:', { screenWidth, screenHeight });
      return;
    }
    
    // Ensure zoom scale is properly applied before calculating positions
    let scaleApplied = false;
    try {
      if (this.mapContainer) {
        // Try to access scale property safely
        try {
          if (this.mapContainer.scale && typeof this.mapContainer.scale.set === 'function') {
            this.mapContainer.scale.set(this.zoom);
            scaleApplied = true;
          }
        } catch (scaleError) {
          console.warn('Camera centerOn: Cannot access mapContainer.scale, will skip zoom application:', scaleError.message);
        }
        
        if (!scaleApplied) {
          // Try alternative scale setting
          try {
            this.mapContainer.scale = { x: this.zoom, y: this.zoom };
            scaleApplied = true;
          } catch (altScaleError) {
            console.warn('Camera centerOn: Cannot set scale alternatively, proceeding without zoom application');
          }
        }
      } else {
        console.warn('Camera centerOn: mapContainer is not available');
        return;
      }
    } catch (error) {
      console.error('Camera centerOn: Error handling mapContainer scale:', error);
      // Continue without scale application
    }
    
    // Account for zoom when calculating camera position
    const scaledMapWidth = this.mapWidth * this.zoom;
    const scaledMapHeight = this.mapHeight * this.zoom;
    
    // Calculate container position (negative because we move the world, not the camera)
    let camX = Math.max(0, Math.min(scaledMapWidth - screenWidth, (x * this.zoom) - screenWidth / 2));
    let camY = Math.max(0, Math.min(scaledMapHeight - screenHeight, (y * this.zoom) - screenHeight / 2));
    
    // Update position
    this.position = { x: camX / this.zoom, y: camY / this.zoom };
    
    try {
      if (this.mapContainer && !this.mapContainer.destroyed) {
        // Additional safety checks before setting position
        if (typeof camX === 'number' && typeof camY === 'number' && 
            !isNaN(camX) && !isNaN(camY) && 
            isFinite(camX) && isFinite(camY)) {
          
          // Set position with additional error handling
          try {
            this.mapContainer.x = -camX;
          } catch (xError) {
            console.error('Camera centerOn: Error setting mapContainer.x:', xError);
            console.error('camX value:', camX, 'type:', typeof camX);
            return;
          }
          
          try {
            this.mapContainer.y = -camY;
          } catch (yError) {
            console.error('Camera centerOn: Error setting mapContainer.y:', yError);
            console.error('camY value:', camY, 'type:', typeof camY);
            return;
          }
          
          debugLog(`Camera centered on (${x}, ${y}) - container position: (${this.mapContainer.x}, ${this.mapContainer.y}) - zoom: ${this.zoom}`, 'camera');
        } else {
          console.warn('Camera centerOn: Invalid calculated camera position:', { camX, camY });
        }
      } else {
        console.warn('Camera centerOn: Cannot update mapContainer position - mapContainer is null or destroyed');
      }
    } catch (error) {
      console.error('Camera centerOn: Error updating mapContainer position:', error);
      console.error('Error details:', {
        mapContainer: !!this.mapContainer,
        mapContainerDestroyed: this.mapContainer?.destroyed,
        camX, camY,
        x, y,
        zoom: this.zoom
      });
    }
  }
  update() {
    if (!this.target) {
      return;
    }
    
    // Safety check for app and screen
    if (!this.app || !this.app.screen) {
      console.warn('Camera update called but app.screen is not available');
      return;
    }
    
    if (!this.mapContainer) {
      console.warn('Camera update called but mapContainer is null');
      return;
    }
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // Safety check for screen dimensions
    if (!screenWidth || !screenHeight) {
      console.warn('Camera update called but screen dimensions are invalid:', { screenWidth, screenHeight });
      return;
    }
    
    // Calculate target's screen position
    let targetScreenX, targetScreenY;
    try {
      if (this.mapContainer) {
        targetScreenX = this.target.position.x + this.mapContainer.x;
        targetScreenY = this.target.position.y + this.mapContainer.y;
      } else {
        console.warn('Camera update: mapContainer is null, cannot calculate target screen position');
        return;
      }
    } catch (error) {
      console.error('Camera update: Error calculating target screen position:', error);
      return;
    }
    
    // Add debug logging once per second to avoid console spam
    const now = Date.now();
    if (!this._lastDebugTime || now - this._lastDebugTime > 5000) { // Increased from 1000ms to 5000ms
      debugLog(`Camera update - Target world position: ${this.target.position.x}, ${this.target.position.y}`, 'camera');
      debugLog(`Camera update - Target screen position: ${targetScreenX}, ${targetScreenY}`, 'camera');
      debugLog(`Screen size: ${screenWidth}, ${screenHeight}`, 'camera');
      try {
        debugLog(`Map container offset: ${this.mapContainer.x} ${this.mapContainer.y}`, 'camera');
      } catch (error) {
        debugLog(`Map container offset: ERROR - ${error.message}`, 'camera');
      }
      this._lastDebugTime = now;
    }
    
    // Edge margins in pixels
    const edgeMarginX = screenWidth * this.edgeMargin;
    const edgeMarginY = screenHeight * this.edgeMargin;
    
    // Check if target is too close to screen edges
    let cameraNeedsUpdate = false;
    let camX, camY;
    try {
      camX = -this.mapContainer.x;
      camY = -this.mapContainer.y;
    } catch (error) {
      console.error('Camera update: Error accessing mapContainer position:', error);
      return;
    }
    
    // Right edge
    if (targetScreenX > screenWidth - edgeMarginX) {
      camX = Math.min(this.mapWidth - screenWidth, this.target.position.x - screenWidth + edgeMarginX);
      cameraNeedsUpdate = true;
    }
    // Left edge
    else if (targetScreenX < edgeMarginX) {
      camX = Math.max(0, this.target.position.x - edgeMarginX);
      cameraNeedsUpdate = true;
    }
    
    // Bottom edge
    if (targetScreenY > screenHeight - edgeMarginY) {
      camY = Math.min(this.mapHeight - screenHeight, this.target.position.y - screenHeight + edgeMarginY);
      cameraNeedsUpdate = true;
    }
    // Top edge
    else if (targetScreenY < edgeMarginY) {
      camY = Math.max(0, this.target.position.y - edgeMarginY);
      cameraNeedsUpdate = true;
    }
    
    // Update camera position if needed
    if (cameraNeedsUpdate) {
      this.position = { x: camX, y: camY };
      try {
        if (this.mapContainer) {
          this.mapContainer.x = -camX;
          this.mapContainer.y = -camY;
        } else {
          console.warn('Camera update: Cannot update mapContainer position - mapContainer is null');
        }
      } catch (error) {
        console.error('Camera update: Error updating mapContainer position:', error);
      }
    }
  }
  
  resize() {
    // Recenter after resize
    if (this.target) {
      this.centerOn(this.target.position.x, this.target.position.y);
    }
  }
  
  destroy() {
    this.app.ticker.remove(this.update);
    this.target = null;
  }
  
  /**
   * Convert a world position to screen position
   * @param {Object} worldPos - World position {x, y}
   * @returns {Object} Screen position {x, y}
   */
  worldToScreen(worldPos) {
    return {
      x: worldPos.x + this.mapContainer.x,
      y: worldPos.y + this.mapContainer.y
    };
  }
}