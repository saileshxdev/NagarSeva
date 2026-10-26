import React, { useState } from 'react';
import { 
  FiSmartphone, 
  FiCpu, 
  FiMapPin, 
  FiLayers, 
  FiActivity, 
  FiCheckCircle,
  FiChevronRight
} from 'react-icons/fi';

const STEPS = [
  {
    id: 1,
    icon: <FiSmartphone className="w-5 h-5" />,
    title: 'Capture',
    subtitle: 'Citizen Report Intake',
    desc: 'Citizens snap an on-site photo of civic distress (like potholes, sewage leaks, or broken streetlights) using their smartphones.',
    tech: ['HTML5 Camera API', 'Redux State', 'Client Validation'],
    illustration: (
      <div className="w-full h-56 bg-gray-50 rounded-sm border border-gray-150 flex items-center justify-center p-6 relative overflow-hidden shadow-inner">
        {/* Mock Phone Body */}
        <div className="w-36 h-48 bg-white border-2 border-gray-300 rounded-lg shadow-md flex flex-col overflow-hidden">
          <div className="bg-gray-100 py-1 text-[8px] font-black text-center text-gray-500 border-b">NAGARSEVA</div>
          <div className="flex-1 bg-gray-50 flex items-center justify-center p-2 relative">
            <div className="w-full h-full bg-blue-100 rounded flex flex-col items-center justify-center border border-dashed border-blue-300 text-blue-600">
              <span className="text-xl">🕳️</span>
              <span className="text-[6px] font-black mt-1">POTHOLE DETECTED</span>
            </div>
          </div>
          <div className="bg-white p-1.5 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-red-500 border-2 border-white shadow-md flex items-center justify-center text-white cursor-pointer active:scale-95 transition-transform">
              📸
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 2,
    icon: <FiCpu className="w-5 h-5" />,
    title: 'AI Analysis',
    subtitle: 'Automatic Triage',
    desc: 'The backend pipelines the photo to LLM vision models to analyze the severity, verify categorization, and filter out irrelevant uploads.',
    tech: ['Groq Llama-3 Vision', 'Confidence Score', 'Triage Logic'],
    illustration: (
      <div className="w-full h-56 bg-gray-950 rounded-sm border border-gray-900 flex flex-col p-4 font-mono text-[10px] text-green-400 overflow-auto shadow-inner">
        <div className="flex items-center gap-1.5 border-b border-gray-800 pb-2 mb-2 text-gray-500">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="ml-1 text-[9px] font-bold">ai-triage-daemon.sh</span>
        </div>
        <p className="text-gray-500">// Processing citizen inquiry image...</p>
        <p className="mt-1 text-sky-400">➔ Contacting Groq API...</p>
        <p className="mt-2 text-yellow-300">
          {`{`} <br />
          &nbsp;&nbsp;&quot;category&quot;: &quot;POTHOLE&quot;,<br />
          &nbsp;&nbsp;&quot;severity&quot;: &quot;HIGH&quot;,<br />
          &nbsp;&nbsp;&quot;confidence&quot;: 98.4,<br />
          &nbsp;&nbsp;&quot;requires_immediate_dispatch&quot;: true<br />
          {`}`}
        </p>
        <p className="mt-2 text-green-400">✓ AI Classification Successful.</p>
      </div>
    )
  },
  {
    id: 3,
    icon: <FiMapPin className="w-5 h-5" />,
    title: 'Geo-Tag',
    subtitle: 'Location Precision',
    desc: 'Geolocation coordinates are saved, placing a marker on the City Pulse map. High-accuracy bounding boxes restrict proximity spoofing.',
    tech: ['HTML5 Geolocation', 'PostGIS Point Column', 'Spatial Bounds'],
    illustration: (
      <div className="w-full h-56 bg-sky-50 border border-sky-100 rounded-sm relative overflow-hidden flex items-center justify-center p-6 shadow-inner">
        {/* Radar concentric animation circles */}
        <div className="absolute w-24 h-24 rounded-full border border-sky-300/40 bg-sky-100/30 animate-ping" />
        <div className="absolute w-12 h-12 rounded-full border border-sky-300/50 bg-sky-100/40 animate-pulse" />
        
        {/* Pin marker */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-red-500 border-2 border-white flex items-center justify-center text-white shadow-lg animate-bounce">
            📍
          </div>
          <div className="bg-white border border-gray-200 py-1.5 px-3 rounded shadow-sm text-center mt-2.5">
            <span className="text-[10px] font-black text-gray-900 block leading-none">GPS LOCK</span>
            <span className="text-[8px] text-gray-400 font-bold block mt-1">22.8049° N, 85.3078° E</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 4,
    icon: <FiLayers className="w-5 h-5" />,
    title: 'Dispatch',
    subtitle: 'Department Assignment',
    desc: 'Super admins verify triaged tickets, routing them directly to correct municipal departments (e.g. Roads, Sanitation, Streetlights).',
    tech: ['Verification Queue', 'ULB Routing', 'SQL Department Indexes'],
    illustration: (
      <div className="w-full h-56 bg-gray-50 rounded-sm border border-gray-150 flex items-center justify-center p-5 shadow-inner">
        <div className="w-full max-w-[260px] bg-white border border-gray-200 rounded-sm p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase">Incoming Ticket</span>
            <span className="text-[9px] font-bold bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">SUBMITTED</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🏢</span>
            <div>
              <span className="text-xs font-black text-gray-900 block leading-tight">Road Repair Dept</span>
              <span className="text-[9px] text-gray-400 block mt-0.5">Engineering Division</span>
            </div>
          </div>
          <button type="button" className="w-full py-1.5 bg-[#1e2a5a] text-white text-[10px] font-extrabold rounded-sm shadow-sm">
            ✓ Dispatch to Field Worker
          </button>
        </div>
      </div>
    )
  },
  {
    id: 5,
    icon: <FiActivity className="w-5 h-5" />,
    title: 'Resolution',
    subtitle: 'Field Operations',
    desc: 'Assigned personnel resolve issues. GPS proximity verification gates the camera, requiring on-site photo proofs of completion.',
    tech: ['Proximity Verification', 'Cloudinary Proofs', 'Audit Trails'],
    illustration: (
      <div className="w-full h-56 bg-gray-50 rounded-sm border border-gray-150 flex items-center justify-center p-5 shadow-inner">
        <div className="w-full max-w-[260px] bg-white border border-gray-200 rounded-sm p-4 shadow-sm space-y-3">
          <span className="text-[10px] text-gray-400 font-extrabold uppercase block leading-none">WORK CHECKLIST</span>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Arrive within 200m range</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <span className="text-green-500">✓</span>
              <span>Snap resolution photo proof</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
              <span className="text-blue-500 animate-pulse">■</span>
              <span>Enter resolution notes</span>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full w-2/3" />
          </div>
        </div>
      </div>
    )
  },
  {
    id: 6,
    icon: <FiCheckCircle className="w-5 h-5" />,
    title: 'Closure',
    subtitle: 'Citizen Verification',
    desc: 'The ticket transitions to Resolved. If the citizen remains unsatisfied, it rolls back to the triaging queue automatically.',
    tech: ['Resolved Flags', 'Satisfaction Feedback', 'Auto-Rollback Trigger'],
    illustration: (
      <div className="w-full h-56 bg-green-50/50 border border-green-100 rounded-sm flex items-center justify-center p-5 shadow-inner">
        <div className="w-full max-w-[260px] bg-white border border-green-200 rounded-sm p-4 shadow-sm text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-lg mx-auto">
            ✓
          </div>
          <div>
            <span className="text-xs font-black text-gray-900 block leading-tight">COMPLAINT CLOSED</span>
            <span className="text-[9px] text-green-600 font-bold block mt-1">Verified Resolution</span>
          </div>
          <div className="flex justify-center gap-4 text-xs pt-1.5 border-t border-gray-100">
            <span className="text-green-600 font-extrabold cursor-pointer">👍 Satisfied</span>
            <span className="text-red-500 font-extrabold cursor-pointer">👎 Reopen</span>
          </div>
        </div>
      </div>
    )
  }
];

const HowItWorks = () => {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      
      {/* Left side: Navigation step buttons (5/12 width) */}
      <div className="lg:col-span-5 flex flex-col justify-between gap-3">
        {STEPS.map((step, idx) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(idx)}
            className={`w-full text-left p-4 rounded-sm border transition-all duration-300 flex items-center justify-between cursor-pointer ${
              activeStep === idx
                ? 'bg-[#1e2a5a] border-[#1e2a5a] text-white shadow-md shadow-blue-900/10'
                : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Step counter / icon */}
              <div className={`w-8 h-8 rounded-sm flex items-center justify-center text-sm font-extrabold flex-shrink-0 transition-colors ${
                activeStep === idx 
                  ? 'bg-white/10 text-white' 
                  : 'bg-gray-50 text-gray-400 group-hover:text-gray-600'
              }`}>
                {step.icon}
              </div>
              <div className="min-w-0">
                <span className={`text-[10px] font-bold block uppercase tracking-wider ${
                  activeStep === idx ? 'text-white/60' : 'text-gray-400'
                }`}>
                  Phase {step.id}
                </span>
                <span className="font-extrabold text-sm block truncate mt-0.5">{step.title}</span>
              </div>
            </div>

            <div className={`transition-transform duration-200 ${
              activeStep === idx ? 'translate-x-1.5 text-white' : 'text-gray-300'
            }`}>
              <FiChevronRight className="w-4 h-4" />
            </div>
          </button>
        ))}
      </div>

      {/* Right side: Dynamic demonstration details panel (7/12 width) */}
      <div className="lg:col-span-7 bg-white border border-gray-200 rounded-sm p-6 sm:p-8 flex flex-col justify-between shadow-xs">
        
        {/* Details and Tech labels */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3.5 border-gray-100">
            <div>
              <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest leading-none">
                {STEPS[activeStep].subtitle}
              </span>
              <h3 className="text-xl font-black text-gray-900 mt-1.5 leading-none">
                {STEPS[activeStep].title} Workflow
              </h3>
            </div>
            <span className="w-7 h-7 bg-gray-50 border border-gray-150 rounded-full flex items-center justify-center text-[10px] font-black text-gray-500">
              0{STEPS[activeStep].id}
            </span>
          </div>

          <p className="text-xs text-gray-600 font-medium leading-relaxed">
            {STEPS[activeStep].desc}
          </p>

          <div className="flex flex-wrap gap-2 pt-1.5">
            {STEPS[activeStep].tech.map(tag => (
              <span 
                key={tag} 
                className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Visual Mockup Illustration container */}
        <div className="mt-8 border-t border-gray-100 pt-6">
          {STEPS[activeStep].illustration}
        </div>

      </div>

    </div>
  );
};

export default HowItWorks;
