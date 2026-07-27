// src/pages/admin/Tenants.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Eye, Edit, 
  Trash2, CheckCircle, XCircle, Clock, Users,
  Truck, CreditCard, MoreVertical, ChevronDown,
  AlertCircle, X, RefreshCw, Building2, Globe,
  UserCircle, Calendar, Activity, TrendingUp, TrendingDown,
  Shield, Award, MapPin, Settings, Layers, List,
  ChevronRight, Fuel, Wrench, AlertTriangle
} from 'lucide-react';
import { 
  tenantService, 
  vehicleService, 
  driverService, 
  userService 
} from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ============================================
// ICON HELPERS
// ============================================
const CreditCardIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

const Tenants = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenants, setTenants] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // ============================================
  // MODAL STATES
  // ============================================
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [selectedTenantForModal, setSelectedTenantForModal] = useState(null);
  const [modalType, setModalType] = useState(null); // 'vehicles', 'drivers', 'users'

  // ============================================
  // LOAD DATA FROM BACKEND
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading tenants data...');

      const tenantsResponse = await tenantService.getAll();
      const tenantsData = tenantsResponse.data || [];
      setTenants(tenantsData);

      let allVehicles = [];
      let allDrivers = [];
      let allUsers = [];

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

        const userPromises = tenantsData.map(tenant => 
          userService.getByTenant(tenant.id)
            .then(response => response.data || [])
            .catch(() => [])
        );

        const [vehicleResults, driverResults, userResults] = await Promise.all([
          Promise.all(vehiclePromises),
          Promise.all(driverPromises),
          Promise.all(userPromises)
        ]);

        allVehicles = vehicleResults.flat();
        allDrivers = driverResults.flat();
        allUsers = userResults.flat();
      }

      setVehicles(allVehicles);
      setDrivers(allDrivers);
      setUsers(allUsers);
      setLastUpdated(new Date().toLocaleTimeString());

      console.log(`✅ Tenants loaded: ${tenantsData.length} tenants, ${allVehicles.length} vehicles, ${allDrivers.length} drivers`);

    } catch (error) {
      console.error('❌ Failed to load tenants data:', error);
      setError(error.message || 'Failed to load tenants data. Please try again.');
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
      console.log('🔄 Auto-refreshing tenants...');
      loadData(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // ============================================
  // HELPERS
  // ============================================
  const getTenantVehicles = (tenantId) => {
    return vehicles.filter(v => 
      v.tenantId === tenantId || 
      v.costCentre === tenantId
    );
  };

  const getTenantDrivers = (tenantId) => {
    return drivers.filter(d => d.tenantId === tenantId);
  };

  const getTenantUsers = (tenantId) => {
    return users.filter(u => u.tenantId === tenantId);
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-700 border-green-200',
      'active': 'bg-green-100 text-green-700 border-green-200',
      'Trial': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'trial': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Past Due': 'bg-red-100 text-red-700 border-red-200',
      'past_due': 'bg-red-100 text-red-700 border-red-200',
      'Inactive': 'bg-gray-100 text-gray-700 border-gray-200',
      'inactive': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active') return <CheckCircle size={14} className="text-green-600" />;
    if (s === 'trial') return <Clock size={14} className="text-yellow-600" />;
    if (s === 'past_due' || s === 'past due') return <AlertCircle size={14} className="text-red-600" />;
    if (s === 'inactive') return <XCircle size={14} className="text-gray-600" />;
    return <Activity size={14} className="text-gray-500" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return 'N/A';
    }
  };

  const getTenantStatusBadge = (tenant) => {
    const status = tenant.status || 'Active';
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(status)}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  // ============================================
  // OPEN MODALS
  // ============================================
  const openDetailModal = (tenant, type) => {
    setSelectedTenantForModal(tenant);
    setModalType(type);
    
    let title = '';
    let icon = null;
    let data = [];
    let fields = [];
    let bgColor = '';
    
    if (type === 'vehicles') {
      title = `Vehicles - ${tenant.name}`;
      icon = Truck;
      data = getTenantVehicles(tenant.id);
      bgColor = 'from-blue-600 to-blue-700';
      fields = [
        { key: 'registration', label: 'Registration', icon: Truck },
        { key: 'make', label: 'Make', icon: Settings },
        { key: 'model', label: 'Model', icon: Layers },
        { key: 'status', label: 'Status', icon: CheckCircle },
        { key: 'mileage', label: 'Mileage', icon: Activity },
        { key: 'fuelType', label: 'Fuel', icon: Fuel },
      ];
    } else if (type === 'drivers') {
      title = `Drivers - ${tenant.name}`;
      icon = Users;
      data = getTenantDrivers(tenant.id);
      bgColor = 'from-purple-600 to-purple-700';
      fields = [
        { key: 'name', label: 'Name', icon: UserCircle },
        { key: 'licenseNumber', label: 'License', icon: Award },
        { key: 'status', label: 'Status', icon: CheckCircle },
        { key: 'safetyScore', label: 'Safety Score', icon: Shield },
        { key: 'phone', label: 'Phone', icon: Phone },
        { key: 'email', label: 'Email', icon: Mail },
      ];
    } else if (type === 'users') {
      title = `Users - ${tenant.name}`;
      icon = UserCircle;
      data = getTenantUsers(tenant.id);
      bgColor = 'from-green-600 to-green-700';
      fields = [
        { key: 'name', label: 'Name', icon: UserCircle },
        { key: 'email', label: 'Email', icon: Mail },
        { key: 'role', label: 'Role', icon: Shield },
        { key: 'status', label: 'Status', icon: CheckCircle },
      ];
    }
    
    setModalData({
      title,
      icon,
      data,
      fields,
      bgColor,
      tenant: tenant
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData(null);
    setSelectedTenantForModal(null);
    setModalType(null);
  };

  // ============================================
  // RENDER DETAIL MODAL
  // ============================================
  const renderDetailModal = () => {
    if (!showModal || !modalData) return null;

    const { title, icon: Icon, data, fields, bgColor, tenant } = modalData;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={closeModal}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className={`px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r ${bgColor} rounded-t-2xl`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Icon size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{title}</h2>
                <p className="text-white/80 text-sm">{data.length} items</p>
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
                <p className="text-gray-400 text-sm">This tenant has no {modalType} yet</p>
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
                               field.key === 'safetyScore' ? (
                                 <span className={`font-bold ${
                                   value >= 80 ? 'text-green-600' :
                                   value >= 60 ? 'text-yellow-600' :
                                   'text-red-600'
                                 }`}>
                                   {value}%
                                 </span>
                               ) :
                               field.key === 'mileage' ? (
                                 <span>{value} km</span>
                               ) :
                               String(value)}
                            </span>
                          </div>
                        );
                      })}
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
            <div className="flex gap-2">
              <button 
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  closeModal();
                  if (setActiveTab) {
                    setActiveTab(modalType === 'vehicles' ? 'vehicles' : 
                                 modalType === 'drivers' ? 'drivers' : 
                                 'users');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // ENRICH TENANTS
  // ============================================
  const enrichedTenants = tenants.map(tenant => {
    const tenantVehicles = getTenantVehicles(tenant.id);
    const tenantDrivers = getTenantDrivers(tenant.id);
    const tenantUsers = getTenantUsers(tenant.id);
    
    return {
      ...tenant,
      vehicles: tenantVehicles.length,
      drivers: tenantDrivers.length,
      users: tenantUsers.length,
      vehiclesList: tenantVehicles,
      driversList: tenantDrivers,
      usersList: tenantUsers,
      status: tenant.status || 'Active',
      joined: tenant.createdAt ? formatDate(tenant.createdAt) : 'N/A',
      lastActive: tenant.updatedAt ? new Date(tenant.updatedAt).toLocaleString() : 'N/A'
    };
  });

  const filteredTenants = enrichedTenants.filter(tenant => {
    const matchesSearch = (tenant.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (tenant.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (tenant.subdomain || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || (tenant.status || '').toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // ============================================
  // STATS
  // ============================================
  const totalTenants = enrichedTenants.length;
  const totalVehicles = enrichedTenants.reduce((sum, t) => sum + (t.vehicles || 0), 0);
  const totalDrivers = enrichedTenants.reduce((sum, t) => sum + (t.drivers || 0), 0);
  const totalUsers = enrichedTenants.reduce((sum, t) => sum + (t.users || 0), 0);
  const activeTenants = enrichedTenants.filter(t => t.status?.toLowerCase() === 'active').length;

  // ============================================
  // STATS CARDS (Clickable)
  // ============================================
  const stats = [
    { 
      label: 'Total Tenants', 
      value: totalTenants.toString(), 
      icon: Building2, 
      change: `${activeTenants} active`,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      onClick: () => {
        // Show all tenants in modal
        setModalData({
          title: 'All Tenants',
          icon: Building2,
          data: enrichedTenants,
          bgColor: 'from-blue-600 to-blue-700',
          fields: [
            { key: 'name', label: 'Name', icon: Building2 },
            { key: 'subdomain', label: 'Subdomain', icon: Globe },
            { key: 'status', label: 'Status', icon: CheckCircle },
            { key: 'vehicles', label: 'Vehicles', icon: Truck },
            { key: 'drivers', label: 'Drivers', icon: Users },
            { key: 'users', label: 'Users', icon: UserCircle },
          ]
        });
        setShowModal(true);
      }
    },
    { 
      label: 'Total Vehicles', 
      value: totalVehicles.toString(), 
      icon: Truck, 
      change: `Across ${totalTenants} tenants`,
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      onClick: () => {
        // Show all vehicles across tenants
        const allVehiclesData = enrichedTenants.flatMap(t => 
          t.vehiclesList.map(v => ({ ...v, tenantName: t.name }))
        );
        setModalData({
          title: 'All Vehicles',
          icon: Truck,
          data: allVehiclesData,
          bgColor: 'from-green-600 to-green-700',
          fields: [
            { key: 'tenantName', label: 'Tenant', icon: Building2 },
            { key: 'registration', label: 'Registration', icon: Truck },
            { key: 'make', label: 'Make', icon: Settings },
            { key: 'model', label: 'Model', icon: Layers },
            { key: 'status', label: 'Status', icon: CheckCircle },
          ]
        });
        setShowModal(true);
      }
    },
    { 
      label: 'Total Drivers', 
      value: totalDrivers.toString(), 
      icon: Users, 
      change: `Across ${totalTenants} tenants`,
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600',
      onClick: () => {
        const allDriversData = enrichedTenants.flatMap(t => 
          t.driversList.map(d => ({ ...d, tenantName: t.name }))
        );
        setModalData({
          title: 'All Drivers',
          icon: Users,
          data: allDriversData,
          bgColor: 'from-purple-600 to-purple-700',
          fields: [
            { key: 'tenantName', label: 'Tenant', icon: Building2 },
            { key: 'name', label: 'Name', icon: UserCircle },
            { key: 'licenseNumber', label: 'License', icon: Award },
            { key: 'status', label: 'Status', icon: CheckCircle },
            { key: 'safetyScore', label: 'Score', icon: Shield },
          ]
        });
        setShowModal(true);
      }
    },
    { 
      label: 'Total Users', 
      value: totalUsers.toString(), 
      icon: UserCircle, 
      change: `Across ${totalTenants} tenants`,
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600',
      onClick: () => {
        const allUsersData = enrichedTenants.flatMap(t => 
          t.usersList.map(u => ({ ...u, tenantName: t.name }))
        );
        setModalData({
          title: 'All Users',
          icon: UserCircle,
          data: allUsersData,
          bgColor: 'from-orange-600 to-orange-700',
          fields: [
            { key: 'tenantName', label: 'Tenant', icon: Building2 },
            { key: 'name', label: 'Name', icon: UserCircle },
            { key: 'email', label: 'Email', icon: Mail },
            { key: 'role', label: 'Role', icon: Shield },
            { key: 'status', label: 'Status', icon: CheckCircle },
          ]
        });
        setShowModal(true);
      }
    },
  ];

  // ============================================
  // RENDER
  // ============================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading tenants...</p>
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

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Building2 size={24} className="text-blue-600" />
              Tenant Management
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage all tenants on the platform · 
              <span className="font-medium text-gray-700 ml-1">{totalTenants} tenants</span>
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
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Plus size={16} /> Add Tenant
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2">
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards - CLICKABLE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i}
            onClick={stat.onClick}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 cursor-pointer hover:shadow-lg hover:border-blue-400 hover:scale-[1.02] transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.change}</p>
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

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search tenants..." 
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Showing {filteredTenants.length} tenants</span>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Trial">Trial</option>
                <option value="Past Due">Past Due</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                <option value="all">All Plans</option>
                <option value="Basic">Basic</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>
              <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
                <option value="all">Payment Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredTenants.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="p-3">Tenant</th>
                    <th className="p-3 hidden md:table-cell">ID</th>
                    <th className="p-3">Vehicles</th>
                    <th className="p-3 hidden lg:table-cell">Drivers</th>
                    <th className="p-3 hidden xl:table-cell">Users</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 hidden sm:table-cell">Joined</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm">{tenant.name || tenant.id}</p>
                          <p className="text-xs text-gray-500">Subdomain: {tenant.subdomain || 'N/A'}</p>
                        </div>
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell">
                        <span className="text-xs font-mono text-gray-500">{tenant.id?.substring(0, 12)}...</span>
                      </td>
                      {/* Vehicles Column - Clickable */}
                      <td className="p-3 text-sm">
                        <button 
                          onClick={() => openDetailModal(tenant, 'vehicles')}
                          className="flex items-center gap-2 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors group"
                        >
                          <Truck size={14} className="text-blue-500" />
                          <span className="font-medium">{tenant.vehicles || 0}</span>
                          <Eye size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      {/* Drivers Column - Clickable */}
                      <td className="p-3 text-sm hidden lg:table-cell">
                        <button 
                          onClick={() => openDetailModal(tenant, 'drivers')}
                          className="flex items-center gap-2 hover:bg-purple-50 px-2 py-1 rounded-lg transition-colors group"
                        >
                          <Users size={14} className="text-purple-500" />
                          <span className="font-medium">{tenant.drivers || 0}</span>
                          <Eye size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      {/* Users Column - Clickable */}
                      <td className="p-3 text-sm hidden xl:table-cell">
                        <button 
                          onClick={() => openDetailModal(tenant, 'users')}
                          className="flex items-center gap-2 hover:bg-green-50 px-2 py-1 rounded-lg transition-colors group"
                        >
                          <UserCircle size={14} className="text-green-500" />
                          <span className="font-medium">{tenant.users || 0}</span>
                          <Eye size={12} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </td>
                      <td className="p-3">
                        {getTenantStatusBadge(tenant)}
                      </td>
                      <td className="p-3 text-sm hidden sm:table-cell">{tenant.joined || 'N/A'}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button 
                            className="p-1 hover:bg-gray-200 rounded text-blue-600" 
                            title="View Details"
                            onClick={() => {
                              setModalData({
                                title: `Tenant Details - ${tenant.name}`,
                                icon: Building2,
                                data: [tenant],
                                bgColor: 'from-blue-600 to-blue-700',
                                fields: [
                                  { key: 'name', label: 'Name', icon: Building2 },
                                  { key: 'subdomain', label: 'Subdomain', icon: Globe },
                                  { key: 'status', label: 'Status', icon: CheckCircle },
                                  { key: 'vehicles', label: 'Vehicles', icon: Truck },
                                  { key: 'drivers', label: 'Drivers', icon: Users },
                                  { key: 'users', label: 'Users', icon: UserCircle },
                                  { key: 'joined', label: 'Joined', icon: Calendar },
                                  { key: 'lastActive', label: 'Last Active', icon: Clock },
                                ]
                              });
                              setShowModal(true);
                            }}
                          >
                            <Eye size={14} />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded text-green-600" title="Edit">
                            <Edit size={14} />
                          </button>
                          <button className="p-1 hover:bg-gray-200 rounded text-red-600" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-gray-600">
                Total: <span className="font-semibold">{filteredTenants.length}</span> tenants · 
                <span className="ml-2">{totalVehicles} vehicles · {totalDrivers} drivers · {totalUsers} users</span>
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Rows per page: 10</span>
                <span>1-{filteredTenants.length} of {filteredTenants.length}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No tenants found</p>
            <p className="text-sm">Create a tenant to get started</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

// ============================================
// MAIL AND PHONE ICONS (for modal fields)
// ============================================
const Mail = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
  </svg>
);

const Phone = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
  </svg>
);

export default Tenants;