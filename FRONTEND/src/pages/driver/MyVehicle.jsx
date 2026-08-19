import React, { useState, useEffect } from 'react';
import { 
  Car, CheckCircle, Fuel, Gauge, 
  Wrench, Radio, Thermometer, Activity, Shield,
  Truck, AlertTriangle, User,
  Clock, Award, Package, AlertCircle, RefreshCw,
  ClipboardCheck, History, Bell, Calendar, XCircle, ArrowLeft, Lightbulb      
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService, 
  tripService,
  fuelService,
  maintenanceService,
  checklistService,
  complianceService,
  notificationService,
  incidentService,
  geofenceService
} from '../../services/api';

// ============================================
// PARSE ACCESSORIES HELPER
// ============================================
const parseAccessories = (accessories) => {
  if (!accessories) return [];
  
  // If it's already an array, return it
  if (Array.isArray(accessories)) return accessories;
  
  // If it's a string, try to parse it
  if (typeof accessories === 'string') {
    try {
      const parsed = JSON.parse(accessories);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      // If it's a comma-separated string
      if (accessories.includes(',')) {
        return accessories.split(',').map(a => a.trim()).filter(a => a);
      }
      // If it's a single item
      if (accessories.trim()) {
        return [accessories.trim()];
      }
      return [];
    }
  }
  
  return [];
};

const MyVehicle = () => {
  const { currentUser } = useAuth();
  const [vehicle, setVehicle] = useState(null);
  const [driverInfo, setDriverInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusItems, setStatusItems] = useState([]);
  const [fuelHistory, setFuelHistory] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [checklistHistory, setChecklistHistory] = useState([]);
  const [latestChecklist, setLatestChecklist] = useState(null);
  const [overriddenReturns, setOverriddenReturns] = useState([]);
  const [checklistItems, setChecklistItems] = useState([]);
  const [tripStats, setTripStats] = useState({
    totalTrips: 0,
    totalDistance: 0,
    avgFuelConsumption: 0
  });
  
  // ============================================
  // COMPLIANCE STATE
  // ============================================
  const [complianceItems, setComplianceItems] = useState([]);
  const [complianceAlerts, setComplianceAlerts] = useState([]);
  
  // Session storage helpers for alert tracking
  const getAlertSent = () => {
    return sessionStorage.getItem(`compliance_alert_sent_${currentUser?.id}`) === 'true';
  };

  const setAlertSent = (value) => {
    sessionStorage.setItem(`compliance_alert_sent_${currentUser?.id}`, String(value));
  };
  
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ============================================
  // GET COMPLIANCE TYPE LABEL
  // ============================================
  const getComplianceTypeLabel = (type) => {
    const labels = {
      'license_disc': 'License Disc',
      'roadworthy': 'Roadworthy',
      'insurance': 'Insurance',
      'permit': 'Permit',
      'driver_license': 'Driver License',
      'inspection_report': 'Inspection Report',
      'registration': 'Registration',
      'tax_clearance': 'Tax Clearance'
    };
    return labels[type] || type;
  };

  // ============================================
  // NOTIFY FLEET OWNER ABOUT COMPLIANCE ISSUES
  // ============================================
  const notifyFleetOwner = async (alerts, vehicleData, driver) => {
    try {
      const tenantId = currentUser?.tenantId;
      
      // CHECK IF THERE'S ALREADY A RECENT COMPLIANCE ALERT
      const incidentsRes = await incidentService.getByTenant(tenantId);
      if (incidentsRes?.success && incidentsRes?.data) {
        const incidents = Array.isArray(incidentsRes.data) ? incidentsRes.data : [incidentsRes.data];
        
        // Look for compliance alerts in the last 24 hours
        const recentAlert = incidents.find(i => 
          i.incidentType === 'Compliance Alert' &&
          (i.vehicle?.id === vehicleData.id || i.vehicleId === vehicleData.id) &&
          new Date(i.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours
        );
        
        if (recentAlert) {
          console.log('⏳ Compliance alert already created within 24 hours, skipping duplicate');
          setAlertSent(true); // Mark as sent
          return;
        }
      }
      
      // No recent alert found, proceed with creating new one
      const expiredItems = alerts.filter(a => a.status === 'expired');
      const expiringItems = alerts.filter(a => a.status === 'expiring_soon');
      
      let description = `🚨 COMPLIANCE ALERT for vehicle ${vehicleData.registration || vehicleData.id}\n\n`;
      description += `Driver: ${driver.name}\n`;
      description += `Vehicle: ${vehicleData.make} ${vehicleData.model}\n\n`;
      
      if (expiredItems.length > 0) {
        description += `❌ EXPIRED ITEMS:\n`;
        expiredItems.forEach(item => {
          description += `   • ${item.label}\n`;
        });
        description += `\n`;
      }
      
      if (expiringItems.length > 0) {
        description += `⚠️ EXPIRING SOON:\n`;
        expiringItems.forEach(item => {
          description += `   • ${item.label} (expires: ${item.validUntil})\n`;
        });
      }
      
      const incidentData = {
        tenant: { id: tenantId },
        vehicle: { id: vehicleData.id },
        driver: { id: driver.id },
        incidentType: 'Compliance Alert',
        severity: expiredItems.length > 0 ? 'High' : 'Medium',
        status: 'reported',
        location: vehicleData.location || 'Unknown',
        description: description,
        reportedBy: 'FLEETMAN System'
      };
      
      await incidentService.create(incidentData);
      console.log('✅ Compliance alert incident created');
      
      // Also send notification
      const notificationData = {
        tenant: { id: tenantId },
        user: { id: currentUser?.id },
        title: '🚨 Vehicle Compliance Alert',
        message: `Vehicle ${vehicleData.registration || vehicleData.id} has ${alerts.length} compliance issue(s) requiring attention.`,
        type: 'compliance_alert',
        link: `/vehicles/${vehicleData.id}`
      };
      
      try {
        await notificationService.create(notificationData);
        console.log('✅ Notification sent to fleet owner');
      } catch (e) {
        console.warn('⚠️ Could not send notification:', e.message);
      }
      
    } catch (error) {
      console.error('❌ Failed to notify fleet owner:', error);
    }
  };

  // ============================================
  // BUILD STATUS ITEMS FROM CHECKLIST
  // ============================================
  const buildStatusItems = (fuelLevel, checklist) => {
    // Default statuses - all PENDING if no checklist
    let engineStatus = 'PENDING';
    let brakesStatus = 'PENDING';
    let tiresStatus = 'PENDING';
    let batteryStatus = 'PENDING';
    let engineTemp = 'Normal';

    // If we have a checklist, extract status from it
    if (checklist && checklist.items) {
      try {
        const items = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
        
        // Find engine item
        const engineItem = items.find(i => 
          i.label === 'Engine Oil Level' || 
          i.label === 'Engine' ||
          i.label === 'Engine Oil'
        );
        
        // Find ALL brake items (Brake Fluid AND Brake Performance)
        const brakeItems = items.filter(i => 
          i.label === 'Brake Fluid' || 
          i.label === 'Brakes' || 
          i.label === 'Brake Performance'
        );
        
        // Find tires item
        const tiresItem = items.find(i => 
          i.label === 'Tire Pressure & Condition' || 
          i.label === 'Tires' ||
          i.label === 'Tire Pressure'
        );
        
        // Find battery item
        const batteryItem = items.find(i => 
          i.label === 'Battery' ||
          i.label === 'Battery Voltage'
        );
        
        // Helper to get the actual status text
        const getStatusText = (item) => {
          if (!item) return 'PENDING';
          if (item.status === 'pass') return 'PASS';
          if (item.status === 'pending') return 'PENDING';
          if (item.status === 'fail') return 'FAIL';
          if (item.defect) return '⚠️ DEFECT';
          return 'PENDING';
        };
        
        // Set engine status
        engineStatus = getStatusText(engineItem);
        
        // Set brakes status - check ALL brake items
        if (brakeItems.length > 0) {
          // Check if any brake item has a defect
          const hasDefect = brakeItems.some(item => item.defect === true);
          // Check if any brake item is FAIL
          const hasFail = brakeItems.some(item => item.status === 'fail');
          // Check if any brake item is PENDING
          const hasPending = brakeItems.some(item => item.status === 'pending');
          // Check if all brake items are PASS
          const allPass = brakeItems.every(item => item.status === 'pass');
          
          if (hasDefect) {
            brakesStatus = '⚠️ DEFECT';
          } else if (hasFail) {
            brakesStatus = 'FAIL';
          } else if (hasPending) {
            brakesStatus = 'PENDING';
          } else if (allPass) {
            brakesStatus = 'PASS';
          } else {
            brakesStatus = 'PENDING';
          }
        }
        
        // Set tires status
        tiresStatus = getStatusText(tiresItem);
        
        // Set battery status
        batteryStatus = getStatusText(batteryItem);
        
      } catch (e) {
        console.warn('Could not parse checklist items:', e);
      }
    }

    return [
      { 
        label: 'Engine', 
        status: engineStatus, 
        icon: CheckCircle, 
        color: engineStatus === 'PASS' ? 'text-green-600' : 
               engineStatus === 'FAIL' || engineStatus === '⚠️ DEFECT' ? 'text-red-600' : 
               'text-yellow-600'
      },
      { 
        label: 'Brakes', 
        status: brakesStatus, 
        icon: CheckCircle, 
        color: brakesStatus === 'PASS' ? 'text-green-600' : 
               brakesStatus === 'FAIL' || brakesStatus === '⚠️ DEFECT' ? 'text-red-600' : 
               'text-yellow-600'
      },
      { 
        label: 'Tires', 
        status: tiresStatus, 
        icon: CheckCircle, 
        color: tiresStatus === 'PASS' ? 'text-green-600' : 
               tiresStatus === 'FAIL' || tiresStatus === '⚠️ DEFECT' ? 'text-red-600' : 
               'text-yellow-600'
      },
      { 
        label: 'Battery', 
        status: batteryStatus, 
        icon: CheckCircle, 
        color: batteryStatus === 'PASS' ? 'text-green-600' : 
               batteryStatus === 'FAIL' || batteryStatus === '⚠️ DEFECT' ? 'text-red-600' : 
               'text-yellow-600'
      },
      { 
        label: 'Fuel Level', 
        status: `${fuelLevel}%`, 
        icon: Fuel, 
        color: 'text-blue-600' 
      },
      { 
        label: 'Engine Temp', 
        status: engineTemp, 
        icon: Thermometer, 
        color: engineTemp === 'Normal' ? 'text-green-600' : 'text-red-600'
      },
    ];
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const calculateFuelLevel = (vehicleData) => {
  // ✅ FIX: Use currentFuelLevel and fuelTankCapacity first
  if (vehicleData.currentFuelLevel !== undefined && vehicleData.currentFuelLevel !== null) {
    if (vehicleData.fuelTankCapacity && vehicleData.fuelTankCapacity > 0) {
      return Math.round((vehicleData.currentFuelLevel / vehicleData.fuelTankCapacity) * 100);
    }
    // If no tank capacity, assume 80L default
    return Math.round((vehicleData.currentFuelLevel / 80) * 100);
  }
  
  // Fallback to direct fuelLevel fields
  if (vehicleData.fuelLevel !== undefined && vehicleData.fuelLevel !== null) {
    return vehicleData.fuelLevel;
  }
  if (vehicleData.fuel_level !== undefined && vehicleData.fuel_level !== null) {
    return vehicleData.fuel_level;
  }
    const mileage = parseFloat(vehicleData.mileage) || 0;
    if (mileage > 50000) return 45;
    if (mileage > 30000) return 60;
    if (mileage > 10000) return 75;
    return 85;
  };

  const calculateNextService = (vehicleData) => {
    const mileage = parseFloat(vehicleData.mileage) || 0;
    if (mileage === 0) return 'Not recorded';
    const serviceInterval = 10000;
    const nextServiceKm = Math.ceil(mileage / serviceInterval) * serviceInterval;
    const remainingKm = nextServiceKm - mileage;
    return `${remainingKm.toLocaleString()} km`;
  };

  const getStatusBadge = (status) => {
    if (status === 'PASS' || status === 'Normal') return 'bg-green-100 text-green-700';
    if (status === 'FAIL' || status === '⚠️ DEFECT') return 'bg-red-100 text-red-700';
    if (status === 'PENDING') return 'bg-yellow-100 text-yellow-700';
    if (status === 'Service Soon') return 'bg-yellow-100 text-yellow-700';
    if (status === 'Critical') return 'bg-red-100 text-red-700';
    if (status === 'Warning') return 'bg-yellow-100 text-yellow-700';
    if (status === 'Not recorded') return 'bg-gray-100 text-gray-500';
    return 'bg-gray-100 text-gray-700';
  };

  const formatDate = (date) => {
    if (!date || date === 'Not recorded') return 'Not recorded';
    try {
      return new Date(date).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  };

  const formatValue = (value) => {
    if (!value || value === '' || value === 'N/A') return 'Not recorded';
    return value;
  };

  const loadVehicleData = async () => {
  setLoading(true);
  setErrorMessage('');
  setSuccessMessage('');

  if (!currentUser) {
    setErrorMessage('Please login to view your vehicle');
    setLoading(false);
    return;
  }

  try {
    const tenantId = currentUser.tenantId;
    
    // 1. Get driver profile first
    let driver = null;
    if (currentUser.driverId) {
      try {
        const driverRes = await driverService.getById(currentUser.driverId);
        if (driverRes?.success && driverRes?.data) {
          driver = driverRes.data;
          console.log('✅ Driver found:', driver);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch driver:', error.message);
      }
    }

    if (!driver) {
      setErrorMessage('Driver profile not found. Please contact your fleet manager.');
      setLoading(false);
      return;
    }

    setDriverInfo({
      name: driver.name || 'Not recorded',
      email: driver.email || 'Not recorded',
      phone: driver.phone || 'Not recorded',
      driverId: driver.driverId || driver.driver_id || 'Not recorded',
      licenseNumber: driver.licenseNumber || driver.license_number || 'Not recorded',
      licenseExpiry: driver.licenseExpiry || driver.license_expiry || 'Not recorded',
      safetyScore: driver.safetyScore || driver.safety_score || 0,
      totalTrips: 0,
      totalDistance: '0 km'
    });

    // 2. Get assigned vehicle
    const vehicleId = driver.assignedVehicleId || driver.assigned_vehicle || driver.vehicle_id;
    
    if (!vehicleId) {
      setErrorMessage('No vehicle assigned. Please contact your fleet manager.');
      setLoading(false);
      return;
    }

    let vehicleData = null;
    try {
      const vehicleRes = await vehicleService.getById(vehicleId);
      if (vehicleRes?.success && vehicleRes?.data) {
        vehicleData = vehicleRes.data;
        console.log('✅ Vehicle found:', vehicleData);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch vehicle:', error.message);
    }

    if (!vehicleData) {
      setErrorMessage('Vehicle not found. Please contact your fleet manager.');
      setLoading(false);
      return;
    }

    // 3. Get trips for this vehicle
    let totalTrips = 0;
    let totalDistance = 0;
    let avgFuelConsumption = 0;

    try {
      const tripsRes = await tripService.getAll(tenantId);
      if (tripsRes?.success && tripsRes?.data) {
        const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
        const vehicleTrips = allTrips.filter(t => 
          t.vehicleId === vehicleData.id || 
          t.vehicle_id === vehicleData.id
        );
        
        totalTrips = vehicleTrips.length;
        totalDistance = vehicleTrips.reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0);
        avgFuelConsumption = vehicleTrips.length > 0 
          ? (vehicleTrips.reduce((sum, t) => sum + (parseFloat(t.fuelUsed || t.fuel_used) || 0), 0) / vehicleTrips.length) 
          : 0;
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch trips:', error.message);
    }

    setTripStats({
      totalTrips,
      totalDistance: totalDistance.toFixed(1),
      avgFuelConsumption: avgFuelConsumption.toFixed(1)
    });

    // 4. Get fuel history
    try {
      const fuelRes = await fuelService?.getByVehicle?.(vehicleData.id);
      if (fuelRes?.success && fuelRes?.data) {
        const fuelData = Array.isArray(fuelRes.data) ? fuelRes.data : [fuelRes.data];
        setFuelHistory(fuelData.slice(-5).reverse());
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch fuel history:', error.message);
    }

    // 5. Get maintenance history and derive last service
    let maintenanceData = [];
    let lastServiceDate = 'Not recorded';
    let lastServiceType = 'Not recorded';
    let lastServiceDescription = 'Not recorded';

    try {
      const maintenanceRes = await maintenanceService?.getByVehicle?.(vehicleData.id);
      if (maintenanceRes?.success && maintenanceRes?.data) {
        maintenanceData = Array.isArray(maintenanceRes.data) ? maintenanceRes.data : [maintenanceRes.data];
        setMaintenanceHistory(maintenanceData.slice(-5).reverse());
        
        const completedJobs = maintenanceData.filter(j => 
          j.status === 'closed' || j.status === 'completed' || j.status === 'Completed'
        );
        
        if (completedJobs.length > 0) {
          const sortedJobs = completedJobs.sort((a, b) => {
            const dateA = new Date(a.completedDate || a.completed_date || a.scheduledDate || a.scheduled_date);
            const dateB = new Date(b.completedDate || b.completed_date || b.scheduledDate || b.scheduled_date);
            return dateB - dateA;
          });
          
          const lastJob = sortedJobs[0];
          const rawDate = lastJob.completedDate || lastJob.completed_date || 
                          lastJob.scheduledDate || lastJob.scheduled_date;
          
          if (rawDate) {
            lastServiceDate = new Date(rawDate).toLocaleDateString('en-ZA', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
          }
          lastServiceType = lastJob.type || 'Not recorded';
          lastServiceDescription = lastJob.description || 'Not recorded';
          
          console.log('✅ Last service found from maintenance:', lastServiceDate, '-', lastServiceType);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch maintenance history:', error.message);
    }

    // 6. Get checklist history for this vehicle
    // 6. Get checklist history for this vehicle
let checklistData = [];
try {
  const checklistRes = await checklistService.getHistory(vehicleData.id, tenantId);
  if (checklistRes?.success && checklistRes?.data) {
    checklistData = Array.isArray(checklistRes.data) ? checklistRes.data : [checklistRes.data];
    setChecklistHistory(checklistData.slice(0, 5));
    if (checklistData.length > 0) {
      const latest = checklistData[0];
      setLatestChecklist(latest);
      
      // ✅ Extract and set full checklist items
      if (latest && latest.items) {
        try {
          const items = typeof latest.items === 'string' ? JSON.parse(latest.items) : latest.items;
          // Ensure all items have a category
          const defaultCategories = {
            'Tire Pressure & Condition': 'Tires',
            'Engine Oil Level': 'Engine',
            'Coolant Level': 'Engine',
            'Brake Fluid': 'Brakes',
            'Headlights & Signals': 'Lights',
            'Windscreen & Wipers': 'Exterior',
            'Emergency Kit': 'Safety',
            'Driver ID Tag': 'Driver',
            'Fuel Level': 'Fuel',
            'Brake Performance': 'Brakes',
          };
          const itemsWithCategories = items.map(item => ({
            ...item,
            category: item.category || defaultCategories[item.label] || 'Other'
          }));
          setChecklistItems(itemsWithCategories);
        } catch (e) {
          console.warn('Could not parse checklist items:', e);
          setChecklistItems([]);
        }
      }
    }
    console.log('✅ Checklist history found:', checklistData.length);
  }
} catch (error) {
  console.warn('⚠️ Could not fetch checklist history:', error.message);
}
    // ============================================
    // 7. GET COMPLIANCE ITEMS FOR THIS VEHICLE
    // ============================================
    let complianceData = [];
    let alerts = [];
    
    // ✅ Initialize compliance dates from vehicle data as fallback
    let insuranceDate = vehicleData.insurance || 'Not recorded';
    let roadworthyDate = vehicleData.roadworthy || vehicleData.roadworthy_date || 'Not recorded';
    let licenseExpiryDate = vehicleData.licenseExpiry || vehicleData.license_expiry || 'Not recorded';
    
    try {
      const complianceRes = await complianceService.getByVehicle(vehicleData.id);
      if (complianceRes?.success && complianceRes?.data) {
        complianceData = Array.isArray(complianceRes.data) ? complianceRes.data : [complianceRes.data];
        setComplianceItems(complianceData);
        
        // ✅ Extract compliance dates from compliance items
        complianceData.forEach(item => {
          const type = item.type;
          const validUntil = item.validUntil || item.valid_until;
          
          if (type === 'insurance' || type === 'Insurance') {
            insuranceDate = validUntil || insuranceDate;
          } else if (type === 'roadworthy' || type === 'Roadworthy') {
            roadworthyDate = validUntil || roadworthyDate;
          } else if (type === 'license_disc' || type === 'License Disc') {
            licenseExpiryDate = validUntil || licenseExpiryDate;
          }
        });
        
        // ✅ Generate alerts
        const today = new Date();
        const thirtyDaysLater = new Date(today);
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        
        complianceData.forEach(item => {
          const validUntil = new Date(item.validUntil || item.valid_until);
          
          if (validUntil < today) {
            alerts.push({
              type: item.type,
              label: getComplianceTypeLabel(item.type),
              status: 'expired',
              message: `Your ${getComplianceTypeLabel(item.type)} has EXPIRED!`,
              validUntil: item.validUntil || item.valid_until
            });
          } else if (validUntil < thirtyDaysLater) {
            alerts.push({
              type: item.type,
              label: getComplianceTypeLabel(item.type),
              status: 'expiring_soon',
              message: `Your ${getComplianceTypeLabel(item.type)} expires in ${Math.ceil((validUntil - today) / (1000 * 60 * 60 * 24))} days`,
              validUntil: item.validUntil || item.valid_until
            });
          }
        });
        
        setComplianceAlerts(alerts);
        
        if (alerts.length > 0 && !getAlertSent()) {
          await notifyFleetOwner(alerts, vehicleData, driver);
          setAlertSent(true);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch compliance data:', error.message);
    }

    // ✅ Format compliance dates if they exist
    const formatComplianceDate = (date) => {
      if (!date || date === 'Not recorded') return 'Not recorded';
      try {
        return new Date(date).toLocaleDateString('en-ZA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } catch {
        return date;
      }
    };

    // ============================================
    // ✅ 8. GET OVERRIDDEN RETURNS (Manager Approved)
    // ============================================
    try {
      const overriddenRes = await geofenceService.getOverriddenReturns(tenantId);
      if (overriddenRes?.success && overriddenRes?.data) {
        // Filter for this vehicle only
        const vehicleOverrides = overriddenRes.data.filter(v => 
          v.vehicleId === vehicleData.id || v.vehicle_id === vehicleData.id
        );
        setOverriddenReturns(vehicleOverrides);
        console.log('✅ Overridden returns found:', vehicleOverrides.length);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch overridden returns:', error.message);
      setOverriddenReturns([]);
    }

    // 9. Get fuel level
    const fuelLevel = calculateFuelLevel(vehicleData);

    // 10. Calculate next service
    const nextService = calculateNextService(vehicleData);

    // 11. Build vehicle object with all data
    setVehicle({
      id: vehicleData.id || 'Not recorded',
      reg: vehicleData.registration || vehicleData.reg || 'Not recorded',
      make: vehicleData.make || 'Not recorded',
      model: vehicleData.model || 'Not recorded',
      year: vehicleData.year || 'Not recorded',
      color: vehicleData.color || 'Not recorded',
      vin: vehicleData.vin || 'Not recorded',
      mileage: vehicleData.mileage ? `${parseFloat(vehicleData.mileage).toLocaleString()} km` : 'Not recorded',
      mileage_raw: parseFloat(vehicleData.mileage) || 0,
      fuelLevel: fuelLevel,
      engineTemp: vehicleData.engineTemp || vehicleData.engine_temp || 'Not recorded',
      tirePressure: vehicleData.tirePressure || vehicleData.tire_pressure || 'Not recorded',
      batteryVoltage: vehicleData.batteryVoltage || vehicleData.battery_voltage || 'Not recorded',
      nextService: nextService,
      lastService: lastServiceDate,
      lastServiceType: lastServiceType,
      lastServiceDescription: lastServiceDescription,
      // ✅ Use compliance dates (or fallback to vehicle data)
      insurance: formatComplianceDate(insuranceDate),
      roadworthy: formatComplianceDate(roadworthyDate),
      licenseExpiry: formatComplianceDate(licenseExpiryDate),
      status: vehicleData.status || 'Not recorded',
      driver: driver.name || 'Not recorded',
      category: vehicleData.category || 'Not recorded',
      owner: vehicleData.owner || 'Not recorded',
      location: vehicleData.location || 'Not recorded',
      custodian: vehicleData.custodian || 'Not recorded',
      costCentre: vehicleData.costCentre || vehicleData.cost_centre || 'Not recorded',
      fuelType: vehicleData.fuelType || vehicleData.fuel_type || 'Not recorded',
      transmission: vehicleData.transmission || 'Not recorded',
      engineSize: vehicleData.engineSize || vehicleData.engine_size || 'Not recorded',
      acquisitionDate: vehicleData.acquisitionDate || vehicleData.acquisition_date || 'Not recorded',
      acquisitionCost: vehicleData.acquisitionCost || vehicleData.acquisition_cost || 'Not recorded',
      accessories: parseAccessories(vehicleData.accessories),
      documents: Array.isArray(vehicleData.documents) ? vehicleData.documents : [],
      created_at: vehicleData.createdAt || vehicleData.created_at || 'Not recorded',
      updated_at: vehicleData.updatedAt || vehicleData.updated_at || 'Not recorded'
    });

    // 11. Build status items from latest checklist
    const items = buildStatusItems(fuelLevel, latestChecklist);
    setStatusItems(items);
    
    setSuccessMessage(`Vehicle ${vehicleData.registration || vehicleData.reg || 'details'} loaded successfully!`);
    setTimeout(() => setSuccessMessage(''), 3000);

  } catch (error) {
    console.error('❌ Error loading vehicle data:', error);
    setErrorMessage('Failed to load vehicle data. Please try again.');
  } finally {
    setLoading(false);
  }
};

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadVehicleData();
    }
    // DO NOT reset alert sent flag here - this was causing duplicates
  }, [currentUser?.id]);

  // ============================================
  // RENDER: NO VEHICLE ASSIGNED
  // ============================================
  if (!loading && !vehicle) {
    return (
      <div className="space-y-4">
        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle size={16} /> {successMessage}
          </div>
        )}
        
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center p-8 max-w-md">
            <div className="w-24 h-24 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-4">
              <Truck size={48} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Vehicle Assigned</h3>
            <p className="text-gray-500">
              You don't have a vehicle assigned to you yet. 
              Please contact your fleet manager to assign a vehicle.
            </p>
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertTriangle size={16} />
                <p className="text-sm">Contact: Fleet Manager</p>
              </div>
            </div>
            <button
              onClick={loadVehicleData}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: LOADING
  // ============================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading vehicle details...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: VEHICLE DETAILS
  // ============================================
  return (
    <div className="space-y-6">
      {/* Alert Messages */}
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

      {/* ============================================ */}
      {/* COMPLIANCE ALERTS */}
      {/* ============================================ */}
      {complianceAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Bell size={20} className="text-red-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">⚠️ Compliance Alerts</p>
              <p className="text-xs text-red-600 mb-2">
                {complianceAlerts.length} compliance issue(s) require your attention
              </p>
              <div className="space-y-1">
                {complianceAlerts.map((alert, index) => (
                  <div key={index} className={`flex items-center gap-2 text-xs p-2 rounded-lg ${
                    alert.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {alert.status === 'expired' ? (
                      <XCircle size={14} className="text-red-600" />
                    ) : (
                      <AlertCircle size={14} className="text-orange-600" />
                    )}
                    <span className="font-medium">{alert.message}</span>
                    {alert.validUntil && (
                      <span className="text-gray-500 ml-auto">
                        {alert.status === 'expired' ? 'Expired' : `Expires: ${formatDate(alert.validUntil)}`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ✅ Fleet owner has been notified. Please contact your fleet manager to resolve these issues.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={loadVehicleData}
          className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Vehicle Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Car size={40} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{vehicle.reg}</h2>
              <p className="text-green-100">{vehicle.make} {vehicle.model} ({vehicle.year})</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{vehicle.status}</span>
                <span className="text-xs text-green-200">{vehicle.color}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{vehicle.category}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{vehicle.fuelType}</span>
                {complianceAlerts.length > 0 && (
                  <span className="text-xs bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
                    ⚠️ {complianceAlerts.length} Compliance Issues
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-green-200">Assigned Driver</p>
            <p className="font-semibold">{vehicle.driver}</p>
            <button className="mt-1 text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors">
              <Radio size={12} className="inline mr-1" /> Immobilizer
            </button>
          </div>
        </div>
      </div>

      {/* Vehicle Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Gauge size={20} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Odometer</p>
              <p className="text-lg font-bold">{vehicle.mileage}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Fuel size={20} className="text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500">Fuel Level</p>
              <p className="text-lg font-bold">{vehicle.fuelLevel}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Wrench size={20} className="text-orange-600" />
            <div>
              <p className="text-xs text-gray-500">Next Service</p>
              <p className="text-lg font-bold text-yellow-600">{vehicle.nextService}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Award size={20} className="text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Total Trips</p>
              <p className="text-lg font-bold">{tripStats.totalTrips}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trip Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Activity size={20} className="text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Distance</p>
              <p className="text-lg font-bold">{tripStats.totalDistance} km</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Fuel size={20} className="text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Avg Fuel Consumption</p>
              <p className="text-lg font-bold">{tripStats.avgFuelConsumption} L/100km</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3">
            <Clock size={20} className="text-orange-600" />
            <div>
              <p className="text-xs text-gray-500">Driver Score</p>
              <p className="text-lg font-bold text-green-600">{driverInfo?.safetyScore || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
{/* FULL CHECKLIST DISPLAY - IMPROVED STYLING */}
{/* ============================================ */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-semibold text-lg flex items-center gap-2">
      <ClipboardCheck size={20} className="text-purple-600" />
      Vehicle Inspection Status
    </h3>
    {latestChecklist && (
      <span className="text-xs text-gray-400 flex items-center gap-1">
        <Calendar size={12} />
        Based on inspection: {formatDate(latestChecklist.createdAt || latestChecklist.created_at)}
      </span>
    )}
  </div>
  
  {checklistItems.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {checklistItems.map((item, idx) => {
        const statusColors = {
          'pass': 'bg-green-100 text-green-700 border-green-200',
          'fail': 'bg-red-100 text-red-700 border-red-200',
          'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
        };
        const statusBadges = {
          'pass': '✅ Pass',
          'fail': '❌ Fail',
          'pending': '⏳ Pending',
        };
        const statusColor = statusColors[item.status] || statusColors['pending'];
        const isDefect = item.defect === true;
        
        // Get category icon
        const getCategoryIcon = (category) => {
          const icons = {
            'Tires': <Car size={14} className="text-blue-600" />,
            'Engine': <Wrench size={14} className="text-orange-600" />,
            'Brakes': <AlertCircle size={14} className="text-red-600" />,
            'Lights': <Lightbulb size={14} className="text-yellow-600" />,
            'Exterior': <Car size={14} className="text-green-600" />,
            'Safety': <AlertTriangle size={14} className="text-red-600" />,
            'Driver': <ClipboardCheck size={14} className="text-purple-600" />,
            'Fuel': <Fuel size={14} className="text-yellow-600" />,
          };
          return icons[category] || <ClipboardCheck size={14} className="text-gray-500" />;
        };
        
        return (
          <div 
            key={idx} 
            className={`flex items-center justify-between p-3 rounded-lg border ${
              isDefect ? 'border-orange-300 bg-orange-50' :
              item.status === 'pass' ? 'border-green-200 bg-green-50/60' :
              item.status === 'fail' ? 'border-red-200 bg-red-50/60' :
              'border-yellow-200 bg-yellow-50/60'
            } hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex-shrink-0 p-1.5 bg-white rounded-full shadow-sm">
                {getCategoryIcon(item.category)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate" title={item.label}>
                  {item.label}
                </p>
                {item.category && (
                  <span className="text-[10px] text-gray-400">{item.category}</span>
                )}
                {isDefect && (
                  <span className="ml-1 text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">
                    ⚠️ Defect
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              {item.note && (
                <span className="text-xs text-gray-400 max-w-[60px] truncate hidden sm:block" title={item.note}>
                  {item.note}
                </span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>
                {statusBadges[item.status] || '⏳ Pending'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div className="text-center py-8 text-gray-500">
      <ClipboardCheck size={40} className="mx-auto text-gray-300 mb-3" />
      <p className="text-sm">No inspection records found</p>
      <p className="text-xs">Complete an inspection in the Checklist tab</p>
    </div>
  )}
  
  {/* Summary Stats */}
  {checklistItems.length > 0 && (
    <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4 text-xs">
      <span className="text-gray-500">Summary:</span>
      <span className="text-green-600">✅ {checklistItems.filter(i => i.status === 'pass').length} Passed</span>
      <span className="text-red-600">❌ {checklistItems.filter(i => i.status === 'fail').length} Failed</span>
      <span className="text-yellow-600">⏳ {checklistItems.filter(i => i.status === 'pending').length} Pending</span>
      <span className="text-orange-600">⚠️ {checklistItems.filter(i => i.defect).length} Defects</span>
      <span className="text-blue-600 ml-auto font-medium">
        {Math.round((checklistItems.filter(i => i.status === 'pass').length / checklistItems.length) * 100)}% Complete
      </span>
    </div>
  )}
</div>

      {/* ============================================ */}
{/* ✅ APPROVED RETURNS SECTION */}
{/* ============================================ */}
{overriddenReturns.length > 0 && (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 bg-blue-50/30">
    <div className="flex items-center justify-between mb-4">
      <h3 className="font-semibold text-lg flex items-center gap-2 text-blue-700">
        <ArrowLeft size={20} className="text-blue-600" />
        Approved Returns
      </h3>
      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
        {overriddenReturns.length} manager-approved
      </span>
    </div>
    <div className="space-y-3">
      {overriddenReturns.map((item, index) => (
        <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <ArrowLeft size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{item.geofenceName || 'Return Trip'}</p>
              <p className="text-xs text-gray-500">
                {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              ✅ Approved
            </span>
            {item.reason && (
              <p className="text-[10px] text-gray-400 mt-0.5">{item.reason}</p>
            )}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded-lg border border-blue-100">
      ✅ These returns were approved by management and will not affect your safety score.
    </div>
  </div>
)}

      {/* Recent Checklists */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <ClipboardCheck size={16} className="text-purple-600" />
          Recent Inspections
          <span className="text-xs text-gray-400 ml-2">
            ({checklistHistory.length} records)
          </span>
        </h4>
        {checklistHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Passed/Failed</th>
                  <th className="p-2">Defects</th>
                  <th className="p-2">Completion</th>
                </tr>
              </thead>
              <tbody>
                {checklistHistory.map((checklist, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 text-sm">
                      {formatDate(checklist.inspectionDate || checklist.createdAt || checklist.created_at)}
                    </td>
                    <td className="p-2 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        checklist.status === 'completed' || checklist.status === 'submitted' ? 'bg-green-100 text-green-700' :
                        checklist.status === 'failed' ? 'bg-red-100 text-red-700' :
                        checklist.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {checklist.status || 'Not recorded'}
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      {checklist.passedItems || checklist.passed_items || 0} / {checklist.totalItems || checklist.total_items || 0}
                    </td>
                    <td className="p-2 text-sm">
                      <span className={checklist.defects && checklist.defects > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {checklist.defects || 0}
                      </span>
                    </td>
                    <td className="p-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              (checklist.completionRate || checklist.completion_rate || 0) >= 80 ? 'bg-green-500' :
                              (checklist.completionRate || checklist.completion_rate || 0) >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${checklist.completionRate || checklist.completion_rate || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium">
                          {checklist.completionRate || checklist.completion_rate || 0}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No inspection records found for this vehicle. Complete your first inspection in the Checklist tab.</p>
        )}
      </div>

      {/* Vehicle Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Car size={16} className="text-blue-600" />
            Vehicle Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Registration</span>
              <span className="text-sm font-medium">{formatValue(vehicle.reg)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">VIN</span>
              <span className="text-sm font-medium">{formatValue(vehicle.vin)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Make/Model</span>
              <span className="text-sm font-medium">{formatValue(vehicle.make)} {formatValue(vehicle.model)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Year</span>
              <span className="text-sm font-medium">{formatValue(vehicle.year)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Color</span>
              <span className="text-sm font-medium">{formatValue(vehicle.color)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Category</span>
              <span className="text-sm font-medium">{formatValue(vehicle.category)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Fuel Type</span>
              <span className="text-sm font-medium">{formatValue(vehicle.fuelType)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Transmission</span>
              <span className="text-sm font-medium">{formatValue(vehicle.transmission)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Engine</span>
              <span className="text-sm font-medium">{formatValue(vehicle.engineSize)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Location</span>
              <span className="text-sm font-medium">{formatValue(vehicle.location)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Custodian</span>
              <span className="text-sm font-medium">{formatValue(vehicle.custodian)}</span>
            </div>
          </div>
        </div>

        {/* Driver Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <User size={16} className="text-green-600" />
            Driver Information
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Driver Name</span>
              <span className="text-sm font-medium">{formatValue(driverInfo?.name)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Driver ID</span>
              <span className="text-sm font-medium">{formatValue(driverInfo?.driverId)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium">{formatValue(driverInfo?.email)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Phone</span>
              <span className="text-sm font-medium">{formatValue(driverInfo?.phone)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">License Number</span>
              <span className="text-sm font-medium">{formatValue(driverInfo?.licenseNumber)}</span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">License Expiry</span>
              <span className={`text-sm font-medium ${driverInfo?.licenseExpiry && driverInfo.licenseExpiry !== 'Not recorded' && driverInfo.licenseExpiry < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-green-600'}`}>
                {formatValue(driverInfo?.licenseExpiry)}
              </span>
            </div>
            <div className="flex justify-between p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-500">Safety Score</span>
              <span className="text-sm font-medium text-green-600">{driverInfo?.safetyScore || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Documents & Compliance */}
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
    <Shield size={16} className="text-green-600" />
    Documents & Compliance
  </h4>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <div className="flex justify-between p-2 bg-gray-50 rounded">
        <span className="text-sm text-gray-500">Insurance</span>
        <span className="text-sm font-medium text-green-600">{formatValue(vehicle.insurance)}</span>
      </div>
      <div className="flex justify-between p-2 bg-gray-50 rounded">
        <span className="text-sm text-gray-500">Roadworthy</span>
        <span className={`text-sm font-medium ${vehicle.roadworthy && vehicle.roadworthy !== 'Not recorded' && vehicle.roadworthy < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-green-600'}`}>
          {formatValue(vehicle.roadworthy)}
        </span>
      </div>
      <div className="flex justify-between p-2 bg-gray-50 rounded">
        <span className="text-sm text-gray-500">License Disc</span>
        <span className={`text-sm font-medium ${vehicle.licenseExpiry && vehicle.licenseExpiry !== 'Not recorded' && vehicle.licenseExpiry < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-green-600'}`}>
          {formatValue(vehicle.licenseExpiry)}
        </span>
      </div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between p-2 bg-gray-50 rounded">
        <span className="text-sm text-gray-500">Last Service</span>
        <div className="text-right">
          <span className="text-sm font-medium">{formatValue(vehicle.lastService)}</span>
          {vehicle.lastServiceType && vehicle.lastServiceType !== 'Not recorded' && (
            <span className="text-xs text-gray-400 block">{vehicle.lastServiceType}</span>
          )}
        </div>
      </div>
      {vehicle.lastServiceDescription && vehicle.lastServiceDescription !== 'Not recorded' && (
        <div className="flex justify-between p-2 bg-blue-50 rounded border border-blue-100">
          <span className="text-sm text-gray-500">Service Notes</span>
          <span className="text-sm font-medium text-gray-600 text-right max-w-[180px] truncate">
            {vehicle.lastServiceDescription}
          </span>
        </div>
      )}
      <div className="flex justify-between p-2 bg-gray-50 rounded">
        <span className="text-sm text-gray-500">Next Service</span>
        <span className="text-sm font-medium text-yellow-600">{vehicle.nextService}</span>
      </div>
      <div className="flex justify-between p-2 bg-gray-50 rounded">
        <span className="text-sm text-gray-500">Acquired</span>
        <span className="text-sm font-medium">{formatValue(vehicle.acquisitionDate)}</span>
      </div>
    </div>
  </div>
</div>

      {/* ✅ UPDATED ACCESSORIES SECTION */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Package size={16} className="text-purple-600" />
          Accessories
        </h4>
        {vehicle.accessories && Array.isArray(vehicle.accessories) && vehicle.accessories.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {vehicle.accessories.map((acc, index) => {
              // Handle if acc is an object with a name property
              const accessoryName = typeof acc === 'string' ? acc : acc.name || acc.label || JSON.stringify(acc);
              return (
                <span key={index} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Package size={12} className="text-gray-500" />
                  {accessoryName}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No accessories recorded for this vehicle</p>
        )}
      </div>

      {/* Recent Fuel History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Fuel size={16} className="text-yellow-600" />
          Recent Fuel Refills
        </h4>
        {fuelHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Litres</th>
                  <th className="p-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {fuelHistory.map((refill, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="p-2 text-sm">{formatDate(refill.dateTime || refill.date || refill.createdAt)}</td>
                    <td className="p-2 text-sm">{refill.litres || refill.amount || 'Not recorded'}</td>
                    <td className="p-2 text-sm">KSH {refill.cost || refill.totalCost || 'Not recorded'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No fuel refill records found</p>
        )}
      </div>

      {/* Recent Maintenance History */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Wrench size={16} className="text-orange-600" />
          Recent Maintenance
        </h4>
        {maintenanceHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceHistory.map((record, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="p-2 text-sm">{formatDate(record.scheduledDate || record.date || record.createdAt)}</td>
                    <td className="p-2 text-sm">{record.type || record.maintenanceType || 'Not recorded'}</td>
                    <td className="p-2 text-sm">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        record.status === 'Completed' || record.status === 'completed' ? 'bg-green-100 text-green-700' : 
                        record.status === 'In Progress' || record.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {record.status || 'Not recorded'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No maintenance records found</p>
        )}
      </div>
    </div>
  );
};

export default MyVehicle;