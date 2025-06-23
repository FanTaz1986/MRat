/**
 * GameEngine.js
 * This file initializes the game engine and provides core functionality.
 */

// Global game state
let app = null;
let debugMode = false;

/**
 * Initialize the game engine with the PIXI application
 * @param {PIXI.Application} pixiApp - The PIXI application instance
 */
export function initializeGameEngine(pixiApp) {
  app = pixiApp;
  
  return app;
}

/**
 * Get the current PIXI application instance
 * @returns {PIXI.Application} The PIXI application
 */
export function getApp() {  return app;
}

/**
 * Check if debug mode is enabled
 * @returns {boolean} True if debug mode is enabled
 */
export function isDebugMode() {
  return debugMode;
}
