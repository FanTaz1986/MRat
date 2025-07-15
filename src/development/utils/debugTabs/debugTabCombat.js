import React from 'react';

export function createCombatTab(debugConfig, toggleLogging, forceUpdate, onHealthChange, debugLog) {
  return React.createElement('div', { key: 'combat' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Combat Debug Controls'),
    
    React.createElement('div', {
      key: 'healthControls',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'healthTitle',
        style: { 
          color: '#ff4444', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff444488'
        }
      }, '❤️ Player Health Management'),
      
      React.createElement('div', {
        key: 'healthButtonGroup',
        style: { 
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(162, 89, 255, 0.3)',
          marginBottom: '12px'
        }
      }, [
        React.createElement('button', {
          key: 'removeHeart',
          onClick: () => {
            if (onHealthChange) {
              onHealthChange(-1); // Remove 1 heart
            }
          },
          style: {
            padding: '8px 16px',
            background: 'rgba(255, 68, 68, 0.2)',
            border: '2px solid #ff4444',
            borderRadius: '8px',
            color: '#ff4444',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '12px'
          }
        }, '💔 Remove Heart'),
        
        React.createElement('button', {
          key: 'addHeart',
          onClick: () => {
            if (onHealthChange) {
              onHealthChange(1); // Add 1 heart
            }
          },
          style: {
            padding: '8px 16px',
            background: 'rgba(76, 175, 80, 0.2)',
            border: '2px solid #4CAF50',
            borderRadius: '8px',
            color: '#4CAF50',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontSize: '12px'
          }
        }, '💚 Add Heart')
      ]),
      
      React.createElement('div', {
        key: 'healthInfo',
        style: { 
          fontSize: '12px', 
          color: '#a259ff', 
          opacity: 0.8,
          fontStyle: 'italic',
          textAlign: 'center'
        }
      }, 'Health range: 0-5 hearts. Going below 0 or above 5 will have no effect.')
    ]),

    React.createElement('div', {
      key: 'invulnerabilityControls',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'invulnTitle',
        style: { 
          color: '#44ff44', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #44ff4488'
        }
      }, '🛡️ Invulnerability'),
      
      React.createElement('div', {
        key: 'invulnToggleGroup',
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
          key: 'invulnToggle',
          type: 'checkbox',
          checked: debugConfig.invulnerability,
          onChange: (e) => {
            debugConfig.invulnerability = e.target.checked;
            debugLog(`Invulnerability ${e.target.checked ? 'enabled' : 'disabled'}`, 'debug');
            // Force UI update
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#44ff44',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'invulnLabel',
          style: { 
            color: '#44ff44',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.invulnerability = !debugConfig.invulnerability;
            debugLog(`Invulnerability ${debugConfig.invulnerability ? 'enabled' : 'disabled'}`, 'debug');
            forceUpdate();
          }
        }, debugConfig.invulnerability ? 'Invulnerability ON' : 'Invulnerability OFF')
      ]),
      
      React.createElement('div', {
        key: 'invulnInfo',
        style: { 
          fontSize: '12px', 
          color: '#44ff44', 
          opacity: 0.8,
          fontStyle: 'italic',
          textAlign: 'center'
        }
      }, 'When enabled, player cannot die and health will not go below 1.')
    ])
  ]);
}
