import React, { useState, useRef, useEffect } from 'react';

/**
 * Tooltip Component - Hover/click tooltips with positioning
 * @param {ReactNode} children - Element that triggers the tooltip
 * @param {string} content - Tooltip content/text
 * @param {string} position - Position: 'top', 'bottom', 'left', 'right'
 * @param {string} trigger - Trigger type: 'hover', 'click'
 * @param {string} maxWidth - Maximum width of tooltip
 * @param {boolean} arrow - Show arrow pointer
 */
const Tooltip = ({
  children,
  content,
  position = 'top',
  trigger = 'hover',
  maxWidth = '250px',
  arrow = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8;

    let top, left;

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = triggerRect.bottom + spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.left - tooltipRect.width - spacing;
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
        left = triggerRect.right + spacing;
        break;
      default:
        top = triggerRect.top - tooltipRect.height - spacing;
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
    }

    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (left < 0) left = spacing;
    if (left + tooltipRect.width > viewportWidth) left = viewportWidth - tooltipRect.width - spacing;
    if (top < 0) top = spacing;
    if (top + tooltipRect.height > viewportHeight) top = viewportHeight - tooltipRect.height - spacing;

    setCoords({ top, left });
  };

  useEffect(() => {
    if (isVisible) {
      calculatePosition();
    }
  }, [isVisible]);

  const showTooltip = () => {
    if (trigger === 'hover') {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const toggleTooltip = () => {
    if (trigger === 'click') {
      setIsVisible(!isVisible);
    }
  };

  // Close on outside click
  useEffect(() => {
    if (trigger === 'click' && isVisible) {
      const handleClickOutside = (e) => {
        if (
          triggerRef.current &&
          !triggerRef.current.contains(e.target) &&
          tooltipRef.current &&
          !tooltipRef.current.contains(e.target)
        ) {
          setIsVisible(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [trigger, isVisible]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isVisible]);

  if (!content) return children;

  return (
    <>
      <div
        ref={triggerRef}
        className={`tooltip-trigger ${className}`}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onClick={toggleTooltip}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`tooltip tooltip-${position} ${arrow ? 'tooltip-arrow' : ''}`}
          style={{
            top: coords.top,
            left: coords.left,
            maxWidth
          }}
          role="tooltip"
        >
          {content}
        </div>
      )}

      <style>{`
        .tooltip-trigger {
          cursor: pointer;
        }

        .tooltip {
          position: fixed;
          z-index: 1100;
          padding: 0.5rem 0.75rem;
          background: var(--gray-900);
          color: white;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.4;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          animation: tooltipFade 0.15s ease;
          pointer-events: none;
        }

        @keyframes tooltipFade {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .tooltip-arrow::before {
          content: '';
          position: absolute;
          border: 6px solid transparent;
        }

        .tooltip-top.tooltip-arrow::before {
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          border-top-color: var(--gray-900);
        }

        .tooltip-bottom.tooltip-arrow::before {
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          border-bottom-color: var(--gray-900);
        }

        .tooltip-left.tooltip-arrow::before {
          right: -12px;
          top: 50%;
          transform: translateY(-50%);
          border-left-color: var(--gray-900);
        }

        .tooltip-right.tooltip-arrow::before {
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          border-right-color: var(--gray-900);
        }
      `}</style>
    </>
  );
};

export default Tooltip;