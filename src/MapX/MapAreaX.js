import React, { useEffect, useState } from "react";
import Character from "./CharacterX";
import { playFootstepLoop, stopFootstepLoop, getFootstepSoundsForMap, playAmbianceForMap, stopAmbiance } from "../AudioManager";
import { getLinePropsForTile } from "./mappropsX";
import { usePortalLogic } from "./portallogicX";
import { useCharacterMovement } from "./charactermovX";
import { getSafeZoneCharAndOffset } from "./utilsX";
import { DebugMenuOverlay } from "./debugX";


// Map image and music paths
const MAP_SIZE = 1024 * 2;
const mapJura = process.env.PUBLIC_URL + "/XMAP/play_area/cave_water.png";

export default function MapAreaX({ onPortal }) {
  const {
    charPos,
    setCharPos,
    offset,
    setOffset,
    moving,
    lastDir
  } = useCharacterMovement(MAP_SIZE);

  // Clamp world position to full Jura map
  const charW = 192, charH = 192;
  const minX = charW / 2;
  const maxX = MAP_SIZE - charW / 2;
  const minY = charH / 2;
  const maxY = MAP_SIZE - charH / 2;

  let worldX = Math.max(minX, Math.min(maxX, charPos.x));
  let worldY = Math.max(minY, Math.min(maxY, charPos.y));

  // Use safe zone to get character screen position and offset (now allows vertical scroll)
  const { charPos: renderCharPos, offset: renderOffset } = getSafeZoneCharAndOffset(worldX, worldY, MAP_SIZE);

  // Clamp character to always be fully visible on screen
  renderCharPos.x = Math.max(charW / 2, Math.min(window.innerWidth - charW / 2, renderCharPos.x));
  renderCharPos.y = Math.max(charH / 2, Math.min(window.innerHeight - charH / 2, renderCharPos.y));

  const [showDebug, setShowDebug] = useState(false);
  const [forcePortalPrompt, setForcePortalPrompt] = useState(false);

  // Portal logic
  const { portal, getPortalImg, getPortalPrompt } = usePortalLogic({
    charPos: { x: worldX, y: worldY },
    offset: renderOffset,
    MAP_SIZE,
    onTeleport: onPortal, // Use the router's handler!
    forcePortalPrompt,
  });

  const footstepSounds = getFootstepSoundsForMap("mapareax");
  useEffect(() => {
    if (moving) {
      playFootstepLoop(footstepSounds, "mapareax");
    } else {
      stopFootstepLoop("mapareax");
    }
    return () => stopFootstepLoop("mapareax");
  }, [moving, footstepSounds]);

  // Ambiance
  useEffect(() => {
    playAmbianceForMap("mapareax");
    return () => stopAmbiance();
  }, []);

  // Render cave_water.png only
  const tiles = [];
  const tileX = -renderOffset.x;
  const tileY = -renderOffset.y;
  const tileKey = `0_0`;

  tiles.push(
    <img
      key="mapJura"
      src={mapJura}
      alt="Jura"
      style={{
        width: MAP_SIZE,
        height: MAP_SIZE,
        position: "absolute",
        left: tileX,
        top: tileY,
        zIndex: 1,
        userSelect: "none",
        pointerEvents: "none",
      }}
      draggable={false}
    />
  );

  // Props for XMAP
  const props = getLinePropsForTile(tileKey, MAP_SIZE);
  for (let p = 0; p < props.length; p++) {
    const prop = props[p];
    const size = 128 * (prop.scale || 1);
    tiles.push(
      <img
        key={tileKey + "-prop0-" + p}
        src={process.env.PUBLIC_URL + "/XMAP/Props/" + prop.file}
        alt={"prop"}
        style={{
          width: size,
          height: size,
          position: "absolute",
          left: prop.x - renderOffset.x,
          top: prop.y - renderOffset.y,
          zIndex: 2,
          userSelect: "none",
          pointerEvents: "none",
          transform: `scale(${prop.scale || 1}) rotate(${prop.rotation || 0}deg)`,
        }}
        draggable={false}
      />
    );
  }

  // Draw portal (only one, at world position)
  const portalImg = getPortalImg(renderOffset);

  // --- DEBUG MENU ---
  useEffect(() => {
    function handleDebugKeys(e) {
      if (e.key === "d" || e.key === "D") setShowDebug((v) => !v);
      if (e.key === "3") setForcePortalPrompt((v) => !v);
      if (e.key === "2" && portal) {
        const charW = 192, charH = 192;
        const minX = charW / 2;
        const maxX = MAP_SIZE - charW / 2;
        const minY = charH / 2;
        const maxY = MAP_SIZE - charH / 2;
        const newWorldX = Math.max(minX, Math.min(maxX, portal.x));
        const newWorldY = Math.max(minY, Math.min(maxY, portal.y));
        setCharPos({ x: newWorldX, y: newWorldY });
      }
    }
    window.addEventListener("keydown", handleDebugKeys);
    return () => window.removeEventListener("keydown", handleDebugKeys);
  }, [portal, setCharPos]);

  const [showControlsOverlay, setShowControlsOverlay] = useState(true);

  useEffect(() => {
    if (!showControlsOverlay) return;
    const timer = setTimeout(() => setShowControlsOverlay(false), 4000);
    const handleAnyKey = () => setShowControlsOverlay(false);
    window.addEventListener("keydown", handleAnyKey, { once: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleAnyKey, { once: true });
    };
  }, [showControlsOverlay]);

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
        overflow: "hidden",
      }}
    >
      {tiles}
      {portalImg}
      {getPortalPrompt(renderOffset)}
      <Character charPos={renderCharPos} moving={moving} lastDir={lastDir} />
      {showControlsOverlay && (
        <div
          style={{
            position: "fixed",
            left: "50%",
            top: "20%",
            transform: "translate(-50%, -50%)",
            background: "rgba(30,0,60,0.97)",
            border: "2px solid #a259ff",
            borderRadius: 18,
            padding: "24px 48px",
            color: "#a259ff",
            fontWeight: "bold",
            fontSize: "2rem",
            zIndex: 9999,
            boxShadow: "0 0 32px #a259ff55",
            textShadow: "0 0 24px #a259ff88, 0 0 2px #fff",
            letterSpacing: "2px",
            userSelect: "none",
            pointerEvents: "none",
            textAlign: "center",
          }}
        >
          use arrow keys to move,<br />D for debug meniu
        </div>
      )}
      <DebugMenuOverlay
        show={showDebug}
        charPos={renderCharPos}
        worldX={worldX}
        worldY={worldY}
        portal={portal}
        showPortalPrompt={forcePortalPrompt}
      />
    </div>
  );
}