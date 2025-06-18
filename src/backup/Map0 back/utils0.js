/**
 * Returns character screen position and map offset for Zelda-style safe zone.
 * Only scrolls horizontally if character is within 5% of left/right edge.
 * Never scrolls vertically.
 */
export function getSafeZoneCharAndOffset(worldX, worldY, MAP_SIZE) {
  const charW = 192;
  const edgeX = window.innerWidth * 0.05;
  let charX, offsetX;

  if (worldX < charW / 2 + edgeX) {
    charX = worldX;
    offsetX = 0;
  } else if (worldX > MAP_SIZE - charW / 2 - edgeX) {
    charX = window.innerWidth - (MAP_SIZE - worldX) - charW / 2;
    offsetX = MAP_SIZE - window.innerWidth;
  } else if (worldX - edgeX < window.innerWidth / 2) {
    charX = worldX;
    offsetX = 0;
  } else if (worldX + edgeX > MAP_SIZE - window.innerWidth / 2) {
    charX = window.innerWidth - (MAP_SIZE - worldX);
    offsetX = MAP_SIZE - window.innerWidth;
  } else {
    charX = window.innerWidth / 2;
    offsetX = worldX - charX;
  }

  // Y axis: never scroll
  return {
    charPos: { x: charX, y: worldY },
    offset: { x: offsetX, y: 0 }
  };
}