import React from 'react';
import Tooltip from './Tooltip';

/**
 * HelpTooltip Component - "?" icon with helpful tooltip
 * @param {string} content - Help text to display
 * @param {string} position - Tooltip position
 */
const HelpTooltip = ({ content, position = 'top' }) => {
  if (!content) return null;

  return (
    <Tooltip content={content} position={position} trigger="hover">
      <span className="help-tooltip-trigger">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M7 13C10.3137 13 13 10.3137 13 7C13 3.68629 10.3137 1 7 1C3.68629 1 1 3.68629 1 7C1 10.3137 3.68629 13 7 13Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 5.5C5.5 4.67 6.17 4 7 4C7.83 4 8.5 4.67 8.5 5.5C8.5 6.33 7 6.5 7 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
        </svg>
      </span>
      <style>{`
        .help-tooltip-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          background: var(--gray-100);
          border-radius: 50%;
          color: var(--gray-400);
          cursor: help;
          transition: all var(--transition-fast);
        }

        .help-tooltip-trigger:hover {
          background: var(--gray-200);
          color: var(--gray-600);
        }
      `}</style>
    </Tooltip>
  );
};

export default HelpTooltip;