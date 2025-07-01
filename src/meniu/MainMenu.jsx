import React, { useState, useEffect } from "react";
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
// Removed unused import: useGameStore

const menuItems = ["Start", "Options", "Credits"];

export default function MainMenu({ onStart }) {
  const [selected, setSelected] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(5);
  const [sfxVolume, setSfxVolumeState] = useState(7);
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

  const handleMenuClick = (idx) => {
    setSelected(idx);
    playMenuSelect();
    if (menuItems[idx] === "Options") {
      setShowOptions(true);
      setShowCredits(false);
    } else if (menuItems[idx] === "Credits") {
      setShowCredits(true);
      setShowOptions(false);
    } else {
      setShowOptions(false);
      setShowCredits(false);
    }
  };

  const handleStart = () => {
    playMenuStart();
    setTimeout(() => {
      stopMenuMusic();
      onStart && onStart();
    }, 400);
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
      </div>
    </div>
  );
}