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
  const minProps = 5;
  const used = new Set();
  const props = [];
  for (let i = 0; i < count; i++) {
    let idx;
    do { idx = Math.floor(seededRandom() * propFilesA.length); } while (used.size < propFilesA.length && used.has(idx));
    used.add(idx);
    const file = propFilesA[idx];
    let size = 1.0;
    if (file.toLowerCase().includes("bush") || file.toLowerCase().includes("grass")) {
      size = 1.0 + seededRandom() * 2.0; // 1.0 to 3.0
    }
    props.push({
      file,
      x: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      y: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      size,
    });
  }
  // Ensure at least minProps
  while (props.length < minProps) {
    const idx = Math.floor(seededRandom() * propFilesA.length);
    const file = propFilesA[idx];
    let size = 1.0;
    if (file.toLowerCase().includes("bush") || file.toLowerCase().includes("grass")) {
      size = 1.0 + seededRandom() * 2.0;
    }
    props.push({
      file,
      x: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      y: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      size,
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
  const minProps = 5;
  const used = new Set();
  const props = [];
  for (let i = 0; i < count; i++) {
    let idx;
    do { idx = Math.floor(seededRandom() * propFilesB.length); } while (used.size < propFilesB.length && used.has(idx));
    used.add(idx);
    const file = propFilesB[idx];
    let size = 1.0;
    if (file.toLowerCase().includes("bush") || file.toLowerCase().includes("grass")) {
      size = 1.0 + seededRandom() * 2.0; // 1.0 to 3.0
    }
    props.push({
      file,
      x: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      y: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      size,
    });
  }
  // Ensure at least minProps
  while (props.length < minProps) {
    const idx = Math.floor(seededRandom() * propFilesB.length);
    const file = propFilesB[idx];
    let size = 1.0;
    if (file.toLowerCase().includes("bush") || file.toLowerCase().includes("grass")) {
      size = 1.0 + seededRandom() * 2.0;
    }
    props.push({
      file,
      x: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      y: Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48,
      size,
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
  // Only generate props for the tile the portal is in
  const count = 20;
  const props = [];
  let seed = Math.floor(portalX * 10007 + portalY * 10009);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const tileLeft = Math.floor(portalX / MAP_SIZE) * MAP_SIZE;
  const tileTop = Math.floor(portalY / MAP_SIZE) * MAP_SIZE;
  for (let i = 0; i < count; i++) {
    const x = tileLeft + Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48;
    const y = tileTop + Math.floor(seededRandom() * (MAP_SIZE - 96)) + 48;
    const file = portalPropFiles[i % portalPropFiles.length];
    let size = 1.0;
    if (file.toLowerCase().includes("bush")) {
      size = 1.0 + seededRandom() * 2.0; // 1.0 to 3.0 (100% to 300%)
    } else if (file.toLowerCase().includes("tree")) {
      size = 1.0 + seededRandom() * 0.5; // 1.0 to 1.5 (100% to 150%)
    }
    props.push({
      file,
      x,
      y,
      size,
    });
  }
  return props;
}