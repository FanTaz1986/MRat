const propFiles0 = [
  "1A.png",
  "2A.png"
];

/**
 * Generate random props covering the bottom 25% of the Jura map.
 */
function getLinePropsForTile(tileKey, MAP_SIZE) {
  let seed = 0;
  for (let i = 0; i < tileKey.length; i++) seed += tileKey.charCodeAt(i);
  function seededRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  const count = 10;
  const props = [];
  const yStart = MAP_SIZE * 0.75;
  const yEnd = MAP_SIZE - 64;
  for (let i = 0; i < count; i++) {
    const x = Math.floor(seededRandom() * (MAP_SIZE - 128)) + 64;
    const y = Math.floor(seededRandom() * (yEnd - yStart)) + yStart;
    const scale = 0.5 + seededRandom() * 1.5;
    const rotation = Math.floor(seededRandom() * 360);
    props.push({
      file: propFiles0[i % propFiles0.length],
      x,
      y,
      scale,
      rotation,
    });
  }
  return props;
}

export { propFiles0, getLinePropsForTile };