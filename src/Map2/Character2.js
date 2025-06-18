import React, { useEffect, useRef, useState } from "react";

// All frame file names for each direction
const framePaths = {
  up:   ["1B.png", "2B.png", "0B.png"],
  down: ["1F.png", "2F.png", "0F.png"],
  right: ["1R.png", "2R.png", "3R.png", "4R.png", "0R.png"],
  left:  ["1L.png", "2L.png", "3L.png", "4L.png", "0L.png"],
};

const frameCount = {
  up: 2,
  down: 2,
  right: 4,
  left: 4,
};

const stopFrame = {
  up: "0B.png",
  down: "0F.png",
  right: "0R.png",
  left: "0L.png",
};

const getFramePath = (frame) => process.env.PUBLIC_URL + "/Main_char_frames/" + frame;

export default function Character({ charPos, moving, lastDir, scrolling }) {
  const [frameIdx, setFrameIdx] = useState(0);
  const moveRef = useRef(null);
  const prevDir = useRef(lastDir);

  useEffect(() => {
    if (prevDir.current !== lastDir) {
      setFrameIdx(0);
      prevDir.current = lastDir;
    }
  }, [lastDir]);

  // Animate frames (0.25s per frame for 4-frame left/right movement)
   useEffect(() => {
    if (!moving) {
      setFrameIdx(0);
      return;
    }
    let interval = 250;
    moveRef.current = setInterval(() => {
      setFrameIdx((idx) => {
        if (lastDir === "right" || lastDir === "left") {
          return (idx + 1) % 4;
        }
        return (idx + 1) % frameCount[lastDir];
      });
    }, interval);
    return () => clearInterval(moveRef.current);
  }, [moving, lastDir]);

  // Pick frame
  let frameFile;
  if (moving) {
    if (lastDir === "right" || lastDir === "left") {
      frameFile = framePaths[lastDir][frameIdx];
    } else {
      frameFile = framePaths[lastDir][frameIdx];
    }
  } else {
    frameFile = stopFrame[lastDir];
  }

  const charW = 192, charH = 192;
  return (
    <img
      src={getFramePath(frameFile)}
      alt="main character"
      style={{
        position: "absolute",
        left: charPos.x,
        top: charPos.y,
        width: charW,
        height: charH,
        zIndex: 10,
        userSelect: "none",
        pointerEvents: "none",
        transform: `translate(-50%, -50%)`, // Center the image on charPos
      }}
      draggable={false}
    />
  );
}