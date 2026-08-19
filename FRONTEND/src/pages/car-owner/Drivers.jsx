// src/pages/car-owner/Drivers.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, User, Award, Search, Filter,
  Eye, Edit, Trash2, Download, BarChart3, FileText,
  X, Save, AlertCircle, CheckCircle, Key, Truck,
  RefreshCw, Phone, Mail, Calendar, Clock,
  TrendingUp, TrendingDown, Shield, Star,
  ChevronRight, ChevronDown, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  driverService, 
  vehicleService, 
  userService, 
  tenantService, 
  authService,
  tripService,
  incidentService    
} from '../../services/api';

// ✅ FIX: Rename prop to avoid conflict with state
const Drivers = ({ setActiveTab: setActiveTabProp }) => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showEditDriverModal, setShowEditDriverModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expandedDriver, setExpandedDriver] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // ============================================
  // FORM DATA
  // ============================================
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    licenseExpiry: '',
    driverId: '',
    assignedVehicleId: '',
    safetyScore: 100,
    training: '',
    status: 'Active',
    joinedDate: new Date().toISOString().split('T')[0],
    totalTrips: 0,
    totalDistance: '0 km',
    violations: 0,
    trainingHistory: [],
    monthlyScores: Array(12).fill(80)
  });

  // ============================================
// LOAD DATA - WITH INCIDENTS FOR VIOLATIONS
// ============================================
const loadData = async (showLoading = true) => {
  if (showLoading) setIsLoading(true);
  setError(null);
  setErrorMessage('');

  try {
    const tenantId = currentUser?.tenantId;
    if (!tenantId) {
      setDrivers([]);
      setVehicles([]);
      setIsLoading(false);
      return;
    }

    // Load all data in parallel
    const [driversRes, vehiclesRes, tripsRes, incidentsRes, usersRes] = await Promise.all([
      driverService.getAll(tenantId).catch(() => ({ data: [] })),
      vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
      tripService.getAll(tenantId).catch(() => ({ data: [] })),
      incidentService.getByTenant(tenantId).catch(() => ({ data: [] })), // ✅ ADD INCIDENTS
      userService.getAll(tenantId).catch(() => ({ data: [] })) // ✅ FETCH USERS
    ]);

    const driversData = driversRes.data || [];
    const vehiclesData = vehiclesRes.data || [];
    const tripsData = tripsRes.data || [];
    const incidentsData = incidentsRes.data || [];
    const usersData = usersRes.data || [];  // ✅ ADD THIS LINE

    console.log('📊 Users data:', usersData.length);

    console.log('📊 Drivers data:', driversData.length);
    console.log('📊 Vehicles data:', vehiclesData.length);
    console.log('📊 Trips data:', tripsData.length);
    console.log('📊 Incidents data:', incidentsData.length);

    // ✅ Calculate trips, distance, and violations per driver
    const driverTripsCount = {};
    const driverDistance = {};
    const driverViolations = {};
    const driverMonthlyScores = {};

    // Process trips
    tripsData.forEach(trip => {
      const driverId = trip.driverId || trip.driver_id || trip.driver?.id;
      if (driverId) {
        driverTripsCount[driverId] = (driverTripsCount[driverId] || 0) + 1;
        const dist = parseFloat(trip.distance) || 0;
        driverDistance[driverId] = (driverDistance[driverId] || 0) + dist;
        
        // Monthly scores from trips
        const date = trip.startTime || trip.start_time || trip.createdAt;
        if (date) {
          const month = new Date(date).getMonth();
          if (!driverMonthlyScores[driverId]) {
            driverMonthlyScores[driverId] = Array(12).fill(80);
          }
          if (trip.status === 'Completed' || trip.status === 'completed') {
            driverMonthlyScores[driverId][month] = Math.min(100, (driverMonthlyScores[driverId][month] || 80) + 2);
          }
        }
      }
    });

    // ✅ Process INCIDENTS for violations
    incidentsData.forEach(incident => {
      const driverId = incident.driverId || incident.driver_id || incident.driver?.id;
      if (driverId) {
        driverViolations[driverId] = (driverViolations[driverId] || 0) + 1;
        
        // Also deduct from monthly scores for violations
        const date = incident.createdAt || incident.created_at;
        if (date) {
          const month = new Date(date).getMonth();
          if (!driverMonthlyScores[driverId]) {
            driverMonthlyScores[driverId] = Array(12).fill(80);
          }
          // Deduct more for high severity incidents
          const severity = incident.severity?.toLowerCase() || 'medium';
          const deduct = severity === 'high' || severity === 'critical' ? 10 : severity === 'medium' ? 5 : 3;
          driverMonthlyScores[driverId][month] = Math.max(0, (driverMonthlyScores[driverId][month] || 80) - deduct);
        }
      }
    });

    console.log('📊 Driver trip counts:', driverTripsCount);
    console.log('📊 Driver distances:', driverDistance);
    console.log('📊 Driver violations from incidents:', driverViolations);

    // ✅ CREATE USER LOOKUP BY ID
    const userMap = {};
      usersData.forEach(user => {
      userMap[user.id] = user;
    });
    console.log('📊 User map created with', Object.keys(userMap).length, 'users');

    const normalizedDrivers = driversData.map(d => {
      const driverId = d.id || d.driverId;
      const tripsCount = driverTripsCount[driverId] || 0;
      const distance = driverDistance[driverId] || 0;
      const violations = driverViolations[driverId] || 0;
      const monthlyScores = driverMonthlyScores[driverId] || Array(12).fill(80);
      
      // ✅ Use the database value directly (backend calculates safety score)
      let safetyScore = d.safetyScore || d.safety_score || 100;
      safetyScore = Math.round(Math.max(0, Math.min(100, safetyScore)));

      // Find assigned vehicle
      const assignedVehicleId = d.assignedVehicleId || d.assigned_vehicle || d.assignedVehicleRegistration;
      const assignedVehicle = vehiclesData.find(v => 
        v.id === assignedVehicleId || 
        v.id === d.assignedVehicle?.id ||
        v.registration === assignedVehicleId
      );

      const user = userMap[d.userId || d.user_id];
      const userAvatar = user?.avatar || null;

        // ✅ GET AVATAR
      const avatarUrl = d.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'Driver')}&background=1e293b&color=fff&size=80`;

      return {
        ...d,
        id: driverId,
        user_id: d.userId || d.user_id,
        tenant_id: d.tenantId || tenantId,
        name: d.name || '',
        email: d.email || '',
        phone: d.phone || '',
        license_number: d.licenseNumber || d.license_number || '',
        license_expiry: d.licenseExpiry || d.license_expiry || '',
        driver_id: d.driverId || d.driver_id || '',
        assigned_vehicle: assignedVehicle?.reg || assignedVehicle?.registration || d.assigned_vehicle || '',
        assigned_vehicle_id: assignedVehicle?.id || d.assignedVehicleId || d.assigned_vehicle || '',
        safety_score: safetyScore,
        training: d.training || '',
        status: d.status || 'Active',
        joinedDate: d.createdAt ? new Date(d.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        // ✅ REAL DATA FROM TRIPS AND INCIDENTS
        totalTrips: tripsCount,
        totalDistance: distance > 0 ? `${distance.toFixed(0)} km` : '0 km',
        violations: violations, // ✅ Now from incidents!
        trainingHistory: d.trainingHistory || [],
        monthlyScores: monthlyScores,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        vehicleObj: assignedVehicle,
        avatar: userAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(d.name || 'Driver')}&background=1e293b&color=fff&size=80`  // ✅ ADD THIS LINE
      };
    });

    // Normalize vehicles
    // In loadData function - when normalizing vehicles
const normalizedVehicles = vehiclesData
  .filter(v => v.tenantId === tenantId || !v.tenantId)  // ✅ Filter by tenant
  .map(v => ({
    ...v,
    id: v.id || v.vehicleId,
    reg: v.registration || v.id,
    driver_id: v.driverId || v.driver_id || null,
    driver_name: v.driverName || v.driver_name || null,
    tenantId: v.tenantId || tenantId,  // ✅ Ensure tenantId is set
  }));

    setDrivers(normalizedDrivers);
    setVehicles(normalizedVehicles);
    setLastUpdated(new Date().toLocaleTimeString());

    console.log('✅ Drivers loaded with real data:');
    normalizedDrivers.forEach(d => {
      console.log(`   ${d.name}: ${d.totalTrips} trips, ${d.totalDistance}, ${d.violations} violations, score: ${d.safety_score}`);
    });

  } catch (error) {
    console.error('Failed to load drivers:', error);
    setError(error.message || 'Failed to load drivers. Please try again.');
  } finally {
    if (showLoading) setIsLoading(false);
  }
};

  // ============================================
  // USE EFFECTS
  // ============================================
  useEffect(() => {
    loadData(true);
    const intervalId = setInterval(() => loadData(false), 30000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // ============================================
// LISTEN FOR DRIVER SCORE UPDATES
// ============================================
useEffect(() => {
  const handleDriverScoreUpdate = (event) => {
    console.log('🔄 Driver score updated, refreshing drivers...', event?.detail);
    loadData(false);
  };

  window.addEventListener('driverScoreUpdated', handleDriverScoreUpdate);

  return () => {
    window.removeEventListener('driverScoreUpdated', handleDriverScoreUpdate);
  };
}, []);

// ============================================
// LISTEN FOR VEHICLE UPDATES AND ASSIGNMENT CHANGES
// ============================================
useEffect(() => {
  const handleVehiclesUpdated = () => {
    console.log('🔄 Vehicles updated, refreshing drivers...');
    loadData(false);
  };

  const handleDriverAssignmentChange = (event) => {
    console.log('🔄 Driver assignment changed, refreshing drivers...', event.detail);
    loadData(false);
  };

  window.addEventListener('vehiclesUpdated', handleVehiclesUpdated);
  window.addEventListener('driverAssignmentChanged', handleDriverAssignmentChange);

  return () => {
    window.removeEventListener('vehiclesUpdated', handleVehiclesUpdated);
    window.removeEventListener('driverAssignmentChanged', handleDriverAssignmentChange);
  };
}, []);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'Active' || d.status === 'active').length,
    inactive: drivers.filter(d => d.status === 'Inactive' || d.status === 'inactive').length,
    avgScore: drivers.length > 0 ? Math.round(drivers.reduce((sum, d) => sum + (d.safety_score || 0), 0) / drivers.length) : 0,
    highPerformers: drivers.filter(d => (d.safety_score || 0) >= 90).length,
    mediumPerformers: drivers.filter(d => (d.safety_score || 0) >= 80 && (d.safety_score || 0) < 90).length,
    lowPerformers: drivers.filter(d => (d.safety_score || 0) < 80).length,
    totalTrips: drivers.reduce((sum, d) => sum + (d.totalTrips || 0), 0),
    expiringLicenses: drivers.filter(d => {
      if (!d.license_expiry) return false;
      const expiry = new Date(d.license_expiry);
      const now = new Date();
      const diff = (expiry - now) / (1000 * 60 * 60 * 24);
      return diff < 90 && diff > 0;
    }).length,
    assignedDrivers: drivers.filter(d => d.assigned_vehicle).length,
    unassignedDrivers: drivers.filter(d => !d.assigned_vehicle).length,
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    return status === 'Active' || status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
  };

  const getStatusBadge = (status) => {
    return status === 'Active' || status === 'active' ? 'bg-green-500' : 'bg-gray-400';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreBadge = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 80) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getTrainingStatusColor = (status) => {
    return status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';
  };

  const getVehicleLabel = (vehicleId) => {
    if (!vehicleId) return 'Unassigned';
    const vehicle = vehicles.find(v => v.id === vehicleId || v.reg === vehicleId);
    return vehicle ? vehicle.reg || vehicle.id : 'Unassigned';
  };

  const getAvailableVehicles = () => {
  const currentVehicleId = selectedDriver?.assigned_vehicle || null;
  const tenantId = currentUser?.tenantId;
  
  if (vehicles.length === 0) return [];
  
  return vehicles.filter(vehicle => {
    // ✅ Filter by tenant first
    if (vehicle.tenantId && vehicle.tenantId !== tenantId) {
      return false;
    }
    
    // If vehicle has no driver assigned, show it
    if (!vehicle.driver_id) return true;
    
    // If vehicle is assigned to the current driver being edited, show it
    if (vehicle.driver_id === selectedDriver?.id) return true;
    
    return false;
  });
};

  // ============================================
  // FILTER DRIVERS
  // ============================================
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = (driver.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (driver.assigned_vehicle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (driver.driver_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (driver.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter || 
                          driver.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // ============================================
  // NAVIGATION HELPERS - UPDATED to use setActiveTabProp
  // ============================================
  const navigateToVehicles = () => {
    if (setActiveTabProp) {
      setActiveTabProp('vehicles');
    } else {
      window.dispatchEvent(new CustomEvent('navigateTo', { detail: { tab: 'vehicles' } }));
    }
  };

  const navigateToTracking = (driver) => {
    if (driver.assigned_vehicle) {
      localStorage.setItem('tracking_selected_vehicle', driver.assigned_vehicle);
      if (setActiveTabProp) {
        setActiveTabProp('tracking');
      } else {
        window.dispatchEvent(new CustomEvent('navigateTo', { 
          detail: { tab: 'tracking', vehicle: driver.assigned_vehicle } 
        }));
      }
    }
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      licenseNumber: '',
      licenseExpiry: '',
      driverId: '',
      assignedVehicleId: '',
      safetyScore: 100,
      training: '',
      status: 'Active',
      joinedDate: new Date().toISOString().split('T')[0],
      totalTrips: 0,
      totalDistance: '0 km',
      violations: 0,
      trainingHistory: [],
      monthlyScores: Array(12).fill(80)
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAddDriver = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const tenantId = currentUser?.tenantId;
      const tenantName = currentUser?.tenantName || currentUser?.name || 'My Company';
      
      if (!tenantId) {
        setErrorMessage('No tenant found. Please contact support.');
        setIsLoading(false);
        return;
      }

      const registerData = {
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        role: 'driver',
        phone: formData.phone || null,
        tenantId: tenantId,
        companyName: tenantName
      };

      const userResponse = await authService.register(registerData);
      if (!userResponse.success || !userResponse.data) {
        setErrorMessage(userResponse.message || 'Failed to create user account');
        setIsLoading(false);
        return;
      }

      const userId = userResponse.data.id;

      const newDriver = {
        tenant: { id: tenantId },
        user: { id: userId }, 
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone || null,
        licenseNumber: formData.licenseNumber.trim(),
        licenseExpiry: formData.licenseExpiry,
        driverId: formData.driverId || `DRV${Date.now().toString().slice(-6)}`,
        assignedVehicle: formData.assignedVehicleId ? { id: formData.assignedVehicleId } : null,
        safetyScore: parseInt(formData.safetyScore) || 100,
        training: formData.training || null,
        status: formData.status || 'Active',
      };

      const response = await driverService.create(newDriver);
      
      if (response.success) {
        setSuccessMessage(`✅ Driver ${newDriver.name} created successfully!`);
        setShowAddDriverModal(false);
        resetForm();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage(response.message || 'User created but failed to create driver profile.');
      }
    } catch (error) {
      console.error('Error adding driver:', error);
      setErrorMessage(error.message || 'Failed to add driver. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditDriver = async (e) => {
    if (e) e.preventDefault();
    if (!selectedDriver) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const vehicleId = formData.assignedVehicleId || null;

      // ✅ ============================================
    // ✅ ADD THIS: Handle vehicle assignment changes
    // ✅ ============================================
    const newVehicleId = formData.assignedVehicleId || null;
    const oldVehicleId = selectedDriver.assignedVehicleId || selectedDriver.assigned_vehicle || null;
    
    console.log('🔄 Vehicle assignment change:', {
      oldVehicleId,
      newVehicleId,
      driverId: selectedDriver.id
    });

    // If vehicle changed, update BOTH vehicles
    if (newVehicleId !== oldVehicleId) {
      // 1️⃣ Unassign old vehicle
      if (oldVehicleId) {
        try {
          const oldVehicleRes = await vehicleService.getById(oldVehicleId);
          const oldVehicle = oldVehicleRes?.data;
          if (oldVehicle) {
            const vehicleData = {
              ...oldVehicle,
              driver: null
            };
            delete vehicleData.id;
            delete vehicleData.createdAt;
            delete vehicleData.updatedAt;
            
            await vehicleService.update(oldVehicleId, vehicleData);
            console.log(`✅ Vehicle ${oldVehicleId} unassigned from driver`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to unassign old vehicle:', err);
        }
      }
      
      // 2️⃣ Assign new vehicle
      if (newVehicleId) {
        try {
          const newVehicleRes = await vehicleService.getById(newVehicleId);
          const newVehicle = newVehicleRes?.data;
          if (newVehicle) {
            const vehicleData = {
              ...newVehicle,
              driver: { id: selectedDriver.id }
            };
            delete vehicleData.id;
            delete vehicleData.createdAt;
            delete vehicleData.updatedAt;
            
            await vehicleService.update(newVehicleId, vehicleData);
            console.log(`✅ Vehicle ${newVehicleId} assigned to driver ${selectedDriver.name}`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to assign new vehicle:', err);
        }
      }
    }
      
      const updatedDriver = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone || null,
        licenseNumber: formData.licenseNumber.trim(),
        licenseExpiry: formData.licenseExpiry,
        driverId: formData.driverId,
        assignedVehicle: vehicleId ? { id: vehicleId } : null,
        safetyScore: parseInt(formData.safetyScore) || 100,
        training: formData.training || null,
        status: formData.status || 'Active',
      };

      const response = await driverService.update(selectedDriver.id, updatedDriver);
      
      if (response.success) {
        setSuccessMessage(`✅ Driver ${formData.name} updated successfully!`);
                // ✅ Dispatch events
        window.dispatchEvent(new CustomEvent('driversUpdated'));
        window.dispatchEvent(new CustomEvent('vehiclesUpdated'));
        window.dispatchEvent(new CustomEvent('driverAssignmentChanged', {
          detail: {
            driverId: selectedDriver.id,
            vehicleId: newVehicleId,
            assigned: !!newVehicleId
          }
        }));
        setShowEditDriverModal(false);
        setSelectedDriver(null);
        resetForm();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to update driver');
      }
    } catch (error) {
      console.error('Error updating driver:', error);
      setErrorMessage(error.message || 'Failed to update driver. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDriver = async () => {
    if (!selectedDriver) return;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await driverService.delete(selectedDriver.id);
      
      if (response.success) {
        setSuccessMessage(`✅ Driver ${selectedDriver.name} deleted successfully!`);
        setShowDeleteConfirm(false);
        setSelectedDriver(null);
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      setErrorMessage(error.message || 'Failed to delete driver. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (driver) => {
    setSelectedDriver(driver);
    setFormData({
      name: driver.name || '',
      email: driver.email || '',
      phone: driver.phone || '',
      password: '',
      confirmPassword: '',
      licenseNumber: driver.license_number || '',
      licenseExpiry: driver.license_expiry || '',
      driverId: driver.driver_id || '',
      assignedVehicleId: driver.assigned_vehicle || '',
      safetyScore: driver.safety_score || 100,
      training: driver.training || '',
      status: driver.status || 'Active',
      joinedDate: driver.joinedDate || new Date().toISOString().split('T')[0],
      totalTrips: driver.totalTrips || 0,
      totalDistance: driver.totalDistance || '0 km',
      violations: driver.violations || 0,
      trainingHistory: driver.trainingHistory || [],
      monthlyScores: driver.monthlyScores || Array(12).fill(80)
    });
    setShowEditDriverModal(true);
  };

  const openDeleteConfirm = (driver) => {
    setSelectedDriver(driver);
    setShowDeleteConfirm(true);
  };

  // ============================================
  // RENDER DRIVER CARD
  // ============================================
  const renderDriverCard = (driver) => {
    const isExpanded = expandedDriver === driver.id;
    const isActive = driver.status === 'Active' || driver.status === 'active';
    const score = driver.safety_score || 0;
    const vehicleLabel = getVehicleLabel(driver.assigned_vehicle);
    const hasExpiringLicense = driver.license_expiry && new Date(driver.license_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return (
      <div 
        key={driver.id} 
        className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
          isActive ? 'border-green-200 hover:border-green-400' : 'border-gray-200 hover:border-gray-400'
        } hover:shadow-md`}
      >
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedDriver(isExpanded ? null : driver.id)}
        >
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <img 
  src={driver.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=${isActive ? '16a34a' : '6b7280'}&color=fff&size=80`} 
  alt={driver.name} 
  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=${isActive ? '16a34a' : '6b7280'}&color=fff&size=80`;
  }}
/>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-gray-900">{driver.name}</h4>
                <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(driver.status)}`}>
                  {driver.status}
                </span>
                {score >= 90 && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
                <span>ID: {driver.driver_id || 'N/A'}</span>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="flex items-center gap-1">
                  <Truck size={12} /> {vehicleLabel}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${getScoreBg(score)} transition-all duration-500`} 
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold ${getScoreColor(score)}`}>
                    {score}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {hasExpiringLicense ? '⚠️ License Expiring' : '✅ License Valid'}
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Trips</p>
              <p className="text-sm font-medium">{driver.totalTrips || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Distance</p>
              <p className="text-sm font-medium">{driver.totalDistance || '0 km'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Violations/Alerts</p>
              <p className="text-sm font-medium text-red-600">{driver.violations || 0}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-gray-400">License</p>
              <p className="text-sm font-medium truncate">{driver.license_number || 'N/A'}</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-gray-400">Expiry</p>
              <p className={`text-sm font-medium ${hasExpiringLicense ? 'text-red-600' : 'text-gray-700'}`}>
                {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex items-center gap-2"><Mail size={14} className="text-gray-400" /> {driver.email || 'N/A'}</div>
                  <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {driver.phone || 'N/A'}</div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">License</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="text-gray-500">Number:</span> {driver.license_number || 'N/A'}</div>
                  <div><span className="text-gray-500">Expiry:</span> <span className={hasExpiringLicense ? 'text-red-600 font-medium' : ''}>{driver.license_expiry || 'N/A'}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div><span className="text-gray-500">Safety Score:</span> <span className={`font-medium ${getScoreColor(score)}`}>{score}</span></div>
                  <div><span className="text-gray-500">Training:</span> {driver.training || 'None'}</div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button 
                    onClick={() => navigateToTracking(driver)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                    disabled={!driver.assigned_vehicle}
                    title={!driver.assigned_vehicle ? 'No vehicle assigned' : 'Track vehicle'}
                  >
                    <Eye size={12} /> Track
                  </button>
                  <button 
                    onClick={() => openEditModal(driver)}
                    className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button 
                    onClick={() => openDeleteConfirm(driver)}
                    className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER LIST VIEW
  // ============================================
  const renderListView = () => (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search drivers..." 
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-1 ${
              showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter size={14} /> Filters
          </button>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Grid View"
            >
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-sm"></div>
                <div className="w-1.5 h-1.5 bg-gray-500 rounded-sm"></div>
              </div>
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="List View"
            >
              <div className="flex flex-col gap-0.5 w-4 h-4">
                <div className="w-4 h-1 bg-gray-500 rounded-sm"></div>
                <div className="w-4 h-1 bg-gray-500 rounded-sm"></div>
                <div className="w-4 h-1 bg-gray-500 rounded-sm"></div>
              </div>
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowAddDriverModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Add Driver
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Active">✅ Active</option>
              <option value="Inactive">❌ Inactive</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Scores</option>
              <option value="high">⭐ High (90+)</option>
              <option value="medium">🟡 Medium (80-89)</option>
              <option value="low">🔴 Low (&lt;80)</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">License Status</option>
              <option value="valid">✅ Valid</option>
              <option value="expiring">⚠️ Expiring Soon</option>
            </select>
            <button 
              onClick={() => {
                setStatusFilter('all');
                setSearchTerm('');
              }}
              className="text-sm text-blue-600 hover:underline"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="font-medium text-gray-700">Showing {filteredDrivers.length} of {drivers.length} drivers</span>
        <span>✅ {stats.active} Active</span>
        <span>⭐ {stats.highPerformers} High Performers</span>
        <span>⚠️ {stats.expiringLicenses} Licenses Expiring</span>
      </div>

      {filteredDrivers.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="space-y-3">
            {filteredDrivers.map(driver => renderDriverCard(driver))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-3">Driver</th>
                  <th className="p-3 hidden md:table-cell">ID</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Score</th>
                  <th className="p-3 hidden sm:table-cell">Trips</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img 
  src={driver.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=40`} 
  alt={driver.name} 
  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=40`;
  }}
/>
                        <div>
                          <p className="font-medium text-sm">{driver.name}</p>
                          <p className="text-xs text-gray-500">{driver.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell text-sm">{driver.driver_id || 'N/A'}</td>
                    <td className="p-3 text-sm">{getVehicleLabel(driver.assigned_vehicle)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${getScoreBg(driver.safety_score)} transition-all duration-500`} 
                            style={{ width: `${driver.safety_score}%` }} 
                          />
                        </div>
                        <span className={`text-sm font-medium ${getScoreColor(driver.safety_score)}`}>
                          {driver.safety_score}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell text-sm">{driver.totalTrips || 0}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setSelectedDriver(driver); }}
                          className="p-1 hover:bg-gray-200 rounded text-blue-600"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => openEditModal(driver)}
                          className="p-1 hover:bg-gray-200 rounded text-green-600"
                          title="Edit Driver"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => openDeleteConfirm(driver)}
                          className="p-1 hover:bg-gray-200 rounded text-red-600"
                          title="Delete Driver"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          <User size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No drivers found</p>
          <p className="text-sm">Try adjusting your filters or add a new driver</p>
          <button 
            onClick={() => setShowAddDriverModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus size={16} /> Add Driver
          </button>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER ANALYTICS VIEW
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Drivers</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
            <TrendingUp size={12} /> {stats.active} active
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Avg Safety Score</p>
          <p className="text-2xl font-bold text-blue-600">{stats.avgScore}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${stats.avgScore}%` }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">High Performers</p>
          <p className="text-2xl font-bold text-green-600">{stats.highPerformers}</p>
          <p className="text-xs text-gray-400">Score ≥ 90</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Licenses Expiring</p>
          <p className="text-2xl font-bold text-red-600">{stats.expiringLicenses}</p>
          <p className="text-xs text-gray-400">Within 90 days</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Assigned</p>
          <p className="text-2xl font-bold text-purple-600">{stats.assignedDrivers}</p>
          <p className="text-xs text-gray-400">{stats.unassignedDrivers} unassigned</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Trips</p>
          <p className="text-2xl font-bold text-orange-600">{stats.totalTrips}</p>
          <p className="text-xs text-gray-400">All time</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Shield size={16} className="text-blue-500" />
            Safety Score Distribution
          </h5>
          <div className="space-y-2">
            {[
              { label: '⭐ High (90+)', count: stats.highPerformers, color: 'bg-green-500' },
              { label: '🟡 Medium (80-89)', count: stats.mediumPerformers, color: 'bg-yellow-500' },
              { label: '🔴 Low (<80)', count: stats.lowPerformers, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count} ({stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} rounded-full h-2 transition-all duration-500`} 
                    style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Award size={16} className="text-yellow-500" />
            Top Performers
          </h5>
          <div className="space-y-2">
            {drivers.sort((a, b) => b.safety_score - a.safety_score).slice(0, 5).map((driver, index) => (
              <div key={driver.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                  <img 
  src={driver.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=32`} 
  alt={driver.name} 
  className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=32`;
  }}
/>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{driver.name}</p>
                    <p className="text-xs text-gray-500 truncate">{getVehicleLabel(driver.assigned_vehicle)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className={`text-sm font-bold ${getScoreColor(driver.safety_score)}`}>{driver.safety_score}</span>
                  {driver.safety_score >= 90 && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          Monthly Score Trends
        </h5>
        <div className="h-48 flex items-end justify-between gap-1">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, i) => {
            const avg = drivers.length > 0 ? Math.round(drivers.reduce((sum, d) => sum + (d.monthlyScores ? d.monthlyScores[i] : 80), 0) / drivers.length) : 80;
            return (
              <div key={month} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-full rounded-t ${avg >= 90 ? 'bg-green-400' : avg >= 80 ? 'bg-yellow-400' : 'bg-red-400'} transition-all duration-500`}
                  style={{ height: `${(avg / 100) * 100}%` }}
                >
                  <div className="text-[8px] text-white text-center pt-1">{avg}</div>
                </div>
                <span className="text-[8px] text-gray-400 mt-1">{month}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER TRAINING VIEW
  // ============================================
  const renderTrainingView = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Training Programs</p>
          <p className="text-2xl font-bold">
            {drivers.reduce((sum, d) => sum + (d.trainingHistory ? d.trainingHistory.length : 0), 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">
            {drivers.reduce((sum, d) => sum + (d.trainingHistory ? d.trainingHistory.filter(t => t.status === 'Completed').length : 0), 0)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {drivers.reduce((sum, d) => sum + (d.trainingHistory ? d.trainingHistory.filter(t => t.status === 'Pending').length : 0), 0)}
          </p>
        </div>
      </div>

      {drivers.some(d => d.trainingHistory && d.trainingHistory.length > 0) ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Driver</th>
                <th className="p-3 hidden sm:table-cell">Training</th>
                <th className="p-3 hidden md:table-cell">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 hidden lg:table-cell">Score</th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                driver.trainingHistory && driver.trainingHistory.length > 0 ? (
                  driver.trainingHistory.map((training, idx) => (
                    <tr key={`${driver.id}-${idx}`} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <img 
  src={driver.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=32`} 
  alt={driver.name} 
  className="w-8 h-8 rounded-full object-cover"
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=32`;
  }}
/>
                          <span className="font-medium text-sm">{driver.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm hidden sm:table-cell">{training.name}</td>
                      <td className="p-3 text-sm hidden md:table-cell">{training.date}</td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTrainingStatusColor(training.status)}`}>
                          {training.status}
                        </span>
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {training.score > 0 ? `${training.score}%` : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr key={driver.id} className="border-b border-gray-100">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=16a34a&color=fff&size=32`} alt={driver.name} className="w-8 h-8 rounded-full" />
                        <span className="font-medium text-sm">{driver.name}</span>
                      </div>
                    </td>
                    <td colSpan="4" className="p-3 text-sm text-gray-400">No training records</td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Award size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No training records available</p>
          <p className="text-sm">Assign training to drivers to track their progress</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER PROFILE MODAL
  // ============================================
  const renderProfileModal = () => {
    if (!selectedDriver) return null;
    
    const score = selectedDriver.safety_score || 0;
    const hasExpiringLicense = selectedDriver.license_expiry && new Date(selectedDriver.license_expiry) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setSelectedDriver(null)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setSelectedDriver(null)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-6 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <img 
  src={selectedDriver.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDriver.name)}&background=16a34a&color=fff&size=80`} 
  alt={selectedDriver.name} 
  className="w-20 h-20 rounded-full border-2 border-white shadow-lg object-cover"
  onError={(e) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDriver.name)}&background=16a34a&color=fff&size=80`;
  }}
/>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white">{selectedDriver.name}</h2>
                <p className="text-blue-100 text-sm">{selectedDriver.driver_id || 'N/A'} · {getVehicleLabel(selectedDriver.assigned_vehicle)}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(selectedDriver.status)}`}>
                    {selectedDriver.status}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getScoreBadge(score)}`}>
                    Score: {score}
                  </span>
                  {hasExpiringLicense && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                      ⚠️ License Expiring
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">License Number</p>
                <p className="font-medium">{selectedDriver.license_number || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">License Expiry</p>
                <p className={`font-medium ${hasExpiringLicense ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedDriver.license_expiry || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{selectedDriver.phone || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{selectedDriver.email || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Joined</p>
                <p className="font-medium">{selectedDriver.joinedDate || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Total Distance</p>
                <p className="font-medium">{selectedDriver.totalDistance || '0 km'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Total Trips</p>
                <p className="font-medium">{selectedDriver.totalTrips || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Violations</p>
                <p className="font-medium text-red-600">{selectedDriver.violations || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg col-span-2">
                <p className="text-xs text-gray-500">Training</p>
                <p className="font-medium">{selectedDriver.training || 'No training assigned'}</p>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Training History</h4>
              <div className="space-y-1">
                {selectedDriver.trainingHistory && selectedDriver.trainingHistory.length > 0 ? (
                  selectedDriver.trainingHistory.map((training, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{training.name}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTrainingStatusColor(training.status)}`}>
                          {training.status}
                        </span>
                        {training.score > 0 && (
                          <span className="text-xs font-medium">{training.score}%</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">No training records</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <button 
                onClick={() => openEditModal(selectedDriver)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Edit Driver
              </button>
              <button 
                onClick={() => openDeleteConfirm(selectedDriver)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditDriverModal : showAddDriverModal;
    if (!isOpen) return null;

    const handleSubmit = isEdit ? handleEditDriver : handleAddDriver;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => { isEdit ? setShowEditDriverModal(false) : setShowAddDriverModal(false); resetForm(); }}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => { isEdit ? setShowEditDriverModal(false) : setShowAddDriverModal(false); resetForm(); }}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Driver' : 'Add New Driver'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update driver information' : 'Enter driver details'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email for login"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              {!isEdit && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input 
                        type="password" 
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Min 6 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                      <Key size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Driver ID</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., RFID-001"
                  value={formData.driverId}
                  onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter license number"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry *</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({...formData, licenseExpiry: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Vehicle</label>
                {vehicles.length === 0 ? (
                  <div className="w-full px-4 py-2 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    No vehicles found. Please add vehicles first.
                  </div>
                ) : getAvailableVehicles().length === 0 ? (
                  <div className="w-full px-4 py-2 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle size={16} />
                    All vehicles are already assigned.
                  </div>
                ) : (
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.assignedVehicleId || ''}
                    onChange={(e) => setFormData({...formData, assignedVehicleId: e.target.value})}
                  >
                    <option value="">-- Select a vehicle --</option>
                    {getAvailableVehicles().map((v) => {
                      const isAssignedToCurrent = v.driver_id === selectedDriver?.id;
                      return (
                        <option key={v.id} value={v.id}>
                          {v.reg || v.id} - {v.make} {v.model}
                          {isAssignedToCurrent ? ' ✅ Currently assigned' : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Safety Score</label>
                <input 
                  type="number" 
                  min="0" 
                  max="100"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="100"
                  value={formData.safetyScore}
                  onChange={(e) => setFormData({...formData, safetyScore: parseInt(e.target.value) || 100})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Training</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Training program name"
                  value={formData.training}
                  onChange={(e) => setFormData({...formData, training: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Join Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.joinedDate}
                  onChange={(e) => setFormData({...formData, joinedDate: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? 'Update Driver' : 'Create Driver'}
              </button>
              <button 
                type="button"
                onClick={() => { isEdit ? setShowEditDriverModal(false) : setShowAddDriverModal(false); resetForm(); }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>

            {!isEdit && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                ⚠️ Driver will be able to login with the email and password you set.
              </p>
            )}
          </form>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedDriver) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Driver?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete "{selectedDriver.name}"? This will also deactivate their login account.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteDriver}
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Deleting...' : 'Yes, Delete'}
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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading drivers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle size={48} className="mx-auto" />
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
              <User className="text-blue-600" />
              Driver Management
              <span className="text-sm font-normal text-gray-500">({drivers.length} drivers)</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage drivers, licenses, and performance</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated || 'Just now'}
            </span>
            <button
              onClick={() => loadData(false)}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
            </button>
            <button 
              onClick={() => setShowAddDriverModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add Driver
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'list', label: 'Drivers', icon: User },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'training', label: 'Training', icon: Award },
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
        {activeTab === 'list' && renderListView()}
        {activeTab === 'analytics' && renderAnalyticsView()}
        {activeTab === 'training' && renderTrainingView()}
      </div>

      {renderProfileModal()}
      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
    </div>
  );
};

export default Drivers;