import React, { useState, useEffect } from "react";
import Character from "./Character1";
import { playFootstepLoop, stopFootstepLoop, getFootstepSoundsForMap, playAmbianceForMap, stopAmbiance } from "../AudioManager";
import { getRandomPropsForTile, getRandomPropsForTileB, getPortalAreaProps } from "./mapprops1";
import { usePortalLogic } from "./portallogic1";
import { useCharacterMovement } from "./charactermov1";
import { getSafeZoneCharAndOffset } from "./utils1";
import { DebugMenuOverlay } from "./debug1";

// Map image and music paths
const MAP_SIZE = 1024 * 2;
const map1A = process.env.PUBLIC_URL + "/1MAP/play_area/1Amap.png";
const map1B = process.env.PUBLIC_URL + "/1MAP/play_area/1Bmap.png";

// Helper to determine which map image to use based on repeat count
function getTileDistanceFromCenter(charPos, MAP_SIZE) {
  const worldX = charPos.x;
  const worldY = charPos.y;
  const centerX = (16 * MAP_SIZE) / 2;
  const centerY = (16 * MAP_SIZE) / 2;
  const dx = Math.abs(worldX - centerX) / MAP_SIZE;
  const dy = Math.abs(worldY - centerY) / MAP_SIZE;
  return Math.max(dx, dy);
}

const PropImg = React.memo(function PropImg({ src, alt, style }) {
  return (
    <img
      src={src}
      alt={alt}
      style={style}
      draggable={false}
    />
  );
});

export default function MapArea1({ onPortal }) {
  const [firstLoad, setFirstLoad] = useState(true);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });

  const {
    charPos,
    setCharPos,
    moving,
    lastDir
  } = useCharacterMovement(MAP_SIZE);

  let { charPos: renderCharPos, offset } = getSafeZoneCharAndOffset(
    charPos.x,
    charPos.y,
    MAP_SIZE,
    firstLoad,
    window.innerWidth,
    window.innerHeight,
    cameraOffset
  );

  useEffect(() => {
    if (firstLoad) {
      setCameraOffset(offset);
      const timer = setTimeout(() => setFirstLoad(false), 100);
      return () => clearTimeout(timer);
    }
  }, [firstLoad, offset]);

  useEffect(() => {
    if (!firstLoad && (offset.x !== cameraOffset.x || offset.y !== cameraOffset.y)) {
      setCameraOffset(offset);
    }
  }, [offset.x, offset.y, firstLoad]);

  const [showDebug, setShowDebug] = useState(false);
  const [forcePortalPrompt, setForcePortalPrompt] = useState(false);

  const { portal, getPortalImg, getPortalPrompt } = usePortalLogic({
    charPos,
    offset,
    MAP_SIZE,
    forcePortalPrompt,
    onTeleport: onPortal,
  });

  useEffect(() => {
    if (firstLoad) {
      const timer = setTimeout(() => setFirstLoad(false), 100);
      return () => clearTimeout(timer);
    }
  }, [firstLoad]);

  useEffect(() => {
    setFirstLoad(true);
    const timer = setTimeout(() => setFirstLoad(false), 100);
    return () => clearTimeout(timer);
  }, []);

  const footstepSounds = getFootstepSoundsForMap("maparea1");
  useEffect(() => {
    if (moving) {
      playFootstepLoop(footstepSounds, "maparea1");
    } else {
      stopFootstepLoop("maparea1");
    }
    return () => stopFootstepLoop("maparea1");
  }, [moving, footstepSounds]);

    // Ambiance
  useEffect(() => {
    playAmbianceForMap("maparea1");
    return () => stopAmbiance();
  }, []);

  useEffect(() => {
    function handleDebugKeys(e) {
      if (e.key === "d" || e.key === "D") setShowDebug((v) => !v);
      if (e.key === "3") setForcePortalPrompt((v) => !v);
      if (e.key === "2" && portal) {
        const charW = 192, charH = 192;
        const centerX = (16 * MAP_SIZE) / 2;
        const centerY = (16 * MAP_SIZE) / 2;
        const minX = centerX - 8 * MAP_SIZE + charW / 2;
        const maxX = centerX + 8 * MAP_SIZE - charW / 2;
        const minY = centerY - 8 * MAP_SIZE + charH / 2;
        const maxY = centerY + 8 * MAP_SIZE - charH / 2;
        const newWorldX = Math.max(minX, Math.min(maxX, portal.x));
        const newWorldY = Math.max(minY, Math.min(maxY, portal.y));
        setCharPos({ x: newWorldX, y: newWorldY });
        setFirstLoad(true);
      }
    }
    window.addEventListener("keydown", handleDebugKeys);
    return () => window.removeEventListener("keydown", handleDebugKeys);
  }, [portal, setCharPos]);

  const tileDist = getTileDistanceFromCenter(charPos, MAP_SIZE);

  const overlay =
    tileDist === 2
      ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(128,0,255,0.15)",
            pointerEvents: "none",
            zIndex: 2,
          }}
        />
      )
      : null;

  const cols = Math.ceil(window.innerWidth / MAP_SIZE) + 2;
  const rows = Math.ceil(window.innerHeight / MAP_SIZE) + 2;
  const baseX = Math.floor(offset.x / MAP_SIZE) * MAP_SIZE;
  const baseY = Math.floor(offset.y / MAP_SIZE) * MAP_SIZE;

  const centerX = (16 * MAP_SIZE) / 2;
  const centerY = (16 * MAP_SIZE) / 2;

  const tiles = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const tileX = baseX + (col - 1) * MAP_SIZE - offset.x;
      const tileY = baseY + (row - 1) * MAP_SIZE - offset.y;
      const worldTileX = baseX + (col - 1) * MAP_SIZE;
      const worldTileY = baseY + (row - 1) * MAP_SIZE;
      const tileKey = `${worldTileX}_${worldTileY}`;
      const tileDx = Math.abs(worldTileX + MAP_SIZE / 2 - centerX) / MAP_SIZE;
      const tileDy = Math.abs(worldTileY + MAP_SIZE / 2 - centerY) / MAP_SIZE;
      const thisTileDist = Math.max(tileDx, tileDy);

      if (thisTileDist > 8) continue;

      if (tileDx < 2 && tileDy < 2) {
        tiles.push(
          <img
            key={row + "-" + col + "-1A"}
            src={map1A}
            alt="map1A"
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
      } else if (
        (tileDx === 2 && tileDy < 3) ||
        (tileDy === 2 && tileDx < 3)
      ) {
        // Do nothing: blend ring removed
      } else {
        tiles.push(
          <img
            key={row + "-" + col + "-1B"}
            src={map1B}
            alt="map1B"
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
      }
      let propCount = 0;

      if (tileDx < 2 && tileDy < 2 && propCount < 20) {
        const props = getRandomPropsForTile(tileKey, MAP_SIZE);
        for (let p = 0; p < props.length && propCount < 20; p++) {
          const prop = props[p];
          const isTree = prop.file.toLowerCase().includes("tree");
          const isBush = prop.file === "1ABush.png";
          tiles.push(
            <PropImg
              key={tileKey + "-propA-" + p}
              src={process.env.PUBLIC_URL + "/1MAP/Props/" + prop.file}
              alt={"propA"}
              style={{
                width: (isBush ? 192 : isTree ? 288 : 96) * (prop.size || 1),
                height: (isBush ? 192 : isTree ? 288 : 96) * (prop.size || 1),
                position: "absolute",
                left: worldTileX + prop.x - offset.x,
                top: worldTileY + prop.y - offset.y,
                zIndex: 2,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          );
          propCount++;
        }
      }

      if (
        (tileDx === 2 && tileDy < 3) ||
        (tileDy === 2 && tileDx < 3)
      ) {
        // Do nothing: blend ring props removed
      }
      function tileOverlapsPortalArea(tileX, tileY, MAP_SIZE, portal, radius = 220) {
        if (!portal) return false;
        const tileLeft = tileX;
        const tileRight = tileX + MAP_SIZE;
        const tileTop = tileY;
        const tileBottom = tileY + MAP_SIZE;
        const portalLeft = portal.x - radius;
        const portalRight = portal.x + radius;
        const portalTop = portal.y - radius;
        const portalBottom = portal.y + radius;
        return (
          tileLeft < portalRight &&
          tileRight > portalLeft &&
          tileTop < portalBottom &&
          tileBottom > portalTop
        );
      }

      let isPortalArea = false;
      if (
        portal &&
        worldTileX <= portal.x &&
        portal.x < worldTileX + MAP_SIZE &&
        worldTileY <= portal.y &&
        portal.y < worldTileY + MAP_SIZE
      ) {
        isPortalArea = true;
        const portalProps = getPortalAreaProps(portal.x, portal.y, MAP_SIZE);
        for (let p = 0; p < portalProps.length && propCount < 20; p++) {
          const prop = portalProps[p];
          const isTree = prop.file.toLowerCase().includes("tree");
          const isBush = prop.file.toLowerCase().includes("bush");
          tiles.push(
            <PropImg
              key={tileKey + "-portalprop-" + p}
              src={process.env.PUBLIC_URL + "/1MAP/Props/" + prop.file}
              alt={"portalprop"}
              style={{
                width: (isTree ? 288 : isBush ? 192 : 96) * (prop.size || 1),
                height: (isTree ? 288 : isBush ? 192 : 96) * (prop.size || 1),
                position: "absolute",
                left: prop.x - offset.x - 48,
                top: prop.y - offset.y - 48,
                zIndex: 3,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          );
          propCount++;
        }
      }

      const overlapsPortalArea = tileOverlapsPortalArea(worldTileX, worldTileY, MAP_SIZE, portal);

      if (
        tileDx >= 2 && tileDy >= 2 &&
        !overlapsPortalArea &&
        !isPortalArea &&
        propCount < 20
      ) {
        const propsB = getRandomPropsForTileB(tileKey, MAP_SIZE);
        for (let p = 0; p < propsB.length && propCount < 20; p++) {
          const prop = propsB[p];
          const isTree = prop.file.toLowerCase().includes("tree");
          const isBush = prop.file === "1BBush.png";
          tiles.push(
            <PropImg
              key={tileKey + "-propB-" + p}
              src={process.env.PUBLIC_URL + "/1MAP/Props/" + prop.file}
              alt={"propB"}
              style={{
                width: (isBush ? 192 : isTree ? 288 : 96) * (prop.size || 1),
                height: (isBush ? 192 : isTree ? 288 : 96) * (prop.size || 1),
                position: "absolute",
                left: worldTileX + prop.x - offset.x,
                top: worldTileY + prop.y - offset.y,
                zIndex: 2,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          );
          propCount++;
        }
      }

      if (propCount < 5) {
        let extraProps = [];
        if (isPortalArea) {
          extraProps = getPortalAreaProps(worldTileX + MAP_SIZE / 2, worldTileY + MAP_SIZE / 2, MAP_SIZE);
        } else if (tileDx < 2 && tileDy < 2) {
          extraProps = getRandomPropsForTile(tileKey, MAP_SIZE);
        } else {
          extraProps = getRandomPropsForTileB(tileKey, MAP_SIZE);
        }
        let added = 0;
        for (let p = 0; propCount < 5 && p < extraProps.length; p++) {
          const prop = extraProps[p];
          const isTree = prop.file.toLowerCase().includes("tree");
          const isBush = prop.file.toLowerCase().includes("bush");
          tiles.push(
            <PropImg
              key={tileKey + "-extra-prop-" + p}
              src={process.env.PUBLIC_URL + "/1MAP/Props/" + prop.file}
              alt={"extra-prop"}
              style={{
                width: (isTree ? 288 : isBush ? 192 : 96) * (prop.size || 1),
                height: (isTree ? 288 : isBush ? 192 : 96) * (prop.size || 1),
                position: "absolute",
                left: (prop.x || (Math.random() * (MAP_SIZE - 96) + 48)) + worldTileX - offset.x,
                top: (prop.y || (Math.random() * (MAP_SIZE - 96) + 48)) + worldTileY - offset.y,
                zIndex: 4,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          );
          propCount++;
          added++;
        }
        while (propCount < 5) {
          tiles.push(
            <PropImg
              key={tileKey + "-dummy-prop-" + propCount}
              src={process.env.PUBLIC_URL + "/1MAP/Props/1ABush.png"}
              alt={"dummy-prop"}
              style={{
                width: 192,
                height: 192,
                position: "absolute",
                left: worldTileX + Math.random() * (MAP_SIZE - 96) - offset.x,
                top: worldTileY + Math.random() * (MAP_SIZE - 96) - offset.y,
                zIndex: 4,
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          );
          propCount++;
        }
      }
    }
  }

  const portalImg = getPortalImg(offset);

  return (
    <div
      style={{
        position: "relative",
        left: 0,
        top: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        zIndex: 1,
        overflow: "hidden",
        margin: "0 auto",
      }}
    >
      {tiles}
      {portalImg}
      {getPortalPrompt(offset)}
      <Character charPos={renderCharPos} moving={moving} lastDir={lastDir} />
      <DebugMenuOverlay
        show={showDebug}
        charPos={renderCharPos}
        worldX={charPos.x}
        worldY={charPos.y}
        portal={portal}
        showPortalPrompt={forcePortalPrompt}
      />
      {overlay}
    </div>
  );
}