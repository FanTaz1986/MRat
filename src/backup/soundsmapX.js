import { Howl } from "howler";
import { stopFootstepLoop as stopFootstepLoop0 } from "../Map0/soundsmap0";
import { stopFootstepLoop as stopFootstepLoop1 } from "../Map1/soundsmap1";
import { stopFootstepLoop as stopFootstepLoop2 } from "../Map2/soundsmap2";
import { setGlobalFootstepStopper } from "../footstepGlobal";
const footstepSounds = [
  process.env.PUBLIC_URL + "/XMAP/Sounds/Hard_surface_footstep_1_sfx.mp3",
  process.env.PUBLIC_URL + "/XMAP/Sounds/Hard_surface_footstep_2_sfx.mp3",
  process.env.PUBLIC_URL + "/XMAP/Sounds/Hard_surface_footstep_3_sfx.mp3",
];

let footstepHowl = null;
let footstepTimer = null;

export function playFootstepLoop() {
  setGlobalFootstepStopper(stopFootstepLoop);
  // Stop all other map footsteps before starting
  stopFootstepLoop0();
  stopFootstepLoop1();
  stopFootstepLoop2();
  if (footstepTimer) return;

  let lastIdx = -1;
  function playNext() {
    let idx;
    if (footstepSounds.length > 1) {
      do {
        idx = Math.floor(Math.random() * footstepSounds.length);
      } while (idx === lastIdx);
    } else {
      idx = 0;
    }
    lastIdx = idx;

    if (footstepHowl) {
      footstepHowl.unload();
      footstepHowl = null;
    }
    footstepHowl = new Howl({
      src: [footstepSounds[idx]],
      volume: 1,
      onend: () => {
        playNext();
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
