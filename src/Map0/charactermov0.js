import { useState, useEffect } from "react";

export function useCharacterMovement(MAP_SIZE) {
  const charW = 192, charH = 192;
  const roamMinX = charW / 2;
  const roamMaxX = MAP_SIZE - charW / 2;
  const roamMinY = MAP_SIZE * 0.75 + charH / 2;
  const roamMaxY = MAP_SIZE - charH / 2;

  // Start at 15% from left, 15% from bottom of Jura
  const [charPos, setCharPos] = useState({
    x: MAP_SIZE * 0.15,
    y: MAP_SIZE - MAP_SIZE * 0.15,
  });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [moving, setMoving] = useState(false);
  const [lastDir, setLastDir] = useState("down");

  useEffect(() => {
    const moveStep = 16;
    function handleKeyDown(e) {
      let moved = false;
      let newCharPos = { ...charPos };

      // Calculate the visible world bounds based on camera offset and screen size
      const cameraOffsetX = (MAP_SIZE - window.innerWidth) / 2;
      const cameraOffsetY = MAP_SIZE * 0.65;
      const screenMinX = cameraOffsetX + 192 / 2;
      const screenMaxX = cameraOffsetX + window.innerWidth - 192 / 2;
      const screenMinY = cameraOffsetY + 192 / 2;
      const screenMaxY = cameraOffsetY + window.innerHeight - 192 / 2;

      if (e.key === "ArrowUp") {
        setLastDir("up");
        let nextY = Math.max(roamMinY, charPos.y - moveStep);
        // Prevent moving off the visible top edge
        nextY = Math.max(nextY, screenMinY);
        if (nextY !== charPos.y) moved = true;
        newCharPos.y = nextY;
      }
      if (e.key === "ArrowDown") {
        setLastDir("down");
        let nextY = Math.min(roamMaxY, charPos.y + moveStep);
        // Prevent moving off the visible bottom edge
        nextY = Math.min(nextY, screenMaxY);
        if (nextY !== charPos.y) moved = true;
        newCharPos.y = nextY;
      }
      if (e.key === "ArrowLeft") {
        setLastDir("left");
        let nextX = Math.max(roamMinX, charPos.x - moveStep);
        // Prevent moving off the visible left edge
        nextX = Math.max(nextX, screenMinX);
        if (nextX !== charPos.x) moved = true;
        newCharPos.x = nextX;
      }
      if (e.key === "ArrowRight") {
        setLastDir("right");
        let nextX = Math.min(roamMaxX, charPos.x + moveStep);
        // Prevent moving off the visible right edge
        nextX = Math.min(nextX, screenMaxX);
        if (nextX !== charPos.x) moved = true;
        newCharPos.x = nextX;
      }
      if (moved) setCharPos(newCharPos);
      setMoving(moved);
    }
    function handleKeyUp(e) {
      setMoving(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [charPos, setCharPos]);

  return {
    charPos,
    setCharPos,
    offset,
    setOffset,
    moving,
    lastDir
  };
}