// src/pages/car-owner/Geofencing.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, MapPin, AlertTriangle, Edit, Trash2,
  Search, Filter, Download, X,
  BarChart3, Save, CheckCircle,
  Users, Route, Navigation, RefreshCw,
  Tag, FileText, Clock
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useAuth } from '../../context/AuthContext';
import { 
  geofenceService, 
  vehicleService, 
  driverService,
  tenantService, 
  incidentService
} from '../../services/api';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// SAFETY WRAPPER COMPONENTS
// ============================================
const SafeCircle = ({ center, children, ...props }) => {
  if (!center || !Array.isArray(center) || center.length < 2) {
    return null;
  }
  
  const lat = parseFloat(center[0]);
  const lng = parseFloat(center[1]);
  
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  
  try {
    return <Circle center={[lat, lng]} {...props}>{children}</Circle>;
  } catch (e) {
    return null;
  }
};

const SafePolyline = ({ positions, children, ...props }) => {
  if (!positions || !Array.isArray(positions) || positions.length < 2) {
    return null;
  }
  
  const validPositions = positions.filter(pos => {
    if (!pos || !Array.isArray(pos) || pos.length < 2) return false;
    const lat = parseFloat(pos[0]);
    const lng = parseFloat(pos[1]);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });
  
  if (validPositions.length < 2) {
    return null;
  }
  
  try {
    return <Polyline positions={validPositions} {...props}>{children}</Polyline>;
  } catch (e) {
    return null;
  }
};

// ============================================
// MAP CLICK HANDLER
// ============================================
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
};

const Geofencing = () => {
  const { currentUser } = useAuth();
  
  // ============================================
  // STATE
  // ============================================
  const [activeTab, setActiveTab] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGeofence, setSelectedGeofence] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [geofences, setGeofences] = useState([]);
  const [violations, setViolations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: -1.2921, lng: 36.8219 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [editingPointIndex, setEditingPointIndex] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'route',
    centerLat: -1.2921,
    centerLng: 36.8219,
    radius: 500,
    color: '#2563EB',
    isActive: true,
    coordinates: null,
    points: [
      { lat: -1.28361, lng: 36.81722, name: 'Start Point' },
      { lat: -1.27500, lng: 36.87000, name: 'End Point' }
    ],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Geofencing: Loading data from API...');

      const tenantId = currentUser?.tenantId;
      
      if (!tenantId) {
        console.warn('⚠️ No tenant ID found');
        setGeofences([]);
        setVehicles([]);
        setViolations([]);
        setIsLoading(false);
        return;
      }

      // 1. Load geofences
      console.log('📡 Fetching geofences...');
      const geofencesRes = await geofenceService.getByTenant(tenantId).catch(() => ({ data: [] }));
      const geofencesData = geofencesRes.data || [];
      setGeofences(geofencesData);
      console.log(`✅ Loaded ${geofencesData.length} geofences`);

      // 2. Load vehicles
      console.log('📡 Fetching vehicles...');
      const vehiclesRes = await vehicleService.getAll(tenantId).catch(() => ({ data: [] }));
      const vehiclesData = vehiclesRes.data || [];
      setVehicles(vehiclesData);
      console.log(`✅ Loaded ${vehiclesData.length} vehicles`);

      // 3. Load violations
      console.log('📡 Fetching geofence violations...');
      let violationsData = [];
      try {
        if (typeof geofenceService.getViolations === 'function') {
          const violationsRes = await geofenceService.getViolations(tenantId);
          violationsData = violationsRes.data || [];
        } else {
          console.log('⚠️ geofenceService.getViolations not available, using incidentService...');
          const incidentsRes = await incidentService.getByTenant(tenantId);
          violationsData = incidentsRes.data || [];
        }
      } catch (err) {
        console.warn('⚠️ Failed to load violations:', err.message);
        violationsData = [];
      }
      setViolations(violationsData);
      console.log(`✅ Loaded ${violationsData.length} violations`);

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('❌ Geofencing: Failed to load data:', error);
      setError(error.message || 'Failed to load geofencing data');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // USE EFFECTS
  // ============================================
  useEffect(() => {
    loadData();
    
    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing geofencing data...');
      loadData();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [currentUser]);

  // ============================================
  // POINT MANAGEMENT - WITH NAMES
  // ============================================
  const handleMapClick = (latlng) => {
    if (isAddingPoint) {
      const newPoint = {
        lat: latlng.lat,
        lng: latlng.lng,
        name: `Point ${(formData.points?.length || 0) + 1}`
      };
      setFormData(prev => ({
        ...prev,
        points: [...(prev.points || []), newPoint],
        centerLat: latlng.lat,
        centerLng: latlng.lng
      }));
      setIsAddingPoint(false);
    }
  };

  const updatePointName = (index, newName) => {
    const updatedPoints = [...formData.points];
    updatedPoints[index] = { ...updatedPoints[index], name: newName };
    setFormData({ ...formData, points: updatedPoints });
  };

  const updatePointCoords = (index, field, value) => {
    const updatedPoints = [...formData.points];
    updatedPoints[index] = { ...updatedPoints[index], [field]: parseFloat(value) || 0 };
    setFormData({ ...formData, points: updatedPoints });
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleCreateGeofence = async () => {
    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Geofence name is required');
      setIsSaving(false);
      return;
    }

    if (formData.type !== 'circular') {
      const validPoints = formData.points.filter(p => p.lat && p.lng);
      if (validPoints.length < 2) {
        setErrorMessage('Please add at least 2 valid points with names for the route');
        setIsSaving(false);
        return;
      }
    }

    try {
      const tenantId = currentUser?.tenantId;
      
      if (!tenantId) {
        setErrorMessage('No tenant found. Please contact support.');
        setIsSaving(false);
        return;
      }

      // Prepare points with names
      const pointsWithNames = formData.points.map(p => ({
        lat: p.lat,
        lng: p.lng,
        name: p.name || `Point ${formData.points.indexOf(p) + 1}`
      }));

      const newGeofence = {
        tenant: { id: tenantId },
        name: formData.name.trim(),
        type: formData.type,
        centerLat: formData.centerLat,
        centerLng: formData.centerLng,
        radius: formData.radius || 500,
        color: formData.color,
        isActive: true,
        coordinates: JSON.stringify(pointsWithNames),
        assignedVehicles: [],
        vehicleCount: 0
      };

      console.log('📝 Creating geofence with named points:', newGeofence);
      const response = await geofenceService.create(newGeofence);
      
      if (response.success) {
        setSuccessMessage(`Geofence "${newGeofence.name}" created successfully!`);
        setShowCreateModal(false);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to create geofence');
      }
    } catch (error) {
      console.error('Error creating geofence:', error);
      setErrorMessage(error.message || 'Failed to create geofence. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditGeofence = async () => {
    if (!selectedGeofence) return;

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (formData.type !== 'circular') {
      const validPoints = formData.points.filter(p => p.lat && p.lng);
      if (validPoints.length < 2) {
        setErrorMessage('Please add at least 2 valid points with names for the route');
        setIsSaving(false);
        return;
      }
    }

    try {
      // Prepare points with names
      const pointsWithNames = formData.points.map(p => ({
        lat: p.lat,
        lng: p.lng,
        name: p.name || `Point ${formData.points.indexOf(p) + 1}`
      }));

      const updatedGeofence = {
        name: formData.name.trim(),
        type: formData.type,
        centerLat: formData.centerLat,
        centerLng: formData.centerLng,
        radius: formData.radius || 500,
        color: formData.color,
        isActive: formData.isActive,
        coordinates: JSON.stringify(pointsWithNames),
      };

      console.log('📝 Updating geofence with named points:', updatedGeofence);
      const response = await geofenceService.update(selectedGeofence.id, updatedGeofence);
      
      if (response.success) {
        setSuccessMessage('Geofence updated successfully!');
        setShowEditModal(false);
        setSelectedGeofence(null);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to update geofence');
      }
    } catch (error) {
      console.error('Error updating geofence:', error);
      setErrorMessage(error.message || 'Failed to update geofence. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGeofence = async () => {
    if (!selectedGeofence) return;

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await geofenceService.delete(selectedGeofence.id);
      
      if (response.success) {
        setSuccessMessage('Geofence deleted successfully!');
        setShowDeleteConfirm(false);
        setSelectedGeofence(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to delete geofence');
      }
    } catch (error) {
      console.error('Error deleting geofence:', error);
      setErrorMessage(error.message || 'Failed to delete geofence. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // ASSIGN VEHICLES FUNCTIONS
  // ============================================
  const toggleVehicleAssignment = (vehicleId) => {
    if (!selectedGeofence) return;
    
    const currentAssigned = selectedGeofence.assignedVehicles || [];
    const isAssigned = currentAssigned.includes(vehicleId);
    
    const updatedAssigned = isAssigned
      ? currentAssigned.filter(id => id !== vehicleId)
      : [...currentAssigned, vehicleId];
    
    setSelectedGeofence({
      ...selectedGeofence,
      assignedVehicles: updatedAssigned,
      vehicleCount: updatedAssigned.length
    });
  };

  const handleAssignVehicles = async () => {
    if (!selectedGeofence) return;

    setIsSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const assignedVehicles = selectedGeofence.assignedVehicles || [];
      
      const response = await geofenceService.assignVehicles(
        selectedGeofence.id, 
        assignedVehicles
      );
      
      if (response.success) {
        setSuccessMessage(`Vehicles assigned successfully! (${assignedVehicles.length} vehicles)`);
        setShowAssignModal(false);
        setSelectedGeofence(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response.message || 'Failed to assign vehicles');
      }
    } catch (error) {
      console.error('Error assigning vehicles:', error);
      setErrorMessage(error.message || 'Failed to assign vehicles. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // FORM HELPERS
  // ============================================
  const resetForm = () => {
    setFormData({
      name: '',
      type: 'route',
      centerLat: -1.2921,
      centerLng: 36.8219,
      radius: 500,
      color: '#2563EB',
      isActive: true,
      coordinates: null,
      points: [
        { lat: -1.28361, lng: 36.81722, name: 'Start Point' },
        { lat: -1.27500, lng: 36.87000, name: 'End Point' }
      ],
    });
    setIsAddingPoint(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const openEditModal = (geofence) => {
    let points = [];
    if (geofence.coordinates) {
      try {
        points = JSON.parse(geofence.coordinates);
        // Ensure all points have names
        points = points.map((p, index) => ({
          ...p,
          name: p.name || `Point ${index + 1}`
        }));
      } catch (e) {
        points = [];
      }
    }
    
    if (points.length === 0 && geofence.centerLat && geofence.centerLng) {
      points = [{ lat: geofence.centerLat, lng: geofence.centerLng, name: 'Center Point' }];
    }

    setSelectedGeofence(geofence);
    setFormData({
      name: geofence.name || '',
      type: geofence.type || 'circular',
      centerLat: geofence.centerLat ? parseFloat(geofence.centerLat) : -1.2921,
      centerLng: geofence.centerLng ? parseFloat(geofence.centerLng) : 36.8219,
      radius: geofence.radius ? parseFloat(geofence.radius) : 500,
      color: geofence.color || '#2563EB',
      isActive: geofence.isActive !== undefined ? geofence.isActive : true,
      coordinates: geofence.coordinates || null,
      points: points,
    });
    setShowEditModal(true);
  };

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    total: geofences.length,
    active: geofences.filter(g => g.isActive).length,
    inactive: geofences.filter(g => !g.isActive).length,
    totalViolations: violations.length,
    unresolved: violations.filter(v => !v.resolved).length,
    resolved: violations.filter(v => v.resolved).length,
    totalVehicles: geofences.reduce((sum, g) => sum + (g.vehicleCount || 0), 0),
  };

  // ============================================
  // HELPERS
  // ============================================
  const getColorClass = (color) => {
    const colors = {
      '#22c55e': 'bg-green-500',
      '#3b82f6': 'bg-blue-500',
      '#ef4444': 'bg-red-500',
      '#f59e0b': 'bg-yellow-500',
      '#8b5cf6': 'bg-purple-500',
      '#2563EB': 'bg-blue-600',
      '#ec4899': 'bg-pink-500',
      '#14b8a6': 'bg-teal-500',
      '#f97316': 'bg-orange-500',
    };
    return colors[color] || 'bg-gray-500';
  };

  const getTypeLabel = (type) => {
    const types = {
      'circular': 'Circular',
      'polygon': 'Polygon',
      'route': 'Route Path',
    };
    return types[type] || type;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-blue-100 text-blue-700',
    };
    return colors[severity] || 'bg-gray-100 text-gray-700';
  };

  const filteredGeofences = geofences.filter(g => {
    const matchesSearch = (g.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (g.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // ============================================
  // RENDER MAP VIEW
  // ============================================
  const renderMapView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-[500px] bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading map...</p>
          </div>
        </div>
      );
    }

    return (
      <div>
        <h4 className="font-semibold text-sm mb-4">Geofence Map</h4>
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <MapContainer 
            center={[-1.2921, 36.8219]} 
            zoom={12} 
            style={{ height: '500px', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {geofences && geofences.length > 0 && geofences.map((geofence) => {
              if (geofence.type === 'circular' && geofence.centerLat && geofence.centerLng) {
                return (
                  <SafeCircle
                    key={geofence.id}
                    center={[parseFloat(geofence.centerLat), parseFloat(geofence.centerLng)]}
                    radius={parseFloat(geofence.radius) || 500}
                    pathOptions={{
                      color: geofence.color || '#2563EB',
                      fillColor: geofence.color || '#2563EB',
                      fillOpacity: 0.15,
                      weight: 2,
                      dashArray: !geofence.isActive ? '5, 5' : null,
                    }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <p className="font-bold">{geofence.name}</p>
                        <p className="text-gray-600">{getTypeLabel(geofence.type)}</p>
                        <p className="text-gray-600">Radius: {geofence.radius || 500}m</p>
                        <p className="text-gray-600">Status: {geofence.isActive ? 'Active' : 'Inactive'}</p>
                        <p className="text-gray-600">Vehicles: {geofence.vehicleCount || 0}</p>
                      </div>
                    </Popup>
                  </SafeCircle>
                );
              }
              return null;
            })}

            <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-2 rounded-lg shadow-md text-xs z-[1000]">
              <div className="flex items-center gap-2 font-medium mb-1">Legend:</div>
              {geofences && geofences.slice(0, 5).map((g) => (
                <div key={g.id} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getColorClass(g.color)}`}></div>
                  <span>{g.name}</span>
                  {!g.isActive && <span className="text-gray-400 text-[8px]">(inactive)</span>}
                </div>
              ))}
            </div>
          </MapContainer>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER FORM MODAL - WITH POINT NAMES
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showCreateModal;
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => { 
          isEdit ? setShowEditModal(false) : setShowCreateModal(false);
          resetForm();
        }}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => { 
              isEdit ? setShowEditModal(false) : setShowCreateModal(false);
              resetForm();
            }}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Geofence' : 'Create New Geofence'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update geofence details' : 'Define a geographic boundary'}
            </p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {successMessage}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Geofence Name *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Nairobi CBD"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="circular">Circular Zone</option>
                  <option value="polygon">Polygon</option>
                  <option value="route">Route Path</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Center Location</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Latitude</label>
                    <input 
                      type="number" 
                      step="0.000001"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.centerLat}
                      onChange={(e) => setFormData({...formData, centerLat: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Longitude</label>
                    <input 
                      type="number" 
                      step="0.000001"
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      value={formData.centerLng}
                      onChange={(e) => setFormData({...formData, centerLng: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPoint(!isAddingPoint)}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      isAddingPoint ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {isAddingPoint ? '❌ Cancel' : '📍 Click on Map to Add Point'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Radius (meters)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="500"
                  value={formData.radius}
                  onChange={(e) => setFormData({...formData, radius: parseFloat(e.target.value) || 0})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    className="w-12 h-12 rounded-lg cursor-pointer border border-gray-200"
                    value={formData.color}
                    onChange={(e) => setFormData({...formData, color: e.target.value})}
                  />
                  <span className="text-sm text-gray-500">{formData.color}</span>
                </div>
              </div>

              {/* ✅ POINTS SECTION WITH NAMES */}
              <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <MapPin size={16} className="text-blue-600" />
                    {formData.type === 'circular' ? 'Center Point' : 'Route Points with Names'}
                    <span className="text-xs text-gray-400">
                      ({formData.points ? formData.points.length : 0} points)
                    </span>
                  </h4>
                  <div className="flex gap-2">
                    {formData.type !== 'circular' && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => {
                            const currentPoints = prev.points || [];
                            return {
                              ...prev,
                              points: [...currentPoints, { lat: 0, lng: 0, name: `Point ${currentPoints.length + 1}` }]
                            };
                          });
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Point
                      </button>
                    )}
                  </div>
                </div>

                {/* Points List with Names */}
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {formData.points && formData.points.length > 0 ? (
                    formData.points.map((point, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <span className="text-xs font-medium text-gray-500 w-6 flex-shrink-0">#{index + 1}</span>
                        
                        {/* ✅ Point Name Input */}
                        <div className="flex-1 min-w-[100px]">
                          <input
                            type="text"
                            value={point.name || `Point ${index + 1}`}
                            onChange={(e) => updatePointName(index, e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                            placeholder="Enter point name..."
                          />
                        </div>
                        
                        <input
                          type="number"
                          step="0.000001"
                          value={point.lat || ''}
                          onChange={(e) => updatePointCoords(index, 'lat', e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Lat"
                        />
                        <input
                          type="number"
                          step="0.000001"
                          value={point.lng || ''}
                          onChange={(e) => updatePointCoords(index, 'lng', e.target.value)}
                          className="w-24 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="Lng"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (formData.points.length <= 2) {
                              setErrorMessage('Need at least 2 points for a route');
                              return;
                            }
                            const newPoints = formData.points.filter((_, i) => i !== index);
                            setFormData({...formData, points: newPoints});
                          }}
                          className="p-1 text-red-500 hover:bg-red-50 rounded flex-shrink-0"
                          title="Remove point"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-400 text-sm">
                      {formData.type === 'circular' 
                        ? 'Enter coordinates for the center point' 
                        : 'Click "+ Add Point" to add route points with names'}
                    </div>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-400 flex items-center gap-4 flex-wrap">
                  {formData.type === 'circular' ? (
                    <span>Single point with radius defines a circular zone</span>
                  ) : (
                    <>
                      <span>Add at least 2 points with names to define a route path</span>
                      <span className="text-blue-500">
                        ({formData.points ? formData.points.filter(p => p.name && p.name.trim()).length : 0} named)
                      </span>
                      <span className="text-green-500">
                        ({formData.points ? formData.points.filter(p => p.lat && p.lng).length : 0} valid)
                      </span>
                    </>
                  )}
                </div>

                {/* Mini Map */}
                <div className="mt-3 h-48 rounded-lg overflow-hidden border border-gray-200">
                  <MapContainer 
                    center={[formData.centerLat || -1.2921, formData.centerLng || 36.8219]} 
                    zoom={13} 
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    
                    {formData.points && formData.points.filter(p => p.lat && p.lng).map((point, index) => (
                      <Marker
                        key={index}
                        position={[point.lat, point.lng]}
                        icon={L.divIcon({
                          className: 'bg-transparent border-none',
                          html: `<div class="w-4 h-4 rounded-full border-2 border-white shadow-lg" style="background-color: ${formData.color || '#2563EB'};"></div>`,
                          iconSize: [16, 16],
                          iconAnchor: [8, 8],
                        })}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-bold">{point.name || `Point ${index + 1}`}</p>
                            <p className="text-gray-600 text-xs">{point.lat}, {point.lng}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))}

                    {formData.points && formData.points.filter(p => p.lat && p.lng).length > 1 && (
                      <Polyline
                        positions={formData.points.filter(p => p.lat && p.lng).map(p => [p.lat, p.lng])}
                        pathOptions={{
                          color: formData.color || '#2563EB',
                          weight: 3,
                          opacity: 0.7,
                        }}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>

              {isEdit && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({...formData, isActive: e.target.value === 'active'})}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={isEdit ? handleEditGeofence : handleCreateGeofence}
                disabled={isSaving}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? 'Update Geofence' : 'Create Geofence'}
              </button>
              <button 
                onClick={() => { 
                  isEdit ? setShowEditModal(false) : setShowCreateModal(false);
                  resetForm();
                }}
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
    if (!showDeleteConfirm || !selectedGeofence) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Geofence?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete "{selectedGeofence.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteGeofence}
                disabled={isSaving}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Deleting...' : 'Yes, Delete'}
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
  // RENDER ASSIGN MODAL
  // ============================================
  const renderAssignModal = () => {
    if (!showAssignModal || !selectedGeofence) return null;

    const assignedVehicles = selectedGeofence.assignedVehicles || [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => { setShowAssignModal(false); setSelectedGeofence(null); }}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => { setShowAssignModal(false); setSelectedGeofence(null); }}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">Assign Vehicles</h2>
            <p className="text-purple-100 text-sm">Select vehicles to assign to: {selectedGeofence.name}</p>
          </div>

          <div className="p-6">
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {vehicles.length > 0 ? (
                vehicles.map((vehicle) => {
                  const vehicleId = vehicle.id;
                  const isAssigned = assignedVehicles.includes(vehicleId);
                  return (
                    <div 
                      key={vehicleId}
                      onClick={() => toggleVehicleAssignment(vehicleId)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        isAssigned ? 'bg-blue-50 border-2 border-blue-500' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{vehicle.registration || vehicle.reg || vehicleId}</p>
                        <p className="text-xs text-gray-500">{vehicle.make || 'Unknown'} {vehicle.model || ''}</p>
                      </div>
                      {isAssigned ? (
                        <CheckCircle size={20} className="text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users size={48} className="mx-auto text-gray-300 mb-3" />
                  <p>No vehicles available</p>
                  <p className="text-xs">Please add vehicles to your fleet first</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={handleAssignVehicles}
                disabled={isSaving || vehicles.length === 0}
                className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                Assign Vehicles ({assignedVehicles.length})
              </button>
              <button 
                onClick={() => { setShowAssignModal(false); setSelectedGeofence(null); }}
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
  // RENDER ANALYTICS VIEW
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Geofences</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Vehicles Covered</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalVehicles}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Violations</p>
          <p className="text-2xl font-bold text-red-600">{stats.totalViolations}</p>
        </div>
      </div>

      {violations.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Recent Violations</h5>
          <div className="space-y-2">
            {violations.slice(0, 5).map((violation) => (
              <div key={violation.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div>
                  <p className="text-sm font-medium">{violation.violationType || 'Violation'}</p>
                  <p className="text-xs text-gray-500">Vehicle: {violation.vehicleRegistration || violation.vehicleId}</p>
                  {violation.geofenceName && (
                    <p className="text-xs text-blue-600">Geofence: {violation.geofenceName}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${violation.resolved ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {violation.resolved ? 'Resolved' : 'Active'}
                  </span>
                  <span className="text-xs text-gray-400">{violation.timestamp ? new Date(violation.timestamp).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

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
              placeholder="Search geofences..." 
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> Create Geofence
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGeofences.length > 0 ? (
          filteredGeofences.map((geofence) => (
            <div 
              key={geofence.id} 
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGeofence(geofence)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getColorClass(geofence.color)}`}></div>
                    <p className="font-medium">{geofence.name}</p>
                  </div>
                  <p className="text-xs text-gray-500">{getTypeLabel(geofence.type)}</p>
                  <p className="text-xs text-gray-400">Radius: {geofence.radius || 0}m</p>
                  <p className="text-xs text-gray-400">Points: {
                    geofence.coordinates ? JSON.parse(geofence.coordinates).length : 0
                  }</p>
                  <p className="text-xs text-gray-400">Vehicles: {geofence.vehicleCount || 0}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${geofence.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                  {geofence.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); openEditModal(geofence); }}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded hover:bg-blue-100 flex items-center gap-1"
                >
                  <Edit size={12} /> Edit
                </button>
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedGeofence(geofence);
                    setShowAssignModal(true);
                  }}
                  className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded hover:bg-green-100 flex items-center gap-1"
                >
                  <Users size={12} /> Assign
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setSelectedGeofence(geofence); setShowDeleteConfirm(true); }}
                  className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded hover:bg-red-100 flex items-center gap-1"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-8 text-gray-500">
            <MapPin size={48} className="mx-auto text-gray-300 mb-3" />
            <p>No geofences created yet</p>
            <p className="text-sm">Click "Create Geofence" to define your first boundary</p>
          </div>
        )}
      </div>
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
          <p className="mt-4 text-gray-500">Loading geofences...</p>
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
            onClick={loadData}
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
          <AlertTriangle size={16} /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <MapPin size={24} className="text-blue-600" />
              Geofence Management
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Define geographic boundaries and zones with named points</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated || 'Just now'}
            </span>
            <button
              onClick={loadData}
              className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Create Geofence
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'list', label: 'List', icon: MapPin },
            { id: 'map', label: 'Map View', icon: Navigation },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
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

      {/* Content */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'list' && renderListView()}
        {activeTab === 'map' && renderMapView()}
        {activeTab === 'analytics' && renderAnalyticsView()}
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
      {renderAssignModal()}
    </div>
  );
};

export default Geofencing;