import React from 'react';

interface Step {
  id: number;
  name: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="flex w-full items-start">
        {steps.map((step, stepIdx) => (
          <React.Fragment key={step.name}>
            {/* Step item (circle and label) */}
            <li className="relative flex flex-col items-center">
              {step.id < currentStep ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600">
                  <svg className="h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : step.id === currentStep ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-white dark:bg-slate-800" aria-current="step">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                </div>
              )}
              <p className="mt-2 w-28 text-center text-xs font-medium text-slate-600 dark:text-slate-400 sm:text-sm">{step.name}</p>
            </li>

            {/* Connecting line */}
            {stepIdx < steps.length - 1 && (
              <li className="flex-1 pt-4">
                <div className={`h-0.5 w-full ${step.id < currentStep ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
              </li>
            )}
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};

export default StepIndicator;
