// src/components/layout/MainLayout.jsx
import React, { useState, useEffect } from 'react';
import Sidebar from '../common/Sidebar';
import Header from '../common/Header';
import TopBar from '../common/TopBar';

const MainLayout = ({ children, activeTab, setActiveTab, navItems, onLogout, userRole }) => {  // ✅ ADD userRole prop
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // ✅ Check if user is admin
  const isAdmin = userRole === 'super_admin';
  console.log('🔍 MainLayout - isAdmin:', isAdmin, 'userRole:', userRole);

  // ============================================
  // ✅ GLOBAL SEARCH HANDLER
  // ============================================
  const handleGlobalSearch = (query) => {
    console.log('🔍 Global search:', query);
    
    if (!query || query.trim().length === 0) {
      return;
    }

    const searchTerm = query.toLowerCase().trim();

    // Get ALL data from ALL storage locations
    const tenantConfigData = localStorage.getItem('tenantConfig');
    const driversData = localStorage.getItem('fleetman_drivers');
    const vehiclesData = localStorage.getItem('fleetman_vehicles');
    const maintenanceData = localStorage.getItem('fleetman_maintenance');
    const geofencesData = localStorage.getItem('fleetman_geofences');
    
    let drivers = [];
    let vehicles = [];
    let maintenance = [];
    let geofences = [];
    let foundIn = [];

    // 1. Try tenantConfig first (if exists)
    if (tenantConfigData) {
      try {
        const config = JSON.parse(tenantConfigData);
        drivers = config.drivers || [];
        vehicles = config.vehicles || [];
        maintenance = config.maintenance || [];
        geofences = config.geofences || [];
        console.log(`📋 From tenantConfig: ${drivers.length} drivers, ${vehicles.length} vehicles`);
      } catch (e) {
        console.error('Error parsing tenantConfig:', e);
      }
    }

    // 2. If no drivers found, try fleetman_drivers
    if (drivers.length === 0 && driversData) {
      try {
        drivers = JSON.parse(driversData);
        console.log(`📋 From fleetman_drivers: ${drivers.length} drivers`);
      } catch (e) {
        console.error('Error parsing fleetman_drivers:', e);
      }
    }

    // 3. If no vehicles found, try fleetman_vehicles
    if (vehicles.length === 0 && vehiclesData) {
      try {
        vehicles = JSON.parse(vehiclesData);
        console.log(`🚗 From fleetman_vehicles: ${vehicles.length} vehicles`);
      } catch (e) {
        console.error('Error parsing fleetman_vehicles:', e);
      }
    }

    // 4. If no maintenance found, try fleetman_maintenance
    if (maintenance.length === 0 && maintenanceData) {
      try {
        maintenance = JSON.parse(maintenanceData);
        console.log(`🔧 From fleetman_maintenance: ${maintenance.length} records`);
      } catch (e) {
        console.error('Error parsing fleetman_maintenance:', e);
      }
    }

    // 5. If no geofences found, try fleetman_geofences
    if (geofences.length === 0 && geofencesData) {
      try {
        geofences = JSON.parse(geofencesData);
        console.log(`📍 From fleetman_geofences: ${geofences.length} geofences`);
      } catch (e) {
        console.error('Error parsing fleetman_geofences:', e);
      }
    }

    // Search in DRIVERS
    const matchingDrivers = drivers.filter(d => 
      (d.name || '').toLowerCase().includes(searchTerm) ||
      (d.driver_id || '').toLowerCase().includes(searchTerm) ||
      (d.license_number || '').toLowerCase().includes(searchTerm) ||
      (d.assigned_vehicle || '').toLowerCase().includes(searchTerm) ||
      (d.phone || '').toLowerCase().includes(searchTerm) ||
      (d.email || '').toLowerCase().includes(searchTerm) ||
      (d.status || '').toLowerCase().includes(searchTerm)
    );

    // Search in VEHICLES
    const matchingVehicles = vehicles.filter(v => 
      (v.label || v.reg || v.id || '').toString().toLowerCase().includes(searchTerm) ||
      (v.driver || '').toLowerCase().includes(searchTerm) ||
      (v.make || '').toLowerCase().includes(searchTerm) ||
      (v.model || '').toLowerCase().includes(searchTerm) ||
      (v.color || '').toLowerCase().includes(searchTerm) ||
      (v.status || '').toLowerCase().includes(searchTerm) ||
      (v.type || '').toLowerCase().includes(searchTerm)
    );

    // Search in MAINTENANCE
    const matchingMaintenance = maintenance.filter(m =>
      (m.vehicle || m.vehicle_id || '').toLowerCase().includes(searchTerm) ||
      (m.type || '').toLowerCase().includes(searchTerm) ||
      (m.status || '').toLowerCase().includes(searchTerm) ||
      (m.description || '').toLowerCase().includes(searchTerm) ||
      (m.priority || '').toLowerCase().includes(searchTerm)
    );

    // Search in GEOFENCES
    const matchingGeofences = geofences.filter(g =>
      (g.name || '').toLowerCase().includes(searchTerm) ||
      (g.type || '').toLowerCase().includes(searchTerm) ||
      (g.status || '').toLowerCase().includes(searchTerm) ||
      (g.description || '').toLowerCase().includes(searchTerm)
    );

    // Track where matches were found
    if (matchingDrivers.length > 0) {
      foundIn.push({ tab: 'drivers', count: matchingDrivers.length, label: 'Drivers' });
      console.log(`✅ Found ${matchingDrivers.length} drivers matching "${searchTerm}"`);
    }
    
    if (matchingVehicles.length > 0) {
      foundIn.push({ tab: 'vehicles', count: matchingVehicles.length, label: 'Vehicles' });
      console.log(`✅ Found ${matchingVehicles.length} vehicles matching "${searchTerm}"`);
    }

    if (matchingMaintenance.length > 0) {
      foundIn.push({ tab: 'maintenance', count: matchingMaintenance.length, label: 'Maintenance' });
      console.log(`✅ Found ${matchingMaintenance.length} maintenance records matching "${searchTerm}"`);
    }

    if (matchingGeofences.length > 0) {
      foundIn.push({ tab: 'geofencing', count: matchingGeofences.length, label: 'Geofences' });
      console.log(`✅ Found ${matchingGeofences.length} geofences matching "${searchTerm}"`);
    }

    // Navigate to the first match
    if (foundIn.length > 0) {
      const target = foundIn[0];
      setActiveTab(target.tab);
      console.log(`✅ Navigated to: ${target.tab} (${target.label})`);
      
      // Send search results to the page
      window.dispatchEvent(new CustomEvent('searchResults', {
        detail: { 
          query: searchTerm,
          foundIn: foundIn,
          drivers: matchingDrivers,
          vehicles: matchingVehicles,
          maintenance: matchingMaintenance,
          geofences: matchingGeofences
        }
      }));
    } else {
      console.log(`ℹ️ No matches found for "${searchTerm}"`);
      
      // Search all data for any match
      const allData = [...drivers, ...vehicles, ...maintenance, ...geofences];
      const searchableItems = allData.filter(item => {
        return Object.values(item).some(value => 
          typeof value === 'string' && 
          value.toLowerCase().includes(searchTerm)
        );
      });
      
      console.log(`📊 Found ${searchableItems.length} items containing "${searchTerm}" in all data`);
      
      window.dispatchEvent(new CustomEvent('searchResults', {
        detail: { 
          query: searchTerm,
          foundIn: [],
          allResults: searchableItems,
          noResults: searchableItems.length === 0
        }
      }));
    }

    localStorage.setItem('lastSearchQuery', searchTerm);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      <Sidebar 
        sidebarOpen={sidebarOpen} 
        setSidebarOpen={setSidebarOpen} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        navItems={navItems} 
      />
      
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        <Header 
          activeTab={activeTab} 
          onLogout={onLogout} 
          toggleSidebar={toggleSidebar}
        />
        
        {/* ✅ PASS isAdmin TO TopBar */}
        {userRole !== 'driver' && <TopBar onSearch={handleGlobalSearch} isAdmin={isAdmin} />}
        
        <div className="p-3 sm:p-6 flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default MainLayout;