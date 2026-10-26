/**
 * components/complaint/Step4_ReviewForm.jsx
 *
 * Displays the read-only AI-generated complaint summary.
 * Review fields shown as "Label: value ✓" rows (reference image style).
 * On "Submit" → uploads images to Cloudinary → creates issue via POST /api/issues.
 * Redirects to /citizen/complaints on success.
 * MergeNotification redesigned as thumbs-up success screen.
 */
import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { resetComplaint , setShortID } from '../../slices/complaintSlice';
import { apiConnector } from '../../services/apiConnector';
import { endpoints } from '../../services/api';
import {
  FiEdit2, FiCheckCircle, FiAlertCircle, FiLoader, FiSend, FiFileText,
} from 'react-icons/fi';

const CATEGORY_LABELS = {
  POTHOLE:             '🕳️  Pothole',
  STREETLIGHT:         '💡 Street Light',
  SEWAGE:              '🚰 Sewage',
  GARBAGE:             '🗑️  Garbage',
  WATER_SUPPLY:        '💧 Water Supply',
  ROAD_DAMAGE:         '🛣️  Road Damage',
  ENCROACHMENT:        '🚧 Encroachment',
  STRAY_ANIMALS:       '🐕 Stray Animals',
  DEAD_ANIMAL:         '💀 Dead Animal',
  PUBLIC_TOILET:       '🚻 Public Toilet',
  DRAIN_BLOCKAGE:      '🚰 Drain Blockage',
  FALLEN_TREE:         '🌳 Fallen Tree',
  ABANDONED_VEHICLE:   '🚗 Abandoned Vehicle',
  AIR_POLLUTION:       '🌫️  Air Pollution',
  OTHER:               '📋 Other',
};

function SeverityBadge({ severity }) {
  const maps = {
    LOW:      { cls: 'bg-green-50 text-green-600 border-green-100',   icon: '🟢' },
    MEDIUM:   { cls: 'bg-amber-50 text-amber-600 border-amber-100',   icon: '🟡' },
    HIGH:     { cls: 'bg-orange-50 text-orange-600 border-orange-100', icon: '🟠' },
    CRITICAL: { cls: 'bg-red-50 text-red-650 border-red-100',         icon: '🔴' },
  };
  const s = maps[severity] || { cls: 'bg-gray-50 text-gray-500 border-gray-150', icon: '⬜' };
  return (
    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border inline-flex items-center gap-1 leading-none ${s.cls}`}>
      <span>{s.icon}</span>
      <span>{severity}</span>
    </span>
  );
}

function base64ToBlob(base64, mimeType) {
  const byteChars = atob(base64);
  const byteNums  = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNums[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNums)], { type: mimeType });
}

async function uploadToCloudinary(base64, mimeType, signatureData) {
  const { signature, timestamp, folder, cloud_name, api_key } = signatureData;
  const blob = base64ToBlob(base64, mimeType);
  const ext  = mimeType.split('/')[1] || 'jpg';

  const formData = new FormData();
  formData.append('file', blob, `upload.${ext}`);
  formData.append('api_key', api_key);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Image upload failed');
  return data.secure_url;
}

/* ─── Success/Merge screen ─────────────────────────────────────── */
function MergeNotification({ mergedIssue, onViewComplaints }) {
  return (
    <div className="text-center py-8 space-y-5 select-none">
      <div className="flex justify-center">
        <div className="relative">
          <span className="text-6xl">👍</span>
          <span className="absolute -top-1 -right-1 text-xl">✨</span>
          <span className="absolute top-0 -left-2 text-sm">✨</span>
        </div>
      </div>
      <div>
        <h2 className="font-black text-gray-900 text-[15px]">We've received your complaint!</h2>
        <p className="text-[11px] text-gray-500 font-semibold mt-2 max-w-xs mx-auto leading-relaxed">
          Your report was merged with existing tracked issue{' '}
          <strong className="text-[#1e2a5a]">#{mergedIssue?.issue?.short_id}</strong>.
          Seen by <strong>{mergedIssue?.report_count}</strong> citizens — its priority has been boosted.
        </p>
      </div>
      <button
        className="px-6 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-bold rounded-sm transition cursor-pointer inline-flex items-center gap-1.5"
        onClick={onViewComplaints}
      >
        <FiFileText className="w-3.5 h-3.5" />
        <span>View My Complaints</span>
      </button>
    </div>
  );
}

/* ─── Main review step ──────────────────────────────────────────── */
export default function Step4_ReviewForm({ onNext , onBack, onGoToStep }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { aiResult, images, location, description } =
    useSelector((s) => s.complaint);

  const [submitting,        setSubmitting]        = useState(false);
  const [error,             setError]             = useState(null);
  const [mergedIssue,       setMergedIssue]       = useState(null);
  const [submitted,         setSubmitted]         = useState(null); // { short_id }
  // Tracks which description will be submitted: 'user' | 'ai'
  const [descriptionSource, setDescriptionSource] = useState('user');

  if (!aiResult) return null;

  const activeDescription = descriptionSource === 'ai'
    ? aiResult.ai_description
    : description;

  if (mergedIssue) {
    return (
      <MergeNotification
        mergedIssue={mergedIssue}
        onViewComplaints={() => {
          dispatch(resetComplaint());
          navigate('/citizen/complaints', { replace: true });
        }}
      />
    );
  }

  // ── New issue successfully submitted ──────────────────────────────────────
  // if (submitted) {
  //   return (
      
  //   );
  // }

  const confidencePct = Math.round((aiResult.confidence ?? 0) * 100);

  /* Reusable label:value row — edit button appears on hover */
  function ReviewRow({ label, value, stepIndex, children }) {
    return (
      <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 group">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide w-28 shrink-0 mt-0.5">
          {label}
        </span>
        <div className="flex-1 min-w-0">
          {children ?? (
            <span className="text-[11px] font-semibold text-gray-800">{value}</span>
          )}
        </div>
        <button
          onClick={() => onGoToStep(stepIndex)}
          className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-gray-300 hover:text-[#1e2a5a] opacity-0 group-hover:opacity-100 transition cursor-pointer"
          title={`Edit ${label}`}
        >
          <FiEdit2 className="w-3 h-3" /> Edit
        </button>
        <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
      </div>
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
  
    try {
      const sigData = await apiConnector('GET', endpoints.UPLOAD_SIGNATURE_API);

      const imageUrls = await Promise.all(
        images.map((img) => uploadToCloudinary(img.base64, img.mimeType, sigData))
      );

      const result = await apiConnector('POST', endpoints.CREATE_ISSUE_API, {
        category:    aiResult.category   || 'OTHER',
        department:  aiResult.department || null,
        description: activeDescription   || aiResult.ai_description,
        lat:         location.lat,
        lng:         location.lng,
        address:     location.address    || '',
        image_urls:  imageUrls,
      });

      if (result.merged) {
        setMergedIssue(result);
      } else {
        setSubmitted({ short_id: result.issue?.short_id });
        dispatch(setShortID(result.issue?.short_id))

        onNext()
      }
    } catch (err) {
      const message = err?.data?.message || err?.message || '';
      setError(message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      {/* Heading */}
      <div className="mb-5">
        <h2 className="font-black text-gray-900 text-[15px] uppercase tracking-wide">Review Your Complaint</h2>
        <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
          AI-filled. Hover any row and click <em>Edit</em> to change it.
        </p>
      </div>

      {/* Review table */}
      <div className="border border-gray-200 rounded-sm overflow-hidden mb-5">

        {/* Evidence photos */}
        <ReviewRow label="Evidence" stepIndex={1}>
          <div className="flex gap-2 flex-wrap">
            {images.map((img, idx) => (
              <img
                key={idx}
                className="w-10 h-10 rounded-sm object-cover border border-gray-200 shrink-0"
                src={img.previewUrl}
                alt={`Photo ${idx + 1}`}
              />
            ))}
          </div>
        </ReviewRow>

        <ReviewRow
          label="Department"
          value={`🏢 ${aiResult.department || aiResult.category || 'Unclassified'}`}
          stepIndex={1}
        />

        <ReviewRow
          label="Category"
          value={CATEGORY_LABELS[aiResult.category] || aiResult.category || 'Other'}
          stepIndex={1}
        />

        <ReviewRow label="Severity" stepIndex={1}>
          <SeverityBadge severity={aiResult.severity} />
        </ReviewRow>

        <ReviewRow label="AI Confidence" stepIndex={1}>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1e2a5a] rounded-full transition-all duration-500"
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <span className="text-[10px] font-black text-gray-600">{confidencePct}%</span>
          </div>
        </ReviewRow>

        <ReviewRow label="AI Title" value={aiResult.title} stepIndex={3} />

        {/* AI Description — shown with option to use it as the submitted description */}
        {aiResult.ai_description && (
          <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide w-28 shrink-0 mt-0.5">
              AI Description
            </span>
            <div className="flex-1 min-w-0 space-y-2">
              <p className="text-[11px] font-semibold text-gray-700 leading-relaxed">
                {aiResult.ai_description}
              </p>
              {descriptionSource === 'user' ? (
                <button
                  onClick={() => setDescriptionSource('ai')}
                  className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#1e2a5a] bg-[#1e2a5a]/5 hover:bg-[#1e2a5a]/10 border border-[#1e2a5a]/15 px-2.5 py-1 rounded-sm transition cursor-pointer uppercase tracking-wide"
                >
                  Use AI description
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-sm uppercase tracking-wide">
                  <FiCheckCircle className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
          </div>
        )}

        <ReviewRow
          label="Location"
          value={location?.address || `${location?.lat?.toFixed(6)}, ${location?.lng?.toFixed(6)}`}
          stepIndex={2}
        />

        {/* Your Description — shows toggle back to user description when AI is active */}
        <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 group">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide w-28 shrink-0 mt-0.5">
            Your Description
          </span>
          <div className="flex-1 min-w-0 space-y-2">
            <p className={`text-[11px] font-semibold leading-relaxed whitespace-pre-wrap ${descriptionSource === 'ai' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
              {description || '—'}
            </p>
            {descriptionSource === 'ai' && (
              <button
                onClick={() => setDescriptionSource('user')}
                className="inline-flex items-center gap-1 text-[10px] font-extrabold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-2.5 py-1 rounded-sm transition cursor-pointer uppercase tracking-wide"
              >
                Use my description instead
              </button>
            )}
          </div>
          <button
            onClick={() => onGoToStep(3)}
            className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-gray-300 hover:text-[#1e2a5a] opacity-0 group-hover:opacity-100 transition cursor-pointer"
            title="Edit description"
          >
            <FiEdit2 className="w-3 h-3" /> Edit
          </button>
          <FiCheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${descriptionSource === 'user' ? 'text-emerald-400' : 'text-gray-300'}`} />
        </div>

      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-sm mb-4" role="alert">
          <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <p>{error}</p>
        </div>
      )}

      {/* Submit button */}
      <button
        className="w-full py-3 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-sm transition cursor-pointer flex items-center justify-center gap-1.5"
        onClick={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <><FiLoader className="w-3.5 h-3.5 animate-spin" /><span>Submitting Complaint…</span></>
        ) : (
          <><FiSend className="w-3.5 h-3.5" /><span>Submit Complaint</span></>
        )}
      </button>

      {/* Back nav */}
      <div className="flex justify-start pt-4 mt-3 border-t border-gray-100">
        <button
          id="complaint-step4-back"
          className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-sm border border-gray-200 transition cursor-pointer"
          onClick={onBack}
          disabled={submitting}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
