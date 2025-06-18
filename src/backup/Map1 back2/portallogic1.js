import { useState, useEffect } from "react";
import { usePortalAnimation, portalFrames } from "../portalprop";
import { playPortalSound } from "../AudioManager";
import { useRef } from "react";

export function usePortalLogic({ charPos, offset, MAP_SIZE, onCutsceneEnd, forcePortalPrompt, onTeleport }) {
  // Portal 6 maps away in a random direction from the center of the map
  const portalW = 256, portalH = 256;

  // Memoize the random direction so it doesn't change on every render
  // Memoize the random direction so it doesn't change on every render
  const [portalPos] = useState(() => {
    const angle = Math.random() * 2 * Math.PI;
    const distance = 6 * MAP_SIZE;
    // True world center (middle of 16x16 grid)
    const centerX = (16 * MAP_SIZE) / 2;
    const centerY = (16 * MAP_SIZE) / 2;
    // Find the tile center (random tile at distance)
    let tileCenterX = centerX + Math.cos(angle) * distance;
    let tileCenterY = centerY + Math.sin(angle) * distance;
    // Snap to the center of the tile
    tileCenterX = Math.floor(tileCenterX / MAP_SIZE) * MAP_SIZE + MAP_SIZE / 2;
    tileCenterY = Math.floor(tileCenterY / MAP_SIZE) * MAP_SIZE + MAP_SIZE / 2;
    // Add a small random offset (±MAP_SIZE/8) to the portal position, but keep it in the tile
    const spread = MAP_SIZE / 8;
    const offsetSeed = Math.floor(tileCenterX * 10007 + tileCenterY * 10009);
    function seededRandom(seed) {
      let s = seed;
      return function() {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };
    }
    const rand = seededRandom(offsetSeed);
    const portalX = tileCenterX + (rand() - 0.5) * 2 * spread;
    const portalY = tileCenterY + (rand() - 0.5) * 2 * spread;
    return {
      x: portalX,
      y: portalY,
      angle,
      distance,
    };
  });

  const portal = {
    x: portalPos.x,
    y: portalPos.y,
    w: portalW,
    h: portalH,
  };
  const portalFrameIdx = usePortalAnimation();

  // Check if character is on portal
  const [onPortal, setOnPortal] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

 useEffect(() => {
    if (!portal) return;
    const charW = 192, charH = 192;
    // charPos is already in world coordinates!
    const dx = Math.abs(charPos.x - portal.x);
    const dy = Math.abs(charPos.y - portal.y);
    const isOnPortal = dx < portalW / 2 && dy < portalH / 2;
    setOnPortal(isOnPortal);
    // Show prompt if character is on portal OR debug key 3 is pressed
    setShowPrompt(isOnPortal || !!forcePortalPrompt);
  }, [charPos, portal, forcePortalPrompt]);
  // Only declare showPromptRef ONCE
  const showPromptRef = useRef(showPrompt);
  useEffect(() => { showPromptRef.current = showPrompt; }, [showPrompt]);

  // Optional: track latest charPos for logging
  const charPosRef = useRef(charPos);
  useEffect(() => { charPosRef.current = charPos; }, [charPos]);

  useEffect(() => {
    function handleSpace(e) {
      if (showPromptRef.current && (e.code === "Space" || e.key === " ")) {
        console.log(
          "[PORTAL SOUND] Map1",
          "charPos:", charPosRef.current,
          "showPrompt:", showPromptRef.current
        );
        playPortalSound(() => {
          if (typeof onCutsceneEnd === "function") onCutsceneEnd();
          if (typeof onTeleport === "function") onTeleport();
        });
      }
    }
    window.addEventListener("keydown", handleSpace);
    return () => window.removeEventListener("keydown", handleSpace);
  }, [onCutsceneEnd, onTeleport]);

  function getPortalImg(offset) {
    if (!portal) return null;
    const portalFrameSrc = portalFrames[portalFrameIdx] || portalFrames[0];
    return (
      <img
        src={portalFrameSrc}
        alt=""
        style={{
          width: portal.w,
          height: portal.h,
          position: "absolute",
          left: portal.x - offset.x - portal.w / 2,
          top: portal.y - offset.y - portal.h / 2,
          zIndex: 5,
          pointerEvents: "none",
          userSelect: "none",
        }}
        draggable={false}
        onError={e => { e.target.style.display = "none"; }}
      />
    );
  }

function getPortalPrompt(offset) {
    if (!showPrompt) return null;
    return (
      <div
        data-portal-prompt="true"
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          color: "#a259ff",
          background: "rgba(30,0,60,0.97)",
          border: "2px solid #a259ff",
          borderRadius: 18,
          padding: "24px 0",
          textAlign: "center",
          fontSize: "2rem",
          zIndex: 200,
          fontWeight: "bold",
          boxShadow: "0 0 32px #a259ff55",
          textShadow: "0 0 24px #a259ff88, 0 0 2px #fff",
          letterSpacing: "2px",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        press spacebar to teleport to next map
      </div>
    );
  }

  return { portal, getPortalImg, getPortalPrompt, onPortal };
}
