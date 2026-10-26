/**
 * components/complaint/Step3_Description.jsx
 *
 * Responsibilities:
 *  1. Category quick-select chips (pre-filled from AI result).
 *  2. Text area for user to describe the issue (20–500 chars).
 *  3. On Next: dispatch description, call /analyze again with full context
 *     (image + description + location) to enrich the AI result, then advance.
 */
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setDescription, setAiResult } from '../../slices/complaintSlice';
import { endpoints } from '../../services/api';
import { apiConnector } from '../../services/apiConnector';
import { FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi';

const MIN_CHARS = 20;
const MAX_CHARS = 500;

const CATEGORIES = [
  { key: 'POTHOLE',           label: '🕳️ Pothole'            },
  { key: 'STREETLIGHT',       label: '💡 Street Light'        },
  { key: 'SEWAGE',            label: '🚰 Sewage'              },
  { key: 'GARBAGE',           label: '🗑️ Garbage'             },
  { key: 'WATER_SUPPLY',      label: '💧 Water Supply'        },
  { key: 'ROAD_DAMAGE',       label: '🛣️ Road Damage'         },
  { key: 'ENCROACHMENT',      label: '🚧 Encroachment'        },
  { key: 'STRAY_ANIMALS',     label: '🐕 Stray Animals'       },
  { key: 'DEAD_ANIMAL',       label: '💀 Dead Animal'         },
  { key: 'PUBLIC_TOILET',     label: '🚻 Public Toilet'       },
  { key: 'DRAIN_BLOCKAGE',    label: '🌊 Drain Blockage'      },
  { key: 'FALLEN_TREE',       label: '🌳 Fallen Tree'         },
  { key: 'ABANDONED_VEHICLE', label: '🚗 Abandoned Vehicle'   },
  { key: 'AIR_POLLUTION',     label: '🌫️ Air Pollution'       },
  { key: 'OTHER',             label: '📋 Other'               },
];

export default function Step3_Description({ onNext, onBack }) {
  const dispatch = useDispatch();
  const { description: savedDesc, images, location, aiResult } =
    useSelector((s) => s.complaint);

  const [text,     setText]     = useState(savedDesc ?? '');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  // Pre-select category from AI result if available
  const [category, setCategory] = useState(aiResult?.category ?? '');

  const charCount = text.length;
  const isReady   = charCount >= MIN_CHARS;

  async function handleNext() {
    if (!isReady) return;
    setLoading(true);
    setError(null);
    dispatch(setDescription(text));

    try {
      const payload = {
        images: images.map((img) => ({ imageBase64: img.base64, mimeType: img.mimeType })),
        description: text,
        location,
      };
      const result = await apiConnector('POST', endpoints.ANALYZE_COMPLAINT_API, payload);
      dispatch(setAiResult(result));
      onNext();
    } catch (err) {
      const status  = err?.status;
      const message = err?.data?.message || err?.message || '';
      if (status === 429 || message.toLowerCase().includes('rate-limit') || message.toLowerCase().includes('rate limited')) {
        setError('The AI service is temporarily busy. Please wait 30 seconds and try again.');
      } else if (status === 503 || status === 500 || message.includes('404') || message.includes('not found')) {
        setError('Our AI assistant is currently unavailable. Please try again in a moment.');
      } else {
        setError("Our AI assistant couldn't analyse your complaint right now. Please try again shortly.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-5">
        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Describe the Issue</h2>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
          Tell us about the problem. Include how it affects daily life, how long it's been there, or any safety concerns.
        </p>
      </div>

      {/* Category chips */}
      <div className="mb-5">
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Suggestions</p>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => setCategory(category === cat.key ? '' : cat.key)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded border transition cursor-pointer
                ${category === cat.key
                  ? 'bg-[#1e2a5a] border-[#1e2a5a] text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-[#1e2a5a]/40 hover:text-[#1e2a5a]'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description textarea — labelled row style */}
      <div className="border border-gray-200 rounded-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Description</span>
        </div>
        <textarea
          id="complaint-description-input"
          className="w-full text-[11px] font-semibold text-gray-800 px-4 py-3 focus:outline-none placeholder-gray-400 resize-none h-32 bg-white"
          placeholder="e.g. There is a large pothole near the bus stop on MG Road that has been there for over two weeks. Two-wheelers have already fallen due to it…"
          maxLength={MAX_CHARS}
          value={text}
          onChange={(e) => { setText(e.target.value); setError(null); }}
          disabled={loading}
          aria-label="Issue description"
        />
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/60 flex items-center justify-between">
          <span className={`text-[9px] font-bold ${charCount >= MIN_CHARS ? 'text-emerald-600' : 'text-gray-400'}`}>
            {charCount < MIN_CHARS ? `${MIN_CHARS - charCount} more characters needed` : 'Minimum reached ✓'}
          </span>
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${charCount >= MIN_CHARS ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            {charCount}/{MAX_CHARS}
          </span>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-sm mt-4" role="alert">
          <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-between pt-5 mt-4 border-t border-gray-100">
        <button
          id="complaint-step3-back"
          className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-sm border border-gray-200 transition cursor-pointer"
          onClick={onBack}
        >
          ← Back
        </button>
        <button
          id="complaint-step3-next"
          className="px-6 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-sm transition cursor-pointer flex items-center gap-1.5"
          onClick={handleNext}
          disabled={!isReady || loading}
        >
          {loading ? (
            <>
              <FiLoader className="w-3.5 h-3.5 animate-spin" />
              <span>Analysing…</span>
            </>
          ) : (
            <>
              <span>Generate Review</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

