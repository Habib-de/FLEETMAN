// src/pages/car-owner/Maintenance.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, User, Calendar, Clock, CheckCircle, AlertCircle, 
  Wrench, DollarSign,
  ChevronLeft, ChevronRight, BarChart3,
  ClipboardList,
  X, Save, Trash2, Edit, RefreshCw,
  Filter, Search, Download, Printer,
  TrendingUp, TrendingDown, Award,
  Bell, Settings, MapPin, Phone, Mail,
  AlertTriangle, Shield, Package, Truck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  maintenanceService, 
  vehicleService, 
  driverService,
  tenantService,
  merchantService
} from '../../services/api';

const Maintenance = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const [viewMode, setViewMode] = useState('kanban');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [showEditJobForm, setShowEditJobForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showServiceHistory, setShowServiceHistory] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState(null);
  
  // Service Templates
  const serviceTemplates = [
    { name: 'Oil Change', interval: 5000, unit: 'km', estimatedHours: 1.5, cost: 850 },
    { name: 'Brake Service', interval: 10000, unit: 'km', estimatedHours: 2.5, cost: 1200 },
    { name: 'Tire Rotation', interval: 8000, unit: 'km', estimatedHours: 1, cost: 350 },
    { name: 'Engine Tune-up', interval: 15000, unit: 'km', estimatedHours: 3, cost: 1800 },
    { name: 'Transmission Service', interval: 20000, unit: 'km', estimatedHours: 4, cost: 2500 },
    { name: 'AC Service', interval: 12000, unit: 'km', estimatedHours: 2, cost: 950 },
    { name: 'Cooling System Flush', interval: 10000, unit: 'km', estimatedHours: 1.5, cost: 650 },
    { name: 'Clutch Replacement', interval: 25000, unit: 'km', estimatedHours: 5, cost: 3200 },
  ];

  // ============================================
  // FORM DATA
  // ============================================
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: null,
    type: '',
    status: 'logged',
    priority: 'medium',
    description: '',
    reported_by: '',
    scheduled_date: '',
    completed_date: null,
    cost: '',
    mechanic: '',
    parts_used: [],
    estimated_hours: '',
    actual_hours: 0,
    template: '',
    service_type: 'corrective'
  });

  // ============================================
  // LOAD DATA
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view maintenance');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      console.log('📡 Fetching maintenance jobs...');
      const maintenanceRes = await maintenanceService.getAll(tenant);
      let jobsData = [];
      if (maintenanceRes?.success && maintenanceRes?.data) {
        jobsData = Array.isArray(maintenanceRes.data) ? maintenanceRes.data : [maintenanceRes.data];
        setMaintenanceJobs(jobsData);
        console.log('✅ Loaded maintenance jobs:', jobsData.length);
      } else {
        setMaintenanceJobs([]);
      }

      console.log('📡 Fetching vehicles...');
      const vehiclesRes = await vehicleService.getAll(tenant);
      if (vehiclesRes?.success && vehiclesRes?.data) {
        const vehiclesData = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [vehiclesRes.data];
        setVehicles(vehiclesData);
        console.log('✅ Loaded vehicles:', vehiclesData.length);
      } else {
        setVehicles([]);
      }

      console.log('📡 Fetching drivers...');
      const driversRes = await driverService.getAll(tenant);
      if (driversRes?.success && driversRes?.data) {
        const driversData = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
        setDrivers(driversData);
        console.log('✅ Loaded drivers:', driversData.length);
      } else {
        setDrivers([]);
      }

      await loadMechanicsFromMerchants();

    } catch (error) {
      console.error('❌ Error loading maintenance data:', error);
      setErrorMessage('Failed to load maintenance data. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // ============================================
  // LOAD MECHANICS FROM MERCHANTS
  // ============================================
  const loadMechanicsFromMerchants = async () => {
    try {
      const tenant = currentUser?.tenantId;
      if (!tenant) {
        setMechanics([]);
        return;
      }

      console.log('📡 Fetching mechanics from merchants...');
      const response = await merchantService.getAll(tenant);
      
      if (response?.success && response?.data) {
        const merchants = Array.isArray(response.data) ? response.data : [response.data];
        
        const mechanicTypes = [
          'Workshop', 'Mechanic', 'General Repairs', 'Specialist',
          'Auto Electrician', 'Tire Center', 'Panel Beater', 'Body Repair',
          'Recovery', 'Towing Service'
        ];
        
        const mechanicMerchants = merchants.filter(m => 
          mechanicTypes.includes(m.type)
        );
        
        if (mechanicMerchants.length > 0) {
          const mechanicsList = mechanicMerchants.map(m => {
            let services = [];
            try {
              services = typeof m.services === 'string' ? JSON.parse(m.services) : (m.services || []);
            } catch (e) {
              services = [];
            }
            
            return {
              id: m.id,
              name: m.name,
              specialty: services.length > 0 ? services.join(', ') : 'General Service',
              rating: parseFloat(m.rating) || 4.0,
              jobsCompleted: m.jobsCompleted || 0,
              phone: m.phone || '',
              email: m.email || '',
              address: m.address || '',
              status: m.status || 'pending'
            };
          });
          
          setMechanics(mechanicsList);
          console.log('✅ Loaded mechanics from merchants API:', mechanicsList.length);
        } else {
          setMechanics([]);
          console.log('ℹ️ No mechanics found in merchants');
        }
      } else {
        setMechanics([]);
      }
    } catch (error) {
      console.error('❌ Error loading mechanics:', error);
      setMechanics([]);
    }
  };

  // ============================================
  // USE EFFECTS
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // ============================================
  // STATISTICS - Enhanced
  // ============================================
  const stats = {
    totalJobs: maintenanceJobs.length,
    inProgress: maintenanceJobs.filter(j => j.status === 'in_progress' || j.status === 'inProgress').length,
    completed: maintenanceJobs.filter(j => j.status === 'closed' || j.status === 'completed').length,
    logged: maintenanceJobs.filter(j => j.status === 'logged').length,
    approved: maintenanceJobs.filter(j => j.status === 'approved').length,
    booked: maintenanceJobs.filter(j => j.status === 'booked').length,
    qualityCheck: maintenanceJobs.filter(j => j.status === 'quality_check' || j.status === 'qualityCheck').length,
    overdue: maintenanceJobs.filter(j => j.priority === 'high' && j.status !== 'closed' && j.status !== 'completed').length,
    critical: maintenanceJobs.filter(j => j.priority === 'critical' && j.status !== 'closed' && j.status !== 'completed').length,
    totalCost: maintenanceJobs.reduce((sum, j) => sum + (parseFloat(j.cost) || 0), 0),
    avgCost: maintenanceJobs.length > 0 
      ? Math.round(maintenanceJobs.reduce((sum, j) => sum + (parseFloat(j.cost) || 0), 0) / maintenanceJobs.length) 
      : 0,
    totalHours: maintenanceJobs.reduce((sum, j) => sum + (parseFloat(j.actualHours) || 0), 0),
    thisMonth: maintenanceJobs.filter(j => {
      const date = new Date(j.scheduledDate || j.scheduled_date);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
    avgCompletionTime: maintenanceJobs.filter(j => j.status === 'closed' || j.status === 'completed').length > 0
      ? Math.round(maintenanceJobs.filter(j => j.status === 'closed' || j.status === 'completed')
          .reduce((sum, j) => sum + (parseFloat(j.actualHours) || 0), 0) / 
          maintenanceJobs.filter(j => j.status === 'closed' || j.status === 'completed').length)
      : 0,
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'logged': 'bg-blue-100 text-blue-700 border-blue-200',
      'approved': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'booked': 'bg-purple-100 text-purple-700 border-purple-200',
      'in_progress': 'bg-orange-100 text-orange-700 border-orange-200',
      'inProgress': 'bg-orange-100 text-orange-700 border-orange-200',
      'quality_check': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'qualityCheck': 'bg-indigo-100 text-indigo-700 border-indigo-200',
      'closed': 'bg-green-100 text-green-700 border-green-200',
      'completed': 'bg-green-100 text-green-700 border-green-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'logged': '📋 Logged',
      'approved': '✅ Approved',
      'booked': '📅 Booked',
      'in_progress': '🔧 In Progress',
      'inProgress': '🔧 In Progress',
      'quality_check': '🔍 Quality Check',
      'qualityCheck': '🔍 Quality Check',
      'closed': '✅ Completed',
      'completed': '✅ Completed'
    };
    return labels[status] || status;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      'critical': 'bg-red-500 text-white',
      'high': 'bg-orange-500 text-white',
      'medium': 'bg-yellow-500 text-white',
      'low': 'bg-blue-500 text-white'
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  const getPriorityLabel = (priority) => {
    const labels = {
      'critical': '🚨 Critical',
      'high': '🔴 High',
      'medium': '🟡 Medium',
      'low': '🔵 Low'
    };
    return labels[priority] || priority;
  };

  const getPriorityIcon = (priority) => {
    const icons = {
      'critical': <AlertTriangle size={14} className="text-red-500" />,
      'high': <AlertCircle size={14} className="text-orange-500" />,
      'medium': <Clock size={14} className="text-yellow-500" />,
      'low': <CheckCircle size={14} className="text-blue-500" />
    };
    return icons[priority] || null;
  };

  const getVehicleLabel = (vehicleId) => {
    if (!vehicleId) return 'Unknown';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.registration || vehicle.id : vehicleId;
  };

  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => String(d.id) === String(driverId));
    return driver ? driver.name : 'Unassigned';
  };

  const parsePartsUsed = (parts) => {
    if (!parts) return [];
    if (Array.isArray(parts)) return parts;
    if (typeof parts === 'string') {
      try {
        return JSON.parse(parts);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const getServiceTypeLabel = (type) => {
    const labels = {
      'preventive': '🛡️ Preventive',
      'corrective': '🔧 Corrective',
      'emergency': '🚨 Emergency'
    };
    return labels[type] || type;
  };

  // Add this function after getServiceTypeLabel or before getStatusColor
const getStatusIcon = (status) => {
  const s = status?.toLowerCase() || '';
  if (s === 'logged') return <Clock size={14} />;
  if (s === 'approved') return <CheckCircle size={14} />;
  if (s === 'booked') return <Calendar size={14} />;
  if (s === 'in_progress' || s === 'inprogress') return <Wrench size={14} />;
  if (s === 'quality_check' || s === 'qualitycheck') return <ClipboardList size={14} />;
  if (s === 'closed' || s === 'completed') return <CheckCircle size={14} />;
  return <AlertCircle size={14} />;
};

  // ============================================
  // FILTER JOBS
  // ============================================
  const filteredJobs = maintenanceJobs.filter(job => {
    const matchesSearch = 
      getVehicleLabel(job.vehicle?.id || job.vehicle_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (job.mechanic || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      driver_id: null,
      type: '',
      status: 'logged',
      priority: 'medium',
      description: '',
      reported_by: '',
      scheduled_date: '',
      completed_date: null,
      cost: '',
      mechanic: '',
      parts_used: [],
      estimated_hours: '',
      actual_hours: 0,
      template: '',
      service_type: 'corrective'
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAddJob = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.vehicle_id) {
      setErrorMessage('Vehicle is required');
      setIsLoading(false);
      return;
    }
    if (!formData.type) {
      setErrorMessage('Service type is required');
      setIsLoading(false);
      return;
    }

    try {
      const jobData = {
        tenant: { id: tenantId },
        vehicle: formData.vehicle_id,
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        type: formData.type,
        status: formData.status || 'logged',
        priority: formData.priority || 'medium',
        description: formData.description || '',
        reportedBy: formData.reported_by || currentUser?.name || 'System',
        scheduledDate: formData.scheduled_date || null,
        completedDate: null,
        cost: parseFloat(formData.cost) || 0,
        mechanic: formData.mechanic || 'Pending',
        partsUsed: JSON.stringify(formData.parts_used || []),
        estimatedHours: parseFloat(formData.estimated_hours) || 0,
        actualHours: 0,
        serviceType: formData.service_type || 'corrective'
      };

      console.log('📤 Creating maintenance job:', jobData);
      const response = await maintenanceService.create(jobData);
      
      if (response?.success) {
        setSuccessMessage('✅ Maintenance job created successfully!');
        setShowNewJobForm(false);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to create job. Please try again.');
      }
    } catch (error) {
      console.error('Error creating maintenance job:', error);
      setErrorMessage('Failed to create job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditJob = async () => {
    if (!selectedJob) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const jobData = {
        vehicle: { id: formData.vehicle_id },
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        type: formData.type,
        status: formData.status || 'logged',
        priority: formData.priority || 'medium',
        description: formData.description || '',
        reportedBy: formData.reported_by || currentUser?.name || 'System',
        scheduledDate: formData.scheduled_date || null,
        completedDate: formData.completed_date || null,
        cost: parseFloat(formData.cost) || 0,
        mechanic: formData.mechanic || 'Pending',
        partsUsed: JSON.stringify(formData.parts_used || []),
        estimatedHours: parseFloat(formData.estimated_hours) || 0,
        actualHours: parseFloat(formData.actual_hours) || 0,
        serviceType: formData.service_type || 'corrective'
      };

      console.log('📤 Updating maintenance job:', jobData);
      const response = await maintenanceService.update(selectedJob.id, jobData);
      
      if (response?.success) {
        setSuccessMessage('✅ Maintenance job updated successfully!');
        setShowEditJobForm(false);
        setSelectedJob(null);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to update job. Please try again.');
      }
    } catch (error) {
      console.error('Error updating maintenance job:', error);
      setErrorMessage('Failed to update job. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteJob = async () => {
    if (!selectedJob) return;

    try {
      const response = await maintenanceService.delete(selectedJob.id);
      
      if (response?.success) {
        setSuccessMessage('✅ Maintenance job deleted successfully!');
        setShowDeleteConfirm(false);
        setSelectedJob(null);
        setShowJobModal(false);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to delete job. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting maintenance job:', error);
      setErrorMessage('Failed to delete job. Please try again.');
    }
  };

  const handleUpdateStatus = async (jobId, newStatus) => {
  console.log('🔧 ===== HANDLE UPDATE STATUS START =====');
  console.log('🔧 Job ID:', jobId);
  console.log('🔧 New Status:', newStatus);
  
  try {
    const job = maintenanceJobs.find(j => j.id === jobId);
    if (!job) {
      console.error('❌ Job not found:', jobId);
      return;
    }

    console.log('🔧 Job found:', job);

    let partsUsed = job.partsUsed || [];
    if (typeof partsUsed === 'string') {
      try {
        partsUsed = JSON.parse(partsUsed);
      } catch (e) {
        partsUsed = [];
      }
    }

    // ✅ FIX: Get vehicle ID from ALL possible fields
    const vehicleId = job.vehicle?.id || job.vehicle_id || job.vehicleId || '';
    console.log('🔧 Vehicle ID found:', vehicleId);

    if (!vehicleId) {
      console.error('❌ No vehicle ID found in job!');
      setErrorMessage('This job has no vehicle assigned. Please edit the job and add a vehicle.');
      return;
    }

    const payload = {
      vehicle: { id: vehicleId },
      driver: job.driver?.id || job.driver_id ? { id: job.driver?.id || job.driver_id } : null,
      type: job.type,
      status: newStatus,
      priority: job.priority,
      description: job.description,
      reportedBy: job.reportedBy || job.reported_by,
      scheduledDate: job.scheduledDate || job.scheduled_date,
      completedDate: newStatus === 'closed' || newStatus === 'completed' ? new Date().toISOString() : (job.completedDate || job.completed_date),
      cost: parseFloat(job.cost) || 0,
      mechanic: job.mechanic,
      partsUsed: JSON.stringify(partsUsed),
      estimatedHours: parseFloat(job.estimatedHours || job.estimated_hours) || 0,
      actualHours: parseFloat(job.actualHours || job.actual_hours) || 0,
      serviceType: job.serviceType || 'corrective'
    };

    console.log('📤 Sending maintenance update payload:', JSON.stringify(payload, null, 2));
    
    // Step 1: Update maintenance job
    const response = await maintenanceService.update(jobId, payload);
    console.log('📥 Maintenance update response:', response);

    if (!response?.success) {
      console.error('❌ Maintenance update failed:', response);
      setErrorMessage('Failed to update status. Please try again.');
      return;
    }

    console.log('✅ Maintenance job updated successfully');
    
    // ============================================
    // Step 2: UPDATE VEHICLE STATUS
    // ============================================
    console.log('🔧 ===== UPDATING VEHICLE STATUS =====');
    console.log('🔧 Vehicle ID:', vehicleId);
    
    try {
      // Get current vehicle data
      console.log('📡 Fetching vehicle data for ID:', vehicleId);
      const vehicleRes = await vehicleService.getById(vehicleId);
      console.log('📥 Vehicle response:', vehicleRes);
      
      const vehicle = vehicleRes?.data;
      
      if (!vehicle) {
        console.error('❌ Vehicle not found:', vehicleId);
        setErrorMessage('Vehicle not found. Please try again.');
        return;
      }

      console.log('✅ Vehicle found:', vehicle);
      console.log('📊 Current vehicle status:', vehicle.status);

      // Determine new vehicle status based on maintenance status
      let vehicleStatus = 'Active'; // Default
      
      const maintenanceStatuses = ['logged', 'approved', 'booked', 'in_progress', 'inProgress', 'quality_check', 'qualityCheck'];
      const completedStatuses = ['closed', 'completed'];
      
      if (maintenanceStatuses.includes(newStatus)) {
        vehicleStatus = 'Maintenance';
      } else if (completedStatuses.includes(newStatus)) {
        vehicleStatus = 'Active';
      } else {
        vehicleStatus = 'Active';
      }
      
      console.log(`📊 Vehicle ${vehicleId} status: ${vehicle.status} → ${vehicleStatus}`);

      // Build complete update payload
      const updatePayload = {
        tenant: { id: vehicle.tenant?.id || vehicle.tenantId || tenantId },
        registration: vehicle.registration || '',
        make: vehicle.make || '',
        model: vehicle.model || '',
        year: vehicle.year || 2024,
        vin: vehicle.vin || '',
        category: vehicle.category || 'Pickup',
        status: vehicleStatus,
        mileage: vehicle.mileage || 0,
        owner: vehicle.owner || null,
        costCentre: vehicle.costCentre || null,
        location: vehicle.location || null,
        custodian: vehicle.custodian || null,
        color: vehicle.color || null,
        fuelType: vehicle.fuelType || null,
        engineSize: vehicle.engineSize || null,
        transmission: vehicle.transmission || null,
        acquisitionDate: vehicle.acquisitionDate || null,
        acquisitionCost: vehicle.acquisitionCost || null,
        licenseExpiry: vehicle.licenseExpiry || null,
        roadworthy: vehicle.roadworthy || null,
        insurance: vehicle.insurance || null,
        permit: vehicle.permit || null,
        driverId: vehicle.driverId || null,
        accessories: vehicle.accessories || '[]'
      };

      console.log('📤 Sending vehicle update payload:', JSON.stringify(updatePayload, null, 2));
      
      const updateResponse = await vehicleService.update(vehicleId, updatePayload);
      console.log('📥 Vehicle update response:', updateResponse);

      if (updateResponse?.success) {
        console.log(`✅ Vehicle ${vehicleId} status updated to ${vehicleStatus}`);
        
        // ✅ DISPATCH EVENTS
        window.dispatchEvent(new CustomEvent('vehiclesUpdated'));
        window.dispatchEvent(new CustomEvent('vehicleStatusChanged', {
          detail: { 
            vehicleId: vehicleId,
            vehicleStatus: vehicleStatus,
            maintenanceStatus: newStatus
          }
        }));
        
        if (newStatus === 'closed' || newStatus === 'completed') {
          window.dispatchEvent(new CustomEvent('maintenanceCompleted', {
            detail: { 
              vehicleId: vehicleId,
              jobId: jobId,
              status: 'completed'
            }
          }));
        }
        
        setSuccessMessage(`✅ Vehicle ${vehicle.registration || vehicleId} status updated to ${vehicleStatus}`);
      } else {
        console.error('❌ Vehicle update failed:', updateResponse);
        setErrorMessage('Failed to update vehicle status: ' + (updateResponse?.message || 'Unknown error'));
      }
    } catch (vehicleError) {
      console.error('❌ Error updating vehicle status:', vehicleError);
      setErrorMessage('Failed to update vehicle status: ' + vehicleError.message);
    }

    // Refresh data
    await loadData();
    setTimeout(() => setSuccessMessage(''), 3000);
    
  } catch (error) {
    console.error('❌ Error in handleUpdateStatus:', error);
    setErrorMessage('Failed to update status. Please try again.');
  }
  
  console.log('🔧 ===== HANDLE UPDATE STATUS END =====');
};

  const openEditModal = (job) => {
  let partsUsed = job.partsUsed || [];
  if (typeof partsUsed === 'string') {
    try {
      partsUsed = JSON.parse(partsUsed);
    } catch (e) {
      partsUsed = [];
    }
  }

  // ✅ FIX: Check ALL possible vehicle ID fields
  const vehicleId = job.vehicle?.id || job.vehicle_id || job.vehicleId || '';
  
  console.log('🔧 ========== OPEN EDIT MODAL ==========');
  console.log('🔧 Job:', job);
  console.log('🔧 Vehicle ID from job:', vehicleId);
  console.log('🔧 All vehicles available:', vehicles.map(v => ({ id: v.id, reg: v.registration })));
  console.log('🔧 Looking for vehicle with ID:', vehicleId);
  
  const foundVehicle = vehicles.find(v => v.id === vehicleId);
  console.log('🔧 Vehicle found in list?', foundVehicle ? 'YES' : 'NO', foundVehicle);

  setSelectedJob(job);
  setFormData({
    vehicle_id: vehicleId,
    driver_id: job.driver?.id || job.driver_id || job.driverId || null,
    type: job.type || '',
    status: job.status || 'logged',
    priority: job.priority || 'medium',
    description: job.description || '',
    reported_by: job.reportedBy || job.reported_by || '',
    scheduled_date: job.scheduledDate || job.scheduled_date || '',
    completed_date: job.completedDate || job.completed_date || null,
    cost: job.cost || '',
    mechanic: job.mechanic || '',
    parts_used: partsUsed,
    estimated_hours: job.estimatedHours || job.estimated_hours || '',
    actual_hours: job.actualHours || job.actual_hours || 0,
    service_type: job.serviceType || 'corrective'
  });
  setShowEditJobForm(true);
};

  // ============================================
  // CALENDAR HELPERS
  // ============================================
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const days = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    return { days, firstDay };
  };

  const hasServiceOnDay = (day) => {
    return maintenanceJobs.some(job => {
      const scheduledDate = job.scheduledDate || job.scheduled_date;
      if (!scheduledDate) return false;
      const jobDate = new Date(scheduledDate);
      return jobDate.getDate() === day && 
             jobDate.getMonth() === currentMonth.getMonth() &&
             jobDate.getFullYear() === currentMonth.getFullYear();
    });
  };

  const changeMonth = (delta) => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentMonth(newDate);
  };

  // ============================================
  // NAVIGATION HELPERS
  // ============================================
  const navigateToVehicles = () => {
    if (setActiveTab) {
      setActiveTab('vehicles');
    } else {
      window.dispatchEvent(new CustomEvent('navigateTo', { 
        detail: { tab: 'vehicles' } 
      }));
    }
  };

  const navigateToDrivers = () => {
    if (setActiveTab) {
      setActiveTab('drivers');
    } else {
      window.dispatchEvent(new CustomEvent('navigateTo', { 
        detail: { tab: 'drivers' } 
      }));
    }
  };

  // ============================================
  // RENDER ENHANCED KANBAN VIEW
  // ============================================
  const renderKanbanView = () => {
    const statuses = ['logged', 'approved', 'booked', 'in_progress', 'quality_check', 'closed'];
    
    return (
      <div>
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search jobs..." 
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="logged">Logged</option>
            <option value="approved">Approved</option>
            <option value="booked">Booked</option>
            <option value="in_progress">In Progress</option>
            <option value="quality_check">Quality Check</option>
            <option value="closed">Closed</option>
          </select>
          <select 
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="text-xs text-gray-400">
            {filteredJobs.length} jobs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statuses.map((status) => {
            const statusJobs = filteredJobs.filter(j => j.status === status);
            return (
              <div key={status} className="border border-gray-200 rounded-lg p-3 min-h-[250px] bg-gray-50">
                <h4 className="font-medium mb-3 text-xs uppercase text-gray-500 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    {getStatusIcon(status)} {getStatusLabel(status)}
                  </span>
                  <span className={`bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs ${
                    statusJobs.filter(j => j.priority === 'critical' || j.priority === 'high').length > 0 ? 'bg-red-200 text-red-700' : ''
                  }`}>
                    {statusJobs.length}
                    {statusJobs.filter(j => j.priority === 'critical' || j.priority === 'high').length > 0 && (
                      <span className="ml-1 text-red-600">⚠️</span>
                    )}
                  </span>
                </h4>
                <div className="space-y-2">
                  {statusJobs.map((job) => (
                    <div 
                      key={job.id} 
                      className={`p-2 bg-white rounded border transition-all shadow-sm hover:shadow-md cursor-pointer ${
                        job.priority === 'critical' ? 'border-red-300 bg-red-50' :
                        job.priority === 'high' ? 'border-orange-200' :
                        'border-gray-200'
                      }`}
                      onClick={() => { setSelectedJob(job); setShowJobModal(true); }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{getVehicleLabel(job.vehicle?.id || job.vehicle_id)}</p>
                          <p className="text-xs text-gray-600 truncate">{job.type}</p>
                        </div>
                        {job.priority === 'critical' && (
                          <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse flex-shrink-0 ml-1">
                            CRITICAL
                          </span>
                        )}
                        {job.priority === 'high' && (
                          <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">
                            HIGH
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getStatusColor(job.status)}`}>
                          {getStatusLabel(job.status)}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {job.scheduledDate || job.scheduled_date ? new Date(job.scheduledDate || job.scheduled_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      {job.mechanic && job.mechanic !== 'Pending' && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-500">
                          <User size={10} /> {job.mechanic}
                        </div>
                      )}
                      {job.cost > 0 && (
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-500">
                          <DollarSign size={10} /> KSH {job.cost.toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                  {statusJobs.length === 0 && (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      No jobs
                    </div>
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
  // RENDER ENHANCED CALENDAR VIEW
  // ============================================
  const renderCalendarView = () => {
    const { days, firstDay } = getDaysInMonth(currentMonth);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h4 className="font-semibold text-lg">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h4>
            <div className="flex gap-1">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentMonth(new Date())} 
              className="text-sm text-blue-600 hover:underline"
            >
              Today
            </button>
            <button 
  onClick={() => setShowNewJobForm(true)}
  className="bg-blue-600 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm hover:bg-blue-700 flex items-center gap-1 sm:gap-2 transition-colors flex-shrink-0 whitespace-nowrap"
>
  <Plus size={14} className="sm:w-4 sm:h-4" />
  <span>New Job</span>
</button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => (
            <div key={`empty-${i}`} className="h-24 bg-gray-50 rounded-lg"></div>
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = i + 1;
            const hasService = hasServiceOnDay(day);
            const isToday = new Date().getDate() === day && 
                           new Date().getMonth() === currentMonth.getMonth() &&
                           new Date().getFullYear() === currentMonth.getFullYear();
            const dayJobs = maintenanceJobs.filter(job => {
              const scheduledDate = job.scheduledDate || job.scheduled_date;
              if (!scheduledDate) return false;
              const jobDate = new Date(scheduledDate);
              return jobDate.getDate() === day && 
                     jobDate.getMonth() === currentMonth.getMonth() &&
                     jobDate.getFullYear() === currentMonth.getFullYear();
            });
            
            const hasCritical = dayJobs.some(j => j.priority === 'critical');
            
            return (
              <div 
                key={day} 
                className={`h-24 border rounded-lg p-1 ${
                  hasService ? `cursor-pointer hover:shadow-md transition-shadow ${
                    hasCritical ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'
                  }` : 'bg-white border-gray-200'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                onClick={() => {
                  if (dayJobs.length > 0) {
                    setSelectedJob(dayJobs[0]);
                    setShowJobModal(true);
                  }
                }}
              >
                <span className={`text-xs font-medium ${isToday ? 'text-blue-600' : hasCritical ? 'text-red-600' : 'text-gray-700'}`}>
                  {day}
                  {hasCritical && <span className="ml-1 text-red-500">⚠️</span>}
                </span>
                {dayJobs.slice(0, 2).map((job) => (
                  <div key={job.id} className="mt-0.5 text-[8px] truncate">
                    <span className={`px-1 py-0.5 rounded ${getStatusColor(job.status)}`}>
                      {getVehicleLabel(job.vehicle?.id || job.vehicle_id)} - {job.type}
                    </span>
                  </div>
                ))}
                {dayJobs.length > 2 && (
                  <div className="text-[8px] text-gray-400">+{dayJobs.length - 2} more</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-200"></div><span>Scheduled Service</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-red-200"></div><span>Critical Service</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span>Today</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div><span>Completed</span></div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER ENHANCED ANALYTICS VIEW
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Cost</p>
          <p className="text-xl font-bold text-gray-800">KSH {stats.totalCost.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{stats.totalJobs} jobs</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Average Cost</p>
          <p className="text-xl font-bold text-blue-600">KSH {stats.avgCost.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Per job</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Completion Rate</p>
          <p className="text-xl font-bold text-green-600">
            {stats.totalJobs > 0 ? `${Math.round((stats.completed / stats.totalJobs) * 100)}%` : '0%'}
          </p>
          <p className="text-xs text-gray-500">{stats.completed} completed</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Avg Turnaround</p>
          <p className="text-xl font-bold text-purple-600">
            {stats.avgCompletionTime > 0 ? `${stats.avgCompletionTime}h` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Average hours</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Critical Issues</p>
          <p className="text-xl font-bold text-red-600">{stats.critical}</p>
          <p className="text-xs text-gray-500">Need attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <DollarSign size={16} className="text-blue-500" />
            Cost by Vehicle
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(
              maintenanceJobs.reduce((acc, job) => {
                const key = job.vehicle?.id || job.vehicle_id || 'Unknown';
                acc[key] = (acc[key] || 0) + (parseFloat(job.cost) || 0);
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([vehicle, cost]) => {
                const percentage = stats.totalCost > 0 ? (cost / stats.totalCost) * 100 : 0;
                return (
                  <div key={vehicle}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{getVehicleLabel(vehicle)}</span>
                      <span className="font-medium">KSH {cost.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 rounded-full h-2 transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              })}
            {maintenanceJobs.length === 0 && (
              <p className="text-center text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Wrench size={16} className="text-orange-500" />
            Job Type Breakdown
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {Object.entries(
              maintenanceJobs.reduce((acc, job) => {
                acc[job.type] = (acc[job.type] || 0) + 1;
                return acc;
              }, {})
            )
              .sort((a, b) => b[1] - a[1])
              .slice(0, 6)
              .map(([type, count]) => (
                <div key={type}>
                  <div className="flex justify-between text-sm">
                    <span>{type}</span>
                    <span className="font-medium">{count} jobs</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 rounded-full h-2 transition-all duration-500" style={{ width: `${(count / stats.totalJobs) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            {maintenanceJobs.length === 0 && (
              <p className="text-center text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Clock size={16} className="text-yellow-500" />
            Status Distribution
          </h4>
          <div className="space-y-2">
            {[
              { label: 'Logged', count: stats.logged, color: 'bg-blue-500' },
              { label: 'Approved', count: stats.approved, color: 'bg-yellow-500' },
              { label: 'Booked', count: stats.booked, color: 'bg-purple-500' },
              { label: 'In Progress', count: stats.inProgress, color: 'bg-orange-500' },
              { label: 'Quality Check', count: stats.qualityCheck, color: 'bg-indigo-500' },
              { label: 'Completed', count: stats.completed, color: 'bg-green-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} rounded-full h-2 transition-all duration-500`} style={{ width: `${stats.totalJobs > 0 ? (item.count / stats.totalJobs) * 100 : 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Award size={16} className="text-green-500" />
            Mechanic Performance
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {mechanics.slice(0, 5).map((mechanic) => {
              const jobsCompleted = maintenanceJobs.filter(j => 
                j.mechanic === mechanic.name && 
                (j.status === 'closed' || j.status === 'completed')
              ).length;
              
              return (
                <div key={mechanic.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">{mechanic.name}</p>
                    <p className="text-xs text-gray-500">{mechanic.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">{jobsCompleted} jobs</p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= Math.round(mechanic.rating) ? 'text-yellow-400' : 'text-gray-300'}>
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
            {mechanics.length === 0 && (
              <p className="text-center text-gray-400 text-sm">No mechanics available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================
  // RENDER JOB DETAIL MODAL - Enhanced
  // ============================================
  const renderJobModal = () => {
    if (!selectedJob) return null;
    
    let partsUsed = selectedJob.partsUsed || [];
    if (typeof partsUsed === 'string') {
      try {
        partsUsed = JSON.parse(partsUsed);
      } catch (e) {
        partsUsed = [];
      }
    }
    
    const jobVehicle = vehicles.find(v => v.id === (selectedJob.vehicle?.id || selectedJob.vehicle_id));
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowJobModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setShowJobModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${
            selectedJob.priority === 'critical' ? 'bg-gradient-to-r from-red-600 to-red-700' :
            selectedJob.priority === 'high' ? 'bg-gradient-to-r from-orange-500 to-orange-600' :
            'bg-gradient-to-r from-blue-600 to-blue-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold text-white">{getVehicleLabel(selectedJob.vehicle?.id || selectedJob.vehicle_id)}</h2>
                  {selectedJob.priority === 'critical' && (
                    <span className="text-[10px] bg-red-300 text-red-900 px-2 py-0.5 rounded-full animate-pulse">
                      CRITICAL
                    </span>
                  )}
                </div>
                <p className="text-white/80 text-sm">{selectedJob.type}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(selectedJob.status)}`}>
                {getStatusLabel(selectedJob.status)}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Priority</p>
                <div className="flex items-center gap-2 mt-1">
                  {getPriorityIcon(selectedJob.priority)}
                  <span className="font-medium">{getPriorityLabel(selectedJob.priority)}</span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Service Type</p>
                <p className="font-medium">{getServiceTypeLabel(selectedJob.serviceType || 'corrective')}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Scheduled Date</p>
                <p className="font-medium">{selectedJob.scheduledDate || selectedJob.scheduled_date ? new Date(selectedJob.scheduledDate || selectedJob.scheduled_date).toLocaleDateString() : 'Not scheduled'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Mechanic</p>
                <p className="font-medium">{selectedJob.mechanic || 'Pending'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Cost</p>
                <p className="font-medium text-red-600">KSH {(selectedJob.cost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Hours</p>
                <p className="font-medium">{selectedJob.estimatedHours || selectedJob.estimated_hours || 0}h est. / {selectedJob.actualHours || selectedJob.actual_hours || 0}h actual</p>
              </div>
            </div>

            {jobVehicle && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-blue-600" />
                  <span className="text-sm font-medium">{jobVehicle.registration || jobVehicle.id}</span>
                  <span className="text-xs text-gray-500">• {jobVehicle.make} {jobVehicle.model}</span>
                  {jobVehicle.mileage && (
                    <span className="text-xs text-gray-500">• {jobVehicle.mileage} km</span>
                  )}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedJob.description || 'No description'}</p>
            </div>

            {partsUsed.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Parts Used</h4>
                <div className="flex flex-wrap gap-2">
                  {partsUsed.map((part, idx) => (
                    <span key={idx} className="bg-gray-100 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      <Package size={12} /> {part}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              {selectedJob.status !== 'closed' && selectedJob.status !== 'completed' && (
                <>
                  <select 
                    className="flex-1 px-4 py-2 rounded-lg text-sm border border-gray-200 bg-white"
                    value={selectedJob.status}
                    onChange={(e) => {
                      handleUpdateStatus(selectedJob.id, e.target.value);
                    }}
                  >
                    <option value="logged">📋 Logged</option>
                    <option value="approved">✅ Approved</option>
                    <option value="booked">📅 Booked</option>
                    <option value="in_progress">🔧 In Progress</option>
                    <option value="quality_check">🔍 Quality Check</option>
                    <option value="closed">✅ Completed</option>
                  </select>
                  <button 
                    onClick={() => { openEditModal(selectedJob); setShowJobModal(false); }}
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
                  >
                    <Edit size={16} /> Edit
                  </button>
                </>
              )}
              <button 
                onClick={() => { setShowDeleteConfirm(true); }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center justify-center gap-2"
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
    const isOpen = isEdit ? showEditJobForm : showNewJobForm;
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => { isEdit ? setShowEditJobForm(false) : setShowNewJobForm(false); resetForm(); }}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => { isEdit ? setShowEditJobForm(false) : setShowNewJobForm(false); resetForm(); }}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Maintenance Job' : 'New Maintenance Job'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update job details' : 'Create a new service request'}
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

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle *</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.vehicle_id}
                    onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.registration || v.id} - {v.make} {v.model}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type *</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="">Select Type</option>
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Service">Brake Service</option>
                    <option value="Transmission Repair">Transmission Repair</option>
                    <option value="Engine Tune-up">Engine Tune-up</option>
                    <option value="Electrical Fault">Electrical Fault</option>
                    <option value="AC Service">AC Service</option>
                    <option value="Tire Rotation">Tire Rotation</option>
                    <option value="Clutch Replacement">Clutch Replacement</option>
                    <option value="Suspension Repair">Suspension Repair</option>
                    <option value="Cooling System">Cooling System</option>
                    <option value="Exhaust System">Exhaust System</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                  >
                    <option value="low">🔵 Low</option>
                    <option value="medium">🟡 Medium</option>
                    <option value="high">🔴 High</option>
                    <option value="critical">🚨 Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Category</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.service_type || 'corrective'}
                    onChange={(e) => setFormData({...formData, service_type: e.target.value})}
                  >
                    <option value="preventive">🛡️ Preventive</option>
                    <option value="corrective">🔧 Corrective</option>
                    <option value="emergency">🚨 Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  rows="3" 
                  placeholder="Describe the issue..."
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <input 
                    type="date" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Hours</label>
                  <input 
                    type="number" 
                    step="0.5"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="2.5"
                    value={formData.estimated_hours}
                    onChange={(e) => setFormData({...formData, estimated_hours: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                  <input 
                    type="number" 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                    value={formData.cost}
                    onChange={(e) => setFormData({...formData, cost: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mechanic</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.mechanic}
                    onChange={(e) => setFormData({...formData, mechanic: e.target.value})}
                  >
                    <option value="">Select Mechanic</option>
                    <option value="Pending">⏳ Pending Assignment</option>
                    {mechanics.map(m => (
                      <option key={m.id} value={m.name}>
                        {m.name} - {m.specialty} ⭐ {m.rating}
                      </option>
                    ))}
                  </select>
                  {mechanics.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">No mechanics found. Add merchants with type Workshop or Mechanic first.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button 
                  onClick={isEdit ? handleEditJob : handleAddJob}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Save size={18} />
                  )}
                  {isEdit ? 'Update Job' : 'Create Job'}
                </button>
                <button 
                  onClick={() => { isEdit ? setShowEditJobForm(false) : setShowNewJobForm(false); resetForm(); }}
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
  // RENDER DELETE CONFIRM
  // ============================================
  const renderDeleteConfirm = () => {
    if (!showDeleteConfirm || !selectedJob) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Maintenance Job?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete this job for {getVehicleLabel(selectedJob.vehicle?.id || selectedJob.vehicle_id)}? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteJob}
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
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading maintenance data...</p>
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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Wrench className="text-blue-600" />
              Maintenance Management
            </h3>
            <p className="text-sm text-gray-500 mt-1">Track and manage all vehicle maintenance activities</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button 
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
            </button>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setViewMode('kanban')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <ClipboardList size={14} /> Kanban
              </button>
              <button 
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${viewMode === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <Calendar size={14} /> Calendar
              </button>
              <button 
                onClick={() => setViewMode('analytics')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-1 ${viewMode === 'analytics' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
              >
                <BarChart3 size={14} /> Analytics
              </button>
            </div>
            
<button 
  onClick={() => setShowNewJobForm(true)}
  className="bg-blue-600 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm hover:bg-blue-700 flex items-center gap-1 sm:gap-2 transition-colors flex-shrink-0 whitespace-nowrap"
>
  <Plus size={14} className="sm:w-4 sm:h-4" />
  <span>New Job</span>
</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Total Jobs</p>
          <p className="text-2xl font-bold">{stats.totalJobs}</p>
          <p className="text-xs text-green-600">↑ {stats.thisMonth} this month</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">In Progress</p>
          <p className="text-2xl font-bold text-orange-600">{stats.inProgress}</p>
          <p className="text-xs text-gray-500">Active jobs</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          <p className="text-xs text-gray-500">✅ Done</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Critical/Overdue</p>
          <p className="text-2xl font-bold text-red-600">{stats.critical + stats.overdue}</p>
          <p className="text-xs text-red-500">⚠️ Needs attention</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Total Cost</p>
          <p className="text-2xl font-bold">KSH {stats.totalCost.toLocaleString()}</p>
          <p className="text-xs text-gray-500">All jobs</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {maintenanceJobs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Wrench size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No maintenance jobs found</p>
            <p className="text-sm">Click "New Job" to create your first maintenance job</p>
          </div>
        ) : (
          <>
            {viewMode === 'kanban' && renderKanbanView()}
            {viewMode === 'calendar' && renderCalendarView()}
            {viewMode === 'analytics' && renderAnalyticsView()}
          </>
        )}
      </div>

      {/* Modals */}
      {showJobModal && renderJobModal()}
      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
    </div>
  );
};

export default Maintenance;