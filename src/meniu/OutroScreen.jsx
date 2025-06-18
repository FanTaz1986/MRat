import React, { useEffect } from "react";
import { playOutroMusic, stopOutroMusic } from "../AudioManager";

const outroImg = process.env.PUBLIC_URL + "/Outro/debeseliai.png";

export default function OutroScreen({ onMainMenu, onEnd }) {
  useEffect(() => {
    playOutroMusic();
    return () => {
      stopOutroMusic();
    };
  }, []);

  return (
    <div
      style={{
        background: `url(${outroImg}) center/cover no-repeat`,
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
          border: "2px solid #a259ff",
          borderRadius: 18,
          padding: "32px 48px",
          color: "#fff",
          fontWeight: "bold",
          fontSize: "1.5rem",
          maxWidth: 700,
          textAlign: "center",
          boxShadow: "0 0 32px #a259ff55",
          textShadow: "0 0 24px #a259ff88, 0 0 2px #fff",
          letterSpacing: "1px",
        }}
      >
        <h2 style={{ color: "#a259ff", marginBottom: 16 }}>The End?</h2>
        <p>
          After defeating the super villain, she felt herself being pulled back to her own world.<br />
          She was overjoyed, but now... what should she do with her super rat?
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
          style={{ minWidth: 120, fontSize: "1.2rem", alignSelf: "flex-start" }}
          onClick={onMainMenu}
        >
          Main Menu
        </button>
        <button
          className="main-menu-btn"
          style={{ minWidth: 120, fontSize: "1.2rem", alignSelf: "flex-end" }}
          onClick={onEnd}
        >
          End
        </button>
      </div>
    </div>
  );
}