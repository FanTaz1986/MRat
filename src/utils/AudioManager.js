import { Howl, Howler } from 'howler';
import { debugLog } from '../development/utils/Debug';

// Feature detection and setup
const AUDIO_ENABLED = typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined';
let audioInitialized = false;
let audioEnabled = AUDIO_ENABLED;

// Sound state and instances
let musicVolume = 0.5;
let sfxVolume = 1.0;
const sounds = {}; // Track all sound instances

// Track current active sounds
let currentFootstepSound = null;
let currentFootstepMapId = null;
let lastFootstepIdx = -1;
let currentAmbianceSound = null;
let currentAmbianceMapId = null;

/**
 * Initialize the audio system - should be called on user interaction
 */
function initializeAudioSystem() {
  if (audioInitialized || !audioEnabled) {
    return audioEnabled;
  }

  try {
    // Increase HTML5 pool size to avoid "pool exhausted" errors
    Howler.autoUnlock = true;
    Howler.autoSuspend = false;
    Howler.html5PoolSize = 30; // Increased from 10 to handle more simultaneous sounds
    
    // Force HTML5 Audio for all sounds to avoid WebAudio issues
    Howler.usingWebAudio = false;
    Howler.noAudio = false;
    
    // Create a silent sound that we can play on user interaction to unlock audio
    const silentSound = new Howl({
      src: ['data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbMAYmVnaW5pbmcAAAAAAAABswBodHRwOi8vd3d3LnN0ZXJlb3BhcnQubmV0L3RvbW15am9yZGFuLwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP/jWMQAEvBeAAZfAACZAGKAP8ywAqzNzc3Nzc3/////////////////////////////////AAAAAExhdmM1OC4xMwAAAAAAAAAAAAAAACQCgAAAAAAAAAGzFMUHxwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/+MYxAAAAANIAAAAAExBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV'],
      volume: 0.001,
      autoplay: false,
      loop: false,
      html5: true
    });

    // More aggressive approach to unlock audio
    const unlockAudio = () => {
      debugLog('User interaction detected, attempting to unlock audio...', 'audio');
      
      // Play the silent sound to unlock audio
      silentSound.play();
      
      // Resume Howler's audio context if it exists and is suspended
      if (Howler.ctx && Howler.ctx.state === 'suspended') {
        Howler.ctx.resume().then(() => {
          console.log('Audio context resumed successfully');
        }).catch(err => {
          console.warn('Could not resume audio context:', err);
        });
      }
      
      // Remove listeners once we've handled the interaction
      ['click', 'touchstart', 'keydown', 'mousedown'].forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
      
      // Try replaying any sounds that might have failed
      if (sounds['menu_music'] && !sounds['menu_music'].playing()) {
        debugLog('Attempting to replay menu music after unlock', 'audio');
        sounds['menu_music'].play();
      }
    };
    
    // Add unlock listeners to more events
    ['click', 'touchstart', 'keydown', 'mousedown'].forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    // Call unlockAudio immediately in case we're already in a user interaction
    setTimeout(unlockAudio, 0);

    debugLog('Audio system initialized successfully', 'audio');
    audioInitialized = true;
  } catch (err) {
    console.warn('Audio initialization failed:', err);
  }

  return audioInitialized;
}

// Sound mappings
const footstepSoundsByMap = {
  "maparea0": [
    "/0MAP/Sounds/Sand_footstep_1_sfx.mp3",
    "/0MAP/Sounds/Sand_footstep_2_sfx.mp3",
    "/0MAP/Sounds/Sand_footstep_3_sfx.mp3"
  ],
  "maparea1": [
    "/1MAP/Sounds/Grass_footstep_1_sfx.mp3",
    "/1MAP/Sounds/Grass_footstep_2_sfx.mp3"
  ],
  "maparea2": [
    "/2MAP/Sounds/Wet_footstep_1_sfx.mp3",
    "/2MAP/Sounds/Wet_footstep_2_sfx.mp3"
  ],
  "mapareax": [
    "/XMAP/Sounds/Hard_surface_footstep_1_sfx.mp3",
    "/XMAP/Sounds/Hard_surface_footstep_2_sfx.mp3",
    "/XMAP/Sounds/Hard_surface_footstep_3_sfx.mp3"
  ]
};

const ambianceByMap = {
  "maparea0": "/0MAP/play_area/1_First_loop.mp3",
  "maparea1": "/1MAP/play_area/Grass_planes_ambiance.mp3",
  "maparea2": "/2MAP/play_area/Swamp_ambiance.mp3",
  "mapareax": "/XMAP/play_area/boss_room_ambiance_3.mp3"
};

/**
 * Create and play a sound with Howler
 * @param {string} id - Unique identifier for the sound
 * @param {string} url - Path to the sound file
 * @param {object} options - Playback options
 * @param {function} onEnd - Callback when sound ends
 */
function playSound(id, url, options = {}, onEnd = null) {
  // Skip if audio is disabled
  if (!audioEnabled) {
    if (onEnd) setTimeout(onEnd, 0);
    return null;
  }

  // Ensure system is initialized
  initializeAudioSystem();

  try {
    // Check if sound is already playing to avoid duplicate instances
    if (sounds[id]) {
      const existingSound = sounds[id];
      
      // If it's already playing the same sound, just let it continue
      if (existingSound.playing()) {
        // Just update volume if needed
        const volume = id.includes('music') || id.includes('ambiance') ? musicVolume : sfxVolume;
        existingSound.volume(volume);
        return existingSound;
      } else {
        // If it exists but isn't playing, clean it up
        stopSound(id);
      }
    }
    
    // Determine volume based on sound type
    const volume = id.includes('music') || id.includes('ambiance') ? musicVolume : sfxVolume;
    
    // Create new Howl instance with enhanced settings
    const fullUrl = process.env.PUBLIC_URL + url;
    const sound = new Howl({
      src: [fullUrl],
      autoplay: false, // Changed to false to manually play after setup
      preload: true,
      loop: !!options.loop,
      volume: volume,
      html5: true, // Force HTML5 Audio API to avoid WebAudio issues
      format: ['mp3'], // Explicitly specify format to avoid detection issues
      onend: function() {
        if (onEnd) onEnd();
        
        // Clean up non-looping sounds
        if (!options.loop) {
          stopSound(id);
        }
      },
      onloaderror: function(id, err) {
        // More detailed error logging
        console.warn(`Failed to load sound: ${id} (${url})`, err);
        console.warn(`Full URL was: ${fullUrl}`);
        
        // Call onEnd to prevent game from hanging
        if (onEnd) onEnd();
      },
      onplayerror: function(id, err) {
        // More detailed error logging
        console.warn(`Failed to play sound: ${id} (${url})`, err);
        console.warn(`Full URL was: ${fullUrl}`);
        
        // Try to recover by forcing HTML5 mode and disabling WebAudio
        this._html5 = true;
        
        if (this.state() === 'loaded') {
          this.play();
        } else {
          this.load();
          this.once('load', function() {
            this.play();
          });
        }
        
        // Call onEnd to prevent game from hanging
        if (onEnd) onEnd();
      }
    });    // Store the sound
    sounds[id] = sound;
    
    // Store reference for special sounds
    if (options.loop) {
      if (id.includes('ambiance')) {
        currentAmbianceSound = sound;
      }
    }
    
    // Try to start playback with error handling
    try {
      sound.play();
    } catch (playErr) {
      console.warn(`Initial playback failed for ${id}, will retry on next user interaction:`, playErr);
      // We'll try to play this again on next user interaction via the unlock function
    }
    
    return sound;
  } catch (err) {
    console.warn(`Error creating sound ${id}:`, err);
    if (onEnd) onEnd();
    return null;
  }
}

/**
 * Stop and unload a sound
 * @param {string} id - Sound identifier
 */
function stopSound(id) {
  if (sounds[id]) {
    try {
      sounds[id].stop();
      sounds[id].unload();
      delete sounds[id];
    } catch (err) {
      console.warn(`Error stopping sound ${id}:`, err);
    }
  }
}

/**
 * Get a resource ID from a path
 * @param {string} path - File path
 * @returns {string} - Resource ID
 */
function getResourceId(path) {
  return path.split('/').pop().replace('.mp3', '').toLowerCase();
}

// --- PUBLIC API ---

/**
 * Initialize audio system on user interaction
 */
export function initAudio() {
  return initializeAudioSystem();
}

/**
 * Register audio resources, avoiding duplicates
 * This is only needed for compatibility with the game's previous registration system
 */
export function registerAudioResources() {
  // Just initialize the system
  initializeAudioSystem();
  
  // No need to pre-register sounds
  // Howler handles loading on demand and we avoid the duplicate registration errors
  console.log('Audio resources ready - using on-demand loading with Howler');
  
  return audioInitialized;
}

/**
 * Enable or disable audio system
 * @param {boolean} enabled - Whether audio should be enabled
 */
export function setAudioEnabled(enabled) {
  audioEnabled = enabled && AUDIO_ENABLED;
  
  if (!audioEnabled) {
    stopAllSounds();
  }
  
  return audioEnabled;
}

/**
 * Set music volume
 * @param {number} vol - Volume from 0 to 1
 */
export function setMusicVolume(vol) {
  musicVolume = vol;
  
  // Update currently playing music/ambiance
  if (currentAmbianceSound) {
    currentAmbianceSound.volume(musicVolume);
  }
  
  if (sounds['menu_music']) {
    sounds['menu_music'].volume(musicVolume);
  }
  
  if (sounds['outro_music']) {
    sounds['outro_music'].volume(musicVolume);
  }
}

/**
 * Set sound effects volume
 * @param {number} vol - Volume from 0 to 1
 */
export function setSfxVolume(vol) {
  sfxVolume = vol;
  
  // We don't update running sounds as they're typically short-lived
}

/**
 * Play ambiance sound for a specific map
 * @param {string} mapId - Map identifier
 */
export function playAmbianceForMap(mapId) {
  if (currentAmbianceMapId === mapId && currentAmbianceSound) {
    return;
  }
  
  stopAmbiance();
  
  const soundPath = ambianceByMap[mapId];
  if (soundPath) {
    try {
      debugLog(`Playing ambiance for ${mapId}: ${soundPath}`, 'audio');
      
      // Double-check if the mapId is valid
      if (!mapId || !ambianceByMap[mapId]) {
        debugLog(`Invalid mapId (${mapId}) or missing ambiance path`, 'audio');
        return;
      }
      
      currentAmbianceSound = playSound(`ambiance_${mapId}`, soundPath, {
        loop: true
      });
      currentAmbianceMapId = mapId;
    } catch (err) {
      debugLog(`Error playing ambiance for ${mapId}: ${err}`, 'audio');
      // Continue without ambiance if there's an error
    }
  } else {
    console.warn(`No ambiance configured for map: ${mapId}`);
  }
}

/**
 * Stop current ambiance sound
 */
export function stopAmbiance() {
  if (currentAmbianceMapId) {
    stopSound(`ambiance_${currentAmbianceMapId}`);
    currentAmbianceSound = null;
    currentAmbianceMapId = null;
  }
}

/**
 * Get footstep sounds for a map
 * @param {string} mapId - Map identifier
 */
export function getFootstepSoundsForMap(mapId) {
  return footstepSoundsByMap[mapId] || [];
}

/**
 * Play footstep sounds in sequence
 * @param {Array} sounds - Array of sound paths
 * @param {string} mapId - Map identifier
 */
export function playFootstepLoop(sounds, mapId = null) {
  // Skip if we're already playing footsteps for this map
  if (currentFootstepMapId === mapId && currentFootstepSound) {
    return;
  }
  
  // Make sure any previous footsteps are stopped
  stopFootstepLoop();
  currentFootstepMapId = mapId;
  
  // Validate sounds array
  if (!sounds || !Array.isArray(sounds) || sounds.length === 0) {
    console.warn(`Invalid footstep sounds for mapId: ${mapId}`);
    return;
  }
  
  function playNext() {
    // Check if we're still on the same map
    if (currentFootstepMapId !== mapId) {
      return;
    }
    
    try {
      // Select next sound
      let idx;
      if (sounds.length > 1) {
        do {
          idx = Math.floor(Math.random() * sounds.length);
        } while (idx === lastFootstepIdx);
      } else {
        idx = 0;
      }
      lastFootstepIdx = idx;
      
      const soundPath = sounds[idx];
      
      if (!soundPath) {
        console.warn(`Invalid footstep sound path at index ${idx} for mapId: ${mapId}`);
        // Try the next sound after a short delay
        setTimeout(playNext, 300);
        return;
      }
      
      const resourceId = getResourceId(soundPath);
      
      currentFootstepSound = playSound(resourceId, soundPath, {
        volume: sfxVolume
      }, playNext);
    } catch (err) {
      console.error('Error in footstep loop:', err);
      // Try again after a delay
      setTimeout(playNext, 500);
    }
  }
  
  // Start the footstep loop
  playNext();
}

/**
 * Stop footstep sound loop
 */
export function stopFootstepLoop() {
  if (currentFootstepMapId && lastFootstepIdx >= 0) {
    const sounds = footstepSoundsByMap[currentFootstepMapId] || [];
    if (sounds[lastFootstepIdx]) {
      const resourceId = getResourceId(sounds[lastFootstepIdx]);
      stopSound(resourceId);
    }
  }
  
  currentFootstepSound = null;
  currentFootstepMapId = null;
  lastFootstepIdx = -1;
}

/**
 * Play portal enter sound
 * @param {Function} onEnd - Callback when sound ends
 */
export function playPortalSound(onEnd) {
  playSound('portal_enter', '/Portal/Portal_enter.mp3', {
    volume: sfxVolume
  }, onEnd);
}

/**
 * Play menu music
 */
export function playMenuMusic() {
  playSound('menu_music', '/meniu/Start_menu_music.mp3', {
    loop: true,
    volume: musicVolume
  });
}

/**
 * Stop menu music
 */
export function stopMenuMusic() {
  stopSound('menu_music');
}

/**
 * Play menu selection sound
 */
export function playMenuSelect() {
  playSound('menu_select', '/meniu/Sellect.mp3', {
    volume: sfxVolume
  });
}

/**
 * Play menu start sound
 */
export function playMenuStart() {
  playSound('menu_start', '/meniu/Start.mp3', {
    volume: sfxVolume
  });
}

/**
 * Play evil cackle sound
 * @param {Function} onEnd - Callback when sound ends
 */
export function playEvilCackle(onEnd) {
  playSound('evil_cackle', '/Intro/Evil_cackle_vocal.mp3', {
    volume: sfxVolume
  }, onEnd);
}

/**
 * Play outro music
 */
export function playOutroMusic() {
  playSound('outro_music', '/Outro/8_Eight_loop.mp3', {
    loop: true,
    volume: musicVolume
  });
}

/**
 * Stop outro music
 */
export function stopOutroMusic() {
  stopSound('outro_music');
}

// Boss Audio Functions
export function playBossRoomMusic() {
  playSound('boss_room_music', '/Boss/Audio/boss_room_music_and_ambiance.mp3', {
    loop: true,
    volume: musicVolume * 0.8 // Slightly quieter for atmosphere
  });
}

export function stopBossRoomMusic() {
  stopSound('boss_room_music');
}

export function playBossFlySound() {
  playSound('boss_fly', '/Boss/Audio/Boss_fly_sound.mp3', {
    loop: true,
    volume: sfxVolume * 0.7
  });
}

export function stopBossFlySound() {
  stopSound('boss_fly');
}

export function playBossLandSound() {
  playSound('boss_land', '/Boss/Audio/Boss_land_sound.mp3', {
    volume: sfxVolume
  });
}

export function playBossMeleeAttack() {
  playSound('boss_melee_paw', '/Boss/Audio/boss_atk_melle_paw_scratch.mp3', {
    volume: sfxVolume
  });
}

export function playBossRangeChargeUp() {
  // Randomly play one of the 3 charge up sounds
  const chargeUpSounds = [
    '/Boss/Audio/range_charge_up_1.mp3',
    '/Boss/Audio/range_charge_up_2.mp3',
    '/Boss/Audio/range_charge_up_3.mp3'
  ];
  const randomSound = chargeUpSounds[Math.floor(Math.random() * chargeUpSounds.length)];
  
  playSound('boss_range_charge', randomSound, {
    volume: sfxVolume
  });
}

export function playBossThunderExplosion() {
  // Randomly play one of the 2 thunder explosion sounds
  const thunderSounds = [
    '/Boss/Audio/range_thunder_explotion_1_.mp3',
    '/Boss/Audio/range_thunder_explotion_2.mp3'
  ];
  const randomSound = thunderSounds[Math.floor(Math.random() * thunderSounds.length)];
  
  playSound('boss_thunder', randomSound, {
    volume: sfxVolume
  });
}

export function playBossZapBoltExplosion() {
  // Randomly play one of the 2 zap bolt explosion sounds
  const zapSounds = [
    '/Boss/Audio/range_zap_bolt_explotion_1.mp3',
    '/Boss/Audio/range_zap_bolt_explotion_2.mp3'
  ];
  const randomSound = zapSounds[Math.floor(Math.random() * zapSounds.length)];
  
  playSound('boss_zap_bolt', randomSound, {
    volume: sfxVolume
  });
}

export function playBossZapCone() {
  playSound('boss_zap_cone', '/Boss/Audio/range_zap_cone.mp3', {
    volume: sfxVolume
  });
}

export function playBossDeathSound(onEnd) {
  playSound('boss_death', '/Boss/Audio/boss_death_sound.mp3', {
    volume: sfxVolume
  }, onEnd);
}

/**
 * Stop all active sounds
 */
function stopAllSounds() {
  // Use Howler.unload to stop everything
  Howler.unload();
  
  // Clear our tracking object
  Object.keys(sounds).forEach(id => {
    delete sounds[id];
  });
  
  // Reset tracking variables
  currentFootstepSound = null;
  currentFootstepMapId = null;
  lastFootstepIdx = -1;
  currentAmbianceSound = null;
  currentAmbianceMapId = null;
}

/**
 * Debug function to check audio system state
 */
export function troubleshootAudio() {
  // Check for sound paths validity
  const checkSoundPaths = () => {
    // Sample paths to check
    const pathsToCheck = [
      // Ambiance
      process.env.PUBLIC_URL + ambianceByMap['maparea0'],
      process.env.PUBLIC_URL + '/meniu/Start_menu_music.mp3',
      // Footsteps
      process.env.PUBLIC_URL + footstepSoundsByMap['maparea0'][0],
      // Check other common paths
      process.env.PUBLIC_URL + '/Portal/Portal_enter.mp3',
      process.env.PUBLIC_URL + '/Intro/Evil_cackle_vocal.mp3',
      process.env.PUBLIC_URL + '/Outro/8_Eight_loop.mp3'
    ];
    
    return pathsToCheck.map(path => ({
      path,
      exists: "Check network tab for 404s"
    }));
  };

  const diagnostics = {
    audioEnabled,
    audioInitialized,
    browserSupport: AUDIO_ENABLED,
    publicURL: process.env.PUBLIC_URL,
    howlerState: {
      usingWebAudio: Howler.usingWebAudio,
      noAudio: Howler.noAudio,
      muted: Howler.muted,
      volume: Howler.volume(),
      codecs: Howler._codecs,
      ctx: Howler.ctx ? {
        state: Howler.ctx.state,
        sampleRate: Howler.ctx.sampleRate
      } : 'none'
    },
    activeSounds: Object.keys(sounds).map(id => {
      const sound = sounds[id];
      return {
        id,
        state: sound ? sound.state() : 'unknown',
        playing: sound ? sound.playing() : false
      };
    }),
    soundPaths: checkSoundPaths(),
    // Show additional info about dual registration issues
    dualSystemInfo: "The game now uses Howler.js exclusively for audio. Any @pixi/sound in AssetLoader.js isn't used for playback."
  };
  
  console.log('Audio System Diagnostics:', diagnostics);
  
  // Check for specific known errors
  console.log('----- Common Error Checks -----');
  console.log('1. If you see "Sound with alias X already exists" errors:');
  console.log('   → This happens because both @pixi/sound AND Howler.js are trying to register the same sounds');
  console.log('   → Ensure AssetLoader.js is not loading sounds via @pixi/sound');
  
  console.log('2. If audio is not playing:');
  console.log('   → Check if audio context is suspended:', Howler.ctx?.state);
  console.log('   → Check if page has user interaction to unlock audio');
  console.log('   → Verify audio files exist in the correct paths');
  
  // Try to fix common issues
  if (Howler.ctx && Howler.ctx.state === 'suspended') {
    console.log('Attempting to resume suspended audio context...');
    Howler.ctx.resume()
      .then(() => console.log('Audio context resumed successfully'))
      .catch(err => console.warn('Failed to resume audio context:', err));
  }
  
  // Print a message to help troubleshoot asset errors
  console.log('3. If you see [object Event] errors or SyntaxError (JSON):');
  console.log('   → Check if all image/JSON files exist');
  console.log('   → Verify character_sheet.json exists and is valid JSON');
  console.log('   → Make sure fog.png exists in 2MAP/Effects/');
  
  return diagnostics;
}
