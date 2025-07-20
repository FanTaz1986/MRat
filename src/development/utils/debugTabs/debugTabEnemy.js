import React from 'react';

export function createEnemyTab(debugConfig, toggleLogging, forceUpdate, debugLog) {
  // Get enemy manager from global scope if available
  const enemyManager = window.globalEnemyManager;

  return React.createElement('div', { key: 'enemy' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#ff6b6b', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #ff6b6b88'
      }
    }, '👹 Enemy Debug Controls'),
    
    // Enemy Debug Logging
    React.createElement('div', {
      key: 'enemyLogging',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'loggingTitle',
        style: { 
          color: '#ffa726', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ffa72688'
        }
      }, '📋 Debug Logging'),
      
      React.createElement('div', {
        key: 'loggingToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 107, 107, 0.3)',
          marginBottom: '12px'
        }
      }, [
        React.createElement('input', {
          key: 'enemyLoggingCheckbox',
          type: 'checkbox',
          checked: debugConfig.logCategories.enemies,
          onChange: () => {
            toggleLogging('enemies');
            if (enemyManager) {
              enemyManager.setDebugEnabled(debugConfig.logCategories.enemies);
            }
          },
          style: {
            marginRight: '12px',
            accentColor: '#ff6b6b',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'enemyLoggingLabel',
          style: { 
            color: debugConfig.logCategories.enemies ? '#ff6b6b' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            toggleLogging('enemies');
            if (enemyManager) {
              enemyManager.setDebugEnabled(debugConfig.logCategories.enemies);
            }
          }
        }, debugConfig.logCategories.enemies ? '📋 Enemy Debug: ON' : '📋 Enemy Debug: OFF')
      ]),
      
      // Attack Debug Toggle
      React.createElement('div', {
        key: 'attackDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 69, 0, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'attackDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.attackDebug || false,
          onChange: () => {
            debugConfig.attackDebug = !debugConfig.attackDebug;
            if (enemyManager) {
              enemyManager.setAttackDebugEnabled(debugConfig.attackDebug);
            }
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#ff4500',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'attackDebugLabel',
          style: { 
            color: debugConfig.attackDebug ? '#ff4500' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.attackDebug = !debugConfig.attackDebug;
            if (enemyManager) {
              enemyManager.setAttackDebugEnabled(debugConfig.attackDebug);
            }
            forceUpdate();
          }
        }, debugConfig.attackDebug ? '⚔️ Attack Debug: ON' : '⚔️ Attack Debug: OFF')
      ]),
      
      // Hit Registration Debug Toggle
      React.createElement('div', {
        key: 'hitRegDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(156, 39, 176, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'hitRegDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.hitRegDebug || false,
          onChange: () => {
            debugConfig.hitRegDebug = !debugConfig.hitRegDebug;
            if (enemyManager) {
              enemyManager.setHitRegDebugEnabled(debugConfig.hitRegDebug);
            }
            // Also enable for pet projectiles
            if (window.globalPet) {
              window.globalPet.setHitRegDebugEnabled(debugConfig.hitRegDebug);
            }
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#9c27b0',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'hitRegDebugLabel',
          style: { 
            color: debugConfig.hitRegDebug ? '#9c27b0' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.hitRegDebug = !debugConfig.hitRegDebug;
            console.log(`[DEBUG] Hit Reg Debug toggled to: ${debugConfig.hitRegDebug}`);
            
            if (enemyManager) {
              console.log(`[DEBUG] Calling enemyManager.setHitRegDebugEnabled(${debugConfig.hitRegDebug})`);
              enemyManager.setHitRegDebugEnabled(debugConfig.hitRegDebug);
            } else {
              console.warn('[DEBUG] Enemy manager not available for hit reg debug');
            }
            
            if (window.globalPet) {
              console.log(`[DEBUG] Calling window.globalPet.setHitRegDebugEnabled(${debugConfig.hitRegDebug})`);
              window.globalPet.setHitRegDebugEnabled(debugConfig.hitRegDebug);
            } else {
              console.warn('[DEBUG] Global pet not available for hit reg debug');
            }
            
            forceUpdate();
          }
        }, debugConfig.hitRegDebug ? '🎯 Hit Reg Debug: ON' : '🎯 Hit Reg Debug: OFF'),
        
        // Debug info about pet availability
        React.createElement('div', {
          key: 'petInfo',
          style: {
            fontSize: '12px',
            color: '#888',
            marginTop: '4px',
            fontStyle: 'italic'
          }
        }, `Pet available: ${window.globalPet ? 'YES' : 'NO'} | Enemy Manager: ${enemyManager ? 'YES' : 'NO'}`)
      ]),
      
      // Coordinate Space Debug Toggle
      React.createElement('div', {
        key: 'coordinateDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'coordinateDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.coordinateDebug || false,
          onChange: () => {
            debugConfig.coordinateDebug = !debugConfig.coordinateDebug;
            console.log(`[DEBUG] Coordinate Debug toggled to: ${debugConfig.coordinateDebug}`);
            
            if (enemyManager) {
              console.log(`[DEBUG] Enabling coordinate analysis in EnemyManager`);
              // We'll add a coordinate debug method to enemy manager
              if (enemyManager.setCoordinateDebugEnabled) {
                enemyManager.setCoordinateDebugEnabled(debugConfig.coordinateDebug);
              }
            }
            
            if (window.globalPet) {
              console.log(`[DEBUG] Enabling coordinate analysis in Pet`);
              // We'll add a coordinate debug method to pet
              if (window.globalPet.setCoordinateDebugEnabled) {
                window.globalPet.setCoordinateDebugEnabled(debugConfig.coordinateDebug);
              }
            }
            
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#2196f3',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'coordinateDebugLabel',
          style: { 
            color: debugConfig.coordinateDebug ? '#2196f3' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.coordinateDebug = !debugConfig.coordinateDebug;
            console.log(`[DEBUG] Coordinate Debug toggled to: ${debugConfig.coordinateDebug}`);
            
            if (enemyManager) {
              if (enemyManager.setCoordinateDebugEnabled) {
                enemyManager.setCoordinateDebugEnabled(debugConfig.coordinateDebug);
              }
            }
            
            if (window.globalPet) {
              if (window.globalPet.setCoordinateDebugEnabled) {
                window.globalPet.setCoordinateDebugEnabled(debugConfig.coordinateDebug);
              }
            }
            
            forceUpdate();
          }
        }, debugConfig.coordinateDebug ? '📐 Coordinate Debug: ON' : '📐 Coordinate Debug: OFF'),
        
        React.createElement('div', {
          key: 'coordinateDebugInfo',
          style: {
            fontSize: '11px',
            color: '#2196f3',
            marginTop: '4px',
            fontStyle: 'italic'
          }
        }, 'Logs detailed coordinate space analysis for projectile vs enemy collision')
      ]),
      
      // Map Enemy Debug Toggle
      React.createElement('div', {
        key: 'mapEnemyDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 193, 7, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'mapEnemyDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.mapEnemyDebug || false,
          onChange: () => {
            debugConfig.mapEnemyDebug = !debugConfig.mapEnemyDebug;
            
            if (enemyManager) {
              enemyManager.setMapEnemyDebugEnabled(debugConfig.mapEnemyDebug);
              debugLog(`Map Enemy Debug ${debugConfig.mapEnemyDebug ? 'enabled' : 'disabled'} - analyzes Map1 vs spawned enemies every 3 seconds`, 'enemies');
            } else {
              debugLog('Enemy Manager not available for Map Enemy Debug', 'enemies');
            }
            
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#ffc107',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'mapEnemyDebugLabel',
          style: { 
            color: debugConfig.mapEnemyDebug ? '#ffc107' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.mapEnemyDebug = !debugConfig.mapEnemyDebug;
            
            if (enemyManager) {
              enemyManager.setMapEnemyDebugEnabled(debugConfig.mapEnemyDebug);
              debugLog(`Map Enemy Debug ${debugConfig.mapEnemyDebug ? 'enabled' : 'disabled'} - analyzes Map1 vs spawned enemies every 3 seconds`, 'enemies');
            } else {
              debugLog('Enemy Manager not available for Map Enemy Debug', 'enemies');
            }
            
            forceUpdate();
          }
        }, debugConfig.mapEnemyDebug ? '�️ Map Enemy Debug: ON' : '�️ Map Enemy Debug: OFF'),
        
        // Debug info about analysis frequency and purpose
        React.createElement('div', {
          key: 'mapEnemyInfo',
          style: {
            fontSize: '12px',
            color: '#888',
            marginTop: '4px',
            fontStyle: 'italic'
          }
        }, 'Analyzes Map1 enemy spawn data vs actual spawned enemies - finds missing or misplaced slimes')
      ]),
      
      // Spawn Debug Toggle
      React.createElement('div', {
        key: 'spawnDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'spawnDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.spawnDebug || false,
          onChange: () => {
            debugConfig.spawnDebug = !debugConfig.spawnDebug;
            
            if (enemyManager) {
              enemyManager.setSpawnDebugEnabled(debugConfig.spawnDebug);
              debugLog(`Spawn debug ${debugConfig.spawnDebug ? 'enabled' : 'disabled'} - detailed spawning logs`, 'enemies');
            } else {
              debugLog('Enemy Manager not available for spawn debug', 'enemies');
            }
            
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#4caf50',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'spawnDebugLabel',
          style: { 
            color: debugConfig.spawnDebug ? '#4caf50' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.spawnDebug = !debugConfig.spawnDebug;
            
            if (enemyManager) {
              enemyManager.setSpawnDebugEnabled(debugConfig.spawnDebug);
              debugLog(`Spawn debug ${debugConfig.spawnDebug ? 'enabled' : 'disabled'} - detailed spawning logs`, 'enemies');
            } else {
              debugLog('Enemy Manager not available for spawn debug', 'enemies');
            }
            
            forceUpdate();
          }
        }, debugConfig.spawnDebug ? '🎯 Spawn Debug: ON' : '🎯 Spawn Debug: OFF'),
        
        // Debug info about spawn debugging
        React.createElement('div', {
          key: 'spawnInfo',
          style: {
            fontSize: '12px',
            color: '#888',
            marginTop: '4px',
            fontStyle: 'italic'
          }
        }, 'Detailed logs for enemy creation, initialization, and container setup')
      ]),
      
      // Debug Render State Toggle
      React.createElement('div', {
        key: 'renderStateToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(33, 150, 243, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'renderStateCheckbox',
          type: 'checkbox',
          checked: debugConfig.renderStateAnalysis || false,
          onChange: () => {
            debugConfig.renderStateAnalysis = !debugConfig.renderStateAnalysis;
            if (enemyManager && enemyManager.setRenderAnalysisEnabled) {
              enemyManager.setRenderAnalysisEnabled(debugConfig.renderStateAnalysis);
              debugLog(`Render Analysis ${debugConfig.renderStateAnalysis ? 'enabled' : 'disabled'} - enemy sizes and HP will be logged every 2 seconds`, 'enemies');
            }
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#2196f3',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'renderStateLabel',
          style: { 
            color: debugConfig.renderStateAnalysis ? '#2196f3' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.renderStateAnalysis = !debugConfig.renderStateAnalysis;
            if (enemyManager && enemyManager.setRenderAnalysisEnabled) {
              enemyManager.setRenderAnalysisEnabled(debugConfig.renderStateAnalysis);
              debugLog(`Render Analysis ${debugConfig.renderStateAnalysis ? 'enabled' : 'disabled'} - enemy sizes and HP will be logged every 2 seconds`, 'enemies');
            }
            forceUpdate();
          }
        }, debugConfig.renderStateAnalysis ? '🔍 Render Analysis: ON' : '🔍 Render Analysis: OFF')
      ]),
      
      // AI Debug Toggle
      React.createElement('div', {
        key: 'aiDebugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(76, 175, 80, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'aiDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.aiDebug || false,
          onChange: () => {
            debugConfig.aiDebug = !debugConfig.aiDebug;
            if (enemyManager && enemyManager.setAIDebugEnabled) {
              enemyManager.setAIDebugEnabled(debugConfig.aiDebug);
              debugLog(`AI Debug ${debugConfig.aiDebug ? 'enabled' : 'disabled'} - AI behavior logging`, 'enemies');
            }
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#4caf50',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'aiDebugLabel',
          style: { 
            color: debugConfig.aiDebug ? '#4caf50' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.aiDebug = !debugConfig.aiDebug;
            if (enemyManager && enemyManager.setAIDebugEnabled) {
              enemyManager.setAIDebugEnabled(debugConfig.aiDebug);
              debugLog(`AI Debug ${debugConfig.aiDebug ? 'enabled' : 'disabled'} - AI behavior logging`, 'enemies');
            }
            forceUpdate();
          }
        }, debugConfig.aiDebug ? '🧠 AI Debug: ON' : '🧠 AI Debug: OFF'),
        
        React.createElement('div', {
          key: 'aiDebugInfo',
          style: {
            fontSize: '12px',
            color: '#888',
            marginTop: '4px',
            fontStyle: 'italic'
          }
        }, 'Logs AI state changes, chasing, returning, and attacking behavior')
      ]),
      
      // AI Visualization Toggle
      React.createElement('div', {
        key: 'aiVisualizationToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 69, 19, 0.3)',
          marginBottom: '8px'
        }
      }, [
        React.createElement('input', {
          key: 'aiVisualizationCheckbox',
          type: 'checkbox',
          checked: debugConfig.aiVisualization || false,
          onChange: () => {
            debugConfig.aiVisualization = !debugConfig.aiVisualization;
            if (enemyManager && enemyManager.setAIDebugVisualization) {
              enemyManager.setAIDebugVisualization(debugConfig.aiVisualization);
              debugLog(`AI Visualization ${debugConfig.aiVisualization ? 'enabled' : 'disabled'} - shows chase ranges and paths`, 'enemies');
            }
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#8b4513',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'aiVisualizationLabel',
          style: { 
            color: debugConfig.aiVisualization ? '#8b4513' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.aiVisualization = !debugConfig.aiVisualization;
            if (enemyManager && enemyManager.setAIDebugVisualization) {
              enemyManager.setAIDebugVisualization(debugConfig.aiVisualization);
              debugLog(`AI Visualization ${debugConfig.aiVisualization ? 'enabled' : 'disabled'} - shows chase ranges and paths`, 'enemies');
            }
            forceUpdate();
          }
        }, debugConfig.aiVisualization ? '👁️ AI Visualization: ON' : '👁️ AI Visualization: OFF'),
        
        React.createElement('div', {
          key: 'aiVisualizationInfo',
          style: {
            fontSize: '12px',
            color: '#888',
            marginTop: '4px',
            fontStyle: 'italic'
          }
        }, 'Shows visual indicators for chase ranges, view ranges, and return paths')
      ])
    ]),
    
    // Enemy Spawning Controls
    React.createElement('div', {
      key: 'enemySpawning',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'spawningTitle',
        style: { 
          color: '#66bb6a', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #66bb6a88'
        }
      }, '➕ Enemy Spawning'),
      
      React.createElement('div', {
        key: 'spawnButtons',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '8px',
          marginBottom: '12px'
        }
      }, [
        React.createElement('button', {
          key: 'spawnRedButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                await enemyManager.spawnRedSlime();
                debugLog('Spawned red slime (1HP)', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to spawn red slime: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #ff5722, #d32f2f)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(255, 87, 34, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🔴 Red Slime'),
        
        React.createElement('button', {
          key: 'spawnBlueButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                await enemyManager.spawnBlueSlime();
                debugLog('Spawned blue slime (1HP)', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to spawn blue slime: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #2196f3, #1565c0)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🔵 Blue Slime'),
        
        React.createElement('button', {
          key: 'spawn5HPButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                await enemyManager.spawn5HPSlime();
                debugLog('Spawned 5HP slime (50% bigger)', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to spawn 5HP slime: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #9c27b0, #6a1b9a)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '💪 5HP Slime'),
        
        React.createElement('button', {
          key: 'spawnTestMap1Button',
          onClick: async () => {
            if (enemyManager) {
              try {
                await enemyManager.spawnTestMap1Enemy();
                debugLog('Spawned TEST Map1 enemy at character location with focused debugging', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to spawn test Map1 enemy: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #ff9800, #f57c00)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🧪 TEST Map1 Enemy'),
        
        React.createElement('button', {
          key: 'triggerMap1Button',
          onClick: async () => {
            if (enemyManager) {
              try {
                await enemyManager.triggerMap1EnemySpawn();
                debugLog('Triggered Map1 enemy spawn at current location', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to trigger Map1 enemy spawn: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #4caf50, #2e7d32)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🗺️ Map1 Spawn'),
        
        React.createElement('button', {
          key: 'debugMap1VisibilityButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                enemyManager.debugMap1VisibilityDetection();
                debugLog('Map1 visibility detection debug analysis', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to debug Map1 visibility detection: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #2196f3, #1976d2)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(33, 150, 243, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🔍 Debug Visibility'),
        
        React.createElement('button', {
          key: 'forceMap1SpawnButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                await enemyManager.forceMap1VisibleEnemySpawn();
                debugLog('Forced Map1 visible enemy spawn', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to force Map1 spawn: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #e91e63, #c2185b)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(233, 30, 99, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🔧 Force Spawn'),
        
        React.createElement('button', {
          key: 'showEnemyLocationsButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                enemyManager.showAllMap1EnemyLocations();
                debugLog('Showing all Map1 enemy locations', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to show enemy locations: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #795548, #5d4037)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(121, 85, 72, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '📍 Show Locations'),
        
        React.createElement('button', {
          key: 'teleportToEnemyButton',
          onClick: async () => {
            if (enemyManager) {
              try {
                enemyManager.teleportToClosestEnemy();
                debugLog('Teleported to closest Map1 enemy location', 'enemies');
                forceUpdate();
              } catch (error) {
                debugLog(`Failed to teleport to enemy: ${error.message}`, 'system');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #00bcd4, #0097a7)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(0, 188, 212, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🚀 Teleport to Enemy'),
        
        // Manual Map Enemy Debug Analysis Button
        React.createElement('button', {
          key: 'triggerMapDebugButton',
          onClick: async () => {
            try {
              if (enemyManager && enemyManager.performMapEnemyDebugAnalysis) {
                enemyManager.performMapEnemyDebugAnalysis();
                debugLog('Manual Map Enemy Debug analysis triggered', 'enemies');
              } else {
                debugLog('Enemy Manager or performMapEnemyDebugAnalysis not available', 'system');
              }
            } catch (error) {
              console.error('Map Enemy Debug analysis error:', error);
              debugLog(`Failed to trigger Map Enemy Debug analysis: ${error.message}`, 'system');
            }
          },
          style: {
            padding: '10px 16px',
            backgroundColor: '#ffc107',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(255, 193, 7, 0.3)',
            minWidth: '120px'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#ffb300';
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 8px rgba(255, 193, 7, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#ffc107';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 2px 4px rgba(255, 193, 7, 0.3)';
          }
        }, '🔍 Analyze Now'),
        
        React.createElement('button', {
          key: 'testAIChaseButton',
          onClick: async () => {
            try {
              if (enemyManager && enemyManager.testAIChase) {
                enemyManager.testAIChase();
                debugLog('Triggered AI chase test - random enemy now chasing player', 'enemies');
              } else {
                debugLog('Enemy Manager or testAIChase not available', 'system');
              }
            } catch (error) {
              console.error('AI chase test error:', error);
              debugLog(`Failed to test AI chase: ${error.message}`, 'system');
            }
          },
          style: {
            padding: '10px',
            backgroundColor: '#4caf50',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)',
            minWidth: '120px'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#45a049';
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#4caf50';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 2px 4px rgba(76, 175, 80, 0.3)';
          }
        }, '🧠 Test AI Chase'),
        
        React.createElement('button', {
          key: 'makeEnemiesReturnButton',
          onClick: async () => {
            try {
              if (enemyManager && enemyManager.makeAllEnemiesReturn) {
                enemyManager.makeAllEnemiesReturn();
                debugLog('All enemies returning to start positions', 'enemies');
              } else {
                debugLog('Enemy Manager or makeAllEnemiesReturn not available', 'system');
              }
            } catch (error) {
              console.error('AI return error:', error);
              debugLog(`Failed to make enemies return: ${error.message}`, 'system');
            }
          },
          style: {
            padding: '10px',
            backgroundColor: '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(255, 152, 0, 0.3)',
            minWidth: '120px'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#f57c00';
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 8px rgba(255, 152, 0, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#ff9800';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 2px 4px rgba(255, 152, 0, 0.3)';
          }
        }, '🔙 Make Return'),
        
        React.createElement('button', {
          key: 'showAIStatusButton',
          onClick: async () => {
            try {
              if (enemyManager && enemyManager.showAIStatus) {
                enemyManager.showAIStatus();
                debugLog('AI status displayed in console', 'enemies');
              } else {
                debugLog('Enemy Manager or showAIStatus not available', 'system');
              }
            } catch (error) {
              console.error('AI status error:', error);
              debugLog(`Failed to show AI status: ${error.message}`, 'system');
            }
          },
          style: {
            padding: '10px',
            backgroundColor: '#9c27b0',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(156, 39, 176, 0.3)',
            minWidth: '120px'
          },
          onMouseEnter: (e) => {
            e.target.style.backgroundColor = '#7b1fa2';
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 8px rgba(156, 39, 176, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.backgroundColor = '#9c27b0';
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = '0 2px 4px rgba(156, 39, 176, 0.3)';
          }
        }, '📊 AI Status')
      ])
    ]),
    
    // Enemy Control
    React.createElement('div', {
      key: 'enemyControl',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'controlTitle',
        style: { 
          color: '#ab47bc', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ab47bc88'
        }
      }, '🎮 Enemy Control'),
      
      React.createElement('div', {
        key: 'controlButtons',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '12px'
        }
      }, [
        React.createElement('button', {
          key: 'controlRandomButton',
          onClick: () => {
            if (enemyManager) {
              const randomEnemy = enemyManager.getRandomEnemy();
              if (randomEnemy) {
                enemyManager.setPlayerControl(randomEnemy);
                debugLog(`Taking control of random ${randomEnemy.type} slime`, 'enemies');
                forceUpdate();
              } else {
                debugLog('No enemies available to control', 'enemies');
              }
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #9c27b0, #6a1b9a)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(156, 39, 176, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🎮 Control Random'),
        
        React.createElement('button', {
          key: 'releaseControlButton',
          onClick: () => {
            if (enemyManager) {
              enemyManager.setPlayerControl(null);
              debugLog('Released enemy control', 'enemies');
              forceUpdate();
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #757575, #424242)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(117, 117, 117, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🚫 Release Control')
      ]),
      
      React.createElement('div', {
        key: 'controlInfo',
        style: {
          fontSize: '11px',
          color: '#ab47bc',
          background: 'rgba(171, 71, 188, 0.1)',
          border: '1px solid rgba(171, 71, 188, 0.3)',
          borderRadius: '6px',
          padding: '8px',
          textAlign: 'center',
          fontWeight: 'bold'
        }
      }, [
        React.createElement('div', { key: 'controlsLine1' }, 'Controls: U=Up, J=Down, H=Left, K=Right'),
        React.createElement('div', { key: 'controlsLine2' }, 'V=Attack')
      ])
    ]),
    
    // Enemy Stats
    React.createElement('div', {
      key: 'enemyStats',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'statsTitle',
        style: { 
          color: '#26c6da', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #26c6da88'
        }
      }, '📊 Enemy Stats'),
      
      React.createElement('div', {
        key: 'statsDisplay',
        style: {
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(38, 198, 218, 0.3)',
          fontSize: '12px',
          color: '#e0e0e0'
        }
      }, [
        React.createElement('div', {
          key: 'totalEnemies',
          style: { marginBottom: '4px' }
        }, `Total Enemies: ${enemyManager ? enemyManager.getEnemyCount() : 0}`),
        
        React.createElement('div', {
          key: 'redEnemies',
          style: { marginBottom: '4px', color: '#ff6b6b' }
        }, `Red Slimes: ${enemyManager ? enemyManager.getStats().red : 0}`),
        
        React.createElement('div', {
          key: 'blueEnemies',
          style: { marginBottom: '4px', color: '#42a5f5' }
        }, `Blue Slimes: ${enemyManager ? enemyManager.getStats().blue : 0}`),
        
        React.createElement('div', {
          key: 'controlledEnemy',
          style: { marginBottom: '8px', color: '#ab47bc' }
        }, `Controlled: ${enemyManager ? enemyManager.getStats().controlled : 'none'}`),
        
        // AI Stats section
        React.createElement('div', {
          key: 'aiStatsTitle',
          style: { 
            marginTop: '8px', 
            marginBottom: '4px',
            fontSize: '13px',
            fontWeight: 'bold',
            color: '#4caf50',
            borderTop: '1px solid rgba(76, 175, 80, 0.3)',
            paddingTop: '8px'
          }
        }, '🧠 AI States:'),
        
        ...((() => {
          const aiStats = enemyManager ? enemyManager.getAIStats() : {};
          return [
            React.createElement('div', {
              key: 'aiIdle',
              style: { marginBottom: '2px', color: '#90a4ae', fontSize: '11px' }
            }, `Idle: ${aiStats.idle || 0}`),
            
            React.createElement('div', {
              key: 'aiChasing',
              style: { marginBottom: '2px', color: '#ff5722', fontSize: '11px' }
            }, `Chasing: ${aiStats.chasing || 0}`),
            
            React.createElement('div', {
              key: 'aiReturning',
              style: { marginBottom: '2px', color: '#ff9800', fontSize: '11px' }
            }, `Returning: ${aiStats.returning || 0}`),
            
            React.createElement('div', {
              key: 'aiAttacking',
              style: { marginBottom: '2px', color: '#f44336', fontSize: '11px' }
            }, `Attacking: ${aiStats.attacking || 0}`),
            
            React.createElement('div', {
              key: 'aiStunned',
              style: { color: '#9c27b0', fontSize: '11px' }
            }, `Stunned: ${aiStats.stunned || 0}`)
          ];
        })())
      ])
    ]),
    
    // Management Controls
    React.createElement('div', {
      key: 'enemyManagement',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'managementTitle',
        style: { 
          color: '#ff8a65', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff8a6588'
        }
      }, '🧹 Management'),
      
      React.createElement('div', {
        key: 'managementButtons',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '8px'
        }
      }, [
        React.createElement('button', {
          key: 'killAllButton',
          onClick: () => {
            if (enemyManager) {
              const enemies = enemyManager.getEnemies();
              enemies.forEach(enemy => {
                enemy.takeDamage(enemy.maxHealth); // Deal max damage to kill instantly
              });
              debugLog(`Killed ${enemies.length} enemies`, 'enemies');
              forceUpdate();
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #ff5722, #d32f2f)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(255, 87, 34, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '💀 Kill All'),
        
        React.createElement('button', {
          key: 'clearAllButton',
          onClick: () => {
            if (enemyManager) {
              enemyManager.clearAllEnemies();
              debugLog('Cleared all enemies', 'enemies');
              forceUpdate();
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '10px',
            background: 'linear-gradient(135deg, #e53935, #c62828)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(229, 57, 53, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '🧹 Clear All')
      ]),
      
      React.createElement('div', {
        key: 'debugVisualButtons',
        style: {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginTop: '8px'
        }
      }, [
        React.createElement('button', {
          key: 'addVisualIndicators',
          onClick: () => {
            if (enemyManager && enemyManager.addDebugVisualIndicators) {
              enemyManager.addDebugVisualIndicators();
              debugLog('Added visual debug indicators to enemies', 'enemies');
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '8px',
            background: 'linear-gradient(135deg, #4caf50, #388e3c)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '11px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '👁️ Show Indicators'),
        
        React.createElement('button', {
          key: 'removeVisualIndicators',
          onClick: () => {
            if (enemyManager && enemyManager.removeDebugVisualIndicators) {
              enemyManager.removeDebugVisualIndicators();
              debugLog('Removed visual debug indicators from enemies', 'enemies');
            } else {
              debugLog('Enemy manager not available', 'system');
            }
          },
          style: {
            padding: '8px',
            background: 'linear-gradient(135deg, #ff9800, #f57c00)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '11px',
            transition: 'all 0.2s ease'
          },
          onMouseEnter: (e) => {
            e.target.style.transform = 'scale(1.05)';
            e.target.style.boxShadow = '0 4px 12px rgba(255, 152, 0, 0.4)';
          },
          onMouseLeave: (e) => {
            e.target.style.transform = 'scale(1)';
            e.target.style.boxShadow = 'none';
          }
        }, '👁️ Hide Indicators')
      ])
    ])
  ]);
}
