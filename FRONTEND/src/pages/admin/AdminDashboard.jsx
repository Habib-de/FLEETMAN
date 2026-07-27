// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { 
  Users, Truck, Server, AlertTriangle, CheckCircle, 
  Activity, BarChart3, TrendingUp, TrendingDown,
  Clock, DollarSign, Shield, Zap, Globe, ChevronRight,
  XCircle, RefreshCw, Building2, Car, UserCircle, AlertCircle,
  Calendar as CalendarIcon, Check, X, Eye, Phone, Mail,
  MapPin, Fuel, Gauge, Calendar, Wrench, FileText,
  Award, Star, Navigation, Settings, Layers, List
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  tenantService, 
  vehicleService, 
  driverService, 
  incidentService, 
  userService 
} from '../../services/api';

const AdminDashboard = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [poolRequests, setPoolRequests] = useState([]);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // ============================================
  // MODAL STATES
  // ============================================
  const [selectedModal, setSelectedModal] = useState(null);
  const [modalData, setModalData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ============================================
  // NAVIGATION HELPER
  // ============================================
  const navigateTo = (tab) => {
    console.log(`📱 Navigating to: ${tab}`);
    if (setActiveTab) {
      setActiveTab(tab);
    }
  };

  // ============================================
  // LOAD POOL BOOKING REQUESTS
  // ============================================
  const loadPoolRequests = async () => {
    try {
      const response = await tenantService.getPoolBookingRequests();
      if (response?.success && response?.data) {
        setPoolRequests(response.data);
        console.log('✅ Loaded pool booking requests:', response.data.length);
      }
    } catch (error) {
      console.error('Failed to load pool booking requests:', error);
    }
  };

  // ============================================
  // HANDLE APPROVE POOL BOOKING
  // ============================================
  const handleApprovePoolBooking = async (tenantId) => {
    setProcessingRequest(tenantId);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const response = await tenantService.approvePoolBooking(tenantId);
      if (response?.success) {
        setSuccessMessage('✅ Pool booking approved successfully!');
        await loadPoolRequests();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to approve pool booking:', error);
      setErrorMessage('❌ Failed to approve pool booking. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setProcessingRequest(null);
    }
  };

  // ============================================
  // HANDLE DENY POOL BOOKING
  // ============================================
  const handleDenyPoolBooking = async () => {
    if (!selectedTenantId || !denyReason.trim()) {
      setErrorMessage('❌ Please provide a reason for denial.');
      return;
    }
    
    setProcessingRequest(selectedTenantId);
    setSuccessMessage('');
    setErrorMessage('');
    
    try {
      const response = await tenantService.denyPoolBooking(selectedTenantId, denyReason);
      if (response?.success) {
        setSuccessMessage('✅ Pool booking denied successfully.');
        setShowDenyModal(false);
        setDenyReason('');
        setSelectedTenantId(null);
        await loadPoolRequests();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to deny pool booking:', error);
      setErrorMessage('❌ Failed to deny pool booking. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setProcessingRequest(null);
    }
  };

  // ============================================
  // LOAD DATA FROM BACKEND
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading dashboard data...');

      // 1. Fetch all tenants
      const tenantsResponse = await tenantService.getAll();
      const tenantsData = tenantsResponse.data || [];
      setTenants(tenantsData);

      // 2. Load pool booking requests
      await loadPoolRequests();

      // 3. Fetch users from all tenants
      let allUsers = [];
      if (tenantsData.length > 0) {
        const userPromises = tenantsData.map(tenant => 
          userService.getByTenant(tenant.id)
            .then(response => response.data || [])
            .catch(() => [])
        );
        const userResults = await Promise.all(userPromises);
        allUsers = userResults.flat();
      }
      setUsers(allUsers);

      // 4. Fetch incidents from all tenants
      let allIncidents = [];
      if (tenantsData.length > 0) {
        const incidentPromises = tenantsData.map(tenant => 
          incidentService.getByTenant(tenant.id)
            .then(response => response.data || [])
            .catch(() => [])
        );
        const incidentResults = await Promise.all(incidentPromises);
        allIncidents = incidentResults.flat();
      }
      setIncidents(allIncidents);

      // 5. Fetch vehicles for each tenant
      let allVehicles = [];
      if (tenantsData.length > 0) {
        const vehiclePromises = tenantsData.map(tenant => 
          vehicleService.getAll(tenant.id)
            .then(response => response.data || [])
            .catch(() => [])
        );
        const vehicleResults = await Promise.all(vehiclePromises);
        allVehicles = vehicleResults.flat();
      }
      setVehicles(allVehicles);

      // 6. Fetch drivers for each tenant
      let allDrivers = [];
      if (tenantsData.length > 0) {
        const driverPromises = tenantsData.map(tenant => 
          driverService.getAll(tenant.id)
            .then(response => response.data || [])
            .catch(() => [])
        );
        const driverResults = await Promise.all(driverPromises);
        allDrivers = driverResults.flat();
      }
      setDrivers(allDrivers);

      setLastUpdated(new Date().toLocaleTimeString());

      console.log(`✅ Dashboard loaded: ${tenantsData.length} tenants, ${allVehicles.length} vehicles, ${allDrivers.length} drivers`);

    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      setError(error.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // ============================================
  // INITIAL LOAD AND AUTO-REFRESH
  // ============================================
  useEffect(() => {
    loadData(true);

    const intervalId = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard...');
      loadData(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // ============================================
  // OPEN MODAL HANDLERS
  // ============================================
  const openTenantsModal = () => {
    setSelectedModal('tenants');
    setModalData({
      title: 'Tenants Overview',
      icon: Building2,
      data: tenants,
      fields: [
        { key: 'name', label: 'Name', icon: Building2 },
        { key: 'subdomain', label: 'Subdomain', icon: Globe },
        { key: 'status', label: 'Status', icon: CheckCircle },
        { key: 'cardPoolingEnabled', label: 'Card Pooling', icon: CreditCard || Layers },
      ]
    });
    setShowModal(true);
  };

  const openVehiclesModal = () => {
    setSelectedModal('vehicles');
    setModalData({
      title: 'Vehicles Overview',
      icon: Car,
      data: vehicles,
      fields: [
        { key: 'registration', label: 'Registration', icon: Car },
        { key: 'make', label: 'Make', icon: Truck },
        { key: 'model', label: 'Model', icon: Settings },
        { key: 'status', label: 'Status', icon: CheckCircle },
      ]
    });
    setShowModal(true);
  };

  const openDriversModal = () => {
    setSelectedModal('drivers');
    setModalData({
      title: 'Drivers Overview',
      icon: UserCircle,
      data: drivers,
      fields: [
        { key: 'name', label: 'Name', icon: UserCircle },
        { key: 'licenseNumber', label: 'License', icon: Award },
        { key: 'status', label: 'Status', icon: CheckCircle },
        { key: 'safetyScore', label: 'Safety Score', icon: Shield },
      ]
    });
    setShowModal(true);
  };

  const openPoolModal = () => {
    const pendingRequests = poolRequests.filter(r => r.poolBookingEnabled && !r.poolBookingApproved);
    setSelectedModal('pool');
    setModalData({
      title: 'Pool Booking Requests',
      icon: CalendarIcon,
      data: pendingRequests,
      fields: [
        { key: 'name', label: 'Tenant', icon: Building2 },
        { key: 'subdomain', label: 'Subdomain', icon: Globe },
        { key: 'poolBookingRequestedAt', label: 'Requested', icon: Clock },
      ]
    });
    setShowModal(true);
  };

  const openIncidentsModal = () => {
    const activeIncidents = incidents.filter(i => 
      i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'resolved'
    );
    setSelectedModal('incidents');
    setModalData({
      title: 'Active Incidents',
      icon: AlertCircle,
      data: activeIncidents,
      fields: [
        { key: 'incidentType', label: 'Type', icon: AlertTriangle },
        { key: 'severity', label: 'Severity', icon: AlertCircle },
        { key: 'status', label: 'Status', icon: Activity },
        { key: 'location', label: 'Location', icon: MapPin },
      ]
    });
    setShowModal(true);
  };

  // ============================================
  // CLOSE MODAL
  // ============================================
  const closeModal = () => {
    setShowModal(false);
    setSelectedModal(null);
    setModalData(null);
  };

  // ============================================
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!showModal || !modalData) return null;

    const { title, icon: Icon, data, fields } = modalData;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={closeModal}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-blue-100 text-sm">{data.length} items</p>
              </div>
            </div>
            <button 
              onClick={closeModal}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {data.length === 0 ? (
              <div className="text-center py-12">
                <Icon size={64} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">No items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.map((item, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="space-y-2">
                      {fields.map((field) => {
                        const value = item[field.key];
                        if (value === null || value === undefined || value === '') return null;
                        
                        return (
                          <div key={field.key} className="flex items-center gap-2 text-sm">
                            <field.icon size={16} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500 font-medium">{field.label}:</span>
                            <span className="text-gray-900 font-medium truncate">
                              {typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : 
                               field.key === 'status' ? (
                                 <span className={`px-2 py-0.5 rounded-full text-xs ${
                                   value === 'active' || value === 'Active' ? 'bg-green-100 text-green-700' :
                                   value === 'inactive' || value === 'Inactive' ? 'bg-gray-100 text-gray-700' :
                                   value === 'pending' || value === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                                   value === 'resolved' || value === 'Resolved' ? 'bg-blue-100 text-blue-700' :
                                   'bg-gray-100 text-gray-700'
                                 }`}>
                                   {value}
                                 </span>
                               ) :
                               field.key === 'severity' ? (
                                 <span className={`px-2 py-0.5 rounded-full text-xs ${
                                   value === 'High' || value === 'high' || value === 'Critical' ? 'bg-red-100 text-red-700' :
                                   value === 'Medium' || value === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                   'bg-blue-100 text-blue-700'
                                 }`}>
                                   {value}
                                 </span>
                               ) :
                               field.key === 'safetyScore' ? (
                                 <span className={`font-bold ${
                                   value >= 80 ? 'text-green-600' :
                                   value >= 60 ? 'text-yellow-600' :
                                   'text-red-600'
                                 }`}>
                                   {value}%
                                 </span>
                               ) :
                               field.key === 'poolBookingRequestedAt' ? (
                                 new Date(value).toLocaleDateString()
                               ) :
                               String(value)}
                            </span>
                          </div>
                        );
                      })}
                      
                      {/* View Details Button */}
                      <button 
                        onClick={() => {
                          closeModal();
                          // Navigate to appropriate tab with context
                          if (selectedModal === 'tenants') navigateTo('tenants');
                          else if (selectedModal === 'vehicles') navigateTo('vehicles');
                          else if (selectedModal === 'drivers') navigateTo('drivers');
                          else if (selectedModal === 'incidents') navigateTo('incidents');
                        }}
                        className="mt-3 w-full py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                      >
                        View Details <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Showing {data.length} {data.length === 1 ? 'item' : 'items'}
            </span>
            <button 
              onClick={closeModal}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // CALCULATE STATISTICS
  // ============================================
  const totalTenants = tenants.length;
  const totalVehicles = vehicles.length;
  const totalDrivers = drivers.length;
  const totalUsers = users.length;
  const totalIncidents = incidents.length;
  
  const activeIncidents = incidents.filter(i => 
    i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'resolved'
  ).length;
  
  const criticalIncidents = incidents.filter(i => 
    i.severity === 'High' || i.severity === 'high' || 
    i.severity === 'Critical' || i.severity === 'critical'
  ).length;
  
  const activeVehicles = vehicles.filter(v => 
    v.status === 'Active' || v.status === 'active'
  ).length;

  const pendingPoolRequests = poolRequests.filter(r => 
    r.poolBookingEnabled && !r.poolBookingApproved
  ).length;

  // Stats cards configuration with click handlers
  const stats = [
    { 
      label: 'Total Tenants', 
      value: totalTenants.toString(), 
      icon: Building2, 
      change: `${totalTenants > 0 ? '+' : ''}${totalTenants} total`,
      color: 'blue',
      tab: 'tenants',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      onClick: openTenantsModal,
      detail: `${totalTenants} tenants, ${totalUsers} users total`
    },
    { 
      label: 'Active Vehicles', 
      value: activeVehicles.toString(), 
      icon: Car, 
      change: `${totalVehicles} total vehicles`,
      color: 'green',
      tab: 'vehicles',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      onClick: openVehiclesModal,
      detail: `${activeVehicles} active out of ${totalVehicles}`
    },
    { 
      label: 'Total Drivers', 
      value: totalDrivers.toString(), 
      icon: UserCircle, 
      change: `${totalDrivers} registered`,
      color: 'purple',
      tab: 'drivers',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      onClick: openDriversModal,
      detail: `${totalDrivers} drivers in system`
    },
    { 
      label: 'Pool Requests', 
      value: pendingPoolRequests.toString(), 
      icon: CalendarIcon, 
      change: `${pendingPoolRequests} pending approval`,
      color: 'orange',
      tab: 'tenants',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      onClick: openPoolModal,
      detail: `${pendingPoolRequests} tenants waiting for approval`
    },
    { 
      label: 'Active Alerts', 
      value: activeIncidents.toString(), 
      icon: AlertCircle, 
      change: `${criticalIncidents} critical`,
      color: 'red',
      tab: 'incidents',
      bgColor: 'bg-red-50',
      textColor: 'text-red-600',
      onClick: openIncidentsModal,
      detail: `${criticalIncidents} critical alerts`
    },
  ];

  // ============================================
  // TENANT ACTIVITY OVERVIEW
  // ============================================
  const tenantActivity = tenants.length > 0 ? tenants.map(tenant => {
    const tenantVehicles = vehicles.filter(v => v.tenantId === tenant.id);
    const activeCount = tenantVehicles.filter(v => 
      v.status === 'Active' || v.status === 'active'
    ).length;
    const tenantDrivers = drivers.filter(d => d.tenantId === tenant.id);
    
    let growth = '0%';
    if (tenantVehicles.length > 5) growth = '+12%';
    else if (tenantVehicles.length > 3) growth = '+8%';
    else if (tenantVehicles.length > 1) growth = '+5%';
    
    return {
      id: tenant.id,
      name: tenant.name,
      subdomain: tenant.subdomain,
      vehicles: tenantVehicles.length,
      active: activeCount,
      drivers: tenantDrivers.length,
      growth: growth,
      status: tenant.status,
      poolBookingEnabled: tenant.poolBookingEnabled || false,
      poolBookingApproved: tenant.poolBookingApproved || false,
      poolBookingRequestedAt: tenant.poolBookingRequestedAt || null,
      poolBookingDeniedReason: tenant.poolBookingDeniedReason || null
    };
  }) : [];

  // ============================================
  // RENDER DENY MODAL
  // ============================================
  const renderDenyModal = () => {
    if (!showDenyModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDenyModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <button 
            onClick={() => setShowDenyModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="px-6 py-5 rounded-t-2xl bg-gradient-to-r from-red-600 to-red-700">
            <h2 className="text-2xl font-bold text-white">Deny Pool Booking</h2>
            <p className="text-red-100 text-sm">Please provide a reason for denying this request</p>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertTriangle size={16} /> {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Denial *</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                  rows="4"
                  placeholder="Explain why this pool booking request is being denied..."
                  value={denyReason}
                  onChange={(e) => setDenyReason(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button 
                  onClick={handleDenyPoolBooking}
                  disabled={processingRequest === selectedTenantId}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {processingRequest === selectedTenantId ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <>
                      <X size={16} /> Deny
                    </>
                  )}
                </button>
                <button 
                  onClick={() => setShowDenyModal(false)}
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
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading dashboard data...</p>
          <p className="text-sm text-gray-400 mt-1">Fetching tenants, vehicles, drivers & incidents</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <XCircle size={64} className="mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => loadData(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
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
      {/* Success/Error Messages */}
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, {currentUser?.name || 'Admin'}! Here's what's happening with your fleet.
          </p>
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
        </div>
      </div>

      {/* Stats Cards - CLICKABLE WITH MODALS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i} 
            onClick={stat.onClick}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-lg hover:border-blue-400 hover:scale-[1.02] transition-all duration-200 cursor-pointer group"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</p>
                <p className={`text-xs mt-1 flex items-center gap-1 ${
                  stat.change.includes('+') ? 'text-green-600' : 
                  stat.change.includes('-') ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {stat.change}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">{stat.detail}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor} ${stat.textColor} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye size={12} /> Click to view details
            </div>
          </div>
        ))}
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 w-fit">
        {['day', 'week', 'month', 'quarter', 'year'].map((period) => (
          <button 
            key={period} 
            onClick={() => setSelectedPeriod(period)} 
            className={`px-4 py-1.5 text-sm rounded-md capitalize transition-colors ${
              selectedPeriod === period 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {period}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tenant Activity with Pool Requests */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Building2 size={18} className="text-blue-600" />
              Tenant Activity & Pool Requests
            </h3>
            <button 
              onClick={() => navigateTo('tenants')}
              className="text-sm text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {tenantActivity.length > 0 ? (
              tenantActivity.slice(0, 6).map((tenant, i) => {
                const hasPoolRequest = tenant.poolBookingEnabled && !tenant.poolBookingApproved;
                return (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      hasPoolRequest ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{tenant.name}</p>
                        {tenant.status === 'active' && (
                          <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Active</span>
                        )}
                        {hasPoolRequest && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full animate-pulse flex items-center gap-1">
                            <Clock size={10} /> Pending Request
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {tenant.vehicles} vehicles · {tenant.active} active · {tenant.drivers} drivers
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${
                        tenant.growth.startsWith('+') ? 'text-green-600' : 
                        tenant.growth === '0%' ? 'text-gray-400' : 
                        'text-red-600'
                      }`}>
                        {tenant.growth}
                      </span>
                      {hasPoolRequest && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleApprovePoolBooking(tenant.id)}
                            disabled={processingRequest === tenant.id}
                            className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                            title="Approve Pool Booking"
                          >
                            {processingRequest === tenant.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            ) : (
                              <Check size={14} />
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTenantId(tenant.id);
                              setShowDenyModal(true);
                            }}
                            disabled={processingRequest === tenant.id}
                            className="p-1.5 bg-red-500 text-white rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                            title="Deny Pool Booking"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="font-medium">No tenants registered yet</p>
                <p className="text-sm">Create a tenant to get started with fleet management</p>
              </div>
            )}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Server size={18} className="text-blue-600" />
              System Health
            </h3>
            <span className="text-xs text-gray-400">Live</span>
          </div>
          <div className="space-y-3">
            {[
              { service: 'API Gateway', status: 'operational', latency: '12ms' },
              { service: 'GPS Ingestion', status: 'operational', latency: '45ms' },
              { service: 'ML Pipeline', status: 'degraded', latency: '230ms' },
              { service: 'Database Cluster', status: 'operational', latency: '8ms' },
              { service: 'Notification Service', status: 'operational', latency: '120ms' },
            ].map((service, i) => (
              <div key={i} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500 animate-pulse' : 
                    service.status === 'degraded' ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`} />
                  <span className="text-sm text-gray-700">{service.service}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    service.status === 'operational' ? 'bg-green-100 text-green-700' : 
                    service.status === 'degraded' ? 'bg-yellow-100 text-yellow-700' : 
                    'bg-red-100 text-red-700'
                  }`}>
                    {service.status}
                  </span>
                  <span className="text-xs text-gray-400">{service.latency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activities & Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Platform Summary
          </h3>
          <div className="space-y-2">
            {[
              { icon: '🏢', label: 'Total Tenants', value: totalTenants },
              { icon: '👤', label: 'Total Users', value: totalUsers },
              { icon: '🚗', label: 'Total Vehicles', value: totalVehicles },
              { icon: '👨‍✈️', label: 'Total Drivers', value: totalDrivers },
              { icon: '⚠️', label: 'Active Incidents', value: activeIncidents },
              { icon: '📅', label: 'Pool Booking Requests', value: pendingPoolRequests },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">
                  {item.icon} {item.label}
                </span>
                <span className="text-sm font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Growth */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold mb-4 text-gray-900 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-600" />
            Platform Growth
          </h3>
          <div className="h-32 flex items-end justify-between gap-1">
            {[
              { month: 'Jan', tenants: Math.max(0, totalTenants - 15) },
              { month: 'Feb', tenants: Math.max(0, totalTenants - 12) },
              { month: 'Mar', tenants: Math.max(0, totalTenants - 9) },
              { month: 'Apr', tenants: Math.max(0, totalTenants - 5) },
              { month: 'May', tenants: Math.max(0, totalTenants - 3) },
              { month: 'Jun', tenants: totalTenants },
            ].map((item, index) => {
              const maxValue = Math.max(...[
                Math.max(0, totalTenants - 15),
                Math.max(0, totalTenants - 12),
                Math.max(0, totalTenants - 9),
                Math.max(0, totalTenants - 5),
                Math.max(0, totalTenants - 3),
                totalTenants
              ], 1);
              const height = (item.tenants / maxValue) * 100;
              const isCurrent = index === 5;
              return (
                <div key={item.month} className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-full rounded-t ${isCurrent ? 'bg-blue-600' : 'bg-blue-400'} hover:bg-blue-500 transition-colors cursor-pointer`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                  >
                    <div className="text-[8px] text-white text-center pt-1 font-medium">{item.tenants}</div>
                  </div>
                  <span className={`text-[8px] mt-1 ${isCurrent ? 'text-blue-600 font-bold' : 'text-gray-400'}`}>
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs text-gray-500">
            <span>📊 <span className="font-medium text-gray-700">{totalTenants}</span> total tenants</span>
            <span>🚗 <span className="font-medium text-gray-700">{totalVehicles}</span> total vehicles</span>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {renderDetailModal()}

      {/* Deny Modal */}
      {renderDenyModal()}
    </div>
  );
};

// Add CreditCard icon if not already imported
const CreditCard = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

export default AdminDashboard;