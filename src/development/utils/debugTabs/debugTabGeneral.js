import React from 'react';

export function createGeneralTab(mapManager, character, camera) {
  return React.createElement('div', { key: 'general' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Game Info'),
    React.createElement('div', {
      key: 'info',
      style: { fontSize: '12px', lineHeight: '1.4' }
    }, [
      React.createElement('div', { key: 'map' }, [
        React.createElement('strong', { key: 'map-label' }, 'Current Map: '),
        React.createElement('span', { key: 'map-value' }, mapManager?.currentMap || 'Unknown')
      ]),
      character && React.createElement('div', { key: 'char' }, [
        React.createElement('div', { key: 'char-label' }, React.createElement('strong', {}, 'Character Position:')),
        React.createElement('div', {
          key: 'char-pos',
          style: { marginLeft: '12px' }
        }, [
          React.createElement('span', { key: 'char-x' }, `X: ${character.position?.x?.toFixed(1) || 'N/A'}`),
          React.createElement('br', { key: 'char-br' }),
          React.createElement('span', { key: 'char-y' }, `Y: ${character.position?.y?.toFixed(1) || 'N/A'}`)
        ])
      ]),
      camera && React.createElement('div', { key: 'cam' }, [
        React.createElement('div', { key: 'cam-label' }, React.createElement('strong', {}, 'Camera Position:')),
        React.createElement('div', {
          key: 'cam-pos',
          style: { marginLeft: '12px' }
        }, [
          React.createElement('span', { key: 'cam-x' }, `X: ${camera.position?.x?.toFixed(1) || 'N/A'}`),
          React.createElement('br', { key: 'cam-br' }),
          React.createElement('span', { key: 'cam-y' }, `Y: ${camera.position?.y?.toFixed(1) || 'N/A'}`)
        ])
      ]),
      // Portal information in General tab
      React.createElement('div', { key: 'portals' }, [
        React.createElement('div', {
          key: 'portal-info-header',
          style: { marginTop: '12px' }
        }, React.createElement('strong', {}, 'Portal Info:')),
        React.createElement('div', {
          key: 'portal-info-content',
          style: { marginLeft: '12px', fontSize: '11px' }
        }, 
          mapManager?.portalManager?.portals?.length > 0 ? 
            mapManager.portalManager.portals.map((portal, index) =>
              React.createElement('div', {
                key: index,
                style: { marginBottom: '4px' }
              }, [
                React.createElement('span', { key: `portal-pos-${index}` }, `Portal ${index + 1}: (${portal.position?.x?.toFixed(1) || 'N/A'}, ${portal.position?.y?.toFixed(1) || 'N/A'})`),
                React.createElement('br', { key: `br-${index}` }),
                React.createElement('span', { key: `portal-target-${index}` }, `→ ${portal.targetMap || 'Unknown'}`)
              ])
            ) :
            React.createElement('div', {
              key: 'none'
            }, 'No portals found')
        )
      ]),
      
      // Keyboard shortcuts section
      React.createElement('div', { key: 'shortcuts' }, [
        React.createElement('div', {
          key: 'shortcuts-header',
          style: { marginTop: '12px' }
        }, React.createElement('strong', {}, 'Keyboard Shortcuts:')),
        React.createElement('div', {
          key: 'shortcuts-content',
          style: { 
            marginLeft: '12px', 
            fontSize: '11px',
            background: 'rgba(162, 89, 255, 0.1)',
            padding: '8px',
            borderRadius: '6px',
            marginTop: '4px'
          }
        }, [
          React.createElement('div', { key: 'shortcut-o' }, '🔧 [O] - Open/Close Debug Overlay'),
          React.createElement('div', { key: 'shortcut-p' }, '👁️ [P] - Show/Hide Debug Button'),
          React.createElement('div', { key: 'shortcut-note', style: { fontSize: '10px', opacity: 0.8, marginTop: '4px' } }, 'Note: Shortcuts work on all screens')
        ])
      ])
    ])
  ]);
}
