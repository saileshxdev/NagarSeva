import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { apiConnector } from '../../../services/apiConnector';
import { endpoints } from '../../../services/api';
import AuditLogs from '../../common/AuditLogs';
import { 
  FiMapPin, 
  FiUsers, 
  FiCalendar, 
  FiRefreshCw, 
  FiInfo,
  FiUser,
  FiBarChart2,
  FiAward
} from 'react-icons/fi';

// Fix Leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const CATEGORY_LABELS = {
  POTHOLE: '🕳️ Pothole',
  STREETLIGHT: '💡 Street Light',
  SEWAGE: '🚰 Sewage',
  GARBAGE: '🗑️ Garbage',
  WATER_SUPPLY: '💧 Water Supply',
  ROAD_DAMAGE: '🛣️ Road Damage',
  ENCROACHMENT: '🚧 Encroachment',
  STRAY_ANIMALS: '🐕 Stray Animals',
  DEAD_ANIMAL: '💀 Dead Animal',
  PUBLIC_TOILET: '🚻 Public Toilet',
  DRAIN_BLOCKAGE: '🚰 Drain Blockage',
  FALLEN_TREE: '🌳 Fallen Tree',
  ABANDONED_VEHICLE: '🚗 Abandoned Vehicle',
  AIR_POLLUTION: '🌫️ Air Pollution',
  OTHER: '📋 Other',
};

function WorkloadBadge({ count }) {
  const isBusy = count > 4;
  const isModerate = count > 2 && count <= 4;
  
  if (isBusy) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600 border border-red-100">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 inline-block animate-pulse"></span>
        {count} Active
      </span>
    );
  }
  if (isModerate) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 inline-block"></span>
        {count} Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-600 border border-green-100">
      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 inline-block"></span>
      {count} Active
    </span>
  );
}

const IssueDetailsModal = ({ issueId, onClose, workers = [], onAssign }) => {
  const [detailedIssue, setDetailedIssue] = useState(null);
  const [modalLoading, setModalLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Drag resizing height state for worker list
  const [assignPanelHeight, setAssignPanelHeight] = useState(160);
  const isDragging = useRef(false);

  const resizePanel = useCallback((e) => {
    if (!isDragging.current) return;
    const container = document.getElementById('assign-panel-modal');
    if (container) {
      const rect = container.getBoundingClientRect();
      const newHeight = rect.bottom - e.clientY;
      setAssignPanelHeight(Math.max(0, Math.min(450, newHeight)));
    }
  }, []);

  const stopResize = useCallback(() => {
    isDragging.current = false;
    document.removeEventListener('mousemove', resizePanel);
    document.removeEventListener('mouseup', stopResize);
  }, [resizePanel]);

  const startResize = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    document.addEventListener('mousemove', resizePanel);
    document.addEventListener('mouseup', stopResize);
  }, [resizePanel, stopResize]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', resizePanel);
      document.removeEventListener('mouseup', stopResize);
    };
  }, [resizePanel, stopResize]);

  useEffect(() => {
    if (!issueId) {
      setDetailedIssue(null);
      setShowAssignForm(false);
      return;
    }
    setModalLoading(true);
    apiConnector('GET', endpoints.ADMIN_ISSUE_DETAIL_API(issueId))
      .then((res) => {
        setDetailedIssue(res);
      })
      .catch((err) => {
        console.error('[IssueDetailsModal] fetch error:', err);
        alert('Failed to load issue details.');
        onClose();
      })
      .finally(() => {
        setModalLoading(false);
      });
  }, [issueId, onClose]);

  const handleWorkerAssignment = async (workerId) => {
    setActionLoading(true);
    try {
      await onAssign(issueId, workerId);
      onClose();
    } catch (err) {
      console.error('[IssueDetailsModal] assign error:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!issueId) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-sm border border-gray-200 shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600/10 border border-blue-100 text-blue-600">
              <FiInfo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-lg leading-none">
                {detailedIssue ? (CATEGORY_LABELS[detailedIssue.issue.category] || detailedIssue.issue.category) : 'Loading Issue...'}
              </h3>
              {detailedIssue && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400 mt-1 block">
                  ID: #{detailedIssue.issue.short_id}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition duration-150 cursor-pointer"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/30">
          {modalLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-blue-600/25 border-t-blue-600 rounded-full animate-spin"></div>
              <span className="text-sm font-semibold text-gray-500 mt-3 animate-pulse">Loading details...</span>
            </div>
          ) : detailedIssue ? (
            <div className="grid grid-cols-1 gap-6">
              
              {/* Left Column: Media & Primary Info (2/3 width) */}
              <div className="space-y-6">
                
                {/* Images Section */}
                <div className="bg-white p-5 rounded-md shadow-md">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Images Attached</h4>
                  {detailedIssue.images.length === 0 ? (
                    <div className="bg-gray-50 rounded-xl border border-gray-150/60 py-10 text-center text-sm text-gray-500 font-medium">
                      No images attached to this complaint.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {detailedIssue.images.map((img) => (
                        <a 
                          key={img.id}
                          href={img.image_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-sm overflow-hidden bg-gray-100 group cursor-pointer block shadow-sm"
                        >
                          <img 
                            src={img.image_url} 
                            alt="Issue Attachment" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                          />
                          <span className="absolute bottom-2 left-2 text-[9px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded border border-white/10 uppercase">
                            {img.image_type}
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description Section */}
                <div className="bg-white p-5 rounded-md shadow-md">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detailed Description</h4>
                  <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                    {detailedIssue.issue.description || 'No detailed description was provided by the reporter.'}
                  </div>
                </div>

                {/* Status Audit Trail Logs */}
                <div className="bg-white p-5 rounded-md shadow-md">
                  <AuditLogs issueId={detailedIssue.issue.id} />
                </div>

              </div>

              {/* Right Column: Map & Metadata Sidebar (1/3 width) */}
              <div className="lg:col-span-1 space-y-6">
                
                {/* Map & Coordinates */}
                <div className="bg-white p-5 rounded-md  shadow-md space-y-4">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Geographic Location</h4>
                  
                  {/* Leaflet Map */}
                  {detailedIssue.issue.lat && detailedIssue.issue.lng ? (
                    <div className="rounded-sm overflow-hidden border border-gray-200/80 shadow-inner">
                      <MapContainer
                        key={`${detailedIssue.issue.lat}-${detailedIssue.issue.lng}`}
                        center={[detailedIssue.issue.lat, detailedIssue.issue.lng]}
                        zoom={16}
                        scrollWheelZoom={false}
                        style={{ height: '180px', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <Marker position={[detailedIssue.issue.lat, detailedIssue.issue.lng]}>
                          <Popup>
                            <strong className="text-xs">{detailedIssue.issue.short_id}</strong><br />
                            <span className="text-[10px] text-gray-500">{detailedIssue.issue.address || 'Reported Location'}</span>
                          </Popup>
                        </Marker>
                      </MapContainer>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${detailedIssue.issue.lat},${detailedIssue.issue.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold border-t border-gray-150 flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                      >
                        🧭 Navigate to site (Google Maps)
                      </a>
                    </div>
                  ) : (
                    <div className="bg-gray-50 py-10 rounded-xl border border-gray-150 text-center text-xs text-gray-400 font-bold">
                      No GPS Coordinates Available
                    </div>
                  )}

                  {/* Address */}
                  <div className="text-xs text-gray-700 bg-gray-50/50 p-3 rounded-sm flex items-center gap-2 shadow-sm">
                    <FiMapPin className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">Reported Address</span>
                      <span className="leading-relaxed block font-medium text-gray-600">{detailedIssue.issue.address || 'No location address provided.'}</span>
                    </div>
                  </div>
                </div>

                {/* Metadata Card */}
                <div className="bg-white p-5 rounded-md shadow-md space-y-3.5">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Triage Metadata</h4>
                  
                  {/* Priority, Ward, Report Count */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-red-50/60 border border-red-100 p-2.5 rounded-sm text-center">
                      <span className="text-[9px] font-bold text-red-500 uppercase tracking-wider block">Priority Score</span>
                      <span className="text-lg font-black text-red-700 block mt-0.5">{detailedIssue.issue.priority_score}</span>
                    </div>
                    <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-sm text-center">
                      <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wider block">Ward No.</span>
                      <span className="text-lg font-black text-blue-700 block mt-0.5">{detailedIssue.issue.ward || '—'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                      <span className="flex items-center gap-1.5"><FiUsers className="w-3.5 h-3.5 text-gray-400" /> Total Reports</span>
                      <span className="text-gray-900">{detailedIssue.issue.report_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                      <span className="flex items-center gap-1.5"><FiCalendar className="w-3.5 h-3.5 text-gray-400" /> Date Created</span>
                      <span className="text-gray-900">{new Date(detailedIssue.issue.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-gray-600">
                      <span className="flex items-center gap-1.5"><FiRefreshCw className="w-3.5 h-3.5 text-gray-400" /> Last Updated</span>
                      <span className="text-gray-900">{new Date(detailedIssue.issue.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : (
            <p className="text-center text-sm text-gray-500 py-10">Failed to load issue details.</p>
          )}
        </div>

        {/* Footer / Worker Allocation Grid */}
        {detailedIssue && (
          <div className="px-6 py-4.5 border-t border-gray-100 bg-gray-100 flex flex-col gap-3">
            
            {/* Mode A: Issue status is ASSIGNED (Home Dashboard view) */}
            {detailedIssue.issue.status === 'ASSIGNED' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Allocate Field Worker</span>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100/50 uppercase tracking-wide">
                    Status: {detailedIssue.issue.status}
                  </span>
                </div>

                {/* Drag handle line for cursor height adjustment */}
                <div 
                  onMouseDown={startResize}
                  className="h-2 cursor-ns-resize bg-gray-200 hover:bg-blue-400 rounded-full flex items-center justify-center transition-colors duration-150 group"
                  title="Drag up or down to adjust assignment panel height"
                >
                  <div className="w-10 h-1 bg-gray-400 group-hover:bg-white rounded-full transition-colors"></div>
                </div>

                {/* Select assignment panel */}
                <div 
                  id="assign-panel-modal"
                  style={{ height: `${assignPanelHeight}px` }}
                  className="flex flex-col gap-2 overflow-y-auto pr-1 border border-gray-200/50 rounded-xl p-1.5 bg-gray-50/20"
                >
                  {workers.length === 0 ? (
                    <p className="text-xs text-gray-500 font-medium py-2">No workers available in this department.</p>
                  ) : (
                    workers.map((worker) => (
                      <div 
                        key={worker.id} 
                        className="bg-white p-2.5 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3 hover:border-blue-200 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-gray-900 truncate block">{worker.name}</span>
                            {worker.designation && (
                              <span className="text-[9px] font-semibold text-gray-400 bg-gray-50 border px-1 rounded">
                                {worker.designation}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-medium">
                            <span>Score: <strong className="text-blue-600 font-bold">{worker.worker_score}</strong></span>
                            <span>&bull;</span>
                            <WorkloadBadge count={worker.active_count} />
                          </div>
                        </div>
                        <button
                          onClick={() => handleWorkerAssignment(worker.id)}
                          disabled={actionLoading}
                          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                        >
                          Assign Worker
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Mode B: Issue status is IN_PROGRESS, RESOLVED, NOT_SATISFIED, or REJECTED */}
            {detailedIssue.issue.status !== 'ASSIGNED' && (
              <>
                {/* Active Worker Profile (if detailedIssue contains worker info) */}
                {detailedIssue.issue.worker_name && (
                  <div className="bg-white p-3.5 rounded-md border border-gray-200 flex items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                        <FiUser className="w-4.5 h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block leading-none">Allocated Worker</span>
                        <span className="text-xs font-extrabold text-gray-900 mt-1 block leading-tight">{detailedIssue.issue.worker_name}</span>
                        <span className="text-[10px] text-gray-505 mt-0.5 block font-mono leading-none">{detailedIssue.issue.worker_email}</span>
                      </div>
                    </div>
                    {detailedIssue.issue.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => setShowAssignForm(!showAssignForm)}
                        className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-250 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {showAssignForm ? 'Cancel Reallocation' : 'Reassign Worker'}
                      </button>
                    )}
                  </div>
                )}

                {/* Show Reassignment list for IN_PROGRESS reallocations */}
                {(detailedIssue.issue.status === 'IN_PROGRESS' && (!detailedIssue.issue.worker_name || showAssignForm)) && (
                  <>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reallocate Field Worker</span>
                    </div>

                    {/* Drag handle line for cursor height adjustment */}
                    <div 
                      onMouseDown={startResize}
                      className="h-2 cursor-ns-resize bg-gray-200 hover:bg-blue-400 rounded-full flex items-center justify-center transition-colors duration-150 group"
                      title="Drag up or down to adjust assignment panel height"
                    >
                      <div className="w-10 h-1 bg-gray-400 group-hover:bg-white rounded-full transition-colors"></div>
                    </div>

                    {/* Select assignment panel */}
                    <div 
                      id="assign-panel-modal"
                      style={{ height: `${assignPanelHeight}px` }}
                      className="flex flex-col gap-2 overflow-y-auto pr-1 border border-gray-200/50 rounded-xl p-1.5 bg-gray-50/20"
                    >
                      {workers.length === 0 ? (
                        <p className="text-xs text-gray-500 font-medium py-2">No workers available in this department.</p>
                      ) : (
                        workers.map((worker) => (
                          <div 
                            key={worker.id} 
                            className="bg-white p-2.5 rounded-xl border border-gray-200/80 flex items-center justify-between gap-3 hover:border-blue-200 transition-all"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-gray-900 truncate block">{worker.name}</span>
                                {worker.designation && (
                                  <span className="text-[9px] font-semibold text-gray-400 bg-gray-50 border px-1 rounded">
                                    {worker.designation}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 font-medium">
                                <span>Score: <strong className="text-blue-600 font-bold">{worker.worker_score}</strong></span>
                                <span>&bull;</span>
                                <WorkloadBadge count={worker.active_count} />
                              </div>
                            </div>
                            <button
                              onClick={() => handleWorkerAssignment(worker.id)}
                              disabled={actionLoading}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                            >
                              Assign
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}

                {/* Plain Status Indicator for Closed or Resolved or Rejected */}
                {((detailedIssue.issue.status === 'RESOLVED' || detailedIssue.issue.status === 'NOT_SATISFIED' || detailedIssue.issue.status === 'REJECTED') && !showAssignForm) && (
                  <div className="flex items-center justify-between bg-gray-100/50 p-3 rounded-2xl border border-gray-200/60 mt-1">
                    <span className="text-xs font-extrabold text-gray-600 uppercase tracking-wide">Final Settlement Status:</span>
                    <span className={`text-xs font-extrabold px-3 py-1 rounded-full border uppercase tracking-wider ${
                      detailedIssue.issue.status === 'RESOLVED'
                        ? 'bg-green-50 text-green-600 border-green-150'
                        : 'bg-red-50 text-red-600 border-red-150'
                    }`}>
                      {detailedIssue.issue.status}
                    </span>
                  </div>
                )}
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

export default IssueDetailsModal;
