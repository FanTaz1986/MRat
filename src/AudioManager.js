import { Howl, Howler } from "howler";

const footstepSoundsByMap = {
  "maparea0": [
    process.env.PUBLIC_URL + "/0MAP/Sounds/Sand_footstep_1_sfx.mp3",
    process.env.PUBLIC_URL + "/0MAP/Sounds/Sand_footstep_2_sfx.mp3",
    process.env.PUBLIC_URL + "/0MAP/Sounds/Sand_footstep_3_sfx.mp3"
  ],
  "maparea1": [
    process.env.PUBLIC_URL + "/1MAP/Sounds/Grass_footstep_1_sfx.mp3",
    process.env.PUBLIC_URL + "/1MAP/Sounds/Grass_footstep_2_sfx.mp3"
  ],
  "maparea2": [
    process.env.PUBLIC_URL + "/2MAP/Sounds/Wet_footstep_1_sfx.mp3",
    process.env.PUBLIC_URL + "/2MAP/Sounds/Wet_footstep_2_sfx.mp3"
  ],
  "mapareax": [
    process.env.PUBLIC_URL + "/XMAP/Sounds/Hard_surface_footstep_1_sfx.mp3",
    process.env.PUBLIC_URL + "/XMAP/Sounds/Hard_surface_footstep_2_sfx.mp3",
    process.env.PUBLIC_URL + "/XMAP/Sounds/Hard_surface_footstep_3_sfx.mp3"
  ]
};

const ambianceByMap = {
  "maparea0": process.env.PUBLIC_URL + "/0MAP/play_area/1_First_loop.mp3",
  "maparea1": process.env.PUBLIC_URL + "/1MAP/play_area/Grass_planes_ambiance.mp3",
  "maparea2": process.env.PUBLIC_URL + "/2MAP/play_area/Swamp_ambiance.mp3",
  "mapareax": process.env.PUBLIC_URL + "/XMAP/play_area/boss_room_ambiance_3.mp3"
};

let musicVolume = 0.5;
let sfxVolume = 1.0;

// --- FOOTSTEP LOOP ---
let currentFootstepHowl = null;
let currentFootstepSounds = [];
let lastFootstepIdx = -1;
let currentFootstepMapId = null;

// --- AMBIANCE LOOP ---
let currentAmbianceHowl = null;
let currentAmbianceMapId = null;

// --- VOLUME SETTERS ---
export function setMusicVolume(vol) {
  musicVolume = vol;
  // Update currently playing music/ambiance
  if (menuMusicHowl) menuMusicHowl.volume(musicVolume);
  if (currentAmbianceHowl) currentAmbianceHowl.volume(musicVolume);
}
export function setSfxVolume(vol) {
  sfxVolume = vol;
  // No need to update currently playing SFX, as they are short-lived
}
/**
 * Play ambiance for a specific map. Stops previous ambiance if needed.
 * @param {string} mapId
 */
export function playAmbianceForMap(mapId) {
  if (currentAmbianceMapId === mapId && currentAmbianceHowl) {
    return;
  }
  stopAmbiance();
  const src = ambianceByMap[mapId];
  if (!src) return;
  currentAmbianceHowl = new Howl({
    src: [src],
    loop: true,
    volume: musicVolume
  });
  currentAmbianceHowl.play();
  currentAmbianceMapId = mapId;
}

/**
 * Stop any playing ambiance.
 */
export function stopAmbiance() {
  if (currentAmbianceHowl) {
    currentAmbianceHowl.stop();
    currentAmbianceHowl.unload();
    currentAmbianceHowl = null;
    currentAmbianceMapId = null;
  }
}
/**
 * Get footstep sounds for a given map.
 * @param {string} mapId
 * @returns {string[]}
 */
export function getFootstepSoundsForMap(mapId) {
  return footstepSoundsByMap[mapId] || [];
}

/**
 * Play footstep loop for a specific map.
 * @param {string[]} sounds
 * @param {string} mapId
 */
export function playFootstepLoop(sounds, mapId = null) {
  console.log(`[Footstep] playFootstepLoop called by mapId=${mapId}`);
  // If already playing for this map, do nothing
  if (currentFootstepMapId === mapId && currentFootstepHowl) {
    console.log(`[Footstep] Already playing for mapId=${mapId}, skipping.`);
    return;
  }
  stopFootstepLoop(); // Stop any previous sound
  currentFootstepSounds = sounds;
  lastFootstepIdx = -1;
  currentFootstepMapId = mapId;
  console.log(`[Footstep] Now playing for mapId=${mapId}. Sounds:`, sounds);

  function playNext() {
    // Only play if still the active map
    if (currentFootstepMapId !== mapId) {
      console.log(`[Footstep] playNext: mapId mismatch (current=${currentFootstepMapId}, expected=${mapId}), aborting.`);
      return;
    }
    let idx;
    if (currentFootstepSounds.length > 1) {
      do {
        idx = Math.floor(Math.random() * currentFootstepSounds.length);
      } while (idx === lastFootstepIdx);
    } else {
      idx = 0;
    }
    lastFootstepIdx = idx;

    if (currentFootstepHowl) {
      currentFootstepHowl.unload();
      currentFootstepHowl = null;
    }
    console.log(`[Footstep] Playing sound idx=${idx} for mapId=${mapId}: ${currentFootstepSounds[idx]}`);
    currentFootstepHowl = new Howl({
      src: [currentFootstepSounds[idx]],
      volume: sfxVolume,
      onend: playNext,
    });
    currentFootstepHowl.play();
  }
  playNext();
}

/**
 * Stop footstep loop, but only if called by the active map.
 * @param {string} mapId
 */
export function stopFootstepLoop(mapId = null) {
  console.log(`[Footstep] stopFootstepLoop called by mapId=${mapId}, currentFootstepMapId=${currentFootstepMapId}`);
  // Always stop, even if mapId does not match, to ensure no sound leaks
  if (currentFootstepHowl) {
    console.log(`[Footstep] Stopping and unloading sound for mapId=${currentFootstepMapId}`);
    currentFootstepHowl.stop();
    currentFootstepHowl.unload();
    currentFootstepHowl = null;
  }
  currentFootstepSounds = [];
  lastFootstepIdx = -1;
  currentFootstepMapId = null;
}
// --- PORTAL SOUND ---
export function playPortalSound(onEnd) {
  const howl = new Howl({
    src: [process.env.PUBLIC_URL + "/Portal/Portal_enter.mp3"],
    volume: sfxVolume,
    onend: onEnd,
  });
  howl.play();
}

// --- MENU MUSIC & SFX ---
let menuMusicHowl = null;
let menuSelectHowl = null;
let menuStartHowl = null;

export function playMenuMusic() {
  if (menuMusicHowl) {
    menuMusicHowl.stop();
    menuMusicHowl.unload();
  }
  menuMusicHowl = new Howl({
    src: [process.env.PUBLIC_URL + "/meniu/Start_menu_music.mp3"],
    loop: true,
    volume: musicVolume,
  });
  menuMusicHowl.play();
}

export function stopMenuMusic() {
  if (menuMusicHowl) {
    menuMusicHowl.stop();
    menuMusicHowl.unload();
    menuMusicHowl = null;
  }
}

export function playMenuSelect() {
  if (!menuSelectHowl) {
    menuSelectHowl = new Howl({
      src: [process.env.PUBLIC_URL + "/meniu/Sellect.mp3"],
      volume: sfxVolume,
    });
  }
  menuSelectHowl.volume(sfxVolume);
  menuSelectHowl.play();
}

export function playMenuStart() {
  if (!menuStartHowl) {
    menuStartHowl = new Howl({
      src: [process.env.PUBLIC_URL + "/meniu/Start.mp3"],
      volume: sfxVolume,
    });
  }
  menuStartHowl.volume(sfxVolume);
  menuStartHowl.play();
}

/** (Optional) Set global volume for all sounds (not used with separate music/sfx sliders) */
export function setGlobalVolume(vol) {
  Howler.volume(vol);
}
export function playEvilCackle(onEnd) {
  const howl = new Howl({
    src: [process.env.PUBLIC_URL + "/Intro/Evil_cackle_vocal.mp3"],
    volume: sfxVolume,
    onend: onEnd,
  });
  howl.play();
}

// --- OUTRO MUSIC ---
let outroMusicHowl = null;
export function playOutroMusic() {
  if (outroMusicHowl) {
    outroMusicHowl.stop();
    outroMusicHowl.unload();
  }
  outroMusicHowl = new Howl({
    src: [process.env.PUBLIC_URL + "/Outro/8_Eight_loop.mp3"],
    loop: true,
    volume: musicVolume,
  });
  outroMusicHowl.play();
}
export function stopOutroMusic() {
  if (outroMusicHowl) {
    outroMusicHowl.stop();
    outroMusicHowl.unload();
    outroMusicHowl = null;
  }
}