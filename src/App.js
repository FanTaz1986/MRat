import React, { useState, useEffect, Suspense } from "react";
import { createAssetLoader } from "./utils/AssetLoader";
import { useGameStore } from "./stores/gameStore";
import MainMenu from "./meniu/MainMenu";
import IntroScreen from "./meniu/IntroScreen";
import OutroScreen from "./meniu/OutroScreen";
import LoadingScreen from "./meniu/LoadingScreen";
import GameOverScreen from "./meniu/GameOverScreen";
import { playEvilCackle } from "./utils/AudioManager";
import { initPixiErrorHandling } from "./utils/PixiErrorHandler";
import './App.css';

// Initialize PixiJS error handling
initPixiErrorHandling();

// Lazy load the game component to reduce initial load time
const GameScreen = React.lazy(() => import("./Game/GameScreen"));

// Create asset loader instance
const assetLoader = createAssetLoader();

// Global flag to prevent asset loading during React StrictMode double mounting
let globalAssetLoadingInitiated = false;

function App() {
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const { gameState, setGameState } = useGameStore();
  
  // Load all assets on mount
  useEffect(() => {
    // Prevent multiple asset loading calls during React StrictMode
    if (globalAssetLoadingInitiated) {
      console.log('Asset loading already initiated globally, skipping');
      return;
    }
    
    globalAssetLoadingInitiated = true;
    const assetManifest = {
      images: [
        // Map images
        { name: "map1A", url: "/1MAP/play_area/1Amap.png" },
        { name: "map1B", url: "/1MAP/play_area/1Bmap.png" },
        { name: "map0", url: "/0MAP/play_area/Jura.png" },
        { name: "mapX", url: "/XMAP/play_area/cave.png" },
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

        { name: "1c_bush", url: "/1MAP/Props/1CBush.png" },
        { name: "1c_tree", url: "/1MAP/Props/1CTree.png" },
        { name: "2c_bush", url: "/1MAP/Props/2CBush.png" },
        { name: "2c_tree", url: "/1MAP/Props/2CTree.png" },
        { name: "3c_tree", url: "/1MAP/Props/3CTree.png" },

        { name: "1_grass", url: "/1MAP/Props/1Grass.png" },
        { name: "2_grass", url: "/1MAP/Props/2Grass.png" },
        { name: "3_grass", url: "/1MAP/Props/3Grass.png" },
        { name: "4_grass", url: "/1MAP/Props/4Grass.png" },
        
        // MapX props
        { name: "mapx_1a", url: "/XMAP/Props/1A.png" },
        
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
        { name: "char_idle_down_0", url: "/Main_char_frames/0F.png" },
        { name: "char_idle_down_1", url: "/Main_char_frames/1F.png" },
        { name: "char_idle_down_2", url: "/Main_char_frames/2F.png" },

        { name: "char_idle_up_0", url: "/Main_char_frames/0B.png" },
        { name: "char_idle_up_1", url: "/Main_char_frames/1B.png" },
        { name: "char_idle_up_2", url: "/Main_char_frames/2B.png" },

        { name: "char_idle_left_0", url: "/Main_char_frames/0L.png" },
        { name: "char_idle_left_1", url: "/Main_char_frames/1L.png" },
        { name: "char_idle_left_2", url: "/Main_char_frames/2L.png" },
        { name: "char_idle_left_3", url: "/Main_char_frames/3L.png" },
        { name: "char_idle_left_4", url: "/Main_char_frames/4L.png" },

        { name: "char_idle_right_0", url: "/Main_char_frames/0R.png" },
        { name: "char_idle_right_1", url: "/Main_char_frames/1R.png" },
        { name: "char_idle_right_2", url: "/Main_char_frames/2R.png" },
        { name: "char_idle_right_3", url: "/Main_char_frames/3R.png" },
        { name: "char_idle_right_4", url: "/Main_char_frames/4R.png" },
        
        // Pet frames - Level 0
        { name: "pet_idle_0", url: "/Ziurke/0lvl/1_ziurke_still.png" },
        { name: "pet_move_0_1", url: "/Ziurke/0lvl/1_ejimas_1.png" },
        { name: "pet_move_0_2", url: "/Ziurke/0lvl/1_ejimas_2.png" },
        { name: "pet_attack_0", url: "/Ziurke/0lvl/1_ziurke_spjauna.png" },
        
        // Pet frames - Level 1
        { name: "pet_idle_1", url: "/Ziurke/1lvl/2_ziurke_still.png" },
        { name: "pet_move_1_1", url: "/Ziurke/1lvl/2_ejimas_1.png" },
        { name: "pet_move_1_2", url: "/Ziurke/1lvl/2_ejimas_2.png" },
        { name: "pet_attack_1", url: "/Ziurke/1lvl/2_ziurke_spjauna.png" },
        
        // Pet frames - Level 2
        { name: "pet_idle_2", url: "/Ziurke/2lvl/3_ziurke_still.png" },
        { name: "pet_move_2_1", url: "/Ziurke/2lvl/3_ejimas_1.png" },
        { name: "pet_move_2_2", url: "/Ziurke/2lvl/3_ejimas_2.png" },
        { name: "pet_attack_2", url: "/Ziurke/2lvl/3_ziurke_spjauna.png" },
        
        // Boss frames
        { name: "boss_idle_1", url: "/Boss/Frames/boss_idle_1.png" },
        { name: "boss_idle_2", url: "/Boss/Frames/boss_idle_2.png" },
        { name: "boss_fly_1", url: "/Boss/Frames/boss_fly_1.png" },
        { name: "boss_fly_2", url: "/Boss/Frames/boss_fly_2.png" },
        { name: "boss_atk_1", url: "/Boss/Frames/boss_atk_1.png" },
        { name: "boss_atk_2", url: "/Boss/Frames/boss_atk_2.png" },
        { name: "boss_atk_3_1", url: "/Boss/Frames/boss_atk_3_1.png" },
        { name: "boss_atk_3_2", url: "/Boss/Frames/boss_atk_3_2.png" },
        { name: "boss_dead", url: "/Boss/Frames/boss_dead.png" },
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
        { name: "bossRoomAmbiance", url: "/XMAP/play_area/boss_room_ambiance_3.mp3" }, // Boss room audio
        // Audio list is now only used for loading progress calculation
      ]
    };

    // Load assets using modern async/await pattern
    const loadGameAssets = async () => {
      // Check if assets are already loaded to prevent reloading
      if (assetLoader.areAssetsLoaded()) {
        console.log('Assets already loaded, skipping reload');
        setAssetsLoaded(true);
        return;
      }
      
      try {
        await assetLoader.loadAssets(assetManifest, (progress) => {
          setLoadingProgress(progress);
        });
        
        // Small delay to show 100% progress
        setTimeout(() => setAssetsLoaded(true), 500);
      } catch (error) {
        console.error('Failed to load assets:', error);
        // Still allow the game to start even if some assets failed
        setTimeout(() => setAssetsLoaded(true), 500);
      }
    };

    loadGameAssets();
  }, []);
  
  // Handler for Begin button: play cackle, then start game
  function handleBeginWithCackle() {
    playEvilCackle(() => setGameState('PLAYING'));
  }

  // Debug handler for navigating to different screens from debug overlay
  function debugNavigateToScreen(screenName) {
    const screenMap = {
      'main-menu': 'MENU',
      'intro': 'INTRO', 
      'loading': 'LOADING',
      'game': 'PLAYING',
      'outro': 'OUTRO',
      'game-over': 'GAME_OVER',
      // Uppercase variants for compatibility
      'MAIN-MENU': 'MENU',
      'INTRO': 'INTRO',
      'LOADING': 'LOADING',
      'GAME': 'PLAYING',
      'OUTRO': 'OUTRO',
      'GAME-OVER': 'GAME_OVER'
    };
    
    const gameState = screenMap[screenName];
    if (gameState) {
      // This is debug navigation, keep as regular console for dev purposes
      console.log(`🐛 Debug: Navigating to screen '${screenName}' (state: ${gameState})`);
      setGameState(gameState);
    } else {
      console.warn(`🐛 Debug: Unknown screen '${screenName}'`);
    }
  }
  
  // Render the appropriate screen based on game state
  function renderGameScreen() {
    switch (gameState) {
      case 'MENU':
        return (
          <MainMenu 
            onStart={() => setGameState('INTRO')}
            onDebugNavigateToScreen={debugNavigateToScreen}
          />
        );
      
      case 'INTRO':
        return (
          <IntroScreen
            onBack={() => setGameState('MENU')}
            onBeginCackle={handleBeginWithCackle}
            onDebugNavigateToScreen={debugNavigateToScreen}
          />
        );

      case 'LOADING':
        return (
          <LoadingScreen 
            progress={loadingProgress} 
            message="Loading assets..." 
            onDebugNavigateToScreen={debugNavigateToScreen}
          />
        );
      
      case 'PLAYING':
        return (
          <Suspense fallback={<LoadingScreen progress={100} message="Starting game..." />}>
            <GameScreen 
              onGameEnd={() => setGameState('OUTRO')}
              onDebugNavigateToScreen={debugNavigateToScreen}
            />
          </Suspense>
        );
      
      case 'OUTRO':
        return (
          <OutroScreen
            onMainMenu={() => setGameState('MENU')}
            onEnd={() => window.close()}
            onDebugNavigateToScreen={debugNavigateToScreen}
          />
        );

      case 'GAME_OVER':
        return (
          <GameOverScreen
            onMainMenu={() => setGameState('MENU')}
            onRestart={() => setGameState('PLAYING')}
            onDebugNavigateToScreen={debugNavigateToScreen}
          />
        );
        
      default:
        return (
          <MainMenu 
            onStart={() => setGameState('INTRO')}
            onDebugNavigateToScreen={debugNavigateToScreen}
          />
        );
    }
  }

  // Show loading screen until assets are loaded
  if (!assetsLoaded) {
    return (
      <LoadingScreen 
        progress={loadingProgress} 
        onDebugNavigateToScreen={debugNavigateToScreen}
      />
    );
  }

  return (
    <div className="App">
      {renderGameScreen()}
    </div>
  );
}

export default App;