/**
 * components/complaint/StepIndicator.jsx
 *
 * Horizontal step bar with connecting lines.
 * - Completed steps: filled navy circle + checkmark
 * - Active step:     navy outline circle with number + inline label
 * - Inactive steps:  gray circle + gray label
 */
const STEPS = [
  { id: 1, label: 'Add Photos'  },
  { id: 2, label: 'Pin Location' },
  { id: 3, label: 'Describe'    },
  { id: 4, label: 'Review'      },
  { id: 5, label: 'Submitted' }
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center mb-8" role="navigation" aria-label="Wizard steps">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < currentStep;
        const isActive    = step.id === currentStep;
        
        if(step.id === 5)return(<></>)

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">

            {/* Circle + label */}
            <div className="flex flex-col md:flex-row items-center gap-2 shrink-0">
              <div
                className={`w-5 h-5 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all duration-200
                  ${isCompleted
                    ? 'bg-[#1e2a5a] border-[#1e2a5a] text-white'
                    : isActive
                    ? 'bg-white border-[#1e2a5a] text-[#1e2a5a]'
                    : 'bg-white border-gray-300 text-gray-400'
                  }`}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? '✓' : step.id}
              </div>

              <div
                className={`text-[7px] md:text-[11px] font-bold whitespace-nowrap select-none transition-all duration-200
                  ${isCompleted
                    ? 'text-[#1e2a5a]'
                    : isActive
                    ? 'text-[#1e2a5a]'
                    : 'text-gray-400'
                  }`}
              >
                {step.label}
              </div>
            </div>

            {/* Connector line — not after last step */}
            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-[2px] mx-3 rounded-full transition-all duration-300
                  ${isCompleted ? 'bg-[#1e2a5a]' : 'bg-gray-200'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

