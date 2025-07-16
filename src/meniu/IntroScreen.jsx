import React, { useEffect, useRef, useState } from "react";
import { createDebugOverlay } from "../development/utils/Debug";

const skyImg = process.env.PUBLIC_URL + "/Intro/sky.png";

export default function IntroScreen({ onBack, onBeginCackle, onDebugNavigateToScreen }) {
  const debugSystemRef = useRef(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Initialize debug overlay for IntroScreen
  useEffect(() => {
    try {
      if (!debugSystemRef.current) {
        debugSystemRef.current = createDebugOverlay(null, 'IntroScreen');
      }
      // Set the screen navigation callback
      if (debugSystemRef.current && debugSystemRef.current.setScreenNavigationCallback && onDebugNavigateToScreen) {
        debugSystemRef.current.setScreenNavigationCallback(onDebugNavigateToScreen);
      }
    } catch (error) {
      console.warn('Failed to initialize debug overlay for IntroScreen:', error);
    }

    return () => {
      if (debugSystemRef.current && debugSystemRef.current.destroy) {
        debugSystemRef.current.destroy();
      }
    };
  }, [onDebugNavigateToScreen]);

  // Start flashing the Begin button after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsFlashing(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);
  return (
    <div
      style={{
        background: `url(${skyImg}) center/cover no-repeat`,
        minHeight: "100vh",
        minWidth: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
      }}
    >
      {/* Add keyframe animation styles */}
      <style>
        {`
          @keyframes flash {
            0% {
              box-shadow: 0 0 5px #a259ff, 0 0 10px #a259ff, 0 0 15px #a259ff;
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 10px #a259ff, 0 0 20px #a259ff, 0 0 30px #a259ff, 0 0 40px #a259ff;
              transform: scale(1.05);
            }
            100% {
              box-shadow: 0 0 5px #a259ff, 0 0 10px #a259ff, 0 0 15px #a259ff;
              transform: scale(1);
            }
          }
          
          .flash-button {
            animation: flash 1.5s ease-in-out infinite;
          }
        `}
      </style>
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
        <h2 style={{ color: "#a259ff", marginBottom: 16 }}>The Story Begins...</h2>
        <p>
          Erif had a beloved pet rat named Snape, whom she loved very much. One day, she went for a walk with her rat and fell into a strange pit, at the bottom of which was a portal to a world that was not quite like ours. She heard an evil laugh and realized she had fallen into the trap of some kind of monster. But she was a strong and independent girl who was not afraid—instead, she decided to defeat this villain and return home.<br /><br />
          Your journey starts now. Will you rise to the challenge?
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
          style={{ minWidth: 120, fontSize: "1.2rem" }}
          onClick={onBack}
        >
          Back
        </button>
        <button
          className={`main-menu-btn ${isFlashing ? 'flash-button' : ''}`}
          style={{ 
            minWidth: 120, 
            fontSize: "1.2rem",
            transition: "all 0.3s ease"
          }}
          onClick={onBeginCackle}
        >
          Begin
        </button>
      </div>
    </div>
  );
}