import React from 'react';

export function createMapTab(teleportToPortal, teleportToSpawn) {
  return React.createElement('div', { key: 'map' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Map & Portal Controls'),
    
    React.createElement('div', {
      key: 'buttons',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('button', {
        key: 'portal',
        onClick: teleportToPortal,
        style: {
          width: '100%',
          padding: '12px 16px',
          marginBottom: '12px',
          background: 'rgba(76, 175, 80, 0.2)',
          border: '2px solid rgba(76, 175, 80, 0.5)',
          borderRadius: '12px',
          color: '#4CAF50',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textShadow: '0 0 8px rgba(76, 175, 80, 0.3)'
        }
      }, '🌀 Move to Portal'),
      
      React.createElement('button', {
        key: 'spawn',
        onClick: teleportToSpawn,
        style: {
          width: '100%',
          padding: '12px 16px',
          background: 'rgba(33, 150, 243, 0.2)',
          border: '2px solid rgba(33, 150, 243, 0.5)',
          borderRadius: '12px',
          color: '#2196F3',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textShadow: '0 0 8px rgba(33, 150, 243, 0.3)'
        }
      }, '🏠 Teleport to Starting Position')
    ])
  ]);
}
