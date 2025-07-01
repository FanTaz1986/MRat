import React, { useEffect } from "react";
import { playOutroMusic, stopOutroMusic } from "../utils/AudioManager";

const gameOverImg = process.env.PUBLIC_URL + "/Intro/sky.png";

export default function GameOverScreen({ onMainMenu, onRestartLevel }) {
  useEffect(() => {
    playOutroMusic(); // Using outro music for dramatic effect
    return () => {
      stopOutroMusic();
    };
  }, []);

  return (
    <div
      style={{
        background: `url(${gameOverImg}) center/cover no-repeat`,
        minHeight: "100vh",
        minWidth: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      <div
        style={{
          margin: "auto",
          background: "rgba(30,0,60,0.85)",
          border: "2px solid #ff4444",
          borderRadius: 18,
          padding: "32px 48px",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1.5rem",
          maxWidth: 700,
          textAlign: "center",
          boxShadow: "0 0 32px #ff444455",
          textShadow: "0 0 24px #ff444488, 0 0 2px #fff",
          letterSpacing: "1px",
        }}
      >
        <h2 style={{ color: "#ff4444", marginBottom: 16, fontSize: "2rem" }}>Game Over</h2>
        <p style={{ lineHeight: "1.6", marginBottom: "16px" }}>
          After the girl dies, the boss ate the pet...<br />
          <br />
          Are you sure this is how the story ends?
        </p>
      </div>
      <div style={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        padding: "32px 64px",
        boxSizing: "border-box"
      }}>
        <button
          className="main-menu-btn"
          style={{ 
            minWidth: 160, 
            fontSize: "1.2rem", 
            alignSelf: "flex-start",
            background: "rgba(156, 39, 176, 0.2)",
            border: "2px solid rgba(156, 39, 176, 0.5)",
            color: "#9C27B0",
            padding: "12px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "all 0.3s ease",
            textShadow: "0 0 8px rgba(156, 39, 176, 0.3)"
          }}
          onClick={onMainMenu}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(156, 39, 176, 0.3)";
            e.target.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(156, 39, 176, 0.2)";
            e.target.style.transform = "scale(1)";
          }}
        >
          Return to Main Menu
        </button>
        <button
          className="main-menu-btn"
          style={{ 
            minWidth: 160, 
            fontSize: "1.2rem", 
            alignSelf: "flex-end",
            background: "rgba(255, 193, 7, 0.2)",
            border: "2px solid rgba(255, 193, 7, 0.5)",
            color: "#FFC107",
            padding: "12px 24px",
            borderRadius: "12px",
            cursor: "pointer",
            fontWeight: "bold",
            transition: "all 0.3s ease",
            textShadow: "0 0 8px rgba(255, 193, 7, 0.3)"
          }}
          onClick={onRestartLevel}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255, 193, 7, 0.3)";
            e.target.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255, 193, 7, 0.2)";
            e.target.style.transform = "scale(1)";
          }}
        >
          Restart Level
        </button>
      </div>
    </div>
  );
}
