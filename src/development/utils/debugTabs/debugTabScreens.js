import React from 'react';

export function createScreensTab(onNavigateToScreen) {
  return React.createElement('div', { key: 'screens' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Screen Navigation'),
    
    React.createElement('div', {
      key: 'screenInfo',
      style: { 
        fontSize: '12px', 
        color: '#a259ff', 
        opacity: 0.8,
        marginBottom: '16px',
        padding: '8px',
        background: 'rgba(162, 89, 255, 0.1)',
        borderRadius: '6px'
      }
    }, 'Click any screen below to navigate directly to it for testing purposes.'),
    
    React.createElement('div', {
      key: 'menuScreens',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'menuTitle',
        style: { 
          color: '#00bcd4', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #00bcd488'
        }
      }, 'Menu Screens'),
      
      React.createElement('div', {
        key: 'menuButtons',
        style: { 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }
      }, [
        React.createElement('button', {
          key: 'mainMenu',
          onClick: () => onNavigateToScreen && onNavigateToScreen('main-menu'),
          style: {
            padding: '10px 12px',
            background: 'rgba(33, 150, 243, 0.2)',
            border: '2px solid rgba(33, 150, 243, 0.5)',
            borderRadius: '10px',
            color: '#2196F3',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textShadow: '0 0 8px rgba(33, 150, 243, 0.3)'
          }
        }, '🏠 Main Menu'),
        
        React.createElement('button', {
          key: 'introScreen',
          onClick: () => onNavigateToScreen && onNavigateToScreen('intro'),
          style: {
            padding: '10px 12px',
            background: 'rgba(76, 175, 80, 0.2)',
            border: '2px solid rgba(76, 175, 80, 0.5)',
            borderRadius: '10px',
            color: '#4CAF50',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
          }
        }, '🌟 Intro Screen'),
        
        React.createElement('button', {
          key: 'loadingScreen',
          onClick: () => onNavigateToScreen && onNavigateToScreen('loading'),
          style: {
            padding: '10px 12px',
            background: 'rgba(255, 152, 0, 0.2)',
            border: '2px solid rgba(255, 152, 0, 0.5)',
            borderRadius: '10px',
            color: '#FF9800',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textShadow: '0 0 8px rgba(255, 152, 0, 0.3)'
          }
        }, '⏳ Loading Screen'),
        
        React.createElement('button', {
          key: 'outroScreen',
          onClick: () => onNavigateToScreen && onNavigateToScreen('outro'),
          style: {
            padding: '10px 12px',
            background: 'rgba(156, 39, 176, 0.2)',
            border: '2px solid rgba(156, 39, 176, 0.5)',
            borderRadius: '10px',
            color: '#9C27B0',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textShadow: '0 0 8px rgba(156, 39, 176, 0.3)'
          }
        }, '🎬 Outro Screen')
      ])
    ]),
    
    React.createElement('div', {
      key: 'gameScreens',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'gameTitle',
        style: { 
          color: '#ff6b6b', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff6b6b88'
        }
      }, 'Game Screens'),
      
      React.createElement('div', {
        key: 'gameButtons',
        style: { 
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '8px'
        }
      }, [
        React.createElement('button', {
          key: 'gameScreen',
          onClick: () => onNavigateToScreen && onNavigateToScreen('game'),
          style: {
            padding: '10px 12px',
            background: 'rgba(76, 175, 80, 0.2)',
            border: '2px solid rgba(76, 175, 80, 0.5)',
            borderRadius: '10px',
            color: '#4CAF50',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
          }
        }, '🎮 Game Screen'),
        
        React.createElement('button', {
          key: 'gameOverScreen',
          onClick: () => onNavigateToScreen && onNavigateToScreen('game-over'),
          style: {
            padding: '10px 12px',
            background: 'rgba(244, 67, 54, 0.2)',
            border: '2px solid rgba(244, 67, 54, 0.5)',
            borderRadius: '10px',
            color: '#F44336',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textShadow: '0 0 8px rgba(244, 67, 54, 0.3)'
          }
        }, '💀 Game Over Screen')
      ])
    ]),
    
    React.createElement('div', {
      key: 'screenNote',
      style: { 
        fontSize: '11px', 
        color: '#a259ff', 
        opacity: 0.7,
        textAlign: 'center',
        fontStyle: 'italic',
        marginTop: '16px',
        padding: '8px',
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '6px'
      }
    }, 'Note: Screen navigation will exit the current game state. Use for testing UI screens.')
  ]);
}
