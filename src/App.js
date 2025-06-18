import React, { useState, useEffect } from "react";
import MainMenu from "./meniu/MainMenu";
import IntroScreen from "./meniu/IntroScreen";
import MapRouter from "./MapRouter";
import OutroScreen from "./meniu/OutroScreen";
import { playEvilCackle } from "./AudioManager";
import './App.css';

// Import prop file arrays
import { propFilesA, propFilesB } from "./Map1/mapprops1";
import { propFiles0, getLinePropsForTile as getLinePropsForTile0 } from "./Map0/mapprops0";
import { propFilesA as propFiles2A } from "./Map2/mapprops2";
import { propFiles0 as propFilesX0 } from "./MapX/mappropsX";

// Portal area props (hardcoded here to avoid circular import)
const portalPropFiles = [
  "1CBush.png",
  "1CTree.png",
  "2CBush.png",
  "2CTree.png",
  "3CTree.png",
  "1C.png"
];

function preloadImage(src) {
  const img = new window.Image();
  img.src = src;
}

function App() {
  const [started, setStarted] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [showOutro, setShowOutro] = useState(false);

  useEffect(() => {
    // Preload Map1A props
    propFilesA.forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/1MAP/Props/" + file)
    );
    // Preload Map1B props
    propFilesB.forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/1MAP/Props/" + file)
    );
    // Preload portal area props
    portalPropFiles.forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/1MAP/Props/" + file)
    );
    // Preload Map1 map images
    preloadImage(process.env.PUBLIC_URL + "/1MAP/play_area/1Amap.png");
    preloadImage(process.env.PUBLIC_URL + "/1MAP/play_area/1Bmap.png");
    // Preload Map0 map image and props
    preloadImage(process.env.PUBLIC_URL + "/0MAP/play_area/Jura.png");
    // Preload Map0 props (get all unique prop files from getLinePropsForTile)
    const map0Props = getLinePropsForTile0("0_0", 2048);
    const uniqueMap0Files = Array.from(new Set(map0Props.map(p => p.file)));
    uniqueMap0Files.forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/0MAP/Props/" + file)
    );
    // Preload Map2 props and map
    propFiles2A.forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/2MAP/Props/" + file)
    );
    preloadImage(process.env.PUBLIC_URL + "/2MAP/play_area/1Amap.png");
    // Preload MapX props and map
    propFilesX0.forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/XMAP/Props/" + file)
    );
    preloadImage(process.env.PUBLIC_URL + "/XMAP/play_area/cave_water.png");
    // Preload MapX footstep sounds
    [
      "Hard_surface_footstep_1_sfx.mp3",
      "Hard_surface_footstep_2_sfx.mp3",
      "Hard_surface_footstep_3_sfx.mp3"
    ].forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/XMAP/Sounds/" + file)
    );
    // Preload Map0 footstep sounds
    [
      "Sand_footstep_1_sfx.mp3",
      "Sand_footstep_2_sfx.mp3",
      "Sand_footstep_3_sfx.mp3"
    ].forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/0MAP/Sounds/" + file)
    );
    // Preload Map1 footstep sounds
    [
      "Grass_footstep_1_sfx.mp3",
      "Grass_footstep_2_sfx.mp3"
    ].forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/1MAP/Sounds/" + file)
    );
    // Preload Map2 footstep sounds
    [
      "Wet_footstep_1_sfx.mp3",
      "Wet_footstep_2_sfx.mp3"
    ].forEach(file =>
      preloadImage(process.env.PUBLIC_URL + "/2MAP/Sounds/" + file)
    );
    // Preload portal animation frames if you have them (example)
    // import { portalFrames } from "./portalprop";
    // portalFrames.forEach(src => preloadImage(src));
  }, []);

  // Handler for Begin button: play cackle, then start game
  function handleBeginWithCackle() {
    playEvilCackle(() => setStarted(true));
  }

  return (
    <div className="App" style={{ minHeight: "100vh", minWidth: "100vw", position: "relative", overflow: "hidden" }}>
      {!started && !showIntro && (
        <MainMenu onStart={() => setShowIntro(true)} />
      )}
      {showIntro && !started && (
        <IntroScreen
          onBack={() => setShowIntro(false)}
          onBeginCackle={handleBeginWithCackle}
        />
      )}
            {started && !showOutro && (
        <MapRouter
          onGameEnd={() => {
            setStarted(false);
            setShowOutro(true);
          }}
        />
      )}
      {showOutro && (
        <OutroScreen
          onMainMenu={() => {
            setShowOutro(false);
            setShowIntro(false);
            setStarted(false);
          }}
          onEnd={() => window.close()}
        />
      )}
    </div>
  );
}

export default App;