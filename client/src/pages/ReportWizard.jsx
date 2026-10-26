/**
 * pages/ReportWizard.jsx
 *
 * Top-level wizard container.
 * - Reads/writes `step` from the complaint Redux slice.
 * - Renders the active step sub-component.
 */
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setStep, resetComplaint } from '../slices/complaintSlice';

import StepIndicator     from '../components/complaint/StepIndicator';
import Step1_ImageCapture from '../components/complaint/Step1_ImageCapture';
import Step2_LocationPin  from '../components/complaint/Step2_LocationPin';
import Step3_Description  from '../components/complaint/Step3_Description';
import Step4_ReviewForm   from '../components/complaint/Step4_ReviewForm';
import Step5_submission_successfull from '../components/complaint/step5_submission_successfull';

export default function ReportWizard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const step     = useSelector((s) => s.complaint.step);

  function goNext()     { dispatch(setStep(step + 1)); }
  function goBack() {
    if (step <= 1) {
      dispatch(resetComplaint());
      navigate('/citizen', { replace: true });
    } else {
      dispatch(setStep(step - 1));
    }
  }
  function goToStep(n) { dispatch(setStep(n)); }

  const activeStep = step < 1 ? 1 : step;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-4 py-10 font-sans">

      {/* Wizard Card */}
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden animate-[cardSlideUp_0.35s_cubic-bezier(0.22,1,0.36,1)]">

        {/* Card top strip — branding */}
        <div className="bg-[#1e2a5a] px-8 py-3 flex items-center justify-between">
          <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">NagarSeva</span>
          <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Civic Complaint Portal</span>
        </div>

        {/* Card body */}
        <div className="px-8 py-7">
          {/* Headline */}
          <div className="mb-6">
            <h1 className="text-lg font-black text-gray-900">Register a Civic Complaint</h1>
            <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
              Complete all {4} steps to submit your complaint for municipal action.
            </p>
          </div>

          <StepIndicator currentStep={activeStep} />

          <div className="mt-6">
            {activeStep === 1 && <Step1_ImageCapture onNext={goNext} />}
            {activeStep === 2 && <Step2_LocationPin onNext={goNext} onBack={goBack} />}
            {activeStep === 3 && <Step3_Description onNext={goNext} onBack={goBack} />}
            {activeStep === 4 && <Step4_ReviewForm onNext={goNext} onBack={goBack} onGoToStep={goToStep} />}
            {activeStep === 5 && <Step5_submission_successfull/>}
          </div>
        </div>
      </div>

      {/* Cancel link */}
      {activeStep < 4 && (
        <button
          onClick={() => { dispatch(resetComplaint()); navigate('/citizen', { replace: true }); }}
          className="mt-4 text-[11px] text-gray-400 hover:text-gray-600 font-semibold underline-offset-2 underline cursor-pointer transition"
        >
          Cancel &amp; return to dashboard
        </button>
      )}
    </div>
  );
}

