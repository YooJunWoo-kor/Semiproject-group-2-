import React from "react";

const COLOR_THEMES = {
    red: {
      bg: '#fdd',
      text: '#d32f2f',
      border: '#f88',
    },
    blue: {
      bg: '#e3f2fd',
      text: '#1976d2',
      border: '#90caf9',
    },
    green: {
      bg: '#e8f5e9',
      text: '#2e7d32',
      border: '#a5d6a7',
    },
    orange: {
      bg: '#fff3e0',
      text: '#e65100',
      border: '#ffcc80',
    },
    purple: {
      bg: '#f3e5f5',
      text: '#7b1fa2',
      border: '#ce93d8',
    },
    gray: {
      bg: '#f5f5f5',
      text: '#616161',
      border: '#e0e0e0',
    },
  };

function ColorTeg({title='마감임박', count='5', type='개', color='red'}){
    const theme = COLOR_THEMES[color] || COLOR_THEMES.red;
    return(
        <div style={{
            backgroundColor: theme.bg
            ,borderRadius:'50px'
            ,color: theme.text
            ,border: `1px solid ${theme.border}`
            ,fontWeight: 'bolder'
            ,fontSize: '13px'
            ,padding:'3px 15px 6px 15px'
            ,width: 'max-content'
            ,whiteSpace: 'nowrap'
        }}>
            {title}
            <span style={{
                fontSize: '18px',
                marginLeft: '5px'
            }}>
                {count}
            </span>
            {type}
        </div>
    );
}

export default ColorTeg;
