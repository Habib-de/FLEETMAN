// src/pages/car-owner/Incidents.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Camera, User, Search, Filter, Download,
  Map, BarChart3, AlertCircle,
  CheckCircle, Clock, Edit, Trash2,
  AlertTriangle, X, FileText, Save, RefreshCw, Image as ImageIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  incidentService, 
  vehicleService, 
  driverService,
  geofenceService,
  tripService   // ✅ ADDED
} from '../../services/api';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ============================================
// LOCATION NAME CACHE - SIMPLIFIED
// ============================================
let locationNameCache = {};
const CACHE_KEY = 'fleetman_location_cache';
const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30 days

// Get real location name from coordinates
const getRealLocationName = async (lat, lng) => {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  
  // Check localStorage cache first
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const cacheData = JSON.parse(cached);
      if (cacheData[cacheKey]) {
        const entry = cacheData[cacheKey];
        if (Date.now() - entry.timestamp < CACHE_EXPIRY) {
          return entry.name;
        }
      }
    } catch (e) {}
  }
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'FLEETMAN Fleet Management System'
        }
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    let locationName = null;
    
    if (data && data.display_name) {
      const address = data.address;
      locationName = 
        address.building || 
        address.road || 
        address.suburb || 
        address.city || 
        address.town || 
        address.village || 
        address.state || 
        address.country;
      
      const cleanName = locationName?.replace(/^Point\s+\d+\s*-\s*/, '') || locationName;
      const result = `📍 ${cleanName || data.display_name.split(',')[0]}`;
      
      // Save to cache
      const existingCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
      existingCache[cacheKey] = {
        name: result,
        timestamp: Date.now()
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(existingCache));
      
      return result;
    }
    
    return null;
  } catch (error) {
    console.warn('Geocoding failed:', error);
    return null;
  }
};

// Get location name with caching
const getLocationName = async (lat, lng) => {
  if (!lat || !lng) return 'Unknown Location';
  
  const latFixed = parseFloat(lat).toFixed(4);
  const lngFixed = parseFloat(lng).toFixed(4);
  
  const keyWithSpace = `${latFixed}, ${lngFixed}`;
  if (locationNameCache[keyWithSpace]) {
    return locationNameCache[keyWithSpace];
  }
  
  const keyNoSpace = `${latFixed},${lngFixed}`;
  if (locationNameCache[keyNoSpace]) {
    return locationNameCache[keyNoSpace];
  }
  
  // Only fetch if not cached
  try {
    const name = await getRealLocationName(lat, lng);
    if (name) {
      locationNameCache[keyWithSpace] = name;
      locationNameCache[keyNoSpace] = name;
      return name;
    }
  } catch (e) {
    console.warn('Could not fetch location name:', e);
  }
  
  // Fallback to coordinates
  return `${latFixed}, ${lngFixed}`;
};

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
});

// ============================================
// CUSTOM HOOK FOR LOCATION NAMES
// ============================================
const useLocationNames = (incidents) => {
  const [locationNames, setLocationNames] = useState({});
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    const loadLocationNames = async () => {
      const incidentsWithCoords = incidents.filter(incident => {
        const coords = extractCoordinates(incident);
        return coords !== null;
      });

      if (incidentsWithCoords.length === 0) return;
      
      setLoadingNames(true);
      const names = {};
      
      for (const incident of incidentsWithCoords) {
        const coords = extractCoordinates(incident);
        if (coords) {
          const key = `${coords.lat},${coords.lng}`;
          if (!names[key]) {
            const name = await getLocationName(coords.lat, coords.lng);
            names[key] = name;
          }
        }
      }
      
      setLocationNames(names);
      setLoadingNames(false);
    };
    
    loadLocationNames();
  }, [incidents]);

  return { locationNames, loadingNames };
};

// Helper function to extract coordinates
const extractCoordinates = (incident) => {
  let lat = incident.lat || incident.latitude || incident.coordinates?.lat;
  let lng = incident.lng || incident.longitude || incident.coordinates?.lng;
  
  if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
    return { lat: parseFloat(lat), lng: parseFloat(lng) };
  }
  
  if (incident.location && typeof incident.location === 'string') {
    const coordMatch = incident.location.match(/([-+]?\d+\.?\d*)\s*[,]\s*([-+]?\d+\.?\d*)/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
  }
  
  return null;
};

const Incidents = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [dateRange, setDateRange] = useState('this_month');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tenantId, setTenantId] = useState('');
  
  // Image upload states
  const [imagePreview, setImagePreview] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState(null);
  const imageInputRef = useRef(null);
  const editImageInputRef = useRef(null);

  // ============================================
  // INCIDENT TYPES
  // ============================================
  const incidentTypes = [
    'Collision',
    'Mechanical',
    'Theft Attempt',
    'Vandalism',
    'Fire',
    'Accident',
    'Breakdown',
    'Panic Alert',
    'Geofence Violation',
    'Other'
  ];

  // ============================================
  // INCIDENT SYNC HELPERS
  // ============================================

  // Get active trip for a vehicle
  const getActiveTripForVehicle = async (vehicleId) => {
    try {
      const response = await tripService.getActiveByVehicle(vehicleId);
      if (response?.success && response?.data) {
        const trips = Array.isArray(response.data) ? response.data : [response.data];
        return trips.length > 0 ? trips[0] : null;
      }
      return null;
    } catch (error) {
      console.warn('Could not fetch active trip:', error);
      return null;
    }
  };

  // Update vehicle status
  const updateVehicleStatus = async (vehicleId, status) => {
  try {
    // Get full vehicle first
    const vehicleRes = await vehicleService.getById(vehicleId);
    const vehicle = vehicleRes?.data;
    
    if (!vehicle) {
      console.warn('Vehicle not found:', vehicleId);
      return false;
    }
    
    // ✅ FIX: Try multiple places where driver ID might be stored
    const driverId = vehicle.driverId || vehicle.driver_id || vehicle.driver?.id || null;
    
    // Build update payload with ALL fields
    const updatePayload = {
      tenant: { id: vehicle.tenant?.id || vehicle.tenantId },
      registration: vehicle.registration || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || 2024,
      vin: vehicle.vin || '',
      category: vehicle.category || 'Pickup',
      status: status,  // ✅ Updated status
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
      driverId: driverId,  // ✅ PRESERVES driver!
      accessories: vehicle.accessories || '[]'
    };
    
    const response = await vehicleService.update(vehicleId, updatePayload);
    return response?.success || false;
  } catch (error) {
    console.error('Failed to update vehicle status:', error);
    return false;
  }
};

  // Create an alarm
  const createAlarm = async (alarmData) => {
    try {
      // Store in localStorage for now
      const alarms = JSON.parse(localStorage.getItem('fleetman_alarms') || '[]');
      const newAlarm = {
        id: `alarm_${Date.now()}`,
        ...alarmData,
        createdAt: new Date().toISOString(),
        resolved: false
      };
      alarms.unshift(newAlarm);
      localStorage.setItem('fleetman_alarms', JSON.stringify(alarms));
      
      // Dispatch event for real-time updates
      window.dispatchEvent(new CustomEvent('newAlarm', { detail: newAlarm }));
      
      return newAlarm;
    } catch (error) {
      console.error('Failed to create alarm:', error);
      return null;
    }
  };

  // Send notification
  const sendNotification = async (userId, title, message, link = null) => {
    try {
      const notificationData = {
        userId: userId,
        title: title,
        message: message,
        link: link || '/incidents',
        read: false,
        createdAt: new Date().toISOString()
      };
      
      const notifications = JSON.parse(localStorage.getItem('fleetman_notifications') || '[]');
      notifications.unshift(notificationData);
      localStorage.setItem('fleetman_notifications', JSON.stringify(notifications));
      
      window.dispatchEvent(new CustomEvent('newNotification', { detail: notificationData }));
      
      return true;
    } catch (error) {
      console.error('Failed to send notification:', error);
      return false;
    }
  };

  // ============================================
  // OPTIMIZED LOAD DATA - PARALLEL AND NO GEOFENCES
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view incidents');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      // Load all data in parallel using Promise.all
      const [incidentsRes, vehiclesRes, driversRes] = await Promise.all([
        incidentService.getByTenant(tenant),
        vehicleService.getAll(tenant),
        driverService.getAll(tenant)
      ]);

      // Process incidents
      if (incidentsRes?.success && incidentsRes?.data) {
        const incidentsData = Array.isArray(incidentsRes.data) ? incidentsRes.data : [incidentsRes.data];
        setIncidents(incidentsData);
        console.log('✅ Loaded incidents:', incidentsData.length);
      } else {
        setIncidents([]);
      }

      // Process vehicles
      if (vehiclesRes?.success && vehiclesRes?.data) {
        const vehiclesData = Array.isArray(vehiclesRes.data) ? vehiclesRes.data : [vehiclesRes.data];
        setVehicles(vehiclesData);
        console.log('✅ Loaded vehicles:', vehiclesData.length);
      }

      // Process drivers
      if (driversRes?.success && driversRes?.data) {
        const driversData = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
        setDrivers(driversData);
        console.log('✅ Loaded drivers:', driversData.length);
      }

    } catch (error) {
      console.error('❌ Error loading incidents:', error);
      setErrorMessage('Failed to load incidents. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
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
  // LISTEN FOR PANIC ALERTS
  // ============================================
  useEffect(() => {
    const handlePanicAlert = (event) => {
      console.log('🚨 Panic alert received!', event.detail);
      setTimeout(loadData, 1000);
    };

    window.addEventListener('panicAlert', handlePanicAlert);
    window.addEventListener('incidentsUpdated', handlePanicAlert);

    return () => {
      window.removeEventListener('panicAlert', handlePanicAlert);
      window.removeEventListener('incidentsUpdated', handlePanicAlert);
    };
  }, []);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    total: incidents.length,
    high: incidents.filter(i => 
      i.severity?.toLowerCase() === 'high' || i.severity?.toLowerCase() === 'critical'
    ).length,
    medium: incidents.filter(i => i.severity?.toLowerCase() === 'medium').length,
    low: incidents.filter(i => i.severity?.toLowerCase() === 'low').length,
    resolved: incidents.filter(i => 
      i.status?.toLowerCase() === 'resolved' || i.status?.toLowerCase() === 'closed'
    ).length,
    investigating: incidents.filter(i => i.status?.toLowerCase() === 'investigating').length,
    inProgress: incidents.filter(i => i.status?.toLowerCase() === 'in_progress').length,
    reported: incidents.filter(i => i.status?.toLowerCase() === 'reported').length,
    totalCost: incidents.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0),
    panicAlerts: incidents.filter(i => 
      i.incidentType?.toLowerCase() === 'panic alert' || i.incidentType === 'Panic Alert'
    ).length,
  };

  // ============================================
  // HELPERS
  // ============================================
  const getSeverityColor = (severity) => {
    const sev = severity?.toLowerCase() || '';
    const colors = {
      'critical': 'bg-red-700 text-white border-red-800',
      'high': 'bg-red-100 text-red-700 border-red-200',
      'medium': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'low': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return colors[sev] || 'bg-gray-100 text-gray-700';
  };

  const getStatusColor = (status) => {
    const stat = status?.toLowerCase() || '';
    const colors = {
      'resolved': 'bg-green-100 text-green-700',
      'closed': 'bg-green-100 text-green-700',
      'investigating': 'bg-orange-100 text-orange-700',
      'in_progress': 'bg-blue-100 text-blue-700',
      'reported': 'bg-gray-100 text-gray-700',
    };
    return colors[stat] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const stat = status?.toLowerCase() || '';
    const labels = {
      'resolved': 'Resolved',
      'closed': 'Closed',
      'investigating': 'Investigating',
      'in_progress': 'In Progress',
      'reported': 'Reported',
    };
    return labels[stat] || status || 'Unknown';
  };

  const getStatusIcon = (status) => {
    const stat = status?.toLowerCase() || '';
    switch(stat) {
      case 'resolved':
      case 'closed': return <CheckCircle size={14} className="text-green-600" />;
      case 'investigating': return <AlertCircle size={14} className="text-orange-600" />;
      case 'in_progress': return <Clock size={14} className="text-blue-600" />;
      default: return <AlertTriangle size={14} className="text-gray-600" />;
    }
  };

  const getVehicleLabel = (vehicleId) => {
    if (!vehicleId || vehicleId === 'Unknown' || vehicleId === 'N/A') return 'Unknown';
    const vehicle = vehicles.find(v => v.id === vehicleId || v.registration === vehicleId || v.reg === vehicleId);
    return vehicle ? vehicle.registration || vehicle.reg || vehicle.id : vehicleId;
  };

  const getDriverName = (driverId) => {
    if (!driverId) return 'Unassigned';
    const driver = drivers.find(d => String(d.id) === String(driverId));
    return driver ? driver.name : 'Unassigned';
  };

  // Helper to parse attachments from JSON string or array
  const parseAttachments = (attachments) => {
    if (!attachments) return [];
    try {
      if (typeof attachments === 'string') {
        return JSON.parse(attachments);
      }
      if (Array.isArray(attachments)) {
        return attachments;
      }
      return [];
    } catch (e) {
      console.error('Error parsing attachments:', e);
      return [];
    }
  };

  // ============================================
  // IMAGE HANDLERS
  // ============================================
  const handleImageChange = (e, isEdit = false) => {
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
        const currentAttachments = editFormData.attachments || [];
        setEditFormData({ 
          ...editFormData, 
          attachments: [...currentAttachments, base64String] 
        });
        setEditImagePreview(base64String);
      } else {
        const currentAttachments = formData.attachments || [];
        setFormData({ 
          ...formData, 
          attachments: [...currentAttachments, base64String] 
        });
        setImagePreview(base64String);
      }
      setSuccessMessage('Image added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    };
    reader.readAsDataURL(file);
    
    // Reset input
    e.target.value = '';
  };

  const removeImage = (index, isEdit = false) => {
    if (isEdit) {
      const currentAttachments = editFormData.attachments || [];
      const updatedAttachments = currentAttachments.filter((_, i) => i !== index);
      setEditFormData({ ...editFormData, attachments: updatedAttachments });
      if (editImagePreview && index === 0) {
        setEditImagePreview(null);
      }
    } else {
      const currentAttachments = formData.attachments || [];
      const updatedAttachments = currentAttachments.filter((_, i) => i !== index);
      setFormData({ ...formData, attachments: updatedAttachments });
      if (imagePreview && index === 0) {
        setImagePreview(null);
      }
    }
  };

  // ============================================
  // IMAGE VIEW HANDLER
  // ============================================
  const viewImage = (image) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      driver_id: '',
      incident_type: '',
      severity: 'medium',
      status: 'reported',
      location: '',
      description: '',
      police_report: '',
      cost: '',
      reported_by: '',
      attachments: []
    });
    setImagePreview(null);
    setEditImagePreview(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    incident_type: '',
    severity: 'medium',
    status: 'reported',
    location: '',
    description: '',
    police_report: '',
    cost: '',
    reported_by: '',
    attachments: []
  });

  const [editFormData, setEditFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    incident_type: '',
    severity: 'medium',
    status: 'reported',
    location: '',
    description: '',
    police_report: '',
    cost: '',
    reported_by: '',
    attachments: []
  });

  // ============================================
  // UPDATED: handleAddIncident - WITH SYNC
  // ============================================
  const handleAddIncident = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.vehicle_id || !formData.incident_type || !formData.description) {
      setErrorMessage('Vehicle, incident type, and description are required');
      setIsLoading(false);
      return;
    }

    try {
      // ============================================
      // STEP 1: Check if vehicle has active trip
      // ============================================
      const activeTrip = await getActiveTripForVehicle(formData.vehicle_id);
      
      // ============================================
      // STEP 2: Prepare incident data
      // ============================================
      const incidentData = {
        tenant: { id: tenantId },
        vehicle: { id: formData.vehicle_id },
        driver: formData.driver_id ? { id: formData.driver_id } : null,
        incidentType: formData.incident_type,
        severity: formData.severity || 'medium',
        status: formData.status || 'reported',
        location: formData.location || '',
        description: formData.description,
        policeReport: formData.police_report || '',
        cost: parseFloat(formData.cost) || 0,
        reportedBy: formData.reported_by || currentUser?.name || 'System',
        attachments: JSON.stringify(formData.attachments || [])
      };

      // ============================================
      // STEP 3: Link incident to active trip if exists
      // ============================================
      if (activeTrip) {
        incidentData.tripId = activeTrip.id;
        console.log('🔗 Incident linked to active trip:', activeTrip.id);
      }

      // ============================================
      // STEP 4: Create the incident
      // ============================================
      const response = await incidentService.create(incidentData);
      
      if (response?.success) {
        const newIncident = response.data;
        const severity = formData.severity?.toLowerCase() || 'medium';
        
        // ============================================
        // STEP 5: Update vehicle status based on severity
        // ============================================
        if (severity === 'high' || severity === 'critical') {
          const vehicleUpdated = await updateVehicleStatus(formData.vehicle_id, 'Maintenance');
          if (vehicleUpdated) {
            console.log(`🚗 Vehicle ${formData.vehicle_id} status updated to 'Maintenance'`);
            setSuccessMessage(`🚨 Incident reported! Vehicle ${getVehicleLabel(formData.vehicle_id)} marked as in maintenance.`);
          }
        }

        // ============================================
        // STEP 6: End active trip if severe incident
        // ============================================
        if (activeTrip && (severity === 'high' || severity === 'critical')) {
          try {
            await tripService.update(activeTrip.id, {
              status: 'interrupted',
              endTime: new Date().toISOString(),
              notes: `Trip interrupted due to incident: ${formData.incident_type}`
            });
            console.log(`🛑 Active trip ${activeTrip.id} ended due to incident`);
          } catch (tripError) {
            console.warn('Could not end trip:', tripError);
          }
        }

        // ============================================
        // STEP 7: Create alarm for severe incidents
        // ============================================
        if (severity === 'high' || severity === 'critical') {
          const alarmData = {
            type: 'INCIDENT',
            severity: severity,
            vehicleId: formData.vehicle_id,
            vehicleName: getVehicleLabel(formData.vehicle_id),
            driverId: formData.driver_id || null,
            driverName: formData.driver_id ? getDriverName(formData.driver_id) : 'Unknown',
            incidentType: formData.incident_type,
            message: `${formData.incident_type} incident reported on ${getVehicleLabel(formData.vehicle_id)}`,
            description: formData.description,
            lat: null,
            lng: null
          };
          
          await createAlarm(alarmData);
          console.log('🚨 Alarm created for severe incident');
        }

        // ============================================
        // STEP 8: Send notification to car owner
        // ============================================
        try {
          const vehicle = vehicles.find(v => v.id === formData.vehicle_id);
          const tenantUsers = JSON.parse(localStorage.getItem('fleetman_users') || '[]');
          const carOwner = tenantUsers.find(u => 
            u.tenantId === tenantId && u.role === 'car_owner'
          );
          
          if (carOwner) {
            await sendNotification(
              carOwner.id,
              `🚨 ${formData.incident_type} Incident Reported`,
              `${formData.incident_type} incident on ${getVehicleLabel(formData.vehicle_id)}. Severity: ${formData.severity}. Please review.`,
              '/incidents'
            );
            console.log('📧 Notification sent to car owner');
          }
        } catch (notifError) {
          console.warn('Could not send notification:', notifError);
        }

        // ============================================
        // STEP 9: Dispatch events
        // ============================================
        window.dispatchEvent(new CustomEvent('incidentsUpdated'));
        window.dispatchEvent(new CustomEvent('vehiclesUpdated'));
        
        if (successMessage === '') {
          setSuccessMessage('✅ Incident reported successfully!');
        }
        setShowReportModal(false);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to report incident. Please try again.');
      }
    } catch (error) {
      console.error('Error adding incident:', error);
      setErrorMessage('Failed to report incident. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // handleEditIncident
  // ============================================
  const handleEditIncident = async () => {
    if (!selectedIncident) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const incidentData = {
        vehicle: { id: editFormData.vehicle_id },
        driver: editFormData.driver_id ? { id: editFormData.driver_id } : null,
        incidentType: editFormData.incident_type,
        severity: editFormData.severity || 'medium',
        status: editFormData.status || 'reported',
        location: editFormData.location || '',
        description: editFormData.description,
        policeReport: editFormData.police_report || '',
        cost: parseFloat(editFormData.cost) || 0,
        reportedBy: editFormData.reported_by || currentUser?.name || 'System',
        attachments: JSON.stringify(editFormData.attachments || [])
      };

      const response = await incidentService.update(selectedIncident.id, incidentData);
      if (response?.success) {
        setSuccessMessage('Incident updated successfully!');
        setShowEditModal(false);
        setSelectedIncident(null);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to update incident. Please try again.');
      }
    } catch (error) {
      console.error('Error updating incident:', error);
      setErrorMessage('Failed to update incident. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // handleDeleteIncident
  // ============================================
  const handleDeleteIncident = async () => {
    if (!selectedIncident) return;

    try {
      const response = await incidentService.delete(selectedIncident.id);
      if (response?.success) {
        setSuccessMessage('Incident deleted successfully!');
        setShowDeleteConfirm(false);
        setSelectedIncident(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to delete incident. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting incident:', error);
      setErrorMessage('Failed to delete incident. Please try again.');
    }
  };

  const openEditModal = (incident) => {
    setSelectedIncident(incident);
    
    const attachments = parseAttachments(incident.attachments);
    
    setEditFormData({
      vehicle_id: incident.vehicleId || incident.vehicle_id || '',
      driver_id: incident.driverId || incident.driver_id || '',
      incident_type: incident.incidentType || incident.incident_type || '',
      severity: incident.severity || 'medium',
      status: incident.status || 'reported',
      location: incident.location || '',
      description: incident.description || '',
      police_report: incident.policeReport || incident.police_report || '',
      cost: incident.cost || '',
      reported_by: incident.reportedBy || incident.reported_by || '',
      attachments: attachments
    });
    setEditImagePreview(attachments && attachments.length > 0 ? attachments[0] : null);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (incident) => {
    setSelectedIncident(incident);
    setShowDeleteConfirm(true);
  };

  // ============================================
  // FILTER INCIDENTS
  // ============================================
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = 
      (getVehicleLabel(incident.vehicleId || incident.vehicle_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getDriverName(incident.driverId || incident.driver_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (incident.incidentType || incident.incident_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (incident.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || incident.severity?.toLowerCase() === severityFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || incident.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // ============================================
  // RENDER MODALS
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showReportModal;
    const data = isEdit ? editFormData : formData;
    const setData = isEdit ? setEditFormData : setFormData;
    const handleSubmit = isEdit ? handleEditIncident : handleAddIncident;
    const closeModal = () => {
      if (isEdit) {
        setShowEditModal(false);
        setSelectedIncident(null);
      } else {
        setShowReportModal(false);
      }
      resetForm();
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

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-red-600 to-red-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Incident' : 'Report Incident'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-red-100'}`}>
              {isEdit ? 'Update incident details' : 'Fill in the incident details'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Incident Type *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.incident_type}
                  onChange={(e) => setData({...data, incident_type: e.target.value})}
                >
                  <option value="">Select Type</option>
                  {incidentTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.severity}
                  onChange={(e) => setData({...data, severity: e.target.value})}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.status}
                  onChange={(e) => setData({...data, status: e.target.value})}
                >
                  <option value="reported">Reported</option>
                  <option value="investigating">Investigating</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  value={data.cost}
                  onChange={(e) => setData({...data, cost: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter location"
                  value={data.location}
                  onChange={(e) => setData({...data, location: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="3"
                  placeholder="Describe the incident..."
                  value={data.description}
                  onChange={(e) => setData({...data, description: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Police Report</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Police report number or reference"
                  value={data.police_report}
                  onChange={(e) => setData({...data, police_report: e.target.value})}
                />
              </div>
              
              {/* Image Upload Section */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Incident Images (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={isEdit ? editImageInputRef : imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, isEdit)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isEdit && editImageInputRef.current) {
                        editImageInputRef.current.click();
                      } else if (imageInputRef.current) {
                        imageInputRef.current.click();
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                  >
                    <Camera size={16} /> Add Image
                  </button>
                  <span className="text-xs text-gray-400">JPG, PNG (Max 5MB)</span>
                </div>

                {(data.attachments && data.attachments.length > 0) && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                    {data.attachments.map((img, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={img} 
                          alt={`Incident ${index + 1}`} 
                          className="h-20 w-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => viewImage(img)}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index, isEdit)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                {isEdit ? 'Update Incident' : 'Submit Report'}
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
    if (!showDeleteConfirm || !selectedIncident) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Incident?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete this incident report? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteIncident}
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
  // RENDER IMAGE MODAL
  // ============================================
  const renderImageModal = () => {
    if (!showImageModal || !selectedImage) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowImageModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-4">
          <button 
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>
          <div className="flex items-center justify-center p-4">
            <img 
              src={selectedImage} 
              alt="Incident" 
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
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
              placeholder="Search incidents..." 
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
        <button 
          onClick={() => setShowReportModal(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-2"
        >
          <Plus size={16} /> Report Incident
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="reported">Reported</option>
              <option value="investigating">Investigating</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Types</option>
              {incidentTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filteredIncidents.length > 0 ? (
        <div className="space-y-3">
          {filteredIncidents.map((incident) => {
            const isPanic = incident.incidentType?.toLowerCase() === 'panic alert' || incident.incidentType === 'Panic Alert';
            const vehicleId = incident.vehicleId || incident.vehicle_id;
            const driverId = incident.driverId || incident.driver_id;
            const vehicleLabel = getVehicleLabel(vehicleId);
            const driverName = incident.driverName || getDriverName(driverId) || 'Unknown';
            const attachments = parseAttachments(incident.attachments);
            
            return (
              <div 
                key={incident.id} 
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${
                  isPanic ? 'bg-red-50 hover:bg-red-100 border-2 border-red-500' : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {isPanic && (
                      <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                        🚨 PANIC
                      </span>
                    )}
                    <p className="font-medium">{vehicleLabel !== 'Unknown' ? vehicleLabel : (incident.vehicle || 'N/A')}</p>
                    <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                    <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(incident.status)}`}>
                      {getStatusIcon(incident.status)}
                      {getStatusLabel(incident.status)}
                    </span>
                    <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                      {incident.incidentType || incident.incident_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : 'N/A'} · {incident.location || 'No location'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400">
                    <span><User size={12} className="inline mr-1" /> {driverName}</span>
                    {incident.policeReport && (
                      <span><FileText size={12} className="inline mr-1" /> {incident.policeReport}</span>
                    )}
                    <span><Camera size={12} className="inline mr-1" /> {attachments.length} images</span>
                    {attachments.length > 0 && (
                      <span className="flex gap-1">
                        {attachments.slice(0, 3).map((img, idx) => (
                          <img 
                            key={idx} 
                            src={img} 
                            alt="" 
                            className="w-6 h-6 rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewImage(img);
                            }}
                          />
                        ))}
                        {attachments.length > 3 && (
                          <span 
                            className="text-xs bg-gray-200 px-1.5 py-0.5 rounded cursor-pointer hover:bg-gray-300"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewImage(attachments[3]);
                            }}
                          >
                            +{attachments.length - 3}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {isPanic && incident.description && (
                    <p className="text-xs text-red-600 mt-1 font-medium">{incident.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2 sm:mt-0">
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">LSL {(incident.cost || 0).toLocaleString()}</p>
                    <div className="flex gap-1 mt-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditModal(incident); }}
                        className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100"
                      >
                        <Edit size={12} className="inline" /> Edit
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); openDeleteConfirm(incident); }}
                        className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100"
                      >
                        <Trash2 size={12} className="inline" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No incidents found</p>
          <p className="text-sm">Click "Report Incident" to add your first incident</p>
        </div>
      )}

      {filteredIncidents.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Total incidents: <span className="font-semibold">{filteredIncidents.length}</span> · 
            Panic Alerts: <span className="font-semibold text-red-600">{stats.panicAlerts}</span> · 
            Avg cost: <span className="font-semibold">LSL {stats.total > 0 ? Math.round(stats.totalCost / stats.total).toLocaleString() : 0}</span>
          </p>
          <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <Download size={14} /> Export Report
          </button>
        </div>
      )}
    </div>
  );

  // ============================================
  // MAP VIEW COMPONENT
  // ============================================
  const MapView = () => {
    const { locationNames, loadingNames } = useLocationNames(incidents);

    const incidentsWithCoords = incidents.filter(incident => {
      const coords = extractCoordinates(incident);
      return coords !== null;
    });

    if (incidentsWithCoords.length === 0) {
      return (
        <div className="space-y-4">
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p>No incidents with location coordinates</p>
            <p className="text-sm">Incidents with GPS coordinates will appear here</p>
          </div>
        </div>
      );
    }

    const firstCoords = extractCoordinates(incidentsWithCoords[0]);
    const center = firstCoords || { lat: -1.2921, lng: 36.8219 };

    const createIncidentIcon = (severity) => {
      const isHigh = severity?.toLowerCase() === 'high' || severity?.toLowerCase() === 'critical';
      const isMedium = severity?.toLowerCase() === 'medium';
      const color = isHigh ? '#ef4444' : isMedium ? '#eab308' : '#3b82f6';
      const size = isHigh ? 32 : 24;
      
      return L.divIcon({
        className: 'custom-incident-marker',
        html: `<div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          ${isHigh ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}
        ">
          <svg width="${size/2}" height="${size/2}" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L1 21h22L12 2z"/>
          </svg>
        </div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
        </style>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
      });
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h4 className="font-semibold text-sm">📍 Incident Locations</h4>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              <span>High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              <span>Low</span>
            </div>
            {loadingNames && (
              <span className="text-gray-400 ml-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 inline-block mr-1"></div>
                Loading locations...
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <MapContainer 
            key={`incident-map-${center.lat}-${center.lng}`}
            center={[center.lat, center.lng]} 
            zoom={13} 
            style={{ height: '450px', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {incidentsWithCoords.map((incident) => {
              const coords = extractCoordinates(incident);
              if (!coords) return null;
              
              const vehicleLabel = getVehicleLabel(incident.vehicleId || incident.vehicle_id);
              const driverName = incident.driverName || getDriverName(incident.driverId || incident.driver_id) || 'Unknown';
              const attachments = parseAttachments(incident.attachments);
              const locationKey = `${coords.lat},${coords.lng}`;
              const locationName = locationNames[locationKey] || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
              
              return (
                <Marker 
                  key={incident.id}
                  position={[coords.lat, coords.lng]}
                  icon={createIncidentIcon(incident.severity)}
                >
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(incident.severity)}`}>
                          {incident.severity || 'Unknown'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(incident.status)}`}>
                          {getStatusLabel(incident.status)}
                        </span>
                      </div>
                      <p className="font-bold">{vehicleLabel}</p>
                      <p className="text-gray-600 text-xs">
                        <User size={12} className="inline mr-1" /> {driverName}
                      </p>
                      <p className="text-gray-600 text-xs">
                        <AlertTriangle size={12} className="inline mr-1" /> 
                        {incident.incidentType || incident.incident_type || 'Unknown type'}
                      </p>
                      <p className="text-blue-600 text-xs mt-1 font-medium">
                        📍 {locationName}
                      </p>
                      {incident.description && (
                        <p className="text-gray-500 text-xs mt-1">
                          {incident.description.length > 100 
                            ? incident.description.substring(0, 100) + '...' 
                            : incident.description}
                        </p>
                      )}
                      {incident.cost && (
                        <p className="text-red-600 text-xs font-medium mt-1">
                          Cost: LSL {parseFloat(incident.cost).toLocaleString()}
                        </p>
                      )}
                      {attachments.length > 0 && (
                        <div className="flex gap-1 mt-2">
                          {attachments.slice(0, 3).map((img, idx) => (
                            <img 
                              key={idx} 
                              src={img} 
                              alt="" 
                              className="w-10 h-10 rounded object-cover border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                viewImage(img);
                              }}
                            />
                          ))}
                          {attachments.length > 3 && (
                            <div className="w-10 h-10 rounded bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                              +{attachments.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-gray-400 text-[10px] mt-2">
                        {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : 'N/A'}
                      </p>
                      <div className="mt-2 pt-2 border-t border-gray-200 flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditModal(incident); }}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100"
                        >
                          <Edit size={12} className="inline" /> Edit
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirm(incident); }}
                          className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100"
                        >
                          <Trash2 size={12} className="inline" />
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        <div className="max-h-40 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 mb-1">📍 Incidents with locations:</p>
          <div className="space-y-1">
            {incidentsWithCoords.slice(0, 5).map(incident => {
              const coords = extractCoordinates(incident);
              if (!coords) return null;
              const vehicleLabel = getVehicleLabel(incident.vehicleId || incident.vehicle_id);
              const locationKey = `${coords.lat},${coords.lng}`;
              const locationName = locationNames[locationKey] || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`;
              
              return (
                <div 
                  key={incident.id}
                  className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded hover:bg-gray-100 cursor-pointer"
                  onClick={() => setSelectedIncident(incident)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      incident.severity?.toLowerCase() === 'high' || incident.severity?.toLowerCase() === 'critical'
                        ? 'bg-red-500' 
                        : incident.severity?.toLowerCase() === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}></span>
                    <span className="font-medium truncate">{vehicleLabel}</span>
                    <span className="text-gray-400 truncate">{incident.incidentType || incident.incident_type}</span>
                  </div>
                  <span className="text-gray-400 text-[10px] flex-shrink-0 ml-2">
                    📍 {locationName}
                  </span>
                </div>
              );
            })}
            {incidentsWithCoords.length > 5 && (
              <p className="text-xs text-gray-400 text-center">+ {incidentsWithCoords.length - 5} more incidents</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER ANALYTICS VIEW
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Incidents</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">High Severity</p>
          <p className="text-2xl font-bold text-red-600">{stats.high}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Resolved</p>
          <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Cost</p>
          <p className="text-2xl font-bold text-orange-600">LSL {stats.totalCost.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Severity Distribution</h5>
          <div className="space-y-2">
            {[
              { label: 'High', count: stats.high, color: 'bg-red-500' },
              { label: 'Medium', count: stats.medium, color: 'bg-yellow-500' },
              { label: 'Low', count: stats.low, color: 'bg-blue-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count} ({stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} rounded-full h-2`} style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Status Breakdown</h5>
          <div className="space-y-2">
            {[
              { label: 'Resolved', count: stats.resolved, color: 'bg-green-500' },
              { label: 'Investigating', count: stats.investigating, color: 'bg-orange-500' },
              { label: 'In Progress', count: stats.inProgress, color: 'bg-blue-500' },
              { label: 'Reported', count: stats.reported, color: 'bg-gray-500' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-sm font-medium">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h5 className="font-medium text-sm mb-3">Monthly Incident Trend</h5>
        {incidents.length > 0 ? (
          <div>
            <div className="h-32 flex items-end justify-between gap-1">
              {Array.from({ length: 12 }, (_, i) => {
                const count = incidents.filter(inc => {
                  const date = new Date(inc.createdAt);
                  return date.getMonth() === i;
                }).length;
                const max = Math.max(1, ...incidents.map(inc => {
                  const date = new Date(inc.createdAt);
                  return incidents.filter(inc2 => new Date(inc2.createdAt).getMonth() === date.getMonth()).length;
                }));
                return (
                  <div key={i} className="flex flex-col items-center flex-1">
                    <div 
                      className="w-full rounded-t bg-red-400"
                      style={{ height: `${(count / max) * 100}%` }}
                    ></div>
                    <span className="text-[8px] text-gray-400 mt-1">{['J','F','M','A','M','J','J','A','S','O','N','D'][i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400 text-sm">
            No data available
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading incidents...</p>
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
            <h3 className="text-lg sm:text-xl font-semibold">Incident Management</h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Track and manage all fleet incidents</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button 
              onClick={() => setShowReportModal(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center gap-2"
            >
              <Plus size={16} /> Report Incident
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'list', label: 'List', icon: FileText },
            { id: 'map', label: 'Map View', icon: Map },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 sm:gap-2 ${
                activeTab === tab.id 
                  ? 'bg-red-50 text-red-600 border-b-2 border-red-600' 
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
        {activeTab === 'map' && <MapView />}
        {activeTab === 'analytics' && renderAnalyticsView()}
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
      {renderImageModal()}
    </div>
  );
};

export default Incidents;