// src/pages/car-owner/Vehicles.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Upload, Package, FileText, History, FileWarning,
  X, Search, Filter, Download, Edit,
  Truck, CheckCircle, AlertCircle,
  BarChart3, Trash2, Save, Users, RefreshCw,
  ChevronRight, ChevronDown, Calendar, Clock,
  Fuel, Wrench, MapPin, Phone, Mail,
  AlertTriangle, Award, TrendingUp, TrendingDown,
  Eye, EyeOff, Settings, Printer, Copy
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService, 
  tenantService
} from '../../services/api';

// ✅ FIX: Rename the prop to avoid conflict with state variable
const Vehicles = ({ setActiveTab: setActiveTabProp }) => {
  const { currentUser } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [accessoryInput, setAccessoryInput] = useState('');
  const [expandedVehicle, setExpandedVehicle] = useState(null);
  const [viewMode, setViewMode] = useState('grid');

  // ============================================
  // FORM DATA
  // ============================================
  const [formData, setFormData] = useState({
    registration: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vin: '',
    category: 'Pickup',
    status: 'Active',
    owner: '',
    costCentre: '',
    location: '',
    custodian: '',
    mileage: '',
    color: '',
    fuelType: 'Diesel',
    fuelTankCapacity: '',
    engineSize: '',
    transmission: 'Manual',
    acquisitionDate: '',
    acquisitionCost: '',
    licenseExpiry: '',
    roadworthy: '',
    insurance: '',
    permit: '',
    accessories: [],
    documents: [],
    statusHistory: [],
    driverId: '',
  });

  // ============================================
  // VEHICLE HEALTH HELPERS
  // ============================================
  const getVehicleHealth = (vehicle) => {
    let score = 85;
    
    if (vehicle.mileage) {
      const miles = parseInt(String(vehicle.mileage).replace(/,/g, '')) || 0;
      if (miles > 100000) score -= 15;
      else if (miles > 50000) score -= 5;
    }
    
    if (vehicle.licenseExpiry) {
      const expiry = new Date(vehicle.licenseExpiry);
      const now = new Date();
      const days = (expiry - now) / (1000 * 60 * 60 * 24);
      if (days < 30) score -= 10;
      else if (days < 90) score -= 5;
    }
    
    if (vehicle.status === 'Maintenance') score -= 15;
    if (vehicle.status === 'Decommissioned') score -= 30;
    
    return Math.max(0, Math.min(100, score));
  };

  const getNextService = (vehicle) => {
    const miles = parseInt(String(vehicle.mileage).replace(/,/g, '')) || 0;
    const next = 5000 - (miles % 5000);
    return next > 0 ? next : 5000 - (Math.abs(next) % 5000);
  };

  const getServiceDue = (vehicle) => {
    const due = getNextService(vehicle);
    if (due < 500) return 'urgent';
    if (due < 1500) return 'warning';
    return 'ok';
  };

  const getHealthColor = (health) => {
    if (health >= 80) return 'text-green-600';
    if (health >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (health) => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);
    setErrorMessage('');

    try {
      const tenantId = currentUser?.tenantId;
      if (!tenantId) {
        setVehicles([]);
        setDrivers([]);
        setIsLoading(false);
        return;
      }

      const [vehiclesRes, driversRes] = await Promise.all([
        vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
        driverService.getAll(tenantId).catch(() => ({ data: [] }))
      ]);

      let vehiclesData = vehiclesRes.data || [];
      let driversData = driversRes.data || [];

      const normalizedVehicles = vehiclesData.map(v => {
        let accessories = v.accessories || [];
        if (typeof accessories === 'string') {
          try { accessories = JSON.parse(accessories); } catch (e) { accessories = []; }
        }
        if (!Array.isArray(accessories)) accessories = [];

        return {
          ...v,
          id: v.id || v.vehicleId,
          driver_id: v.driverId || v.driver_id || null,
          driver_name: v.driverName || v.driver_name || null,
          reg: v.registration || v.reg || v.id,
          status: v.status || 'Active',
          health: getVehicleHealth(v),
          nextService: getNextService(v),
          serviceDue: getServiceDue(v),
          fuelEfficiency: v.fuelEfficiency || Math.round(6 + Math.random() * 4),
          lastServiceDate: v.lastServiceDate || null,
        };
      });

      setVehicles(normalizedVehicles);
      setDrivers(driversData);
      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message || 'Failed to load vehicles. Please try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // ============================================
  // USE EFFECTS
  // ============================================
  useEffect(() => {
    loadData(true);
    const intervalId = setInterval(() => {
      loadData(false);
    }, 30000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  // ============================================
// LISTEN FOR FUEL REFILL UPDATES
// ============================================
useEffect(() => {
  const handleFuelUpdate = (event) => {
    console.log('🔄 Fuel refill event received:', event.type, event.detail);
    console.log('📊 Refreshing vehicles to show updated mileage...');
    loadData(false);
  };

  // Listen for fuel refill events
  window.addEventListener('fuelRefillAdded', handleFuelUpdate);
  window.addEventListener('fuelRefillUpdated', handleFuelUpdate);
  window.addEventListener('fuelRefillDeleted', handleFuelUpdate);

  // Also listen for any data update events
  window.addEventListener('vehiclesUpdated', handleFuelUpdate);
  

  return () => {
    window.removeEventListener('fuelRefillAdded', handleFuelUpdate);
    window.removeEventListener('fuelRefillUpdated', handleFuelUpdate);
    window.removeEventListener('fuelRefillDeleted', handleFuelUpdate);
    window.removeEventListener('vehiclesUpdated', handleFuelUpdate);
  };
}, []);

// ============================================
// LISTEN FOR MAINTENANCE COMPLETED EVENTS
// ============================================
useEffect(() => {
  const handleMaintenanceComplete = (event) => {
    console.log('🔄 Maintenance completed, refreshing vehicles...', event.detail);
    loadData(false);
  };
  
  const handleVehicleStatusChange = (event) => {
    console.log('🔄 Vehicle status changed, refreshing...', event.detail);
    loadData(false);
  };

  window.addEventListener('maintenanceCompleted', handleMaintenanceComplete);
  window.addEventListener('vehicleStatusChanged', handleVehicleStatusChange);

  return () => {
    window.removeEventListener('maintenanceCompleted', handleMaintenanceComplete);
    window.removeEventListener('vehicleStatusChanged', handleVehicleStatusChange);
  };
}, []);

useEffect(() => {
  const handleDriverAssignmentChange = (event) => {
    console.log('🔄 Driver assignment changed, refreshing vehicles...', event.detail);
    loadData(false);
  };

  window.addEventListener('driverAssignmentChanged', handleDriverAssignmentChange);
  
  return () => {
    window.removeEventListener('driverAssignmentChanged', handleDriverAssignmentChange);
  };
}, []);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'Active' || v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'Maintenance' || v.status === 'maintenance').length,
    decommissioned: vehicles.filter(v => v.status === 'Decommissioned' || v.status === 'decommissioned').length,
    avgAge: vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (new Date().getFullYear() - parseInt(v.year)), 0) / vehicles.length) : 0,
    totalMileage: vehicles.reduce((sum, v) => sum + parseInt(String(v.mileage).replace(/,/g, '').replace(' km', '') || 0), 0),
    expiringLicenses: vehicles.filter(v => {
      if (!v.licenseExpiry) return false;
      const expiry = new Date(v.licenseExpiry);
      const now = new Date();
      const diff = (expiry - now) / (1000 * 60 * 60 * 24);
      return diff < 90 && diff > 0;
    }).length,
    assignedVehicles: vehicles.filter(v => v.driverId || v.driver_id).length,
    unassignedVehicles: vehicles.filter(v => !v.driverId && !v.driver_id).length,
    serviceDueUrgent: vehicles.filter(v => getServiceDue(v) === 'urgent').length,
    serviceDueWarning: vehicles.filter(v => getServiceDue(v) === 'warning').length,
    avgFuelEfficiency: vehicles.length > 0 
      ? Math.round(vehicles.reduce((sum, v) => sum + (v.fuelEfficiency || 0), 0) / vehicles.length) 
      : 0,
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-700',
      'active': 'bg-green-100 text-green-700',
      'Maintenance': 'bg-yellow-100 text-yellow-700',
      'maintenance': 'bg-yellow-100 text-yellow-700',
      'Decommissioned': 'bg-gray-100 text-gray-700',
      'decommissioned': 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Active':
      case 'active':
        return <CheckCircle size={12} className="text-green-600" />;
      case 'Maintenance':
      case 'maintenance':
        return <AlertCircle size={12} className="text-yellow-600" />;
      case 'Decommissioned':
      case 'decommissioned':
        return <X size={12} className="text-gray-600" />;
      default: return null;
    }
  };

  const getAssignedDriverName = (vehicle) => {
    if (!vehicle.driverId && !vehicle.driver_id) return 'Unassigned';
    const driverId = vehicle.driverId || vehicle.driver_id;
    const driver = drivers.find(d => d.id === driverId);
    return driver ? driver.name : 'Unknown Driver';
  };

  // ============================================
  // FILTER VEHICLES
  // ============================================
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = (vehicle.registration || vehicle.reg || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (vehicle.make || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (vehicle.model || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter || 
                          vehicle.status?.toLowerCase() === statusFilter.toLowerCase();
    const matchesCategory = categoryFilter === 'all' || vehicle.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // ============================================
  // NAVIGATION HELPERS
  // ============================================
  const navigateToTracking = (vehicle) => {
    try {
      localStorage.setItem('tracking_selected_vehicle', vehicle.reg || vehicle.registration);
      if (typeof window.setActiveTab === 'function') {
        window.setActiveTab('tracking');
      } else {
        window.dispatchEvent(new CustomEvent('navigateTo', { 
          detail: { tab: 'tracking', vehicle: vehicle.reg || vehicle.registration } 
        }));
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  const navigateToMaintenance = (vehicle) => {
    localStorage.setItem('selected_vehicle_id', vehicle.id);
    localStorage.setItem('selected_vehicle_reg', vehicle.reg || vehicle.registration);
    if (setActiveTabProp) {
      setActiveTabProp('maintenance');
    } else {
      window.dispatchEvent(new CustomEvent('navigateTo', { 
        detail: { tab: 'maintenance', vehicleId: vehicle.id } 
      }));
    }
  };

  // ============================================
  // DELETE VEHICLE - WITH DRIVER UNASSIGNMENT
  // ============================================
  const handleDeleteVehicle = async () => {
    if (!selectedVehicle) return;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1️⃣ Unassign driver first
      const driverId = selectedVehicle.driverId || selectedVehicle.driver_id || null;
      if (driverId) {
        try {
          const driver = drivers.find(d => d.id === driverId);
          if (driver) {
            console.log(`🔄 Unassigning vehicle from driver ${driver.name} before deletion`);
            
            const driverData = {
              name: driver.name,
              email: driver.email || '',
              phone: driver.phone || '',
              licenseNumber: driver.license_number || driver.licenseNumber || '',
              licenseExpiry: driver.license_expiry || driver.licenseExpiry || '',
              driverId: driver.driver_id || driver.driverId || '',
              assignedVehicle: null, // ✅ Remove vehicle assignment
              safetyScore: driver.safety_score || driver.safetyScore || 100,
              training: driver.training || '',
              status: driver.status || 'Active',
            };

            await driverService.update(driverId, driverData);
            console.log(`✅ Vehicle unassigned from driver ${driver.name}`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to unassign driver before deletion:', err);
        }
      }

      // 2️⃣ Delete the vehicle
      const vehicleId = selectedVehicle.id;
      console.log(`🗑️ Deleting vehicle ${vehicleId}`);
      const response = await vehicleService.delete(vehicleId);
      
      if (response.success) {
        setSuccessMessage(`Vehicle ${selectedVehicle.reg || selectedVehicle.registration} deleted successfully!`);
        setShowDeleteConfirm(false);
        setSelectedVehicle(null);
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to delete vehicle');
      }
    } catch (error) {
      console.error('Error deleting vehicle:', error);
      setErrorMessage(error.message || 'Failed to delete vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      registration: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vin: '',
      category: 'Pickup',
      status: 'Active',
      owner: '',
      costCentre: '',
      location: '',
      custodian: '',
      mileage: '',
      color: '',
      fuelType: 'Diesel',
      fuelTankCapacity: '',
      engineSize: '',
      transmission: 'Manual',
      acquisitionDate: '',
      acquisitionCost: '',
      licenseExpiry: '',
      roadworthy: '',
      insurance: '',
      permit: '',
      accessories: [],
      documents: [],
      statusHistory: [],
      driverId: '',
    });
    setAccessoryInput('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openEditModal = (vehicle) => {
    let accessories = vehicle.accessories || [];
    if (typeof accessories === 'string') {
      try { accessories = JSON.parse(accessories); } catch (e) { accessories = []; }
    }
    if (!Array.isArray(accessories)) accessories = [];

    setSelectedVehicle(vehicle);
    setFormData({
      registration: vehicle.registration || vehicle.reg || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || new Date().getFullYear(),
      vin: vehicle.vin || '',
      category: vehicle.category || 'Pickup',
      status: vehicle.status || 'Active',
      owner: vehicle.owner || '',
      costCentre: vehicle.costCentre || '',
      location: vehicle.location || '',
      custodian: vehicle.custodian || '',
      mileage: vehicle.mileage || '',
      color: vehicle.color || '',
      fuelType: vehicle.fuelType || 'Diesel',
      fuelTankCapacity: vehicle.fuelTankCapacity || '',
      engineSize: vehicle.engineSize || '',
      transmission: vehicle.transmission || 'Manual',
      acquisitionDate: vehicle.acquisitionDate || '',
      acquisitionCost: vehicle.acquisitionCost || '',
      licenseExpiry: vehicle.licenseExpiry || '',
      roadworthy: vehicle.roadworthy || '',
      insurance: vehicle.insurance || '',
      permit: vehicle.permit || '',
      accessories: accessories,
      documents: vehicle.documents || [],
      statusHistory: vehicle.statusHistory || [],
      driverId: vehicle.driverId || vehicle.driver_id || '',
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowDeleteConfirm(true);
  };

  const handleAddVehicle = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.registration?.trim()) {
      setErrorMessage('Registration number is required');
      setIsLoading(false);
      return;
    }

    try {
      const tenantId = currentUser?.tenantId;
      if (!tenantId) {
        setErrorMessage('No tenant found');
        setIsLoading(false);
        return;
      }

      const newVehicle = {
        tenant: { id: tenantId },
        registration: formData.registration.trim(),
        vin: formData.vin?.trim() || null,
        make: formData.make.trim(),
        model: formData.model.trim(),
        year: formData.year ? parseInt(formData.year) : null,
        category: formData.category || 'Pickup',
        status: formData.status || 'Active',
        mileage: formData.mileage ? parseFloat(formData.mileage.replace(/,/g, '')) : null,
        owner: formData.owner || null,
        costCentre: formData.costCentre || tenantId,
        location: formData.location || null,
        custodian: formData.custodian || null,
        color: formData.color || null,
        fuelType: formData.fuelType || null,
        fuelTankCapacity: formData.fuelTankCapacity ? parseFloat(formData.fuelTankCapacity) : null,
        engineSize: formData.engineSize || null,
        transmission: formData.transmission || null,
        acquisitionDate: formData.acquisitionDate || null,
        acquisitionCost: formData.acquisitionCost ? parseFloat(formData.acquisitionCost.replace(/,/g, '')) : null,
        licenseExpiry: formData.licenseExpiry || null,
        roadworthy: formData.roadworthy || null,
        insurance: formData.insurance || null,
        permit: formData.permit || null,
        driver: formData.driverId ? { id: formData.driverId } : null,
        accessories: JSON.stringify(formData.accessories || []),
      };

      const response = await vehicleService.create(newVehicle);
      if (response.success) {
        setSuccessMessage(`Vehicle ${newVehicle.registration} added successfully!`);
        setShowAddModal(false);
        resetForm();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to add vehicle');
      }
    } catch (error) {
      console.error('Error adding vehicle:', error);
      setErrorMessage(error.message || 'Failed to add vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditVehicle = async () => {
    if (!selectedVehicle) return;
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {

      // ✅ ============================================
    // ✅ ADD THIS: Handle driver assignment changes
    // ✅ ============================================
    const newDriverId = formData.driverId || null;
    const oldDriverId = selectedVehicle.driverId || selectedVehicle.driver_id || null;
    
    console.log('🔄 Driver assignment change:', {
      oldDriverId,
      newDriverId,
      vehicleId: selectedVehicle.id
    });

    // If driver changed, update BOTH drivers
    if (newDriverId !== oldDriverId) {
      // 1️⃣ Unassign old driver
      if (oldDriverId) {
        try {
          const oldDriver = drivers.find(d => d.id === oldDriverId);
          if (oldDriver) {
            const driverData = {
              name: oldDriver.name,
              email: oldDriver.email || '',
              phone: oldDriver.phone || '',
              licenseNumber: oldDriver.license_number || oldDriver.licenseNumber || '',
              licenseExpiry: oldDriver.license_expiry || oldDriver.licenseExpiry || '',
              driverId: oldDriver.driver_id || oldDriver.driverId || '',
              assignedVehicle: null,
              safetyScore: oldDriver.safety_score || oldDriver.safetyScore || 100,
              training: oldDriver.training || '',
              status: oldDriver.status || 'Active',
            };

            await driverService.update(oldDriverId, driverData);
            console.log(`✅ Driver ${oldDriver.name} unassigned from vehicle`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to unassign old driver:', err);
        }
      }
      
      // 2️⃣ Assign new driver
      if (newDriverId) {
        try {
          const newDriver = drivers.find(d => d.id === newDriverId);
          if (newDriver) {
            const driverData = {
              name: newDriver.name,
              email: newDriver.email || '',
              phone: newDriver.phone || '',
              licenseNumber: newDriver.license_number || newDriver.licenseNumber || '',
              licenseExpiry: newDriver.license_expiry || newDriver.licenseExpiry || '',
              driverId: newDriver.driver_id || newDriver.driverId || '',
              assignedVehicle: { id: selectedVehicle.id },
              safetyScore: newDriver.safety_score || newDriver.safetyScore || 100,
              training: newDriver.training || '',
              status: newDriver.status || 'Active',
            };

            await driverService.update(newDriverId, driverData);
            console.log(`✅ Driver ${newDriver.name} assigned to vehicle ${selectedVehicle.reg}`);
          }
        } catch (err) {
          console.warn('⚠️ Failed to assign new driver:', err);
        }
      }
    }
      const updatedVehicle = {
        registration: formData.registration?.trim() || selectedVehicle.registration || selectedVehicle.reg,
        vin: formData.vin || selectedVehicle.vin,
        make: formData.make?.trim() || selectedVehicle.make,
        model: formData.model?.trim() || selectedVehicle.model,
        year: formData.year || selectedVehicle.year,
        category: formData.category || selectedVehicle.category,
        status: formData.status || selectedVehicle.status,
        mileage: formData.mileage || selectedVehicle.mileage,
        owner: formData.owner || selectedVehicle.owner,
        costCentre: formData.costCentre || selectedVehicle.costCentre,
        location: formData.location || selectedVehicle.location,
        custodian: formData.custodian || selectedVehicle.custodian,
        color: formData.color || selectedVehicle.color,
        fuelType: formData.fuelType || selectedVehicle.fuelType,
        fuelTankCapacity: formData.fuelTankCapacity ? parseFloat(formData.fuelTankCapacity) : null,
        engineSize: formData.engineSize || selectedVehicle.engineSize,
        transmission: formData.transmission || selectedVehicle.transmission,
        acquisitionDate: formData.acquisitionDate || selectedVehicle.acquisitionDate,
        acquisitionCost: formData.acquisitionCost || selectedVehicle.acquisitionCost,
        licenseExpiry: formData.licenseExpiry || selectedVehicle.licenseExpiry,
        roadworthy: formData.roadworthy || selectedVehicle.roadworthy,
        insurance: formData.insurance || selectedVehicle.insurance,
        permit: formData.permit || selectedVehicle.permit,
        driver: formData.driverId ? { id: formData.driverId } : null,
        accessories: JSON.stringify(formData.accessories || []),
      };

      const response = await vehicleService.update(selectedVehicle.id, updatedVehicle);
      if (response.success) {
        setSuccessMessage('Vehicle updated successfully!');
        setShowEditModal(false);
        setSelectedVehicle(null);
        resetForm();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to update vehicle');
      }
    } catch (error) {
      console.error('Error updating vehicle:', error);
      setErrorMessage(error.message || 'Failed to update vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // RENDER VEHICLE CARD
  // ============================================
  const renderVehicleCard = (vehicle, index) => {
    const isExpanded = expandedVehicle === vehicle.id;
    const health = vehicle.health || getVehicleHealth(vehicle);
    const serviceDue = getServiceDue(vehicle);
    const driverName = getAssignedDriverName(vehicle);
    const isActive = vehicle.status === 'Active' || vehicle.status === 'active';
    const inMaintenance = vehicle.status === 'Maintenance' || vehicle.status === 'maintenance';
    
    let accessories = vehicle.accessories || [];
    if (typeof accessories === 'string') {
      try { accessories = JSON.parse(accessories); } catch (e) { accessories = []; }
    }
    if (!Array.isArray(accessories)) accessories = [];

    return (
      <div 
        key={vehicle.id || index}
        className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden ${
          inMaintenance ? 'border-yellow-300 shadow-sm shadow-yellow-100' :
          isActive ? 'border-green-200 hover:border-green-400' : 
          'border-gray-200 hover:border-gray-400'
        } hover:shadow-md`}
      >
        <div 
          className="p-4 cursor-pointer"
          onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  inMaintenance ? 'bg-yellow-100' :
                  isActive ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Truck size={20} className={
                    inMaintenance ? 'text-yellow-600' :
                    isActive ? 'text-green-600' : 'text-gray-600'
                  } />
                </div>
                <div className={`absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  inMaintenance ? 'bg-yellow-500 animate-pulse' :
                  isActive ? 'bg-green-500' : 'bg-gray-400'
                }`} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-gray-900 truncate">
                    {vehicle.reg || vehicle.registration}
                  </h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(vehicle.status)}`}>
                    {getStatusIcon(vehicle.status)}
                    {vehicle.status}
                  </span>
                  {inMaintenance && (
                    <span className="text-[10px] bg-yellow-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      🔧 Service
                    </span>
                  )}
                  {/* ✅ Show maintenance reason */}
{inMaintenance && vehicle.maintenanceReason && (
  <div className="mt-1 text-[10px] text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 flex items-start gap-1">
    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
    <span className="break-words">{vehicle.maintenanceReason}</span>
  </div>
)}
                 
                  {serviceDue === 'urgent' && (
                    <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                      ⚠️ Due Now
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5 flex-wrap">
                  <span>{vehicle.make} {vehicle.model} · {vehicle.year}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span>{vehicle.category}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="text-xs">{vehicle.color || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0 ml-2">
              <div className="text-right hidden sm:block">
                <div className="flex items-center gap-2">
                  <div className="w-12 bg-gray-200 rounded-full h-1.5">
                    <div 
                      className={`h-1.5 rounded-full ${getHealthBg(health)} transition-all duration-500`} 
                      style={{ width: `${health}%` }}
                    />
                  </div>
                  <span className={`text-xs font-bold ${getHealthColor(health)}`}>
                    {health}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {serviceDue === 'urgent' ? 'Service Overdue' :
                   serviceDue === 'warning' ? 'Service Soon' : 'Healthy'}
                </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100">
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Mileage</p>
              <p className="text-sm font-medium">{vehicle.mileage || '0 km'}</p>
            </div>
            <div className="text-center">
    <p className="text-[10px] text-gray-400">Fuel</p>
    <div className="flex items-center justify-center gap-1">
        <Fuel size={12} className="text-blue-500" />
        <div className="flex items-center gap-1">
            <div className="w-10 bg-gray-200 rounded-full h-1.5">
                <div 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                        (vehicle.currentFuelLevel || 0) > 50 ? 'bg-green-500' :
                        (vehicle.currentFuelLevel || 0) > 25 ? 'bg-yellow-500' :
                        'bg-red-500 animate-pulse'
                    }`}
                    style={{ 
                        width: `${Math.min((vehicle.currentFuelLevel || 0) / (vehicle.fuelTankCapacity || 80) * 100, 100)}%` 
                    }}
                />
            </div>
            <span className="text-xs font-medium">
                {Math.round((vehicle.currentFuelLevel || 0) / (vehicle.fuelTankCapacity || 80) * 100)}%
            </span>
        </div>
    </div>
</div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400">Driver</p>
              <p className="text-sm font-medium truncate" title={driverName}>
                {driverName.length > 12 ? driverName.substring(0, 12) + '...' : driverName}
              </p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-gray-400">License</p>
              <p className={`text-sm font-medium ${
                vehicle.licenseExpiry && new Date(vehicle.licenseExpiry) < new Date() 
                  ? 'text-red-600' : 'text-gray-700'
              }`}>
                {vehicle.licenseExpiry ? new Date(vehicle.licenseExpiry).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-[10px] text-gray-400">Next Service</p>
              <p className={`text-sm font-medium ${
                serviceDue === 'urgent' ? 'text-red-600' :
                serviceDue === 'warning' ? 'text-yellow-600' : 'text-green-600'
              }`}>
                {getNextService(vehicle)} km
              </p>
            </div>
          </div>
        </div>

                {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Details</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">VIN:</span> <span className="font-medium">{vehicle.vin || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Engine:</span> <span className="font-medium">{vehicle.engineSize || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Transmission:</span> <span className="font-medium">{vehicle.transmission || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Fuel Type:</span> <span className="font-medium">{vehicle.fuelType || 'N/A'}</span></div>
                  <div className="flex justify-between">
    <span className="text-gray-500">Fuel Tank:</span>
    <span className="font-medium">
        {vehicle.fuelTankCapacity ? `${vehicle.fuelTankCapacity} L` : 'N/A'}
    </span>
</div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Assignment</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Driver:</span> <span className="font-medium text-blue-600">{driverName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Location:</span> <span className="font-medium">{vehicle.location || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Custodian:</span> <span className="font-medium">{vehicle.custodian || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Cost Centre:</span> <span className="font-medium">{vehicle.costCentre || 'N/A'}</span></div>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Accessories</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {accessories.length > 0 ? (
                    accessories.map((acc, i) => (
                      <span key={i} className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                        {acc}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No accessories</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button 
                    onClick={() => navigateToTracking(vehicle)}
                    className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                  >
                    <Eye size={12} /> Track
                  </button>
                  <button 
                    onClick={() => navigateToMaintenance(vehicle)}
                    className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-1"
                  >
                    <Wrench size={12} /> Service
                  </button>
                  <button 
                    onClick={() => openEditModal(vehicle)}
                    className="text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1"
                  >
                    <Edit size={12} /> Edit
                  </button>
                  <button 
                    onClick={() => setShowDocumentModal(true)}
                    className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                  >
                    <FileText size={12} /> Docs
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span>📍 {vehicle.location || 'No location set'}</span>
              <span>📅 Acquired: {vehicle.acquisitionDate || 'N/A'}</span>
              <span>💰 Cost: {vehicle.acquisitionCost || 'N/A'}</span>
            </div>

            {/* ✅ Maintenance Reason - Fixed indentation and placement */}
            {inMaintenance && vehicle.maintenanceReason && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-medium text-yellow-700 flex items-center gap-1">
                  <AlertCircle size={14} /> Maintenance Reason:
                </p>
                <p className="text-xs text-yellow-700 mt-0.5">{vehicle.maintenanceReason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showAddModal;
    if (!isOpen) return null;

    const accessoriesList = Array.isArray(formData.accessories) ? formData.accessories : [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); }}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); }}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Vehicle' : 'Add New Vehicle'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update vehicle details' : 'Enter vehicle information'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., LEC-1152"
                  value={formData.registration}
                  onChange={(e) => setFormData({...formData, registration: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Vehicle Identification Number"
                  value={formData.vin}
                  onChange={(e) => setFormData({...formData, vin: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Make *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Toyota"
                  value={formData.make}
                  onChange={(e) => setFormData({...formData, make: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Hilux"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2023"
                  value={formData.year}
                  onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Pickup">Pickup</option>
                  <option value="SUV">SUV</option>
                  <option value="Truck">Truck</option>
                  <option value="Van">Van</option>
                  <option value="Car">Car</option>
                  <option value="Bus">Bus</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Active">Active</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Decommissioned">Decommissioned</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign Driver</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.driverId}
                  onChange={(e) => setFormData({...formData, driverId: e.target.value})}
                >
                  <option value="">No Driver Assigned</option>
                  {drivers.map((driver) => {
                    const isAssignedToCurrent = 
                      driver.assignedVehicleId === selectedVehicle?.id || 
                      driver.assigned_vehicle === selectedVehicle?.reg ||
                      driver.assignedVehicleId === selectedVehicle?.registration;
                    const isAvailable = !driver.assignedVehicleId || isAssignedToCurrent;
                    return (
                      <option key={driver.id} value={driver.id} disabled={!isAvailable}>
                        {driver.name}
                        {driver.assignedVehicleId && !isAssignedToCurrent 
                          ? ` 🔒 Assigned to ${driver.assignedVehicleId}` 
                          : driver.assignedVehicleId && isAssignedToCurrent
                            ? ` ✅ Currently assigned`
                            : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., White"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.fuelType}
                  onChange={(e) => setFormData({...formData, fuelType: e.target.value})}
                >
                  <option value="Diesel">Diesel</option>
                  <option value="Petrol">Petrol</option>
                  <option value="Electric">Electric</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
        Fuel Tank Capacity (Litres)
    </label>
    <input 
        type="number" 
        step="0.1"
        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        placeholder="e.g., 80"
        value={formData.fuelTankCapacity}
        onChange={(e) => setFormData({
            ...formData, 
            fuelTankCapacity: e.target.value
        })}
    />
    <p className="text-[10px] text-gray-400 mt-1">
        Used to calculate fuel level percentage
    </p>
</div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transmission</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.transmission}
                  onChange={(e) => setFormData({...formData, transmission: e.target.value})}
                >
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Size</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.8L"
                  value={formData.engineSize}
                  onChange={(e) => setFormData({...formData, engineSize: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 12,847 km"
                  value={formData.mileage}
                  onChange={(e) => setFormData({...formData, mileage: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Owner name"
                  value={formData.owner}
                  onChange={(e) => setFormData({...formData, owner: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Current location"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Custodian</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Custodian name"
                  value={formData.custodian}
                  onChange={(e) => setFormData({...formData, custodian: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Centre</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., CC-001"
                  value={formData.costCentre}
                  onChange={(e) => setFormData({...formData, costCentre: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.acquisitionDate}
                  onChange={(e) => setFormData({...formData, acquisitionDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Cost</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., KSH 450,000"
                  value={formData.acquisitionCost}
                  onChange={(e) => setFormData({...formData, acquisitionCost: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.licenseExpiry}
                  onChange={(e) => setFormData({...formData, licenseExpiry: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Roadworthy Date</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.roadworthy}
                  onChange={(e) => setFormData({...formData, roadworthy: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Accessories</label>
                <div className="flex flex-wrap gap-2 mb-2 p-2 bg-gray-50 rounded-lg min-h-[40px] border border-gray-200">
                  {accessoriesList.length > 0 ? (
                    accessoriesList.map((acc, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                        <Package size={14} />
                        {acc}
                        <button
                          type="button"
                          onClick={() => {
                            const newAccessories = accessoriesList.filter((_, i) => i !== index);
                            setFormData({...formData, accessories: newAccessories});
                          }}
                          className="text-red-500 hover:text-red-700 ml-1"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-gray-400">No accessories added yet</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., GPS, Roof Rack, Dash Cam"
                    className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={accessoryInput}
                    onChange={(e) => setAccessoryInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && accessoryInput.trim()) {
                        e.preventDefault();
                        setFormData({...formData, accessories: [...accessoriesList, accessoryInput.trim()]});
                        setAccessoryInput('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (accessoryInput.trim()) {
                        setFormData({...formData, accessories: [...accessoriesList, accessoryInput.trim()]});
                        setAccessoryInput('');
                      }
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={isEdit ? handleEditVehicle : handleAddVehicle}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
              <button 
                onClick={() => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); }}
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
  // RENDER DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedVehicle) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Vehicle?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete "{selectedVehicle.reg || selectedVehicle.registration}"? 
              This will also remove any driver assignments.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteVehicle}
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
  // RENDER DOCUMENT MODAL
  // ============================================
  const renderDocumentModal = () => {
    if (!selectedVehicle || !showDocumentModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDocumentModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setShowDocumentModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">Documents - {selectedVehicle.reg || selectedVehicle.registration}</h2>
            <p className="text-purple-100 text-sm">Manage vehicle documents</p>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {selectedVehicle.documents && selectedVehicle.documents.length > 0 ? (
                selectedVehicle.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{doc.name}</p>
                      <p className="text-xs text-gray-500">Expires: {doc.expiry}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(doc.expiry) > new Date() ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {new Date(doc.expiry) > new Date() ? 'Valid' : 'Expired'}
                      </span>
                      <button className="text-blue-600 hover:underline text-sm">View</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-4">No documents available</p>
              )}
            </div>

            <div className="mt-4 p-4 border-2 border-dashed border-gray-200 rounded-lg text-center">
              <Upload size={24} className="mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-1">Upload new document</p>
              <p className="text-xs text-gray-400">PDF, JPG, PNG (Max 5MB)</p>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Upload</button>
              <button onClick={() => setShowDocumentModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
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
              placeholder="Search vehicles..." 
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
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
          >
            <Plus size={16} /> Add Vehicle
          </button>
          <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2">
            <Upload size={16} /> Import
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
              <option value="Maintenance">🔧 Maintenance</option>
              <option value="Decommissioned">❌ Decommissioned</option>
            </select>
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              <option value="Pickup">Pickup</option>
              <option value="SUV">SUV</option>
              <option value="Truck">Truck</option>
              <option value="Van">Van</option>
              <option value="Car">Car</option>
              <option value="Bus">Bus</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Years</option>
              {[2025, 2024, 2023, 2022, 2021, 2020].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button 
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
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
        <span className="font-medium text-gray-700">Showing {filteredVehicles.length} of {vehicles.length} vehicles</span>
        <span>🟢 {stats.active} Active</span>
        <span>🟡 {stats.maintenance} Maintenance</span>
        <span>🔴 {stats.decommissioned} Decommissioned</span>
        <span>⚠️ {stats.serviceDueUrgent} Service Due</span>
      </div>

      {filteredVehicles.length > 0 ? (
        <div className="space-y-3">
          {filteredVehicles.map((vehicle, index) => renderVehicleCard(vehicle, index))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
          <Truck size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium">No vehicles found</p>
          <p className="text-sm">Try adjusting your filters or add a new vehicle</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 mx-auto transition-colors"
          >
            <Plus size={16} /> Add Vehicle
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
          <p className="text-xs text-gray-500">Total Vehicles</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <div className="flex items-center gap-1 text-xs text-green-600 mt-1">
            <TrendingUp size={12} /> +{stats.active} active
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Avg Health</p>
          <p className="text-2xl font-bold text-green-600">
            {vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (v.health || 0), 0) / vehicles.length) : 0}%
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-green-500 rounded-full h-1.5" 
              style={{ width: `${vehicles.length > 0 ? Math.round(vehicles.reduce((sum, v) => sum + (v.health || 0), 0) / vehicles.length) : 0}%` }}
            />
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Service Due</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.serviceDueUrgent}</p>
          <p className="text-xs text-gray-400">+{stats.serviceDueWarning} due soon</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">License Expiring</p>
          <p className="text-2xl font-bold text-red-600">{stats.expiringLicenses}</p>
          <p className="text-xs text-gray-400">in the next 90 days</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Mileage</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalMileage > 0 ? `${(stats.totalMileage / 1000).toFixed(1)}k` : '0'}</p>
          <p className="text-xs text-gray-400">km traveled</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Avg Fuel Efficiency</p>
          <p className="text-2xl font-bold text-orange-600">{stats.avgFuelEfficiency}%</p>
          <p className="text-xs text-gray-400">across fleet</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Status Distribution</h5>
          <div className="space-y-2">
            {[
              { label: 'Active', count: stats.active, color: 'bg-green-500' },
              { label: 'Maintenance', count: stats.maintenance, color: 'bg-yellow-500' },
              { label: 'Decommissioned', count: stats.decommissioned, color: 'bg-gray-500' },
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
          <h5 className="font-medium text-sm mb-3">Service Status</h5>
          <div className="space-y-2">
            {[
              { label: '✅ Healthy', count: stats.total - stats.serviceDueUrgent - stats.serviceDueWarning, color: 'bg-green-500' },
              { label: '⚠️ Due Soon', count: stats.serviceDueWarning, color: 'bg-yellow-500' },
              { label: '🔴 Overdue', count: stats.serviceDueUrgent, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} rounded-full h-2 transition-all duration-500`} 
                    style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h5 className="font-medium text-sm mb-3">Category Breakdown</h5>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(
            vehicles.reduce((acc, v) => {
              acc[v.category] = (acc[v.category] || 0) + 1;
              return acc;
            }, {})
          ).map(([category, count]) => (
            <div key={category} className="bg-gray-50 p-3 rounded-lg text-center">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-gray-500">{category}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER LIFECYCLE VIEW
  // ============================================
  const renderLifecycleView = () => (
    <div>
      {vehicles.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Vehicle</th>
                <th className="p-3 hidden sm:table-cell">Acquisition</th>
                <th className="p-3 hidden md:table-cell">Cost</th>
                <th className="p-3">Status</th>
                <th className="p-3 hidden lg:table-cell">License</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((vehicle) => (
                <tr key={vehicle.id || vehicle.reg} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <p className="font-medium text-sm">{vehicle.reg || vehicle.registration}</p>
                      <p className="text-xs text-gray-500">{vehicle.make} {vehicle.model}</p>
                    </div>
                  </td>
                  <td className="p-3 text-sm hidden sm:table-cell">{vehicle.acquisitionDate || '-'}</td>
                  <td className="p-3 text-sm hidden md:table-cell">{vehicle.acquisitionCost || '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="p-3 text-sm hidden lg:table-cell">
                    {vehicle.licenseExpiry ? new Date(vehicle.licenseExpiry).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-3">
                    <button 
                      onClick={() => openEditModal(vehicle)}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      View Timeline
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <History size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No vehicles to show lifecycle</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading vehicles...</p>
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
              Vehicle Fleet
              <span className="text-sm font-normal text-gray-500">({vehicles.length} vehicles)</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Manage your entire vehicle fleet</p>
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
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Plus size={16} /> Add Vehicle
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'list', label: 'Vehicles', icon: Truck },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'lifecycle', label: 'Lifecycle', icon: History },
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
        {activeTab === 'lifecycle' && renderLifecycleView()}
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
      {renderDocumentModal()}
    </div>
  );
};

export default Vehicles;