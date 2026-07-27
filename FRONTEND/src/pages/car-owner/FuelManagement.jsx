// src/pages/car-owner/FuelManagement.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, AlertCircle, AlertTriangle,
  Fuel, BarChart3,
  Download, Filter, Search,
  MapPin, Star, CheckCircle, X, Save, Edit, Trash2,
  User, RefreshCw, Camera, Image as ImageIcon, Eye,
  TrendingUp, TrendingDown, Clock, Calendar,
  Zap, Shield, Award, Settings, Link,
  DollarSign, Gauge
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  fuelService, 
  vehicleService, 
  driverService,
  tripService,
  trackingService
} from '../../services/api';

const FuelManagement = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('this_month');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedRefill, setSelectedRefill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [refills, setRefills] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptView, setReceiptView] = useState(null);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  
  // ============================================
  // FUEL SUMMARY STATS
  // ============================================
  const [fuelSummary, setFuelSummary] = useState({
    totalFuelUsed: 0,
    totalCost: 0,
    avgEfficiency: 0,
    totalDistance: 0,
    projectedCost: 0,
    savings: 0,
    efficiencyTrend: 'stable'
  });

  // ============================================
  // FORM DATA
  // ============================================
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    date_time: new Date().toISOString().slice(0, 16),
    station: '',
    litres: '',
    cost: '',
    odometer: '',
    efficiency: '',
    status: 'normal',
    notes: '',
    receipt_image: null,
    trip_id: null,
    is_auto_calculated: false
  });

  const [editFormData, setEditFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    date_time: new Date().toISOString().slice(0, 16),
    station: '',
    litres: '',
    cost: '',
    odometer: '',
    efficiency: '',
    status: 'normal',
    notes: '',
    receipt_image: null,
    trip_id: null,
    is_auto_calculated: false
  });

  // ============================================
  // FUEL SYNC HELPERS - Vehicle ↔ Fuel Refills
  // ============================================

  // Get previous refill for a vehicle
  const getPreviousRefill = async (vehicleId, currentRefillId = null) => {
    try {
      const response = await fuelService.getByVehicle(vehicleId);
      if (response?.success && response?.data) {
        const refillsData = Array.isArray(response.data) ? response.data : [response.data];
        
        // Filter out the current refill if editing
        const filtered = currentRefillId 
          ? refillsData.filter(r => r.id !== currentRefillId)
          : refillsData;
        
        // Sort by date descending, get the most recent
        const sorted = filtered.sort((a, b) => {
          const dateA = new Date(a.dateTime || a.date_time || 0);
          const dateB = new Date(b.dateTime || b.date_time || 0);
          return dateB - dateA;
        });
        
        return sorted.length > 0 ? sorted[0] : null;
      }
      return null;
    } catch (error) {
      console.warn('Could not fetch previous refill:', error);
      return null;
    }
  };

  // Check if efficiency is abnormal
  const isEfficiencyAbnormal = (efficiency, vehicle) => {
    if (!efficiency || efficiency <= 0) return { isAnomaly: false };
    
    // Calculate average efficiency from vehicle's refill history
    let avgEfficiency = 8.5; // Default fallback
    
    // Try to get from vehicle's fuelEfficiency or calculate from refills
    if (vehicle?.fuelEfficiency) {
      avgEfficiency = parseFloat(vehicle.fuelEfficiency) || 8.5;
    }
    
    // If efficiency is > 50% worse than average, flag as anomaly
    if (efficiency > avgEfficiency * 1.5) {
      return { 
        isAnomaly: true, 
        reason: `Efficiency is ${Math.round((efficiency / avgEfficiency - 1) * 100)}% worse than average (${avgEfficiency.toFixed(1)} L/100km)`,
        severity: 'high'
      };
    }
    
    // If efficiency is > 30% worse than average, flag as warning
    if (efficiency > avgEfficiency * 1.3) {
      return { 
        isAnomaly: true, 
        reason: `Efficiency is ${Math.round((efficiency / avgEfficiency - 1) * 100)}% worse than average (${avgEfficiency.toFixed(1)} L/100km)`,
        severity: 'medium'
      };
    }
    
    return { isAnomaly: false };
  };

  // ============================================
  // AUTO-FILL ODOMETER AND EFFICIENCY
  // ============================================
  useEffect(() => {
    if (formData.vehicle_id && !showEditModal) {
      const selectedVehicle = vehicles.find(v => v.id === formData.vehicle_id);
      if (selectedVehicle) {
        if (selectedVehicle.mileage && !formData.odometer) {
          setFormData(prev => ({
            ...prev,
            odometer: selectedVehicle.mileage.toString()
          }));
        }
        if (selectedVehicle.fuelEfficiency && !formData.efficiency) {
          setFormData(prev => ({
            ...prev,
            efficiency: selectedVehicle.fuelEfficiency.toString()
          }));
        }
      }
    }
  }, [formData.vehicle_id, vehicles, showEditModal]);

  useEffect(() => {
    if (editFormData.vehicle_id && showEditModal) {
      const selectedVehicle = vehicles.find(v => v.id === editFormData.vehicle_id);
      if (selectedVehicle) {
        if (selectedVehicle.mileage && !editFormData.odometer) {
          setEditFormData(prev => ({
            ...prev,
            odometer: selectedVehicle.mileage.toString()
          }));
        }
        if (selectedVehicle.fuelEfficiency && !editFormData.efficiency) {
          setEditFormData(prev => ({
            ...prev,
            efficiency: selectedVehicle.fuelEfficiency.toString()
          }));
        }
      }
    }
  }, [editFormData.vehicle_id, vehicles, showEditModal]);

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view fuel management');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      const refillsRes = await fuelService.getAll(tenant);
      if (refillsRes?.success && refillsRes?.data) {
        const refillsData = Array.isArray(refillsRes.data) ? refillsRes.data : [refillsRes.data];
        // ✅ Filter out auto-calculated refills
        const manualRefills = refillsData.filter(r => !r.is_auto_calculated);
        setRefills(manualRefills);
        console.log('✅ Loaded manual refills:', manualRefills.length);
      } else {
        setRefills([]);
      }

      const vehiclesRes = await vehicleService.getAll(tenant);
      if (vehiclesRes?.success && vehiclesRes?.data) {
        const vehiclesData = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [vehiclesRes.data];
        setVehicles(vehiclesData);
      }

      const driversRes = await driverService.getAll(tenant);
      if (driversRes?.success && driversRes?.data) {
        const driversData = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
        setDrivers(driversData);
      }

      const tripsRes = await tripService.getAll(tenant);
      if (tripsRes?.success && tripsRes?.data) {
        const tripsData = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
        setTrips(tripsData);
        console.log('📊 Trips loaded with statuses:', tripsData.map(t => ({ id: t.id, status: t.status })));
      }

      calculateFuelSummary(refillsRes?.data || [], tripsRes?.data || []);

    } catch (error) {
      console.error('Error loading fuel data:', error);
      setErrorMessage('Failed to load fuel data. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // ============================================
  // CALCULATE FUEL SUMMARY - Uses trips for fuel usage
  // ============================================
  const calculateFuelSummary = (refillsData, tripsData) => {
    // ✅ Only count manual refills for fuel purchased
    const manualRefills = refillsData.filter(r => !r.is_auto_calculated);
    const totalFuelPurchased = manualRefills.reduce((sum, r) => sum + (parseFloat(r.litres) || 0), 0);
    const totalCost = manualRefills.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0);
    
    // ✅ Calculate fuel USAGE from trips (not refills)
    // Only count completed trips with distance
    const completedTrips = tripsData.filter(t => {
      const status = t.status || '';
      const hasDistance = parseFloat(t.distance) > 0;
      const isCompleted = status === 'Completed' || 
                         status === 'completed' || 
                         status === 'COMPLETED' ||
                         status === 'Complete' ||
                         status.toLowerCase().includes('complete') ||
                         status.toLowerCase().includes('done') ||
                         status.toLowerCase().includes('finished');
      return hasDistance && isCompleted;
    });
    
    // Calculate fuel used from trips (based on distance and efficiency)
    let totalFuelUsed = 0;
    let totalDistance = 0;
    
    completedTrips.forEach(trip => {
      const distance = parseFloat(trip.distance) || 0;
      const efficiency = parseFloat(trip.efficiency) || 8.5; // Default if not provided
      const fuelUsed = (distance / 100) * efficiency;
      
      totalDistance += distance;
      totalFuelUsed += fuelUsed;
    });
    
    console.log('📊 Fuel Calculation:', {
      totalFuelPurchased,
      totalCost,
      totalFuelUsed,
      totalDistance,
      completedTrips: completedTrips.length,
      firstTripStatus: tripsData[0]?.status
    });

    const avgEfficiency = totalDistance > 0 
      ? (totalFuelUsed / totalDistance) * 100 
      : 0;

    const projectedCost = totalFuelPurchased > 0 ? (totalCost / totalFuelPurchased) * 500 : 0;
    const baselineEfficiency = 9.5;
    const savings = avgEfficiency > 0 && avgEfficiency < baselineEfficiency
      ? (baselineEfficiency - avgEfficiency) * totalDistance / 100 * 2.5
      : 0;

    setFuelSummary({
      totalFuelUsed: totalFuelUsed,        // ✅ Fuel USAGE from trips
      totalCost: totalCost,                // ✅ Cost from manual refills
      avgEfficiency: avgEfficiency,
      totalDistance: totalDistance,
      projectedCost: projectedCost,
      savings: savings,
      efficiencyTrend: avgEfficiency < 8 ? 'improving' : avgEfficiency < 9 ? 'stable' : 'declining'
    });
  };

  // ============================================
  // USE EFFECT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // ============================================
  // RECEIPT IMAGE HANDLERS
  // ============================================
  const handleFileChange = (e, isEdit = false) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      if (isEdit) {
        setEditFormData({ ...editFormData, receipt_image: base64String });
        setReceiptPreview(base64String);
      } else {
        setFormData({ ...formData, receipt_image: base64String });
        setReceiptPreview(base64String);
      }
      setSuccessMessage('Receipt image uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = (isEdit = false) => {
    if (isEdit) {
      setEditFormData({ ...editFormData, receipt_image: null });
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    } else {
      setFormData({ ...formData, receipt_image: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
    setReceiptPreview(null);
  };

  const viewReceipt = (refill) => {
    const image = refill.receiptImage || refill.receipt_image;
    if (image) {
      setReceiptView(image);
      setShowReceiptModal(true);
    }
  };

  const hasReceipt = (refill) => {
    return !!(refill.receiptImage || refill.receipt_image);
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'normal': 'bg-green-100 text-green-700',
      'high': 'bg-yellow-100 text-yellow-700',
      'anomaly': 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'normal': return <CheckCircle size={14} className="text-green-600" />;
      case 'high': return <AlertCircle size={14} className="text-yellow-600" />;
      case 'anomaly': return <AlertTriangle size={14} className="text-red-600" />;
      default: return null;
    }
  };

  const getVehicleLabel = (vehicleId) => {
    const vehicle = vehicles.find(v => v.id === vehicleId || v.registration === vehicleId || v.reg === vehicleId);
    return vehicle ? vehicle.registration || vehicle.reg || vehicle.id : vehicleId || 'Unknown';
  };

  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => String(d.id) === String(driverId));
    return driver ? driver.name : 'Unassigned';
  };

  const getEfficiencyRating = (efficiency) => {
    if (efficiency < 7) return { label: 'Excellent', color: 'bg-green-100 text-green-700', icon: <Award size={14} className="text-green-600" /> };
    if (efficiency < 8) return { label: 'Good', color: 'bg-blue-100 text-blue-700', icon: <CheckCircle size={14} className="text-blue-600" /> };
    if (efficiency < 9) return { label: 'Average', color: 'bg-yellow-100 text-yellow-700', icon: <AlertCircle size={14} className="text-yellow-600" /> };
    return { label: 'Poor', color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} className="text-red-600" /> };
  };

  // ============================================
  // STATISTICS - FIXED
  // ============================================
  const stats = {
    // ✅ Only count manual refills
    totalLitres: refills.reduce((sum, r) => sum + (parseFloat(r.litres) || 0), 0),
    totalCost: refills.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0),
    totalRefills: refills.length,
    avgEfficiency: refills.length > 0 
      ? refills.reduce((sum, r) => sum + (parseFloat(r.efficiency) || 0), 0) / refills.length 
      : 0,
    avgCostPerLitre: refills.length > 0 && refills.reduce((sum, r) => sum + (parseFloat(r.litres) || 0), 0) > 0
      ? refills.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0) / refills.reduce((sum, r) => sum + (parseFloat(r.litres) || 0), 0)
      : 0,
    anomalyCount: refills.filter(r => r.status === 'anomaly').length,
    highCount: refills.filter(r => r.status === 'high').length,
    normalCount: refills.filter(r => r.status === 'normal').length,
    totalReceipts: refills.filter(r => hasReceipt(r)).length,
    autoCalculated: 0, // ✅ We don't show auto-calculated refills anymore
    totalTrips: trips.length,
    completedTrips: trips.filter(t => {
      const status = t.status || '';
      const isCompleted = status === 'Completed' || 
                         status === 'completed' || 
                         status === 'COMPLETED' ||
                         status === 'Complete' ||
                         status.toLowerCase().includes('complete') ||
                         status.toLowerCase().includes('done') ||
                         status.toLowerCase().includes('finished') ||
                         parseFloat(t.distance) > 0;
      return isCompleted;
    }).length,
  };

  // ============================================
  // RESET FORMS
  // ============================================
  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      driver_id: '',
      date_time: new Date().toISOString().slice(0, 16),
      station: '',
      litres: '',
      cost: '',
      odometer: '',
      efficiency: '',
      status: 'normal',
      notes: '',
      receipt_image: null,
      trip_id: null,
      is_auto_calculated: false
    });
    setReceiptPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetEditForm = () => {
    setEditFormData({
      vehicle_id: '',
      driver_id: '',
      date_time: new Date().toISOString().slice(0, 16),
      station: '',
      litres: '',
      cost: '',
      odometer: '',
      efficiency: '',
      status: 'normal',
      notes: '',
      receipt_image: null,
      trip_id: null,
      is_auto_calculated: false
    });
    setReceiptPreview(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  // ============================================
  // UPDATED: handleAddRefill - WITH SYNC + EVENT DISPATCH
  // ============================================
  const handleAddRefill = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.vehicle_id || !formData.litres || !formData.cost) {
      setErrorMessage('Vehicle, litres, and cost are required');
      setIsLoading(false);
      return;
    }

    try {
      // ============================================
      // STEP 1: Get vehicle data
      // ============================================
      const vehicleResponse = await vehicleService.getById(formData.vehicle_id);
      const vehicle = vehicleResponse?.data;
      
      if (!vehicle) {
        setErrorMessage('Vehicle not found');
        setIsLoading(false);
        return;
      }

      // ============================================
      // STEP 2: Prepare refill data
      // ============================================
      const currentOdometer = parseFloat(formData.odometer) || 0;
      const vehicleMileage = parseFloat(vehicle.mileage) || 0;
      
      // If no odometer provided, use vehicle's current mileage
      const finalOdometer = currentOdometer > 0 ? currentOdometer : vehicleMileage;
      
      // ============================================
      // STEP 3: Get previous refill for efficiency calculation
      // ============================================
      const previousRefill = await getPreviousRefill(formData.vehicle_id);
      
      let calculatedEfficiency = parseFloat(formData.efficiency) || 0;
      let isAutoCalculated = false;
      
      // If efficiency not manually provided, calculate it
      if (!formData.efficiency || parseFloat(formData.efficiency) === 0) {
        if (previousRefill) {
          const prevOdometer = parseFloat(previousRefill.odometer || 0);
          const litres = parseFloat(formData.litres) || 0;
          
          if (prevOdometer > 0 && finalOdometer > prevOdometer && litres > 0) {
            const distance = finalOdometer - prevOdometer;
            calculatedEfficiency = (litres / distance) * 100;
            isAutoCalculated = true;
            console.log('📊 Efficiency auto-calculated:', {
              distance: distance.toFixed(1) + 'km',
              litres: litres.toFixed(1) + 'L',
              efficiency: calculatedEfficiency.toFixed(1) + ' L/100km'
            });
          }
        }
      }

      // ============================================
      // STEP 4: Check for anomalies
      // ============================================
      const anomalyCheck = isEfficiencyAbnormal(calculatedEfficiency, vehicle);
      let refillStatus = formData.status || 'normal';
      
      if (anomalyCheck.isAnomaly) {
        refillStatus = anomalyCheck.severity === 'high' ? 'anomaly' : 'high';
        console.warn('⚠️ Fuel anomaly detected:', anomalyCheck.reason);
      }

      // ============================================
      // STEP 5: Create the refill record
      // ============================================
      const refillData = {
        tenant: { id: tenantId },
        vehicle: { id: formData.vehicle_id },
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        dateTime: formData.date_time || new Date().toISOString(),
        station: formData.station || '',
        litres: parseFloat(formData.litres) || 0,
        cost: parseFloat(formData.cost) || 0,
        odometer: finalOdometer,
        efficiency: calculatedEfficiency,
        status: refillStatus,
        notes: formData.notes || '',
        receiptImage: formData.receipt_image || null,
        tripId: formData.trip_id || null,
        isAutoCalculated: isAutoCalculated
      };

      const response = await fuelService.create(refillData);
      
      if (response?.success) {
        // ============================================
// STEP 6: UPDATE VEHICLE MILEAGE - FIXED
// ============================================
if (finalOdometer > vehicleMileage) {
  try {
    // ✅ Get the FULL vehicle data first
    const fullVehicleRes = await vehicleService.getById(formData.vehicle_id);
    const fullVehicle = fullVehicleRes.data;
    
    if (!fullVehicle) {
      console.warn('Could not fetch full vehicle data');
      setSuccessMessage('✅ Fuel refill logged! (Mileage update skipped)');
    } else {
      // ✅ Build complete update payload with ALL fields INCLUDING tenant
      const updatePayload = {
        // ✅ CRITICAL: tenant is required!
        tenant: { id: fullVehicle.tenant?.id || fullVehicle.tenantId || tenantId },
        
        registration: fullVehicle.registration || '',
        make: fullVehicle.make || '',
        model: fullVehicle.model || '',
        year: fullVehicle.year || 2024,
        vin: fullVehicle.vin || '',
        category: fullVehicle.category || 'Pickup',
        status: fullVehicle.status || 'Active',
        mileage: finalOdometer,  // ✅ Only this changes
        owner: fullVehicle.owner || null,
        costCentre: fullVehicle.costCentre || null,
        location: fullVehicle.location || null,
        custodian: fullVehicle.custodian || null,
        color: fullVehicle.color || null,
        fuelType: fullVehicle.fuelType || null,
        engineSize: fullVehicle.engineSize || null,
        transmission: fullVehicle.transmission || null,
        acquisitionDate: fullVehicle.acquisitionDate || null,
        acquisitionCost: fullVehicle.acquisitionCost || null,
        licenseExpiry: fullVehicle.licenseExpiry || null,
        roadworthy: fullVehicle.roadworthy || null,
        insurance: fullVehicle.insurance || null,
        permit: fullVehicle.permit || null,
        driverId: fullVehicle.driver?.id || null,
        accessories: fullVehicle.accessories || '[]'
      };
      
      console.log('📤 Sending update:', updatePayload);
      
      const updateResponse = await vehicleService.update(formData.vehicle_id, updatePayload);
      
      if (updateResponse?.success) {
        console.log(`✅ Vehicle mileage updated: ${vehicleMileage} → ${finalOdometer} km`);
        setSuccessMessage(`✅ Fuel refill logged! Vehicle mileage updated to ${finalOdometer} km`);
      } else {
        console.warn('⚠️ Update failed:', updateResponse);
        setSuccessMessage('✅ Fuel refill logged! (Mileage update failed)');
      }
    }
  } catch (mileageError) {
    console.error('❌ Could not update vehicle mileage:', mileageError);
    setSuccessMessage('✅ Fuel refill logged! (Mileage update failed - check console)');
  }
} else {
  console.log('ℹ️ No mileage update needed (odometer not higher)');
  setSuccessMessage('✅ Fuel refill logged successfully!');
}

        // ============================================
        // STEP 7: CREATE ALARM FOR ANOMALIES
        // ============================================
        if (anomalyCheck.isAnomaly) {
          try {
            const anomalies = JSON.parse(localStorage.getItem('fuel_anomalies') || '[]');
            anomalies.push({
              id: Date.now(),
              vehicleId: formData.vehicle_id,
              vehicleName: getVehicleLabel(formData.vehicle_id),
              efficiency: calculatedEfficiency,
              reason: anomalyCheck.reason,
              severity: anomalyCheck.severity,
              date: new Date().toISOString(),
              resolved: false
            });
            localStorage.setItem('fuel_anomalies', JSON.stringify(anomalies));
            console.warn('🚨 Fuel anomaly saved:', anomalyCheck.reason);
          } catch (alarmError) {
            console.warn('Could not save anomaly:', alarmError);
          }
        }

        // ============================================
        // STEP 8: DISPATCH EVENT FOR VEHICLES PAGE
        // ============================================
        window.dispatchEvent(new CustomEvent('fuelRefillAdded', {
          detail: { 
            vehicleId: formData.vehicle_id, 
            mileage: finalOdometer || parseFloat(formData.odometer) || 0,
            refillId: response.data?.id 
          }
        }));
        console.log('📤 fuelRefillAdded event dispatched for vehicle:', formData.vehicle_id);

        setShowAddModal(false);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage('Failed to log refill. Please try again.');
      }
    } catch (error) {
      console.error('Error adding refill:', error);
      setErrorMessage('Failed to log refill. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // UPDATED: handleEditRefill - WITH SYNC + EVENT DISPATCH
  // ============================================
  const handleEditRefill = async () => {
    if (!selectedRefill) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // ============================================
      // STEP 1: Get vehicle data
      // ============================================
      const vehicleResponse = await vehicleService.getById(editFormData.vehicle_id);
      const vehicle = vehicleResponse?.data;
      
      if (!vehicle) {
        setErrorMessage('Vehicle not found');
        setIsLoading(false);
        return;
      }

      // ============================================
      // STEP 2: Prepare refill data
      // ============================================
      const currentOdometer = parseFloat(editFormData.odometer) || 0;
      const vehicleMileage = parseFloat(vehicle.mileage) || 0;
      const finalOdometer = currentOdometer > 0 ? currentOdometer : vehicleMileage;

      // ============================================
      // STEP 3: Get previous refill (excluding current)
      // ============================================
      const previousRefill = await getPreviousRefill(editFormData.vehicle_id, selectedRefill.id);
      
      let calculatedEfficiency = parseFloat(editFormData.efficiency) || 0;
      let isAutoCalculated = false;
      
      if (!editFormData.efficiency || parseFloat(editFormData.efficiency) === 0) {
        if (previousRefill) {
          const prevOdometer = parseFloat(previousRefill.odometer || 0);
          const litres = parseFloat(editFormData.litres) || 0;
          
          if (prevOdometer > 0 && finalOdometer > prevOdometer && litres > 0) {
            const distance = finalOdometer - prevOdometer;
            calculatedEfficiency = (litres / distance) * 100;
            isAutoCalculated = true;
          }
        }
      }

      // ============================================
      // STEP 4: Check for anomalies
      // ============================================
      const anomalyCheck = isEfficiencyAbnormal(calculatedEfficiency, vehicle);
      let refillStatus = editFormData.status || 'normal';
      
      if (anomalyCheck.isAnomaly) {
        refillStatus = anomalyCheck.severity === 'high' ? 'anomaly' : 'high';
      }

      // ============================================
      // STEP 5: Update the refill record
      // ============================================
      const refillData = {
        vehicle: { id: editFormData.vehicle_id },
        driver: editFormData.driver_id ? { id: editFormData.driver_id } : null,
        dateTime: editFormData.date_time || new Date().toISOString(),
        station: editFormData.station || '',
        litres: parseFloat(editFormData.litres) || 0,
        cost: parseFloat(editFormData.cost) || 0,
        odometer: finalOdometer,
        efficiency: calculatedEfficiency,
        status: refillStatus,
        notes: editFormData.notes || '',
        receiptImage: editFormData.receipt_image || null,
        tripId: editFormData.trip_id || null,
        isAutoCalculated: isAutoCalculated
      };

      const response = await fuelService.update(selectedRefill.id, refillData);
      
      if (response?.success) {
        // ============================================
// STEP 6: UPDATE VEHICLE MILEAGE - FIXED (EDIT)
// ============================================
if (finalOdometer > vehicleMileage) {
  try {
    // ✅ Get the FULL vehicle data first
    const fullVehicleRes = await vehicleService.getById(editFormData.vehicle_id);
    const fullVehicle = fullVehicleRes.data;
    
    if (!fullVehicle) {
      console.warn('Could not fetch full vehicle data');
      setSuccessMessage('✅ Fuel refill logged! (Mileage update skipped)');
    } else {
      // ✅ Build complete update payload with ALL fields INCLUDING tenant
      const updatePayload = {
        tenant: { id: fullVehicle.tenant?.id || fullVehicle.tenantId || tenantId },
        registration: fullVehicle.registration || '',
        make: fullVehicle.make || '',
        model: fullVehicle.model || '',
        year: fullVehicle.year || 2024,
        vin: fullVehicle.vin || '',
        category: fullVehicle.category || 'Pickup',
        status: fullVehicle.status || 'Active',
        mileage: finalOdometer,
        owner: fullVehicle.owner || null,
        costCentre: fullVehicle.costCentre || null,
        location: fullVehicle.location || null,
        custodian: fullVehicle.custodian || null,
        color: fullVehicle.color || null,
        fuelType: fullVehicle.fuelType || null,
        engineSize: fullVehicle.engineSize || null,
        transmission: fullVehicle.transmission || null,
        acquisitionDate: fullVehicle.acquisitionDate || null,
        acquisitionCost: fullVehicle.acquisitionCost || null,
        licenseExpiry: fullVehicle.licenseExpiry || null,
        roadworthy: fullVehicle.roadworthy || null,
        insurance: fullVehicle.insurance || null,
        permit: fullVehicle.permit || null,
        driverId: fullVehicle.driver?.id || null,
        accessories: fullVehicle.accessories || '[]'
      };
      
      console.log('📤 Sending update:', updatePayload);
      
      const updateResponse = await vehicleService.update(editFormData.vehicle_id, updatePayload);
      
      if (updateResponse?.success) {
        console.log(`✅ Vehicle mileage updated: ${vehicleMileage} → ${finalOdometer} km`);
        setSuccessMessage(`✅ Refill updated! Vehicle mileage updated to ${finalOdometer} km`);
      } else {
        console.warn('⚠️ Update failed:', updateResponse);
        setSuccessMessage('✅ Refill updated! (Mileage update failed)');
      }
    }
  } catch (mileageError) {
    console.error('❌ Could not update vehicle mileage:', mileageError);
    setSuccessMessage('✅ Refill updated! (Mileage update failed - check console)');
  }
} else {
  console.log('ℹ️ No mileage update needed (odometer not higher)');
  setSuccessMessage('✅ Fuel refill updated successfully!');
}

        // ============================================
        // STEP 7: UPDATE ALARM FOR ANOMALIES
        // ============================================
        if (anomalyCheck.isAnomaly) {
          try {
            const anomalies = JSON.parse(localStorage.getItem('fuel_anomalies') || '[]');
            // Remove old anomaly for this refill if exists
            const filtered = anomalies.filter(a => a.refillId !== selectedRefill.id);
            filtered.push({
              id: Date.now(),
              refillId: selectedRefill.id,
              vehicleId: editFormData.vehicle_id,
              vehicleName: getVehicleLabel(editFormData.vehicle_id),
              efficiency: calculatedEfficiency,
              reason: anomalyCheck.reason,
              severity: anomalyCheck.severity,
              date: new Date().toISOString(),
              resolved: false
            });
            localStorage.setItem('fuel_anomalies', JSON.stringify(filtered));
          } catch (alarmError) {
            console.warn('Could not update anomaly:', alarmError);
          }
        }

        // ============================================
        // STEP 8: DISPATCH EVENT FOR VEHICLES PAGE
        // ============================================
        window.dispatchEvent(new CustomEvent('fuelRefillUpdated', {
          detail: { 
            vehicleId: editFormData.vehicle_id, 
            mileage: finalOdometer || parseFloat(editFormData.odometer) || 0,
            refillId: selectedRefill.id 
          }
        }));
        console.log('📤 fuelRefillUpdated event dispatched for vehicle:', editFormData.vehicle_id);

        setShowEditModal(false);
        setSelectedRefill(null);
        resetForm();
        resetEditForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage('Failed to update refill. Please try again.');
      }
    } catch (error) {
      console.error('Error updating refill:', error);
      setErrorMessage('Failed to update refill. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // UPDATED: handleDeleteRefill - WITH EVENT DISPATCH
  // ============================================
  const handleDeleteRefill = async () => {
    if (!selectedRefill) return;

    try {
      const response = await fuelService.delete(selectedRefill.id);
      if (response?.success) {
        // Remove anomaly if exists
        try {
          const anomalies = JSON.parse(localStorage.getItem('fuel_anomalies') || '[]');
          const filtered = anomalies.filter(a => a.refillId !== selectedRefill.id);
          localStorage.setItem('fuel_anomalies', JSON.stringify(filtered));
        } catch (e) {}
        
        setSuccessMessage('✅ Fuel refill deleted successfully!');
        
        // ============================================
        // DISPATCH EVENT FOR VEHICLES PAGE
        // ============================================
        window.dispatchEvent(new CustomEvent('fuelRefillDeleted', {
          detail: { 
            vehicleId: selectedRefill.vehicle_id || selectedRefill.vehicleId,
            refillId: selectedRefill.id 
          }
        }));
        console.log('📤 fuelRefillDeleted event dispatched for vehicle:', selectedRefill.vehicle_id || selectedRefill.vehicleId);
        
        setShowDeleteConfirm(false);
        setSelectedRefill(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to delete refill. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting refill:', error);
      setErrorMessage('Failed to delete refill. Please try again.');
    }
  };

  // ============================================
  // openEditModal
  // ============================================
  const openEditModal = (refill) => {
    setSelectedRefill(refill);
    setEditFormData({
      vehicle_id: refill.vehicleId || refill.vehicle_id || '',
      driver_id: refill.driverId || refill.driver_id || '',
      date_time: refill.dateTime ? refill.dateTime.slice(0, 16) : new Date().toISOString().slice(0, 16),
      station: refill.station || '',
      litres: refill.litres || '',
      cost: refill.cost || '',
      odometer: refill.odometer || '',
      efficiency: refill.efficiency || '',
      status: refill.status || 'normal',
      notes: refill.notes || '',
      receipt_image: refill.receiptImage || refill.receipt_image || null,
      trip_id: refill.tripId || refill.trip_id || null,
      is_auto_calculated: false
    });
    setReceiptPreview(refill.receiptImage || refill.receipt_image || null);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (refill) => {
    setSelectedRefill(refill);
    setShowDeleteConfirm(true);
  };

  // ============================================
  // FILTER REFILLS
  // ============================================
  const filteredRefills = refills.filter(r => {
    const matchesSearch = 
      (getVehicleLabel(r.vehicleId || r.vehicle_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getDriverName(r.driverId || r.driver_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.station || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesVehicle = selectedVehicle === 'all' || 
      r.vehicleId === selectedVehicle || 
      r.vehicle_id === selectedVehicle;
    return matchesSearch && matchesVehicle;
  });

  // ============================================
  // RENDER OVERVIEW
  // ============================================
  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Fuel size={16} className="text-blue-500" />
            Fuel Used (from Trips)
          </div>
          <p className="text-2xl font-bold">{fuelSummary.totalFuelUsed.toFixed(1)} L</p>
          <p className="text-xs text-gray-400">From {stats.completedTrips} completed trips</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign size={16} className="text-green-500" />
            Total Fuel Cost
          </div>
          <p className="text-2xl font-bold">KES {stats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-gray-400">KES {stats.avgCostPerLitre.toFixed(2)}/L avg</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Gauge size={16} className="text-purple-500" />
            Avg Efficiency
          </div>
          <p className="text-2xl font-bold">{fuelSummary.avgEfficiency.toFixed(1)} L/100km</p>
          <p className="text-xs text-gray-400">{stats.normalCount} normal, {stats.highCount} high</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <TrendingUp size={16} className="text-orange-500" />
            Total Distance
          </div>
          <p className="text-2xl font-bold">{fuelSummary.totalDistance.toFixed(1)} km</p>
          <p className="text-xs text-gray-400">From {stats.completedTrips} trips</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Fleet Fuel Efficiency</p>
            <p className="text-2xl font-bold text-blue-600">{fuelSummary.avgEfficiency.toFixed(1)} L/100km</p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getEfficiencyRating(fuelSummary.avgEfficiency).color}`}>
                {getEfficiencyRating(fuelSummary.avgEfficiency).icon}
                {getEfficiencyRating(fuelSummary.avgEfficiency).label}
              </span>
              <span className="text-xs text-gray-500">
                {stats.totalTrips} trips • {stats.completedTrips} completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-500" />
            Fuel Efficiency Trend
            <span className="text-xs text-gray-400 font-normal">
              ({trips.length > 0 ? `Last ${Math.min(trips.length, 12)} trips` : 'No data'})
            </span>
          </h4>
          <div className="h-48">
            {trips.length > 0 ? (
              <div className="flex items-end justify-between h-full gap-1">
                {trips.filter(t => parseFloat(t.distance) > 0).slice(-12).map((t, i) => {
                  const distance = parseFloat(t.distance) || 0;
                  const efficiency = parseFloat(t.efficiency) || (distance > 0 ? 8.5 : 0);
                  const maxEfficiency = 12;
                  const heightPercent = Math.min((efficiency / maxEfficiency) * 100, 100);
                  
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                      <div 
                        className={`w-full rounded-t transition-all duration-500 hover:scale-y-110 origin-bottom ${
                          efficiency < 7 ? 'bg-green-400' : 
                          efficiency < 8 ? 'bg-blue-400' : 
                          efficiency < 9 ? 'bg-yellow-400' : 'bg-red-400'
                        }`}
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap z-10">
                          {efficiency.toFixed(1)} L/100km
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1 truncate w-full text-center">
                        {new Date(t.startTime || t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
                <Fuel size={32} className="text-gray-300" />
                <p>No trip data available</p>
                <p className="text-xs">Complete trips to see efficiency trends</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-green-500" />
            Fuel Cost Trend
            <span className="text-xs text-gray-400 font-normal">
              ({refills.length > 0 ? `Last ${Math.min(refills.length, 12)} records` : 'No data'})
            </span>
          </h4>
          <div className="h-48">
            {refills.length > 0 ? (
              <div className="flex items-end justify-between h-full gap-1">
                {refills.slice(-12).map((r, i) => {
                  const cost = parseFloat(r.cost) || 0;
                  const maxCost = Math.max(...refills.slice(-12).map(r => parseFloat(r.cost) || 0), 1);
                  const heightPercent = Math.min((cost / (maxCost || 1)) * 100, 100);
                  
                  return (
                    <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group relative">
                      <div 
                        className="w-full rounded-t bg-gradient-to-t from-green-400 to-green-500 transition-all duration-500 hover:scale-y-110 origin-bottom"
                        style={{ height: `${Math.max(heightPercent, 5)}%` }}
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap z-10">
                          KES {cost.toFixed(2)}
                        </div>
                      </div>
                      <span className="text-[8px] text-gray-400 mt-1 truncate w-full text-center">
                        {new Date(r.dateTime || r.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm flex-col gap-2">
                <DollarSign size={32} className="text-gray-300" />
                <p>No cost data available</p>
                <p className="text-xs">Log fuel refills to see cost trends</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {stats.anomalyCount > 0 && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-3">
          <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">⚠️ Fuel Anomaly Detected</p>
            <p className="text-sm text-red-600">{stats.anomalyCount} fuel refill(s) flagged as anomalies</p>
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => setActiveTab('refills')}
                className="text-xs text-red-700 font-medium hover:underline"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER REFILLS
  // ============================================
  const renderRefills = () => (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search refills..." 
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Filter size={14} /> Filters
          </button>
          <select 
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> Log Refill
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-1">
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
            >
              <option value="all">All Vehicles</option>
              {vehicles.map(v => (
                <option key={v.id || v.reg} value={v.id}>
                  {v.registration || v.reg || v.id}
                </option>
              ))}
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Status</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="anomaly">Anomaly</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Stations</option>
              {[...new Set(refills.map(r => r.station))].filter(Boolean).map(station => (
                <option key={station} value={station}>{station}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filteredRefills.length > 0 ? (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Date/Time</th>
                <th className="p-3 hidden sm:table-cell">Vehicle</th>
                <th className="p-3 hidden md:table-cell">Driver</th>
                <th className="p-3 hidden lg:table-cell">Station</th>
                <th className="p-3">Litres</th>
                <th className="p-3 hidden xl:table-cell">Cost</th>
                <th className="p-3">Status</th>
                <th className="p-3">Receipt</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefills.map((r) => {
                const efficiency = parseFloat(r.efficiency || 0);
                return (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm whitespace-nowrap">
                      {r.dateTime || r.date_time ? new Date(r.dateTime || r.date_time).toLocaleString() : 'N/A'}
                    </td>
                    <td className="p-3 text-sm hidden sm:table-cell font-medium">
                      {getVehicleLabel(r.vehicleId || r.vehicle_id)}
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">
                      {getDriverName(r.driverId || r.driver_id)}
                    </td>
                    <td className="p-3 text-sm hidden lg:table-cell">{r.station || 'N/A'}</td>
                    <td className="p-3 text-sm font-medium">{parseFloat(r.litres || 0).toFixed(1)}L</td>
                    <td className="p-3 text-sm hidden xl:table-cell">
                      KES {parseFloat(r.cost || 0).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(r.status)}`}>
                        {getStatusIcon(r.status)}
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {hasReceipt(r) ? (
                        <button
                          onClick={() => viewReceipt(r)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded"
                          title="View Receipt"
                        >
                          <ImageIcon size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditModal(r)}
                          className="p-1 hover:bg-gray-200 rounded text-blue-600"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => openDeleteConfirm(r)}
                          className="p-1 hover:bg-gray-200 rounded text-red-600"
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
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Fuel size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No fuel refills found</p>
          <p className="text-sm">Click "Log Refill" to add your first record</p>
        </div>
      )}

      {filteredRefills.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Total: <span className="font-semibold">{filteredRefills.length} refills</span> · 
            Total Fuel: <span className="font-semibold">
              {filteredRefills.reduce((sum, r) => sum + (parseFloat(r.litres) || 0), 0).toFixed(1)} L
            </span> · 
            Total Cost: <span className="font-semibold">
              KES {filteredRefills.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0).toFixed(2)}
            </span>
          </p>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER STATIONS
  // ============================================
  const renderStations = () => {
    const stationData = Object.values(
      refills.reduce((acc, r) => {
        if (!r.station) return acc;
        if (!acc[r.station]) {
          acc[r.station] = {
            name: r.station,
            count: 0,
            totalLitres: 0,
            totalCost: 0,
            avgEfficiency: 0,
            efficiencies: []
          };
        }
        acc[r.station].count++;
        acc[r.station].totalLitres += parseFloat(r.litres) || 0;
        acc[r.station].totalCost += parseFloat(r.cost) || 0;
        if (r.efficiency) {
          acc[r.station].efficiencies.push(parseFloat(r.efficiency));
        }
        return acc;
      }, {})
    ).map(station => ({
      ...station,
      avgEfficiency: station.efficiencies.length > 0 
        ? station.efficiencies.reduce((a, b) => a + b, 0) / station.efficiencies.length 
        : 0,
      avgPrice: station.totalLitres > 0 ? station.totalCost / station.totalLitres : 0
    }));

    return (
      <div>
        <h4 className="font-semibold text-sm mb-4">Station Performance</h4>
        {stationData.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stationData.map((station) => (
              <div key={station.name} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-blue-600" />
                      <h5 className="font-semibold text-sm">{station.name}</h5>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-medium">
                      {station.avgEfficiency > 0 ? (station.avgEfficiency < 7.5 ? '4.5' : station.avgEfficiency < 8.5 ? '3.5' : '3.0') : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Refills</p>
                    <p className="font-medium">{station.count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Fuel</p>
                    <p className="font-medium">{station.totalLitres.toFixed(1)} L</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Price/L</p>
                    <p className="font-medium">KES {station.avgPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Avg Efficiency</p>
                    <p className="font-medium">{station.avgEfficiency.toFixed(1)} L/100km</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
            <p>No station data available</p>
            <p className="text-sm">Log fuel refills to see station performance</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER DRIVERS
  // ============================================
  const renderDrivers = () => {
    const driverData = Object.values(
      refills.reduce((acc, r) => {
        const driverId = r.driverId || r.driver_id || 'unassigned';
        if (!acc[driverId]) {
          acc[driverId] = {
            driverId: driverId,
            name: getDriverName(driverId),
            count: 0,
            totalLitres: 0,
            totalCost: 0,
            totalDistance: 0,
            efficiencies: []
          };
        }
        acc[driverId].count++;
        acc[driverId].totalLitres += parseFloat(r.litres) || 0;
        acc[driverId].totalCost += parseFloat(r.cost) || 0;
        if (r.efficiency) {
          acc[driverId].efficiencies.push(parseFloat(r.efficiency));
        }
        if (r.odometer) {
          acc[driverId].totalDistance += parseFloat(r.odometer) || 0;
        }
        return acc;
      }, {})
    ).map(driver => ({
      ...driver,
      avgEfficiency: driver.efficiencies.length > 0 
        ? driver.efficiencies.reduce((a, b) => a + b, 0) / driver.efficiencies.length 
        : 0,
      avgCost: driver.count > 0 ? driver.totalCost / driver.count : 0
    }));

    return (
      <div>
        <h4 className="font-semibold text-sm mb-4">Driver Fuel Efficiency</h4>
        {driverData.length > 0 ? (
          <div className="overflow-x-auto -mx-3 sm:mx-0">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-3">Driver</th>
                  <th className="p-3 hidden sm:table-cell">Refills</th>
                  <th className="p-3">Avg Consumption</th>
                  <th className="p-3 hidden md:table-cell">Total Fuel</th>
                  <th className="p-3 hidden lg:table-cell">Avg Cost</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {driverData.map((driver) => (
                  <tr key={driver.driverId} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium text-sm">{driver.name}</td>
                    <td className="p-3 text-sm hidden sm:table-cell">{driver.count}</td>
                    <td className="p-3 text-sm font-medium">
                      {driver.avgEfficiency > 0 ? `${driver.avgEfficiency.toFixed(1)} L/100km` : 'N/A'}
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">{driver.totalLitres.toFixed(1)} L</td>
                    <td className="p-3 text-sm hidden lg:table-cell">KES {driver.avgCost.toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getEfficiencyRating(driver.avgEfficiency).color} flex items-center gap-1`}>
                        {getEfficiencyRating(driver.avgEfficiency).icon}
                        {getEfficiencyRating(driver.avgEfficiency).label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <User size={48} className="mx-auto text-gray-300 mb-3" />
            <p>No driver data available</p>
            <p className="text-sm">Log fuel refills with drivers to see performance</p>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER MODALS
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showAddModal;
    const data = isEdit ? editFormData : formData;
    const setData = isEdit ? setEditFormData : setFormData;
    const handleSubmit = isEdit ? handleEditRefill : handleAddRefill;
    const closeModal = () => {
      if (isEdit) {
        setShowEditModal(false);
        resetEditForm();
      } else {
        setShowAddModal(false);
        resetForm();
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={closeModal}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Fuel Refill' : 'Log Fuel Refill'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update refill details' : 'Record a new fuel refill'}
            </p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.vehicle_id}
                  onChange={(e) => setData({...data, vehicle_id: e.target.value})}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id || v.reg} value={v.id}>
                      {v.registration || v.reg || v.id} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.driver_id}
                  onChange={(e) => setData({...data, driver_id: e.target.value})}
                >
                  <option value="">Select Driver</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                <input 
                  type="datetime-local" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.date_time}
                  onChange={(e) => setData({...data, date_time: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Station</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Fuel station name"
                  value={data.station}
                  onChange={(e) => setData({...data, station: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Litres *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={data.litres}
                  onChange={(e) => setData({...data, litres: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost *</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={data.cost}
                  onChange={(e) => setData({...data, cost: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odometer</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.0"
                  value={data.odometer}
                  onChange={(e) => setData({...data, odometer: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Efficiency (L/100km)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={data.efficiency}
                  onChange={(e) => setData({...data, efficiency: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.status}
                  onChange={(e) => setData({...data, status: e.target.value})}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="anomaly">Anomaly</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Additional notes"
                  value={data.notes}
                  onChange={(e) => setData({...data, notes: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Image (Optional)</label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={isEdit ? editFileInputRef : fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, isEdit)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isEdit && editFileInputRef.current) {
                        editFileInputRef.current.click();
                      } else if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                  >
                    <Camera size={16} /> Upload Receipt
                  </button>
                  {(data.receipt_image || receiptPreview) && (
                    <div className="flex items-center gap-2">
                      <img 
                        src={data.receipt_image || receiptPreview} 
                        alt="Receipt" 
                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeReceipt(isEdit)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {!data.receipt_image && !receiptPreview && (
                    <span className="text-xs text-gray-400">Upload receipt image for proof</span>
                  )}
                </div>
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
                {isEdit ? 'Update Refill' : 'Log Refill'}
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

  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedRefill) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Refill Record?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete this fuel refill record? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteRefill}
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

  const renderReceiptModal = () => {
    if (!showReceiptModal || !receiptView) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowReceiptModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-4">
          <button 
            onClick={() => setShowReceiptModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>
          <div className="flex items-center justify-center p-4">
            <img 
              src={receiptView} 
              alt="Receipt" 
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading fuel data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Fuel size={24} className="text-blue-600" />
              Fuel Management
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track fuel consumption, costs, and efficiency</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Log Refill
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'refills', label: 'Refills', icon: Fuel },
            { id: 'stations', label: 'Stations', icon: MapPin },
            { id: 'drivers', label: 'Drivers', icon: User },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 sm:gap-2 ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'refills' && renderRefills()}
        {activeTab === 'stations' && renderStations()}
        {activeTab === 'drivers' && renderDrivers()}
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
      {renderReceiptModal()}
    </div>
  );
};

export default FuelManagement;