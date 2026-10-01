// src/pages/car-owner/Dispatch.jsx
import React, { useState, useEffect } from 'react';
import {
  Calendar as CalendarIcon, Plus, Search, Filter,
  RefreshCw, X, Save, Trash2, Edit, Clock,
  MapPin, Truck, User, AlertCircle, CheckCircle,
  ChevronLeft, ChevronRight, Flag, List, LayoutGrid,
  FlagTriangleRight, Circle, Route
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  tripService,
  vehicleService,
  driverService,
  geofenceService
} from '../../services/api';
import { eventBus, EVENTS } from '../../services/eventBus';

// ============================================
// HELPERS
// ============================================
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    // ✅ Strip any timezone suffix
    const cleaned = dateStr.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
    return new Date(cleaned).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  } catch { return dateStr; }
};

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    // ✅ Strip any timezone suffix so it shows as local time
    const cleaned = dateStr.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
    return new Date(cleaned).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return ''; }
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return 'N/A';
  return `${formatDate(dateStr)} · ${formatTime(dateStr)}`;
};

const isOverdue = (trip) => {
  if (trip.status !== 'planned') return false;
  if (!trip.startTime) return false;
  // ✅ Strip timezone suffix
  const cleaned = trip.startTime.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
  return new Date(cleaned) < new Date(Date.now() - 30 * 60 * 1000);
};

const getPriorityColor = (priority) => {
  const colors = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-orange-500 text-white',
    normal: 'bg-blue-500 text-white',
    low: 'bg-gray-400 text-white',
  };
  return colors[priority] || colors.normal;
};

const getPriorityLabel = (priority) => {
  const labels = {
    urgent: '🚨 Urgent',
    high: '🔴 High',
    normal: '🟡 Normal',
    low: '🔵 Low',
  };
  return labels[priority] || '🟡 Normal';
};

// ============================================
// MAIN COMPONENT
// ============================================
const Dispatch = ({ setActiveTab }) => {
  const { currentUser } = useAuth();

  // ---------- STATE ----------
  const [activeView, setActiveView] = useState('board'); // board | calendar | list
  const [plannedTrips, setPlannedTrips] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // Calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Form
  const emptyForm = {
    vehicle_id: '',
    driver_id: '',
    geofence_id: '',
    start_location: '',
    end_location: '',
    planned_start: '',
    priority: 'normal',
    purpose: '',
    notes: '',
    start_odometer: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setErrorMessage('');

    try {
      const tenant = currentUser?.tenantId;
      if (!tenant) return;
      setTenantId(tenant);

      const [tripsRes, vehiclesRes, driversRes, geofencesRes] = await Promise.all([
        tripService.getAll(tenant).catch(() => ({ data: [] })),
        vehicleService.getAll(tenant).catch(() => ({ data: [] })),
        driverService.getAll(tenant).catch(() => ({ data: [] })),
        geofenceService.getByTenant(tenant).catch(() => ({ data: [] }))
      ]);

      // Only PLANNED trips
      const allTrips = tripsRes?.data || [];
      const planned = allTrips.filter(t => {
        const status = (t.status || '').toLowerCase();
        return status === 'planned' || status === 'scheduled' || status === 'draft';
      });
      setPlannedTrips(planned);

      setVehicles(vehiclesRes?.data || []);
      setDrivers(driversRes?.data || []);
      setGeofences(geofencesRes?.data || []);

    } catch (error) {
      console.error('Failed to load dispatch data:', error);
      setErrorMessage('Failed to load data. Please try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    if (currentUser) loadData(true);
  }, [currentUser]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => loadData(false), 60000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Listen for trip updates
  useEffect(() => {
    const unsub1 = eventBus.on(EVENTS.TRIP_STARTED, () => loadData(false));
    const unsub2 = eventBus.on(EVENTS.TRIP_ENDED, () => loadData(false));
    const unsub3 = eventBus.on(EVENTS.VEHICLE_STATUS_CHANGED, () => loadData(false));
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [currentUser]);

  // ============================================
  // HELPERS
  // ============================================
  const getVehicleLabel = (vehicleId) => {
    if (!vehicleId) return 'Unassigned';
    const v = vehicles.find(x => x.id === vehicleId);
    return v ? (v.registration || v.id) : 'Unknown';
  };

  const getVehicleObj = (vehicleId) => {
    return vehicles.find(x => x.id === vehicleId);
  };

  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const d = drivers.find(x => String(x.id) === String(driverId));
    return d ? d.name : 'Unknown';
  };

  const getRouteName = (geofenceId) => {
    if (!geofenceId) return null;
    const g = geofences.find(x => x.id === geofenceId);
    return g ? g.name : null;
  };

  // Stats
  const stats = {
    total: plannedTrips.length,
    unassigned: plannedTrips.filter(t => !t.driverId && !t.driver_id).length,
    assigned: plannedTrips.filter(t => t.driverId || t.driver_id).length,
    overdue: plannedTrips.filter(t => isOverdue(t)).length,
    today: plannedTrips.filter(t => {
      if (!t.startTime) return false;
      const d = new Date(t.startTime);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length,
    urgent: plannedTrips.filter(t => t.priority === 'urgent').length,
  };

  // Filtered
  const filteredTrips = plannedTrips.filter(t => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (t.startLocation || '').toLowerCase().includes(q) ||
      (t.endLocation || '').toLowerCase().includes(q) ||
      (t.purpose || '').toLowerCase().includes(q) ||
      getVehicleLabel(t.vehicleId || t.vehicle_id).toLowerCase().includes(q) ||
      getDriverName(t.driverId || t.driver_id).toLowerCase().includes(q)
    );
  });

  // Group by date for board view
    const groupByDate = () => {
    const groups = {};
    filteredTrips.forEach(trip => {
      if (!trip.startTime) {
        if (!groups['unscheduled']) groups['unscheduled'] = [];
        groups['unscheduled'].push(trip);
        return;
      }
      // ✅ Strip timezone suffix before parsing
      const cleaned = trip.startTime.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
      const dateKey = new Date(cleaned).toDateString();
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(trip);
    });
    return groups;
  };

  // ============================================
  // CRUD
  // ============================================
  const resetForm = () => {
    setFormData(emptyForm);
    setSelectedTrip(null);
  };

  const openCreateModal = () => {
    resetForm();
    // Default to tomorrow 8am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const iso = tomorrow.toISOString().slice(0, 16);
    setFormData({ ...emptyForm, planned_start: iso });
    setShowCreateModal(true);
  };

  const openEditModal = (trip) => {
    setSelectedTrip(trip);
    setFormData({
      vehicle_id: trip.vehicleId || trip.vehicle_id || '',
      driver_id: trip.driverId || trip.driver_id || '',
      geofence_id: trip.geofenceId || trip.geofence_id || '',
      start_location: trip.startLocation || '',
      end_location: trip.endLocation || '',
            planned_start: trip.startTime ? trip.startTime.slice(0, 16) : '',   // ✅ Take as-is
      priority: trip.priority || 'normal',
      purpose: trip.purpose || '',
      notes: trip.notes || '',
      start_odometer: trip.startOdometer || ''
    });
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!formData.planned_start) {
      setErrorMessage('Planned start date & time is required');
      return;
    }
    if (!formData.start_location && !formData.geofence_id) {
      setErrorMessage('Please provide a route or start/end locations');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Auto-fill from geofence if selected
      let startLoc = formData.start_location;
      let endLoc = formData.end_location;
      let routeName = '';

      if (formData.geofence_id && (!startLoc || !endLoc)) {
        const g = geofences.find(x => x.id === formData.geofence_id);
        if (g) {
          routeName = g.name;
          try {
            const coords = typeof g.coordinates === 'string'
              ? JSON.parse(g.coordinates)
              : g.coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
              startLoc = coords[0].name || coords[0].location || startLoc;
              endLoc = coords[coords.length - 1].name || coords[coords.length - 1].location || endLoc;
            }
          } catch (e) {}
        }
      }

      const payload = {
        tenant: { id: tenantId },
        vehicle: formData.vehicle_id ? { id: formData.vehicle_id } : null,
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        geofence: formData.geofence_id ? { id: formData.geofence_id } : null,
        startLocation: startLoc || 'Start',
        endLocation: endLoc || 'Destination',
        startTime: formData.planned_start,
        status: 'planned',
        priority: formData.priority || 'normal',
        purpose: formData.purpose || '',
        notes: formData.notes || '',
        startOdometer: parseFloat(formData.start_odometer) || 0
      };

      const response = await tripService.create(payload);

      if (response?.success) {
        setSuccessMessage('✅ Scheduled trip created!');
        setShowCreateModal(false);
        resetForm();
        await loadData(false);
        eventBus.emit(EVENTS.TRIP_UPDATED, { action: 'created' });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response?.message || 'Failed to create trip');
      }
    } catch (error) {
      console.error('Create trip error:', error);
      setErrorMessage(error.message || 'Failed to create trip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedTrip) return;
    if (!formData.planned_start) {
      setErrorMessage('Planned start date & time is required');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      let startLoc = formData.start_location;
      let endLoc = formData.end_location;

      if (formData.geofence_id && (!startLoc || !endLoc)) {
        const g = geofences.find(x => x.id === formData.geofence_id);
        if (g) {
          try {
            const coords = typeof g.coordinates === 'string'
              ? JSON.parse(g.coordinates)
              : g.coordinates;
            if (Array.isArray(coords) && coords.length >= 2) {
              startLoc = coords[0].name || coords[0].location || startLoc;
              endLoc = coords[coords.length - 1].name || coords[coords.length - 1].location || endLoc;
            }
          } catch (e) {}
        }
      }

      const payload = {
        vehicle: formData.vehicle_id ? { id: formData.vehicle_id } : null,
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        geofence: formData.geofence_id ? { id: formData.geofence_id } : null,
        startLocation: startLoc,
        endLocation: endLoc,
        startTime: formData.planned_start,
        priority: formData.priority,
        purpose: formData.purpose,
        notes: formData.notes,
        startOdometer: parseFloat(formData.start_odometer) || 0,
        status: 'planned'
      };

      const response = await tripService.update(selectedTrip.id, payload);

      if (response?.success) {
        setSuccessMessage('✅ Trip updated!');
        setShowEditModal(false);
        resetForm();
        await loadData(false);
        eventBus.emit(EVENTS.TRIP_UPDATED, { action: 'updated' });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response?.message || 'Failed to update trip');
      }
    } catch (error) {
      console.error('Update trip error:', error);
      setErrorMessage(error.message || 'Failed to update trip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTrip) return;
    try {
      const response = await tripService.delete(selectedTrip.id);
      if (response?.success) {
        setSuccessMessage('✅ Trip deleted!');
        setShowDeleteConfirm(false);
        setSelectedTrip(null);
        await loadData(false);
        eventBus.emit(EVENTS.TRIP_UPDATED, { action: 'deleted' });
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response?.message || 'Failed to delete');
      }
    } catch (error) {
      setErrorMessage(error.message || 'Failed to delete');
    }
  };

  const handleAssignNow = async (trip, driverId) => {
    try {
      const payload = {
        vehicle: trip.vehicleId || trip.vehicle_id ? { id: trip.vehicleId || trip.vehicle_id } : null,
        driver: driverId ? { id: driverId } : null,
        startLocation: trip.startLocation,
        endLocation: trip.endLocation,
        startTime: trip.startTime,
        status: 'planned',
        priority: trip.priority || 'normal',
        purpose: trip.purpose,
        notes: trip.notes
      };
      const response = await tripService.update(trip.id, payload);
      if (response?.success) {
        setSuccessMessage('✅ Driver assigned!');
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      setErrorMessage('Failed to assign driver');
    }
  };

  // ============================================
  // RENDER: STATS
  // ============================================
    const renderStats = () => (
    <div className="flex flex-wrap gap-2 sm:gap-3 sm:grid sm:grid-cols-5 sm:flex-nowrap mb-4">
      <div className="flex-1 basis-[30%] sm:basis-auto bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide truncate">Total Planned</p>
        <p className="text-lg sm:text-2xl font-bold">{stats.total}</p>
      </div>
      <div className="flex-1 basis-[30%] sm:basis-auto bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide truncate">Today</p>
        <p className="text-lg sm:text-2xl font-bold text-blue-600">{stats.today}</p>
      </div>
      <div className="flex-1 basis-[30%] sm:basis-auto bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide truncate">Unassigned</p>
        <p className="text-lg sm:text-2xl font-bold text-orange-600">{stats.unassigned}</p>
      </div>
      <div className="flex-1 basis-[30%] sm:basis-auto bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide truncate">Assigned</p>
        <p className="text-lg sm:text-2xl font-bold text-green-600">{stats.assigned}</p>
      </div>
      <div className="flex-1 basis-[30%] sm:basis-auto bg-white p-2 sm:p-3 rounded-xl border border-gray-200">
        <p className="text-[9px] sm:text-[10px] text-gray-500 uppercase tracking-wide truncate">Overdue</p>
        <p className={`text-lg sm:text-2xl font-bold ${stats.overdue > 0 ? 'text-red-600 animate-pulse' : 'text-gray-400'}`}>
          {stats.overdue}
        </p>
      </div>
    </div>
  );

  // ============================================
  // RENDER: BOARD VIEW
  // ============================================
  const renderBoardView = () => {
    const unassigned = filteredTrips.filter(t => !t.driverId && !t.driver_id);
    const grouped = groupByDate();

    // Sort dates, skip 'unscheduled' (in unassigned column)
    const sortedDates = Object.keys(grouped)
      .filter(d => d !== 'unscheduled')
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(0, 7); // next 7 days

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {/* Unassigned column */}
        <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm text-orange-800 flex items-center gap-1">
              <AlertCircle size={14} /> Unassigned
            </h4>
            <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full font-bold">
              {unassigned.length}
            </span>
          </div>
          <div className="space-y-2">
            {unassigned.length === 0 && (
              <div className="text-center py-6 text-orange-400 text-xs">
                No unassigned trips
              </div>
            )}
            {unassigned.map(trip => renderTripCard(trip))}
          </div>
        </div>

        {/* Day columns */}
        {sortedDates.map(dateKey => {
          const dayTrips = grouped[dateKey];
          const dateObj = new Date(dateKey);
          const isToday = dateObj.toDateString() === new Date().toDateString();
          return (
            <div key={dateKey} className={`rounded-lg p-3 border-2 ${isToday ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <h4 className={`font-semibold text-sm flex items-center gap-1 ${isToday ? 'text-blue-800' : 'text-gray-700'}`}>
                  <CalendarIcon size={14} />
                  {dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                  {isToday && <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">TODAY</span>}
                </h4>
                <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                  {dayTrips.length}
                </span>
              </div>
              <div className="space-y-2">
                {dayTrips.map(trip => renderTripCard(trip))}
              </div>
            </div>
          );
        })}

        {sortedDates.length === 0 && (
          <div className="col-span-3 text-center py-12 text-gray-400">
            <CalendarIcon size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No scheduled trips</p>
            <p className="text-sm">Click "New Scheduled Trip" to plan ahead</p>
          </div>
        )}
      </div>
    );
  };

    const renderTripCard = (trip) => {
    const overdue = isOverdue(trip);
    const hasDriver = trip.driverId || trip.driver_id;
    return (
      <div
        key={trip.id}
        onClick={() => { setSelectedTrip(trip); openEditModal(trip); }}
        className={`bg-white px-2 py-1.5 rounded-md border cursor-pointer hover:shadow-md transition-all overflow-hidden ${
          overdue ? 'border-red-400 bg-red-50' : 'border-gray-200'
        }`}
      >
        {/* Row 1: Priority + Time + Overdue */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0 ${getPriorityColor(trip.priority)}`}>
            {getPriorityLabel(trip.priority)}
          </span>
          {overdue ? (
            <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse flex-shrink-0">
              ⏰ LATE
            </span>
          ) : (
            trip.startTime && (
              <span className="text-[9px] text-gray-500 flex items-center gap-0.5 flex-shrink-0">
                <Clock size={9} /> {formatTime(trip.startTime)}
              </span>
            )
          )}
        </div>

        {/* Locations - always visible */}
        <div className="text-[11px] font-semibold text-gray-800 truncate leading-tight">
          {trip.startLocation || 'Start'}
        </div>
        <div className="text-[10px] text-gray-500 truncate leading-tight">
          → {trip.endLocation || 'Destination'}
        </div>

        {/* Row 2: Vehicle + Driver inline */}
        <div className="mt-1 pt-1 border-t border-gray-100 flex items-center justify-between gap-1 text-[9px]">
          <span className="flex items-center gap-0.5 truncate text-gray-600 min-w-0">
            <Truck size={9} className="flex-shrink-0" />
            <span className="truncate">
              {(trip.vehicleId || trip.vehicle_id) 
                ? getVehicleLabel(trip.vehicleId || trip.vehicle_id) 
                : 'No vehicle'}
            </span>
          </span>
          <span className={`flex items-center gap-0.5 truncate flex-shrink-0 ${hasDriver ? 'text-blue-700' : 'text-orange-600 font-semibold'}`}>
            <User size={9} className="flex-shrink-0" />
            <span className="truncate max-w-[70px]">
              {hasDriver 
                ? getDriverName(trip.driverId || trip.driver_id) 
                : 'Unassigned'}
            </span>
          </span>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: LIST VIEW
  // ============================================
  const renderListView = () => (
    <div className="overflow-x-auto">
      {filteredTrips.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <List size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No scheduled trips</p>
        </div>
      ) : (
        <table className="min-w-full">
          <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
            <tr>
              <th className="p-3">Planned Start</th>
              <th className="p-3">Route</th>
              <th className="p-3 hidden md:table-cell">Vehicle</th>
              <th className="p-3">Driver</th>
              <th className="p-3">Priority</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips
              .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
              .map(trip => {
                const overdue = isOverdue(trip);
                return (
                  <tr key={trip.id} className={`border-b border-gray-100 hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="p-3 text-sm">
                      <div className="font-medium">{formatDate(trip.startTime)}</div>
                      <div className="text-xs text-gray-500">{formatTime(trip.startTime)}</div>
                    </td>
                    <td className="p-3 text-sm">
                      <div className="font-medium">{trip.startLocation || 'Start'}</div>
                      <div className="text-xs text-gray-500">→ {trip.endLocation || 'Destination'}</div>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">
                      {getVehicleLabel(trip.vehicleId || trip.vehicle_id)}
                    </td>
                    <td className="p-3 text-sm">
                      <span className={trip.driverId || trip.driver_id ? 'text-blue-700' : 'text-orange-600 font-semibold'}>
                        {getDriverName(trip.driverId || trip.driver_id)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(trip.priority)}`}>
                        {getPriorityLabel(trip.priority)}
                      </span>
                    </td>
                    <td className="p-3">
                      {overdue ? (
                        <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">⏰ Overdue</span>
                      ) : (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📅 Planned</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(trip)}
                          className="p-1 hover:bg-blue-100 rounded text-blue-600"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => { setSelectedTrip(trip); setShowDeleteConfirm(true); }}
                          className="p-1 hover:bg-red-100 rounded text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );

  // ============================================
  // RENDER: CALENDAR VIEW
  // ============================================
  const renderCalendarView = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];

        const tripsByDay = {};
    filteredTrips.forEach(trip => {
      if (!trip.startTime) return;
      // ✅ Strip timezone suffix
      const cleaned = trip.startTime.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
      const d = new Date(cleaned);
      if (d.getMonth() === month && d.getFullYear() === year) {
        const day = d.getDate();
        if (!tripsByDay[day]) tripsByDay[day] = [];
        tripsByDay[day].push(trip);
      }
    });

    const changeMonth = (delta) => {
      const nd = new Date(currentMonth);
      nd.setMonth(nd.getMonth() + delta);
      setCurrentMonth(nd);
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">{monthNames[month]} {year}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-gray-100 rounded">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="text-sm text-blue-600 hover:underline px-2">
              Today
            </button>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-gray-100 rounded">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: firstDay }, (_, i) => (
            <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded"></div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dayTrips = tripsByDay[day] || [];
            const isToday = new Date().getDate() === day &&
                           new Date().getMonth() === month &&
                           new Date().getFullYear() === year;
            return (
              <div
                key={day}
                className={`h-24 border rounded p-1 overflow-hidden ${
                  isToday ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white border-gray-200'
                }`}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-blue-700' : 'text-gray-700'}`}>
                  {day}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayTrips.slice(0, 2).map(trip => (
                    <div
                      key={trip.id}
                      onClick={() => openEditModal(trip)}
                      className={`text-[8px] truncate px-1 py-0.5 rounded cursor-pointer ${
                        trip.priority === 'urgent' ? 'bg-red-500 text-white' :
                        trip.priority === 'high' ? 'bg-orange-400 text-white' :
                        'bg-blue-100 text-blue-700'
                      }`}
                      title={`${trip.startLocation} → ${trip.endLocation}`}
                    >
                      {formatTime(trip.startTime)} {trip.startLocation}
                    </div>
                  ))}
                  {dayTrips.length > 2 && (
                    <div className="text-[8px] text-gray-500 text-center">+{dayTrips.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: FORM MODAL
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    if (!isOpen) return null;

    const handleSubmit = isEdit ? handleUpdate : handleCreate;
    const closeModal = () => {
      isEdit ? setShowEditModal(false) : setShowCreateModal(false);
      resetForm();
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closeModal}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-black" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Scheduled Trip' : 'New Scheduled Trip'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update the plan' : 'Plan a trip ahead of time'}
            </p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Planned Start */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Planned Start *
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.planned_start}
                  onChange={(e) => setFormData({ ...formData, planned_start: e.target.value })}
                />
              </div>

              {/* Route */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route (from Geofence)
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.geofence_id}
                  onChange={(e) => setFormData({ ...formData, geofence_id: e.target.value })}
                >
                  <option value="">— No route (fill manually) —</option>
                  {geofences.filter(g => g.type === 'route' && g.isActive).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* Start Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Nairobi Depot"
                  value={formData.start_location}
                  onChange={(e) => setFormData({ ...formData, start_location: e.target.value })}
                />
              </div>

              {/* End Location */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Mombasa Port"
                  value={formData.end_location}
                  onChange={(e) => setFormData({ ...formData, end_location: e.target.value })}
                />
              </div>

              {/* Vehicle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {vehicles.map(v => {
                    const isDecomm = v.status === 'Decommissioned' || v.status === 'decommissioned';
                    return (
                      <option key={v.id} value={v.id} disabled={isDecomm}>
                        {isDecomm ? '🔒 ' : ''}{v.registration || v.id} - {v.make} {v.model}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Driver */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.driver_id}
                  onChange={(e) => setFormData({ ...formData, driver_id: e.target.value })}
                >
                  <option value="">— Unassigned —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="low">🔵 Low</option>
                  <option value="normal">🟡 Normal</option>
                  <option value="high">🔴 High</option>
                  <option value="urgent">🚨 Urgent</option>
                </select>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Delivery, Pickup, Client visit"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                />
              </div>

              {/* Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Extra info for the driver..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? 'Update Trip' : 'Create Trip'}
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER: DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedTrip) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Scheduled Trip?</h3>
            <p className="text-gray-500 text-sm">
              This will remove the planned trip. This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isLoading && plannedTrips.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading scheduled trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success / Error banners */}
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
              <CalendarIcon size={24} className="text-blue-600" />
              Dispatch Board
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Plan, assign, and schedule trips in advance
            </p>
          </div>
                    <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => loadData(false)}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600"
              title="Refresh"
            >
              <RefreshCw size={14} className="sm:w-[18px] sm:h-[18px]" />
            </button>

            <button
              onClick={() => setActiveTab && setActiveTab('trips')}
              className="bg-purple-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-sm hover:bg-purple-700 flex items-center gap-1 sm:gap-2"
            >
              <Route size={12} className="sm:w-4 sm:h-4" />
              Trip History
            </button>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-2 py-1 sm:px-4 sm:py-2 rounded-lg text-[11px] sm:text-sm hover:bg-blue-700 flex items-center gap-1 sm:gap-2"
            >
              <Plus size={12} className="sm:w-4 sm:h-4" />
              New Scheduled Trip
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'board', label: 'Board', icon: LayoutGrid },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'list', label: 'List', icon: List },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveView(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 ${
                activeView === tab.id
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {renderStats()}

      {/* Search */}
      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by location, driver, vehicle, purpose..."
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* View */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        {activeView === 'board' && renderBoardView()}
        {activeView === 'calendar' && renderCalendarView()}
        {activeView === 'list' && renderListView()}
      </div>

      {/* Modals */}
      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
    </div>
  );
};

export default Dispatch;