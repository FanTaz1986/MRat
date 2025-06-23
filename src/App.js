import React, { useState, useEffect, Suspense } from "react";
import { createAssetLoader } from "./utils/AssetLoader";
import { useGameStore } from "./stores/gameStore";
import MainMenu from "./meniu/MainMenu";
import IntroScreen from "./meniu/IntroScreen";
import OutroScreen from "./meniu/OutroScreen";
import LoadingScreen from "./meniu/LoadingScreen";
import { playEvilCackle } from "./utils/AudioManager";
import { initPixiErrorHandling } from "./utils/PixiErrorHandler";
import './App.css';

// Initialize PixiJS error handling
initPixiErrorHandling();

// Lazy load the game component to reduce initial load time
const GameScreen = React.lazy(() => import("./Game/GameScreen"));

// Create asset loader instance
const assetLoader = createAssetLoader();

function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { gameState, setGameState } = useGameStore();
  
  // Load all assets on mount
  useEffect(() => {
    const assetManifest = {
      images: [
        // Map images
        { name: "map1A", url: "/1MAP/play_area/1Amap.png" },
        { name: "map1B", url: "/1MAP/play_area/1Bmap.png" },
        { name: "map0", url: "/0MAP/play_area/Jura.png" },
        { name: "mapX", url: "/XMAP/play_area/cave_water.png" },
        { name: "map2", url: "/2MAP/play_area/1Amap.png" },
        
        // Map1 props
        { name: "1a_bush", url: "/1MAP/Props/1ABush.png" },
        { name: "1a_tree", url: "/1MAP/Props/1ATree.png" },
        { name: "2a_tree", url: "/1MAP/Props/2ATree.png" },
        { name: "3a_tree", url: "/1MAP/Props/3ATree.png" },
        { name: "4a_tree", url: "/1MAP/Props/4Atree.png" },
        { name: "1b_bush", url: "/1MAP/Props/1BBush.png" },
        { name: "1b_tree", url: "/1MAP/Props/1BTree.png" },
        { name: "2b_tree", url: "/1MAP/Props/2BTree.png" },
        { name: "3b_tree", url: "/1MAP/Props/3BTree.png" },
        { name: "1_grass", url: "/1MAP/Props/1Grass.png" },
        { name: "2_grass", url: "/1MAP/Props/2Grass.png" },
        { name: "3_grass", url: "/1MAP/Props/3Grass.png" },
        { name: "4_grass", url: "/1MAP/Props/4Grass.png" },
        
        // Map2 props
        { name: "map2_1A", url: "/2MAP/Props/1A.png" },
        { name: "map2_2A", url: "/2MAP/Props/2A.png" },
        { name: "map2_3A", url: "/2MAP/Props/3A.png" },
        { name: "map2_4A", url: "/2MAP/Props/4A.png" },
        { name: "map2_5A", url: "/2MAP/Props/5A.png" },
        { name: "map2_1C", url: "/2MAP/Props/1C.png" },
        { name: "map2_fog", url: "/2MAP/Effects/fog.png" },
        
        // UI images
        { name: "introSky", url: "/Intro/sky.png" },
        { name: "menuBg", url: "/meniu/loginscreen.png" },
        { name: "outroBg", url: "/Outro/debeseliai.png" },
        
        // Character frames
        { name: "char_idle_down", url: "/Main_char_frames/0F.png" },
        { name: "char_idle_up", url: "/Main_char_frames/0B.png" },
        { name: "char_idle_left", url: "/Main_char_frames/0L.png" },
        { name: "char_idle_right", url: "/Main_char_frames/0R.png" },
        // Add all other character frames
      ],
      sprites: [
        // Using a different approach for character frames
      ],
      audio: [
        // Audio manifest is kept for progress tracking only
        // All audio is now loaded on demand by AudioManager.js using Howler
        { name: "menuMusic", url: "/meniu/Start_menu_music.mp3" }, // Updated path to match AudioManager
        { name: "portalSound", url: "/Portal/Portal_enter.mp3" },
        { name: "evilLaugh", url: "/Intro/Evil_cackle_vocal.mp3" }, // Updated path to match AudioManager 
        { name: "footstep_grass1", url: "/1MAP/Sounds/Grass_footstep_1_sfx.mp3" },
        { name: "footstep_grass2", url: "/1MAP/Sounds/Grass_footstep_2_sfx.mp3" },
        // Audio list is now only used for loading progress calculation
      ]
    };

    assetLoader.loadAssets(assetManifest, (progress) => {
      setLoadingProgress(progress);
      if (progress === 100) {
        setTimeout(() => setAssetsLoaded(true), 500);
      }
    });
  }, []);
  
  // Handler for Begin button: play cackle, then start game
  function handleBeginWithCackle() {
    playEvilCackle(() => setGameState('PLAYING'));
  }
  
  // Render the appropriate screen based on game state
  function renderGameScreen() {
    switch (gameState) {
      case 'MENU':
        return <MainMenu onStart={() => setGameState('INTRO')} />;
      
      case 'INTRO':
        return (
          <IntroScreen
            onBack={() => setGameState('MENU')}
            onBeginCackle={handleBeginWithCackle}
          />
        );
      
      case 'PLAYING':
        return (
          <Suspense fallback={<LoadingScreen progress={100} message="Starting game..." />}>
            <GameScreen onGameEnd={() => setGameState('OUTRO')} />
          </Suspense>
        );
      
      case 'OUTRO':
        return (
          <OutroScreen
            onMainMenu={() => setGameState('MENU')}
            onEnd={() => window.close()}
          />
        );
        
      default:
        return <MainMenu onStart={() => setGameState('INTRO')} />;
    }
  }

  // Show loading screen until assets are loaded
  if (!assetsLoaded) {
    return <LoadingScreen progress={loadingProgress} />;
  }

  return (
    <div className="App">
      {renderGameScreen()}
    </div>
  );
}

export default App;