const propFilesA = [
  "1ABush.png",
  "1ATree.png",
  "2ATree.png",
  "3ATree.png",
  "4Atree.png",
  "1Grass.png",
  "2Grass.png",
  "3Grass.png",
  "4Grass.png"
];

const propFilesB = [
  "1BBush.png",
  "1BTree.png",
  "2BTree.png",
  "3BTree.png",
  "1Grass.png",
  "2Grass.png",
  "3Grass.png",
  "4Grass.png"
];

// Deterministic random for tile for 1A
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
    });
  }
  return props;
}

// Deterministic random for tile for 1B
function getRandomPropsForTileB(tileKey, MAP_SIZE) {
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
    do { idx = Math.floor(seededRandom() * propFilesB.length); } while (used.size < propFilesB.length && used.has(idx));
    used.add(idx);
    props.push({
      file: propFilesB[idx],
      x: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      y: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
    });
  }
  return props;
}

export { propFilesA, propFilesB, getRandomPropsForTile, getRandomPropsForTileB };
// Portal area props
const portalPropFiles = [
  "1CBush.png",
  "1CTree.png",
  "2CBush.png",
  "2CTree.png",
  "3CTree.png"
];

export function getPortalAreaProps(portalX, portalY, MAP_SIZE) {
  // Fill a large square area (5x radius) around the portal with props, deterministically
  const count = 40;
  const radius = 220 * 5; // 5x larger area
  const props = [];
  // Use a deterministic seeded random based on portal position and prop index
  let seed = Math.floor(portalX * 10007 + portalY * 10009);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  for (let i = 0; i < count; i++) {
    // Uniformly fill a square area, not a circle, but deterministic
    const x = portalX + (seededRandom() - 0.5) * 2 * radius;
    const y = portalY + (seededRandom() - 0.5) * 2 * radius;
    props.push({
      file: portalPropFiles[i % portalPropFiles.length],
      x,
      y,
    });
  }

  // Add wall props at the map boundaries (8 maps in each direction)
  const wallCount = 20;
  const wallProp = "1CTree.png";
  const minWorld = -8 * MAP_SIZE;
  const maxWorld = 8 * MAP_SIZE;
  // Top wall
  for (let i = 0; i < wallCount; i++) {
    props.push({
      file: wallProp,
      x: minWorld + i * ((maxWorld - minWorld) / (wallCount - 1)),
      y: minWorld,
    });
  }
  // Bottom wall
  for (let i = 0; i < wallCount; i++) {
    props.push({
      file: wallProp,
      x: minWorld + i * ((maxWorld - minWorld) / (wallCount - 1)),
      y: maxWorld,
    });
  }
  // Left wall
  for (let i = 0; i < wallCount; i++) {
    props.push({
      file: wallProp,
      x: minWorld,
      y: minWorld + i * ((maxWorld - minWorld) / (wallCount - 1)),
    });
  }
  // Right wall
  for (let i = 0; i < wallCount; i++) {
    props.push({
      file: wallProp,
      x: maxWorld,
      y: minWorld + i * ((maxWorld - minWorld) / (wallCount - 1)),
    });
  }

  return props;
}