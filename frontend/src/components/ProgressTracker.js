import React from 'react';

/**
 * ProgressTracker Component - Visual step progress indicator
 * @param {number} currentStep - Current active step (0-indexed)
 * @param {Array} steps - Array of step objects: { id, title, icon }
 * @param {function} onStepClick - Callback when step is clicked (optional)
 * @param {boolean} allowNavigation - Allow clicking on steps to navigate
 */
const ProgressTracker = ({
  currentStep,
  steps,
  onStepClick,
  allowNavigation = false
}) => {
  return (
    <div className="progress-tracker">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;

        return (
          <React.Fragment key={step.id}>
            <div
              className={`progress-step-item ${
                isCompleted ? 'completed' :
                isCurrent ? 'current' : 'upcoming'
              } ${allowNavigation ? 'clickable' : ''}`}
              onClick={() => allowNavigation && onStepClick?.(index)}
            >
              <div className="progress-step-circle">
                {isCompleted ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3.5 8L6.5 11L12.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
              <div className="progress-step-info">
                <span className="progress-step-title">{step.title}</span>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className={`progress-step-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}

      <style>{`
        .progress-tracker {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .progress-step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .progress-step-item.clickable {
          cursor: pointer;
        }

        .progress-step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: 600;
          transition: all var(--transition-normal);
          border: 2px solid;
        }

        .progress-step-item.completed .progress-step-circle {
          background: var(--accent-500);
          border-color: var(--accent-500);
          color: white;
        }

        .progress-step-item.current .progress-step-circle {
          background: var(--primary-600);
          border-color: var(--primary-600);
          color: white;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.2);
        }

        .progress-step-item.upcoming .progress-step-circle {
          background: white;
          border-color: var(--gray-300);
          color: var(--gray-400);
        }

        .progress-step-info {
          margin-top: 0.5rem;
          text-align: center;
        }

        .progress-step-title {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--gray-500);
          white-space: nowrap;
        }

        .progress-step-item.completed .progress-step-title,
        .progress-step-item.current .progress-step-title {
          color: var(--gray-900);
          font-weight: 600;
        }

        .progress-step-connector {
          width: 40px;
          height: 2px;
          background: var(--gray-200);
          margin: 0 0.5rem;
          margin-bottom: 1.5rem;
          transition: background var(--transition-normal);
        }

        .progress-step-connector.completed {
          background: var(--accent-500);
        }

        @media (max-width: 640px) {
          .progress-tracker {
            padding: 1rem;
            overflow-x: auto;
          }

          .progress-step-title {
            font-size: 0.625rem;
          }

          .progress-step-circle {
            width: 28px;
            height: 28px;
            font-size: 0.75rem;
          }

          .progress-step-connector {
            width: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProgressTracker;