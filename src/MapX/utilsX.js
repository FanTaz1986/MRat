/**
 * Returns character screen position and map offset for Zelda-style safe zone.
 * Scrolls both horizontally and vertically if character is near the edge.
 */
export function getSafeZoneCharAndOffset(worldX, worldY, MAP_SIZE) {
  const charW = 192, charH = 192;
  const edgeX = window.innerWidth * 0.05;
  const edgeY = window.innerHeight * 0.05;
  let charX, offsetX, charY, offsetY;

  // X axis
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

  // Y axis (now scrolls)
  if (worldY < charH / 2 + edgeY) {
    charY = worldY;
    offsetY = 0;
  } else if (worldY > MAP_SIZE - charH / 2 - edgeY) {
    charY = window.innerHeight - (MAP_SIZE - worldY) - charH / 2;
    offsetY = MAP_SIZE - window.innerHeight;
  } else if (worldY - edgeY < window.innerHeight / 2) {
    charY = worldY;
    offsetY = 0;
  } else if (worldY + edgeY > MAP_SIZE - window.innerHeight / 2) {
    charY = window.innerHeight - (MAP_SIZE - worldY);
    offsetY = MAP_SIZE - window.innerHeight;
  } else {
    charY = window.innerHeight / 2;
    offsetY = worldY - charY;
  }

  return {
    charPos: { x: charX, y: charY },
    offset: { x: offsetX, y: offsetY }
  };
}