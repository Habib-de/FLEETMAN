// src/context/TenantConfigContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { tenantService } from '../services/api';
import { useAuth } from './AuthContext';

// ============================================
// LOCATION PRESETS - FALLBACK ONLY
// ============================================

const LOCATION_PRESETS = {
  nairobi: {
    id: 'nairobi',
    name: 'Nairobi CBD, Kenya',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    map: { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 },
  },
  mombasa: {
    id: 'mombasa',
    name: 'Mombasa, Kenya',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    map: { center: { lat: -4.0435, lng: 39.6682 }, zoom: 13 },
  },
  kisumu: {
    id: 'kisumu',
    name: 'Kisumu, Kenya',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    map: { center: { lat: -0.1022, lng: 34.7617 }, zoom: 13 },
  },
  eldoret: {
    id: 'eldoret',
    name: 'Eldoret, Kenya',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    map: { center: { lat: 0.5143, lng: 35.2698 }, zoom: 13 },
  },
  nakuru: {
    id: 'nakuru',
    name: 'Nakuru, Kenya',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    map: { center: { lat: -0.3031, lng: 36.0800 }, zoom: 13 },
  },
  thika: {
    id: 'thika',
    name: 'Thika, Kenya',
    country: 'Kenya',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    map: { center: { lat: -1.0388, lng: 37.0833 }, zoom: 13 },
  },
  lesotho: {
    id: 'lesotho',
    name: 'Maseru, Lesotho',
    country: 'Lesotho',
    currency: 'LSL',
    timezone: 'Africa/Maseru',
    map: { center: { lat: -29.3167, lng: 27.4833 }, zoom: 12 },
  },
  cape_town: {
    id: 'cape_town',
    name: 'Cape Town, South Africa',
    country: 'South Africa',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    map: { center: { lat: -33.9249, lng: 18.4241 }, zoom: 12 },
  },
  johannesburg: {
    id: 'johannesburg',
    name: 'Johannesburg, South Africa',
    country: 'South Africa',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    map: { center: { lat: -26.2041, lng: 28.0473 }, zoom: 12 },
  },
  lagos: {
    id: 'lagos',
    name: 'Lagos, Nigeria',
    country: 'Nigeria',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    map: { center: { lat: 6.5244, lng: 3.3792 }, zoom: 12 },
  },
  accra: {
    id: 'accra',
    name: 'Accra, Ghana',
    country: 'Ghana',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    map: { center: { lat: 5.6037, lng: -0.1870 }, zoom: 13 },
  },
  custom: {
    id: 'custom',
    name: 'Custom Location',
    country: 'Custom',
    currency: 'USD',
    timezone: 'UTC',
    map: { center: { lat: 0, lng: 0 }, zoom: 10 },
  }
};

export const KENYA_CITIES = {
  nairobi: { name: 'Nairobi', lat: -1.2921, lng: 36.8219 },
  mombasa: { name: 'Mombasa', lat: -4.0435, lng: 39.6682 },
  kisumu: { name: 'Kisumu', lat: -0.1022, lng: 34.7617 },
  eldoret: { name: 'Eldoret', lat: 0.5143, lng: 35.2698 },
  nakuru: { name: 'Nakuru', lat: -0.3031, lng: 36.0800 },
  thika: { name: 'Thika', lat: -1.0388, lng: 37.0833 },
  malindi: { name: 'Malindi', lat: -3.2192, lng: 40.1200 },
  kitale: { name: 'Kitale', lat: 1.0200, lng: 35.0000 },
  garissa: { name: 'Garissa', lat: -0.4542, lng: 39.6583 },
  meru: { name: 'Meru', lat: 0.0500, lng: 37.6500 },
};

// ============================================
// TENANT CONFIG CONTEXT - DATABASE POWERED
// ============================================

const TenantConfigContext = createContext();

export const TenantConfigProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [currentTenant, setCurrentTenant] = useState('nairobi');
  const [tenantConfig, setTenantConfig] = useState(null);
  const [availableLocations, setAvailableLocations] = useState(Object.keys(LOCATION_PRESETS));
  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // ============================================
// LOAD TENANTS FROM API - FIXED FOR ALL ROLES
// ============================================
const loadTenants = async () => {
  setIsLoading(true);
  try {
    console.log('🔄 TenantConfig: Loading tenants...');
    console.log('👤 Current user role:', currentUser?.role);
    
    // ✅ For super_admin: load ALL tenants
    if (currentUser?.role === 'super_admin') {
      try {
        const response = await tenantService.getAll();
        const tenantsData = response.data || [];
        setTenants(tenantsData);
        console.log(`✅ TenantConfig: Loaded ${tenantsData.length} tenants`);
      } catch (error) {
        console.error('Failed to load tenants:', error);
        setTenants([]);
      }
    } else {
      // ✅ For car_owner or driver: load ONLY their own tenant
      if (currentUser?.tenantId) {
        try {
          const response = await tenantService.getById(currentUser.tenantId);
          const tenantData = response.data;
          if (tenantData) {
            setTenants([tenantData]);
            console.log(`✅ TenantConfig: Loaded user's tenant: ${tenantData.name}`);
          } else {
            setTenants([]);
          }
        } catch (error) {
          console.error('Failed to load user\'s tenant:', error);
          setTenants([]);
        }
      } else {
        console.log('⚠️ No tenantId found for user');
        setTenants([]);
      }
    }
    
    // ============================================
    // SET CURRENT TENANT FROM DATABASE
    // ============================================
    
    // ✅ If user has a tenant, set it as current
    if (currentUser?.tenantId) {
      // Find the tenant in the loaded list
      const userTenant = tenants.find(t => t.id === currentUser.tenantId);
      
      if (userTenant) {
        // ✅ TRY TO LOAD LOCATION FROM DATABASE
        const config = await loadLocationFromDatabase(userTenant.id);
        if (config) {
          setTenantConfig(config);
          setCurrentTenant(userTenant.id);
          localStorage.setItem('fleetman_tenant', userTenant.id);
          console.log('✅ Location loaded from database:', config);
        } else {
          // Fallback to default using tenant name
          const defaultConfig = {
            id: userTenant.id,
            name: userTenant.name,
            country: 'Kenya',
            currency: 'KES',
            timezone: 'Africa/Nairobi',
            map: { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 },
          };
          setTenantConfig(defaultConfig);
          setCurrentTenant(userTenant.id);
          localStorage.setItem('fleetman_tenant', userTenant.id);
          console.log('📦 Using default config for tenant:', userTenant.name);
        }
      } else {
        // Tenant not found in loaded list, try to fetch it directly
        try {
          const response = await tenantService.getById(currentUser.tenantId);
          const tenantData = response.data;
          if (tenantData) {
            // Add to tenants list
            setTenants(prev => [...prev, tenantData]);
            
            const config = await loadLocationFromDatabase(tenantData.id);
            if (config) {
              setTenantConfig(config);
              setCurrentTenant(tenantData.id);
              localStorage.setItem('fleetman_tenant', tenantData.id);
              console.log('✅ Location loaded from database (direct fetch):', config);
            } else {
              const defaultConfig = {
                id: tenantData.id,
                name: tenantData.name,
                country: 'Kenya',
                currency: 'KES',
                timezone: 'Africa/Nairobi',
                map: { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 },
              };
              setTenantConfig(defaultConfig);
              setCurrentTenant(tenantData.id);
              localStorage.setItem('fleetman_tenant', tenantData.id);
              console.log('📦 Using default config for tenant (direct fetch):', tenantData.name);
            }
          }
        } catch (e) {
          console.warn('Failed to fetch tenant directly:', e);
          // Fallback to localStorage
          const savedTenant = localStorage.getItem('fleetman_tenant');
          if (savedTenant && LOCATION_PRESETS[savedTenant]) {
            setCurrentTenant(savedTenant);
            setTenantConfig(LOCATION_PRESETS[savedTenant]);
          } else {
            setTenantConfig(LOCATION_PRESETS['nairobi']);
            setCurrentTenant('nairobi');
          }
        }
      }
    } else {
      // No tenantId from user - use fallback
      console.log('👤 No tenantId in user object, using fallback');
      const savedTenant = localStorage.getItem('fleetman_tenant');
      if (savedTenant && LOCATION_PRESETS[savedTenant]) {
        setCurrentTenant(savedTenant);
        setTenantConfig(LOCATION_PRESETS[savedTenant]);
      } else if (tenants.length > 0) {
        // Use first tenant from loaded list
        const firstTenant = tenants[0];
        const config = {
          id: firstTenant.id,
          name: firstTenant.name,
          country: 'Kenya',
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          map: { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 },
        };
        setTenantConfig(config);
        setCurrentTenant(firstTenant.id);
        localStorage.setItem('fleetman_tenant', firstTenant.id);
        console.log('📦 Using first tenant as fallback:', firstTenant.name);
      } else {
        setTenantConfig(LOCATION_PRESETS['nairobi']);
        setCurrentTenant('nairobi');
        console.log('📦 Using default Nairobi preset');
      }
    }
    
  } catch (error) {
    console.error('❌ TenantConfig: Failed to load tenants:', error);
    
    // ✅ FALLBACK: Try localStorage
    const savedTenant = localStorage.getItem('fleetman_tenant');
    if (savedTenant && LOCATION_PRESETS[savedTenant]) {
      setCurrentTenant(savedTenant);
      setTenantConfig(LOCATION_PRESETS[savedTenant]);
    } else {
      setTenantConfig(LOCATION_PRESETS['nairobi']);
      setCurrentTenant('nairobi');
    }
  } finally {
    setIsLoading(false);
  }
};

  // ============================================
  // ✅ NEW: LOAD LOCATION FROM DATABASE
  // ============================================
  const loadLocationFromDatabase = async (tenantId) => {
    try {
      const response = await tenantService.getLocation(tenantId);
      const locationData = response.data;
      
      if (locationData) {
        return {
          id: tenantId,
          name: locationData.name || 'My Location',
          country: locationData.country || 'Kenya',
          currency: locationData.currency || 'KES',
          timezone: locationData.timezone || 'Africa/Nairobi',
          map: locationData.map || { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 },
        };
      }
      return null;
    } catch (error) {
      console.warn('Failed to load location from database:', error);
      return null;
    }
  };

  // ============================================
  // ✅ NEW: SAVE LOCATION TO DATABASE
  // ============================================
  const saveLocationToDatabase = async (tenantId, locationData) => {
    if (!tenantId) {
      console.warn('No tenant ID to save location');
      return;
    }

    try {
      await tenantService.updateLocation(tenantId, {
        name: locationData.name,
        country: locationData.country,
        currency: locationData.currency,
        timezone: locationData.timezone,
        map: locationData.map,
      });
      console.log('✅ Location saved to database');
      return true;
    } catch (error) {
      console.error('❌ Failed to save location to database:', error);
      return false;
    }
  };

  // ============================================
  // INITIAL LOAD
  // ============================================
  useEffect(() => {
    loadTenants();
  }, [currentUser]);

  // ============================================
  // SWITCH TENANT - NOW SAVES TO DATABASE
  // ============================================
  const switchTenant = async (tenantId) => {
    console.log(`🔄 TenantConfig: Switching to tenant: ${tenantId}`);
    
    try {
      // Get the preset or tenant data
      let config = null;
      let tenantName = '';
      
      // Try to get from API first (only if super_admin)
      if (currentUser?.role === 'super_admin') {
        try {
          const response = await tenantService.getById(tenantId);
          const tenant = response.data;
          if (tenant) {
            tenantName = tenant.name;
          }
        } catch (e) {
          console.warn('Failed to fetch tenant from API:', e);
        }
      }
      
      // Get from presets
      if (LOCATION_PRESETS[tenantId]) {
        config = {
          id: tenantId,
          name: tenantName || LOCATION_PRESETS[tenantId].name,
          country: LOCATION_PRESETS[tenantId].country,
          currency: LOCATION_PRESETS[tenantId].currency,
          timezone: LOCATION_PRESETS[tenantId].timezone,
          map: LOCATION_PRESETS[tenantId].map,
        };
      } else {
        // Custom tenant
        const foundTenant = tenants.find(t => t.id === tenantId);
        if (foundTenant) {
          config = {
            id: tenantId,
            name: foundTenant.name,
            country: 'Kenya',
            currency: 'KES',
            timezone: 'Africa/Nairobi',
            map: { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 },
          };
        } else {
          console.error('Tenant not found:', tenantId);
          return;
        }
      }
      
      // Update UI immediately
      setCurrentTenant(tenantId);
      setTenantConfig(config);
      localStorage.setItem('fleetman_tenant', tenantId);
      
      // ✅ SAVE TO DATABASE
      const tenantIdToSave = currentUser?.tenantId || tenantId;
      await saveLocationToDatabase(tenantIdToSave, config);
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('tenantChanged', { 
        detail: { tenantId, config } 
      }));
      
    } catch (error) {
      console.error('❌ TenantConfig: Failed to switch tenant:', error);
      
      // Fallback: Use preset without saving to DB
      if (LOCATION_PRESETS[tenantId]) {
        setCurrentTenant(tenantId);
        setTenantConfig(LOCATION_PRESETS[tenantId]);
        localStorage.setItem('fleetman_tenant', tenantId);
        
        window.dispatchEvent(new CustomEvent('tenantChanged', { 
          detail: { tenantId, config: LOCATION_PRESETS[tenantId] } 
        }));
      }
    }
  };

  // ============================================
// GET AVAILABLE PRESETS - FOR ALL ROLES
// ============================================
const getAvailablePresets = () => {
  // ✅ For super_admin: combine API tenants with presets
  if (currentUser?.role === 'super_admin') {
    const apiTenants = tenants.map(t => ({
      id: t.id,
      name: t.name,
      country: 'Kenya',
      isKenya: true
    }));
    
    const presetLocations = Object.keys(LOCATION_PRESETS).map(key => ({
      id: key,
      name: LOCATION_PRESETS[key].name,
      country: LOCATION_PRESETS[key].country,
      isKenya: ['nairobi', 'mombasa', 'kisumu', 'eldoret', 'nakuru', 'thika'].includes(key)
    }));
    
    return [...apiTenants, ...presetLocations];
  }
  
  // ✅ For car_owner AND driver: include their own tenant + presets
  const presets = Object.keys(LOCATION_PRESETS).map(key => ({
    id: key,
    name: LOCATION_PRESETS[key].name,
    country: LOCATION_PRESETS[key].country,
    isKenya: ['nairobi', 'mombasa', 'kisumu', 'eldoret', 'nakuru', 'thika'].includes(key)
  }));
  
  // ✅ Include the user's tenant from the database
  if (currentUser?.tenantId) {
    const userTenant = tenants.find(t => t.id === currentUser.tenantId);
    if (userTenant) {
      let locationName = userTenant.name;
      let locationMap = { center: { lat: -1.2921, lng: 36.8219 }, zoom: 13 };
      
      if (userTenant.config) {
        try {
          const config = JSON.parse(userTenant.config);
          if (config.location) {
            locationName = config.location.name || userTenant.name;
            if (config.map) {
              locationMap = config.map;
            }
          }
        } catch (e) {
          console.warn('Failed to parse tenant config:', e);
        }
      }
      
      const exists = presets.some(p => p.id === userTenant.id);
      if (!exists) {
        presets.unshift({
          id: userTenant.id,
          name: locationName,
          country: userTenant.country || 'Kenya',
          isKenya: true,
          map: locationMap
        });
      }
    }
  }
  
  return presets;
};

  const getKenyaLocations = () => {
    return Object.keys(KENYA_CITIES).map(key => ({
      id: key,
      name: KENYA_CITIES[key].name,
      lat: KENYA_CITIES[key].lat,
      lng: KENYA_CITIES[key].lng
    }));
  };

  const addCustomLocation = async (locationData) => {
    // Only super_admin can add custom locations via API
    if (currentUser?.role === 'super_admin') {
      try {
        const response = await tenantService.create({
          name: locationData.name,
          subdomain: locationData.name.toLowerCase().replace(/\s/g, '_'),
          status: 'active',
          config: JSON.stringify({
            location: {
              name: locationData.name,
              country: locationData.country || 'Custom',
              currency: locationData.currency || 'USD',
              timezone: locationData.timezone || 'UTC',
              map: { center: { lat: locationData.lat, lng: locationData.lng }, zoom: locationData.zoom || 12 }
            }
          })
        });
        
        const newTenant = response.data;
        setTenants(prev => [...prev, newTenant]);
        return newTenant.id;
      } catch (error) {
        console.error('❌ TenantConfig: Failed to add custom location:', error);
        // Fallback to adding to presets
        const newId = `custom_${Date.now()}`;
        LOCATION_PRESETS[newId] = {
          id: newId,
          name: locationData.name,
          country: locationData.country || 'Custom',
          currency: locationData.currency || 'USD',
          timezone: locationData.timezone || 'UTC',
          map: { center: { lat: locationData.lat, lng: locationData.lng }, zoom: locationData.zoom || 12 },
        };
        setAvailableLocations([...Object.keys(LOCATION_PRESETS)]);
        return newId;
      }
    } else {
      // Non-admin users can only add to presets (local)
      const newId = `custom_${Date.now()}`;
      LOCATION_PRESETS[newId] = {
        id: newId,
        name: locationData.name,
        country: locationData.country || 'Custom',
        currency: locationData.currency || 'USD',
        timezone: locationData.timezone || 'UTC',
        map: { center: { lat: locationData.lat, lng: locationData.lng }, zoom: locationData.zoom || 12 },
      };
      setAvailableLocations([...Object.keys(LOCATION_PRESETS)]);
      return newId;
    }
  };

  const value = {
    currentTenant,
    tenantConfig,
    tenants,
    isLoading,
    switchTenant,
    getKenyaLocations,
    getAvailablePresets,
    addCustomLocation,
    saveLocationToDatabase,
    loadLocationFromDatabase,
    LOCATION_PRESETS,
    KENYA_CITIES,
  };

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
};

export const useTenantConfig = () => {
  const context = useContext(TenantConfigContext);
  if (!context) {
    throw new Error('useTenantConfig must be used within a TenantConfigProvider');
  }
  return context;
};

export default TenantConfigContext;