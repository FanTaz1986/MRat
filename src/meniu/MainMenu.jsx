import React, { useState, useEffect } from "react";
import "./MainMenu.css";
import {
  playMenuMusic,
  stopMenuMusic,
  playMenuSelect,
  playMenuStart,
  setMusicVolume,
  setSfxVolume,
} from "../AudioManager";

const loginBg = process.env.PUBLIC_URL + "/meniu/loginscreen.png";
const menuItems = ["Start", "Options", "Credits"];

export default function MainMenu({ onStart }) {
  const [selected, setSelected] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState(5);
  const [sfxVolume, setSfxVolumeState] = useState(7);

  useEffect(() => {
    playMenuMusic();
    setMusicVolume(musicVolume / 10);
    setSfxVolume(sfxVolume / 10);
    return () => {
      stopMenuMusic();
    };
    // eslint-disable-next-line
  }, []);

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
    <div
      className="main-menu-bg"
      style={{
        backgroundImage: `url(${loginBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        minHeight: "100vh",
        minWidth: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 100,
      }}
    >
      <div className="main-menu-overlay">
        <h1 className="main-menu-title">M RAT</h1>
        <ul className="main-menu-list">
          {menuItems.map((item, idx) => (
            <li key={item}>
              <button
                className={`main-menu-btn${selected === idx ? " selected" : ""}`}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "2px solid rgba(128,0,255,0.3)",
                  color: "#a259ff",
                  fontWeight: "bold",
                  fontSize: "2rem",
                  letterSpacing: "2px",
                  margin: "18px 0",
                  padding: "18px 60px",
                  borderRadius: "18px",
                  cursor: "pointer",
                  transition: "background 0.2s, color 0.2s",
                  opacity: selected === idx ? 1 : 0.7,
                  boxShadow: selected === idx ? "0 0 16px #a259ff88" : "none",
                }}
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
              {/* Add more names/roles as needed */}
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
