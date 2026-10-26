/**
 * pages/CityPulse.jsx
 *
 * A premium Google Maps-like spatial analytics dashboard.
 * - Glassmorphic collapsible Left Sidebar with text search and category filter pills
 * - Scrollable side list of visible viewport issues
 * - Floating custom map zoom & GPS "Locate Me" controllers
 * - Custom issue marker styling using Tailwind
 * - Slide-in Detailed Info Card Drawer with horizontal photo tracks, Me Too escalation, and AuditLogs
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import useSupercluster from 'use-supercluster';
import 'leaflet/dist/leaflet.css';
import { apiConnector } from '../services/apiConnector';
import { endpoints } from '../services/api';
import AuditLogs from '../components/common/AuditLogs';
import SurroundingFeed from '../components/core/citizen/SurroundingFeed';
import { FiCompass, FiZoomIn, FiZoomOut, FiMapPin, FiCalendar, FiActivity } from 'react-icons/fi';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER = [23.3441, 85.3090]; // Ranchi Center
const DEFAULT_ZOOM = 13;

const CATEGORY_ICONS = {
  POTHOLE: '🕳️',
  STREETLIGHT: '💡',
  SEWAGE: '🚰',
  GARBAGE: '🗑️',
  WATER_SUPPLY: '💧',
  ROAD_DAMAGE: '🛣️',
  ENCROACHMENT: '🚧',
  STRAY_ANIMALS: '🐕',
  DEAD_ANIMAL: '💀',
  PUBLIC_TOILET: '🚻',
  DRAIN_BLOCKAGE: '🚰',
  FALLEN_TREE: '🌳',
  ABANDONED_VEHICLE: '🚗',
  AIR_POLLUTION: '🌫️',
  OTHER: '📋',
};

const CATEGORY_LABELS = {
  POTHOLE: 'Pothole',
  STREETLIGHT: 'Street Light',
  SEWAGE: 'Sewage',
  GARBAGE: 'Garbage',
  WATER_SUPPLY: 'Water Supply',
  ROAD_DAMAGE: 'Road Damage',
  ENCROACHMENT: 'Encroachment',
  STRAY_ANIMALS: 'Stray Animals',
  DEAD_ANIMAL: 'Dead Animal',
  PUBLIC_TOILET: 'Public Toilet',
  DRAIN_BLOCKAGE: 'Drain Blockage',
  FALLEN_TREE: 'Fallen Tree',
  ABANDONED_VEHICLE: 'Abandoned Vehicle',
  AIR_POLLUTION: 'Air Pollution',
  OTHER: 'Other',
};

const STATUS_COLORS = {
  SUBMITTED: '#38bdf8',
  VERIFIED: '#22c55e',
  ASSIGNED: '#a855f7',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#22c55e',
  NOT_SATISFIED: '#ef4444',
  REJECTED: '#64748b',
};

const STATUS_BG = {
  SUBMITTED: 'bg-sky-50 text-sky-600 border-sky-100',
  VERIFIED: 'bg-green-50 text-green-600 border-green-100',
  ASSIGNED: 'bg-purple-50 text-purple-600 border-purple-100',
  IN_PROGRESS: 'bg-amber-50 text-amber-600 border-amber-100',
  RESOLVED: 'bg-green-50 text-green-655 border-green-150',
  NOT_SATISFIED: 'bg-red-50 text-red-655 border-red-100',
  REJECTED: 'bg-gray-50 text-gray-500 border-gray-150',
};

/** Creates custom cluster icon */
function createClusterIcon(count) {
  const size = count < 10 ? 36 : count < 50 ? 44 : 52;
  return L.divIcon({
    html: `<div class="cluster-marker" style="width:${size}px;height:${size}px;"><span>${count}</span></div>`,
    className: 'cluster-marker-wrap',
    iconSize: [size, size],
  });
}

/** Creates custom issue icon */
function createIssueIcon(category) {
  const emoji = CATEGORY_ICONS[category] || '📋';
  return L.divIcon({
    html: `<div class="issue-marker"><span>${emoji}</span></div>`,
    className: 'issue-marker-wrap',
    iconSize: [32, 32],
  });
}

/** Map event handler — tracks bounds and zoom */
function MapEventHandler({ onBoundsChange }) {
  const map = useMap();

  const reportBounds = useCallback(() => {
    const b = map.getBounds();
    onBoundsChange({
      sw_lng: b.getSouthWest().lng,
      sw_lat: b.getSouthWest().lat,
      ne_lng: b.getNorthEast().lng,
      ne_lat: b.getNorthEast().lat,
      zoom: map.getZoom(),
    });
  }, [map, onBoundsChange]);

  useMapEvents({
    moveend: reportBounds,
    zoomend: reportBounds,
  });

  useEffect(() => {
    reportBounds();
  }, [reportBounds]);

  return null;
}

/** Stores Leaflet Map instance into state helper */
function MapInstanceHandler({ setMap }) {
  const map = useMap();
  useEffect(() => {
    if (map && setMap) setMap(map);
  }, [map, setMap]);
  return null;
}

/** Fly to user location on mount and trigger callback */
function FlyToUser({ onLocated }) {
  const map = useMap();
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = [pos.coords.latitude, pos.coords.longitude];
        map.flyTo(loc, 14, { duration: 1.5 });
        if (onLocated) {
          onLocated({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        }
      },
      () => { /* denied — stay at Ranchi default */ },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [map, onLocated]);
  return null;
}

export default function CityPulse() {
  const [mapInstance, setMapInstance] = useState(null);

  // Viewport issues state
  const [issues, setIssues] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [selectedIssue, setSelected] = useState(null);
  const [meTooLoading, setMeTooLoading] = useState(false);
  const [userCoords, setUserCoords] = useState(null);

  // Search & Tag Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setCategory] = useState('');
  const [sidebarCollapsed, setSidebarColl] = useState(false);

  const abortRef = useRef(null);
  const timerRef = useRef(null);

  // Debounced viewport fetch
  const fetchViewport = useCallback((newBounds) => {
    setBounds([newBounds.sw_lng, newBounds.sw_lat, newBounds.ne_lng, newBounds.ne_lat]);
    setZoom(newBounds.zoom);

    if (abortRef.current) abortRef.current.abort();
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      abortRef.current = new AbortController();
      try {
        const params = `sw_lng=${newBounds.sw_lng}&sw_lat=${newBounds.sw_lat}&ne_lng=${newBounds.ne_lng}&ne_lat=${newBounds.ne_lat}`;
        const res = await fetch(`${endpoints.VIEWPORT_ISSUES_API}?${params}`, {
          signal: abortRef.current.signal,
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setIssues(data.data || []);
        }
      } catch (err) {
        if (err.name !== 'AbortError') console.error('[CityPulse] fetch error:', err);
      }
    }, 300);
  }, []);

  // Filter issues based on text search and category tag pills
  const filteredIssues = issues.filter((issue) => {
    const matchText = !searchQuery ||
      issue.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.short_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = !selectedCategory || issue.category === selectedCategory;
    return matchText && matchCat;
  });

  // Convert filtered issues to GeoJSON for Supercluster
  const points = filteredIssues.map((issue) => ({
    type: 'Feature',
    properties: { cluster: false, ...issue },
    geometry: { type: 'Point', coordinates: [parseFloat(issue.lng), parseFloat(issue.lat)] },
  }));

  const { clusters, supercluster } = useSupercluster({
    points,
    bounds: bounds || [-180, -90, 180, 90],
    zoom,
    options: { radius: 75, maxZoom: 17 },
  });

  // Upvote/Endorse Handler
  async function handleMeToo(issueId) {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.is_reporter || issue.is_watching) return;

    setMeTooLoading(true);
    try {
      const position = await new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('No GPS'));
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => reject(new Error('Location denied')),
          { timeout: 5000 }
        );
      });

      const res = await apiConnector('POST', endpoints.ME_TOO_API(issueId), null, {
        'X-User-Lat': position.lat.toString(),
        'X-User-Lng': position.lng.toString(),
      });

      // Update is_watching flag + report_count in local state
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId
            ? { ...i, is_watching: true, report_count: res.report_count ?? i.report_count }
            : i
        )
      );
      if (selectedIssue?.id === issueId) {
        setSelected((prev) => ({
          ...prev,
          is_watching: true,
          report_count: res.report_count ?? prev.report_count,
        }));
      }
    } catch (err) {
      const msg  = err?.data?.message || err?.message || 'Could not endorse issue';
      const code = err?.data?.error;
      if (code === 'TOO_FAR' || code === 'LOCATION_REQUIRED') {
        alert(msg);
      } else if (code === 'ALREADY_ENDORSED') {
        // Race — mark watching anyway
        setIssues((prev) =>
          prev.map((i) => i.id === issueId ? { ...i, is_watching: true } : i)
        );
      }
    } finally {
      setMeTooLoading(false);
    }
  }

  // Unwatch Handler — removes upvote
  async function handleUnwatch(issueId) {
    const issue = issues.find((i) => i.id === issueId);
    if (!issue || issue.is_reporter || !issue.is_watching) return;

    try {
      await apiConnector('DELETE', endpoints.UNWATCH_API(issueId));
      setIssues((prev) =>
        prev.map((i) =>
          i.id === issueId
            ? { ...i, is_watching: false, report_count: Math.max(0, (i.report_count ?? 1) - 1) }
            : i
        )
      );
      if (selectedIssue?.id === issueId) {
        setSelected((prev) => ({
          ...prev,
          is_watching: false,
          report_count: Math.max(0, (prev.report_count ?? 1) - 1),
        }));
      }
    } catch {
      // Silently ignore — optimistic update is acceptable here
    }
  }

  // Handle zooming/flying to a clicked item in the list
  const handleItemSelect = (issue) => {
    setSelected(issue);
    if (mapInstance && issue.lat && issue.lng) {
      mapInstance.flyTo([issue.lat, issue.lng], 16, { duration: 1.5 });
    }
  };

  // Fly to user coordinates on button trigger
  const handleLocateClick = () => {
    if (navigator.geolocation && mapInstance) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          mapInstance.flyTo([pos.coords.latitude, pos.coords.longitude], 15, { duration: 1.5 });
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => alert('Please enable browser location access to center.'),
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">

      {/* Map Frame Area — fills all available height */}
      <div className="flex-1 relative flex overflow-hidden">

        {/* Full-screen Leaflet container */}
        <div className="flex-1 h-full w-full relative z-0">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEventHandler onBoundsChange={fetchViewport} />
            <MapInstanceHandler setMap={setMapInstance} />
            <FlyToUser onLocated={setUserCoords} />

            {/* Pulsing Locator Circle */}
            {userCoords && (
              <Marker
                position={[userCoords.lat, userCoords.lng]}
                icon={L.divIcon({
                  html: `<div class="w-4.5 h-4.5 bg-blue-550 border-2 border-white rounded-full shadow-md animate-pulse"></div>`,
                  className: 'user-location-marker-wrap',
                  iconSize: [18, 18],
                })}
              >
                <Popup>
                  <div className="p-1 text-[10px] font-extrabold text-gray-800 uppercase tracking-wider">You are here</div>
                </Popup>
              </Marker>
            )}

            {/* Render clusters and individual markers */}
            {clusters.map((cluster) => {
              const [lng, lat] = cluster.geometry.coordinates;
              const { cluster: isCluster, point_count: count } = cluster.properties;

              if (isCluster) {
                return (
                  <Marker
                    key={`cluster-${cluster.id}`}
                    position={[lat, lng]}
                    icon={createClusterIcon(count)}
                    eventHandlers={{
                      click: () => {
                        const expansionZoom = Math.min(supercluster.getClusterExpansionZoom(cluster.id), 17);
                        if (mapInstance) {
                          mapInstance.setView([lat, lng], expansionZoom);
                        }
                      },
                    }}
                  />
                );
              }

              return (
                <Marker
                  key={`issue-${cluster.properties.id}`}
                  position={[lat, lng]}
                  icon={createIssueIcon(cluster.properties.category)}
                  eventHandlers={{
                    click: () => setSelected(cluster.properties),
                  }}
                />
              );
            })}
          </MapContainer>
        </div>

        <SurroundingFeed
          issues={filteredIssues}
          selectedIssue={selectedIssue}
          onSelectIssue={handleItemSelect}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedCategory={selectedCategory}
          onCategoryChange={setCategory}
          onUpvote={handleMeToo}
          onUnwatch={handleUnwatch}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarColl(!sidebarCollapsed)}
        />

        {/* FLOATING MAP CONTROL CHIPS (Right Bottom) */}
        <div className="absolute right-4 bottom-4 z-[1000] flex flex-col gap-2 shadow-sm">
          {/* Custom zoom in */}
          <button
            onClick={() => mapInstance && mapInstance.zoomIn()}
            className="w-10 h-10 rounded-full bg-white border border-gray-250 flex items-center justify-center text-gray-650 hover:bg-gray-50 hover:text-gray-900 transition duration-150 cursor-pointer shadow-lg outline-none focus:outline-none"
            title="Zoom In"
          >
            <FiZoomIn className="w-4.5 h-4.5" />
          </button>
          {/* Custom zoom out */}
          <button
            onClick={() => mapInstance && mapInstance.zoomOut()}
            className="w-10 h-10 rounded-full bg-white border border-gray-250 flex items-center justify-center text-gray-650 hover:bg-gray-50 hover:text-gray-900 transition duration-150 cursor-pointer shadow-lg outline-none focus:outline-none"
            title="Zoom Out"
          >
            <FiZoomOut className="w-4.5 h-4.5" />
          </button>
          {/* Locate me */}
          <button
            onClick={handleLocateClick}
            className="w-10 h-10 rounded-full bg-[#1e2a5a] text-white flex items-center justify-center hover:bg-[#2d3f82] transition duration-150 cursor-pointer shadow-lg outline-none focus:outline-none"
            title="Center on GPS coordinates"
          >
            <FiCompass className="w-4.5 h-4.5 animate-spin-slow" />
          </button>
        </div>

        {/* REDESIGNED: SLIDE-IN DETAIL CARD (Right overlay drawer style) */}
        {selectedIssue && (
          <div className="absolute bottom-4 right-4 sm:right-16 md:right-16 max-w-sm w-full bg-white border border-gray-200 rounded-sm shadow-2xl z-[1000] overflow-y-auto max-h-[82vh] scrollbar-none animate-[cardSlideUp_0.3s_cubic-bezier(0.22,1,0.36,1)] flex flex-col">

            {/* Slide Header Cover photo */}
            {selectedIssue.thumbnail ? (
              <div className="relative w-full h-36 bg-gray-900">
                <img className="w-full h-full object-cover border-b border-gray-200" src={selectedIssue.thumbnail} alt="Issue evidence" />
                <button
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-xs text-white text-xs flex items-center justify-center cursor-pointer transition border border-white/10 z-10 focus:outline-none"
                  onClick={() => setSelected(null)}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative w-full py-4 bg-gray-50 border-b border-gray-150 flex items-center px-4.5 justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200/50">
                    #{selectedIssue.short_id}
                  </span>
                </div>
                <button
                  className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 text-gray-600 text-xs flex items-center justify-center cursor-pointer transition focus:outline-none"
                  onClick={() => setSelected(null)}
                >
                  ✕
                </button>
              </div>
            )}

            <div className="p-5 space-y-4 flex-1">

              {/* Primary Header details */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-2 leading-none">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border ${STATUS_BG[selectedIssue.status] || STATUS_BG.SUBMITTED}`}>
                    {selectedIssue.status}
                  </span>
                  <span className="text-[9px] text-gray-400 font-bold flex items-center gap-1 uppercase">
                    👥 {selectedIssue.report_count} endorsements
                  </span>
                </div>

                <h3 className="text-base font-black text-gray-900 capitalize flex items-center gap-2">
                  <span>{CATEGORY_ICONS[selectedIssue.category] || '📋'}</span>
                  <span>{CATEGORY_LABELS[selectedIssue.category] || selectedIssue.category?.replace(/_/g, ' ')}</span>
                </h3>
              </div>

              {/* Description */}
              {selectedIssue.description && (
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-600 font-bold uppercase tracking-wider block">Issue description</span>
                  <p className="text-xs text-gray-600 font-semibold bg-gray-100 shadow-sm p-3 rounded-sm leading-relaxed whitespace-pre-wrap">
                    {selectedIssue.description}
                  </p>
                </div>
              )}

              {/* Address */}
              {selectedIssue.address && (
                <div className="space-y-1">
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block">Address</span>
                  <div className="flex items-start gap-1.5 text-xs text-gray-600 font-semibold leading-relaxed">
                    <FiMapPin className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                    <span>{selectedIssue.address}</span>
                  </div>
                </div>
              )}

              {/* Status Trail Tracker (Vertical Timeline) */}
              <div className="pt-4 border-t border-gray-150">
                <AuditLogs issueId={selectedIssue.id} />
              </div>

            </div>

            {/* Footer upvote endorsements */}
            <div className="p-4 bg-gray-50 border-t border-gray-150 flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500 font-bold">
                Priority Score: <span className="font-extrabold text-red-600">{selectedIssue.priority_score}</span>
              </span>

              {/* Reporter: locked badge */}
              {selectedIssue.is_reporter ? (
                <span className="px-4 py-2.5 bg-[#1e2a5a]/8 text-[#1e2a5a] text-xs font-extrabold rounded-sm border border-[#1e2a5a]/15 inline-flex items-center gap-1.5 select-none">
                  ✓ Your Report
                </span>
              ) : selectedIssue.is_watching ? (
                /* Already watching — click to unwatch */
                <button
                  className="px-4 py-2.5 bg-emerald-50 hover:bg-red-50 text-emerald-600 hover:text-red-500 border border-emerald-200 hover:border-red-200 text-xs font-extrabold rounded-sm transition cursor-pointer"
                  onClick={() => handleUnwatch(selectedIssue.id)}
                  disabled={meTooLoading}
                  title="Click to remove your upvote"
                >
                  ✓ Upvoted
                </button>
              ) : (
                /* Not watching */
                <button
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs font-extrabold rounded-sm transition cursor-pointer"
                  onClick={() => handleMeToo(selectedIssue.id)}
                  disabled={meTooLoading}
                >
                  {meTooLoading ? '…' : '👍 Endorse Issue'}
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
