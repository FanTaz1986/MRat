const propFilesA = [
  "1A.png",
  "2A.png",
  "3A.png",
  "4A.png",
  "5A.png"
];

// Deterministic random for tile for A
function getRandomPropsForTile(tileKey, MAP_SIZE) {
  let seed = 0;
  for (let i = 0; i < tileKey.length; i++) seed += tileKey.charCodeAt(i);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const count = 40;
  const used = new Set();
  const props = [];
  for (let i = 0; i < count; i++) {
    let idx;
    do { idx = Math.floor(seededRandom() * propFilesA.length); } while (used.size < propFilesA.length && used.has(idx));
    used.add(idx);
    props.push({
      file: propFilesA[idx],
      x: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      y: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      scale: 1 + seededRandom() * 2, // random scale from 1.0 to 3.0
    });
  }
  return props;
}

export { propFilesA, getRandomPropsForTile };

// Portal area props
const portalPropFiles = [
  "1C.png"
];

export function getPortalAreaProps(tileCenterX, tileCenterY, MAP_SIZE) {
  // Fill the entire tile with portal props, not just the center
  const count = 20;
  const props = [];
  // Use a deterministic seeded random based on tile center
  let seed = Math.floor(tileCenterX * 10007 + tileCenterY * 10009);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  // Generate props randomly over the whole tile
  const tileLeft = tileCenterX - MAP_SIZE / 2;
  const tileTop = tileCenterY - MAP_SIZE / 2;
  for (let i = 0; i < count; i++) {
    const x = tileLeft + seededRandom() * (MAP_SIZE - 96) + 48;
    const y = tileTop + seededRandom() * (MAP_SIZE - 96) + 48;
    props.push({
      file: portalPropFiles[0],
      x,
      y,
      scale: 1 + seededRandom() * 2, // random scale from 1.0 to 3.0
    });
  }
  return props;
}