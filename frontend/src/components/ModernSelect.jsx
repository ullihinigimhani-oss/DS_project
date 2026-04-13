import React, { useEffect, useRef, useState } from 'react'
import './ModernSelect.css'

const ModernSelect = ({ value, onChange, options, placeholder = 'Select an option' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedOption = options.find((opt) => opt.value === value) || options.find((opt) => opt === value)
  const selectedLabel = typeof selectedOption === 'object' ? selectedOption.label : selectedOption

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue) => {
    onChange({ target: { value: optionValue } })
    setIsOpen(false)
  }

  return (
    <div className={`modern-select-container ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      <div className="modern-select-selected" onClick={() => setIsOpen(!isOpen)}>
        <span className="modern-select-label">{selectedLabel || placeholder}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          height="1em"
          viewBox="0 0 512 512"
          className="modern-select-arrow"
        >
          <path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path>
        </svg>
      </div>
      <div className="modern-select-options">
        {options.map((option, index) => {
          const optValue = typeof option === 'object' ? option.value : option
          const optLabel = typeof option === 'object' ? option.label : option
          const isChecked = optValue === value

          return (
            <div
              key={index}
              className={`modern-select-option ${isChecked ? 'is-selected' : ''}`}
              onClick={() => handleSelect(optValue)}
            >
              {optLabel}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ModernSelect
