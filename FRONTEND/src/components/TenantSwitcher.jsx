import React, { useState, useEffect } from 'react';
import { MapPin, Check, ChevronDown, Users, Building } from 'lucide-react';
import { useTenantConfig } from '../context/TenantConfigContext';
import { tenantService, vehicleService, driverService } from '../services/api';

const TenantSwitcher = ({ isAdmin = false }) => {
  const { currentTenant, switchTenant, getAvailablePresets } = useTenantConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const presets = getAvailablePresets();
  const current = presets.find(p => p.id === currentTenant);

  // ============================================
  // LOAD TENANTS FROM API
  // ============================================
  const loadTenants = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 TenantSwitcher: Loading tenants from API...');
      
      // 1. Get all tenants
      const tenantsRes = await tenantService.getAll();
      const tenantsData = tenantsRes.data || [];
      setTenants(tenantsData);

      // 2. Get vehicles and drivers for each tenant
      let allVehicles = [];
      let allDrivers = [];

      if (tenantsData.length > 0) {
        const vehiclePromises = tenantsData.map(tenant => 
          vehicleService.getAll(tenant.id)
            .then(response => response.data || [])
            .catch(() => [])
        );
        
        const driverPromises = tenantsData.map(tenant => 
          driverService.getAll(tenant.id)
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

      console.log(`✅ TenantSwitcher: Loaded ${tenantsData.length} tenants, ${allVehicles.length} vehicles, ${allDrivers.length} drivers`);

    } catch (error) {
      console.error('❌ TenantSwitcher: Failed to load tenants:', error);
      
      // ✅ FALLBACK: Try localStorage
      console.log('📦 TenantSwitcher: Using localStorage fallback...');
      const savedTenants = localStorage.getItem('fleetman_tenants');
      if (savedTenants) {
        try {
          setTenants(JSON.parse(savedTenants));
        } catch (e) {
          setTenants([]);
        }
      } else {
        setTenants([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // LOAD ON MOUNT
  // ============================================
  useEffect(() => {
    if (isAdmin) {
      loadTenants();
    }
  }, [isAdmin]);

  // ============================================
  // GET TENANT VEHICLE COUNT
  // ============================================
  const getTenantVehicleCount = (tenantId) => {
    return vehicles.filter(v => v.tenantId === tenantId || v.costCentre === tenantId).length;
  };

  // ============================================
  // GET TENANT DRIVER COUNT
  // ============================================
  const getTenantDriverCount = (tenantId) => {
    return drivers.filter(d => d.tenantId === tenantId).length;
  };

  // ============================================
  // GET TENANT DETAILS
  // ============================================
  const getTenantDetails = (tenantId) => {
    return tenants.find(t => t.id === tenantId);
  };

  // ============================================
  // HANDLE TENANT SWITCH
  // ============================================
  const handleTenantSwitch = (tenantId) => {
    console.log(`🔄 Switching to tenant: ${tenantId}`);
    
    // Switch tenant in config
    switchTenant(tenantId);
    
    // Dispatch event for dashboard to reload
    window.dispatchEvent(new CustomEvent('tenantSwitched', {
      detail: { tenantId }
    }));
    
    // Also dispatch tenantChanged event for compatibility
    const tenant = tenants.find(t => t.id === tenantId);
    window.dispatchEvent(new CustomEvent('tenantChanged', {
      detail: { 
        config: {
          ...tenant,
          name: tenant?.name || 'Unknown',
          vehicles: vehicles.filter(v => v.tenantId === tenantId || v.costCentre === tenantId),
          geofences: [],
          map: { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 }
        }
      }
    }));
    
    setIsOpen(false);
  };

  // ============================================
  // REFRESH TENANTS (for updates)
  // ============================================
  useEffect(() => {
    const handleTenantUpdate = () => {
      loadTenants();
    };

    window.addEventListener('tenantsUpdated', handleTenantUpdate);
    window.addEventListener('vehiclesUpdated', handleTenantUpdate);
    window.addEventListener('driversUpdated', handleTenantUpdate);

    return () => {
      window.removeEventListener('tenantsUpdated', handleTenantUpdate);
      window.removeEventListener('vehiclesUpdated', handleTenantUpdate);
      window.removeEventListener('driversUpdated', handleTenantUpdate);
    };
  }, []);

  // ============================================
  // RENDER ADMIN TENANT SWITCHER
  // ============================================
  if (isAdmin) {
    const currentTenantDetails = getTenantDetails(currentTenant);
    const currentVehicleCount = getTenantVehicleCount(currentTenant);
    const currentDriverCount = getTenantDriverCount(currentTenant);

    // Show loading state
    if (isLoading) {
      return (
        <div className="relative">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm min-w-[150px]">
            <Building size={14} className="text-blue-600" />
            <span className="text-blue-700">Loading...</span>
          </button>
        </div>
      );
    }

    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm min-w-[150px]"
        >
          <Building size={14} className="text-blue-600" />
          <span className="font-medium text-blue-700 truncate max-w-[120px]">
            {currentTenantDetails?.name || 'Select Tenant'}
          </span>
          <ChevronDown size={14} className={`text-blue-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
            
            <div className="absolute left-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
              <div className="p-2">
                {/* Current tenant display */}
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
                          <span className="text-sm font-medium truncate block">{tenant.name || tenant.id}</span>
                          <span className="text-xs text-gray-400">
                            🚗 {vehicleCount} · 👤 {driverCount}
                          </span>
                        </div>
                        {isActive && <Check size={16} className="text-blue-600 flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    <Users size={24} className="mx-auto text-gray-300 mb-2" />
                    <p>No tenants found</p>
                    <p className="text-xs">Create a tenant first</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ============================================
  // RENDER REGULAR USER TENANT SWITCHER (Car Owner)
  // ============================================
  // Group locations by country
  const kenyaLocations = presets.filter(p => p.isKenya);
  const otherLocations = presets.filter(p => !p.isKenya && p.id !== 'custom');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm"
      >
        <MapPin size={14} className="text-blue-600" />
        <span className="font-medium text-blue-700">{current?.name || 'Select Location'}</span>
        <ChevronDown size={14} className={`text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)}></div>
          
          <div className="absolute left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="text-xs text-gray-500">Current Location</p>
                <p className="text-sm font-semibold text-gray-800">{current?.name || 'Select Location'}</p>
              </div>
              
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 border-b border-gray-100">
                🇰🇪 Kenya
              </div>
              {kenyaLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    switchTenant(location.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left ${
                    currentTenant === location.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm">{location.name}</span>
                  {currentTenant === location.id && <Check size={16} className="text-blue-600" />}
                </button>
              ))}

              <div className="border-t border-gray-200 my-2"></div>
              <div className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 border-b border-gray-100">
                🌍 Other Locations
              </div>
              {otherLocations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    switchTenant(location.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left ${
                    currentTenant === location.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="text-sm">{location.name}</span>
                  {currentTenant === location.id && <Check size={16} className="text-blue-600" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TenantSwitcher;