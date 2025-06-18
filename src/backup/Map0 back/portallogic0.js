import { useState, useEffect, useRef } from "react";
import { usePortalAnimation, portalFrames } from "../portalprop";
import { playPortalSound } from "../AudioManager";

/**
 * Portal logic for Jura map.
 * - Portal at 15% from right, 15% from bottom of Jura.
 * - Shows prompt and handles teleport.
 */
export function usePortalLogic({ charPos, offset, MAP_SIZE, onCutsceneEnd, forcePortalPrompt, onTeleport }) {
  // Portal at 15% from right, 15% from bottom of Jura
  const portalW = 256, portalH = 256;
  const portal = {
    x: MAP_SIZE * 0.80,
    y: MAP_SIZE - MAP_SIZE * 0.15,
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

  // Use a ref to always have the latest value of showPrompt
  const showPromptRef = useRef(showPrompt);
  useEffect(() => { showPromptRef.current = showPrompt; }, [showPrompt]);
  const charPosRef = useRef(charPos);
  useEffect(() => { charPosRef.current = charPos; }, [charPos]);

  useEffect(() => {
    function handleSpace(e) {
      if (showPromptRef.current && (e.code === "Space" || e.key === " ")) {
        console.log(
          "[PORTAL SOUND] Map0",
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