const propFiles0 = [
  "1A.png"
];

/**
 * Generate random props covering the entire map, only 1A.png,
 * random size 100-300%, and only normal or upside-down (0 or 180deg).
 */
function getLinePropsForTile(tileKey, MAP_SIZE) {
  let seed = 0;
  for (let i = 0; i < tileKey.length; i++) seed += tileKey.charCodeAt(i);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const count = 40;
  const props = [];
  for (let i = 0; i < count; i++) {
    const x = Math.floor(seededRandom() * (MAP_SIZE - 128)) + 64;
    const y = Math.floor(seededRandom() * (MAP_SIZE - 128)) + 64;
    const scale = 1.0 + seededRandom() * 1.5; // 1.0 to 3.0 (100% to 300%)
    const rotation = seededRandom() < 0.5 ? 0 : 180; // only normal or upside-down
    props.push({
      file: "1A.png",
      x,
      y,
      scale,
      rotation,
    });
  }
  return props;
}

export { propFiles0, getLinePropsForTile };