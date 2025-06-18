import { Howl } from "howler";

const footstepSounds = [
  process.env.PUBLIC_URL + "/0MAP/Sounds/Sand_footstep_1_sfx.mp3",
  process.env.PUBLIC_URL + "/0MAP/Sounds/Sand_footstep_2_sfx.mp3",
  process.env.PUBLIC_URL + "/0MAP/Sounds/Sand_footstep_3_sfx.mp3"
];

let footstepHowl = null;
let footstepTimer = null;

export function playFootstepLoop() {
  if (footstepTimer) return; // already looping
  function playNext() {
    const idx = Math.floor(Math.random() * footstepSounds.length);
    if (footstepHowl) {
      footstepHowl.unload();
      footstepHowl = null;
    }
    footstepHowl = new Howl({
      src: [footstepSounds[idx]],
      volume: 1,
      onend: () => {
        footstepTimer = setTimeout(playNext, 80); // short delay between steps
      }
    });
    footstepHowl.play();
  }
  playNext();
}

export function stopFootstepLoop() {
  if (footstepTimer) {
    clearTimeout(footstepTimer);
    footstepTimer = null;
  }
  if (footstepHowl) {
    footstepHowl.stop();
    footstepHowl.unload();
    footstepHowl = null;
  }
}