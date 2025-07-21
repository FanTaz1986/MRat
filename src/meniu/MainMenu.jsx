import React, { useState, useEffect, useRef } from "react";
import "./MainMenu.css";
import {
  playMenuMusic,
  stopMenuMusic,
  playMenuSelect,
  playMenuStart,
  setMusicVolume,
  setSfxVolume,
  initAudio,
} from "../utils/AudioManager";
import { createDebugOverlay } from "../development/utils/Debug";
import SaveLoadMenu from "./SaveLoadMenu";
// Removed unused import: useGameStore

const menuItems = ["Start", "Load Game", "Options", "How to Play"];

export default function MainMenu({ onStart, onDebugNavigateToScreen, onLoadGame }) {
  const [selected, setSelected] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showLoadGame, setShowLoadGame] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(5);
  const [sfxVolume, setSfxVolumeState] = useState(7);
  const debugSystemRef = useRef(null);
  const loginBg = process.env.PUBLIC_URL + "/meniu/loginscreen.png";
  const skyBg = process.env.PUBLIC_URL + "/Intro/sky.png";

  // Function to initialize audio and play music on user interaction
  const handleUserInteraction = () => {
    try {
      // Initialize audio on first interaction
      initAudio();
      
      // Slight delay before playing music to ensure context is ready
      setTimeout(() => {
        try {
          playMenuMusic();
        } catch (playError) {
          console.warn('Error playing menu music:', playError);
        }
      }, 100);
    } catch (e) {
      console.warn('Error initializing audio:', e);
    }
    
    // Remove event listeners once initialized regardless of success/failure
    document.removeEventListener('click', handleUserInteraction);
    document.removeEventListener('touchstart', handleUserInteraction);
    document.removeEventListener('keydown', handleUserInteraction);
  };

  useEffect(() => {
    // Set up volume
    setMusicVolume(musicVolume / 10);
    setSfxVolume(sfxVolume / 10);
    
    // Add event listeners to initialize audio on user interaction
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    
    // Try to play music immediately (might be blocked by autoplay policy)
    try {
      playMenuMusic();
    } catch (e) {
      console.warn('Error playing menu music on load:', e);
    }
    
    return () => {
      try {
        stopMenuMusic();
      } catch (e) {
        console.warn('Error stopping menu music:', e);
      }
      
      // Clean up event listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [musicVolume, sfxVolume]);

  useEffect(() => {
    setMusicVolume(musicVolume / 10);
    if (window.menuMusicHowl) window.menuMusicHowl.volume(musicVolume / 10);
    if (window.currentAmbianceHowl) window.currentAmbianceHowl.volume(musicVolume / 10);
  }, [musicVolume]);

  useEffect(() => {
    setSfxVolume(sfxVolume / 10);
  }, [sfxVolume]);

  // Initialize debug overlay for MainMenu (debounced)
  useEffect(() => {
    // Add delay to prevent rapid re-initialization during React StrictMode
    const timer = setTimeout(() => {
      try {
        if (!debugSystemRef.current) {
          debugSystemRef.current = createDebugOverlay(null, 'MainMenu');
        }
        // Set the screen navigation callback
        if (debugSystemRef.current && debugSystemRef.current.setScreenNavigationCallback && onDebugNavigateToScreen) {
          debugSystemRef.current.setScreenNavigationCallback(onDebugNavigateToScreen);
        }
      } catch (error) {
        console.warn('Failed to initialize debug overlay for MainMenu:', error);
      }
    }, 150);

    return () => {
      clearTimeout(timer);
      if (debugSystemRef.current && debugSystemRef.current.destroy) {
        debugSystemRef.current.destroy();
      }
    };
  }, [onDebugNavigateToScreen]);

  const handleMenuClick = (idx) => {
    setSelected(idx);
    playMenuSelect();
    if (menuItems[idx] === "Options") {
      setShowOptions(true);
      setShowCredits(false);
      setShowHowToPlay(false);
      setShowLoadGame(false);
    } else if (menuItems[idx] === "How to Play") {
      setShowHowToPlay(true);
      setShowOptions(false);
      setShowCredits(false);
      setShowLoadGame(false);
    } else if (menuItems[idx] === "Load Game") {
      setShowLoadGame(true);
      setShowOptions(false);
      setShowCredits(false);
      setShowHowToPlay(false);
    } else {
      setShowOptions(false);
      setShowCredits(false);
      setShowHowToPlay(false);
      setShowLoadGame(false);
    }
  };

  const handleStart = () => {
    playMenuStart();
    setTimeout(() => {
      stopMenuMusic();
      onStart && onStart();
    }, 400);
  };

  const handleLoadGame = (gameState) => {
    playMenuStart();
    setTimeout(() => {
      stopMenuMusic();
      onLoadGame && onLoadGame(gameState);
    }, 400);
  };

  const handleExitGame = () => {
    if (window.confirm("Are you sure you want to exit the game?")) {
      // For web browsers, we can't actually close the window, but we can navigate away
      // or show a message to the user
      try {
        window.close();
      } catch (e) {
        alert("Please close the browser tab to exit the game.");
      }
    }
  };

  return (
    <div className="main-menu-container">
      {/* Sky background layer - fills entire screen */}
      <div
        className="main-menu-sky-bg"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${skyBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          zIndex: 1
        }}
      ></div>
      
      {/* Main art layer - always fully visible, centered */}
      <div
        className="main-menu-art-bg"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          backgroundImage: `url(${loginBg})`,
          backgroundSize: "contain", // Ensures the full 4200x2970 art is always visible
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          zIndex: 2
        }}
      ></div>
      
      {/* UI overlay */}
      <div className="main-menu-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(0,0,0,0.25)", // Light overlay for text readability
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3
        }}
      >
        <h1 className="main-menu-title">M RAT</h1>
        <ul className="main-menu-list">
          {menuItems.map((item, idx) => (
            <li key={item}>
              <button
                className={`main-menu-btn${selected === idx ? " selected" : ""}`}
                onClick={() => {
                  handleMenuClick(idx);
                  if (item === "Start") handleStart();
                }}
                onMouseEnter={() => setSelected(idx)}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
        {showOptions && (
          <div className="main-menu-popup">
            <h2 style={{ color: "#a259ff" }}>Options</h2>
            
            <label style={{ color: "#a259ff", fontWeight: "bold", display: "block", marginBottom: 16 }}>
              Music Volume: {musicVolume}
              <input
                type="range"
                min={0}
                max={10}
                value={musicVolume}
                onChange={e => setMusicVolumeState(Number(e.target.value))}
                style={{ width: "200px", marginLeft: "16px" }}
              />
            </label>
            <label style={{ color: "#a259ff", fontWeight: "bold", display: "block", marginBottom: 16 }}>
              SFX Volume: {sfxVolume}
              <input
                type="range"
                min={0}
                max={10}
                value={sfxVolume}
                onChange={e => setSfxVolumeState(Number(e.target.value))}
                style={{ width: "200px", marginLeft: "16px" }}
              />
            </label>
            <button
              className="main-menu-btn"
              style={{ marginTop: "24px" }}
              onClick={() => setShowOptions(false)}
            >
              Back
            </button>
          </div>
        )}
        {showCredits && (
          <div className="main-menu-popup">
            <h2 style={{ color: "#a259ff" }}>Credits</h2>
            <div style={{ color: "#fff", margin: "16px 0", fontSize: "1.2rem" }}>
              <div>Art lead: <b>Ugnė Šilingaitė</b></div>
              <div>Programming: <b>Algirdas Kazlauskas </b></div>
              <div>Art: <b>Domantas Drebulys </b></div>
              <div>Music director: <b>Emilis Kazlauskas</b></div>
            </div>
            <button
              className="main-menu-btn"
              style={{ marginTop: "24px" }}
              onClick={() => setShowCredits(false)}
            >
              Back
            </button>
          </div>
        )}
        {showHowToPlay && (
          <div className="main-menu-popup" style={{ maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ color: "#a259ff", marginBottom: "20px" }}>How to Play</h2>
            
            <div style={{ color: "#fff", textAlign: "left", fontSize: "1.1rem", lineHeight: "1.6" }}>
              <h3 style={{ color: "#a259ff", marginBottom: "12px" }}>⌨️ Keyboard Controls</h3>
              <div style={{ marginBottom: "20px", paddingLeft: "16px" }}>
                <div><b>Character Movement:</b> Arrow Keys</div>
                <div><b>Pet Movement:</b> WASD Keys</div>
                <div><b>Pet Attack:</b> Spacebar</div>
                <div><b>Portal/Teleport:</b> T Key (when near portal)</div>
                <div><b>Debug Menu:</b> F1 Key</div>
              </div>
              
              <h3 style={{ color: "#a259ff", marginBottom: "12px" }}>🎮 Controller Support</h3>
              <div style={{ marginBottom: "20px", paddingLeft: "16px" }}>
                <div><b>Character Movement:</b> Right Stick</div>
                <div><b>Pet Movement:</b> Left Stick</div>
                <div><b>Pet Attack:</b> Right Bumper (R1/RB)</div>
                <div><b>Portal/Teleport:</b> Left Bumper (L1/LB)</div>
                <div><b>Alternative Character Movement:</b> D-Pad</div>
              </div>
              
              <h3 style={{ color: "#a259ff", marginBottom: "12px" }}>🎯 Gameplay</h3>
              <div style={{ marginBottom: "20px", paddingLeft: "16px" }}>
                <div><b>Objective:</b> Explore different maps and defeat enemies</div>
                <div><b>Pet Companion:</b> Your pet follows you and can attack enemies</div>
                <div><b>Map Travel:</b> Use portals to travel between maps</div>
                <div><b>Boss Fight:</b> Face the boss in Map X (cave)</div>
                <div><b>Pet Levels:</b> Your pet grows stronger in different maps</div>
              </div>
              
              <h3 style={{ color: "#a259ff", marginBottom: "12px" }}>⚔️ Combat</h3>
              <div style={{ marginBottom: "20px", paddingLeft: "16px" }}>
                <div><b>Pet Attacks:</b> Ranged projectiles that damage enemies</div>
                <div><b>Boss Fight:</b> Pet projectiles deal 1 HP damage to boss</div>
                <div><b>Attack Cooldowns:</b> Pet attacks have different cooldowns per level</div>
                <div><b>Boss Phases:</b> Boss has flying and ground phases with different behaviors</div>
              </div>
            </div>
            
            <button
              className="main-menu-btn"
              style={{ marginTop: "24px" }}
              onClick={() => setShowHowToPlay(false)}
            >
              Back
            </button>
          </div>
        )}
        
        {/* Bottom corner buttons */}
        {/* Exit Game button - bottom left */}
        <button
          className="main-menu-btn"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "20px",
            padding: "12px 24px",
            fontSize: "1.2rem",
            zIndex: 10
          }}
          onClick={handleExitGame}
        >
          Exit Game
        </button>
        
        {/* Credits button - bottom right */}
        <button
          className="main-menu-btn"
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            padding: "12px 24px",
            fontSize: "1.2rem",
            zIndex: 10
          }}
          onClick={() => {
            setShowCredits(true);
            setShowOptions(false);
            setShowHowToPlay(false);
            setShowLoadGame(false);
          }}
        >
          Credits
        </button>
        
        {/* Save/Load Menu */}
        {showLoadGame && (
          <SaveLoadMenu
            mode="load"
            onClose={() => setShowLoadGame(false)}
            onLoadGame={handleLoadGame}
            isInGame={false}
          />
        )}
      </div>
    </div>
  );
}