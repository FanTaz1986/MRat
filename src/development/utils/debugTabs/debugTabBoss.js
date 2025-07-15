import React from 'react';

export function createBossTab(debugConfig, toggleLogging, forceUpdate, debugLog) {
  // Start auto-refresh when thunder logging is enabled
  if (debugConfig.logCategories.bossattackz && !window.thunderRefreshInterval) {
    window.thunderRefreshInterval = setInterval(() => {
      if (debugConfig.logCategories.bossattackz) {
        forceUpdate();
      } else {
        clearInterval(window.thunderRefreshInterval);
        window.thunderRefreshInterval = null;
      }
    }, 500);
  } else if (!debugConfig.logCategories.bossattackz && window.thunderRefreshInterval) {
    clearInterval(window.thunderRefreshInterval);
    window.thunderRefreshInterval = null;
  }

  return React.createElement('div', { key: 'boss' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Boss Debug Controls'),
    
    React.createElement('div', {
      key: 'bossControls',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'controlTitle',
        style: { 
          color: '#ff4444', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff444488'
        }
      }, '🎮 Boss Control'),
      
      React.createElement('div', {
        key: 'controlToggle',
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
          key: 'bossControlCheckbox',
          type: 'checkbox',
          checked: debugConfig.bossControlEnabled,
          onChange: () => {
            debugConfig.bossControlEnabled = !debugConfig.bossControlEnabled;
            debugLog(`Boss control ${debugConfig.bossControlEnabled ? 'enabled' : 'disabled'}`, 'debug');
            forceUpdate();
          },
          style: {
            marginRight: '12px',
            accentColor: '#ff4444',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'bossControlLabel',
          style: { 
            color: debugConfig.bossControlEnabled ? '#ff4444' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => {
            debugConfig.bossControlEnabled = !debugConfig.bossControlEnabled;
            debugLog(`Boss control ${debugConfig.bossControlEnabled ? 'enabled' : 'disabled'}`, 'debug');
            forceUpdate();
          }
        }, debugConfig.bossControlEnabled ? '🎮 Boss Control: ON' : '🎮 Boss Control: OFF')
      ]),
      
      React.createElement('div', {
        key: 'bossControlInfo',
        style: {
          fontSize: '11px',
          color: debugConfig.bossControlEnabled ? '#4CAF50' : '#ff6b6b',
          background: debugConfig.bossControlEnabled ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255, 107, 107, 0.1)',
          border: debugConfig.bossControlEnabled ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 107, 107, 0.3)',
          borderRadius: '6px',
          padding: '8px',
          marginTop: '8px',
          textAlign: 'center',
          fontWeight: 'bold'
        }
      }, debugConfig.bossControlEnabled ? 
        '✅ Boss controls enabled! Use Numpad 4/6/8/5 to move, Z/X/C to attack.' : 
        '⚠️ Boss controls disabled! Check the box above to enable boss controls.'
      )
    ]),
    
    React.createElement('div', {
      key: 'bossLogging',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'debugTitle',
        style: { 
          color: '#ffaa00', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ffaa0088'
        }
      }, '📋 Boss Debug Logging'),
      
      React.createElement('div', {
        key: 'debugToggle',
        style: { 
          display: 'flex',
          alignItems: 'center',
          padding: '12px',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 170, 0, 0.3)',
          marginBottom: '12px'
        }
      }, [
        React.createElement('input', {
          key: 'bossDebugCheckbox',
          type: 'checkbox',
          checked: debugConfig.logCategories.boss,
          onChange: () => toggleLogging('boss'),
          style: {
            marginRight: '12px',
            accentColor: '#ffaa00',
            transform: 'scale(1.2)'
          }
        }),
        React.createElement('label', {
          key: 'bossDebugLabel',
          style: { 
            color: debugConfig.logCategories.boss ? '#ffaa00' : '#888',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          },
          onClick: () => toggleLogging('boss')
        }, debugConfig.logCategories.boss ? '📋 Boss Logging: ON' : '📋 Boss Logging: OFF')
      ]),
      
      React.createElement('div', {
        key: 'bossDebugWarning',
        style: {
          fontSize: '11px',
          color: debugConfig.logCategories.boss ? '#ffaa00' : '#888',
          background: debugConfig.logCategories.boss ? 'rgba(255, 170, 0, 0.1)' : 'rgba(136, 136, 136, 0.1)',
          border: debugConfig.logCategories.boss ? '1px solid rgba(255, 170, 0, 0.3)' : '1px solid rgba(136, 136, 136, 0.3)',
          borderRadius: '6px',
          padding: '8px',
          marginTop: '8px',
          textAlign: 'center',
          fontWeight: 'bold'
        }
      }, debugConfig.logCategories.boss ? 
        '✅ Boss debug logging enabled! Check console for detailed boss events.' : 
        '⚠️ Boss debug logging disabled! Enable to see detailed boss debug info.'
      )
    ]),
    
    // Boss Attack Debug Logging (moved from tools tab)
    React.createElement('div', {
      key: 'attackDebugSection',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'attackDebugTitle',
        style: { 
          color: '#ff6b6b', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff6b6b88'
        }
      }, '⚡ Boss Attack Debug Logging'),
      
      React.createElement('div', {
        key: 'attackInfo',
        style: { 
          fontSize: '11px', 
          color: '#ff6b6b', 
          opacity: 0.8,
          marginBottom: '12px',
          padding: '8px',
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: '6px'
        }
      }, 'Enable detailed logging for specific boss attack types. These logs provide comprehensive information about attack sequences, timing, hit detection, and visual effects.'),

      // Range Attack (Z) Debug
      React.createElement('div', {
        key: 'rangeAttackDebug',
        style: { marginBottom: '12px' }
      }, [
        React.createElement('div', {
          key: 'rangeTitle',
          style: { 
            color: '#ffaa00', 
            margin: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }, '⚡ Range Attack (Z) - Thunder Strikes'),
        
        React.createElement('div', {
          key: 'rangeToggle',
          style: { 
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            background: 'rgba(255, 170, 0, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 170, 0, 0.3)',
            marginBottom: '8px'
          }
        }, [
          React.createElement('input', {
            key: 'rangeAttackCheckbox',
            type: 'checkbox',
            checked: debugConfig.logCategories.bossattackz,
            onChange: () => toggleLogging('bossattackz'),
            style: {
              marginRight: '8px',
              accentColor: '#ffaa00',
              transform: 'scale(1.1)'
            }
          }),
          React.createElement('label', {
            key: 'rangeAttackLabel',
            style: { 
              color: debugConfig.logCategories.bossattackz ? '#ffaa00' : '#888',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            },
            onClick: () => toggleLogging('bossattackz')
          }, debugConfig.logCategories.bossattackz ? '⚡ Thunder Logging: ON' : '⚡ Thunder Logging: OFF')
        ]),
        
        // Thunder Strike Coordinates Display (shown when logging is enabled)
        debugConfig.logCategories.bossattackz && React.createElement('div', {
          key: 'thunderCoordinates',
          style: { 
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(255, 170, 0, 0.05)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 170, 0, 0.2)'
          }
        }, [
          React.createElement('div', {
            key: 'thunderCoordTitle',
            style: { 
              color: '#ffaa00', 
              margin: '0 0 8px 0',
              fontSize: '11px',
              fontWeight: 'bold'
            }
          }, '⚡ Thunder Strike Coordinates'),
          
          React.createElement('div', {
            key: 'thunderCoordData',
            style: { 
              fontSize: '9px',
              color: '#fff',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '6px',
              borderRadius: '4px',
              border: '1px solid rgba(255, 170, 0, 0.2)',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              maxHeight: '150px',
              overflowY: 'auto'
            }
          }, (() => {
            // Get current thunder strike tracking data
            const thunderData = window.thunderDebugData || {};
            let output = '';
            
            // Show current character position
            if (window.gameMapManager && window.gameMapManager.character) {
              const character = window.gameMapManager.character;
              output += `🎯 Current Character: (${character.position.x.toFixed(1)}, ${character.position.y.toFixed(1)})\n`;
              
              // Show boss position if available
              if (window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
                const boss = window.gameMapManager.mapXInstance.boss;
                const distance = Math.sqrt(
                  Math.pow(character.position.x - boss.position.x, 2) + 
                  Math.pow(character.position.y - boss.position.y, 2)
                );
                output += `🐉 Current Boss: (${boss.position.x.toFixed(1)}, ${boss.position.y.toFixed(1)}) [${distance.toFixed(1)}px away]\n`;
              }
              output += `\n`;
            }
            
            if (thunderData.lastAttackTime) {
              const timeAgo = Date.now() - thunderData.lastAttackTime;
              output += `🕐 Last Attack: ${timeAgo}ms ago\n`;
              
              if (thunderData.attackStartData) {
                const startData = thunderData.attackStartData;
                output += `📍 Attack Start - Boss: (${startData.bossX.toFixed(1)}, ${startData.bossY.toFixed(1)})\n`;
                output += `📍 Attack Start - Character: (${startData.characterX.toFixed(1)}, ${startData.characterY.toFixed(1)})\n`;
                output += `📏 Distance: ${startData.distance.toFixed(1)}px, Phase: ${startData.phase}\n\n`;
              }
              
              if (thunderData.strikePositions && thunderData.strikePositions.length > 0) {
                output += `⚡ THUNDER STRIKES:\n`;
                thunderData.strikePositions.forEach((strike, index) => {
                  const relativeX = strike.x - thunderData.attackStartData.characterX;
                  const relativeY = strike.y - thunderData.attackStartData.characterY;
                  output += `  ${index + 1}. [${strike.type}] (${strike.x.toFixed(1)}, ${strike.y.toFixed(1)}) `;
                  output += `[${relativeX >= 0 ? '+' : ''}${relativeX.toFixed(1)}, ${relativeY >= 0 ? '+' : ''}${relativeY.toFixed(1)}]`;
                  if (strike.hitCharacter !== undefined) {
                    output += ` ${strike.hitCharacter ? 'HIT' : 'MISS'}`;
                  }
                  output += `\n`;
                });
              }
              
              if (thunderData.characterHitData) {
                const hitData = thunderData.characterHitData;
                output += `\n🎯 Hit Data: (${hitData.x.toFixed(1)}, ${hitData.y.toFixed(1)}) - Moved: ${hitData.distanceMoved.toFixed(1)}px - Hits: ${hitData.strikesHit}\n`;
              }
            } else {
              output = 'No thunder strike data.\nTrigger a range attack to see coordinates.';
            }
            
            return output;
          })()),
          
          React.createElement('div', {
            key: 'thunderCoordControls',
            style: { 
              display: 'flex',
              gap: '4px',
              marginTop: '6px'
            }
          }, [
            React.createElement('button', {
              key: 'clearThunderData',
              onClick: () => {
                window.thunderDebugData = {};
                debugLog('Thunder debug data cleared', 'bossattackz');
                forceUpdate();
              },
              style: {
                flex: '1',
                padding: '4px',
                background: 'rgba(255, 170, 0, 0.2)',
                border: '1px solid rgba(255, 170, 0, 0.5)',
                borderRadius: '3px',
                color: '#ffaa00',
                cursor: 'pointer',
                fontSize: '9px',
                fontWeight: 'bold'
              }
            }, '🗑️ Clear'),
            
            React.createElement('button', {
              key: 'refreshThunderData',
              onClick: () => {
                debugLog('Thunder debug data refreshed', 'bossattackz');
                forceUpdate();
              },
              style: {
                flex: '1',
                padding: '4px',
                background: 'rgba(255, 170, 0, 0.2)',
                border: '1px solid rgba(255, 170, 0, 0.5)',
                borderRadius: '3px',
                color: '#ffaa00',
                cursor: 'pointer',
                fontSize: '9px',
                fontWeight: 'bold'
              }
            }, '🔄 Refresh')
          ])
        ]),
        
        React.createElement('button', {
          key: 'rangeTestButton',
          onClick: () => {
            debugLog('Testing thunder strike system - triggering range attack', 'bossattackz');
            if (window.gameMapManager && window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
              const boss = window.gameMapManager.mapXInstance.boss;
              if (boss.attackLogic && boss.attackLogic.startAttack) {
                boss.attackLogic.startAttack('range');
                debugLog('Thunder strike test initiated - check console for detailed logs', 'bossattackz');
              } else {
                debugLog('Boss attack logic not found', 'bossattackz');
              }
            } else {
              debugLog('Boss not found - teleport to Map X first', 'bossattackz');
            }
          },
          style: {
            width: '100%',
            padding: '6px',
            background: 'rgba(255, 170, 0, 0.2)',
            border: '1px solid rgba(255, 170, 0, 0.5)',
            borderRadius: '4px',
            color: '#ffaa00',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold'
          }
        }, '⚡ TEST THUNDER STRIKES')
      ]),

      // Bolt Attack (X) Debug
      React.createElement('div', {
        key: 'boltAttackDebug',
        style: { marginBottom: '12px' }
      }, [
        React.createElement('div', {
          key: 'boltTitle',
          style: { 
            color: '#4CAF50', 
            margin: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }, '⚡ Bolt Attack (X) - Zap Cone'),
        
        React.createElement('div', {
          key: 'boltToggle',
          style: { 
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            marginBottom: '8px'
          }
        }, [
          React.createElement('input', {
            key: 'boltAttackCheckbox',
            type: 'checkbox',
            checked: debugConfig.logCategories.bossattackx,
            onChange: () => toggleLogging('bossattackx'),
            style: {
              marginRight: '8px',
              accentColor: '#4CAF50',
              transform: 'scale(1.1)'
            }
          }),
          React.createElement('label', {
            key: 'boltAttackLabel',
            style: { 
              color: debugConfig.logCategories.bossattackx ? '#4CAF50' : '#888',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            },
            onClick: () => toggleLogging('bossattackx')
          }, debugConfig.logCategories.bossattackx ? '⚡ Zap Cone Logging: ON' : '⚡ Zap Cone Logging: OFF')
        ]),
        
        React.createElement('button', {
          key: 'boltTestButton',
          onClick: () => {
            debugLog('Testing zap cone system - triggering bolt attack', 'bossattackx');
            if (window.gameMapManager && window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
              const boss = window.gameMapManager.mapXInstance.boss;
              if (boss.attackLogic && boss.attackLogic.startAttack) {
                boss.attackLogic.startAttack('bolt');
                debugLog('Zap cone test initiated - check console for detailed logs', 'bossattackx');
              } else {
                debugLog('Boss attack logic not found', 'bossattackx');
              }
            } else {
              debugLog('Boss not found - teleport to Map X first', 'bossattackx');
            }
          },
          style: {
            width: '100%',
            padding: '6px',
            background: 'rgba(76, 175, 80, 0.2)',
            border: '1px solid rgba(76, 175, 80, 0.5)',
            borderRadius: '4px',
            color: '#4CAF50',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold'
          }
        }, '⚡ TEST ZAP CONE')
      ]),

      // Melee Attack (C) Debug
      React.createElement('div', {
        key: 'meleeAttackDebug',
        style: { marginBottom: '12px' }
      }, [
        React.createElement('div', {
          key: 'meleeTitle',
          style: { 
            color: '#4CAF50', 
            margin: '0 0 8px 0',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }, '⚔️ Melee Attack (C) - Close Combat'),
        
        React.createElement('div', {
          key: 'meleeToggle',
          style: { 
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            background: 'rgba(76, 175, 80, 0.1)',
            borderRadius: '6px',
            border: '1px solid rgba(76, 175, 80, 0.3)',
            marginBottom: '8px'
          }
        }, [
          React.createElement('input', {
            key: 'meleeAttackCheckbox',
            type: 'checkbox',
            checked: debugConfig.logCategories.bossattackc,
            onChange: () => toggleLogging('bossattackc'),
            style: {
              marginRight: '8px',
              accentColor: '#4CAF50',
              transform: 'scale(1.1)'
            }
          }),
          React.createElement('label', {
            key: 'meleeAttackLabel',
            style: { 
              color: debugConfig.logCategories.bossattackc ? '#4CAF50' : '#888',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            },
            onClick: () => toggleLogging('bossattackc')
          }, debugConfig.logCategories.bossattackc ? '⚔️ Melee Logging: ON' : '⚔️ Melee Logging: OFF')
        ]),
        
        React.createElement('button', {
          key: 'meleeTestButton',
          onClick: () => {
            debugLog('=== MELEE ATTACK DEBUG TEST ===', 'bossattackc');
            debugLog('Testing melee attack functionality', 'bossattackc');
            
            // Find boss entity
            const boss = window.gameEngine?.entities?.find(e => e.type === 'boss');
            if (boss) {
              debugLog(`Boss found: ${boss.name || 'Unknown'} at (${boss.x}, ${boss.y})`, 'bossattackc');
              
              // Test melee attack if available
              if (boss.performMeleeAttack) {
                debugLog('Triggering melee attack...', 'bossattackc');
                boss.performMeleeAttack();
              } else {
                debugLog('Boss melee attack logic not found', 'bossattackc');
              }
            } else {
              debugLog('Boss not found - teleport to Boss Map first', 'bossattackc');
            }
          },
          style: {
            width: '100%',
            padding: '6px',
            background: 'rgba(255, 87, 34, 0.2)',
            border: '1px solid rgba(255, 87, 34, 0.5)',
            borderRadius: '4px',
            color: '#FF5722',
            cursor: 'pointer',
            fontSize: '10px',
            fontWeight: 'bold'
          }
        }, '⚔️ TEST MELEE ATTACK')
      ])
    ]),
    
    React.createElement('div', {
      key: 'bossHealthControls',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'healthTitle',
        style: { 
          color: '#4CAF50', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #4CAF5088'
        }
      }, '❤️ Boss Health Controls'),
      
      React.createElement('div', {
        key: 'healthButtons',
        style: { 
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          padding: '12px',
          background: 'rgba(76, 175, 80, 0.1)',
          borderRadius: '8px',
          border: '2px solid rgba(76, 175, 80, 0.3)'
        }
      }, [
        React.createElement('button', {
          key: 'addHealthAlways',
          onClick: () => {
            debugLog('Add boss health triggered', 'boss');
            if (window.gameMapManager && window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
              const boss = window.gameMapManager.mapXInstance.boss;
              if (boss.modifyHealth && typeof boss.modifyHealth === 'function') {
                boss.modifyHealth(5);
                debugLog(`Boss health modified using modifyHealth method`, 'boss');
              } else {
                debugLog('Boss modifyHealth method not found', 'boss');
              }
            } else {
              debugLog('Boss entity not found - navigate to Map X and wait for boss spawn', 'boss');
            }
          },
          style: {
            padding: '12px 8px',
            background: 'rgba(76, 175, 80, 0.3)',
            border: '2px solid rgba(76, 175, 80, 0.7)',
            borderRadius: '8px',
            color: '#4CAF50',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'center'
          }
        }, '💚 ADD BOSS HEALTH\n(+5 HP)'),
        
        React.createElement('button', {
          key: 'removeHealthAlways',
          onClick: () => {
            debugLog('Remove boss health triggered', 'boss');
            if (window.gameMapManager && window.gameMapManager.mapXInstance && window.gameMapManager.mapXInstance.boss) {
              const boss = window.gameMapManager.mapXInstance.boss;
              if (boss.takeDamage && boss.currentHP !== undefined && boss.maxHP !== undefined) {
                const oldHealth = boss.currentHP;
                boss.takeDamage(5);
                debugLog(`Boss took 5 damage: ${oldHealth} -> ${boss.currentHP}`, 'boss');
              } else {
                debugLog('Boss takeDamage method or health properties not found', 'boss');
              }
            } else {
              debugLog('Boss entity not found - navigate to Map X and wait for boss spawn', 'boss');
            }
          },
          style: {
            padding: '12px 8px',
            background: 'rgba(244, 67, 54, 0.3)',
            border: '2px solid rgba(244, 67, 54, 0.7)',
            borderRadius: '8px',
            color: '#F44336',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            transition: 'all 0.2s ease',
            textAlign: 'center'
          }
        }, '❤️ REMOVE BOSS HEALTH\n(-5 HP)')
      ])
    ]),
    
    React.createElement('div', {
      key: 'bossActions',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'actionsTitle',
        style: { 
          color: '#ff6b6b', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #ff6b6b88'
        }
      }, '⚡ Other Boss Actions'),
      
      React.createElement('button', {
        key: 'forcePortalSwap',
        onClick: () => {
          debugLog('Force portal swap triggered', 'boss');
          if (window.gameMapManager && window.gameMapManager.mapXInstance) {
            if (window.gameMapManager.mapXInstance.enablePortal) {
              debugLog('Calling enablePortal on MapX instance', 'boss');
              
              if (window.gameMapManager.portalManager && !window.gameMapManager.portalManager.pendingPortalConfig) {
                debugLog('Pending portal config missing, setting it manually', 'boss');
                window.gameMapManager.portalManager.pendingPortalConfig = {
                  x: 200,
                  y: 200,
                  w: 256,
                  h: 256,
                  targetMap: 'maparea0'
                };
                debugLog('Pending portal config restored', 'boss');
              }
              
              window.gameMapManager.mapXInstance.enablePortal();
              debugLog('Map X portal forced to activate', 'boss');
            } else {
              debugLog('Map X portal enablePortal method not found', 'boss');
            }
          } else {
            debugLog('Map X instance not found - navigate to Map X first', 'boss');
          }
        },
        style: {
          width: '100%',
          padding: '10px 8px',
          background: 'rgba(255, 152, 0, 0.2)',
          border: '2px solid rgba(255, 152, 0, 0.5)',
          borderRadius: '8px',
          color: '#FF9800',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          textAlign: 'center'
        }
      }, '🌀 FORCE PORTAL SWAP\n(Skip 3min timer)')
    ]),
    
    React.createElement('div', {
      key: 'bossCooldowns',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('h5', {
        key: 'cooldownsTitle',
        style: { 
          color: '#9C27B0', 
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          textShadow: '0 0 8px #9C27B088'
        }
      }, '⏱️ Cooldowns'),
      
      React.createElement('div', {
        key: 'cooldownDisplay',
        style: { 
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '12px',
          background: 'rgba(156, 39, 176, 0.1)',
          borderRadius: '8px',
          border: '2px solid rgba(156, 39, 176, 0.3)',
          fontFamily: "'Courier New', monospace",
          fontSize: '12px'
        }
      }, [
        React.createElement('div', {
          key: 'meleeCooldownItem',
          style: { 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            borderLeft: '3px solid #4CAF50'
          },
          className: 'cooldown-item',
          id: 'meleeCooldownItem'
        }, [
          React.createElement('span', {
            key: 'meleeLabel',
            style: { color: '#ffffff', fontWeight: 'bold', minWidth: '80px' }
          }, 'Melee (C):'),
          React.createElement('span', {
            key: 'meleeCooldown',
            style: { color: '#4CAF50', fontWeight: 'bold', textAlign: 'right', minWidth: '60px' },
            className: 'cooldown-time',
            id: 'meleeCooldown'
          }, 'Ready')
        ]),
        
        React.createElement('div', {
          key: 'zapCooldownItem',
          style: { 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            borderLeft: '3px solid #4CAF50'
          },
          className: 'cooldown-item',
          id: 'zapCooldownItem'
        }, [
          React.createElement('span', {
            key: 'zapLabel',
            style: { color: '#ffffff', fontWeight: 'bold', minWidth: '80px' }
          }, 'Zap (X):'),
          React.createElement('span', {
            key: 'zapCooldown',
            style: { color: '#4CAF50', fontWeight: 'bold', textAlign: 'right', minWidth: '60px' },
            className: 'cooldown-time',
            id: 'zapCooldown'
          }, 'Ready')
        ]),
        
        React.createElement('div', {
          key: 'rangeCooldownItem',
          style: { 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 8px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '4px',
            borderLeft: '3px solid #4CAF50'
          },
          className: 'cooldown-item',
          id: 'rangeCooldownItem'
        }, [
          React.createElement('span', {
            key: 'rangeLabel',
            style: { color: '#ffffff', fontWeight: 'bold', minWidth: '80px' }
          }, 'Range (Z):'),
          React.createElement('span', {
            key: 'rangeCooldown',
            style: { color: '#4CAF50', fontWeight: 'bold', textAlign: 'right', minWidth: '60px' },
            className: 'cooldown-time',
            id: 'rangeCooldown'
          }, 'Ready')
        ])
      ])
    ]),
    
    React.createElement('div', {
      key: 'bossInfo',
      style: { 
        fontSize: '12px', 
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid rgba(162, 89, 255, 0.3)'
      }
    }, [
      React.createElement('div', {
        key: 'bossInfoTitle',
        style: { marginBottom: '8px' }
      }, React.createElement('strong', { style: { color: '#ff4444' } }, 'Boss AI Information:')),
      
      React.createElement('div', {
        key: 'bossAIInfo',
        style: { fontSize: '11px', marginBottom: '8px', color: '#FFC107' }
      }, '🤖 Boss controls are now handled by the BossAI component'),
      
      React.createElement('div', {
        key: 'controlsList',
        style: { fontSize: '10px', color: '#888', lineHeight: '1.3' }
      }, [
        React.createElement('div', { key: 'info1' }, '• Boss AI automatically handles all boss logic and controls'),
        React.createElement('div', { key: 'info2' }, '• Keyboard controls work when boss debugging is enabled'),
        React.createElement('div', { key: 'info3' }, '• Numpad 4/6/8/5: Move boss left/right/up/down'),
        React.createElement('div', { key: 'info4' }, '• Z/X/C: Range/bolt/melee attacks'),
        React.createElement('div', { key: 'info5' }, '• Force Portal: Instantly enables Map X portal (skip 3min timer)'),
        React.createElement('div', { key: 'info6' }, '• Add Boss Health: Increases boss health by 5 HP (max 40)'),
        React.createElement('div', { key: 'info7' }, '• Remove Boss Health: Decreases boss health by 5 HP (min 0)'),
        React.createElement('div', { key: 'info8' }, '• Boss AI can be fine-tuned in BossAI.js component'),
        React.createElement('div', { key: 'info9' }, '• All boss actions are logged when debugging is enabled')
      ])
    ])
  ]);
}
