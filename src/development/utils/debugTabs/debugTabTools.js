import React from 'react';
import { debugLog } from '../Debug';

export function createToolsTab(teleportToMap, teleportToBoss, camera, character, mapManager) {
  return React.createElement('div', { key: 'tools' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Map Teleport Tools'),
    
    React.createElement('div', {
      key: 'mapButtons',
      style: { 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '8px',
        marginBottom: '16px'
      }
    }, [
      // Map Area 0
      React.createElement('button', {
        key: 'map0',
        onClick: () => teleportToMap('maparea0'),
        style: {
          padding: '10px 12px',
          background: 'rgba(255, 193, 7, 0.2)',
          border: '2px solid rgba(255, 193, 7, 0.5)',
          borderRadius: '10px',
          color: '#FFC107',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textShadow: '0 0 8px rgba(255, 193, 7, 0.3)'
        }
      }, '🏖️ Map 0\\n(Beach)'),
      
      // Map Area 1
      React.createElement('button', {
        key: 'map1',
        onClick: () => teleportToMap('maparea1'),
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
      }, '🌲 Map 1\\n(Forest)'),
      
      // Map Area 2
      React.createElement('button', {
        key: 'map2',
        onClick: () => teleportToMap('maparea2'),
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
      }, '🏔️ Map 2\\n(Swamp)'),
      
      // Map Area X
      React.createElement('button', {
        key: 'mapx',
        onClick: () => teleportToMap('mapareax'),
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
      }, '💀 Map X\\n(Boss)')
    ]),
    
    React.createElement('h4', {
      key: 'camera-title',
      style: { 
        color: '#00bcd4', 
        margin: '16px 0 8px 0',
        fontSize: '14px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #00bcd488'
      }
    }, 'Camera Controls'),
    
    React.createElement('div', {
      key: 'cameraButtons',
      style: { 
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '8px',
        marginBottom: '16px'
      }
    }, [
      React.createElement('button', {
        key: 'centerCamera',
        onClick: () => {
          if (camera && character && character.position) {
            // Use the camera's centerOn method for proper centering with safety checks
            if (camera.centerOn && camera.mapContainer) {
              camera.centerOn(character.position.x, character.position.y);
              debugLog(`Camera centered on character at (${character.position.x}, ${character.position.y})`, 'camera');
            } else {
              // Fallback to direct position setting
              if (camera.position) {
                camera.position.x = character.position.x;
                camera.position.y = character.position.y;
                debugLog('Camera centered on character (fallback method)', 'camera');
              } else {
                debugLog('Cannot center camera: camera methods not available', 'camera');
              }
            }
            
            // Ensure camera is following the character
            if (camera.follow) {
              camera.follow(character);
              debugLog('Camera follow re-enabled', 'camera');
            }
          } else {
            debugLog('Cannot center camera: camera or character not available', 'camera');
          }
        },
        style: {
          padding: '10px 12px',
          background: 'rgba(0, 188, 212, 0.2)',
          border: '2px solid rgba(0, 188, 212, 0.5)',
          borderRadius: '10px',
          color: '#00BCD4',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textShadow: '0 0 8px rgba(0, 188, 212, 0.3)'
        }
      }, '📷 Center Camera on Character'),
      
      React.createElement('button', {
        key: 'centerOnPortal',
        onClick: () => {
          if (mapManager?.portalManager?.portals?.length > 0) {
            const portal = mapManager.portalManager.portals[0];
            if (portal?.position && camera) {
              if (camera.centerOn && camera.mapContainer) {
                camera.centerOn(portal.position.x, portal.position.y);
                debugLog(`Camera centered on portal at (${portal.position.x}, ${portal.position.y})`, 'camera');
              } else {
                // Fallback
                camera.position.x = portal.position.x;
                camera.position.y = portal.position.y;
                debugLog('Camera centered on portal (fallback method)', 'camera');
              }
            } else {
              debugLog('Cannot center on portal: portal position or camera not available', 'camera');
            }
          } else {
            debugLog('No portals available to center on', 'camera');
          }
        },
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
      }, '🌀 Center Camera on Portal')
    ]),
    
    React.createElement('h4', {
      key: 'enemy-title',
      style: { 
        color: '#f44336', 
        margin: '16px 0 8px 0',
        fontSize: '14px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #f4433688'
      }
    }, 'Teleport to Enemy'),
    
    React.createElement('div', {
      key: 'enemyButtons',
      style: { 
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: '8px',
        marginBottom: '16px'
      }
    }, [
      React.createElement('button', {
        key: 'teleportToBoss',
        onClick: teleportToBoss,
        style: {
          padding: '12px 16px',
          background: 'rgba(244, 67, 54, 0.2)',
          border: '2px solid rgba(244, 67, 54, 0.5)',
          borderRadius: '12px',
          color: '#F44336',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textShadow: '0 0 8px rgba(244, 67, 54, 0.3)'
        }
      }, '💀 Teleport to Boss')
    ]),
    
    React.createElement('div', {
      key: 'note',
      style: { 
        fontSize: '11px', 
        color: '#a259ff', 
        opacity: 0.7,
        textAlign: 'center',
        fontStyle: 'italic'
      }
    }, 'Note: Map teleport may reset character position')
  ]);
}
