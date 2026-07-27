import React, { useState, useEffect } from 'react';
import { useTrip } from '../../context/TripContext';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService, 
  tripService,
  geofenceService,
  incidentService,
  checklistService
} from '../../services/api';
import { 
  Award, Play, StopCircle, AlertTriangle, ClipboardCheck, 
  Radio, Navigation, Fuel, Wrench, 
  Bell, Shield, Activity, Calendar, MapPin, Phone,
  CheckCircle, Car, User, Clock, Zap, Truck,
  AlertCircle, Info, X, RefreshCw
} from 'lucide-react';

const DriverDashboard = () => {
  const { currentUser } = useAuth();
  const { startTrip, endTrip, getActiveTrip } = useTrip();

  // State
  const [isTripActive, setIsTripActive] = useState(false);
  const [activeTripId, setActiveTripId] = useState(null);
  const [tripDuration, setTripDuration] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [fuelUsed, setFuelUsed] = useState(0);
  const [driverData, setDriverData] = useState(null);
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [stats, setStats] = useState({
    todayTrips: 0,
    totalDistance: '0 km',
    fuelUsed: '0 L',
    efficiency: '0 L/100km',
    nextService: 'N/A',
    serviceDue: 'N/A'
  });
  const [notifications, setNotifications] = useState([]);
  const [driverScore, setDriverScore] = useState(0);
  const [panicMessage, setPanicMessage] = useState('');
  const [isPanicking, setIsPanicking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [availableDestinations, setAvailableDestinations] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [violations, setViolations] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [todaysTrips, setTodaysTrips] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // ✅ NEW: Checklist states
  const [todayInspection, setTodayInspection] = useState(null);
  const [inspectionStatus, setInspectionStatus] = useState('pending');
  const [inspectionCount, setInspectionCount] = useState(0);
  const [pendingInspections, setPendingInspections] = useState(0);

  // ============================================
  // LOAD CHECKLIST STATUS
  // ============================================
  const loadChecklistStatus = async (vehicle) => {
    if (!vehicle || !currentUser?.tenantId) return;
    
    try {
      const response = await checklistService.getHistory(vehicle.id, currentUser.tenantId);
      const checklists = response?.data || [];
      
      // Count total inspections
      setInspectionCount(checklists.length);
      
      // Count pending inspections
      const pending = checklists.filter(c => c.status === 'pending' || c.status === 'in_progress').length;
      setPendingInspections(pending);
      
      // Get today's inspection
      const today = new Date().toISOString().split('T')[0];
      const todayCheck = checklists.find(c => 
        c.inspectionDate?.split('T')[0] === today || 
        c.createdAt?.split('T')[0] === today
      );
      
      if (todayCheck) {
        setTodayInspection(todayCheck);
        setInspectionStatus(todayCheck.status || 'pending');
      } else {
        setTodayInspection(null);
        setInspectionStatus('pending');
      }
      
      console.log('📋 Checklist status loaded:', {
        total: checklists.length,
        pending: pending,
        today: todayCheck?.status || 'none'
      });
    } catch (error) {
      console.error('Failed to load checklist status:', error);
    }
  };

  // ============================================
  // LOAD DRIVER DASHBOARD DATA FROM API
  // ============================================
  const loadDashboardData = async () => {
    console.log('🔄 loadDashboardData() called');
    
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view your dashboard');
      setIsLoading(false);
      return;
    }

    console.log('✅ currentUser:', {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      tenantId: currentUser.tenantId,
      driverId: currentUser.driverId
    });

    try {
      const tenantId = currentUser.tenantId;
      let driver = null;

      if (!currentUser.driverId) {
        setErrorMessage('Your account is not linked to a driver profile. Please contact your fleet manager.');
        setIsLoading(false);
        return;
      }

      try {
        console.log('📡 Getting driver by ID:', currentUser.driverId);
        const response = await driverService.getById(currentUser.driverId);
        if (response?.success && response?.data) {
          driver = response.data;
          console.log('✅ Driver found:', driver.id);
        } else {
          setErrorMessage('Driver profile not found. Please contact your fleet manager.');
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error('❌ getById failed:', error.message);
        setErrorMessage('Could not fetch driver profile. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Driver found:', driver);
      setDriverData(driver);
      setDriverScore(driver.safetyScore || driver.safety_score || 0);

      // ============================================
      // STEP 2: Get assigned vehicle
      // ============================================
      let vehicle = null;
      const vehicleId = driver.assignedVehicleId || driver.assigned_vehicle || driver.vehicle_id;
      
      if (vehicleId) {
        try {
          const vehicleRes = await vehicleService.getById(vehicleId);
          if (vehicleRes?.success && vehicleRes?.data) {
            vehicle = vehicleRes.data;
            setAssignedVehicle(vehicle);
            console.log('✅ Vehicle found:', vehicle.registration || vehicle.id);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch vehicle:', error.message);
        }
      }

      if (!vehicle) {
        setErrorMessage('No vehicle assigned. Please contact your fleet manager.');
        setIsLoading(false);
        return;
      }

      // ✅ LOAD CHECKLIST STATUS
      await loadChecklistStatus(vehicle);

      // ============================================
      // STEP 3: Get today's trips
      // ============================================
      let todayTrips = [];
      
      if (tripService.getByDriver) {
        try {
          const tripsRes = await tripService.getByDriver(driver.id);
          if (tripsRes?.success && tripsRes?.data) {
            const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            todayTrips = allTrips.filter(t => {
              const tripDate = new Date(t.startTime || t.start_time || t.createdAt);
              return tripDate >= startOfDay;
            });
            console.log('📋 Today\'s trips (by driver):', todayTrips.length);
          }
        } catch (error) {
          console.warn('⚠️ getByDriver failed:', error.message);
        }
      }

      if (todayTrips.length === 0 && tripService.getByVehicle) {
        try {
          const tripsRes = await tripService.getByVehicle(vehicle.id);
          if (tripsRes?.success && tripsRes?.data) {
            const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            todayTrips = allTrips.filter(t => {
              const tripDate = new Date(t.startTime || t.start_time || t.createdAt);
              return tripDate >= startOfDay;
            });
            console.log('📋 Today\'s trips (by vehicle):', todayTrips.length);
          }
        } catch (error) {
          console.warn('⚠️ getByVehicle failed:', error.message);
        }
      }

      if (todayTrips.length === 0) {
        try {
          const tripsRes = await tripService.getAll(tenantId);
          if (tripsRes?.success && tripsRes?.data) {
            const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
            const today = new Date();
            const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            todayTrips = allTrips.filter(t => {
              const tripDate = new Date(t.startTime || t.start_time || t.createdAt);
              const isToday = tripDate >= startOfDay;
              const isDriver = t.driverId === driver.id || t.driver_id === driver.id;
              return isToday && isDriver;
            });
            console.log('📋 Today\'s trips (fallback):', todayTrips.length);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch trips:', error.message);
        }
      }

      setTodaysTrips(todayTrips);

      // ============================================
      // STEP 4: Calculate stats
      // ============================================
      let totalDist = 0;
      let totalFuel = 0;
      todayTrips.forEach(trip => {
        if (trip.distance) totalDist += parseFloat(trip.distance);
        if (trip.fuelUsed || trip.fuel_used) totalFuel += parseFloat(trip.fuelUsed || trip.fuel_used);
      });
      const efficiency = totalDist > 0 ? (totalFuel / totalDist) * 100 : 0;

      const newStats = {
        todayTrips: todayTrips.length,
        totalDistance: totalDist > 0 ? `${totalDist.toFixed(1)} km` : '0 km',
        fuelUsed: totalFuel > 0 ? `${totalFuel.toFixed(1)} L` : '0 L',
        efficiency: efficiency > 0 ? `${efficiency.toFixed(1)} L/100km` : 'N/A',
        nextService: vehicle.nextService || vehicle.next_service || 'N/A',
        serviceDue: (vehicle.nextService || vehicle.next_service) 
          ? calculateServiceDue(vehicle.nextService || vehicle.next_service) 
          : 'N/A'
      };
      
      setStats(newStats);

      // ============================================
      // STEP 5: Get active trip
      // ============================================
      try {
        const activeTripRes = await tripService.getActiveByVehicle(vehicle.id);
        if (activeTripRes?.success && activeTripRes?.data) {
          const activeTrips = Array.isArray(activeTripRes.data) ? activeTripRes.data : [activeTripRes.data];
          if (activeTrips.length > 0) {
            const activeTrip = activeTrips[0];
            setIsTripActive(true);
            setActiveTripId(activeTrip.id);
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch active trip:', error.message);
      }

      // ============================================
      // STEP 6: Get violations
      // ============================================
      try {
        const violationsRes = await geofenceService.getViolationsByVehicle(vehicle.id);
        if (violationsRes?.success) {
          setViolations(violationsRes.data || []);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch violations:', error.message);
      }

      // ============================================
      // STEP 7: Get incidents
      // ============================================
      try {
        const incidentsRes = await incidentService.getByDriver(driver.id);
        if (incidentsRes?.success) {
          setIncidents(incidentsRes.data || []);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch incidents:', error.message);
      }

      // ============================================
      // STEP 8: Load destinations
      // ============================================
      try {
        const geofencesRes = await geofenceService.getByTenant(tenantId);
        if (geofencesRes?.success && geofencesRes?.data) {
          const geofences = Array.isArray(geofencesRes.data) ? geofencesRes.data : [geofencesRes.data];
          const destinations = geofences
            .filter(g => g.type === 'route' && g.isActive)
            .map(g => ({
              id: g.id,
              name: g.name,
              start: g.start_location || g.startLocation || 'Start',
              end: g.end_location || g.endLocation || 'End',
              points: g.coordinates ? JSON.parse(g.coordinates) : []
            }));
          setAvailableDestinations(destinations);
        }
      } catch (error) {
        console.warn('⚠️ Could not load destinations:', error.message);
      }

      // ============================================
      // STEP 9: Build notifications (with checklist)
      // ============================================
      buildNotifications(driver, vehicle);

      setLastUpdated(new Date().toLocaleTimeString());
      console.log('✅ Dashboard data loaded successfully');

    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
      setErrorMessage('Failed to load dashboard data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CALCULATE SERVICE DUE
  // ============================================
  const calculateServiceDue = (nextServiceDate) => {
    if (!nextServiceDate) return 'N/A';
    const today = new Date();
    const next = new Date(nextServiceDate);
    const diff = Math.ceil((next - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? `Due in ${diff} days` : 'Overdue!';
  };

  // ============================================
  // BUILD NOTIFICATIONS (with checklist)
  // ============================================
  const buildNotifications = (driver, vehicle) => {
    const items = [];

    // ✅ CHECKLIST NOTIFICATIONS
    if (inspectionStatus === 'pending') {
      items.push({
        id: 'inspection_due',
        title: '📋 Pre-Trip Inspection Due',
        description: 'Complete your daily vehicle inspection before starting a trip.',
        time: 'Now',
        type: 'warning'
      });
    } else if (inspectionStatus === 'completed') {
      items.push({
        id: 'inspection_done',
        title: '✅ Inspection Complete',
        description: `Today's inspection completed at ${new Date(todayInspection?.createdAt).toLocaleTimeString()}`,
        time: 'Now',
        type: 'success'
      });
    } else if (inspectionStatus === 'failed') {
      items.push({
        id: 'inspection_failed',
        title: '⚠️ Inspection Failed',
        description: 'Vehicle failed inspection. Please address the defects.',
        time: 'Now',
        type: 'alert'
      });
    }

    if (pendingInspections > 0) {
      items.push({
        id: 'pending_inspections',
        title: '📋 Pending Inspections',
        description: `You have ${pendingInspections} incomplete inspection(s) on record.`,
        time: 'Now',
        type: 'info'
      });
    }

    // Vehicle maintenance notification
    if (vehicle && (vehicle.status === 'Maintenance' || vehicle.status === 'maintenance')) {
      items.push({
        id: 'vehicle_maintenance',
        title: '🔧 Vehicle in Maintenance',
        description: `Your vehicle ${vehicle.registration || vehicle.id} is currently in maintenance`,
        time: 'Now',
        type: 'warning'
      });
    }

    // License expiry notifications
    if (vehicle && (vehicle.licenseExpiry || vehicle.license_expiry)) {
      const expiry = new Date(vehicle.licenseExpiry || vehicle.license_expiry);
      const now = new Date();
      const diff = (expiry - now) / (1000 * 60 * 60 * 24);
      if (diff < 30 && diff > 0) {
        items.push({
          id: 'vehicle_license_expiring',
          title: '📅 Vehicle License Expiring',
          description: `License expires in ${Math.round(diff)} days`,
          time: 'Now',
          type: 'warning'
        });
      }
      if (diff < 0) {
        items.push({
          id: 'vehicle_license_expired',
          title: '🚨 Vehicle License Expired!',
          description: `License expired ${Math.round(Math.abs(diff))} days ago`,
          time: 'Now',
          type: 'alert'
        });
      }
    }

    if (driver && (driver.licenseExpiry || driver.license_expiry || driver.license_expiration)) {
      const expiry = new Date(driver.licenseExpiry || driver.license_expiry || driver.license_expiration);
      const now = new Date();
      const diff = (expiry - now) / (1000 * 60 * 60 * 24);
      if (diff < 30 && diff > 0) {
        items.push({
          id: 'driver_license_expiring',
          title: '📅 Your License Expiring',
          description: `Your license expires in ${Math.round(diff)} days`,
          time: 'Now',
          type: 'warning'
        });
      }
      if (diff < 0) {
        items.push({
          id: 'driver_license_expired',
          title: '🚨 Your License Expired!',
          description: 'Please renew your license immediately',
          time: 'Now',
          type: 'alert'
        });
      }
    }

    // Safety score notifications
    const score = driver?.safetyScore || driver?.safety_score || 0;
    if (score > 0) {
      if (score < 70) {
        items.push({
          id: 'low_safety_score',
          title: '⚠️ Low Safety Score',
          description: `Your score is ${score}/100. Drive carefully!`,
          time: 'Now',
          type: 'alert'
        });
      } else if (score >= 95) {
        items.push({
          id: 'excellent_safety_score',
          title: '⭐ Excellent Safety Score!',
          description: `Your score is ${score}/100. Keep it up!`,
          time: 'Now',
          type: 'success'
        });
      }
    }

    const unresolvedViolations = violations.filter(v => !v.resolved);
    if (unresolvedViolations.length > 0) {
      items.push({
        id: 'violations_alert',
        title: '📍 Geofence Violations',
        description: `You have ${unresolvedViolations.length} unresolved violation(s)`,
        time: 'Now',
        type: 'alert'
      });
    }

    const unresolvedIncidents = incidents.filter(i => 
      i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'resolved'
    );
    if (unresolvedIncidents.length > 0) {
      items.push({
        id: 'incidents_alert',
        title: '🚨 Incident Reports',
        description: `You have ${unresolvedIncidents.length} unresolved incident(s)`,
        time: 'Now',
        type: 'alert'
      });
    }

    if (!vehicle) {
      items.unshift({
        id: 'no_vehicle',
        title: '🚫 No Vehicle Assigned',
        description: 'Contact your fleet manager to assign a vehicle',
        time: 'Now',
        type: 'warning'
      });
    }

    if (items.length === 0) {
      items.push({
        id: 'all_clear',
        title: '✅ All Clear!',
        description: 'No notifications. Safe driving!',
        time: 'Now',
        type: 'success'
      });
    }

    const priorityOrder = { alert: 0, warning: 1, info: 2, success: 3 };
    items.sort((a, b) => (priorityOrder[a.type] || 4) - (priorityOrder[b.type] || 4));

    setNotifications(items.slice(0, 5));
    setUnreadCount(items.filter(item => !item.read).length);
  };

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  // ============================================
  // AUTO-REFRESH
  // ============================================
  useEffect(() => {
    if (!currentUser) return;
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard...');
      loadDashboardData();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // ============================================
  // TRIP TIMER
  // ============================================
  useEffect(() => {
    let interval;
    if (isTripActive) {
      interval = setInterval(() => {
        setTripDuration(prev => prev + 1);
        setCurrentSpeed(Math.floor(20 + Math.random() * 60));
        setDistance(prev => prev + (Math.random() * 0.05));
        setFuelUsed(prev => prev + (Math.random() * 0.005));
      }, 1000);
    } else {
      setTripDuration(0);
      setCurrentSpeed(0);
      setDistance(0);
      setFuelUsed(0);
    }
    return () => clearInterval(interval);
  }, [isTripActive]);

  // ============================================
  // CHECK ACTIVE TRIP FROM CONTEXT
  // ============================================
  useEffect(() => {
    if (assignedVehicle) {
      const vehicleId = assignedVehicle.id;
      const activeTrip = getActiveTrip(vehicleId);
      if (activeTrip) {
        setIsTripActive(true);
        setActiveTripId(activeTrip.id);
      }
    }
  }, [assignedVehicle, getActiveTrip]);

  // ============================================
  // HELPERS
  // ============================================
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreText = (score) => {
    if (score >= 90) return 'Excellent! Keep it up!';
    if (score >= 80) return 'Good! Room for improvement';
    if (score >= 70) return 'Fair! Need to improve';
    return 'Warning! Please drive carefully';
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'alert': return <AlertCircle size={14} className="text-red-500 flex-shrink-0" />;
      case 'warning': return <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />;
      case 'success': return <CheckCircle size={14} className="text-green-500 flex-shrink-0" />;
      default: return <Info size={14} className="text-blue-500 flex-shrink-0" />;
    }
  };

  const getNotificationBg = (type) => {
    switch(type) {
      case 'alert': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'success': return 'bg-green-50 border-green-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  // ============================================
  // HANDLE START TRIP (with inspection check)
  // ============================================
  const handleStartTrip = async () => {
    if (!assignedVehicle) {
      setErrorMessage('No vehicle assigned. Please contact your fleet manager.');
      return;
    }

    const vehicleId = assignedVehicle.id;

    // ✅ CHECK IF TODAY'S INSPECTION IS COMPLETE
    const today = new Date().toISOString().split('T')[0];
    try {
      const response = await checklistService.getHistory(vehicleId, currentUser?.tenantId);
      const checklists = response?.data || [];
      const todayCheck = checklists.find(c => 
        c.inspectionDate?.split('T')[0] === today || 
        c.createdAt?.split('T')[0] === today
      );
      
      if (!todayCheck || todayCheck.status !== 'completed') {
        setErrorMessage('⚠️ Please complete today\'s pre-trip inspection before starting.');
        // Navigate to Checklist page - use window navigation or your app's navigation
        if (window.setActiveTab) {
          window.setActiveTab('checklist');
        }
        return;
      }
    } catch (error) {
      console.error('Failed to check inspection status:', error);
      setErrorMessage('Failed to verify inspection status. Please try again.');
      return;
    }

    const existingTrip = getActiveTrip(vehicleId);
    if (existingTrip) {
      setErrorMessage('A trip is already in progress for this vehicle');
      return;
    }

    try {
      let destination = 'Maseru Depot';
      let from = 'Ha-Teko';
      let to = 'Maseru Depot';
      
      if (availableDestinations.length > 0) {
        const route = availableDestinations[0];
        destination = route.end || route.name;
        from = route.start || 'Start';
        to = route.end || destination;
      }

      const tripData = {
        destination: destination,
        purpose: 'Delivery',
        startOdometer: assignedVehicle.mileage || assignedVehicle.odometer || '0 km',
        from: from,
        to: to
      };
      
      const newTrip = startTrip(vehicleId, currentUser?.name || 'Driver', tripData);
      
      setIsTripActive(true);
      setActiveTripId(newTrip.id);
      setSuccessMessage(`Trip started! Destination: ${destination}`);
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDashboardData();
    } catch (error) {
      console.error('❌ Error starting trip:', error);
      setErrorMessage('Failed to start trip. Please try again.');
    }
  };

  // ============================================
  // HANDLE END TRIP
  // ============================================
  const handleEndTrip = () => {
    if (!assignedVehicle) {
      setErrorMessage('No vehicle assigned');
      return;
    }

    try {
      endTrip(assignedVehicle.id);
      setIsTripActive(false);
      setActiveTripId(null);
      setTripDuration(0);
      setCurrentSpeed(0);
      setDistance(0);
      setFuelUsed(0);
      setSuccessMessage('Trip ended successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadDashboardData();
    } catch (error) {
      console.error('❌ Error ending trip:', error);
      setErrorMessage('Failed to end trip. Please try again.');
    }
  };

  // ============================================
  // HANDLE PANIC
  // ============================================
  const handlePanic = () => {
    if (isPanicking) return;
    
    setIsPanicking(true);
    setPanicMessage('🚨 Sending emergency alert...');

    const driverName = driverData?.name || currentUser?.name || 'Unknown Driver';
    const vehicleReg = assignedVehicle?.registration || assignedVehicle?.id || 'N/A';

    const createPanicIncident = async () => {
      try {
        const incidentData = {
          tenant: { id: currentUser?.tenantId },
          vehicle: assignedVehicle ? { id: assignedVehicle.id } : null,
          driver: driverData ? { id: driverData.id } : null,
          incidentType: 'Panic Alert',
          severity: 'Critical',
          status: 'reported',
          location: 'Unknown',
          description: `🚨 EMERGENCY: Panic alert from driver ${driverName}${vehicleReg !== 'N/A' ? ` in vehicle ${vehicleReg}` : ''}`,
          reportedBy: driverName
        };
        
        await incidentService.create(incidentData);
        setPanicMessage('✅ Emergency alert sent! Help is on the way.');
      } catch (e) {
        console.error('❌ Failed to create panic incident:', e);
        setPanicMessage('⚠️ Failed to send alert. Please call emergency services.');
      }
    };

    createPanicIncident();

    setTimeout(() => {
      setIsPanicking(false);
      setPanicMessage('');
    }, 5000);
  };

  // ============================================
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
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
              <AlertTriangle size={16} />
              <p className="text-sm">Contact your fleet manager to assign a vehicle</p>
            </div>
          </div>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Quick Stats
  const quickStats = [
    { 
      label: 'Today\'s Trips', 
      value: stats.todayTrips, 
      change: stats.totalDistance, 
      icon: Navigation, 
      color: 'blue' 
    },
    { 
      label: 'Fuel Used', 
      value: stats.fuelUsed, 
      change: stats.efficiency, 
      icon: Fuel, 
      color: 'orange' 
    },
    { 
      label: 'Next Service', 
      value: stats.nextService, 
      change: stats.serviceDue, 
      icon: Wrench, 
      color: 'green' 
    },
    { 
      label: 'Safety Score', 
      value: `${driverScore}/100`, 
      change: getScoreText(driverScore), 
      icon: Shield, 
      color: getScoreColor(driverScore).includes('green') ? 'green' : getScoreColor(driverScore).includes('yellow') ? 'yellow' : 'red' 
    },
  ];

  const vehicleDisplay = assignedVehicle ? (assignedVehicle.registration || assignedVehicle.id) : 'No Vehicle';

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

      {/* Panic Alert Message */}
      {panicMessage && (
        <div className={`p-4 rounded-xl shadow-lg ${
          panicMessage.includes('Emergency alert sent') 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700 animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            {panicMessage.includes('Emergency alert sent') ? (
              <CheckCircle size={24} className="text-green-500" />
            ) : (
              <AlertTriangle size={24} className="text-red-500 animate-pulse" />
            )}
            <p className="font-medium">{panicMessage}</p>
          </div>
        </div>
      )}

      {/* Refresh */}
      {/* <div className="flex justify-end">
        <button
          onClick={loadDashboardData}
          className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div> */}

      {/* Driver Header */}
<div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
  <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>

  <div className="relative flex flex-wrap items-center gap-4">
    <img 
      src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.name || 'Driver')}&background=2563eb&color=fff&size=80`}
      alt={currentUser?.name || 'Driver'} 
      className="w-16 h-16 rounded-full border-2 border-white/30 shadow-lg"
    />
    <div className="flex-1">
      <div className="flex flex-wrap items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold">Welcome back, {currentUser?.name?.split(' ')[0] || 'Driver'}!</h2>
            {/* ✅ REFRESH BUTTON MOVED HERE */}
            <button
              onClick={loadDashboardData}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-all hover:scale-110 text-white/80 hover:text-white"
              title="Refresh dashboard"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-blue-100 mt-1">
            <span className="flex items-center gap-1">
              <Car size={14} /> {vehicleDisplay}
            </span>
            <span className="hidden sm:inline">•</span>
            <span>License: {driverData?.licenseNumber || driverData?.license_number || 'N/A'}</span>
            <span className="hidden sm:inline">•</span>
            <span className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
              <Award size={14} /> Score: {driverScore}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {/* ✅ CHECKLIST STATUS BADGE */}
          {inspectionStatus === 'completed' && (
            <span className="bg-green-500 px-3 py-1 rounded-full text-sm flex items-center gap-1">
              <CheckCircle size={14} /> Inspected Today
            </span>
          )}
          {inspectionStatus === 'pending' && (
            <span className="bg-yellow-500 px-3 py-1 rounded-full text-sm flex items-center gap-1 animate-pulse">
              <AlertTriangle size={14} /> Inspection Due
            </span>
          )}
          {inspectionStatus === 'failed' && (
            <span className="bg-red-500 px-3 py-1 rounded-full text-sm flex items-center gap-1 animate-pulse">
              <X size={14} /> Inspection Failed
            </span>
          )}
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm">On Duty</span>
          {isTripActive && (
            <span className="bg-green-500 px-3 py-1 rounded-full text-sm animate-pulse flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"></span>
              LIVE
            </span>
          )}
          {/* ✅ UPDATED: Shows last updated time with refresh icon */}
          <span className="text-xs text-blue-200 flex items-center gap-1">
            <Clock size={12} />
            Updated: {lastUpdated || 'Just now'}
          </span>
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-${stat.color}-50 text-${stat.color}-600`}>
                <stat.icon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold truncate">{stat.value}</p>
                <p className="text-[10px] text-gray-400 truncate">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trip Control & Panic Button */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trip Control */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Trip Status</h4>
              <p className="text-sm text-gray-500">
                {isTripActive ? 'Trip in progress' : assignedVehicle ? 'Start your next trip' : 'No vehicle assigned'}
              </p>
              {isTripActive && (
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="text-blue-600" />
                    {formatTime(tripDuration)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={14} className="text-orange-600" />
                    {currentSpeed} km/h
                  </span>
                  <span className="flex items-center gap-1">
                    <Navigation size={14} className="text-green-600" />
                    {distance.toFixed(1)} km
                  </span>
                  <span className="flex items-center gap-1">
                    <Fuel size={14} className="text-yellow-600" />
                    {fuelUsed.toFixed(1)} L
                  </span>
                  {assignedVehicle && (
                    <span className="text-xs text-gray-400">
                      {assignedVehicle.make} {assignedVehicle.model}
                    </span>
                  )}
                  {activeTripId && (
                    <span className="text-[10px] text-gray-400">Trip ID: {activeTripId}</span>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!isTripActive ? (
                <button 
                  onClick={handleStartTrip}
                  disabled={!assignedVehicle}
                  className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-lg ${
                    assignedVehicle 
                      ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Play size={20} /> Start Trip
                </button>
              ) : (
                <button 
                  onClick={handleEndTrip}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-red-200"
                >
                  <StopCircle size={20} /> End Trip
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Panic Button */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <button 
            onClick={handlePanic}
            disabled={isPanicking}
            className={`w-full py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-3 text-white ${
              isPanicking 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 animate-pulse'
            }`}
          >
            <AlertTriangle size={28} />
            <span className="text-lg font-bold">
              {isPanicking ? 'SENDING...' : 'PANIC'}
            </span>
          </button>
          <p className="text-xs text-gray-400 mt-2">
            {isPanicking ? 'Sending emergency alert...' : 'Tap in emergency'}
          </p>
        </div>
      </div>

      {/* Notifications & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Notifications */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Bell size={16} className="text-blue-600" />
              Notifications
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h4>
            <span className="text-xs text-gray-400">{notifications.length} total</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-3 rounded-lg border-l-4 transition-all hover:shadow-sm ${getNotificationBg(notif.type)}`}
                >
                  <div className="flex items-start gap-2">
                    {getNotificationIcon(notif.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{notif.title}</p>
                      <p className="text-xs text-gray-600">{notif.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-400">
                <CheckCircle size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm">All clear!</p>
                <p className="text-xs">No new notifications</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Activity size={16} className="text-purple-600" />
            Quick Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button className="p-3 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition-all hover:scale-105">
              <Calendar size={18} className="mx-auto mb-1" />
              <span className="text-xs font-medium">View Schedule</span>
            </button>
            <button className="p-3 bg-orange-50 rounded-lg text-orange-700 hover:bg-orange-100 transition-all hover:scale-105">
              <MapPin size={18} className="mx-auto mb-1" />
              <span className="text-xs font-medium">Report Location</span>
            </button>
            <button 
              onClick={() => window.setActiveTab && window.setActiveTab('checklist')}
              className="p-3 bg-green-50 rounded-lg text-green-700 hover:bg-green-100 transition-all hover:scale-105"
            >
              <ClipboardCheck size={18} className="mx-auto mb-1" />
              <span className="text-xs font-medium">Vehicle Check</span>
            </button>
            <button className="p-3 bg-red-50 rounded-lg text-red-700 hover:bg-red-100 transition-all hover:scale-105">
              <Phone size={18} className="mx-auto mb-1" />
              <span className="text-xs font-medium">Contact Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;