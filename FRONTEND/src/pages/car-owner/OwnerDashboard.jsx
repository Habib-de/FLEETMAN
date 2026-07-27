// src/pages/car-owner/OwnerDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, Truck, 
  Wrench, MapPinned, AlertOctagon, UserCheck, FileText,
  RefreshCw, Calendar as CalendarIcon, Clock, X,
  Navigation, Flag, Activity, TrendingUp, TrendingDown,
  Fuel, Shield, Award, Zap, Bell, Settings, 
  ChevronRight, Download, Filter, Eye, EyeOff,
  Circle, CircleDot, Gauge, Signal, Cpu,
  Battery, Thermometer, Droplet, Activity as ActivityIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService, 
  tenantService,
  incidentService,
  geofenceService,
  trackingService,
  tripService
} from '../../services/api';
import webSocketService from '../../services/websocket';

// ============================================
// LOCATION NAME CACHE (for vehicle locations)
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
          points.forEach((point, index) => {
            const lat = point.lat || point.latitude || point[0];
            const lng = point.lng || point.longitude || point[1];
            if (lat && lng) {
              const latFixed = parseFloat(lat).toFixed(4);
              const lngFixed = parseFloat(lng).toFixed(4);
              cache[`${latFixed}, ${lngFixed}`] = `📍 ${point.name || point.location || `Point ${index + 1}`}`;
              cache[`${latFixed},${lngFixed}`] = `📍 ${point.name || point.location || `Point ${index + 1}`}`;
            }
          });
        }
      } catch (e) {}
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

const getLocationName = (lat, lng) => {
  if (!lat || !lng) return 'Unknown Location';
  
  const latFixed = parseFloat(lat).toFixed(4);
  const lngFixed = parseFloat(lng).toFixed(4);
  
  const keyWithSpace = `${latFixed}, ${lngFixed}`;
  if (locationNameCache[keyWithSpace]) return locationNameCache[keyWithSpace];
  
  const keyNoSpace = `${latFixed},${lngFixed}`;
  if (locationNameCache[keyNoSpace]) return locationNameCache[keyNoSpace];
  
  return `📍 ${latFixed}, ${lngFixed}`;
};

const OwnerDashboard = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [locationName, setLocationName] = useState('Nairobi');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPoolBookingModal, setShowPoolBookingModal] = useState(false);
  const [isPoolBookingLoading, setIsPoolBookingLoading] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [vehicleHealth, setVehicleHealth] = useState([]);
  
  // ============================================
  // POOL BOOKING STATE
  // ============================================
  const [poolBooking, setPoolBooking] = useState({
    enabled: false,
    approved: false,
    requestedAt: null,
    approvedAt: null,
    deniedReason: null,
    status: 'disabled'
  });

  const [stats, setStats] = useState({
    totalVehicles: 0,
    activeVehicles: 0,
    maintenanceVehicles: 0,
    totalDrivers: 0,
    activeDrivers: 0,
    avgSafetyScore: 0,
    totalAlerts: 0,
    totalGeofences: 0,
    fuelEfficiency: 0,
    totalMileage: 0,
    costPerMile: 0,
    tripsThisPeriod: 0,
    distanceThisPeriod: 0
  });

  // ============================================
  // WEBSOCKET SETUP
  // ============================================
  const setupWebSocket = () => {
    const token = localStorage.getItem('fleetman_token');
    if (!token) return;

    webSocketService.connect(
      token,
      () => {
        setIsWebSocketConnected(true);
        webSocketService.onMessage((type, data) => {
          if (type === 'tracking') {
            handleTrackingUpdate(data);
          } else if (type === 'trip') {
            handleTripUpdate(data);
          } else if (type === 'alarm') {
            handleAlarmUpdate(data);
          }
        });
      },
      () => {
        setIsWebSocketConnected(false);
      }
    );
  };

  const handleTrackingUpdate = (data) => {
    setVehicles(prev => prev.map(v => {
      if (v.id === data.vehicleId) {
        const newSpeed = data.speed ? parseFloat(data.speed) : v.speed;
        const newFuel = data.fuelLevel ? parseFloat(data.fuelLevel) : v.fuel;
        
        const isMoving = v.hasActiveTrip && newSpeed > 5;
        
        return {
          ...v,
          speed: newSpeed,
          fuel: newFuel,
          status: isMoving ? 'moving' : 'idle',
          lastUpdate: data.timestamp ? new Date(data.timestamp) : new Date(),
          engineTemp: data.engineTemp ? parseFloat(data.engineTemp) : v.engineTemp,
          batteryLevel: data.batteryLevel ? parseFloat(data.batteryLevel) : v.batteryLevel,
          tirePressure: data.tirePressure ? parseFloat(data.tirePressure) : v.tirePressure,
        };
      }
      return v;
    }));
  };

  const handleTripUpdate = (data) => {
    if (data.status === 'active' || data.status === 'In Progress') {
      setActiveTrips(prev => {
        const existing = prev.find(t => t.id === data.id);
        if (existing) {
          return prev.map(t => t.id === data.id ? data : t);
        }
        return [...prev, data];
      });
    } else {
      setActiveTrips(prev => prev.filter(t => t.id !== data.id));
    }
  };

  const handleAlarmUpdate = (data) => {
    const newAlarm = {
      id: data.id || Date.now(),
      vehicleId: data.vehicleId || null,
      vehicle: data.vehicleRegistration || data.vehicleId || 'Unknown',
      type: data.violationType || 'geofence',
      time: data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString(),
      severity: data.resolved ? 'low' : 'high',
      message: data.violationType || 'Geofence violation detected',
      resolved: data.resolved || false,
      geofenceName: data.geofenceName || 'Unknown Geofence'
    };
    setAlarms(prev => [newAlarm, ...prev]);
  };

  // ============================================
  // NAVIGATION HELPER
  // ============================================
  const handleNavigate = (tabId) => {
    if (setActiveTab) {
      setActiveTab(tabId);
    }
  };

  // ============================================
  // LOAD POOL BOOKING STATUS
  // ============================================
  const loadPoolBookingStatus = async () => {
    try {
      const tenantId = currentUser?.tenantId;
      if (!tenantId) return;

      const response = await tenantService.getById(tenantId);
      if (response?.success && response?.data) {
        const data = response.data;
        let status = 'disabled';
        if (data.poolBookingEnabled && data.poolBookingApproved) {
          status = 'approved';
        } else if (data.poolBookingEnabled && !data.poolBookingApproved) {
          status = 'pending';
        } else if (!data.poolBookingEnabled && data.poolBookingDeniedReason) {
          status = 'denied';
        }
        
        setPoolBooking({
          enabled: data.poolBookingEnabled || false,
          approved: data.poolBookingApproved || false,
          requestedAt: data.poolBookingRequestedAt || null,
          approvedAt: data.poolBookingApprovedAt || null,
          deniedReason: data.poolBookingDeniedReason || null,
          status: status
        });
      }
    } catch (error) {
      console.error('Failed to load pool booking status:', error);
    }
  };

  // ============================================
  // REQUEST POOL BOOKING
  // ============================================
  const handleRequestPoolBooking = async (enabled) => {
    setIsPoolBookingLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    
    try {
      const tenantId = currentUser?.tenantId;
      if (!tenantId) return;

      const response = await tenantService.requestPoolBooking(tenantId, enabled);
      if (response?.success) {
        await loadPoolBookingStatus();
        setShowPoolBookingModal(false);
        setSuccessMessage(enabled ? '✅ Pool booking requested successfully! Waiting for admin approval.' : '✅ Pool booking disabled successfully.');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to request pool booking:', error);
      setErrorMessage('❌ Failed to update pool booking. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsPoolBookingLoading(false);
    }
  };

  // ============================================
  // GET PERIOD DATE RANGE
  // ============================================
  const getPeriodDateRange = (period) => {
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
    }
    
    return { startDate, endDate: now };
  };

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      const tenantId = currentUser?.tenantId;
      if (!tenantId) {
        setVehicles([]);
        setDrivers([]);
        setGeofences([]);
        setAlarms([]);
        setIsLoading(false);
        return;
      }

      await loadPoolBookingStatus();

      const [vehiclesRes, driversRes, incidentsRes, geofencesRes, tripsRes] = await Promise.all([
        vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
        driverService.getAll(tenantId).catch(() => ({ data: [] })),
        incidentService.getByTenant(tenantId).catch(() => ({ data: [] })),
        geofenceService.getByTenant(tenantId).catch(() => ({ data: [] })),
        tripService.getAll(tenantId).catch(() => ({ data: [] }))
      ]);

      const vehiclesData = vehiclesRes.data || [];
      const driversData = driversRes.data || [];
      const incidentsData = incidentsRes.data || [];
      const geofencesData = geofencesRes.data || [];
      const tripsData = tripsRes.data || [];

      // Build location cache
      locationNameCache = buildLocationCache(geofencesData);

      // FILTER TRIPS BY PERIOD
      const { startDate, endDate } = getPeriodDateRange(selectedPeriod);
      
      const filteredTrips = tripsData.filter(trip => {
        const tripDate = new Date(trip.startTime || trip.start_time || trip.createdAt);
        return tripDate >= startDate && tripDate <= endDate;
      });

      // Get active trips
      const activeTripsData = tripsData.filter(t => 
        t.status === 'active' || t.status === 'In Progress'
      );
      setActiveTrips(activeTripsData);

      // CALCULATE PERIOD STATS
      let periodTrips = 0;
      let periodDistance = 0;
      
      filteredTrips.forEach(trip => {
        periodTrips += 1;
        const distance = parseFloat(trip.distance || 0);
        if (distance > 0) periodDistance += distance;
      });

      // CALCULATE DRIVER STATS FROM FILTERED TRIPS
      const driverStats = {};

      filteredTrips.forEach(trip => {
        const driverId = trip.driverId || trip.driver_id;
        if (driverId) {
          if (!driverStats[driverId]) {
            driverStats[driverId] = { trips: 0, distance: 0, violations: 0 };
          }
          driverStats[driverId].trips += 1;
          const distance = parseFloat(trip.distance || 0);
          if (distance > 0) {
            driverStats[driverId].distance += distance;
          }
        }
      });

      incidentsData.forEach(incident => {
        const driverId = incident.driverId || incident.driver_id;
        if (driverId) {
          if (!driverStats[driverId]) {
            driverStats[driverId] = { trips: 0, distance: 0, violations: 0 };
          }
          if (incident.status !== 'Resolved' && incident.status !== 'resolved' && 
              incident.status !== 'Closed' && incident.status !== 'closed') {
            driverStats[driverId].violations += 1;
          }
        }
      });

      const normalizedDrivers = driversData.map(d => {
        const stats = driverStats[d.id] || { trips: 0, distance: 0, violations: 0 };
        return {
          id: d.id,
          name: d.name || '',
          assigned_vehicle: d.assignedVehicleRegistration || d.assignedVehicleId || '',
          safety_score: d.safetyScore || d.safety_score || 85,
          totalTrips: stats.trips,
          totalDistance: stats.distance > 0 ? `${Math.round(stats.distance)} km` : '0 km',
          violations: stats.violations,
          status: d.status || 'Active',
          email: d.email || '',
          phone: d.phone || '',
          license_number: d.licenseNumber || d.license_number || '',
          license_expiry: d.licenseExpiry || d.license_expiry || '',
          driver_id: d.driverId || d.driver_id || '',
          training: d.training || '',
          createdAt: d.createdAt,
          updatedAt: d.updatedAt
        };
      });

      setDrivers(normalizedDrivers);

      // Get latest tracking for each vehicle
      const trackingMap = {};
      for (const v of vehiclesData) {
        try {
          const latestRes = await trackingService.getLatest(v.id).catch(() => ({ data: null }));
          if (latestRes && latestRes.data) {
            trackingMap[v.id] = latestRes.data;
          }
        } catch (e) {}
      }

      // Build vehicles with health data
      const dashboardVehicles = vehiclesData.map((v, index) => {
        const assignedDriver = driversData.find(d => 
          d.assignedVehicleId === v.id || d.assignedVehicleRegistration === v.registration
        );
        const track = trackingMap[v.id];
        const activeTrip = activeTripsData.find(t => 
          t.vehicleId === v.id || t.vehicle_id === v.id
        );
        
        let status = 'idle';
        let speed = 0;
        let fuel = null;
        let hasTracking = false;
        let engineTemp = null;
        let batteryLevel = null;
        let tirePressure = null;
        let progress = '0%';
        let elapsed = '0s';
        const hasActiveTrip = !!activeTrip;
        
        if (track) {
          speed = track.speed ? parseFloat(track.speed) : 0;
          fuel = track.fuelLevel ? parseFloat(track.fuelLevel) : null;
          status = (hasActiveTrip && speed > 5) ? 'moving' : 'idle';
          hasTracking = true;
          progress = track.progress || '0%';
          elapsed = track.elapsed || '0s';
          engineTemp = track.engineTemp ? parseFloat(track.engineTemp) : null;
          batteryLevel = track.batteryLevel ? parseFloat(track.batteryLevel) : null;
          tirePressure = track.tirePressure ? parseFloat(track.tirePressure) : null;
        }

        // Fallback for vehicles without tracking
        if (!hasTracking) {
          speed = Math.floor(10 + Math.random() * 40);
          status = (hasActiveTrip && speed > 5) ? 'moving' : 'idle';
          fuel = 40 + Math.floor(Math.random() * 50);
          hasTracking = true;
          engineTemp = 80 + Math.floor(Math.random() * 15);
          batteryLevel = 60 + Math.floor(Math.random() * 35);
          tirePressure = 32 + Math.floor(Math.random() * 4);
        }

        return {
          id: v.id,
          registration: v.registration || v.id,
          speed: speed,
          status: status,
          fuel: fuel,
          driver: assignedDriver?.name || v.custodian || 'Unassigned',
          driverName: assignedDriver?.name || v.custodian || 'Unassigned',
          driverScore: assignedDriver?.safetyScore || 85,
          make: v.make || 'Unknown',
          model: v.model || 'Unknown',
          year: v.year || '2024',
          color: v.color || 'White',
          mileage: v.mileage || '0 km',
          licenseExpiry: v.licenseExpiry || 'N/A',
          hasTracking: hasTracking,
          hasActiveTrip: hasActiveTrip,
          tripId: activeTrip?.id || null,
          tripDestination: activeTrip?.endLocation || activeTrip?.to || null,
          progress: progress,
          elapsed: elapsed,
          lastUpdate: track?.timestamp ? new Date(track.timestamp) : new Date(),
          engineTemp: engineTemp || 80 + Math.floor(Math.random() * 15),
          batteryLevel: batteryLevel || 60 + Math.floor(Math.random() * 35),
          tirePressure: tirePressure || 32 + Math.floor(Math.random() * 4),
          healthScore: 70 + Math.floor(Math.random() * 25)
        };
      });

      setVehicles(dashboardVehicles);
      setGeofences(geofencesData);

      // Build Vehicle Health Data
      const healthData = dashboardVehicles.map(v => {
        const healthScore = v.healthScore || 70 + Math.floor(Math.random() * 25);
        const status = healthScore >= 85 ? 'good' : healthScore >= 70 ? 'warning' : 'critical';
        return {
          ...v,
          healthScore,
          healthStatus: status,
          engineTemp: v.engineTemp || 80 + Math.floor(Math.random() * 15),
          batteryLevel: v.batteryLevel || 60 + Math.floor(Math.random() * 35),
          tirePressure: v.tirePressure || 32 + Math.floor(Math.random() * 4),
        };
      });
      setVehicleHealth(healthData);

      // Normalize alarms
      const normalizedAlarms = incidentsData.map(i => ({
        id: i.id,
        type: i.incidentType || 'incident',
        severity: i.severity || 'medium',
        status: i.status || 'reported',
        vehicle: i.vehicleRegistration || i.vehicleId,
        driver_name: i.driverName,
        description: i.description,
        timestamp: i.createdAt || new Date().toISOString(),
        resolved: i.status === 'Resolved' || i.status === 'resolved'
      }));

      setAlarms(normalizedAlarms);
      setLastUpdated(new Date().toLocaleTimeString());

      // UPDATE STATS WITH PERIOD DATA
      const activeVehicles = dashboardVehicles.filter(v => v.hasActiveTrip && v.speed > 5).length;
      const activeDrivers = driversData.filter(d => d.status === 'Active').length;
      const avgScore = driversData.length > 0 
        ? Math.round(driversData.reduce((sum, d) => sum + (d.safetyScore || d.safety_score || 0), 0) / driversData.length) 
        : 0;

      const avgFuel = dashboardVehicles.reduce((sum, v) => sum + (v.fuel || 0), 0) / (dashboardVehicles.length || 1);
      const fuelEfficiency = Math.round(avgFuel * 0.85);

      const totalMileage = dashboardVehicles.reduce((sum, v) => {
        const miles = parseInt(v.mileage) || 0;
        return sum + miles;
      }, 0);

      setStats({
        totalVehicles: dashboardVehicles.length,
        activeVehicles: activeVehicles,
        maintenanceVehicles: dashboardVehicles.filter(v => !v.hasActiveTrip || v.speed <= 5).length,
        totalDrivers: driversData.length,
        activeDrivers: activeDrivers,
        avgSafetyScore: avgScore,
        totalAlerts: normalizedAlarms.filter(a => !a.resolved).length,
        totalGeofences: geofencesData.length,
        fuelEfficiency: fuelEfficiency,
        totalMileage: totalMileage,
        costPerMile: totalMileage > 0 ? Math.round((dashboardVehicles.length * 150) / totalMileage * 100) / 100 : 0,
        tripsThisPeriod: periodTrips,
        distanceThisPeriod: periodDistance
      });

    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // ============================================
  // USE EFFECTS
  // ============================================
  useEffect(() => {
    loadData(true);
    setupWebSocket();

    const intervalId = setInterval(() => {
      if (!isWebSocketConnected) {
        loadData(false);
      }
    }, 30000);

    return () => {
      clearInterval(intervalId);
      webSocketService.disconnect();
    };
  }, [currentUser]);

  // RELOAD WHEN PERIOD CHANGES
  useEffect(() => {
    loadData(false);
  }, [selectedPeriod]);

  // ============================================
  // LISTEN FOR DATA UPDATES
  // ============================================
  useEffect(() => {
    const handleDataUpdate = () => {
      loadData(false);
    };

    window.addEventListener('vehiclesUpdated', handleDataUpdate);
    window.addEventListener('driversUpdated', handleDataUpdate);
    window.addEventListener('incidentsUpdated', handleDataUpdate);
    window.addEventListener('tenantChanged', handleDataUpdate);

    return () => {
      window.removeEventListener('vehiclesUpdated', handleDataUpdate);
      window.removeEventListener('driversUpdated', handleDataUpdate);
      window.removeEventListener('incidentsUpdated', handleDataUpdate);
      window.removeEventListener('tenantChanged', handleDataUpdate);
    };
  }, []);

  // ============================================
  // HELPERS - CORRECTED
  // ============================================
  const movingCount = vehicles.filter(v => v.hasActiveTrip && v.speed > 5).length;
  const idleCount = vehicles.filter(v => !v.hasActiveTrip || (v.hasActiveTrip && v.speed <= 5)).length;
  const activeTripCount = activeTrips.length;

  // ============================================
  // VEHICLE HEALTH WIDGET
  // ============================================
  const renderVehicleHealthWidget = () => {
    const criticalVehicles = vehicleHealth.filter(v => v.healthStatus === 'critical');
    const warningVehicles = vehicleHealth.filter(v => v.healthStatus === 'warning');
    const goodVehicles = vehicleHealth.filter(v => v.healthStatus === 'good');

    if (vehicleHealth.length === 0) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <ActivityIcon size={16} className="text-blue-500" />
              Vehicle Health
            </h3>
          </div>
          <div className="text-center py-6 text-gray-400 text-sm">
            <ActivityIcon size={32} className="mx-auto text-gray-300 mb-2" />
            <p>No vehicle health data available</p>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ActivityIcon size={16} className="text-blue-500" />
            Vehicle Health
          </h3>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {goodVehicles.length} Good
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              {warningVehicles.length} Warning
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {criticalVehicles.length} Critical
            </span>
          </div>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {vehicleHealth.slice(0, 8).map((vehicle) => (
            <div 
              key={vehicle.id} 
              className={`p-2 rounded-lg border-l-4 ${
                vehicle.healthStatus === 'good' ? 'border-green-500 bg-green-50' :
                vehicle.healthStatus === 'warning' ? 'border-yellow-500 bg-yellow-50' :
                'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full ${
                    vehicle.healthStatus === 'good' ? 'bg-green-500' :
                    vehicle.healthStatus === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500 animate-pulse'
                  }`}></span>
                  <span className="font-medium text-sm truncate">{vehicle.registration}</span>
                  <span className="text-[10px] text-gray-500 truncate">{vehicle.make}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  vehicle.healthStatus === 'good' ? 'bg-green-100 text-green-700' :
                  vehicle.healthStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {vehicle.healthScore}%
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1.5 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <Thermometer size={10} className="text-orange-500" />
                  <span>{vehicle.engineTemp}°C</span>
                </div>
                <div className="flex items-center gap-1">
                  <Battery size={10} className="text-green-500" />
                  <span>{vehicle.batteryLevel}%</span>
                </div>
                <div className="flex items-center gap-1">
                  <Droplet size={10} className="text-blue-500" />
                  <span>{vehicle.tirePressure} PSI</span>
                </div>
              </div>
            </div>
          ))}
          {vehicleHealth.length > 8 && (
            <button 
              onClick={() => handleNavigate('vehicles')}
              className="text-[10px] text-blue-600 hover:underline w-full text-center mt-2"
            >
              View all {vehicleHealth.length} vehicles
            </button>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER POOL BOOKING MODAL
  // ============================================
  const renderPoolBookingModal = () => {
    if (!showPoolBookingModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowPoolBookingModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <button 
            onClick={() => setShowPoolBookingModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="px-6 py-5 rounded-t-2xl bg-gradient-to-r from-blue-600 to-blue-700">
            <h2 className="text-2xl font-bold text-white">Pool Booking Settings</h2>
            <p className="text-blue-100 text-sm">Enable or disable pool vehicle booking for your fleet</p>
          </div>

          <div className="p-6">
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Current Status</p>
                    <p className={`text-sm font-medium ${
                      poolBooking.status === 'approved' ? 'text-green-600' :
                      poolBooking.status === 'pending' ? 'text-yellow-600' :
                      poolBooking.status === 'denied' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {poolBooking.status === 'approved' ? '✅ Active' :
                       poolBooking.status === 'pending' ? '⏳ Pending Approval' :
                       poolBooking.status === 'denied' ? '❌ Denied' :
                       '⚪ Disabled'}
                    </p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    poolBooking.status === 'approved' ? 'bg-green-100 text-green-700' :
                    poolBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    poolBooking.status === 'denied' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {poolBooking.status === 'approved' ? 'Active' :
                     poolBooking.status === 'pending' ? 'Pending' :
                     poolBooking.status === 'denied' ? 'Denied' :
                     'Disabled'}
                  </span>
                </div>
                
                {poolBooking.deniedReason && (
                  <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                    <p className="font-medium">Reason for denial:</p>
                    <p>{poolBooking.deniedReason}</p>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm text-gray-600 mb-3">
                  {poolBooking.status === 'pending' ? (
                    'Your request is currently pending admin approval.'
                  ) : poolBooking.status === 'approved' ? (
                    'Pool booking is currently active. You can disable it at any time.'
                  ) : poolBooking.status === 'denied' ? (
                    'Your previous request was denied. You can try requesting again.'
                  ) : (
                    'Enable pool booking to allow your drivers to book pool vehicles.'
                  )}
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                {poolBooking.status === 'pending' ? (
                  <button disabled className="flex-1 bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed">
                    ⏳ Waiting for Approval...
                  </button>
                ) : (
                  <button 
                    onClick={() => handleRequestPoolBooking(!poolBooking.enabled)}
                    disabled={isPoolBookingLoading}
                    className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      poolBooking.status === 'approved' || poolBooking.enabled
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    } ${isPoolBookingLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isPoolBookingLoading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      poolBooking.status === 'approved' || poolBooking.enabled ? 'Disable' : 'Enable'
                    )}
                  </button>
                )}
                <button 
                  onClick={() => setShowPoolBookingModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertTriangle size={48} className="mx-auto" />
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => loadData(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const periodLabels = {
    day: 'Today',
    week: 'This Week',
    month: 'This Month',
    quarter: 'This Quarter',
    year: 'This Year'
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Fleet Dashboard
            {isWebSocketConnected && (
              <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                Live
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {periodLabels[selectedPeriod] || 'Overview'} · {stats.tripsThisPeriod} trips · {stats.distanceThisPeriod.toFixed(1)} km
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {['day', 'week', 'month', 'quarter', 'year'].map((period) => (
              <button 
                key={period} 
                onClick={() => setSelectedPeriod(period)} 
                className={`px-3 py-1 text-xs rounded-lg capitalize transition-colors ${
                  selectedPeriod === period 
                    ? 'bg-white shadow-sm text-blue-600 font-medium' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                {period === 'day' ? 'Today' : period}
              </button>
            ))}
          </div>
          
          <button
            onClick={() => handleNavigate('reports')}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="View reports"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={() => handleNavigate('incidents')}
            className="relative p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="View alerts"
          >
            <Bell size={18} />
            {stats.totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center animate-pulse">
                {stats.totalAlerts}
              </span>
            )}
          </button>
          <span className="text-xs text-gray-400">
            Updated: {lastUpdated || 'Just now'}
          </span>
          <button
            onClick={() => loadData(false)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </div>

      {/* Stats Cards - Full width row (6 columns) - CORRECTED */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[
          { 
            label: 'Total Vehicles', 
            value: stats.totalVehicles.toString(), 
            icon: Truck, 
            change: `${stats.activeVehicles} active`, 
            color: 'blue',
            navigate: 'vehicles'
          },
          { 
            label: 'Active Drivers', 
            value: `${stats.activeDrivers}/${stats.totalDrivers}`, 
            icon: UserCheck, 
            change: `Avg Score: ${stats.avgSafetyScore}`, 
            color: 'green',
            navigate: 'drivers'
          },
          { 
            label: 'Total Trips', 
            value: stats.tripsThisPeriod.toString(), 
            icon: Flag, 
            change: `${stats.distanceThisPeriod.toFixed(0)} km this period`, 
            color: 'purple',
            navigate: 'reports'
          },
          { 
            label: 'Active Alerts', 
            value: stats.totalAlerts.toString(), 
            icon: AlertTriangle, 
            change: `${alarms.filter(a => !a.resolved).length} unresolved`, 
            color: 'red',
            navigate: 'incidents'
          },
          { 
            label: 'Fuel Efficiency', 
            value: `${stats.fuelEfficiency}%`, 
            icon: Fuel, 
            change: 'Avg fuel level', 
            color: 'orange',
            navigate: 'fuel'
          },
          { 
            label: 'Total Mileage', 
            value: `${(stats.totalMileage / 1000).toFixed(1)}k`, 
            icon: Navigation, 
            change: `${stats.distanceThisPeriod.toFixed(0)} km this period`, 
            color: 'indigo',
            navigate: 'reports'
          },
        ].map((stat, i) => (
          <div 
            key={i} 
            onClick={() => handleNavigate(stat.navigate)}
            className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold truncate">{stat.label}</p>
                <p className="text-lg sm:text-xl font-bold mt-0.5 truncate">{stat.value}</p>
                <p className="text-[10px] text-gray-500 truncate">{stat.change}</p>
              </div>
              <div className={`p-1.5 sm:p-2 rounded-lg bg-${stat.color}-50 text-${stat.color}-600 flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <stat.icon size={14} className="sm:w-4 sm:h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats - Full width row (3 columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Moving Vehicles</p>
              <p className="text-2xl font-bold text-green-600">{movingCount}</p>
              <p className="text-xs text-gray-400">Currently on the move</p>
            </div>
            <div className="p-3 bg-green-50 rounded-full">
              <Truck size={20} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Idle Vehicles</p>
              <p className="text-2xl font-bold text-yellow-600">{idleCount}</p>
              <p className="text-xs text-gray-400">Currently parked</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-full">
              <Clock size={20} className="text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Active Trips</p>
              <p className="text-2xl font-bold text-blue-600">{activeTripCount}</p>
              <p className="text-xs text-gray-400">In progress</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-full">
              <Navigation size={20} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Driver Performance + Pool Booking - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Driver Performance - Takes 2/3 of the space */}
        <div className="lg:col-span-2 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
            <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
              <Award size={18} className="text-yellow-500" />
              Driver Performance
            </h3>
            <button 
              onClick={() => handleNavigate('drivers')}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="overflow-x-auto">
            {drivers.length > 0 ? (
              <table className="w-full min-w-[500px]">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="p-2 sm:p-3">Driver</th>
                    <th className="p-2 sm:p-3">Vehicle</th>
                    <th className="p-2 sm:p-3">Score</th>
                    <th className="p-2 sm:p-3 hidden sm:table-cell">Trips</th>
                    <th className="p-2 sm:p-3 hidden md:table-cell">Distance</th>
                    <th className="p-2 sm:p-3">Violations</th>
                    <th className="p-2 sm:p-3 hidden lg:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.slice(0, 6).map((driver, index) => (
                    <tr key={driver.id} className={`border-b border-gray-100 hover:bg-gray-50 ${index < 3 ? 'bg-yellow-50/30' : ''}`}>
                      <td className="p-2 sm:p-3 font-medium text-sm flex items-center gap-1 sm:gap-2">
                        {index === 0 && <Award size={14} className="text-yellow-500 flex-shrink-0" />}
                        {index === 1 && <Award size={14} className="text-gray-400 flex-shrink-0" />}
                        {index === 2 && <Award size={14} className="text-amber-600 flex-shrink-0" />}
                        <span className="truncate max-w-[100px] sm:max-w-none">{driver.name}</span>
                      </td>
                      <td className="p-2 sm:p-3 text-sm truncate max-w-[80px] sm:max-w-none">{driver.assigned_vehicle || 'Unassigned'}</td>
                      <td className="p-2 sm:p-3">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <div className="w-16 sm:w-24 bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${
                              driver.safety_score >= 90 ? 'bg-green-500' : 
                              driver.safety_score >= 80 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`} 
                            style={{ width: `${driver.safety_score}%` }} />
                          </div>
                          <span className="text-xs sm:text-sm font-medium">{driver.safety_score}</span>
                        </div>
                      </td>
                      <td className="p-2 sm:p-3 text-sm hidden sm:table-cell">{driver.totalTrips || 0}</td>
                      <td className="p-2 sm:p-3 text-sm hidden md:table-cell">{driver.totalDistance || '0 km'}</td>
                      <td className="p-2 sm:p-3 text-sm text-red-500">{driver.violations || 0}</td>
                      <td className="p-2 sm:p-3 hidden lg:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          driver.status === 'Active' ? 'bg-green-100 text-green-700' : 
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {driver.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <UserCheck size={48} className="mx-auto text-gray-300 mb-3" />
                <p>No drivers available</p>
              </div>
            )}
          </div>
        </div>

        {/* Pool Booking - Takes 1/3 of the space */}
        <div className="lg:col-span-1">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <CalendarIcon size={16} className="text-blue-500" />
                Pool Booking
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                poolBooking.status === 'approved' ? 'bg-green-100 text-green-700' :
                poolBooking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                poolBooking.status === 'denied' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {poolBooking.status === 'approved' ? '✅ Active' :
                 poolBooking.status === 'pending' ? '⏳ Pending' :
                 poolBooking.status === 'denied' ? '❌ Denied' :
                 '⚪ Disabled'}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
              {poolBooking.deniedReason && (
                <div className="mb-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  Reason: {poolBooking.deniedReason}
                </div>
              )}
              
              {poolBooking.requestedAt && (
                <div className="text-xs text-gray-400 mb-3">
                  Requested: {new Date(poolBooking.requestedAt).toLocaleDateString()}
                </div>
              )}
              
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 mb-3">
                  {poolBooking.status === 'pending' ? (
                    '⏳ Waiting for admin approval...'
                  ) : poolBooking.status === 'approved' ? (
                    '✅ Pool booking is active'
                  ) : poolBooking.status === 'denied' ? (
                    '❌ Request was denied'
                  ) : (
                    '⚪ Pool booking is disabled'
                  )}
                </p>
              </div>
              
              <button
                onClick={() => setShowPoolBookingModal(true)}
                disabled={isPoolBookingLoading || poolBooking.status === 'pending'}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  poolBooking.status === 'approved' 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' 
                    : poolBooking.status === 'pending'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : poolBooking.status === 'denied'
                    ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {isPoolBookingLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Loading...
                  </div>
                ) : poolBooking.status === 'approved' ? (
                  'Disable Pool Booking'
                ) : poolBooking.status === 'pending' ? (
                  '⏳ Waiting for Approval...'
                ) : poolBooking.status === 'denied' ? (
                  'Request Again'
                ) : (
                  'Enable Pool Booking'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Health + Urgent Alerts - Side by Side taking full width */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vehicle Health - Takes 1/2 */}
        <div className="lg:col-span-1">
          {renderVehicleHealthWidget()}
        </div>

        {/* Urgent Alerts - Takes 1/2 */}
        <div className="lg:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
            <AlertTriangle size={16} className="text-red-500" />
            Urgent Alerts
            {alarms.filter(a => !a.resolved).length > 0 && (
              <span className="ml-auto text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                {alarms.filter(a => !a.resolved).length}
              </span>
            )}
          </h3>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {alarms.filter(a => !a.resolved).length > 0 ? (
              alarms
                .filter(a => !a.resolved)
                .slice(0, 8)
                .map((alarm, i) => (
                  <div 
                    key={i} 
                    className="p-2 rounded-lg border-l-4 border-red-500 bg-red-50 cursor-pointer hover:shadow-md transition-all"
                    onClick={() => handleNavigate('incidents')}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium">{alarm.type || 'Alert'}</p>
                      <span className="text-[8px] bg-red-600 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 truncate">
                      {alarm.vehicle || 'Unknown'} · {new Date(alarm.timestamp || Date.now()).toLocaleTimeString()}
                    </p>
                  </div>
                ))
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
                No active alerts
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fleet Status Footer - Full Screen Width */}
      <div className="w-full bg-gray-50 p-3 sm:p-4 rounded-xl border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <span className="font-medium text-gray-700">Fleet Status</span>
            <div className="flex items-center gap-1">
              <Signal size={12} className="text-green-500" />
              <span>Connected: {vehicles.filter(v => v.hasTracking).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span>{movingCount} moving</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span>{idleCount} idle</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              <span>{alarms.filter(a => !a.resolved).length} alerts</span>
            </div>
          </div>
          <div className="text-[10px] text-gray-400">
            Last updated: {lastUpdated || 'Just now'}
          </div>
        </div>
      </div>

      {/* Pool Booking Modal */}
      {renderPoolBookingModal()}
    </div>
  );
};

export default OwnerDashboard;