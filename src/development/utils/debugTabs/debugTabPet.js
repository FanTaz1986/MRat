import React from 'react';

export function createPetTab(debugConfig, toggleLogging, forceUpdate) {
  return React.createElement('div', { key: 'pet' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Pet Debug Controls'),
    
    React.createElement('div', {
      key: 'petDebugging',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'debugTitle',
        style: { 
          color: '#00bcd4', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #00bcd488'
        }
      }, 'Pet Debugging'),
      
      React.createElement('div', {
        key: 'debugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(162, 89, 255, 0.3)',
          marginBottom: '12px'
        }
      }, [
        React.createElement('input', {
          key: 'petDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.logCategories.pet,
          onChange: () => toggleLogging('pet'),
          style: {
            marginRight: '12px',
            accentColor: '#a259ff',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'petDebugLabel',
          style: { 
            color: debugConfig.logCategories.pet ? '#4CAF50' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => toggleLogging('pet')
        }, debugConfig.logCategories.pet ? '🐾 Pet Debugging: ON' : '🐾 Pet Debugging: OFF')
      ]),
      
      React.createElement('div', {
        key: 'debugInfo',
        style: { 
          fontSize: '12px', 
          color: '#a259ff', 
          opacity: 0.8,
          lineHeight: '1.4',
          background: 'rgba(162, 89, 255, 0.1)',
          padding: '8px',
          borderRadius: '6px'
        }
      }, [
        React.createElement('div', { key: 'info1' }, '• When enabled, shows detailed pet movement and camera bounds logging'),
        React.createElement('div', { key: 'info2' }, '• Displays pet position restrictions and boundary calculations'),
        React.createElement('div', { key: 'info3' }, '• Logs pet camera viewport bounds and movement limits'),
        React.createElement('div', { key: 'info4' }, '• Use to debug pet movement issues and camera boundaries')
      ])
    ]),
    
    React.createElement('div', {
      key: 'petAutoFollowDebugging',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'autoFollowDebugTitle',
        style: { 
          color: '#ff6b35', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff6b3588'
        }
      }, 'Pet Auto-Follow Debugging'),
      
      React.createElement('div', {
        key: 'autoFollowDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 107, 53, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 107, 53, 0.3)',
          marginBottom: '12px'
        }
      }, [
        React.createElement('input', {
          key: 'petAutoFollowDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.logCategories.petAutoFollow,
          onChange: () => toggleLogging('petAutoFollow'),
          style: {
            marginRight: '12px',
            accentColor: '#ff6b35',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'petAutoFollowDebugLabel',
          style: { 
            color: debugConfig.logCategories.petAutoFollow ? '#4CAF50' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => toggleLogging('petAutoFollow')
        }, debugConfig.logCategories.petAutoFollow ? '🏃 Pet Auto-Follow Debug: ON' : '🏃 Pet Auto-Follow Debug: OFF')
      ]),
      
      React.createElement('div', {
        key: 'autoFollowDebugInfo',
        style: { 
          fontSize: '12px', 
          color: '#ff6b35', 
          opacity: 0.8,
          lineHeight: '1.4',
          background: 'rgba(255, 107, 53, 0.1)',
          padding: '8px',
          borderRadius: '6px'
        }
      }, [
        React.createElement('div', { key: 'autoFollowInfo1' }, '• Shows detailed auto-follow trigger conditions and state changes'),
        React.createElement('div', { key: 'autoFollowInfo2' }, '• Displays character movement detection and distance calculations'),
        React.createElement('div', { key: 'autoFollowInfo3' }, '• Logs auto-follow speed, direction, and stop conditions'),
        React.createElement('div', { key: 'autoFollowInfo4' }, '• Use to debug why pet gets stuck at max range during movement')
      ])
    ]),
    
    React.createElement('div', {
      key: 'petInfo',
      style: { 
        fontSize: '12px', 
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(162, 89, 255, 0.3)'
      }
    }, [
      React.createElement('div', {
        key: 'petInfoTitle',
        style: { marginBottom: '8px' }
      }, React.createElement('strong', { style: { color: '#a259ff' } }, 'Pet Information:')),
      
      React.createElement('div', {
        key: 'petControls',
        style: { fontSize: '11px', marginBottom: '8px', color: '#FFC107' }
      }, '🎮 Pet Controls: WASD to move, Spacebar to attack'),
      
      React.createElement('div', {
        key: 'petFeatures',
        style: { fontSize: '10px', color: '#888', lineHeight: '1.3' }
      }, [
        React.createElement('div', { key: 'feature1' }, '• Pet grows larger and has more range on higher level maps'),
        React.createElement('div', { key: 'feature2' }, '• Pet automatically follows character when out of range'),
        React.createElement('div', { key: 'feature3' }, '• Pet is restricted to stay within camera viewport (5% margin)'),
        React.createElement('div', { key: 'feature4' }, '• Pet cannot move beyond max distance from main character')
      ])
    ])
  ]);
}
