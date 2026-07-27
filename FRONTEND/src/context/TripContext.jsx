// src/context/TripContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { tripService, vehicleService, driverService } from '../services/api';

const TripContext = createContext();

export const TripProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [activeTrips, setActiveTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================
  // LOAD ACTIVE TRIPS FROM BACKEND API
  // ============================================
  const loadActiveTrips = async () => {
    if (!currentUser) {
        setActiveTrips([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    try {
        console.log('🔄 TripProvider: Loading active trips from API...');
        
        const tenantId = currentUser.tenantId;
        if (!tenantId) {
            console.warn('⚠️ No tenant ID found');
            setActiveTrips([]);
            setIsLoading(false);
            return;
        }

        const response = await tripService.getAll(tenantId);
        if (response?.success && response?.data) {
            const allTrips = response.data;
            // ✅ Check for BOTH status values
            const active = allTrips.filter(t => 
                t.status === 'In Progress' || 
                t.status === 'active' ||
                t.status === 'ACTIVE'
            );
            setActiveTrips(active);
            console.log('📦 TripProvider: Loaded active trips:', active.length);
        } else {
            setActiveTrips([]);
        }
        
    } catch (error) {
        console.error('❌ TripProvider: Failed to load trips:', error);
        setActiveTrips([]);
    } finally {
        setIsLoading(false);
    }
};

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    loadActiveTrips();
  }, [currentUser]);

  // ============================================
  // HELPER: Extract start/end from route data
  // ============================================
  const extractRoutePoints = (tripData) => {
    let startLocation = tripData?.from || 'Start';
    let endLocation = tripData?.to || tripData?.destination || 'Destination';
    let routeName = tripData?.routeName || null;

    // ✅ If tripData has route points, extract first and last point names
    if (tripData?.routePoints && Array.isArray(tripData.routePoints) && tripData.routePoints.length >= 2) {
      const points = tripData.routePoints;
      startLocation = points[0].name || points[0].location || startLocation;
      endLocation = points[points.length - 1].name || points[points.length - 1].location || endLocation;
      routeName = tripData.routeName || `${startLocation} to ${endLocation}`;
    }
    
    // ✅ If routeName contains ' to ', extract from there
    if (routeName && routeName.includes(' to ') && (startLocation === 'Start' || endLocation === 'Destination')) {
      const parts = routeName.split(' to ');
      if (parts.length === 2) {
        startLocation = parts[0].trim();
        endLocation = parts[1].trim();
      }
    }

    return { startLocation, endLocation, routeName };
  };

  // ============================================
// ✅ CHECK VEHICLE STATUS BEFORE STARTING TRIP
// ============================================
const checkVehicleCanTrip = async (vehicleId) => {
  try {
    const vehicleResponse = await vehicleService.getById(vehicleId);
    if (vehicleResponse?.success && vehicleResponse?.data) {
      const vehicle = vehicleResponse.data;
      const status = vehicle.status?.toLowerCase() || '';
      
      // ❌ Block if in maintenance
      if (status === 'maintenance') {
        throw new Error('🔧 This vehicle is in maintenance and cannot be used for trips.');
      }
      
      // ❌ Block if decommissioned
      if (status === 'decommissioned') {
        throw new Error('❌ This vehicle is decommissioned.');
      }
      
      return true;
    }
    throw new Error('Vehicle not found');
  } catch (error) {
    throw error;
  }
};

// ============================================
// ✅ DRIVER SAFETY SCORE CALCULATION
// ============================================

const calculateDriverScore = (tripData, tripDuration) => {
  let score = 100;
  let violations = 0;
  let reasons = [];

  // 1️⃣ Speeding Events
  if (tripData.speedingEvents !== undefined && tripData.speedingEvents > 0) {
    const deduction = Math.min(tripData.speedingEvents * 2, 20);
    score -= deduction;
    violations += tripData.speedingEvents;
    reasons.push(`${tripData.speedingEvents} speeding event(s) (-${deduction})`);
  }

  // 2️⃣ Harsh Braking
  if (tripData.harshBraking !== undefined && tripData.harshBraking > 0) {
    const deduction = Math.min(tripData.harshBraking * 3, 25);
    score -= deduction;
    violations += tripData.harshBraking;
    reasons.push(`${tripData.harshBraking} harsh braking(s) (-${deduction})`);
  }

  // 3️⃣ Geofence Violations
  if (tripData.geofenceViolations !== undefined && tripData.geofenceViolations > 0) {
    const deduction = Math.min(tripData.geofenceViolations * 5, 30);
    score -= deduction;
    violations += tripData.geofenceViolations;
    reasons.push(`${tripData.geofenceViolations} geofence violation(s) (-${deduction})`);
  }

  // 4️⃣ Trip Completion Bonus
  if (tripData.status === 'Completed' || tripData.status === 'completed') {
    score += 2;
    reasons.push('Trip completed successfully (+2)');
  }

  // 5️⃣ Distance Bonus (for long trips without incidents)
  const distance = parseFloat(tripData.distance) || 0;
  if (distance > 50 && violations === 0) {
    score += 3;
    reasons.push('Long distance with zero incidents (+3)');
  }

  // 6️⃣ Fuel Efficiency Bonus
  const efficiency = parseFloat(tripData.efficiency) || 0;
  if (efficiency > 0 && efficiency < 7) {
    score += 2;
    reasons.push('Good fuel efficiency (+2)');
  }

  // Ensure score stays between 0 and 100
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, violations, reasons };
};

// ============================================
// ✅ UPDATE DRIVER SAFETY SCORE
// ============================================

const updateDriverSafetyScore = async (driverId, tripData, tripDuration) => {
  try {
    // 1️⃣ Get current driver data
    const driverResponse = await driverService.getById(driverId);
    if (!driverResponse?.success || !driverResponse?.data) {
      console.warn('⚠️ Driver not found:', driverId);
      return null;
    }

    const driver = driverResponse.data;
    const currentScore = driver.safetyScore || driver.safety_score || 100;
    
    // 2️⃣ Calculate new score from trip
    const { score: tripScore, violations, reasons } = calculateDriverScore(tripData, tripDuration);
    
    // 3️⃣ Weighted average: 70% existing history, 30% current trip
    const newScore = Math.round((currentScore * 0.7) + (tripScore * 0.3));
    const finalScore = Math.max(0, Math.min(100, newScore));

    console.log(`📊 Driver ${driverId} score: ${currentScore} → ${finalScore} (trip score: ${tripScore})`);
    console.log(`📊 Reasons: ${reasons.join(', ')}`);

    // 4️⃣ Update driver
    const updateData = {
      name: driver.name,
      email: driver.email || '',
      phone: driver.phone || '',
      licenseNumber: driver.licenseNumber || driver.license_number || '',
      licenseExpiry: driver.licenseExpiry || driver.license_expiry || '',
      driverId: driver.driverId || driver.driver_id || '',
      assignedVehicle: driver.assignedVehicle || driver.assigned_vehicle || null,
      safetyScore: finalScore,
      training: driver.training || '',
      status: driver.status || 'Active',
      // ✅ Store violation history
      violationHistory: driver.violationHistory || []
    };

    // ✅ Add violation record if there were violations
    if (violations > 0) {
      const violationRecord = {
        date: new Date().toISOString(),
        tripId: tripData.id || tripData._id,
        violations: violations,
        reasons: reasons,
        scoreDeduction: 100 - tripScore,
        tripDistance: tripData.distance || 0
      };
      
      if (!updateData.violationHistory) updateData.violationHistory = [];
      updateData.violationHistory.unshift(violationRecord);
      // Keep only last 50 violations
      if (updateData.violationHistory.length > 50) {
        updateData.violationHistory = updateData.violationHistory.slice(0, 50);
      }
    }

    const response = await driverService.update(driverId, updateData);
    
    if (response?.success) {
      console.log(`✅ Driver ${driverId} safety score updated to ${finalScore}`);
      
      // 5️⃣ Check if score dropped below 70 - create coaching alert
      if (finalScore < 70) {
        await createCoachingAlert(driverId, driver.name, finalScore, reasons);
      }
      
      // 6️⃣ Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('driverScoreUpdated', {
        detail: { driverId, newScore: finalScore, oldScore: currentScore }
      }));
      
      return finalScore;
    } else {
      console.warn('⚠️ Failed to update driver score:', response?.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error updating driver safety score:', error);
    return null;
  }
};

// ============================================
// ✅ CREATE COACHING ALERT
// ============================================

const createCoachingAlert = async (driverId, driverName, score, reasons) => {
  try {
    const alarmData = {
      type: 'COACHING',
      severity: 'high',
      driverId: driverId,
      driverName: driverName,
      message: `⚠️ Driver ${driverName} needs coaching - Safety Score: ${score}%`,
      description: `Safety score dropped below 70%. Reasons: ${reasons.join(', ')}`,
      createdAt: new Date().toISOString(),
      resolved: false
    };

    // Store in localStorage
    const alarms = JSON.parse(localStorage.getItem('fleetman_alarms') || '[]');
    alarms.unshift({
      id: `coaching_${Date.now()}`,
      ...alarmData
    });
    localStorage.setItem('fleetman_alarms', JSON.stringify(alarms));

    // Dispatch event
    window.dispatchEvent(new CustomEvent('newAlarm', { detail: alarmData }));

    // Send notification to car owner
    try {
      const tenantUsers = JSON.parse(localStorage.getItem('fleetman_users') || '[]');
      const carOwner = tenantUsers.find(u => 
        u.tenantId === currentUser?.tenantId && u.role === 'car_owner'
      );
      
      if (carOwner) {
        const notificationData = {
          userId: carOwner.id,
          title: `⚠️ Driver ${driverName} Needs Coaching`,
          message: `Driver ${driverName} has a safety score of ${score}%. Please review and schedule coaching.`,
          link: '/drivers',
          read: false,
          createdAt: new Date().toISOString()
        };
        
        const notifications = JSON.parse(localStorage.getItem('fleetman_notifications') || '[]');
        notifications.unshift(notificationData);
        localStorage.setItem('fleetman_notifications', JSON.stringify(notifications));
        
        window.dispatchEvent(new CustomEvent('newNotification', { detail: notificationData }));
        console.log(`📧 Coaching alert sent to car owner for driver ${driverName}`);
      }
    } catch (notifError) {
      console.warn('Could not send coaching notification:', notifError);
    }

    return true;
  } catch (error) {
    console.error('Failed to create coaching alert:', error);
    return false;
  }
};

  // ============================================
  // START TRIP - Uses Backend API (UPDATED)
  // ============================================
  const startTrip = async (vehicleId, driverName, tripData) => {
  console.log('🚀 startTrip called with:', { vehicleId, driverName, tripData });
  
  try {
    // ✅ CHECK IF VEHICLE CAN TRIP
    await checkVehicleCanTrip(vehicleId);
    
    // ✅ Extract start and end from tripData
    const { startLocation, endLocation, routeName } = extractRoutePoints(tripData);
      
      // ✅ Create trip in backend with correct start/end AND geofence
      const tripPayload = {
        tenant: { id: currentUser?.tenantId },
        vehicle: { id: vehicleId },
        driver: { id: currentUser?.driverId || null },
        geofence: tripData?.geofenceId ? { id: tripData.geofenceId } : null,  // ✅ ADD THIS!
        startLocation: startLocation,
        endLocation: endLocation,
        startTime: new Date().toISOString(),
        status: 'In Progress',
        purpose: tripData?.purpose || 'Normal Trip',
        startOdometer: tripData?.startOdometer || 0,
        driverName: driverName || currentUser?.name || 'Unknown',
        vehicleName: tripData?.vehicleName || '',
        routeName: routeName || `${startLocation} to ${endLocation}`
      };

      console.log('📝 Creating trip with:', tripPayload);

      const response = await tripService.create(tripPayload);
      
      if (response?.success && response?.data) {
        const newTrip = response.data;
        
        // ✅ Add geofence info to the trip object for frontend use
        const tripWithGeofence = {
          ...newTrip,
          geofenceId: tripData?.geofenceId || null,
          routeName: routeName || `${startLocation} to ${endLocation}`
        };
        
        // ✅ Add to active trips state
        setActiveTrips(prev => [...prev, tripWithGeofence]);
        
        // ✅ Update local storage for quick access
        try {
          const savedTrips = JSON.parse(localStorage.getItem('activeTrips') || '[]');
          const updated = [...savedTrips, tripWithGeofence];
          localStorage.setItem('activeTrips', JSON.stringify(updated));
        } catch (e) {
          console.warn('Could not save to localStorage:', e);
        }
        
        // ✅ Dispatch event for other pages
        window.dispatchEvent(new CustomEvent('tripsUpdated'));
        
        return tripWithGeofence;
      } else {
        console.error('❌ Failed to start trip:', response?.message);
        return null;
      }
    } catch (error) {
      console.error('❌ Error starting trip:', error);
      return null;
    }
  };

  // ============================================
// END TRIP - With Driver Score Update
// ============================================
const endTrip = async (vehicleId, tripData = {}) => {
  console.log('🛑 endTrip called for vehicle:', vehicleId);
  
  // Find the active trip
  const activeTrip = activeTrips.find(trip => 
    (trip.vehicleId === vehicleId || trip.vehicle?.id === vehicleId) && 
    (trip.status === 'In Progress' || trip.status === 'active')
  );
  
  if (!activeTrip) {
    console.log('⚠️ No active trip found for vehicle:', vehicleId);
    return null;
  }

  try {
    // ✅ Get driver ID from the active trip
    const driverId = activeTrip.driverId || activeTrip.driver?.id || activeTrip.driver_id;
    
    // ✅ Update trip status in backend
    const updatePayload = {
      status: 'Completed',
      endTime: new Date().toISOString(),
      distance: tripData?.distance || activeTrip.distance || 0,
      duration: tripData?.duration || activeTrip.duration || '0m',
      fuelUsed: tripData?.fuelUsed || activeTrip.fuelUsed || 0,
      efficiency: tripData?.efficiency || activeTrip.efficiency || 'N/A',
      endOdometer: tripData?.endOdometer || activeTrip.endOdometer || 0,
      // ✅ Pass through any violation data from tracking
      speedingEvents: tripData?.speedingEvents || 0,
      harshBraking: tripData?.harshBraking || 0,
      geofenceViolations: tripData?.geofenceViolations || 0
    };

    const response = await tripService.update(activeTrip.id, updatePayload);
    
    if (response?.success) {
      // ✅ UPDATE DRIVER SAFETY SCORE
      if (driverId) {
        const tripForScore = {
          id: activeTrip.id,
          distance: updatePayload.distance,
          efficiency: updatePayload.efficiency,
          status: updatePayload.status,
          speedingEvents: updatePayload.speedingEvents,
          harshBraking: updatePayload.harshBraking,
          geofenceViolations: updatePayload.geofenceViolations
        };
        
        await updateDriverSafetyScore(driverId, tripForScore, activeTrip.duration);
      } else {
        console.warn('⚠️ No driver ID found for trip, skipping score update');
      }

      // ✅ Remove from active trips
      setActiveTrips(prev => prev.filter(t => 
        t.id !== activeTrip.id
      ));
      
      // ✅ Update local storage
      try {
        const savedTrips = JSON.parse(localStorage.getItem('activeTrips') || '[]');
        const updated = savedTrips.filter(t => t.id !== activeTrip.id);
        localStorage.setItem('activeTrips', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update localStorage:', e);
      }
      
      // ✅ Dispatch event for other pages
      window.dispatchEvent(new CustomEvent('tripsUpdated'));
      window.dispatchEvent(new CustomEvent('driverScoreUpdated'));
      
      return activeTrip;
    } else {
      console.error('❌ Failed to end trip:', response?.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Error ending trip:', error);
    return null;
  }
};

  // ============================================
  // SYNC ACTIVE TRIPS - For external use
  // ============================================
  const syncActiveTrips = async () => {
    await loadActiveTrips();
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const hasActiveTrip = (vehicleId) => {
    return activeTrips.some(trip => 
      (trip.vehicleId === vehicleId || trip.vehicle?.id === vehicleId) && 
      (trip.status === 'In Progress' || trip.status === 'active')
    );
  };

  const getActiveTrip = (vehicleId) => {
    return activeTrips.find(trip => 
      (trip.vehicleId === vehicleId || trip.vehicle?.id === vehicleId) && 
      (trip.status === 'In Progress' || trip.status === 'active')
    ) || null;
  };

  const getActiveTrips = () => {
    return activeTrips.filter(trip => 
      trip.status === 'In Progress' || trip.status === 'active'
    );
  };

  const updateTripLocation = (vehicleId, lat, lng, speed) => {
    // Update local state
    setActiveTrips(prev => {
      const updated = prev.map(trip => 
        (trip.vehicleId === vehicleId || trip.vehicle?.id === vehicleId) && 
        (trip.status === 'In Progress' || trip.status === 'active')
          ? { 
              ...trip, 
              lastLat: lat, 
              lastLng: lng, 
              speed: speed,
              lastUpdate: new Date().toISOString() 
            }
          : trip
      );
      
      // Update localStorage for quick access
      try {
        localStorage.setItem('activeTrips', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update localStorage:', e);
      }
      
      return updated;
    });
  };

  const value = {
    activeTrips,
    isLoading,
    startTrip,
    endTrip,
    hasActiveTrip,
    getActiveTrip,
    getActiveTrips,
    updateTripLocation,
    syncActiveTrips
  };

  return (
    <TripContext.Provider value={value}>
      {children}
    </TripContext.Provider>
  );
};

export const useTrip = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrip must be used within a TripProvider');
  }
  return context;
};