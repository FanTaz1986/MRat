import { useEffect, useRef, useState } from "react";
import { Howl } from "howler";

// Portal animation frames and sound
export const portalFrames = [
  process.env.PUBLIC_URL + "/Portal/portal1.png",
  process.env.PUBLIC_URL + "/Portal/portal2.png",
  process.env.PUBLIC_URL + "/Portal/portal3.png",
  process.env.PUBLIC_URL + "/Portal/portal4.png"
];
export const portalSound = process.env.PUBLIC_URL + "/Portal/Portal_enter.mp3";

// Portal animation hook
export function usePortalAnimation() {
  const [frameIdx, setFrameIdx] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setFrameIdx(idx => (idx + 1) % portalFrames.length);
    }, 100); // 100ms per frame
    return () => clearInterval(intervalRef.current);
  }, []);

  return frameIdx;
}

// Play portal sound
export function playPortalSound() {
  const sound = new Howl({ src: [portalSound], volume: 1 });
  sound.play();
}