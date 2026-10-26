/**
 * components/complaint/Step1_ImageCapture.jsx
 *
 * Responsibilities:
 *  1. Detect mobile vs desktop to show camera / file picker.
 *  2. Support multiple images (up to 5).
 *  3. Convert selected files → preview URL + base64.
 *  4. Call POST /api/complaints/analyze (primary image) on Next click.
 *  5. On rejection → show inline banner, wizard does NOT advance.
 *  6. On success → store AI result in Redux, advance to step 2.
 *  7. Redesigned to pure Tailwind CSS.
 */
import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addImage, removeImage, setAiResult } from '../../slices/complaintSlice';
import { endpoints } from '../../services/api';
import { apiConnector } from '../../services/apiConnector';
import { FiCamera, FiImage, FiPlus, FiX, FiAlertCircle, FiLoader, FiArrowRight } from 'react-icons/fi';

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const MAX_IMAGES = 5;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64  = dataUrl.split(',')[1];
      const preview = URL.createObjectURL(file);
      resolve({ base64, preview, mimeType: file.type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Step1_ImageCapture({ onNext }) {
  const dispatch = useDispatch();
  const { images } = useSelector((s) => s.complaint);

  const fileInputRef = useRef(null);
  const [loading, setLoading]     = useState(false);
  const [rejection, setRejection] = useState(null);

  const hasImages = images.length > 0;
  const canAddMore = images.length < MAX_IMAGES;

  function triggerFilePicker() {
    if (!loading) fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setRejection(null);

    for (const file of files) {
      if (images.length >= MAX_IMAGES) break;
      try {
        const { base64, preview, mimeType } = await readFile(file);
        dispatch(addImage({ previewUrl: preview, base64, mimeType }));
      } catch {
        setRejection('Could not read one of the selected files. Please try a different image.');
      }
    }

    e.target.value = '';
  }

  function handleRemove(idx) {
    dispatch(removeImage(idx));
    setRejection(null);
  }

  async function handleNext() {
    if (!hasImages) return;

    setLoading(true);
    setRejection(null);

    try {
      const result = await apiConnector('POST', endpoints.ANALYZE_COMPLAINT_API, {
        images: images.map((img) => ({ imageBase64: img.base64, mimeType: img.mimeType })),
        description: '',
        location: null,
      });

      if (!result.is_valid_civic_issue) {
        setRejection(result.rejection_reason || 'The image does not appear to show a civic issue. Please upload a different image.');
        setLoading(false);
        return;
      }

      dispatch(setAiResult(result));
      onNext();
    } catch (err) {
      const status  = err?.status;
      const message = err?.data?.message || err?.message || '';
      if (status === 429 || message.toLowerCase().includes('rate-limit') || message.toLowerCase().includes('rate limited')) {
        setRejection('The AI service is temporarily busy. Please wait 30 seconds and try again.');
      } else if (status === 503 || status === 500 || message.includes('404') || message.includes('not found')) {
        setRejection('Our AI assistant is currently unavailable. Please try again in a moment.');
      } else {
        setRejection('Our AI assistant couldn\'t process your image right now. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Section heading row */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">Evidence Photos</h2>
          <p className="text-[11px] text-gray-400 font-semibold mt-0.5">
            {isMobile ? 'Take clear photos of the civic issue.' : 'Upload clear photos of the civic issue from your device.'}
            &nbsp;Up to {MAX_IMAGES} images · JPG, PNG, WEBP
          </p>
        </div>
        {hasImages && canAddMore && (
          <button
            onClick={triggerFilePicker}
            disabled={loading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 text-[10px] font-bold text-gray-500 hover:border-[#1e2a5a] hover:text-[#1e2a5a] rounded-sm transition cursor-pointer"
          >
            <FiPlus className="w-3 h-3" /> Add Photo
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        id="complaint-image-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={isMobile ? 'environment' : undefined}
        multiple={!isMobile}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Image preview strip */}
      {hasImages ? (
        <div className="border border-gray-200 rounded-sm p-3 space-y-2 mb-5">
          {images.map((img, idx) => (
            <div key={idx} className="flex items-center gap-3 group">
              {/* Thumbnail */}
              <div className="w-12 h-12 rounded-sm overflow-hidden border border-gray-200 shrink-0">
                <img src={img.previewUrl} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover" />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-800 truncate">
                  Photo {idx + 1}
                  {idx === 0 && (
                    <span className="ml-2 text-[9px] font-extrabold uppercase text-[#1e2a5a] bg-[#1e2a5a]/10 px-1.5 py-0.5 rounded">
                      Primary
                    </span>
                  )}
                </p>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">Ready for AI verification</p>
              </div>
              {/* Remove */}
              <button
                onClick={() => handleRemove(idx)}
                disabled={loading}
                className="text-gray-300 hover:text-red-500 transition cursor-pointer p-1 rounded focus:outline-none"
                aria-label={`Remove photo ${idx + 1}`}
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        /* Drop zone — reference image style */
        <div
          className="border-2 border-dashed border-gray-300 hover:border-[#1e2a5a] rounded-sm p-10 text-center cursor-pointer transition-colors duration-200 mb-5"
          onClick={triggerFilePicker}
          role="button"
          tabIndex={0}
          aria-label="Click to select images"
          onKeyDown={(e) => e.key === 'Enter' && triggerFilePicker()}
        >
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-[#1e2a5a]/8 flex items-center justify-center">
              {isMobile
                ? <FiCamera className="w-6 h-6 text-[#1e2a5a]" />
                : <FiImage className="w-6 h-6 text-[#1e2a5a]" />
              }
            </div>
          </div>
          <p className="text-xs font-bold text-gray-700">
            <span className="underline text-[#1e2a5a] cursor-pointer">
              {isMobile ? 'Tap to open camera' : 'Click to upload'}
            </span>
            {!isMobile && ' or drag and drop'}
          </p>
          <span className="text-[10px] text-gray-400 font-semibold block mt-1">
            JPG, PNG, WEBP up to 10MB
          </span>
        </div>
      )}

      {/* AI validation loading */}
      {loading && (
        <div className="flex items-center gap-2.5 px-4.5 py-3.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold rounded-sm mt-5 shadow-xs select-none">
          <FiLoader className="w-4 h-4 animate-spin shrink-0" />
          <span>Our AI assistant is verifying the image...</span>
        </div>
      )}

      {/* Rejection banner */}
      {rejection && !loading && (
        <div className="flex items-start gap-2.5 px-4.5 py-3.5 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-sm mt-5" role="alert">
          <FiAlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <p>{rejection}</p>
        </div>
      )}

      {/* Nav */}
      <div className="flex justify-end pt-5 mt-2 border-t border-gray-100">
        <button
          id="complaint-step1-next"
          className="px-6 py-2.5 bg-[#1e2a5a] hover:bg-[#2d3f82] disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-xs font-bold rounded-sm transition cursor-pointer flex items-center gap-1.5"
          onClick={handleNext}
          disabled={!hasImages || loading}
        >
          {loading ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <>
              <span>Verify &amp; Continue</span>
              <FiArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
