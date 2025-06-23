/**
 * Portal animation frames and timing configuration.
 * Centralizes all portal asset references in one module.
 */

// Portal animation frame paths - relative to PUBLIC_URL
const portalFrames = [
    '/Portal/portal1.png',
    '/Portal/portal2.png',
    '/Portal/portal3.png',
    '/Portal/portal4.png'
];

// Animation timing for portal frames (milliseconds)
const portalAnimationTiming = 100; 

// Export the constants
export { portalFrames, portalAnimationTiming };
