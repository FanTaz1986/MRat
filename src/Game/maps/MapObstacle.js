import * as PIXI from 'pixi.js';

/**
 * MapObstacle - Class for map obstacles with collision detection
 * Used for preventing character movement through walls, props, etc.
 */
export default class MapObstacle {
  /**
   * Create a map obstacle
   * @param {Object} options - Obstacle configuration
   * @param {string} options.type - Type of obstacle ('circle', 'rect', 'polygon')
   * @param {Array|Object} options.shape - Shape definition
   * @param {boolean} options.debug - Whether to show debug visualization
   * @param {number} options.debugLineColor - Debug visualization line color
   * @param {number} options.debugFillColor - Debug visualization fill color
   */
  constructor(options = {}) {
    const {
      type = 'circle',
      shape,
      debug = false,
      debugLineColor = 0xFF0000,
      debugFillColor = 0xFF0000
    } = options;
    
    this.type = type;
    this.shape = shape;
    this.debug = debug;
    this.debugGraphics = null;
    this.debugLineColor = debugLineColor;
    this.debugFillColor = debugFillColor;
    
    // For showing a visual representation in debug mode
    if (debug) {
      this.debugGraphics = new PIXI.Graphics();
      this.updateDebugGraphics();
    }
  }
  
  /**
   * Check if a point collides with this obstacle
   * @param {number} x - X position to check
   * @param {number} y - Y position to check
   * @param {number} radius - Collision radius
   * @returns {boolean} True if collision occurs
   */
  checkCollision(x, y, radius = 0) {
    switch (this.type) {
      case 'circle':
        return this.checkCircleCollision(x, y, radius);
      case 'rect':
        return this.checkRectCollision(x, y, radius);
      case 'polygon':
        return this.checkPolygonCollision(x, y, radius);
      default:
        return false;
    }
  }
  
  /**
   * Check collision with a circular obstacle
   * @private
   */
  checkCircleCollision(x, y, radius) {
    const dx = x - this.shape.x;
    const dy = y - this.shape.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (this.shape.radius + radius);
  }
  
  /**
   * Check collision with a rectangular obstacle
   * @private
   */
  checkRectCollision(x, y, radius) {
    // Expand rect by radius for collision checking
    const expandedRect = {
      x: this.shape.x - radius,
      y: this.shape.y - radius,
      width: this.shape.width + radius * 2,
      height: this.shape.height + radius * 2
    };
    
    return (
      x >= expandedRect.x &&
      x <= expandedRect.x + expandedRect.width &&
      y >= expandedRect.y &&
      y <= expandedRect.y + expandedRect.height
    );
  }
  
  /**
   * Check collision with a polygon obstacle using point-in-polygon test
   * @private
   */
  checkPolygonCollision(x, y, radius) {
    // If radius is 0, just do a point-in-polygon test
    if (radius === 0) {
      return this.pointInPolygon(x, y, this.shape.points);
    }
    
    // Otherwise, we need to do a more complex test
    // For simplicity, check if point is within radius distance of any edge
    const points = this.shape.points;
    for (let i = 0; i < points.length; i += 2) {
      const x1 = points[i];
      const y1 = points[i + 1];
      const x2 = points[(i + 2) % points.length];
      const y2 = points[(i + 3) % points.length];
      
      if (this.distanceToLine(x, y, x1, y1, x2, y2) <= radius) {
        return true;
      }
    }
    
    // Also check if the point is inside the polygon
    return this.pointInPolygon(x, y, points);
  }
  
  /**
   * Check if a point is inside a polygon
   * @private
   */
  pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 2; i < points.length; i += 2) {
      const xi = points[i], yi = points[i + 1];
      const xj = points[j], yj = points[j + 1];
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
      j = i;
    }
    return inside;
  }
  
  /**
   * Calculate distance from a point to a line segment
   * @private
   */
  distanceToLine(x, y, x1, y1, x2, y2) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Update debug visualization
   */
  updateDebugGraphics() {
    if (!this.debugGraphics) return;
    
    this.debugGraphics.clear();
    this.debugGraphics.lineStyle(2, this.debugLineColor);
    this.debugGraphics.beginFill(this.debugFillColor, 0.2);
      switch (this.type) {
      case 'circle':
        this.debugGraphics.drawCircle(
          this.shape.x,
          this.shape.y,
          this.shape.radius
        );
        break;
        
      case 'rect':
        this.debugGraphics.drawRect(
          this.shape.x,
          this.shape.y,
          this.shape.width,
          this.shape.height
        );
        break;
        
      case 'polygon':
        if (this.shape.points.length >= 6) { // At least 3 points (x,y pairs)
          this.debugGraphics.moveTo(
            this.shape.points[0],
            this.shape.points[1]
          );
          for (let i = 2; i < this.shape.points.length; i += 2) {
            this.debugGraphics.lineTo(
              this.shape.points[i],
              this.shape.points[i + 1]
            );
          }
          this.debugGraphics.closePath();
        }
        break;
        
      default:
        console.warn('Unknown obstacle type for debug rendering:', this.type);
        break;
    }
    
    this.debugGraphics.endFill();
  }
  
  /**
   * Add debug visualization to a container
   * @param {PIXI.Container} container - Container to add debug visualization to
   */
  addDebugToContainer(container) {
    if (this.debug && this.debugGraphics) {
      container.addChild(this.debugGraphics);
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.debugGraphics) {
      if (this.debugGraphics.parent) {
        this.debugGraphics.parent.removeChild(this.debugGraphics);
      }
      this.debugGraphics.destroy();
      this.debugGraphics = null;
    }
  }
}
