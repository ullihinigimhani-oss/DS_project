import React from 'react';
import './ModernSearchBar.css';

const ModernSearchBar = ({ value, onChange, placeholder, onReset, className = '' }) => {
  return (
    <form className={`modern-search-form ${className}`} onSubmit={(e) => e.preventDefault()}>
      <button type="button" className="search-icon-btn">
        <svg width="17" height="16" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="search">
          <path d="M7.667 12.667A5.333 5.333 0 107.667 2a5.333 5.333 0 000 10.667zM14.334 14l-2.9-2.9" stroke="currentColor" stroke-width="1.333" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>
      </button>
      <input
        className="modern-search-input"
        placeholder={placeholder || "Type your text"}
        required=""
        type="text"
        value={value}
        onChange={onChange}
      />
      <button 
        className="modern-search-reset" 
        type="button" 
        onClick={onReset}
        style={{ visibility: value ? 'visible' : 'hidden', opacity: value ? 1 : 0 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </form>
  );
};

export default ModernSearchBar;
