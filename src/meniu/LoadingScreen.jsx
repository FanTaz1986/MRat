import React from "react";
import "./LoadingScreen.css";

export default function LoadingScreen({ progress = 0, message = "Loading..." }) {
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
