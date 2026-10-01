// src/pages/car-owner/Trips.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar, Search, Filter, Download, Eye, RefreshCw, X,
  ChevronLeft, ChevronRight, Clock, Navigation, Fuel, Truck,
  User, MapPin, Flag, AlertCircle, CheckCircle, TrendingUp,
  BarChart3, Route, Award, ArrowLeft, Play
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import {
  tripService,
  vehicleService,
  driverService,
  incidentService
} from '../../services/api';
import RoutePlayback from '../../components/common/RoutePlayback';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// HELPERS
// ============================================
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const cleaned = String(dateStr).replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
    return new Date(cleaned).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const cleaned = String(dateStr).replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
    return new Date(cleaned).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return `${formatDate(dateStr)} · ${formatTime(dateStr)}`;
};

const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return 'N/A';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const parseDateSafe = (dateStr) => {
  if (!dateStr) return null;
  try {
    const cleaned = String(dateStr).replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
};

const normalizeStatus = (status) => {
  const s = (status || '').toLowerCase().trim();
  if (s === 'active' || s === 'in progress' || s === 'in_progress') return 'in_progress';
  if (s === 'completed' || s === 'closed') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'planned' || s === 'scheduled') return 'planned';
  return 'unknown';
};

const getStatusLabel = (status) => {
  const n = normalizeStatus(status);
  if (n === 'in_progress') return 'In Progress';
  if (n === 'completed') return 'Completed';
  if (n === 'cancelled') return 'Cancelled';
  if (n === 'planned') return 'Planned';
  return status || 'Unknown';
};

const getStatusColor = (status) => {
  const n = normalizeStatus(status);
  if (n === 'completed') return 'bg-green-100 text-green-700';
  if (n === 'in_progress') return 'bg-blue-100 text-blue-700';
  if (n === 'cancelled') return 'bg-red-100 text-red-700';
  if (n === 'planned') return 'bg-yellow-100 text-yellow-700';
  return 'bg-gray-100 text-gray-700';
};

const getStatusIcon = (status) => {
  const n = normalizeStatus(status);
  if (n === 'completed') return <CheckCircle size={12} />;
  if (n === 'in_progress') return <Navigation size={12} />;
  if (n === 'cancelled') return <X size={12} />;
  if (n === 'planned') return <Clock size={12} />;
  return <AlertCircle size={12} />;
};

const getScoreColor = (score) => {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreBg = (score) => {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-500';
  return 'bg-red-500';
};

// ============================================
// TRIP SCORING (v1 — no harsh events in Trip entity)
// ============================================
const computeTripScore = (trip, incidents) => {
  let score = 100;

  const distance = parseFloat(trip.distance) || 0;
  const fuelUsed = parseFloat(trip.fuelUsed) || 0;
  const avgSpeed = parseFloat(trip.averageSpeed) || 0;

  // Linked incidents deduction
  const linkedIncidents = incidents.filter(i =>
    i.tripId === trip.id || i.trip_id === trip.id
  );
  score -= linkedIncidents.length * 10;

  // Excessive average speed
  if (avgSpeed > 100) score -= 10;
  else if (avgSpeed > 80) score -= 5;

  // Poor fuel efficiency (L/100km)
  const efficiency = distance > 0 ? (fuelUsed / distance) * 100 : 0;
  if (efficiency > 0) {
    if (efficiency > 12) score -= 10;
    else if (efficiency > 9) score -= 5;
  }

  // Long clean trip bonus
  if (distance > 50 && linkedIncidents.length === 0) {
    score = Math.min(100, score + 3);
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

// ============================================
// TRIP SCORE BREAKDOWN — returns reasons
// ============================================
const getTripScoreBreakdown = (trip, incidents) => {
  const items = [];
  let score = 100;

  const distance = parseFloat(trip.distance) || 0;
  const fuelUsed = parseFloat(trip.fuelUsed) || 0;
  const avgSpeed = parseFloat(trip.averageSpeed) || 0;

  // Linked incidents
  const linkedIncidents = incidents.filter(i =>
    i.tripId === trip.id || i.trip_id === trip.id
  );
  if (linkedIncidents.length > 0) {
    const penalty = linkedIncidents.length * 10;
    score -= penalty;
    items.push({
      type: 'penalty',
      label: `${linkedIncidents.length} linked incident${linkedIncidents.length > 1 ? 's' : ''}`,
      delta: -penalty,
    });
  } else {
    items.push({ type: 'bonus', label: 'No incidents', delta: 0 });
  }

  // Avg speed
  if (avgSpeed > 100) {
    score -= 10;
    items.push({ type: 'penalty', label: `High avg speed (${avgSpeed.toFixed(0)} km/h)`, delta: -10 });
  } else if (avgSpeed > 80) {
    score -= 5;
    items.push({ type: 'penalty', label: `Elevated avg speed (${avgSpeed.toFixed(0)} km/h)`, delta: -5 });
  } else if (avgSpeed > 0) {
    items.push({ type: 'bonus', label: `Normal avg speed (${avgSpeed.toFixed(0)} km/h)`, delta: 0 });
  }

  // Efficiency
  const efficiency = distance > 0 ? (fuelUsed / distance) * 100 : 0;
  if (efficiency > 12) {
    score -= 10;
    items.push({ type: 'penalty', label: `Poor efficiency (${efficiency.toFixed(1)} L/100km)`, delta: -10 });
  } else if (efficiency > 9) {
    score -= 5;
    items.push({ type: 'penalty', label: `Below average efficiency (${efficiency.toFixed(1)} L/100km)`, delta: -5 });
  } else if (efficiency > 0) {
    items.push({ type: 'bonus', label: `Good efficiency (${efficiency.toFixed(1)} L/100km)`, delta: 0 });
  }

  // Long clean trip bonus
  if (distance > 50 && linkedIncidents.length === 0) {
    score = Math.min(100, score + 3);
    items.push({ type: 'bonus', label: 'Long clean trip bonus', delta: +3 });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return { finalScore, items };
};

// ============================================
// CSV EXPORT
// ============================================
const exportTripsToCSV = (trips, filename = 'trips_export.csv') => {
  if (!trips || trips.length === 0) {
    alert('No trips to export');
    return;
  }

  const headers = [
    'Trip ID',
    'Vehicle Registration',
    'Vehicle ID',
    'Driver Name',
    'Driver ID',
    'Start Location',
    'End Location',
    'Start Time',
    'End Time',
    'Duration (seconds)',
    'Distance (km)',
    'Fuel Used (L)',
    'Average Speed (km/h)',
    'Efficiency (L/100km)',
    'Cost',
    'Status',
    'Start Odometer',
    'End Odometer',
    'Purpose',
    'Priority',
    'Notes',
    'Route Name',
    'Trip Score',
    'Created At',
    'Updated At'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = trips.map(t => [
    t.id,
    t.vehicleLabel,
    t.vehicleId,
    t.driverName,
    t.driverId,
    t.startLocation,
    t.endLocation,
    t.startTime,
    t.endTime,
    t.durationSeconds,
    t.distance,
    t.fuelUsed,
    t.averageSpeed,
    t.efficiency,
    t.cost,
    t.status,
    t.startOdometer,
    t.endOdometer,
    t.purpose,
    t.priority,
    t.notes,
    t.routeName,
    t.score,
    t.createdAt,
    t.updatedAt,
  ]);

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(r => r.map(escapeCSV).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================
// SAFE MARKER WRAPPER
// ============================================
const SafeMarker = ({ position, children, ...props }) => {
  if (!position || !Array.isArray(position) || position.length < 2) return null;
  const lat = parseFloat(position[0]);
  const lng = parseFloat(position[1]);
  if (isNaN(lat) || isNaN(lng)) return null;
  return <Marker position={position} {...props}>{children}</Marker>;
};

// Fits the map to the route once, then follows the replay marker
const PlaybackMapController = ({ path, point }) => {
  const map = useMap();

  useEffect(() => {
    if (path.length > 1) {
      map.fitBounds(path, { padding: [40, 40] });
    } else if (path.length === 1) {
      map.setView(path[0], 15);
    }
  }, [path, map]);

  useEffect(() => {
    if (point && !isNaN(point.lat) && !isNaN(point.lng)) {
      map.panTo([point.lat, point.lng], { animate: true, duration: 0.4 });
    }
  }, [point, map]);

  return null;
};

// ============================================
// TRIPS OVERVIEW MAP — all filtered trips as polylines
// ============================================
const TripsOverviewMap = ({ trips, onTripClick }) => {
  const defaultCenter = [-1.2921, 36.8219];

  // Trips that have at least 2 geometry points
  const withGeometry = trips.filter(
    t => Array.isArray(t.geometryPoints) && t.geometryPoints.length > 1
  );

  if (withGeometry.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
        <p className="font-medium">No mapped trips to show</p>
        <p className="text-sm">Trips without GPS paths won't appear on the map</p>
      </div>
    );
  }

  // Center on the middle point of the first trip
  const firstPoints = withGeometry[0].geometryPoints;
  const initialCenter = firstPoints[Math.floor(firstPoints.length / 2)] || defaultCenter;

  const colors = [
    '#2563EB', '#DC2626', '#16A34A', '#EA580C',
    '#9333EA', '#0891B2', '#CA8A04', '#DB2777',
  ];

  return (
    <div className="h-[600px] rounded-xl overflow-hidden border border-gray-200">
      <MapContainer
        key={`overview-${withGeometry.length}`}
        center={initialCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap'
        />

        {/* Polylines for each trip */}
        {withGeometry.map((trip, i) => {
          const color = colors[i % colors.length];
          return (
            <Polyline
              key={trip.id}
              positions={trip.geometryPoints}
              pathOptions={{ color, weight: 3, opacity: 0.75 }}
              eventHandlers={{ click: () => onTripClick(trip) }}
            >
              <Popup>
                <div className="text-xs">
                  <p className="font-bold">{trip.vehicleLabel}</p>
                  <p>{trip.startLocation} → {trip.endLocation}</p>
                  <p className="text-gray-500">
                    {trip.distance.toFixed(1)} km · Score {trip.score}
                  </p>
                  <p className="text-gray-500">
                    {formatDate(trip.startTime)} · {formatTime(trip.startTime)}
                  </p>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* Start markers */}
        {withGeometry.map((trip) => (
          <SafeMarker
            key={`start-${trip.id}`}
            position={trip.geometryPoints[0]}
            icon={L.divIcon({
              className: 'trip-start-marker',
              html: `<div style="
                width: 14px; height: 14px;
                background: #22c55e;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          >
            <Popup>Start: {trip.startLocation}</Popup>
          </SafeMarker>
        ))}

        {/* End markers */}
        {withGeometry.map((trip) => (
          <SafeMarker
            key={`end-${trip.id}`}
            position={trip.geometryPoints[trip.geometryPoints.length - 1]}
            icon={L.divIcon({
              className: 'trip-end-marker',
              html: `<div style="
                width: 14px; height: 14px;
                background: #ef4444;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              "></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          >
            <Popup>End: {trip.endLocation}</Popup>
          </SafeMarker>
        ))}
      </MapContainer>
    </div>
  );
};


// ============================================
// MAIN COMPONENT
// ============================================
const Trips = () => {
  const { currentUser } = useAuth();

  // Data
  const [trips, setTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [incidents, setIncidents] = useState([]);

  // Loading / messages
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [minDistance, setMinDistance] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');   // 'list' | 'map'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Detail modal
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTripPath, setSelectedTripPath] = useState([]);
  const [pathLoading, setPathLoading] = useState(false);

  // Playback
  const [showPlayback, setShowPlayback] = useState(false);
  const [playbackTrip, setPlaybackTrip] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: -1.2921, lng: 36.8219 });
  const [playbackPath, setPlaybackPath] = useState([]);
  const [playbackPoint, setPlaybackPoint] = useState(null);

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage('');

    try {
      const tenantId = currentUser?.tenantId;
      if (!tenantId) {
        setIsLoading(false);
        return;
      }

      const [tripsRes, vehiclesRes, driversRes, incidentsRes] = await Promise.all([
        tripService.getAll(tenantId).catch(() => ({ data: [] })),
        vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
        driverService.getAll(tenantId).catch(() => ({ data: [] })),
        incidentService.getByTenant(tenantId).catch(() => ({ data: [] }))
      ]);

      const tripsData = tripsRes?.data || [];
      const vehiclesData = vehiclesRes?.data || [];
      const driversData = driversRes?.data || [];
      const incidentsData = incidentsRes?.data || [];

      // Normalize
      const normalizedTrips = tripsData.map(t => {
        const startTime = t.startTime || t.start_time;
        const endTime = t.endTime || t.end_time;
        let durationSeconds = 0;
        const startD = parseDateSafe(startTime);
        const endD = parseDateSafe(endTime);
        if (startD && endD && endD > startD) {
          durationSeconds = Math.floor((endD - startD) / 1000);
        }

        const vehicleId = t.vehicleId || t.vehicle_id || t.vehicle?.id;
        const driverId = t.driverId || t.driver_id || t.driver?.id;

        const vehicleObj = vehiclesData.find(v => v.id === vehicleId);
        const driverObj = driversData.find(d => String(d.id) === String(driverId));

        const distance = parseFloat(t.distance) || 0;
        const fuelUsed = parseFloat(t.fuelUsed || t.fuel_used) || 0;
        const avgSpeed = parseFloat(t.averageSpeed || t.average_speed) || 0;
        const efficiency = distance > 0 ? (fuelUsed / distance) * 100 : 0;

        return {
          id: t.id,
          vehicleId,
          driverId,
          vehicleLabel: vehicleObj?.registration || vehicleObj?.reg || t.vehicleRegistration || vehicleId || 'Unknown',
          driverName: driverObj?.name || t.driverName || 'Unassigned',
          startLocation: t.startLocation || t.start_location || t.from || 'Start',
          endLocation: t.endLocation || t.end_location || t.to || 'Destination',
          startTime,
          endTime,
          durationSeconds,
          distance,
          fuelUsed,
          averageSpeed: avgSpeed,
          efficiency: efficiency.toFixed(2),
          cost: parseFloat(t.cost) || 0,
          status: t.status || 'planned',
          startOdometer: parseFloat(t.startOdometer || t.start_odometer) || 0,
          endOdometer: parseFloat(t.endOdometer || t.end_odometer) || 0,
          purpose: t.purpose || '',
          priority: t.priority || 'normal',
          notes: t.notes || '',
          routeName: t.geofenceName || t.geofence_name || t.geofence?.name || null,
          geofenceId: t.geofenceId || t.geofence_id || t.geofence?.id || null,
          createdAt: t.createdAt || t.created_at,
          updatedAt: t.updatedAt || t.updated_at,
          // Computed later
          score: 0,
          _original: t,
        };
      });

      // Compute scores
      normalizedTrips.forEach(trip => {
        trip.score = computeTripScore(trip, incidentsData);
      });

      
            // NOTE: Geometry preload removed. It will be loaded on-demand when
      // the user switches to map view (see loadMapGeometry below).
      // This keeps the initial page load fast.
      normalizedTrips.forEach(t => { t.geometryPoints = []; });

      // Sort by startTime descending
      normalizedTrips.sort((a, b) => {
        const aT = parseDateSafe(a.startTime)?.getTime() || 0;
        const bT = parseDateSafe(b.startTime)?.getTime() || 0;
        return bT - aT;
      });

      setTrips(normalizedTrips);
      setVehicles(vehiclesData);
      setDrivers(driversData);
      setIncidents(incidentsData);
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('Failed to load trips:', error);
      setErrorMessage('Failed to load trips. Please try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) loadData(true);
  }, [currentUser]);

  // ============================================
  // DATE BOUNDS
  // ============================================
  const getDateBounds = () => {
    const now = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    switch (dateRange) {
      case 'today':
        return { start: startOfToday, end: now };
      case 'this_week': {
        const s = new Date(startOfToday);
        const day = s.getDay();
        const diff = day === 0 ? 6 : day - 1; // Monday start
        s.setDate(s.getDate() - diff);
        return { start: s, end: now };
      }
      case 'this_month': {
        const s = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: s, end: now };
      }
      case 'last_month': {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { start: s, end: e };
      }
      case 'this_quarter': {
        const q = Math.floor(now.getMonth() / 3);
        const s = new Date(now.getFullYear(), q * 3, 1);
        return { start: s, end: now };
      }
      case 'this_year': {
        const s = new Date(now.getFullYear(), 0, 1);
        return { start: s, end: now };
      }
      case 'custom': {
        const s = customStartDate ? new Date(customStartDate) : null;
        const e = customEndDate ? new Date(customEndDate) : null;
        if (e) e.setHours(23, 59, 59);
        return { start: s, end: e };
      }
      case 'all':
      default:
        return { start: null, end: null };
    }
  };

  // ============================================
  // FILTERED TRIPS
  // ============================================
  const filteredTrips = useMemo(() => {
    const { start, end } = getDateBounds();
    const q = searchTerm.toLowerCase().trim();
    const minD = parseFloat(minDistance) || null;
    const maxD = parseFloat(maxDistance) || null;

    return trips.filter(trip => {
      // Search
      if (q) {
        const haystack = [
          trip.vehicleLabel,
          trip.driverName,
          trip.startLocation,
          trip.endLocation,
          trip.purpose,
          trip.routeName,
          trip.status,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      // Vehicle
      if (vehicleFilter !== 'all' && String(trip.vehicleId) !== String(vehicleFilter)) return false;

      // Driver
      if (driverFilter !== 'all' && String(trip.driverId) !== String(driverFilter)) return false;

      // Status (normalized)
      if (statusFilter !== 'all') {
        const tripStatus = normalizeStatus(trip.status);
        if (tripStatus !== statusFilter) return false;
      }

      // Date range
      if (start || end) {
        const t = parseDateSafe(trip.startTime);
        if (!t) return false;
        if (start && t < start) return false;
        if (end && t > end) return false;
      }

      // Distance
      if (minD !== null && trip.distance < minD) return false;
      if (maxD !== null && trip.distance > maxD) return false;

      return true;
    });
  }, [
    trips, searchTerm, vehicleFilter, driverFilter, statusFilter,
    dateRange, customStartDate, customEndDate, minDistance, maxDistance
  ]);

    // ============================================
  // SORTED TRIPS
  // ============================================
  const sortedTrips = useMemo(() => {
    const list = [...filteredTrips];
    return list.sort((a, b) =>
      (parseDateSafe(b.startTime)?.getTime() || 0) -
      (parseDateSafe(a.startTime)?.getTime() || 0)
    );
  }, [filteredTrips]);

  // ============================================
  // PAGINATION
  // ============================================
  const totalPages = Math.max(1, Math.ceil(filteredTrips.length / itemsPerPage));
    const paginatedTrips = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTrips.slice(start, start + itemsPerPage);
  }, [sortedTrips, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, vehicleFilter, driverFilter, statusFilter, dateRange, minDistance, maxDistance]);

  // ============================================
  // STATS
  // ============================================
  const stats = useMemo(() => {
    const total = filteredTrips.length;
    const completed = filteredTrips.filter(t => normalizeStatus(t.status) === 'completed').length;
    const totalDistance = filteredTrips.reduce((s, t) => s + (t.distance || 0), 0);
    const totalFuel = filteredTrips.reduce((s, t) => s + (t.fuelUsed || 0), 0);
    const avgScore = filteredTrips.length > 0
      ? Math.round(filteredTrips.reduce((s, t) => s + (t.score || 0), 0) / filteredTrips.length)
      : 0;

    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      totalDistance: totalDistance.toFixed(1),
      totalFuel: totalFuel.toFixed(1),
      avgScore,
    };
  }, [filteredTrips]);

    // ============================================
  // RELATED EVENTS FOR SELECTED TRIP
  // ============================================
  const relatedEvents = useMemo(() => {
    if (!selectedTrip) return { incidents: [] };

    const tripStart = parseDateSafe(selectedTrip.startTime)?.getTime();
    const tripEnd = parseDateSafe(selectedTrip.endTime)?.getTime() 
      || (tripStart ? tripStart + 3600000 : null);

    // Incidents linked by tripId OR that occurred during the trip's window
    const linkedIncidents = incidents.filter(i => {
      // Direct link
      const iTripId = i.tripId || i.trip_id;
      if (iTripId && String(iTripId) === String(selectedTrip.id)) return true;

      // Same vehicle check (only if vehicle is set)
      const iVehicleId = i.vehicleId || i.vehicle_id || i.vehicle?.id;
      if (iVehicleId && String(iVehicleId) !== String(selectedTrip.vehicleId)) return false;

      // Time window match
      const iTime = parseDateSafe(i.createdAt || i.created_at || i.timestamp)?.getTime();
      if (!iTime || !tripStart) return false;
      if (tripEnd && iTime > tripEnd) return false;
      return iTime >= tripStart;
    });

    return { incidents: linkedIncidents };
  }, [selectedTrip, incidents]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleExport = () => {
    const filename = `trips_${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    exportTripsToCSV(filteredTrips, filename);
    setSuccessMessage(`✅ Exported ${filteredTrips.length} trips`);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openTripDetail = (trip) => {
    setSelectedTrip(trip);
    setShowDetailModal(true);
    loadTripPath(trip);
  };

  const loadTripPath = async (trip) => {
    setPathLoading(true);
    setSelectedTripPath([]);
    try {
      const { trackingService } = await import('../../services/api');
      const res = await trackingService.getByVehicle(trip.vehicleId);
      const points = res?.data || [];

      // Filter by time window
      const startMs = parseDateSafe(trip.startTime)?.getTime();
      const endMs = parseDateSafe(trip.endTime)?.getTime();

      const filtered = points.filter(p => {
        const t = parseDateSafe(p.timestamp)?.getTime();
        if (!t) return false;
        if (startMs && t < startMs - 60000) return false;
        if (endMs && t > endMs + 60000) return false;
        return true;
      });

      const positions = filtered
        .map(p => [parseFloat(p.lat), parseFloat(p.lng)])
        .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

      setSelectedTripPath(positions);

      if (positions.length > 0) {
        const midIndex = Math.floor(positions.length / 2);
        setMapCenter({
          lat: positions[midIndex][0],
          lng: positions[midIndex][1]
        });
      }
    } catch (e) {
      console.warn('Could not load trip path:', e);
    } finally {
      setPathLoading(false);
    }
  };

  const handleOpenPlayback = (trip) => {
    setPlaybackTrip(trip);
    setShowPlayback(true);
    setShowDetailModal(false);
  };

  const closePlayback = () => {
    setShowPlayback(false);
    setPlaybackTrip(null);
    setPlaybackPath([]);
    setPlaybackPoint(null);
  };

    // ============================================
  // LOAD MAP GEOMETRY (on-demand, only for filtered trips)
  // ============================================
  const [mapGeometryLoading, setMapGeometryLoading] = useState(false);

  const loadMapGeometry = async () => {
    const { trackingService } = await import('../../services/api');
    setMapGeometryLoading(true);

    // Only load for trips that don't already have geometry
    const tripsToLoad = sortedTrips.filter(
      t => !Array.isArray(t.geometryPoints) || t.geometryPoints.length === 0
    );

    // Cache by vehicleId so we only fetch each vehicle once
    const vehicleCache = {};

    // Process in small batches to avoid overwhelming the backend
    const CHUNK = 3;
    for (let i = 0; i < tripsToLoad.length; i += CHUNK) {
      const chunk = tripsToLoad.slice(i, i + CHUNK);

      await Promise.all(chunk.map(async (trip) => {
        try {
          let allPoints = vehicleCache[trip.vehicleId];
          if (!allPoints) {
            const res = await trackingService.getByVehicle(trip.vehicleId);
            allPoints = res?.data || [];
            vehicleCache[trip.vehicleId] = allPoints;
          }

          const startMs = parseDateSafe(trip.startTime)?.getTime();
          const endMs = parseDateSafe(trip.endTime)?.getTime()
            || (startMs ? startMs + 3600000 : null);

          const pts = allPoints
            .filter(p => {
              const t = parseDateSafe(p.timestamp)?.getTime();
              if (!t) return false;
              if (startMs && t < startMs - 60000) return false;
              if (endMs && t > endMs + 60000) return false;
              return true;
            })
            .map(p => [parseFloat(p.lat), parseFloat(p.lng)])
            .filter(([a, b]) => !isNaN(a) && !isNaN(b));

          // Update the trip in state (immutably)
          setTrips(prev => prev.map(t =>
            t.id === trip.id ? { ...t, geometryPoints: pts } : t
          ));
        } catch (e) {
          console.warn('Could not load geometry for trip', trip.id, e);
        }
      }));
    }

    setMapGeometryLoading(false);
  };

  // Trigger geometry load when user switches to map view
  useEffect(() => {
    if (viewMode === 'map' && sortedTrips.length > 0) {
      const needsLoading = sortedTrips.some(
        t => !Array.isArray(t.geometryPoints) || t.geometryPoints.length === 0
      );
      if (needsLoading) {
        loadMapGeometry();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // ============================================
  // LOADING
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading trips...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-4">
      {/* Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Route size={24} className="text-blue-600" />
              Trip History
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Review all fleet trips · {filteredTrips.length} matching
              {lastUpdated && ` · Updated ${lastUpdated}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData(false)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
                        {/* View toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="List view"
              >
                <BarChart3 size={16} />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-1.5 rounded transition-colors ${
                  viewMode === 'map'
                    ? 'bg-white shadow-sm text-blue-600'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                title="Map view"
              >
                <MapPin size={16} />
              </button>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-3 py-2 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={14} /> Filters
            </button>
            <button
              onClick={handleExport}
              disabled={filteredTrips.length === 0}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
              <Download size={16} /> Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total Trips</p>
          <p className="text-xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Completed</p>
          <p className="text-xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-[10px] text-gray-400">{stats.completionRate}% rate</p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Distance</p>
          <p className="text-xl font-bold text-blue-600">{stats.totalDistance}<span className="text-xs ml-1">km</span></p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Fuel Used</p>
          <p className="text-xl font-bold text-orange-600">{stats.totalFuel}<span className="text-xs ml-1">L</span></p>
        </div>
        <div className="bg-white p-3 rounded-xl border border-gray-200">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Score</p>
          <p className={`text-xl font-bold ${getScoreColor(stats.avgScore)}`}>{stats.avgScore}</p>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by vehicle, driver, location, purpose..."
                  className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Vehicle */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registration || v.reg || v.id}</option>
              ))}
            </select>

            {/* Driver */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={driverFilter}
              onChange={(e) => setDriverFilter(e.target.value)}
            >
              <option value="all">All Drivers</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            {/* Status */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Date range */}
            <select
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>

            {/* Custom date range */}
            {dateRange === 'custom' && (
              <>
                <input
                  type="date"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </>
            )}

            {/* Distance */}
            <input
              type="number"
              placeholder="Min km"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={minDistance}
              onChange={(e) => setMinDistance(e.target.value)}
            />
            <input
              type="number"
              placeholder="Max km"
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={maxDistance}
              onChange={(e) => setMaxDistance(e.target.value)}
            />

            {/* Clear */}
            <button
              onClick={() => {
                setSearchTerm('');
                setVehicleFilter('all');
                setDriverFilter('all');
                setStatusFilter('all');
                setDateRange('this_month');
                setCustomStartDate('');
                setCustomEndDate('');
                setMinDistance('');
                setMaxDistance('');
              }}
              className="text-sm text-blue-600 hover:underline text-left"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

                  {/* Map view */}
      {viewMode === 'map' && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredTrips.length}</span> trips · 
              <span className="font-medium ml-1">
                {sortedTrips.filter(t => t.geometryPoints?.length > 1).length}
              </span> with GPS paths
            </div>
            {mapGeometryLoading && (
              <div className="text-xs text-blue-600 flex items-center gap-1">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                Loading map data…
              </div>
            )}
          </div>
          <TripsOverviewMap trips={sortedTrips} onTripClick={openTripDetail} />
        </div>
      )}

      {/* Trips Table */}
      {viewMode === 'list' && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredTrips.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Route size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No trips found</p>
            <p className="text-sm">Try adjusting filters or date range</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 hidden md:table-cell">Vehicle</th>
                    <th className="p-3 hidden lg:table-cell">Driver</th>
                    <th className="p-3">Route</th>
                    <th className="p-3 hidden sm:table-cell">Distance</th>
                    <th className="p-3 hidden lg:table-cell">Duration</th>
                    <th className="p-3 hidden xl:table-cell">Fuel</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTrips.map(trip => (
                    <tr
                      key={trip.id}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => openTripDetail(trip)}
                    >
                      <td className="p-3 text-sm whitespace-nowrap">
                        <div className="font-medium">{formatDate(trip.startTime)}</div>
                        <div className="text-xs text-gray-500">{formatTime(trip.startTime)}</div>
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell font-medium">
                        {trip.vehicleLabel}
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {trip.driverName}
                      </td>
                      <td className="p-3 text-sm">
                        <div className="truncate max-w-[220px]">
                          {trip.startLocation} → {trip.endLocation}
                        </div>
                        {trip.routeName && (
                          <div className="text-xs text-blue-600 truncate">{trip.routeName}</div>
                        )}
                      </td>
                      <td className="p-3 text-sm hidden sm:table-cell">
                        {trip.distance.toFixed(1)} km
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {formatDuration(trip.durationSeconds)}
                      </td>
                      <td className="p-3 text-sm hidden xl:table-cell">
                        {trip.fuelUsed.toFixed(1)} L
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getStatusColor(trip.status)}`}>
                          {getStatusIcon(trip.status)}
                          {getStatusLabel(trip.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-10 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${getScoreBg(trip.score)}`}
                              style={{ width: `${trip.score}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium ${getScoreColor(trip.score)}`}>
                            {trip.score}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openTripDetail(trip);
                          }}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-xs text-gray-500">
                  Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredTrips.length)} of {filteredTrips.length}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={16} className="text-gray-600" />
                  </button>
                  <span className="text-xs text-gray-600 px-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      )}
      {/* Trip Detail Modal */}
      {showDetailModal && selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
          <div className="absolute inset-0" onClick={() => setShowDetailModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setShowDetailModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg z-10"
            >
              <X size={22} className="text-gray-500" />
            </button>

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 rounded-t-2xl">
              <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                <Route size={20} /> Trip Details
              </h2>
              <p className="text-blue-100 text-xs md:text-sm mt-0.5">
                {formatDateTime(selectedTrip.startTime)} → {selectedTrip.endTime ? formatDateTime(selectedTrip.endTime) : 'In progress'}
              </p>
            </div>

            <div className="p-5 space-y-4">
              {/* Route + playback */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-sm">
                  <span className="text-gray-600">Route:</span>{' '}
                  <span className="font-medium">
                    {selectedTrip.startLocation} → {selectedTrip.endLocation}
                  </span>
                  {selectedTrip.routeName && (
                    <div className="text-xs text-blue-600 mt-0.5">📌 {selectedTrip.routeName}</div>
                  )}
                </div>
                <button
                  onClick={() => handleOpenPlayback(selectedTrip)}
                  className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-purple-700 flex items-center gap-1"
                >
                  <Play size={12} /> Replay Trip
                </button>
              </div>

              {/* Map preview */}
              {pathLoading ? (
                <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                  Loading route…
                </div>
              ) : selectedTripPath.length > 1 ? (
                <div className="h-64 rounded-lg overflow-hidden border border-gray-200">
                  <MapContainer
                    key={`preview-${selectedTrip.id}`}
                    center={[mapCenter.lat, mapCenter.lng]}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap'
                    />
                    <Polyline
                      positions={selectedTripPath}
                      pathOptions={{ color: '#2563EB', weight: 4 }}
                    />
                    <SafeMarker position={selectedTripPath[0]}>
                      <Popup>Start: {selectedTrip.startLocation}</Popup>
                    </SafeMarker>
                    <SafeMarker position={selectedTripPath[selectedTripPath.length - 1]}>
                      <Popup>End: {selectedTrip.endLocation}</Popup>
                    </SafeMarker>
                  </MapContainer>
                </div>
              ) : (
                <div className="h-32 bg-gray-50 rounded-lg flex items-center justify-center text-sm text-gray-400">
                  No route path recorded for this trip
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Distance</p>
                  <p className="text-lg font-bold">{selectedTrip.distance.toFixed(1)} km</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Duration</p>
                  <p className="text-lg font-bold">{formatDuration(selectedTrip.durationSeconds)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Fuel Used</p>
                  <p className="text-lg font-bold">{selectedTrip.fuelUsed.toFixed(1)} L</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Avg Speed</p>
                  <p className="text-lg font-bold">{selectedTrip.averageSpeed.toFixed(1)} km/h</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Efficiency</p>
                  <p className="text-lg font-bold">{selectedTrip.efficiency} L/100km</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Score</p>
                  <p className={`text-lg font-bold ${getScoreColor(selectedTrip.score)}`}>
                    {selectedTrip.score}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Priority</p>
                  <p className="text-lg font-bold capitalize">{selectedTrip.priority}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Status</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${getStatusColor(selectedTrip.status)}`}>
                    {getStatusIcon(selectedTrip.status)}
                    {getStatusLabel(selectedTrip.status)}
                  </span>
                </div>

                              {/* Score Breakdown */}
              {(() => {
                const breakdown = getTripScoreBreakdown(selectedTrip, incidents);
                return (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Award size={12} /> Score Breakdown
                    </p>
                    <div className="space-y-1">
                      {breakdown.items.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm py-1 border-b border-gray-100 last:border-0"
                        >
                          <span className="flex items-center gap-2 text-gray-700">
                            {item.type === 'penalty' ? (
                              <X size={12} className="text-red-500" />
                            ) : (
                              <CheckCircle size={12} className="text-green-500" />
                            )}
                            {item.label}
                          </span>
                          <span
                            className={`text-xs font-medium ${
                              item.delta < 0
                                ? 'text-red-600'
                                : item.delta > 0
                                  ? 'text-green-600'
                                  : 'text-gray-400'
                            }`}
                          >
                            {item.delta > 0 ? '+' : ''}{item.delta}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-gray-200">
                        <span className="text-sm font-semibold">Final Score</span>
                        <span className={`text-sm font-bold ${getScoreColor(breakdown.finalScore)}`}>
                          {breakdown.finalScore} / 100
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
              </div>

              {/* Vehicle + driver */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Truck size={12} /> Vehicle
                  </p>
                  <p className="font-medium">{selectedTrip.vehicleLabel}</p>
                  <p className="text-xs text-gray-500">ID: {selectedTrip.vehicleId || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <User size={12} /> Driver
                  </p>
                  <p className="font-medium">{selectedTrip.driverName}</p>
                  <p className="text-xs text-gray-500">ID: {selectedTrip.driverId || 'N/A'}</p>
                </div>
              </div>

              {/* Odometer */}
              {(selectedTrip.startOdometer > 0 || selectedTrip.endOdometer > 0) && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Odometer</p>
                  <p className="text-sm">
                    Start: <span className="font-medium">{selectedTrip.startOdometer} km</span>
                    {' → '}
                    End: <span className="font-medium">{selectedTrip.endOdometer > 0 ? `${selectedTrip.endOdometer} km` : 'N/A'}</span>
                  </p>
                </div>
              )}

              {/* Purpose + Notes */}
              {selectedTrip.purpose && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Purpose</p>
                  <p className="text-sm">{selectedTrip.purpose}</p>
                </div>
              )}

              {selectedTrip.notes && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm whitespace-pre-line">{selectedTrip.notes}</p>
                </div>
              )}

              {/* Timeline */}
              <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-500 space-y-1">
                <p>Created: {formatDateTime(selectedTrip.createdAt)}</p>
                {selectedTrip.updatedAt && <p>Updated: {formatDateTime(selectedTrip.updatedAt)}</p>}
              </div>

                            {/* Related Events */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                  <AlertCircle size={12} /> Related Events
                  <span className="text-gray-400 font-normal">
                    ({relatedEvents.incidents.length})
                  </span>
                </p>

                {relatedEvents.incidents.length === 0 ? (
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <CheckCircle size={14} className="text-green-500" />
                    No incidents during this trip
                  </p>
                ) : (
                  <div className="space-y-2">
                    {relatedEvents.incidents.map(inc => {
                      const severity = (inc.severity || 'medium').toLowerCase();
                      const sevClass =
                        severity === 'critical' || severity === 'high'
                          ? 'bg-red-100 text-red-700'
                          : severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700';

                      return (
                        <div
                          key={inc.id}
                          className="flex items-start justify-between gap-3 p-2 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {inc.incidentType || inc.incident_type || 'Incident'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {inc.location || 'Unknown location'}
                            </p>
                            {inc.description && (
                              <p className="text-xs text-gray-400 truncate mt-0.5">
                                {inc.description}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${sevClass}`}>
                              {inc.severity || 'medium'}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {formatTime(inc.createdAt || inc.created_at || inc.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
              <button
                onClick={() => handleOpenPlayback(selectedTrip)}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                <Play size={16} /> Replay Trip
              </button>
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Playback map — sits above the replay panel */}
      {showPlayback && (
        <div className="fixed top-0 left-0 right-0 bottom-[300px] md:bottom-[260px] z-40 bg-white">
          <button
            onClick={closePlayback}
            className="absolute top-3 right-3 z-[1000] bg-white shadow-md rounded-full p-2 hover:bg-gray-100"
            aria-label="Close replay"
          >
            <X size={18} />
          </button>
          <MapContainer
            key={`playback-${playbackTrip?.id}`}
            center={[mapCenter.lat, mapCenter.lng]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            {playbackPath.length > 1 && (
              <Polyline positions={playbackPath} pathOptions={{ color: '#2563EB', weight: 4 }} />
            )}
            {playbackPoint && (
              <CircleMarker
                center={[playbackPoint.lat, playbackPoint.lng]}
                radius={9}
                pathOptions={{ color: '#fff', weight: 3, fillColor: '#9333EA', fillOpacity: 1 }}
              />
            )}
            <PlaybackMapController path={playbackPath} point={playbackPoint} />
          </MapContainer>
        </div>
      )}

      {/* Playback */}
      <RoutePlayback
        vehicle={
          playbackTrip
            ? { id: playbackTrip.vehicleId, reg: playbackTrip.vehicleLabel }
            : null
        }
        isOpen={showPlayback}
        onClose={closePlayback}
        onMapCenter={(lat, lng) => setMapCenter({ lat, lng })}
        onDataLoaded={(pts) =>
          setPlaybackPath(
            pts
              .map(p => [parseFloat(p.lat), parseFloat(p.lng)])
              .filter(([a, b]) => !isNaN(a) && !isNaN(b))
          )
        }
        onPointChange={setPlaybackPoint}
        tripId={playbackTrip?.id || null}
        tripStart={playbackTrip?.startTime || null}
        tripEnd={playbackTrip?.endTime || null}
      />
    </div>
  );
};

export default Trips;