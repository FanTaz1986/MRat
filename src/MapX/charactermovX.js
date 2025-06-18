import { useState, useEffect, useRef } from "react";
import { getSafeZoneCharAndOffset } from "./utilsX";

/**
 * Character movement for MapX:
 * - Uses animation loop for smooth movement.
 * - Sets movement direction on keydown, clears on keyup.
 * - Updates position every animation frame.
 */
export function useCharacterMovement(MAP_SIZE) {
  const charW = 192, charH = 192;
  // Start at bottom left
  const initialX = charW / 2;
  const initialY = MAP_SIZE - charH / 2;
  const [charPos, setCharPos] = useState({ x: initialX, y: initialY });

  const [moving, setMoving] = useState(false);
  const [lastDir, setLastDir] = useState("down");
  const [moveDir, setMoveDir] = useState({ up: false, down: false, left: false, right: false });

  // Refs for latest state
  const charPosRef = useRef(charPos);
  const moveDirRef = useRef(moveDir);

  useEffect(() => { charPosRef.current = charPos; }, [charPos]);
  useEffect(() => { moveDirRef.current = moveDir; }, [moveDir]);

  // Keydown/up: set movement direction
  useEffect(() => {
    function handleKeyDown(e) {
      let changed = false;
      if (e.key === "ArrowUp") { setLastDir("up"); if (!moveDirRef.current.up) { setMoveDir(d => ({ ...d, up: true })); changed = true; } }
      if (e.key === "ArrowDown") { setLastDir("down"); if (!moveDirRef.current.down) { setMoveDir(d => ({ ...d, down: true })); changed = true; } }
      if (e.key === "ArrowLeft") { setLastDir("left"); if (!moveDirRef.current.left) { setMoveDir(d => ({ ...d, left: true })); changed = true; } }
      if (e.key === "ArrowRight") { setLastDir("right"); if (!moveDirRef.current.right) { setMoveDir(d => ({ ...d, right: true })); changed = true; } }
      if (changed) setMoving(true);
    }
    function handleKeyUp(e) {
      let changed = false;
      if (e.key === "ArrowUp") { setMoveDir(d => ({ ...d, up: false })); changed = true; }
      if (e.key === "ArrowDown") { setMoveDir(d => ({ ...d, down: false })); changed = true; }
      if (e.key === "ArrowLeft") { setMoveDir(d => ({ ...d, left: false })); changed = true; }
      if (e.key === "ArrowRight") { setMoveDir(d => ({ ...d, right: false })); changed = true; }
      // Only set moving to false if all directions are now false
      setTimeout(() => {
        const d = moveDirRef.current;
        if (!d.up && !d.down && !d.left && !d.right) setMoving(false);
      }, 0);
    }
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Animation loop for smooth movement
  useEffect(() => {
    let animationFrame;
    function step() {
      const moveStep = 8; // smaller step for smoother movement
      let { x, y } = charPosRef.current;
      const dir = moveDirRef.current;

      let moved = false;
      let newX = x, newY = y;

      // Always update world position when a direction is pressed
      if (dir.up) {
        newY -= moveStep;
        moved = true;
      }
      if (dir.down) {
        newY += moveStep;
        moved = true;
      }
      if (dir.left) {
        newX -= moveStep;
        moved = true;
      }
      if (dir.right) {
        newX += moveStep;
        moved = true;
      }

      // Clamp to world boundaries (full map)
      const minX = charW / 2;
      const maxX = MAP_SIZE - charW / 2;
      const minY = charH / 2;
      const maxY = MAP_SIZE - charH / 2;

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

      if (moved) {
        setCharPos({ x: newX, y: newY });
      }
      animationFrame = requestAnimationFrame(step);
    }
    animationFrame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrame);
  }, [MAP_SIZE]);

  return {
    charPos,
    setCharPos,
    moving: moveDir.up || moveDir.down || moveDir.left || moveDir.right,
    lastDir
  };
}