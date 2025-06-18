import React, { useState } from "react";
import MapArea0 from "./Map0/MapArea0";
import MapArea1 from "./Map1/MapArea1";
import MapArea2 from "./Map2/MapArea2";
import MapAreaX from "./MapX/MapAreaX";

export default function MapRouter({ onGameEnd }) {
  const [currentMap, setCurrentMap] = useState("maparea0");

  // Handler functions to switch maps
  const handleToMap1 = () => setCurrentMap("maparea1");
  const handleToMap2 = () => setCurrentMap("maparea2");
  const handleToMapX = () => setCurrentMap("mapareax");
  const handleToMap0 = () => setCurrentMap("maparea0");

  // Only one map is ever rendered at a time!
  if (currentMap === "maparea0") {
    return <MapArea0 onPortal={handleToMap1} />;
  }
  if (currentMap === "maparea1") {
    return <MapArea1 onPortal={handleToMap2} />;
  }
  if (currentMap === "maparea2") {
    return <MapArea2 onPortal={handleToMapX} />;
  }
  if (currentMap === "mapareax") {
    return <MapAreaX onPortal={onGameEnd} />;
  }
  return null;
}