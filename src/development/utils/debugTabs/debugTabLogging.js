import React from 'react';

export function createLoggingTab(debugConfig, toggleLogging, forceUpdate) {
  return React.createElement('div', { key: 'logging' }, [
    React.createElement('h4', {
      key: 'title',
      style: { 
        color: '#a259ff', 
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: 'bold',
        textShadow: '0 0 8px #a259ff88'
      }
    }, 'Console Logging Controls'),
    
    React.createElement('div', {
      key: 'controls',
      style: { marginBottom: '16px' }
    }, [
      React.createElement('div', {
        key: 'allControls',
        style: { 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '12px',
          justifyContent: 'center'
        }
      }, [
        React.createElement('button', {
          key: 'allOn',
          onClick: () => toggleLogging('all'),
          style: {
            padding: '8px 12px',
            background: 'rgba(76, 175, 80, 0.2)',
            border: '2px solid rgba(76, 175, 80, 0.5)',
            borderRadius: '8px',
            color: '#4CAF50',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }, 'All Logging'),
        React.createElement('button', {
          key: 'allOff',
          onClick: () => toggleLogging('none'),
          style: {
            padding: '8px 12px',
            background: 'rgba(244, 67, 54, 0.2)',
            border: '2px solid rgba(244, 67, 54, 0.5)',
            borderRadius: '8px',
            color: '#F44336',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }
        }, 'No Logging')
      ]),
      
      React.createElement('div', {
        key: 'categories',
        style: { 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px'
        }
      }, Object.keys(debugConfig.logCategories).map(category =>
        React.createElement('label', {
          key: category,
          style: {
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '11px'
          }
        }, [
          React.createElement('input', {
            key: `checkbox-${category}`,
            type: 'checkbox',
            checked: debugConfig.logCategories[category],
            onChange: () => toggleLogging(category),
            style: {
              marginRight: '6px',
              accentColor: '#a259ff'
            }
          }),
          React.createElement('span', {
            key: `label-${category}`,
            style: { 
              color: debugConfig.logCategories[category] ? '#4CAF50' : '#888',
              textTransform: 'capitalize'
            }
          }, category)
        ])
      ))
    ])
  ]);
}
