import React from 'react';
import './LoadingSaveScreen.css';

const LoadingSaveScreen = ({ 
  isVisible = false, 
  progress = 0, 
  isComplete = false, 
  onContinue 
}) => {
  if (!isVisible) return null;

  return (
    <div className="loading-save-overlay">
      <div className="loading-save-container">
        <h2 className="loading-save-title">Loading Save</h2>
        
        <div className="loading-save-content">
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-text">{Math.round(progress)}%</div>
          </div>
          
          {!isComplete && (
            <div className="loading-text">
              <div className="loading-dots">
                <span className="dot">•</span>
                <span className="dot">•</span>
                <span className="dot">•</span>
              </div>
              <p>Please wait while your game is being loaded...</p>
            </div>
          )}
          
          {isComplete && (
            <div className="loading-complete">
              <div className="checkmark">✓</div>
              <p>Save loaded successfully!</p>
              <button 
                className="continue-button"
                onClick={onContinue}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadingSaveScreen;
