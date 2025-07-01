import React, { useEffect, useRef } from "react";
import "./LoadingScreen.css";
import { createDebugOverlay } from "../development/utils/Debug";

export default function LoadingScreen({ progress = 0, message = "Loading...", onDebugNavigateToScreen }) {
  const debugSystemRef = useRef(null);

  // Initialize debug overlay for LoadingScreen (debounced)
  useEffect(() => {
    // Add small delay to prevent rapid initialization during React StrictMode
    const timer = setTimeout(() => {
      try {
        if (!debugSystemRef.current) {
          debugSystemRef.current = createDebugOverlay(null, 'LoadingScreen');
        }
        // Set the screen navigation callback
        if (debugSystemRef.current && debugSystemRef.current.setScreenNavigationCallback && onDebugNavigateToScreen) {
          debugSystemRef.current.setScreenNavigationCallback(onDebugNavigateToScreen);
        }
      } catch (error) {
        console.warn('Failed to initialize debug overlay for LoadingScreen:', error);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (debugSystemRef.current && debugSystemRef.current.destroy) {
        debugSystemRef.current.destroy();
      }
    };
  }, [onDebugNavigateToScreen]);
  return (
    <div className="loading-screen">
      <div className="loading-container">
        <h1 className="loading-title">Loading Game</h1>
        <div className="loading-bar-container">
          <div 
            className="loading-bar" 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="loading-percentage">{Math.floor(progress)}%</div>
        <div className="loading-message">{message}</div>
      </div>
    </div>
  );
}
