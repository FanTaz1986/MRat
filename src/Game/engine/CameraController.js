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
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // Account for zoom when calculating camera position
    const scaledMapWidth = this.mapWidth * this.zoom;
    const scaledMapHeight = this.mapHeight * this.zoom;
    
    // Calculate container position (negative because we move the world, not the camera)
    let camX = Math.max(0, Math.min(scaledMapWidth - screenWidth, (x * this.zoom) - screenWidth / 2));
    let camY = Math.max(0, Math.min(scaledMapHeight - screenHeight, (y * this.zoom) - screenHeight / 2));
    
    // Update position
    this.position = { x: camX / this.zoom, y: camY / this.zoom };
    this.mapContainer.x = -camX;
    this.mapContainer.y = -camY;
  }
  update() {
    if (!this.target) {
      return;
    }
    
    const screenWidth = this.app.screen.width;
    const screenHeight = this.app.screen.height;
    
    // Calculate target's screen position
    const targetScreenX = this.target.position.x + this.mapContainer.x;
    const targetScreenY = this.target.position.y + this.mapContainer.y;
    
    // Add debug logging once per second to avoid console spam
    const now = Date.now();
    if (!this._lastDebugTime || now - this._lastDebugTime > 1000) {      debugLog(`Camera update - Target world position: ${this.target.position.x}, ${this.target.position.y}`, 'camera', 3000);
      debugLog(`Camera update - Target screen position: ${targetScreenX}, ${targetScreenY}`, 'camera', 3000);
      debugLog(`Screen size: ${screenWidth}, ${screenHeight}`, 'camera', 3000);
      debugLog(`Map container offset: ${this.mapContainer.x} ${this.mapContainer.y}`, 'camera', 1000);
      this._lastDebugTime = now;
    }
    
    // Edge margins in pixels
    const edgeMarginX = screenWidth * this.edgeMargin;
    const edgeMarginY = screenHeight * this.edgeMargin;
    
    // Check if target is too close to screen edges
    let cameraNeedsUpdate = false;
    let camX = -this.mapContainer.x;
    let camY = -this.mapContainer.y;
    
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
      this.mapContainer.x = -camX;
      this.mapContainer.y = -camY;
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