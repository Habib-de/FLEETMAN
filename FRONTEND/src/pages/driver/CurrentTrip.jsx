// src/pages/driver/CurrentTrip.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Navigation, MapPin, Clock, Fuel,
  Play, StopCircle, AlertTriangle,
  Calendar, Plus, Edit2, Trash2, X, Check,
  Truck, AlertCircle, User, RefreshCw, PlayCircle, CheckCircle
} from 'lucide-react';
import { 
  driverService, 
  vehicleService, 
  tripService,
  geofenceService,
  checklistService
} from '../../services/api';
import webSocketService from '../../services/websocket';
import DriverReportModal from '../../components/common/DriverReportModal';
import { eventBus, EVENTS } from '../../services/eventBus';

// ============================================
// DYNAMIC LOCATION NAME CACHE
// ============================================
let locationNameCache = {};

const buildLocationCache = (geofences) => {
  const cache = {};
  geofences.forEach(geofence => {
    if (!geofence.isActive) return;
    if (geofence.type === 'route' && geofence.coordinates) {
      try {
        const points = typeof geofence.coordinates === 'string' 
          ? JSON.parse(geofence.coordinates) 
          : geofence.coordinates;
        if (Array.isArray(points)) {
          points.forEach((point) => {
            const lat = point.lat || point.latitude || point[0];
            const lng = point.lng || point.longitude || point[1];
            if (lat && lng) {
              const latFixed = parseFloat(lat).toFixed(4);
              const lngFixed = parseFloat(lng).toFixed(4);
              const name = point.name || point.location || 'Point';
              cache[`${latFixed}, ${lngFixed}`] = `📍 ${name}`;
              cache[`${latFixed},${lngFixed}`] = `📍 ${name}`;
            }
          });
        }
      } catch (e) {
        console.warn('Could not parse route coordinates:', e);
      }
    }
    if (geofence.type === 'circular' && geofence.centerLat && geofence.centerLng) {
      const latFixed = parseFloat(geofence.centerLat).toFixed(4);
      const lngFixed = parseFloat(geofence.centerLng).toFixed(4);
      cache[`${latFixed}, ${lngFixed}`] = `📍 ${geofence.name}`;
      cache[`${latFixed},${lngFixed}`] = `📍 ${geofence.name}`;
    }
  });
  return cache;
};

const getLocationName = (coordString) => {
  if (!coordString) return 'Unknown Location';
  const trimmed = coordString.trim();
  if (locationNameCache[trimmed]) return locationNameCache[trimmed];
  const noSpaceKey = trimmed.replace(/\s/g, '');
  for (const [key, name] of Object.entries(locationNameCache)) {
    if (key.replace(/\s/g, '') === noSpaceKey) return name;
  }
  return trimmed;
};

const getGeofenceLocations = (geofence) => {
  if (!geofence) return { start: 'Unknown Start', end: 'Unknown Destination' };
  
  if (geofence.points && geofence.points.length >= 2) {
    const first = geofence.points[0];
    const last = geofence.points[geofence.points.length - 1];
    return { 
      start: first.name || first.location || 'Start', 
      end: last.name || last.location || 'End' 
    };
  }
  
  if (geofence.coordinates) {
    try {
      const coords = typeof geofence.coordinates === 'string' 
        ? JSON.parse(geofence.coordinates) 
        : geofence.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        return { 
          start: first.name || first.location || 'Start', 
          end: last.name || last.location || 'End' 
        };
      }
    } catch (e) {
      console.warn('Could not parse geofence coordinates:', e);
    }
  }
  
  return { start: geofence.name || 'Start', end: geofence.name || 'End' };
};

const CurrentTrip = () => {
  const { currentUser } = useAuth();
  const { startTrip, endTrip, getActiveTrip, syncActiveTrips } = useTrip();
  
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripDuration, setTripDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [fuelUsed, setFuelUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [tripProgress, setTripProgress] = useState('0%');
  const [currentLocation, setCurrentLocation] = useState('Starting...');
  const [remainingDistance, setRemainingDistance] = useState('N/A');
  const [isSpeeding, setIsSpeeding] = useState(false);
  
  const [driverInfo, setDriverInfo] = useState(null);
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [availableDestinations, setAvailableDestinations] = useState([]);
  
  const [trips, setTrips] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [activeTripId, setActiveTripId] = useState(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  const [showChecklistConfirm, setShowChecklistConfirm] = useState(false);
  const [checklistConfirmMessage, setChecklistConfirmMessage] = useState('');
  const [pendingVehicleId, setPendingVehicleId] = useState(null);
  const [scheduledTrips, setScheduledTrips] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAlert, setActiveAlert] = useState(null);
  const [acknowledging, setAcknowledging] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  
  const isFirstLoad = useRef(true);
  const reconnectIntervalRef = useRef(null);
  const pendingTripUpdate = useRef(null);
  const pendingTrackingUpdate = useRef(null);
  const isMounted = useRef(true);
  const assignedVehicleRef = useRef(null);
  const tripEndedRef = useRef(false);
  
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    distance: '',
    duration: '',
    fuel: '',
    efficiency: '',
    status: 'Completed',
    startOdometer: '',
    endOdometer: '',
    plannedStart: '',
    purpose: ''
  });

  // ============================================
  // ✅ CHECK IF VEHICLE CAN TRIP - NO setErrorMessage() HERE!
  // ============================================
  const canVehicleTrip = () => {
    if (!assignedVehicle) {
      return false;
    }
    
    const status = assignedVehicle.status?.toLowerCase() || '';
    
    // ❌ Block if in maintenance
    if (status === 'maintenance') {
      return false;
    }
    
    // ❌ Block if decommissioned
    if (status === 'decommissioned') {
      return false;
    }
    
    return true;
  };

    // ============================================
  // ✅ CHECK TODAY'S CHECKLIST BEFORE STARTING TRIP
  // ============================================
  const checkTodayChecklist = async (vehicleId) => {
    try {
      const response = await checklistService.getHistory(vehicleId, currentUser.tenantId);
      const checklists = response?.data || [];
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      
      // Find checklist for today
      const todayChecklist = checklists.find(c => 
        c.inspectionDate?.split('T')[0] === today || 
        c.createdAt?.split('T')[0] === today
      );
      
      if (!todayChecklist) {
        return { 
          canStart: false, 
          message: '📋 Please complete today\'s pre-trip inspection first.' 
        };
      }
      
      // Check if checklist is completed or submitted
      const isCompleted = todayChecklist.status === 'completed' || 
                          todayChecklist.status === 'submitted';
      
      if (!isCompleted) {
        return { 
          canStart: false, 
          message: '📋 Please complete and submit today\'s inspection before starting a trip.' 
        };
      }
      
      // Check if there are failed items or defects
      const hasFailedItems = (todayChecklist.failedItems || 0) > 0;
      const hasDefects = (todayChecklist.defects || 0) > 0;
      
      if (hasFailedItems || hasDefects) {
        let issues = [];
        if (hasFailedItems) issues.push(`${todayChecklist.failedItems} failed item(s)`);
        if (hasDefects) issues.push(`${todayChecklist.defects} defect(s)`);
        
        return { 
          canStart: false, 
          message: `⚠️ Vehicle has inspection issues (${issues.join(', ')}). Please fix them before starting.` 
        };
      }
      
      return { canStart: true, message: '✅ Inspection complete!' };
      
    } catch (error) {
      console.error('Failed to check checklist:', error);
      return { 
        canStart: false, 
        message: '❌ Could not verify inspection status. Please try again.' 
      };
    }
  };

  // ============================================
  // WEBSOCKET SETUP
  // ============================================
  const setupWebSocket = () => {
    const token = localStorage.getItem('fleetman_token');
    if (!token) {
      console.warn('⚠️ No token found for WebSocket');
      return;
    }

    webSocketService.useWebSocket = true;
    webSocketService.reconnectAttempts = 0;
    webSocketService.connected = false;
    webSocketService.isConnecting = false;

    console.log('🔄 WebSocket state reset, connecting...');

    webSocketService.connect(
      token,
      () => {
        console.log('✅ CurrentTrip WebSocket connected');
        setIsWebSocketConnected(true);
        
        webSocketService.onMessage((type, data) => {
          if (type === 'trip') {
            handleTripUpdate(data);
          } else if (type === 'tracking') {
            handleTrackingUpdate(data);
          }
        });
      },
      () => {
        console.log('❌ CurrentTrip WebSocket disconnected');
        setIsWebSocketConnected(false);
      }
    );
  };

  // ============================================
// HANDLE TRIP UPDATES - IMPROVED
// ============================================
const handleTripUpdate = (data) => {
  console.log('📡 Trip update received:', data);
  
  const currentVehicle = assignedVehicleRef.current;
  
  if (!currentVehicle) {
    console.log('⚠️ assignedVehicle not loaded yet, storing for later');
    pendingTripUpdate.current = data;
    return;
  }
  
  const vehicleId = data.vehicleId || data.vehicle_id || data.vehicle?.id;
  const isOurVehicle = vehicleId === currentVehicle.id || vehicleId === currentVehicle.vehicleId;
  
  if (isOurVehicle) {
    const status = data.status || data.tripStatus || data.state;
    const progress = data.progress || data.completionPercentage;
    
    // ✅ Check for completion more thoroughly
    const isCompleted = 
        status === 'Completed' || 
        status === 'completed' || 
        status === 'Ended' ||
        status === 'ended' ||
        progress === '100%' ||
        progress === 100 ||
        data.completionReason !== undefined ||
        data.endedAt !== undefined;
    
    if (isCompleted) {
      if (tripEndedRef.current) {
        console.log('⚠️ Trip already ended, ignoring duplicate completion');
        return;
      }
      
      console.log('✅ Trip completed! Updating UI...');
      tripEndedRef.current = true;
      
      // ✅ Reset all trip states
      setIsTripActive(false);
      setActiveTripId(null);
      setTripDuration(0);
      setCurrentSpeed(0);
      setDistance(0);
      setFuelUsed(0);
      setTripProgress('100%');
      setCurrentLocation('📍 Trip Complete!');
      setRemainingDistance('0 km');
      setIsSpeeding(false);
      
      setSuccessMessage('✅ Trip completed!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // ✅ Force refresh
      loadTrips();
      syncActiveTrips();
      
    } else if (status === 'In Progress' || status === 'active') {
      tripEndedRef.current = false;
      setIsTripActive(true);
      setActiveTripId(data.id || data.tripId);
      if (data.progress) setTripProgress(data.progress);
    }
  }
};

  // ============================================
  // HANDLE TRACKING UPDATES
  // ============================================
  const handleTrackingUpdate = (data) => {
    console.log('📡 Tracking update received:', data);
    
    const currentVehicle = assignedVehicleRef.current;
    
    if (!currentVehicle) {
      console.log('⚠️ assignedVehicle not loaded yet, storing tracking for later.');
      pendingTrackingUpdate.current = data;
      return;
    }
    
    const vehicleId = data.vehicleId || data.vehicle_id || data.vehicle?.id;
    const isOurVehicle = vehicleId === currentVehicle.id || 
                         data.vehicleRegistration === currentVehicle.registration ||
                         data.vehicleRegistration === currentVehicle.reg;
    
    if (!isOurVehicle) {
      console.log('⚠️ Tracking update not for this vehicle');
      return;
    }
    
    console.log('✅ Processing tracking update for our vehicle');
    
    if (data.distance && data.remainingDistance) {
      const dist = Math.max(0, parseFloat(data.distance) || 0);
      const remaining = Math.max(0, parseFloat(data.remainingDistance) || 0);
      const totalDistance = dist + remaining;
      
      if (totalDistance > 0) {
        const progressPercent = Math.min(100, Math.round((dist / totalDistance) * 100));
        setTripProgress(`${progressPercent}%`);
        console.log(`📊 Progress: ${progressPercent}% (${dist.toFixed(1)}/${totalDistance.toFixed(1)} km)`);
      }
    }
    
    if (data.progress) {
      setTripProgress(typeof data.progress === 'string' ? data.progress : `${Math.round(data.progress)}%`);
    }
    
    if (data.speed !== undefined) {
      setCurrentSpeed(Math.max(0, Math.round(parseFloat(data.speed) || 0)));
    }
    
    if (data.lat && data.lng) {
      const locationName = getLocationName(`${data.lat}, ${data.lng}`);
      setCurrentLocation(locationName);
    }
    
    if (data.distance) {
      setDistance(Math.max(0, parseFloat(data.distance) || 0));
    }
    
    if (data.fuelUsed) {
      setFuelUsed(Math.max(0, parseFloat(data.fuelUsed) || 0));
    }
    
    if (data.remainingDistance) {
      const remaining = Math.max(0, parseFloat(data.remainingDistance) || 0);
      setRemainingDistance(remaining > 0 ? `${remaining.toFixed(1)} km` : '0 km');
    }
    
    if (data.isSpeeding !== undefined) {
      setIsSpeeding(data.isSpeeding);
    }
  };

  // ============================================
  // PROCESS PENDING UPDATES
  // ============================================
  useEffect(() => {
    if (assignedVehicleRef.current) {
      if (pendingTripUpdate.current) {
        console.log('📦 Processing pending trip update');
        handleTripUpdate(pendingTripUpdate.current);
        pendingTripUpdate.current = null;
      }
      if (pendingTrackingUpdate.current) {
        console.log('📦 Processing pending tracking update');
        handleTrackingUpdate(pendingTrackingUpdate.current);
        pendingTrackingUpdate.current = null;
      }
    }
  }, [assignedVehicle]);

  // ============================================
  // LOAD DRIVER & VEHICLE DATA - FIXED
  // ============================================
  const loadDriverData = async () => {
    setIsLoading(true);
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view your trips');
      setIsLoading(false);
      return;
    }

    try {
      let driver = null;
      
      if (currentUser.driverId) {
        try {
          const driverRes = await driverService.getById(currentUser.driverId);
          if (driverRes?.success && driverRes?.data) {
            driver = driverRes.data;
            console.log('✅ Driver found by ID:', driver);
          }
        } catch (error) {
          console.warn('Could not fetch driver by ID:', error.message);
        }
      }

      if (!driver && currentUser.email) {
        try {
          const driversRes = await driverService.getAll(currentUser.tenantId);
          if (driversRes?.success && driversRes?.data) {
            const driversList = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
            driver = driversList.find(d => 
              d.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
              d.userId === currentUser.id ||
              d.user_id === currentUser.id
            );
            if (driver) console.log('✅ Driver found by email:', driver);
          }
        } catch (error) {
          console.warn('Could not fetch driver by email:', error.message);
        }
      }

      if (!driver && currentUser.tenantId) {
        try {
          const driversRes = await driverService.getAll(currentUser.tenantId);
          if (driversRes?.success && driversRes?.data) {
            const driversList = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
            if (driversList.length > 0) {
              driver = driversList[0];
              console.log('✅ Using first driver as fallback:', driver);
            }
          }
        } catch (error) {
          console.warn('Could not fetch drivers for fallback:', error.message);
        }
      }

      if (!driver) {
        setErrorMessage('Driver profile not found. Please contact your fleet manager.');
        setIsLoading(false);
        return;
      }

      setDriverInfo(driver);
      
      const vehicleId = driver.assignedVehicleId || driver.assigned_vehicle || driver.vehicle_id;
      console.log('🔍 Vehicle ID:', vehicleId);
      
      if (!vehicleId) {
        setErrorMessage('No vehicle assigned. Please contact your fleet manager.');
        setAssignedVehicle(null);
        setIsLoading(false);
        return;
      }

      try {
        const vehicleRes = await vehicleService.getById(vehicleId);
        if (vehicleRes?.success && vehicleRes?.data) {
          const vehicle = vehicleRes.data;
          
          // ✅ FIX: Get assigned geofence from geofence_vehicles
          let assignedGeofenceId = null;
          try {
            // Get all geofences and find which one this vehicle is assigned to
            const geofencesRes = await geofenceService.getByTenant(currentUser.tenantId);
            if (geofencesRes?.success && geofencesRes?.data) {
              const geofences = Array.isArray(geofencesRes.data) ? geofencesRes.data : [geofencesRes.data];
              for (const geofence of geofences) {
                // Get assigned vehicles for this geofence
                const assignedRes = await geofenceService.getAssignedVehicleIds(geofence.id);
                if (assignedRes?.success && assignedRes?.data) {
                  const assignedIds = assignedRes.data;
                  if (assignedIds.includes(vehicleId)) {
                    assignedGeofenceId = geofence.id;
                    console.log('✅ Found assigned geofence:', geofence.name, 'for vehicle:', vehicleId);
                    break;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Could not fetch assigned geofence:', e);
          }
          
          const vehicleWithAssignment = {
            ...vehicle,
            assignedGeofenceId: assignedGeofenceId
          };
          
          setAssignedVehicle(vehicleWithAssignment);
          assignedVehicleRef.current = vehicleWithAssignment;
          
          console.log('✅ Vehicle loaded:', vehicle.registration || vehicle.id);
          console.log('✅ Assigned Geofence ID:', assignedGeofenceId);
          setSuccessMessage(`Vehicle ${vehicle.registration || vehicle.reg || vehicle.id} loaded`);
          
          if (pendingTripUpdate.current) {
            console.log('📦 Processing pending trip update after vehicle load');
            handleTripUpdate(pendingTripUpdate.current);
            pendingTripUpdate.current = null;
          }
          if (pendingTrackingUpdate.current) {
            console.log('📦 Processing pending tracking update after vehicle load');
            handleTrackingUpdate(pendingTrackingUpdate.current);
            pendingTrackingUpdate.current = null;
          }
          
          const activeTrip = getActiveTrip(vehicle.id);
          if (activeTrip) {
            tripEndedRef.current = false;
            setIsTripActive(true);
            setActiveTripId(activeTrip.id);
            setTripProgress(activeTrip.progress || '0%');
          }
        } else {
          setErrorMessage('Vehicle not found. Please contact your fleet manager.');
          setAssignedVehicle(null);
        }
      } catch (error) {
        console.warn('Could not fetch vehicle:', error.message);
        setErrorMessage('Vehicle not found. Please contact your fleet manager.');
        setAssignedVehicle(null);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
      setErrorMessage('Failed to load driver data');
    } finally {
      setIsLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  // ============================================
  // LOAD DESTINATIONS
  // ============================================
  const loadDestinations = async () => {
    if (!currentUser?.tenantId) return;
    
    try {
      const geofencesRes = await geofenceService.getByTenant(currentUser.tenantId);
      if (geofencesRes?.success && geofencesRes?.data) {
        const geofences = Array.isArray(geofencesRes.data) ? geofencesRes.data : [geofencesRes.data];
        locationNameCache = buildLocationCache(geofences);
        console.log('📍 Built location cache with', Object.keys(locationNameCache).length, 'entries');
        
        const destinations = geofences
          .filter(g => g.type === 'route' && g.isActive)
          .map(g => {
            const locations = getGeofenceLocations(g);
            let points = [];
            try {
              points = g.coordinates ? JSON.parse(g.coordinates) : [];
            } catch (e) {
              console.warn('Could not parse coordinates for:', g.name);
            }
            return {
              id: g.id,
              name: g.name,
              start: locations.start,
              end: locations.end,
              points: points,
              geofence: g
            };
          });
        setAvailableDestinations(destinations);
        console.log('✅ Loaded destinations:', destinations.length);
      }
    } catch (error) {
      console.warn('Could not load destinations:', error.message);
    }
  };

    // ============================================
  // ✅ LOAD SCHEDULED TRIPS (from Dispatch)
  // ============================================
  const loadScheduledTrips = async () => {
    if (!currentUser?.tenantId) return;
    
    try {
      const tripsRes = await tripService.getAll(currentUser.tenantId);
      if (tripsRes?.success && tripsRes?.data) {
        const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
        
        // Get driver's own ID
        const myDriverId = driverInfo?.id || currentUser?.driverId;
        const myUserId = currentUser?.id;
        const myName = currentUser?.name;
        
        // Filter: planned trips assigned to THIS driver
        const planned = allTrips.filter(t => {
          const status = (t.status || '').toLowerCase();
          if (status !== 'planned' && status !== 'scheduled') return false;
          
          const tripDriverId = t.driverId || t.driver_id || t.driver?.id;
          const tripDriverName = t.driverName || t.driver_name;
          
          return (
            (myDriverId && String(tripDriverId) === String(myDriverId)) ||
            (myUserId && String(tripDriverId) === String(myUserId)) ||
            (myName && tripDriverName === myName)
          );
        });
        
        // Sort by start time (earliest first)
        const sorted = planned.sort((a, b) => {
          const aTime = new Date(a.startTime || a.start_time || a.plannedStart || 0);
          const bTime = new Date(b.startTime || b.start_time || b.plannedStart || 0);
          return aTime - bTime;
        });
        
        setScheduledTrips(sorted);
        console.log(`📅 Loaded ${sorted.length} scheduled trips for driver`);
      }
    } catch (error) {
      console.warn('Could not load scheduled trips:', error.message);
      setScheduledTrips([]);
    }
  };


  // ============================================
  // LOAD TRIPS
  // ============================================
  const loadTrips = async () => {
    if (!currentUser?.tenantId) return;
    
    try {
      const tripsRes = await tripService.getAll(currentUser.tenantId);
      if (tripsRes?.success && tripsRes?.data) {
        const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
        
        const driverTrips = allTrips.filter(t => 
          t.driverId === currentUser?.id || 
          t.driver_id === currentUser?.id ||
          t.driverName === currentUser?.name ||
          t.driver?.id === currentUser?.driverId
        );
        
        const mappedTrips = driverTrips.map(trip => ({
          id: trip.id,
          from: trip.startLocation || trip.start_location || trip.from || 'Unknown Start',
          to: trip.endLocation || trip.end_location || trip.to || 'Unknown Destination',
          startLocation: trip.startLocation || trip.start_location || trip.from || 'Unknown Start',
          endLocation: trip.endLocation || trip.end_location || trip.to || 'Unknown Destination',
          distance: trip.distance || 0,
          duration: trip.duration || (() => {
  const start = trip.startTime || trip.start_time;
  const end = trip.endTime || trip.end_time;
  if (!start || !end) return 'N/A';
  try {
    const diffMs = new Date(end) - new Date(start);
    if (diffMs <= 0) return 'N/A';
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  } catch {
    return 'N/A';
  }
})(),
          fuelUsed: trip.fuelUsed || trip.fuel_used || 0,
          fuel: trip.fuel || trip.fuelUsed || 0,
          efficiency: (() => {
  // Use backend efficiency if valid
  if (trip.efficiency && trip.efficiency !== 'N/A' && !isNaN(parseFloat(trip.efficiency))) {
    return parseFloat(trip.efficiency).toFixed(1);
  }
  // Otherwise compute from distance + fuelUsed
  const dist = parseFloat(trip.distance) || 0;
  const fuel = parseFloat(trip.fuelUsed || trip.fuel_used) || 0;
  if (dist > 0 && fuel > 0) {
    return ((fuel / dist) * 100).toFixed(1);   // L/100km
  }
  return 'N/A';
})(),
          status: trip.status || 'Completed',
          startOdometer: trip.startOdometer || trip.start_odometer || 0,
          endOdometer: trip.endOdometer || trip.end_odometer || 0,
          plannedStart: trip.plannedStart || trip.planned_start || null,
          purpose: trip.purpose || 'Normal Trip',
          driverName: trip.driverName || trip.driver_name || currentUser?.name || 'Unknown',
          vehicleName: trip.vehicleName || trip.vehicle_name || 'Unknown',
          vehicleId: trip.vehicleId || trip.vehicle_id || trip.vehicle?.id,
          driverId: trip.driverId || trip.driver_id || trip.driver?.id,
          date: trip.date || trip.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
          createdAt: trip.createdAt || trip.created_at || new Date().toISOString(),
          updatedAt: trip.updatedAt || trip.updated_at,
          progress: trip.progress || '0%',
          _original: trip
        }));
        
        const sortedTrips = mappedTrips.sort((a, b) => {
          if (a.status === 'In Progress' && b.status !== 'In Progress') return -1;
          if (a.status !== 'In Progress' && b.status === 'In Progress') return 1;
          return new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date);
        });
        
        setTrips(sortedTrips);
      }
    } catch (error) {
      console.warn('Could not fetch trips:', error.message);
      setTrips([]);
    }
  };

  // ============================================
  // SAVE/UPDATE/DELETE TRIP
  // ============================================
  const saveTrip = async (tripData) => {
    try {
      const response = await tripService.create(tripData);
      if (response?.success) {
        await loadTrips();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error saving trip:', error);
      setErrorMessage('Failed to save trip. Please try again.');
      return false;
    }
  };

  const updateTrip = async (id, tripData) => {
    try {
      const response = await tripService.update(id, tripData);
      if (response?.success) {
        await loadTrips();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating trip:', error);
      setErrorMessage('Failed to update trip. Please try again.');
      return false;
    }
  };

  const deleteTrip = async (id) => {
    try {
      const response = await tripService.delete(id);
      if (response?.success) {
        await loadTrips();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting trip:', error);
      setErrorMessage('Failed to delete trip. Please try again.');
      return false;
    }
  };

  const resetForm = () => {
    setFormData({
      from: '',
      to: '',
      distance: '',
      duration: '',
      fuel: '',
      efficiency: '',
      status: 'Completed',
      startOdometer: '',
      endOdometer: '',
      plannedStart: '',
      purpose: ''
    });
  };

  const handleAddTrip = async () => {
    if (!assignedVehicle) {
      setErrorMessage('No vehicle assigned');
      return;
    }

    const tripData = {
      tenant: { id: currentUser?.tenantId },
      vehicle: { id: assignedVehicle.id },
      driver: { id: driverInfo?.id || currentUser?.driverId },
      startLocation: formData.from || 'Unknown Start',
      endLocation: formData.to || 'Unknown Destination',
      distance: formData.distance ? parseFloat(formData.distance) : 0,
      duration: formData.duration || 'N/A',
      fuelUsed: formData.fuel ? parseFloat(formData.fuel) : 0,
      efficiency: formData.efficiency || 'N/A',
      status: formData.status,
      startOdometer: formData.startOdometer ? parseInt(formData.startOdometer) : 0,
      endOdometer: formData.endOdometer ? parseInt(formData.endOdometer) : 0,
      plannedStart: formData.plannedStart || null,
      purpose: formData.purpose || 'Normal Trip',
      driverName: currentUser?.name || 'Unknown',
      vehicleName: assignedVehicle.registration || assignedVehicle.reg || 'Unknown'
    };

    const success = await saveTrip(tripData);
    if (success) {
      setShowAddModal(false);
      resetForm();
      setSuccessMessage('Trip added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleUpdateTrip = async () => {
    const tripData = {
      startLocation: formData.from || 'Unknown Start',
      endLocation: formData.to || 'Unknown Destination',
      distance: formData.distance ? parseFloat(formData.distance) : 0,
      duration: formData.duration || 'N/A',
      fuelUsed: formData.fuel ? parseFloat(formData.fuel) : 0,
      efficiency: formData.efficiency || 'N/A',
      status: formData.status,
      startOdometer: formData.startOdometer ? parseInt(formData.startOdometer) : 0,
      endOdometer: formData.endOdometer ? parseInt(formData.endOdometer) : 0,
      plannedStart: formData.plannedStart || null,
      purpose: formData.purpose || 'Normal Trip'
    };

    const success = await updateTrip(editingTrip.id, tripData);
    if (success) {
      setEditingTrip(null);
      resetForm();
      setSuccessMessage('Trip updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleDeleteTrip = async (id) => {
    const success = await deleteTrip(id);
    if (success) {
      setShowDeleteConfirm(null);
      setSuccessMessage('Trip deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEditClick = (trip) => {
    setEditingTrip(trip);
    setFormData({
      from: trip.from || '',
      to: trip.to || '',
      distance: trip.distance ? trip.distance.toString() : '',
      duration: trip.duration || '',
      fuel: trip.fuelUsed ? trip.fuelUsed.toString() : '',
      efficiency: trip.efficiency || '',
      status: trip.status || 'Completed',
      startOdometer: trip.startOdometer ? trip.startOdometer.toString() : '',
      endOdometer: trip.endOdometer ? trip.endOdometer.toString() : '',
      plannedStart: trip.plannedStart || '',
      purpose: trip.purpose || ''
    });
  };

    // ============================================
  // HANDLE START TRIP - SHOW CONFIRMATION FIRST
  // ============================================
  const handleStartTrip = async () => {
    // ✅ CHECK IF VEHICLE CAN TRIP
    if (!canVehicleTrip()) {
      const status = assignedVehicle?.status?.toLowerCase() || '';
      if (status === 'maintenance') {
        setErrorMessage('🔧 This vehicle is in maintenance and cannot be used for trips. Please contact your fleet manager.');
      } else if (status === 'decommissioned') {
        setErrorMessage('❌ This vehicle is decommissioned.');
      } else {
        setErrorMessage('Vehicle is not available for trips.');
      }
      return;
    }

    if (!assignedVehicle) {
      setErrorMessage('No vehicle assigned. Please contact your fleet manager.');
      return;
    }

    const vehicleId = assignedVehicle.id;

    const checklistResult = await checkTodayChecklist(vehicleId);
    if (!checklistResult.canStart) {
      setErrorMessage(checklistResult.message);
      return;
    }

    // ✅ SHOW CONFIRMATION INSTEAD OF STARTING IMMEDIATELY
    setPendingVehicleId(vehicleId);
    setChecklistConfirmMessage(
      '✅ Your pre-trip inspection is complete!\n\n' +
      'All items passed. Are you ready to start the trip?\n\n' +
      'Tap "Recheck" to review your inspection, or "Start Trip" to proceed.'
    );
    setShowChecklistConfirm(true);
  };

    // ============================================
  // ✅ CONFIRM START TRIP
  // ============================================
  const confirmStartTrip = async () => {
    setShowChecklistConfirm(false);
    const vehicleId = pendingVehicleId;
    
    if (!vehicleId) {
      setErrorMessage('Vehicle not found. Please try again.');
      return;
    }

    const existingTrip = getActiveTrip(vehicleId);
    if (existingTrip) {
      setErrorMessage('A trip is already in progress for this vehicle');
      return;
    }

    try {
      let startLocation = 'Start';
      let endLocation = 'Destination';
      let purpose = 'Normal Trip';
      let geofenceName = null;
      let routePoints = [];
      let selectedRoute = null;
      
      if (availableDestinations.length > 0) {
        const assignedGeofenceId = assignedVehicle.assignedGeofenceId;
        
        if (assignedGeofenceId) {
          selectedRoute = availableDestinations.find(r => r.id === assignedGeofenceId);
        }
        
        if (!selectedRoute) {
          selectedRoute = availableDestinations[0];
        }
        
        const locations = getGeofenceLocations(selectedRoute);
        startLocation = locations.start;
        endLocation = locations.end;
        geofenceName = selectedRoute.name;
        routePoints = selectedRoute.points || [];
        purpose = 'Normal Trip';
      }

      const newTrip = await startTrip(vehicleId, currentUser?.name || 'Driver', {
        from: startLocation,
        to: endLocation,
        destination: endLocation,
        geofenceId: selectedRoute?.id,
        geofenceName: geofenceName,
        routePoints: routePoints,
        purpose: purpose,
        startOdometer: assignedVehicle.mileage || '0 km',
        vehicleName: assignedVehicle.registration || assignedVehicle.reg || 'Unknown'
      });
      
      if (newTrip) {
        tripEndedRef.current = false;
        await loadTrips();
        setIsTripActive(true);
        setActiveTripId(newTrip.id);
        setTripDuration(0);
        setTripProgress('0%');
        setCurrentLocation('Starting...');
        setRemainingDistance('N/A');
        setIsSpeeding(false);
        setSuccessMessage(`🚗 Trip started: ${startLocation} → ${endLocation}`);
        setTimeout(() => setSuccessMessage(''), 5000);
        await syncActiveTrips();
      } else {
        setErrorMessage('Failed to start trip. Please try again.');
      }
    } catch (error) {
      console.error('Error starting trip:', error);
      setErrorMessage(error.message || 'Failed to start trip. Please try again.');
    }
  };

  // ============================================
  // ✅ RECHECK CHECKLIST (Navigate to Checklist)
  // ============================================
  const recheckChecklist = () => {
    setShowChecklistConfirm(false);
    setPendingVehicleId(null);
    // Navigate to Checklist page
    window.dispatchEvent(new CustomEvent('navigateTo', { 
      detail: { tab: 'checklist' } 
    }));
  };

  // ============================================
  // HANDLE START PLANNED TRIP - FIXED
  // ============================================
  const handleStartPlannedTrip = async (trip) => {
    // ✅ CHECK IF VEHICLE CAN TRIP
    if (!canVehicleTrip()) {
      const status = assignedVehicle?.status?.toLowerCase() || '';
      if (status === 'maintenance') {
        setErrorMessage('🔧 This vehicle is in maintenance and cannot be used for trips. Please contact your fleet manager.');
      } else if (status === 'decommissioned') {
        setErrorMessage('❌ This vehicle is decommissioned.');
      } else {
        setErrorMessage('Vehicle is not available for trips.');
      }
      return;
    }

    if (!assignedVehicle) {
      setErrorMessage('No vehicle assigned');
      return;
    }

    const vehicleId = assignedVehicle.id;
    
    const existingTrip = getActiveTrip(vehicleId);
    if (existingTrip) {
      setErrorMessage('A trip is already in progress for this vehicle');
      return;
    }

    try {
      let startLocation = trip.from || 'Start';
      let endLocation = trip.to || 'Destination';
      let purpose = trip.purpose || 'Normal Trip';
      let geofenceName = trip.routeName || null;
      let routePoints = [];
      let selectedRoute = null;
      
      const assignedGeofenceId = assignedVehicle.assignedGeofenceId;
      
      if (assignedGeofenceId) {
        selectedRoute = availableDestinations.find(r => r.id === assignedGeofenceId);
        if (selectedRoute) {
          const locations = getGeofenceLocations(selectedRoute);
          startLocation = locations.start;
          endLocation = locations.end;
          geofenceName = selectedRoute.name;
          routePoints = selectedRoute.points || [];
          console.log('📍 Found assigned route for planned trip:', geofenceName);
        }
      }
      
      if (!selectedRoute && trip.geofenceId) {
        const route = availableDestinations.find(r => r.id === trip.geofenceId);
        if (route) {
          const locations = getGeofenceLocations(route);
          startLocation = locations.start;
          endLocation = locations.end;
          geofenceName = route.name;
          routePoints = route.points || [];
          selectedRoute = route;
          console.log('📍 Found geofence for trip:', geofenceName);
        }
      }
      
      if (startLocation === 'Start' || endLocation === 'Destination') {
        if (trip.routeName && trip.routeName.includes(' to ')) {
          const parts = trip.routeName.split(' to ');
          if (parts.length === 2) {
            startLocation = parts[0].trim();
            endLocation = parts[1].trim();
          }
        }
      }

      console.log('📍 Starting planned trip:', { startLocation, endLocation, geofenceName });

            // ✅ Only UPDATE the existing planned trip — do NOT create a new one
      const updateData = {
        status: 'In Progress',
        startLocation: startLocation,
        endLocation: endLocation,
        purpose: purpose,
        startTime: new Date().toISOString(),
        geofence: (selectedRoute?.id || trip.geofenceId)
          ? { id: selectedRoute?.id || trip.geofenceId }
          : null
      };

      const result = await tripService.update(trip.id, updateData);

      if (result?.success) {
        tripEndedRef.current = false;
        await syncActiveTrips();
        await loadTrips();
        setIsTripActive(true);
        setActiveTripId(trip.id);
        setTripDuration(0);
        setTripProgress('0%');
        setCurrentLocation('Starting...');
        setRemainingDistance('N/A');
        setIsSpeeding(false);
        setSuccessMessage(`🚗 Trip started: ${startLocation} → ${endLocation}`);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage('Failed to start trip. Please try again.');
      }
    } catch (error) {
      console.error('Error starting planned trip:', error);
      setErrorMessage('Failed to start trip. Please try again.');
    }
  };

  // ============================================
// END TRIP - FIXED WITH FULL UI RESET
// ============================================
const handleEndTrip = async () => {
  if (!assignedVehicle) {
    setErrorMessage('No vehicle assigned');
    return;
  }

  try {
    // Show loading state
    setIsLoading(true);
    
    const tripEndData = {
      distance: distance,
      duration: formatTime(tripDuration),
      fuelUsed: fuelUsed,
      efficiency: (fuelUsed / (distance || 0.1)) * 100,
      endOdometer: (parseFloat(assignedVehicle.mileage || 0) + distance)
    };

    const endedTrip = await endTrip(assignedVehicle.id, tripEndData);
    
    if (endedTrip) {
      // ✅ Mark trip as ended
      tripEndedRef.current = true;
      
      // ✅ Reset ALL trip-related states
      setIsTripActive(false);
      setActiveTripId(null);
      setTripDuration(0);
      setCurrentSpeed(0);
      setDistance(0);
      setFuelUsed(0);
      setTripProgress('100%'); // Show completed
      setCurrentLocation('📍 Trip Complete!');
      setRemainingDistance('0 km');
      setIsSpeeding(false);
      
      // ✅ Force refresh all data
      await syncActiveTrips();
      await loadTrips();
      await loadDriverData(); // Refresh vehicle data too
      
      // ✅ Clear any pending updates
      pendingTripUpdate.current = null;
      pendingTrackingUpdate.current = null;
      
      // ✅ Show success message
      setSuccessMessage('✅ Trip completed successfully!');
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // ✅ Force re-render by triggering a state update
      setTrips(prev => [...prev]); // This forces a re-render of the trip list
      
    } else {
      setErrorMessage('❌ Failed to end trip. Please try again.');
    }
  } catch (error) {
    console.error('Error ending trip:', error);
    setErrorMessage('❌ Failed to end trip. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

const handleAcknowledgeAlert = async () => {
  if (!activeAlert) return;
  setAcknowledging(true);
  try {
    const { notificationService } = await import('../../services/api');
    await notificationService.markAsRead(activeAlert.id);
    console.log('✅ Alert acknowledged:', activeAlert.id);
    setActiveAlert(null);
    setSuccessMessage('✅ Alert acknowledged');
    setTimeout(() => setSuccessMessage(''), 3000);
  } catch (e) {
    console.error('Failed to acknowledge alert:', e);
    setErrorMessage('Failed to acknowledge. Please try again.');
  } finally {
    setAcknowledging(false);
  }
};

const handleDismissAlert = () => {
  setActiveAlert(null);
};

  // ============================================
  // TRIP LOGIC
  // ============================================
  useEffect(() => {
    let interval;
    if (isTripActive) {
      interval = setInterval(() => {
        setTripDuration(prev => prev + 1);
        if (!isWebSocketConnected) {
          setCurrentSpeed(Math.floor(20 + Math.random() * 60));
          setDistance(prev => prev + (Math.random() * 0.05));
          setFuelUsed(prev => prev + (Math.random() * 0.005));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTripActive, isWebSocketConnected]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const getStatusBadge = (status) => {
    const colors = {
      'Completed': 'bg-green-100 text-green-700',
      'In Progress': 'bg-yellow-100 text-yellow-700 animate-pulse',
      'Cancelled': 'bg-red-100 text-red-700',
      'Planned': 'bg-blue-100 text-blue-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // ============================================
  // CHECK ACTIVE TRIP
  // ============================================
  useEffect(() => {
    if (assignedVehicle) {
      const vehicleId = assignedVehicle.id;
      const activeTrip = getActiveTrip(vehicleId);
      if (activeTrip) {
        tripEndedRef.current = false;
        setIsTripActive(true);
        setActiveTripId(activeTrip.id);
        setTripProgress(activeTrip.progress || '0%');
      }
    }
  }, [assignedVehicle, getActiveTrip]);

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      const initialize = async () => {
        await loadDriverData();
        await loadTrips();
        await loadScheduledTrips();
        await loadDestinations();
        
        if (isFirstLoad.current) {
          setupWebSocket();
          isFirstLoad.current = false;
        }
      };
      
      initialize();
    }
    
    return () => {
      isMounted.current = false;
      if (!isFirstLoad.current) {
        webSocketService.disconnect();
      }
    };
  }, [currentUser]);

  // ============================================
  // WEBSOCKET RECONNECTION
  // ============================================
  useEffect(() => {
    if (reconnectIntervalRef.current) {
      clearInterval(reconnectIntervalRef.current);
    }

    reconnectIntervalRef.current = setInterval(() => {
      if (!isWebSocketConnected && currentUser) {
        console.log('🔄 WebSocket disconnected, attempting reconnect...');
        setupWebSocket();
      }
    }, 10000);

    return () => {
      if (reconnectIntervalRef.current) {
        clearInterval(reconnectIntervalRef.current);
      }
    };
  }, [isWebSocketConnected, currentUser]);

  // ============================================
  // AUTO-REFRESH POLLING
  // ============================================
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!isWebSocketConnected) {
        loadTrips();
        syncActiveTrips();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isWebSocketConnected]);

    // ============================================
  // ✅ LISTEN FOR DISPATCH ASSIGNMENTS
  // ============================================
  useEffect(() => {
    const handleTripAssigned = () => {
      console.log('🔄 Dispatch updated, reloading scheduled trips...');
      loadScheduledTrips();
    };
    
    const unsub = eventBus.on(EVENTS.TRIP_UPDATED, handleTripAssigned);
    const unsub2 = eventBus.on(EVENTS.TRIP_STARTED, handleTripAssigned);
    
    return () => {
      unsub();
      unsub2();
    };
  }, [driverInfo]);

  // ============================================
// ✅ LISTEN FOR MANAGER ALERTS
// ============================================
useEffect(() => {
  const handleNewNotification = (event) => {
    const notif = event.detail;
    if (!notif) return;

        const type = notif.type || '';

    // ---- Manager replied to our driver report ----
    if (type.startsWith('driver_report_reply_')) {
      setActiveAlert({
        id: notif.id,
        code: 'MESSAGE',
        title: '💬 Manager replied',
        message: notif.message || '',
        createdAt: notif.createdAt || new Date().toISOString(),
      });
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } catch (e) { /* silent */ }
      return;
    }

    // ---- Manager acknowledged our driver report ----
    if (type.startsWith('driver_report_ack_')) {
      setSuccessMessage(`✅ Manager acknowledged: ${notif.message || 'Your report was received'}`);
      setTimeout(() => setSuccessMessage(''), 6000);
      return;
    }

    // ---- Manager resolved our driver report ----
    if (type.startsWith('driver_report_resolved_')) {
      setSuccessMessage(`✅ Manager resolved: ${notif.message || 'Your report has been resolved'}`);
      setTimeout(() => setSuccessMessage(''), 6000);
      return;
    }

    // ---- Manager alerts (existing behavior) ----
    if (!type.startsWith('manager_alert_')) return;

    const alertCode = type.replace('manager_alert_', '');
    console.log('🚨 Manager alert received:', alertCode, notif);

    setActiveAlert({
      id: notif.id,
      code: alertCode,
      title: notif.title || 'Alert',
      message: notif.message || '',
      createdAt: notif.createdAt || new Date().toISOString(),
    });

    // Beep for high-severity alerts
    if (['STOP_VEHICLE', 'DANGER_AHEAD', 'ABORT_TRIP', 'CALL_DISPATCH'].includes(alertCode)) {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) { /* silent */ }
    }
  };

  window.addEventListener('newNotification', handleNewNotification);

  // Also fetch existing unread manager alerts on mount
  const checkExistingAlerts = async () => {
    if (!currentUser?.id) return;
    try {
      const { notificationService } = await import('../../services/api');
      const res = await notificationService.getUnread(currentUser.id);
      const notifications = res?.data || [];
            // Priority 1: unanswered manager replies to driver reports
      const reportReplies = notifications.filter(n =>
        n.type && n.type.startsWith('driver_report_reply_')
      );
      if (reportReplies.length > 0) {
        const latest = reportReplies[0];
        setActiveAlert({
          id: latest.id,
          code: 'MESSAGE',
          title: '💬 Manager replied',
          message: latest.message || '',
          createdAt: latest.createdAt || new Date().toISOString(),
        });
        return;
      }

      // Priority 2: manager alerts (existing behavior)
      const managerAlerts = notifications.filter(n =>
        n.type && n.type.startsWith('manager_alert_')
      );
      if (managerAlerts.length > 0) {
        const latest = managerAlerts[0];
        setActiveAlert({
          id: latest.id,
          code: latest.type.replace('manager_alert_', ''),
          title: latest.title || 'Alert',
          message: latest.message || '',
          createdAt: latest.createdAt || new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn('Could not check existing alerts:', e);
    }
  };

  checkExistingAlerts();

  return () => {
    window.removeEventListener('newNotification', handleNewNotification);
  };
}, [currentUser?.id]);

  // ============================================
// WATCH FOR TRIP COMPLETION - AUTO RESET
// ============================================
useEffect(() => {
  // If trip ended, make sure UI is reset
  if (tripEndedRef.current) {
    setIsTripActive(false);
    setActiveTripId(null);
    setTripDuration(0);
    setCurrentSpeed(0);
    setDistance(0);
    setFuelUsed(0);
    setTripProgress('100%');
    setCurrentLocation('📍 Trip Complete!');
    setRemainingDistance('0 km');
    setIsSpeeding(false);
  }
}, [tripEndedRef.current]);

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your trip data...</p>
        </div>
      </div>
    );
  }

  if (!assignedVehicle && !isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 rounded-full bg-yellow-100 mx-auto flex items-center justify-center mb-4">
            <Truck size={48} className="text-yellow-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vehicle Assigned</h3>
          <p className="text-gray-500">{errorMessage || 'You don\'t have a vehicle assigned to you yet.'}</p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertCircle size={16} />
              <p className="text-sm">Contact your fleet manager to assign a vehicle</p>
            </div>
          </div>
          <button
            onClick={loadDriverData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const vehicleDisplay = assignedVehicle ? (assignedVehicle.registration || assignedVehicle.reg || assignedVehicle.id) : 'N/A';
  const driverDisplay = driverInfo?.name || currentUser?.name || 'Driver';

  // ✅ Check if vehicle can trip for button state - NO setErrorMessage() here!
  const vehicleCanTrip = canVehicleTrip();

  const filteredTrips = trips.filter(trip => {
  if (!searchTerm) return true;
  const q = searchTerm.toLowerCase();
  return (
    (trip.from || '').toLowerCase().includes(q) ||
    (trip.to || '').toLowerCase().includes(q) ||
    (trip.purpose || '').toLowerCase().includes(q) ||
    (trip.status || '').toLowerCase().includes(q) ||
    (trip.vehicleName || '').toLowerCase().includes(q) ||
    (trip.date || '').toLowerCase().includes(q)
  );
});

  return (
    <div className="space-y-3 md:space-y-6">
      {/* ============================================ */}
{/* 🚨 MANAGER ALERT BANNER */}
{/* ============================================ */}
{activeAlert && (
  <div
    className={`rounded-xl p-4 shadow-lg border-2 ${
      ['STOP_VEHICLE', 'DANGER_AHEAD', 'ABORT_TRIP', 'CALL_DISPATCH'].includes(activeAlert.code)
        ? 'bg-red-50 border-red-500 text-red-900 animate-pulse'
        : ['SLOW_DOWN', 'WRONG_ROUTE', 'RETURN_TO_DEPOT'].includes(activeAlert.code)
          ? 'bg-yellow-50 border-yellow-500 text-yellow-900'
          : 'bg-blue-50 border-blue-500 text-blue-900'
    }`}
  >
    <div className="flex flex-wrap items-start gap-3">
      <div className="flex-shrink-0 text-3xl">
        {activeAlert.code === 'STOP_VEHICLE' && '🛑'}
        {activeAlert.code === 'SLOW_DOWN' && '⚠️'}
        {activeAlert.code === 'MESSAGE' && '💬'}
        {activeAlert.code === 'WRONG_ROUTE' && '📍'}
        {activeAlert.code === 'RETURN_TO_DEPOT' && '⏱️'}
        {activeAlert.code === 'TAKE_BREAK' && '☕'}
        {activeAlert.code === 'DANGER_AHEAD' && '🚨'}
        {activeAlert.code === 'CALL_DISPATCH' && '📞'}
        {activeAlert.code === 'ABORT_TRIP' && '🚫'}
        {activeAlert.code === 'ACKNOWLEDGE' && '✅'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">
          Alert from Fleet Manager
        </p>
        <h3 className="text-lg font-bold">{activeAlert.title}</h3>
        <p className="text-sm mt-1 whitespace-pre-line">{activeAlert.message}</p>
        <p className="text-[10px] opacity-60 mt-1">
          {new Date(activeAlert.createdAt).toLocaleTimeString()}
        </p>
      </div>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          onClick={handleAcknowledgeAlert}
          disabled={acknowledging}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-1.5"
        >
          {acknowledging ? (
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
          ) : (
            <Check size={14} />
          )}
          Acknowledge
        </button>
        <button
          onClick={handleDismissAlert}
          className="px-4 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-white/50 rounded-lg"
        >
          Dismiss
        </button>
      </div>
    </div>
  </div>
)}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2 whitespace-pre-line">
          <Check size={16} className="flex-shrink-0" /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" /> {errorMessage}
        </div>
      )}

            {/* ============================================ */}
      {/* ✅ SCHEDULED TRIPS FROM DISPATCH */}
      {/* ============================================ */}
      {scheduledTrips.length > 0 && !isTripActive && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
              <Calendar size={18} className="text-blue-600" />
              Your Scheduled Trips
              <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                {scheduledTrips.length}
              </span>
            </h3>
          </div>
          
                    <div className="space-y-2">
            {scheduledTrips.map((trip) => {
              const startTime = trip.startTime || trip.start_time || trip.plannedStart;
              const cleanStartTime = startTime ? startTime.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '') : null;
              
              const scheduledDate = cleanStartTime ? new Date(cleanStartTime) : null;
              const now = new Date();
              
              const isToday = scheduledDate && scheduledDate.toDateString() === now.toDateString();
              const isOverdue = scheduledDate && scheduledDate < now && !isToday;
              
              // ✅ NEW: Can the trip be started now?
              const canStartNow = scheduledDate ? scheduledDate <= now : true;   // If no time set, allow start
              const timeUntilStart = scheduledDate && scheduledDate > now
                ? Math.ceil((scheduledDate - now) / (1000 * 60))   // minutes
                : 0;
              
              return (
                <div 
                  key={trip.id} 
                  className={`bg-white p-3 rounded-lg border-2 flex flex-wrap items-center justify-between gap-3 ${
                    isToday ? 'border-blue-400 shadow-md' : 'border-gray-200'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isToday && (
                        <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-bold">
                          TODAY
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                          ⏰ OVERDUE
                        </span>
                      )}
                      {trip.priority === 'urgent' && (
                        <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
                          🚨 URGENT
                        </span>
                      )}
                      {trip.priority === 'high' && (
                        <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">
                          HIGH
                        </span>
                      )}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock size={12} />
                        {startTime 
  ? new Date(startTime.replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '')).toLocaleString()
  : 'No time set'
}
                      </span>
                    </div>
                    
                                        <div className="mt-0.5 sm:mt-1 font-medium text-gray-800 flex items-center gap-1 text-xs sm:text-sm">
                      <MapPin size={11} className="sm:w-[14px] sm:h-[14px] text-blue-600 flex-shrink-0" />
                      <span className="truncate">{trip.startLocation || 'Start'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate">{trip.endLocation || 'Destination'}</span>
                    </div>
                    
                    {trip.purpose && (
                      <div className="text-[10px] sm:text-xs text-gray-500 mt-0.5 truncate">
                        📋 {trip.purpose}
                      </div>
                    )}
                    
                    {/* {trip.purpose && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        📋 {trip.purpose}
                      </div>
                    )} */}
                  </div>
                  
                                                      <button
                    onClick={() => handleStartPlannedTrip({
                      id: trip.id,
                      from: trip.startLocation,
                      to: trip.endLocation,
                      purpose: trip.purpose,
                      geofenceId: trip.geofenceId || trip.geofence_id,
                      routeName: trip.geofenceName || trip.geofence_name
                    })}
                    disabled={!vehicleCanTrip || !canStartNow}
                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium flex items-center gap-1 sm:gap-1.5 transition-all whitespace-nowrap flex-shrink-0 ${
                      !vehicleCanTrip || !canStartNow
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                    }`}
                  >
                    <PlayCircle size={12} className="sm:w-4 sm:h-4 flex-shrink-0" />
                    {!vehicleCanTrip 
                      ? 'Unavailable' 
                      : !canStartNow 
                        ? `Starts in ${timeUntilStart}min` 
                        : 'Start'}
                  </button>
                </div>
              );
            })}
          </div>
          
          <p className="text-[10px] text-blue-600 mt-2 text-center">
            💡 These trips were scheduled by your fleet manager
          </p>
        </div>
      )}


      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isWebSocketConnected ? (
            <span className="flex items-center gap-1 text-green-600">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Live updates active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-yellow-600">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Polling mode
            </span>
          )}
          {assignedVehicle && (
            <span className="text-gray-400">| Vehicle: {vehicleDisplay}</span>
          )}
        </div>
        <button
          onClick={() => { loadDriverData(); loadTrips(); loadDestinations(); }}
          className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
                {[
          { label: 'Trips', value: trips.length, icon: Navigation, color: 'blue' },
          { label: 'Distance', value: calculateTotalDistance(trips), icon: MapPin, color: 'green' },
          { label: 'Efficiency', value: calculateAvgEfficiency(trips), icon: Fuel, color: 'yellow' },
          { label: 'Duration', value: calculateTotalDuration(trips), icon: Clock, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-white px-2 py-1 md:p-4 rounded-xl shadow-sm border border-gray-200 min-w-0">
            <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
              <div className={`p-1 md:p-2 bg-${stat.color}-50 rounded-lg text-${stat.color}-600 w-fit`}>
                <stat.icon size={12} className="md:w-[18px] md:h-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] md:text-xs text-gray-500 truncate leading-tight">
                  {stat.label}
                </p>
                <p className="text-[11px] md:text-lg font-bold truncate leading-tight">
                  {stat.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              {isTripActive ? (
                <>
                  🟢 Trip In Progress
                  {isSpeeding && (
                    <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      ⚠️ SPEEDING
                    </span>
                  )}
                </>
              ) : (
                '⚪ Ready for Trip'
              )}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {isTripActive 
                ? '🚀 Your trip is being tracked live' 
                : 'Start your next trip'}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <User size={12} /> {driverDisplay}
              </span>
              <span className="flex items-center gap-1">
                <Truck size={12} /> {vehicleDisplay}
              </span>
              {assignedVehicle && (
                <span className="text-gray-500">
                  {assignedVehicle.make} {assignedVehicle.model}
                </span>
              )}
            </div>
            {!isTripActive && availableDestinations.length > 0 && (
              <div className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                📍 Route: {
                  (() => {
                    const assignedGeofenceId = assignedVehicle?.assignedGeofenceId;
                    let route = null;
                    
                    if (assignedGeofenceId) {
                      route = availableDestinations.find(r => r.id === assignedGeofenceId);
                    }
                    
                    if (!route) {
                      route = availableDestinations[0];
                    }
                    
                    return `${getLocationName(route.start)} → ${getLocationName(route.end)}`;
                  })()
                }
              </div>
            )}
          </div>
          {isTripActive && (
            <div className="text-right">
              <p className="text-2xl font-mono font-bold text-blue-600">{formatTime(tripDuration)}</p>
              <p className="text-xs text-gray-400">Trip Duration</p>
            </div>
          )}
        </div>

        {isTripActive && (
          <>
            <div className="mb-4 p-3 rounded-lg border" style={{ backgroundColor: isSpeeding ? '#fef2f2' : '#eff6ff', borderColor: isSpeeding ? '#fecaca' : '#bfdbfe' }}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">📍 {currentLocation || 'In transit...'}</span>
                <span className="font-bold" style={{ color: isSpeeding ? '#dc2626' : '#2563eb' }}>
                  {tripProgress}
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ 
                    width: tripProgress,
                    backgroundColor: isSpeeding ? '#dc2626' : '#3b82f6'
                  }}
                ></div>
              </div>
              {remainingDistance && remainingDistance !== 'N/A' && remainingDistance !== '0 km' && (
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Remaining: {remainingDistance}</span>
                  {isSpeeding && (
                    <span className="text-red-600 font-medium animate-pulse">⚠️ SPEEDING</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500">Speed</p>
                <p className={`text-lg font-bold ${isSpeeding ? 'text-red-600' : 'text-blue-600'}`}>
                  {currentSpeed} km/h
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Distance</p>
                <p className="text-lg font-bold text-green-600">{distance.toFixed(1)} km</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Fuel Used</p>
                <p className="text-lg font-bold text-yellow-600">{fuelUsed.toFixed(1)} L</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-500">Efficiency</p>
                <p className="text-lg font-bold text-purple-600">{(fuelUsed / (distance || 0.1) * 100).toFixed(1)} L/100km</p>
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-3">
          {!isTripActive ? (
            <>

            {!vehicleCanTrip && assignedVehicle && assignedVehicle.status === 'Maintenance' && (
  <div className="w-full mb-2 p-3 bg-yellow-50 border border-yellow-300 rounded-lg text-yellow-800 text-sm flex items-start gap-2">
    <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-yellow-600" />
    <div>
      <p className="font-medium">🔧 Vehicle in Maintenance</p>
      <p className="text-xs text-yellow-700 mt-0.5">
        {assignedVehicle.maintenanceReason || 'This vehicle is currently undergoing maintenance. Please contact your fleet manager.'}
      </p>
    </div>
  </div>
)}

{!vehicleCanTrip && assignedVehicle && assignedVehicle.status === 'Decommissioned' && (
  <div className="w-full mb-2 p-3 bg-red-50 border border-red-300 rounded-lg text-red-800 text-sm flex items-start gap-2">
    <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-red-600" />
    <div>
      <p className="font-medium">❌ Vehicle Decommissioned</p>
      <p className="text-xs text-red-700 mt-0.5">
        This vehicle has been decommissioned. Please contact your fleet manager.
      </p>
    </div>
  </div>
)}
              <button 
                onClick={handleStartTrip} 
                disabled={!vehicleCanTrip}
                className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                  !vehicleCanTrip 
                    ? 'bg-gray-400 text-white cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700 hover:scale-105'
                }`}
              >
                <Play size={18} /> 
                {!vehicleCanTrip ? '🚫 Vehicle Unavailable' : 'Start Trip'}
              </button>
                <button 
                onClick={() => setShowReportModal(true)}
                disabled={!assignedVehicle}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 flex items-center justify-center gap-2 transition-all hover:scale-105 disabled:bg-gray-300"
              >
                <AlertTriangle size={18} /> Report to Manager
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={handleEndTrip} 
                className="flex-1 bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <StopCircle size={18} /> End Trip
              </button>
              <button 
                onClick={() => setShowReportModal(true)}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 flex items-center justify-center gap-2 transition-all hover:scale-105"
              >
                <AlertTriangle size={18} /> Report to Manager
              </button>
            </>
          )}
        </div>
      </div>

      {/* Trip History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
  <h3 className="font-semibold text-lg flex items-center gap-2">
    <Clock size={20} className="text-blue-600" />
    Trip History
    <span className="text-xs text-gray-400 font-normal">
  ({filteredTrips.length}{searchTerm ? ` of ${trips.length}` : ''} trips)
</span>
  </h3>
  <div className="relative w-full sm:w-72">
    <input
      type="text"
      placeholder="Search trips..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
    />
    <svg
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    {searchTerm && (
      <button
        onClick={() => setSearchTerm('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
      >
        <X size={12} className="text-gray-400" />
      </button>
    )}
  </div>
</div>

        <div className="space-y-3">
          {filteredTrips.length === 0 ? (
  <div className="text-center py-8 text-gray-400">
    {searchTerm ? (
      <>
        <p>No trips match "{searchTerm}"</p>
        <button
          onClick={() => setSearchTerm('')}
          className="text-sm text-blue-600 hover:underline mt-2"
        >
          Clear search
        </button>
      </>
    ) : (
      <>
        <p>No trips recorded yet</p>
        <p className="text-sm">Your trips will appear here</p>
      </>
    )}
  </div>
) : (
  filteredTrips.map((trip) => (
              <div key={trip.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border-l-4 border-l-transparent">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{getLocationName(trip.from)}</span>
                    <span className="text-gray-400">→</span>
                    <span className="font-medium">{getLocationName(trip.to)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(trip.status)}`}>
                      {trip.status === 'Completed' ? <CheckCircle size={12} className="inline mr-1" /> : null}
                      {trip.status}
                    </span>
                    {trip.vehicleName && (
                      <span className="text-xs text-gray-400">{trip.vehicleName}</span>
                    )}
                    {trip.purpose && (
                      <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                        📋 {trip.purpose}
                      </span>
                    )}
                    {trip.progress && trip.progress !== '0%' && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded">
                        {trip.progress}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                    <span><Calendar size={12} className="inline mr-1" /> {trip.date || trip.createdAt?.split('T')[0] || 'N/A'}</span>
                    <span><Clock size={12} className="inline mr-1" /> {trip.duration || 'N/A'}</span>
                    <span><Navigation size={12} className="inline mr-1" /> {trip.distance ? `${trip.distance} km` : 'N/A'}</span>
                    <span><Fuel size={12} className="inline mr-1" /> {trip.fuelUsed || trip.fuel || 'N/A'}</span>
                    {/* {trip.status === 'Completed' && (
                      <span className="text-green-600">✅ Completed</span>
                    )} */}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  {trip.status === 'Planned' && (
                    <button 
                      onClick={() => handleStartPlannedTrip(trip)}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 flex items-center gap-1 transition-all hover:scale-105"
                    >
                      <PlayCircle size={14} /> Start Now
                    </button>
                  )}
                  
                  {trip.status === 'In Progress' && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs flex items-center gap-1 animate-pulse">
                      <RefreshCw size={12} className="animate-spin" /> In Progress
                    </span>
                  )}
                  
                  {/* {trip.status === 'Completed' && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs flex items-center gap-1">
                      <CheckCircle size={12} /> Done
                    </span>
                  )} */}
                  
                  {/* <button 
                    onClick={() => handleEditClick(trip)}
                    className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setShowDeleteConfirm(trip.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button> */}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

            {/* ============================================ */}
      {/* ✅ CHECKLIST CONFIRMATION MODAL */}
      {/* ============================================ */}
      {showChecklistConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowChecklistConfirm(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Ready to Go?</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">
                {checklistConfirmMessage}
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={recheckChecklist}
                className="flex-1 bg-yellow-500 text-white px-4 py-2.5 rounded-lg hover:bg-yellow-600 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Recheck
              </button>
              <button 
                onClick={confirmStartTrip}
                className="flex-1 bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Play size={18} /> Start Trip
              </button>
            </div>
            <button 
              onClick={() => setShowChecklistConfirm(false)}
              className="mt-3 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      

      {/* Modals */}
      {(showAddModal || editingTrip) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingTrip ? 'Edit Trip' : 'Add New Trip'}
              </h3>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTrip(null);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <input
                  type="text"
                  value={formData.from}
                  onChange={(e) => setFormData({...formData, from: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Starting location"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <input
                  type="text"
                  value={formData.to}
                  onChange={(e) => setFormData({...formData, to: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Destination"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Normal Trip, Delivery, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Planned Start</label>
                <input
                  type="datetime-local"
                  value={formData.plannedStart}
                  onChange={(e) => setFormData({...formData, plannedStart: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                  <input
                    type="number"
                    value={formData.distance}
                    onChange={(e) => setFormData({...formData, distance: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 42"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 1h 15m"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Used (L)</label>
                  <input
                    type="number"
                    value={formData.fuel}
                    onChange={(e) => setFormData({...formData, fuel: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 3.2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency</label>
                  <input
                    type="text"
                    value={formData.efficiency}
                    onChange={(e) => setFormData({...formData, efficiency: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 7.6 L/100km"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Odometer</label>
                  <input
                    type="number"
                    value={formData.startOdometer}
                    onChange={(e) => setFormData({...formData, startOdometer: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12847"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Odometer</label>
                  <input
                    type="number"
                    value={formData.endOdometer}
                    onChange={(e) => setFormData({...formData, endOdometer: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 12889"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Completed">Completed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Planned">Planned</option>
                </select>
              </div>

              <button
                onClick={editingTrip ? handleUpdateTrip : handleAddTrip}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center gap-2 mt-2"
              >
                <Check size={18} />
                {editingTrip ? 'Update Trip' : 'Add Trip'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-2">Delete Trip?</h3>
            <p className="text-gray-500 text-sm mb-4">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTrip(showDeleteConfirm)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

            {/* ============================================ */}
      {/* 📣 DRIVER REPORT MODAL (driver → manager) */}
      {/* ============================================ */}
      <DriverReportModal
        vehicle={assignedVehicle ? {
          id: assignedVehicle.id,
          reg: assignedVehicle.registration || assignedVehicle.reg,
          registration: assignedVehicle.registration,
          driver: driverInfo?.name || currentUser?.name,
        } : null}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSent={(data) => {
          setSuccessMessage(`✅ Report sent: ${data?.title || 'Report'} — manager notified`);
          setTimeout(() => setSuccessMessage(''), 4000);
          eventBus.emit(EVENTS.DRIVER_REPORT_SENT || 'driverReport:sent', data);
        }}
        currentLat={assignedVehicle?.lat || null}
        currentLng={assignedVehicle?.lng || null}
        currentSpeed={currentSpeed || 0}
      />
    </div>
  );
};

// ============================================
// HELPER FUNCTIONS FOR STATS
// ============================================

const calculateTotalDistance = (trips) => {
  let total = 0;
  trips.forEach(trip => {
    const distance = parseFloat(trip.distance);
    if (!isNaN(distance)) total += distance;
  });
  return total > 0 ? `${total.toFixed(0)} km` : '0 km';
};

const calculateAvgEfficiency = (trips) => {
  let totalEff = 0;
  let count = 0;
  trips.forEach(trip => {
    const eff = parseFloat(trip.efficiency);
    if (!isNaN(eff)) {
      totalEff += eff;
      count++;
    }
  });
  return count > 0 ? `${(totalEff / count).toFixed(1)} L/100km` : 'N/A';
};

const calculateTotalDuration = (trips) => {
  let totalHours = 0;
  let totalMinutes = 0;
  
  trips.forEach(trip => {
    const duration = trip.duration || '';
    const match = duration.match(/(\d+)h\s*(\d*)m?/);
    if (match) {
      totalHours += parseInt(match[1]) || 0;
      totalMinutes += parseInt(match[2]) || 0;
    }
  });
  
  totalHours += Math.floor(totalMinutes / 60);
  totalMinutes = totalMinutes % 60;
  
  if (totalHours > 0 && totalMinutes > 0) {
    return `${totalHours}h ${totalMinutes}m`;
  } else if (totalHours > 0) {
    return `${totalHours}h`;
  } else if (totalMinutes > 0) {
    return `${totalMinutes}m`;
  }
  return '0m';
};

export default CurrentTrip;