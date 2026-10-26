/**
 * pages/IssueWorkPage.jsx
 *
 * Full issue work view for a field worker:
 * - Title, status (auto-transitions ASSIGNED → IN_PROGRESS on first open)
 * - Description, address, report images, watcher count
 * - Proximity-gated camera capture:
 *     Worker must be within PROXIMITY_RADIUS metres of the issue location.
 *     Geolocation API verifies position, then opens the rear camera
 *     (getUserMedia) as a live viewfinder. A shutter button captures frames.
 * - Note field
 * - "Mark as Resolved" button
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';

import FieldWorker_Navbar from '../components/core/fieldworker/FieldWorker_Navbar';
import { FiCheckCircle } from 'react-icons/fi';

// Fix Leaflet default marker icons (Vite asset pipeline strips the URLs)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

/** Custom red site pin icon */
const SITE_ICON = new L.DivIcon({
  className: '',
  html: `<div style="
    width:32px;height:32px;border-radius:50% 50% 50% 0;
    background:#ef4444;border:3px solid #fff;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.45);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -34],
});

/** Max distance (metres) from the issue site to allow camera access */
const PROXIMITY_RADIUS = 200;

const CATEGORY_LABELS = {
  POTHOLE: '🕳️ Pothole', STREETLIGHT: '💡 Street Light', SEWAGE: '🚰 Sewage',
  GARBAGE: '🗑️ Garbage', WATER_SUPPLY: '💧 Water Supply', ROAD_DAMAGE: '🛣️ Road Damage',
  ENCROACHMENT: '🚧 Encroachment', STRAY_ANIMALS: '🐕 Stray Animals',
  DEAD_ANIMAL: '💀 Dead Animal', PUBLIC_TOILET: '🚻 Public Toilet',
  DRAIN_BLOCKAGE: '🚰 Drain Blockage', FALLEN_TREE: '🌳 Fallen Tree',
  ABANDONED_VEHICLE: '🚗 Abandoned Vehicle', AIR_POLLUTION: '🌫️ Air Pollution',
  OTHER: '📋 Other',
};

// ─── Cloudinary Upload ────────────────────────────────────────────────────────

async function uploadFileToCloudinary(file, signatureData) {
  const { signature, timestamp, folder, cloud_name, api_key } = signatureData;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', api_key);
  formData.append('timestamp', String(timestamp));
  formData.append('signature', signature);
  formData.append('folder', folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'Upload failed');
  return data.secure_url;
}

// ─── Proximity Helper ────────────────────────────────────────────────────────

/** Haversine formula — returns distance in metres between two lat/lng points */
function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Embedded Site Map ───────────────────────────────────────────────────────────

function SiteMap({ lat, lng, shortId, address }) {
  if (!lat || !lng) return null;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="border border-gray-200 rounded-sm overflow-hidden mt-4">
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        scrollWheelZoom={false}
        zoomControl={true}
        style={{ height: '220px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={SITE_ICON}>
          <Popup>
            <strong>{shortId}</strong><br />
            {address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`}
          </Popup>
        </Marker>
      </MapContainer>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 p-3 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-extrabold border-t border-sky-150 transition cursor-pointer text-center select-none"
      >
        🧭 Navigate to site (Google Maps)
      </a>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    ASSIGNED: { cls: 'bg-amber-50 text-amber-600 border-amber-100', label: '⏳ Assigned' },
    IN_PROGRESS: { cls: 'bg-blue-50 text-blue-600 border-blue-100', label: '🔧 In Progress' },
    RESOLVED: { cls: 'bg-green-50 text-green-600 border-green-100', label: '✅ Resolved' },
  };
  const s = map[status] || { cls: 'bg-gray-50 text-gray-650 border-gray-150', label: status };
  return <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border inline-block leading-none ${s.cls}`}>{s.label}</span>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function IssueWorkPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  
  // Persistent sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('fieldworker-sidebar-collapsed') === 'true');

  useEffect(() => {
    localStorage.setItem('fieldworker-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [localStatus, setLocalStatus] = useState(null);

  // Camera + geo state
  //   geoStatus: 'idle' | 'checking' | 'nearby' | 'far' | 'denied' | 'error'
  const [geoStatus, setGeoStatus] = useState('idle');
  const [distanceM, setDistanceM] = useState(null);   // metres from site
  const [fetchedCoords, setFetchedCoords] = useState(null); // { lat, lng, accuracy }
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Captured frames (for Cloudinary upload on resolve)
  const [previewFiles, setPreviewFiles] = useState([]); // { file:Blob, objectUrl }

  // Resolve state
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [resolveError, setResolveError] = useState('');

  // ── Load issue detail ────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    apiConnector('GET', endpoints.FW_ISSUE_DETAIL_API(id))
      .then((res) => {
        setData(res);
        setLocalStatus(res.issue.status);
      })
      .catch((err) => {
        console.error('[IssueWorkPage] load error:', err);
        if (err.status === 404) navigate('/field-worker', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  // ── Auto-start: transition ASSIGNED → IN_PROGRESS on page open ──────────────
  useEffect(() => {
    if (!data || data.issue.status !== 'ASSIGNED' || starting) return;

    setStarting(true);
    apiConnector('PATCH', endpoints.FW_START_API(id))
      .then(() => {
        setLocalStatus('IN_PROGRESS');
        // Also update the issue object in data so images section shows correct status
        setData((prev) => ({
          ...prev,
          issue: { ...prev.issue, status: 'IN_PROGRESS' },
        }));
      })
      .catch((err) => {
        // If it's already IN_PROGRESS (409/400) that's fine — just continue
        console.warn('[IssueWorkPage] start issue:', err?.data?.message);
      })
      .finally(() => setStarting(false));
  }, [data, id, starting]);

  // ── Stop camera stream helper (called on unmount + close) ───────────────────
  const stopStream = useCallback((s) => {
    if (s) s.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    return () => stopStream(stream); // cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  // ── Open camera stream ────────────────────────────────────────────────────────────
  async function openCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setCameraOn(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 100);
    } catch (camErr) {
      console.error('[camera]', camErr);
      setGeoStatus('error');
    }
  }

  // ── Check proximity → open camera ────────────────────────────────────────────
  async function verifyAndOpenCamera() {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      return;
    }
    setGeoStatus('checking');
    setFetchedCoords(null);
    setDistanceM(null);

    let bestPos = null;
    let watchId = null;
    let timeoutId = null;

    const clearActiveWatch = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timeoutId !== null) clearTimeout(timeoutId);
    };

    const processPosition = async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      
      // If we don't have a best position yet, or if this one has better accuracy (smaller accuracy value)
      if (!bestPos || accuracy < bestPos.coords.accuracy) {
        bestPos = pos;
        
        const dist = haversineMetres(
          latitude, longitude,
          Number(data.issue.lat), Number(data.issue.lng)
        );

        setDistanceM(Math.round(dist));
        setFetchedCoords({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy)
        });

        // If the accuracy is already excellent (< 25m), lock it in immediately and stop watching
        if (accuracy <= 25) {
          clearActiveWatch();
          await finalizeProximityCheck(pos);
        }
      }
    };

    const handleGeoError = (err) => {
      console.warn('[geolocation watch error]', err);
      if (bestPos) {
        clearActiveWatch();
        finalizeProximityCheck(bestPos);
      } else {
        clearActiveWatch();
        setGeoStatus(err.code === 1 ? 'denied' : 'error');
      }
    };

    // Start watching the location so it refines the accuracy
    watchId = navigator.geolocation.watchPosition(processPosition, handleGeoError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    // Give it up to 5.5 seconds to refine the GPS accuracy, then use the best one obtained
    timeoutId = setTimeout(async () => {
      clearActiveWatch();
      if (bestPos) {
        await finalizeProximityCheck(bestPos);
      } else {
        // Ultimate fallback: single quick try without strict high accuracy constraints
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await finalizeProximityCheck(pos);
          },
          (err) => {
            setGeoStatus(err.code === 1 ? 'denied' : 'error');
          },
          { enableHighAccuracy: false, timeout: 5000 }
        );
      }
    }, 5500);
  }

  async function finalizeProximityCheck(pos) {
    const dist = haversineMetres(
      pos.coords.latitude, pos.coords.longitude,
      Number(data.issue.lat), Number(data.issue.lng)
    );
    const distRounded = Math.round(dist);
    const accuracyRounded = Math.round(pos.coords.accuracy);

    setDistanceM(distRounded);
    setFetchedCoords({
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: accuracyRounded
    });

    // We allow matching if:
    // 1. Worker is within PROXIMITY_RADIUS (200m)
    // 2. Or the distance minus the GPS inaccuracy falls within the radius (dist - accuracy <= 200m)
    // 3. Or the distance is less than 300m threshold (account for urban block sizes)
    const withinAllowedLimit = dist <= PROXIMITY_RADIUS || (dist - pos.coords.accuracy) <= PROXIMITY_RADIUS || dist <= 300;

    if (withinAllowedLimit) {
      setGeoStatus('nearby');
      await openCamera();
    } else {
      setGeoStatus('far');
    }
  }

  // ── Close camera ─────────────────────────────────────────────────────────────
  function closeCamera() {
    stopStream(stream);
    setStream(null);
    setCameraOn(false);
    setGeoStatus('idle');
  }

  // ── Capture frame from live video ────────────────────────────────────────────
  function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    if (previewFiles.length >= 5) { alert('Maximum 5 photos allowed.'); return; }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const objectUrl = URL.createObjectURL(blob);
      setPreviewFiles((prev) => [...prev, { file: blob, objectUrl }]);
    }, 'image/jpeg', 0.88);
  }

  function removePreview(index) {
    setPreviewFiles((prev) => {
      URL.revokeObjectURL(prev[index].objectUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  // ── Mark as Resolved ─────────────────────────────────────────────────────────
  async function handleResolve() {
    setResolveError('');
    setUploading(true);

    try {
      let image_urls = [];

      // 1. Upload resolution images to Cloudinary if any
      if (previewFiles.length > 0) {
        const sigRes = await apiConnector('GET', endpoints.UPLOAD_SIGNATURE_API);

        image_urls = await Promise.all(
          previewFiles.map(({ file }) => uploadFileToCloudinary(file, sigRes))
        );
      }

      // 2. Call resolve endpoint
      await apiConnector('PATCH', endpoints.FW_RESOLVE_API(id), {
        image_urls,
        note: note.trim() || null,
      });

      // 3. Update local state to show resolved banner
      setLocalStatus('RESOLVED');
      setData((prev) => ({
        ...prev,
        issue: { ...prev.issue, status: 'RESOLVED' },
      }));
      setPreviewFiles([]);
      setNote('');
    } catch (err) {
      setResolveError(err?.data?.message || err.message || 'Failed to resolve issue.');
    } finally {
      setUploading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
        <FieldWorker_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
          <div className="fw-loading">
            <span className="spinner" style={{ width: 22, height: 22 }} /> Loading issue…
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { issue, images, watcher_count } = data;
  const status = localStatus || issue.status;
  const isResolved = status === 'RESOLVED';

  const reportImages = images.filter((img) => img.image_type === 'REPORT');
  const resolutionImages = images.filter((img) => img.image_type === 'RESOLUTION');

  return (
    <div className="flex min-h-screen bg-[#f3f5f9] text-gray-800 font-sans">
      {/* Sidebar Navigation */}
      <FieldWorker_Navbar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 pr-6 py-8 transition-all duration-300 ${isCollapsed ? 'md:pl-[118px]' : 'md:pl-[294px]'}`}>
        
        {/* Breadcrumb Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 border-gray-200 mb-6">
          <div>
            <button 
              onClick={() => navigate('/field-worker')}
              className="px-4.5 py-2.5 bg-white hover:bg-gray-50 text-gray-800 text-xs font-extrabold rounded-sm transition duration-150 flex items-center gap-1.5 border border-gray-200/80 shadow-xs cursor-pointer"
            >
              ← Back to Dashboard
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 bg-gray-100 px-2 py-1 rounded border border-gray-200/50">
              #{issue.short_id}
            </span>
            <StatusBadge status={status} />
            {starting && (
              <span className="text-[10px] text-amber-600 font-extrabold bg-amber-50 border border-amber-100 px-2 py-1 rounded-sm animate-pulse">
                Starting Work...
              </span>
            )}
          </div>
        </div>

        {/* Dashboard grid layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Details Card */}
            <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-xs space-y-5">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Complaint Category</span>
                <h2 className="text-lg font-black text-gray-905 leading-tight">
                  {CATEGORY_LABELS[issue.category] || issue.category}
                </h2>
              </div>

              {issue.description && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">📋 Description</h4>
                  <p className="text-xs text-gray-700 font-semibold bg-gray-50 p-3.5 rounded-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                    {issue.description}
                  </p>
                </div>
              )}

              {issue.address && (
                <div>
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">📍 Location Address</h4>
                  <p className="text-xs text-gray-700 font-bold bg-gray-50 p-3.5 rounded-sm shadow-sm">
                    {issue.address}
                  </p>
                </div>
              )}

              <SiteMap lat={issue.lat} lng={issue.lng} shortId={issue.short_id} address={issue.address} />
            </div>

            {/* Evidence Attachments Card */}
            {reportImages.length > 0 && (
              <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  📸 Citizen Evidence Attachments
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {reportImages.map((img) => (
                    <a 
                      key={img.id} 
                      href={img.image_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block border border-gray-200/80 rounded-sm overflow-hidden hover:border-blue-400 transition"
                    >
                      <img src={img.image_url} className="w-full h-24 sm:h-28 object-cover" alt="" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Verification & Proximity Photo Capturing Card */}
            {isResolved ? (
              <div className="bg-white p-6 rounded-sm border border-green-200 shadow-xs border-l-4 border-l-green-500 space-y-4">
                <div className="flex items-center gap-2 text-green-700 font-extrabold text-sm">
                  <FiCheckCircle className="w-5 h-5" />
                  <span>Task Marked as Completed</span>
                </div>
                {resolutionImages.length > 0 && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Resolution Photos</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {resolutionImages.map((img) => (
                        <a 
                          key={img.id} 
                          href={img.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block border border-gray-200 rounded-sm overflow-hidden hover:border-green-400 transition"
                        >
                          <img src={img.image_url} className="w-full h-24 sm:h-28 object-cover" alt="" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                {issue.resolution_note && (
                  <div>
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Resolution Note</h4>
                    <p className="text-xs font-semibold text-gray-700 bg-gray-50 border border-gray-150 p-3 rounded-sm italic whitespace-pre-wrap">
                      "{issue.resolution_note}"
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-sm border border-gray-200 shadow-xs space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  📸 Capture Site Resolution Photos (max 5)
                </h3>

                {/* GPS State: idle */}
                {geoStatus === 'idle' && (
                  <button 
                    onClick={verifyAndOpenCamera}
                    className="w-full py-3 bg-[#1e2a5a] hover:bg-[#2d3f82] text-white text-xs font-extrabold rounded-sm shadow-sm transition cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>📍 Verify Location &amp; Open Camera</span>
                  </button>
                )}

                {/* GPS State: checking */}
                {geoStatus === 'checking' && (
                  <div className="flex items-center justify-center gap-2 py-4 bg-gray-50 border border-gray-200 rounded-sm text-xs font-bold text-gray-500">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                    <span>Verifying GPS Proximity coordinates...</span>
                  </div>
                )}

                {/* GPS State: too far */}
                {geoStatus === 'far' && (
                  <div className="p-4 bg-red-50 border border-red-200/50 rounded-sm space-y-3">
                    <p className="text-xs font-bold text-red-700">
                      📍 Proximity Restriction: You are {distanceM?.toFixed(1)} metres away from the work site.
                    </p>
                    {fetchedCoords && (
                      <p className="text-[10px] text-red-550 font-medium">
                        Detected GPS position: {fetchedCoords.lat.toFixed(5)}, {fetchedCoords.lng.toFixed(5)} (±{fetchedCoords.accuracy.toFixed(1)}m precision)
                      </p>
                    )}
                    <p className="text-[11px] text-gray-650 font-semibold leading-relaxed">
                      Ranchi Municipal policy dictates you must be within {PROXIMITY_RADIUS} metres of the reported coordinates to capture resolution evidence photos.
                    </p>
                    <div className="flex gap-2 pt-1.5">
                      <button 
                        onClick={() => setGeoStatus('idle')}
                        className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200/70 text-red-700 text-[10px] font-extrabold rounded-sm transition cursor-pointer"
                      >
                        Try Again
                      </button>
                      <button 
                        onClick={async () => { setGeoStatus('nearby'); await openCamera(); }}
                        className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200/70 text-amber-700 text-[10px] font-extrabold rounded-sm transition cursor-pointer"
                      >
                        ⚠️ Override Proximity Check (GPS Drift)
                      </button>
                    </div>
                  </div>
                )}

                {/* GPS State: denied */}
                {geoStatus === 'denied' && (
                  <div className="p-4 bg-amber-50 border border-amber-200/50 rounded-sm space-y-2">
                    <p className="text-xs font-bold text-amber-700">🚫 Location Permission Denied</p>
                    <p className="text-[11px] text-gray-600 font-semibold">
                      Please grant location services permission in your web browser settings to verify proximity to the work site coordinates.
                    </p>
                    <button onClick={() => setGeoStatus('idle')} className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200/70 text-amber-700 text-[10px] font-extrabold rounded-sm transition cursor-pointer mt-1">
                      Retry Verification
                    </button>
                  </div>
                )}

                {/* GPS State: error */}
                {geoStatus === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-200/50 rounded-sm space-y-2">
                    <p className="text-xs font-bold text-red-700">⚠️ Location or Camera Access Error</p>
                    <button onClick={() => setGeoStatus('idle')} className="px-3.5 py-1.5 bg-red-100 hover:bg-red-200/70 text-red-700 text-[10px] font-extrabold rounded-sm transition cursor-pointer mt-1">
                      Retry
                    </button>
                  </div>
                )}

                {/* Camera Viewfinder Stream */}
                {cameraOn && (
                  <div className="border border-gray-200 rounded-sm overflow-hidden shadow-inner bg-black relative">
                    <div className="absolute top-2.5 left-2.5 z-10 bg-black/60 backdrop-blur-xs text-green-400 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border border-green-400/35">
                      📷 Live view &bull; Proximity Verified
                    </div>
                    <video ref={videoRef} className="w-full max-h-[300px] object-cover bg-black block" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="flex items-center justify-between p-3 bg-gray-900 border-t border-gray-800">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{previewFiles.length}/5 Captured</span>
                      <button 
                        onClick={captureFrame}
                        disabled={previewFiles.length >= 5}
                        className="w-12 h-12 rounded-full bg-white hover:bg-gray-150 border-4 border-gray-300 disabled:opacity-40 disabled:hover:bg-white text-xl flex items-center justify-center cursor-pointer shadow-md transform hover:scale-105 active:scale-95 transition"
                      >
                        📸
                      </button>
                      <button 
                        onClick={closeCamera}
                        className="px-3 py-1.5 bg-red-650 hover:bg-red-700 text-white text-[10px] font-extrabold rounded-sm transition cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>
                )}

                {/* Image Previews */}
                {previewFiles.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 pt-2">
                    {previewFiles.map((p, idx) => (
                      <div key={idx} className="relative aspect-square border border-gray-200 rounded-sm overflow-hidden group">
                        <img src={p.objectUrl} className="w-full h-full object-cover" alt="" />
                        <button 
                          onClick={() => removePreview(idx)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-650 hover:bg-red-750 text-white text-xs flex items-center justify-center cursor-pointer transition shadow-md"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Details Panel */}
            <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-xs space-y-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-none">Routed Department</span>
                <span className="font-extrabold text-sm text-[#1e2a5a] block mt-1.5">
                  🏢 {issue.assigned_admin_designation || 'General Wing'}
                </span>
              </div>

              <div className="pt-3.5 border-t border-gray-100 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Priority Score:</span>
                  <span className="font-extrabold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full text-[11px]">
                    {issue.priority_score}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Watchers:</span>
                  <span className="font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full text-[11px]">
                    {watcher_count} following
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-500">
                  <span>Report Date:</span>
                  <span className="font-bold text-gray-700 text-[11px]">
                    {new Date(issue.created_at).toLocaleDateString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Note & Resolve Button */}
            {!isResolved && (
              <div className="bg-white p-5 rounded-sm border border-gray-200 shadow-xs space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">📝 Resolution Notes</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={status !== 'IN_PROGRESS'}
                    placeholder="Enter details about the resolution work done..."
                    className="w-full bg-gray-50 border border-gray-200 text-xs font-semibold p-2.5 rounded-sm focus:outline-none placeholder-gray-400 focus:bg-white resize-none h-28"
                    maxLength={500}
                  />
                </div>

                {resolveError && (
                  <p className="text-xs text-red-650 font-bold bg-red-50 border border-red-100 p-2.5 rounded-sm">
                    ⚠️ {resolveError}
                  </p>
                )}

                <button
                  onClick={handleResolve}
                  disabled={uploading || status !== 'IN_PROGRESS'}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm shadow-sm transition cursor-pointer"
                >
                  {uploading 
                    ? `⏳ ${previewFiles.length > 0 ? 'Uploading Photos...' : 'Saving...'}`
                    : '✅ Mark as Resolved'}
                </button>

                {status === 'ASSIGNED' && !starting && (
                  <p className="text-[10px] text-amber-600 font-bold text-center bg-amber-50 border border-amber-100 p-2.5 rounded-sm">
                    Starting task automatically... Please wait.
                  </p>
                )}
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
