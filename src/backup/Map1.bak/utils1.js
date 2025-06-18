export function getSafeZoneCharAndOffset(
  worldX,
  worldY,
  MAP_SIZE,
  centerCamera = false,
  screenWidth = window.innerWidth,
  screenHeight = window.innerHeight,
  cameraOffset = { x: 0, y: 0 }
) {
  const charW = 192, charH = 192;

  // World boundaries (8 maps in any direction from center)
  const centerX = (16 * MAP_SIZE) / 2;
  const centerY = (16 * MAP_SIZE) / 2;
  const minX = centerX - 8 * MAP_SIZE + charW / 2;
  const maxX = centerX + 8 * MAP_SIZE - charW / 2;
  const minY = centerY - 8 * MAP_SIZE + charH / 2;
  const maxY = centerY + 8 * MAP_SIZE - charH / 2;

  // Clamp world position to world boundaries
  let clampedWorldX = Math.max(minX, Math.min(maxX, worldX));
  let clampedWorldY = Math.max(minY, Math.min(maxY, worldY));

  // Calculate world size and screen size
  const worldWidth = maxX - minX;
  const worldHeight = maxY - minY;

  // If the world is smaller than the screen, center the map and character
  if (worldWidth <= screenWidth && worldHeight <= screenHeight) {
    return {
      charPos: {
        x: (clampedWorldX - minX) + (screenWidth - worldWidth) / 2,
        y: (clampedWorldY - minY) + (screenHeight - worldHeight) / 2,
      },
      offset: { x: 0, y: 0 },
    };
  }

  if (centerCamera) {
    // Center camera on character (for first load/teleport)
    let offsetX = clampedWorldX - minX - screenWidth / 2;
    let offsetY = clampedWorldY - minY - screenHeight / 2;
    // Clamp so map never shows empty space
    offsetX = Math.max(0, Math.min(offsetX, worldWidth - screenWidth));
    offsetY = Math.max(0, Math.min(offsetY, worldHeight - screenHeight));
    // Character is always at the center of the screen
    let charX = screenWidth / 2;
    let charY = screenHeight / 2;
    return {
      charPos: { x: charX, y: charY },
      offset: { x: offsetX, y: offsetY },
    };
  } else {
    // Free movement: character moves freely, only scroll if would go off screen
    // Use the cameraOffset as the base
    let naturalCharX = clampedWorldX - minX - cameraOffset.x;
    let naturalCharY = clampedWorldY - minY - cameraOffset.y;
    let offsetX = cameraOffset.x, offsetY = cameraOffset.y;

    // Only scroll if the character would go off the right of the screen
    if (naturalCharX > screenWidth - charW / 2) {
      offsetX += naturalCharX - (screenWidth - charW / 2);
      naturalCharX = screenWidth - charW / 2;
    }
    // Only scroll if the character would go off the left of the screen
    if (naturalCharX < charW / 2) {
      offsetX += naturalCharX - charW / 2;
      naturalCharX = charW / 2;
    }
    offsetX = Math.max(0, Math.min(offsetX, worldWidth - screenWidth));
    let charX = clampedWorldX - minX - offsetX;

    // Repeat for Y
    if (naturalCharY > screenHeight - charH / 2) {
      offsetY += naturalCharY - (screenHeight - charH / 2);
      naturalCharY = screenHeight - charH / 2;
    }
    if (naturalCharY < charH / 2) {
      offsetY += naturalCharY - charH / 2;
      naturalCharY = charH / 2;
    }
    offsetY = Math.max(0, Math.min(offsetY, worldHeight - screenHeight));
    let charY = clampedWorldY - minY - offsetY;

    // Clamp charX/charY to always be on screen
    charX = Math.max(charW / 2, Math.min(charX, screenWidth - charW / 2));
    charY = Math.max(charH / 2, Math.min(charY, screenHeight - charH / 2));

    return {
      charPos: { x: charX, y: charY },
      offset: { x: offsetX, y: offsetY },
    };
  }
}