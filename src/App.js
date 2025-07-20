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
  const { gameState, setGameState, generateNewGameSeed } = useGameStore();
  
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
        { name: "boss_fly_1", url: "/Boss/Frames/boss_fly_1.png" },
        { name: "boss_fly_2", url: "/Boss/Frames/boss_fly_2.png" },
        { name: "boss_land_1", url: "/Boss/Frames/boss_land_1.png" },
        { name: "boss_land_2", url: "/Boss/Frames/boss_land_2.png" },
        { name: "boss_atk_melle_1", url: "/Boss/Frames/boss_atk_melle_1.png" },
        { name: "boss_atk_melle_2", url: "/Boss/Frames/boss_atk_melle_2.png" },
        { name: "boss_atk_melle_paw", url: "/Boss/Frames/boss_atk_melle_paw.png" },
        { name: "boss_atk_range", url: "/Boss/Frames/boss_atk_range.png" },
        { name: "boss_atk_zap_bolt", url: "/Boss/Frames/boss_atk_zap_bolt.png" },
        { name: "boss_dead", url: "/Boss/Frames/boss_dead.png" },
        
        // Boss attack effects
        { name: "boss_thunder", url: "/Boss/atacks/thunder.png" },
        { name: "boss_zap_bolt1", url: "/Boss/atacks/zap_bolt1.png" },
        { name: "boss_zap_bolts2", url: "/Boss/atacks/zap_bolts2.png" },
        { name: "boss_zap_bolts3", url: "/Boss/atacks/zap_bolts3.png" },
        { name: "boss_zap_cone1", url: "/Boss/atacks/zap_cone1.png" },
        { name: "boss_zap_cone2", url: "/Boss/atacks/zap_cone2.png" },
        { name: "boss_zap_cone3", url: "/Boss/atacks/zap_cone3.png" },
        
        // Portal frames
        { name: "portal_1", url: "/Portal/portal1.png" },
        { name: "portal_2", url: "/Portal/portal2.png" },
        { name: "portal_3", url: "/Portal/portal3.png" },
        { name: "portal_4", url: "/Portal/portal4.png" },
        
        // UI assets
        { name: "heart_icon", url: "/Extra/HP/hearticon.png" },
        
        // Enemy assets - Slime textures for immediate availability
        // { name: "slime", url: "/1MAP/Enemies/slime.png" }, // Removed - file doesn't exist or corrupted
        { name: "red_slime_idle", url: "/1MAP/Enemies/Red_slime_idle.png.png" }, // Note: double .png extension
        { name: "red_slime_move", url: "/1MAP/Enemies/Red_slime_move.png" },
        { name: "red_slime_attack", url: "/1MAP/Enemies/Red_slime_attack.png" },
        { name: "blue_slime_idle", url: "/1MAP/Enemies/Blue_slime_idle.png" },
        { name: "blue_slime_move", url: "/1MAP/Enemies/Blue_slime_move.png" },
        { name: "blue_slime_attack", url: "/1MAP/Enemies/Blue_slime_attack.png" },
        
        // Other enemy assets - Loaded dynamically as needed
        { name: "ghost", url: "/2MAP/Enemies/ghost.png" },
        { name: "rock", url: "/2MAP/Enemies/rock.png" },
        { name: "sludge", url: "/2MAP/Enemies/sludge.png" },
        { name: "tree_enemy", url: "/2MAP/Enemies/tree.png" },
      ],
      sprites: [
        // Using a different approach for character frames
      ],
      audio: [
        // Audio manifest is kept for progress tracking only
        // All audio is now loaded on demand by AudioManager.js using Howler
        { name: "menuMusic", url: "/meniu/Start_menu_music.mp3" }, // Updated path to match AudioManager
        { name: "menuSelect", url: "/meniu/Sellect.mp3" },
        { name: "menuStart", url: "/meniu/Start.mp3" },
        { name: "portalEnter", url: "/Portal/Portal_enter.mp3" },
        { name: "portalLeave", url: "/Portal/Portal_leave.mp3" },
        { name: "heroVoiceLine", url: "/Portal/Incredible_2_hero_voice_line.mp3" },
        { name: "evilLaugh", url: "/Intro/Evil_cackle_vocal.mp3" }, // Updated path to match AudioManager 
        { name: "outroMusic", url: "/Outro/8_Eight_loop.mp3" }, 
        
        // Footstep sounds for all maps
        { name: "footstep_sand1", url: "/0MAP/Sounds/Sand_footstep_1_sfx.mp3" },
        { name: "footstep_sand2", url: "/0MAP/Sounds/Sand_footstep_2_sfx.mp3" },
        { name: "footstep_sand3", url: "/0MAP/Sounds/Sand_footstep_3_sfx.mp3" },
        { name: "footstep_grass1", url: "/1MAP/Sounds/Grass_footstep_1_sfx.mp3" },
        { name: "footstep_grass2", url: "/1MAP/Sounds/Grass_footstep_2_sfx.mp3" },
        { name: "footstep_wet1", url: "/2MAP/Sounds/Wet_footstep_1_sfx.mp3" },
        { name: "footstep_wet2", url: "/2MAP/Sounds/Wet_footstep_2_sfx.mp3" },
        { name: "footstep_hard1", url: "/XMAP/Sounds/Hard_surface_footstep_1_sfx.mp3" },
        { name: "footstep_hard2", url: "/XMAP/Sounds/Hard_surface_footstep_2_sfx.mp3" },
        { name: "footstep_hard3", url: "/XMAP/Sounds/Hard_surface_footstep_3_sfx.mp3" },
        { name: "bossRoomAmbiance", url: "/XMAP/play_area/boss_room_ambiance_3.mp3" }, // Boss room audio
        
        // Map ambiance audio
        { name: "map0Ambiance", url: "/0MAP/play_area/1_First_loop.mp3" },
        { name: "map1Ambiance", url: "/1MAP/play_area/Grass_planes_ambiance.mp3" },
        { name: "map2Ambiance", url: "/2MAP/play_area/Swamp_ambiance.mp3" },
        
        // Boss audio files for preloading
        { name: "bossRoomMusic", url: "/Boss/Audio/boss_room_music_and_ambiance.mp3" },
        { name: "bossFlySound", url: "/Boss/Audio/Boss_fly_sound.mp3" },
        { name: "bossLandSound", url: "/Boss/Audio/Boss_land_sound.mp3" },
        { name: "bossMeleeAttack", url: "/Boss/Audio/boss_atk_melle_paw_scratch.mp3" },
        { name: "bossRangeCharge1", url: "/Boss/Audio/range_charge_up_1.mp3" },
        { name: "bossRangeCharge2", url: "/Boss/Audio/range_charge_up_2.mp3" },
        { name: "bossRangeCharge3", url: "/Boss/Audio/range_charge_up_3.mp3" },
        { name: "bossThunderExplosion1", url: "/Boss/Audio/range_thunder_explotion_1_.mp3" },
        { name: "bossThunderExplosion2", url: "/Boss/Audio/range_thunder_explotion_2.mp3" },
        { name: "bossZapBoltExplosion1", url: "/Boss/Audio/range_zap_bolt_explotion_1.mp3" },
        { name: "bossZapBoltExplosion2", url: "/Boss/Audio/range_zap_bolt_explotion_2.mp3" },
        { name: "bossZapCone", url: "/Boss/Audio/range_zap_cone.mp3" },
        { name: "bossDeathSound", url: "/Boss/Audio/boss_death_sound.mp3" },
        
        // Enemy audio files
        { name: "slimeAttack", url: "/1MAP/Enemies/sound_effect_10_slime_attack.mp3" },
        { name: "slimeWalk", url: "/1MAP/Enemies/sound_effect_8_slime_walk.mp3" },
        { name: "slimeDead", url: "/1MAP/Enemies/sound_effect_9_dead_slime.mp3" },
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
    // Generate new game seed for fresh map layouts
    generateNewGameSeed();
    playEvilCackle(() => setGameState('PLAYING'));
  }

  // Handler for restarting the game: generate new seed for new layouts
  function handleRestart() {
    // Generate new game seed for fresh map layouts on restart
    generateNewGameSeed();
    setGameState('PLAYING');
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
              onReturnToMenu={() => setGameState('MENU')}
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
            onRestart={handleRestart}
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