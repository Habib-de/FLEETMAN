import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { MapPin, Check, ChevronDown, Users, Building, Plus, X, Globe, Edit2, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTenantConfig } from '../context/TenantConfigContext';
import { tenantService, vehicleService, driverService } from '../services/api';

// ============================================
// LOADING SKELETON COMPONENT
// ============================================
const LoadingSkeleton = ({ isAdmin = false }) => (
  <div className="animate-pulse flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg min-w-[150px]">
    <div className={`w-4 h-4 ${isAdmin ? 'bg-blue-300' : 'bg-green-300'} rounded`}></div>
    <div className="h-4 bg-gray-300 rounded w-24"></div>
    <div className="w-4 h-4 bg-gray-300 rounded"></div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
const TenantSwitcher = ({ isAdmin = false }) => {
  const { currentUser } = useAuth();
  const { currentTenant, switchTenant } = useTenantConfig();
  
  // UI State
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showEditLocation, setShowEditLocation] = useState(null); // location id being edited
  const [newLocation, setNewLocation] = useState('');
  const [newLatitude, setNewLatitude] = useState('');
  const [newLongitude, setNewLongitude] = useState('');
  const [editLatitude, setEditLatitude] = useState('');
  const [editLongitude, setEditLongitude] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  
  // Data State - Admin
  const [tenants, setTenants] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  
  // Data State - Car Owner
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Refs
  const isInitialMount = useRef(true);
  const abortControllerRef = useRef(null);
  const dropdownRef = useRef(null);

  // ============================================
  // CLEANUP FUNCTION
  // ============================================
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // ============================================
  // LOAD USER LOCATIONS (Car Owner)
  // ============================================
  const loadUserLocations = useCallback(async (preserveSelection = false) => {
    if (!currentUser || isAdmin) {
      return;
    }
    
    cleanup();
    
    try {
      setIsLoading(true);
      const tenantId = currentUser.tenantId;
      
      if (!tenantId) {
        setLocations([]);
        setSelectedLocation(null);
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const response = await tenantService.getLocations(tenantId, { 
        signal: controller.signal 
      });
      
      let locationData = response?.data || [];
      
      const seenIds = new Set();
      const uniqueLocations = locationData.filter(loc => {
        const id = loc.id || loc.locationId;
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
      });
      
      setLocations(uniqueLocations);
      
      if (uniqueLocations.length > 0) {
        const currentStillExists = selectedLocation && 
          uniqueLocations.some(loc => loc.id === selectedLocation.id);
        
        if (!currentStillExists || !preserveSelection) {
          const defaultLoc = uniqueLocations.find(l => l.isDefault) || uniqueLocations[0];
          setSelectedLocation(defaultLoc);
          
          if (!preserveSelection) {
            switchTenant(defaultLoc.id);
          }
          console.log(`🔄 Set default location: ${defaultLoc.name}`);
        } else {
          console.log(`✅ Keeping current selection: ${selectedLocation?.name}`);
        }
      } else {
        setSelectedLocation(null);
      }
      
      console.log(`✅ Loaded ${uniqueLocations.length} unique locations for tenant`);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Failed to load locations:', error);
      setLocations([]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [currentUser, isAdmin, selectedLocation, switchTenant, cleanup]);

  // ============================================
  // LOAD TENANTS (Admin)
  // ============================================
  const loadTenants = useCallback(async () => {
    if (!isAdmin) return;
    
    cleanup();
    
    try {
      setIsLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const tenantsRes = await tenantService.getAll({ 
        signal: controller.signal 
      });
      const tenantsData = tenantsRes.data || [];
      setTenants(tenantsData);

      let allVehicles = [];
      let allDrivers = [];

      if (tenantsData.length > 0) {
        const vehiclePromises = tenantsData.map(tenant => 
          vehicleService.getAll(tenant.id, { signal: controller.signal })
            .then(response => response.data || [])
            .catch(() => [])
        );
        
        const driverPromises = tenantsData.map(tenant => 
          driverService.getAll(tenant.id, { signal: controller.signal })
            .then(response => response.data || [])
            .catch(() => [])
        );
        
        const [vehicleResults, driverResults] = await Promise.all([
          Promise.all(vehiclePromises),
          Promise.all(driverPromises)
        ]);
        
        allVehicles = vehicleResults.flat();
        allDrivers = driverResults.flat();
      }

      setVehicles(allVehicles);
      setDrivers(allDrivers);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was cancelled');
        return;
      }
      console.error('Failed to load tenants:', error);
      setTenants([]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [isAdmin, cleanup]);

  // ============================================
  // HANDLE ADD LOCATION - WITH COORDINATES
  // ============================================
  const handleAddLocation = useCallback(async () => {
    const locationName = newLocation.trim();
    const lat = parseFloat(newLatitude);
    const lng = parseFloat(newLongitude);

    if (!locationName) {
      setAddError('Please enter a location name');
      return;
    }

    if (isNaN(lat) || isNaN(lng)) {
      setAddError('Please enter valid coordinates (e.g., -1.2921, 36.8219)');
      return;
    }

    if (lat < -90 || lat > 90) {
      setAddError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setAddError('Longitude must be between -180 and 180');
      return;
    }

    if (!currentUser?.tenantId) {
      setAddError('No tenant found');
      return;
    }

    try {
      setIsLoading(true);
      setAddError('');

      const locationData = {
        name: locationName,
        address: `${locationName}`,
        isDefault: locations.length === 0,
        map: {
          center: {
            lat: lat,
            lng: lng
          },
          zoom: 13
        }
      };

      console.log('📤 Adding location with data:', locationData);

      const response = await tenantService.addLocation(
        currentUser.tenantId, 
        locationData
      );

      if (response?.success) {
        const newLoc = response.data;
        
        setLocations(prev => [...prev, newLoc]);
        setSelectedLocation(newLoc);
        setNewLocation('');
        setNewLatitude('');
        setNewLongitude('');
        setShowAddLocation(false);
        
        switchTenant(newLoc.id);

        window.dispatchEvent(new CustomEvent('locationAdded', {
          detail: { location: newLoc }
        }));
        
        console.log(`✅ Added location: ${locationName} with coordinates (${lat}, ${lng})`);
      } else {
        setAddError(response?.message || 'Failed to add location');
      }
    } catch (error) {
      console.error('Failed to add location:', error);
      setAddError(error.message || 'Failed to add location');
    } finally {
      setIsLoading(false);
    }
  }, [newLocation, newLatitude, newLongitude, currentUser, locations.length, switchTenant]);

  // ============================================
// HANDLE EDIT LOCATION COORDINATES - FIXED
// ============================================
const handleEditLocation = useCallback(async (locationId) => {
  const lat = parseFloat(editLatitude);
  const lng = parseFloat(editLongitude);

  if (isNaN(lat) || isNaN(lng)) {
    setEditError('Please enter valid coordinates');
    return;
  }

  if (lat < -90 || lat > 90) {
    setEditError('Latitude must be between -90 and 90');
    return;
  }

  if (lng < -180 || lng > 180) {
    setEditError('Longitude must be between -180 and 180');
    return;
  }

  if (!currentUser?.tenantId) {
    setEditError('No tenant found');
    return;
  }

  try {
    setIsLoading(true);
    setEditError('');
    setEditingId(locationId);

    // Find the location to update
    const locationToUpdate = locations.find(loc => loc.id === locationId);
    if (!locationToUpdate) {
      setEditError('Location not found');
      return;
    }

    // ✅ FIX: Create a clean object with only the fields we want to update
    // Don't send the entire location object - just the fields that need updating
    const updatedLocationData = {
      name: locationToUpdate.name,
      address: locationToUpdate.address || `${locationToUpdate.name}`,
      isDefault: locationToUpdate.isDefault === true,
      map: {
        center: {
          lat: lat,
          lng: lng
        },
        zoom: locationToUpdate.map?.zoom || 13
      }
    };

    console.log('📤 Updating location coordinates:', updatedLocationData);

    const response = await tenantService.updateLocationById(
  currentUser.tenantId,
  locationId,
  updatedLocationData
);

    if (response?.success) {
      const updatedLoc = response.data;
      
      // Update locations state
      setLocations(prev => prev.map(loc => 
        loc.id === locationId ? { ...loc, ...updatedLoc } : loc
      ));
      
      // If this was the selected location, update it
      if (selectedLocation?.id === locationId) {
        setSelectedLocation({ ...selectedLocation, ...updatedLoc });
      }
      
      // Close edit mode
      setShowEditLocation(null);
      setEditLatitude('');
      setEditLongitude('');
      setEditError('');
      
      window.dispatchEvent(new CustomEvent('locationChanged', {
        detail: { location: updatedLoc }
      }));
      
      console.log(`✅ Updated coordinates for: ${updatedLoc.name} (${lat}, ${lng})`);
    } else {
      setEditError(response?.message || 'Failed to update location');
    }
  } catch (error) {
    console.error('Failed to update location:', error);
    setEditError(error.message || 'Failed to update location');
  } finally {
    setIsLoading(false);
    setEditingId(null);
  }
}, [editLatitude, editLongitude, currentUser, locations, selectedLocation]);

  // ============================================
  // HANDLE DELETE LOCATION
  // ============================================
  const handleDeleteLocation = useCallback(async (locationId, locationName, e) => {
    e.stopPropagation();
    
    if (locations.length <= 1) {
      setDeleteError('Cannot delete the last location');
      setTimeout(() => setDeleteError(''), 3000);
      return;
    }

    if (!window.confirm(`Delete location "${locationName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(locationId);
      setDeleteError('');
      
      const response = await tenantService.deleteLocation(
        currentUser?.tenantId, 
        locationId
      );
      
      if (response?.success) {
        const updatedLocations = locations.filter(loc => loc.id !== locationId);
        setLocations(updatedLocations);
        
        if (selectedLocation?.id === locationId) {
          const newDefault = updatedLocations.find(l => l.isDefault) || updatedLocations[0];
          setSelectedLocation(newDefault);
          if (newDefault) {
            switchTenant(newDefault.id);
          }
        }
        
        console.log(`✅ Deleted location: ${locationName}`);
        
        window.dispatchEvent(new CustomEvent('locationDeleted', {
          detail: { locationId, locationName }
        }));
      } else {
        setDeleteError(response?.message || 'Failed to delete location');
        setTimeout(() => setDeleteError(''), 3000);
      }
    } catch (error) {
      console.error('Failed to delete location:', error);
      setDeleteError(error.message || 'Failed to delete location');
      setTimeout(() => setDeleteError(''), 3000);
    } finally {
      setDeletingId(null);
    }
  }, [locations, selectedLocation, currentUser, switchTenant]);

  // ============================================
  // HANDLE LOCATION SELECT
  // ============================================
  const handleSelectLocation = useCallback((location) => {
    if (!location) return;
    
    console.log(`📍 Selecting location: ${location.name} (${location.id})`);
    setSelectedLocation(location);
    setIsOpen(false);
    switchTenant(location.id);
    
    window.dispatchEvent(new CustomEvent('locationChanged', {
      detail: { location }
    }));
  }, [switchTenant]);

  // ============================================
  // HANDLE TENANT SWITCH (Admin)
  // ============================================
  const handleTenantSwitch = useCallback((tenantId) => {
    switchTenant(tenantId);
    setIsOpen(false);
  }, [switchTenant]);

  // ============================================
  // HANDLE CLICK OUTSIDE
  // ============================================
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // ============================================
  // LOAD ON MOUNT AND USER CHANGE
  // ============================================
  useEffect(() => {
    if (!currentUser) {
      setLocations([]);
      setSelectedLocation(null);
      setTenants([]);
      return;
    }

    if (isAdmin) {
      loadTenants();
    } else {
      loadUserLocations(true);
    }

    return cleanup;
  }, [currentUser, isAdmin, loadTenants, loadUserLocations, cleanup]);

  // ============================================
  // REFRESH EVENTS LISTENERS
  // ============================================
  useEffect(() => {
    const handleUpdate = () => {
      if (!isLoading) {
        if (isAdmin) {
          loadTenants();
        } else {
          loadUserLocations(true);
        }
      }
    };

    const events = [
      'tenantsUpdated', 
      'vehiclesUpdated', 
      'driversUpdated',
      'locationAdded', 
      'locationDeleted',
      'locationChanged'
    ];
    
    events.forEach(event => {
      window.addEventListener(event, handleUpdate);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleUpdate);
      });
    };
  }, [isAdmin, isLoading, loadTenants, loadUserLocations]);

  // ============================================
  // GET TENANT STATS (Admin)
  // ============================================
  const getTenantVehicleCount = useCallback((tenantId) => {
    return vehicles.filter(v => v.tenantId === tenantId || v.costCentre === tenantId).length;
  }, [vehicles]);

  const getTenantDriverCount = useCallback((tenantId) => {
    return drivers.filter(d => d.tenantId === tenantId).length;
  }, [drivers]);

  const getTenantDetails = useCallback((tenantId) => {
    return tenants.find(t => t.id === tenantId);
  }, [tenants]);

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const currentTenantDetails = useMemo(() => {
    if (!isAdmin) return null;
    return getTenantDetails(currentTenant);
  }, [isAdmin, currentTenant, getTenantDetails]);

  const currentVehicleCount = useMemo(() => {
    if (!isAdmin) return 0;
    return getTenantVehicleCount(currentTenant);
  }, [isAdmin, currentTenant, getTenantVehicleCount]);

  const currentDriverCount = useMemo(() => {
    if (!isAdmin) return 0;
    return getTenantDriverCount(currentTenant);
  }, [isAdmin, currentTenant, getTenantDriverCount]);

  // ============================================
  // RENDER LOADING STATE
  // ============================================
  if (isLoading && isInitialMount.current) {
    return <LoadingSkeleton isAdmin={isAdmin} />;
  }

  // ============================================
  // RENDER ADMIN TENANT SWITCHER
  // ============================================
  if (isAdmin) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm min-w-[150px]"
          disabled={isLoading}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <Building size={14} className="text-blue-600 flex-shrink-0" />
          <span className="font-medium text-blue-700 truncate max-w-[120px]">
            {currentTenantDetails?.name || 'Select Tenant'}
          </span>
          <ChevronDown 
            size={14} 
            className={`text-blue-600 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {isOpen && (
          <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              {currentTenantDetails && (
                <div className="px-3 py-2 border-b border-gray-100 mb-1">
                  <p className="text-xs text-gray-500">Current Tenant</p>
                  <p className="text-sm font-semibold text-gray-800">{currentTenantDetails.name}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span>🚗 {currentVehicleCount} vehicles</span>
                    <span>👤 {currentDriverCount} drivers</span>
                  </div>
                </div>
              )}
              
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 border-b border-gray-100">
                <Users size={12} className="inline mr-1" /> All Tenants ({tenants.length})
              </div>
              
              {tenants.length > 0 ? (
                tenants.map((tenant) => {
                  const vehicleCount = getTenantVehicleCount(tenant.id);
                  const driverCount = getTenantDriverCount(tenant.id);
                  const isActive = currentTenant === tenant.id;
                  
                  return (
                    <button
                      key={tenant.id}
                      onClick={() => handleTenantSwitch(tenant.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left ${
                        isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {tenant.name || tenant.id}
                        </span>
                        <span className="text-xs text-gray-400">
                          🚗 {vehicleCount} · 👤 {driverCount}
                        </span>
                      </div>
                      {isActive && (
                        <Check size={16} className="text-blue-600 flex-shrink-0 ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-4 text-center text-gray-500 text-sm">
                  <Users size={24} className="mx-auto text-gray-300 mb-2" />
                  <p>No tenants found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER CAR OWNER - LOCATION SWITCHER
  // ============================================
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors text-sm"
        disabled={isLoading}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MapPin size={14} className="text-green-600 flex-shrink-0" />
        <span className="font-medium text-green-700 truncate max-w-[120px]">
          {selectedLocation?.name || locations[0]?.name || 'Select Location'}
        </span>
        <ChevronDown 
          size={14} 
          className={`text-green-600 transition-transform flex-shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
          <div className="p-2">
            {/* Error Messages */}
            {deleteError && (
              <div className="mb-2 px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-200">
                {deleteError}
              </div>
            )}

            {/* User's Locations */}
            {locations.length > 0 ? (
              <>
                <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                  <span>📍 Your Locations ({locations.length})</span>
                  <span className="text-gray-400 text-[10px] font-normal">
                    {locations.length === 1 ? 'Cannot delete last' : 'Tap X to delete'}
                  </span>
                </div>
                
                {locations.map((loc) => {
                  const isDefault = loc.isDefault === true;
                  const isSelected = selectedLocation?.id === loc.id;
                  const isDeleting = deletingId === loc.id;
                  const isEditing = showEditLocation === loc.id;
                  const isEditingPending = editingId === loc.id;
                  const canDelete = locations.length > 1;
                  
                  // Check if location has map coordinates
                  const hasCoordinates = loc.map && loc.map.center && loc.map.center.lat && loc.map.center.lng;
                  const lat = hasCoordinates ? loc.map.center.lat : '';
                  const lng = hasCoordinates ? loc.map.center.lng : '';
                  
                  return (
                    <div
                      key={loc.id}
                      className={`group flex flex-col ${
                        isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''
                      } ${isEditing ? 'bg-yellow-50 border-l-4 border-yellow-400' : ''}`}
                    >
                      {/* Main row */}
                      <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <button
                          onClick={() => handleSelectLocation(loc)}
                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                          disabled={isEditing}
                        >
                          <div>
                            <span className="text-sm truncate block">
                              {loc.name}
                              {isDefault && (
                                <span className="ml-2 text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                              {!hasCoordinates && (
                                <span className="ml-2 text-[10px] text-red-400 font-medium bg-red-50 px-1.5 py-0.5 rounded">
                                  ⚠️ No coordinates
                                </span>
                              )}
                            </span>
                            {hasCoordinates && (
                              <span className="text-[10px] text-gray-400">
                                📍 {lat.toFixed(4)}, {lng.toFixed(4)}
                              </span>
                            )}
                          </div>
                          {isSelected && (
                            <Check size={16} className="text-green-600 flex-shrink-0 ml-1" />
                          )}
                        </button>
                        
                        {/* Edit Button */}
                        {!isEditing && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowEditLocation(loc.id);
                              setEditLatitude(hasCoordinates ? lat.toString() : '');
                              setEditLongitude(hasCoordinates ? lng.toString() : '');
                              setEditError('');
                            }}
                            className="ml-2 p-1 rounded hover:bg-yellow-100 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                            title="Edit coordinates"
                          >
                            <Edit2 size={14} className="text-yellow-500 hover:text-yellow-700" />
                          </button>
                        )}
                        
                        {/* Delete Button */}
                        {!isEditing && canDelete && (
                          <button
                            onClick={(e) => handleDeleteLocation(loc.id, loc.name, e)}
                            disabled={isDeleting}
                            className={`ml-1 p-1 rounded hover:bg-red-100 transition-colors flex-shrink-0 ${
                              isDeleting ? 'opacity-50 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'
                            }`}
                            title={`Delete ${loc.name}`}
                          >
                            {isDeleting ? (
                              <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <X size={14} className="text-red-400 hover:text-red-600" />
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Edit form */}
                      {isEditing && (
                        <div className="px-3 pb-3 pt-1">
                          <div className="border-t border-yellow-200 pt-2">
                            {editError && (
                              <p className="text-xs text-red-500 mb-2">{editError}</p>
                            )}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-500">Latitude</label>
                                <input
                                  type="text"
                                  value={editLatitude}
                                  onChange={(e) => setEditLatitude(e.target.value)}
                                  placeholder="e.g., -1.2921"
                                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                                  disabled={isEditingPending}
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-500">Longitude</label>
                                <input
                                  type="text"
                                  value={editLongitude}
                                  onChange={(e) => setEditLongitude(e.target.value)}
                                  placeholder="e.g., 36.8219"
                                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:ring-2 focus:ring-yellow-500 outline-none"
                                  disabled={isEditingPending}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleEditLocation(loc.id)}
                                disabled={isEditingPending}
                                className="flex-1 bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 transition-colors text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                {isEditingPending ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Save size={12} /> Save
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowEditLocation(null);
                                  setEditLatitude('');
                                  setEditLongitude('');
                                  setEditError('');
                                }}
                                className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                <MapPin size={24} className="mx-auto text-gray-300 mb-2" />
                <p>No locations saved</p>
                <p className="text-xs">Add your first location below</p>
              </div>
            )}

            {/* Add Location Section */}
            <div className="border-t border-gray-200 mt-2 pt-2">
              {!showAddLocation ? (
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Plus size={16} /> Add Location
                </button>
              ) : (
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    Add New Location:
                  </p>
                  
                  {addError && (
                    <p className="text-xs text-red-500 mb-2">{addError}</p>
                  )}
                  
                  <div className="space-y-2">
                    <div>
                      <label className="text-xs text-gray-500">Location Name *</label>
                      <input
                        type="text"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        placeholder="e.g., Mombasa, Kisumu"
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-500">Latitude *</label>
                        <input
                          type="text"
                          value={newLatitude}
                          onChange={(e) => setNewLatitude(e.target.value)}
                          placeholder="e.g., -1.2921"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Longitude *</label>
                        <input
                          type="text"
                          value={newLongitude}
                          onChange={(e) => setNewLongitude(e.target.value)}
                          placeholder="e.g., 36.8219"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    </div>
                    
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Globe size={12} />
                      <span>Tip: Get coordinates from Google Maps</span>
                    </div>
                    
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={handleAddLocation}
                        disabled={isLoading}
                        className="flex-1 bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors text-sm disabled:opacity-50"
                      >
                        {isLoading ? 'Adding...' : 'Add Location'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddLocation(false);
                          setNewLocation('');
                          setNewLatitude('');
                          setNewLongitude('');
                          setAddError('');
                        }}
                        className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MEMOIZE COMPONENT FOR PERFORMANCE
// ============================================
export default React.memo(TenantSwitcher);