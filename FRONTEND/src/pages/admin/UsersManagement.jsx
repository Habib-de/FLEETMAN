// src/pages/admin/UsersManagement.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Eye, Edit, 
  Trash2, CheckCircle, XCircle, Clock, Users,
  UserCircle, Mail, Phone, Shield, Award,
  MoreVertical, ChevronDown, AlertCircle, X,
  RefreshCw, Building2, Globe, Calendar,
  Activity, TrendingUp, TrendingDown, Key,
  Lock, Unlock, UserPlus, UserCheck, UserX,
  ChevronRight, Upload, Image, Camera
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService, tenantService } from '../../services/api';

// ============================================
// ICON HELPERS
// ============================================
const MailIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
  </svg>
);

const UsersManagement = ({ setActiveTab }) => {
  const { currentUser } = useAuth();
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tenantFilter, setTenantFilter] = useState('all');
  
  const [users, setUsers] = useState([]);
  const [tenants, setTenants] = useState([]);
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
  const [modalType, setModalType] = useState(null); // 'create', 'edit', 'view', 'delete'
  const [selectedUser, setSelectedUser] = useState(null);
  
  // ============================================
  // FORM STATE
  // ============================================
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'car_owner',
    tenantId: '',
    status: 'Active'
  });

  // ============================================
  // ✅ HELPER: GET USER AVATAR (like Drivers.jsx)
  // ============================================
  const getUserAvatar = (user) => {
    // If user has avatar data from backend
    if (user?.avatar) {
      // If it's already a full data URL
      if (user.avatar.startsWith('data:image')) {
        return user.avatar;
      }
      // If it's base64 without prefix
      if (user.avatar.length > 100 && !user.avatar.startsWith('http')) {
        return `data:image/jpeg;base64,${user.avatar}`;
      }
      // If it's a URL
      if (user.avatar.startsWith('http://') || user.avatar.startsWith('https://')) {
        return user.avatar;
      }
      return user.avatar;
    }
    
    // ✅ FALLBACK TO UI AVATARS API (same as Drivers.jsx)
    const name = user?.name || 'User';
    const bgColor = user?.role === 'super_admin' ? '8b5cf6' : 
                    user?.role === 'car_owner' ? '3b82f6' : 
                    '16a34a';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${bgColor}&color=fff&size=80`;
  };
  
  // ============================================
  // LOAD DATA FROM BACKEND
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading users data...');

      // Fetch users
      const usersResponse = await userService.getAll();
      let usersData = [];
      
      // Handle different response formats
      if (usersResponse?.data) {
        usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      } else if (Array.isArray(usersResponse)) {
        usersData = usersResponse;
      } else if (usersResponse?.success && usersResponse?.data) {
        usersData = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      }
      
      // ✅ LOG AVATAR DATA FOR DEBUGGING
      console.log('📸 Users loaded:', usersData.length);
      console.log('📸 Sample user avatar:', usersData[0]?.avatar ? 'Has avatar' : 'No avatar');
      
      setUsers(usersData);
      console.log(`✅ Loaded ${usersData.length} users`);

      // Fetch tenants for filtering
      const tenantsResponse = await tenantService.getAll();
      let tenantsData = [];
      if (tenantsResponse?.data) {
        tenantsData = Array.isArray(tenantsResponse.data) ? tenantsResponse.data : [];
      } else if (Array.isArray(tenantsResponse)) {
        tenantsData = tenantsResponse;
      }
      setTenants(tenantsData);
      console.log(`✅ Loaded ${tenantsData.length} tenants`);

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('❌ Failed to load users data:', error);
      setError(error.message || 'Failed to load users data. Please try again.');
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
      console.log('🔄 Auto-refreshing users...');
      loadData(false);
    }, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // ============================================
  // HELPERS
  // ============================================
  const getRoleColor = (role) => {
    const colors = {
      'super_admin': 'bg-purple-100 text-purple-700 border-purple-200',
      'car_owner': 'bg-blue-100 text-blue-700 border-blue-200',
      'driver': 'bg-green-100 text-green-700 border-green-200',
    };
    return colors[role?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getRoleIcon = (role) => {
    const icons = {
      'super_admin': Shield,
      'car_owner': Building2,
      'driver': UserCircle,
    };
    const Icon = icons[role?.toLowerCase()];
    return Icon ? <Icon size={14} /> : <UserCircle size={14} />;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'bg-green-100 text-green-700 border-green-200',
      'active': 'bg-green-100 text-green-700 border-green-200',
      'Inactive': 'bg-gray-100 text-gray-700 border-gray-200',
      'inactive': 'bg-gray-100 text-gray-700 border-gray-200',
      'Pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'Suspended': 'bg-red-100 text-red-700 border-red-200',
      'suspended': 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusIcon = (status) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active') return <CheckCircle size={14} className="text-green-600" />;
    if (s === 'inactive') return <XCircle size={14} className="text-gray-600" />;
    if (s === 'pending') return <Clock size={14} className="text-yellow-600" />;
    if (s === 'suspended') return <AlertCircle size={14} className="text-red-600" />;
    return <Activity size={14} className="text-gray-500" />;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  const getTenantName = (tenantId) => {
    const tenant = tenants.find(t => t.id === tenantId);
    return tenant?.name || tenantId || 'N/A';
  };

  // ============================================
  // FILTERED USERS
  // ============================================
  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (user.id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || (user.role || '').toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus = statusFilter === 'all' || (user.status || '').toLowerCase() === statusFilter.toLowerCase();
    const matchesTenant = tenantFilter === 'all' || user.tenantId === tenantFilter;
    return matchesSearch && matchesRole && matchesStatus && matchesTenant;
  });

  // ============================================
  // STATS
  // ============================================
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status?.toLowerCase() === 'active').length;
  const totalSuperAdmins = users.filter(u => u.role?.toLowerCase() === 'super_admin').length;
  const totalCarOwners = users.filter(u => u.role?.toLowerCase() === 'car_owner').length;
  const totalDrivers = users.filter(u => u.role?.toLowerCase() === 'driver').length;

  // ============================================
  // MODAL HANDLERS
  // ============================================
  const openCreateModal = () => {
    setModalType('create');
    setSelectedUser(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'car_owner',
      tenantId: tenants.length > 0 ? tenants[0].id : '',
      status: 'Active'
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
  // ✅ Status mapping: database value -> UI display value
  const statusMap = {
    'active': 'Active',
    'pending': 'Pending',
    'inactive': 'Inactive',
    'suspended': 'Suspended'
  };
  
  // Get the correct UI status
  const uiStatus = statusMap[user.status?.toLowerCase()] || 'Active';
  
  setModalType('edit');
  setSelectedUser(user);
  setFormData({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    password: '',
    role: user.role || 'car_owner',
    tenantId: user.tenantId || (tenants.length > 0 ? tenants[0].id : ''),
    status: uiStatus  // ✅ This will now show "Pending" for pending users
  });
  setShowModal(true);
};

  const openViewModal = (user) => {
    setModalType('view');
    setSelectedUser(user);
    setShowModal(true);
  };

  const openDeleteModal = (user) => {
    setModalType('delete');
    setSelectedUser(user);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalData(null);
    setSelectedUser(null);
    setModalType(null);
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const handleCreateUser = async () => {
    try {
      setErrorMessage('');
      const userData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        passwordHash: formData.password,
        role: formData.role,
        tenantId: formData.tenantId,
        status: formData.status
      };
      
      const response = await userService.create(userData);
      if (response?.success) {
        setSuccessMessage('✅ User created successfully!');
        closeModal();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to create user:', error);
      setErrorMessage(error.message || 'Failed to create user. Please try again.');
    }
  };

  const handleUpdateUser = async () => {
    try {
      setErrorMessage('');
      const userData = {
        name: formData.name,
        phone: formData.phone,
        role: formData.role,
        status: formData.status
      };
      
      const response = await userService.update(selectedUser.id, userData);
      if (response?.success) {
        setSuccessMessage('✅ User updated successfully!');
        closeModal();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      setErrorMessage(error.message || 'Failed to update user. Please try again.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      setErrorMessage('');
      const response = await userService.delete(selectedUser.id);
      if (response?.success) {
        setSuccessMessage('✅ User deleted successfully!');
        closeModal();
        await loadData(false);
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      setErrorMessage(error.message || 'Failed to delete user. Please try again.');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const newPassword = prompt('Enter new password for the user:');
      if (!newPassword || newPassword.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
      }
      
      const response = await userService.changePassword(userId, newPassword);
      if (response?.success) {
        setSuccessMessage('✅ Password reset successfully!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Failed to reset password:', error);
      setErrorMessage(error.message || 'Failed to reset password. Please try again.');
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // ============================================
  // STATS CARDS
  // ============================================
  const stats = [
    { 
      label: 'Total Users', 
      value: totalUsers.toString(), 
      icon: Users, 
      change: `${activeUsers} active`,
      color: 'blue',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    { 
      label: 'Super Admins', 
      value: totalSuperAdmins.toString(), 
      icon: Shield, 
      change: 'Platform administrators',
      color: 'purple',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    { 
      label: 'Car Owners', 
      value: totalCarOwners.toString(), 
      icon: Building2, 
      change: 'Tenant managers',
      color: 'orange',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    },
    { 
      label: 'Drivers', 
      value: totalDrivers.toString(), 
      icon: UserCircle, 
      change: 'Fleet drivers',
      color: 'green',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
  ];

  // ============================================
  // RENDER MODAL
  // ============================================
  const renderModal = () => {
    if (!showModal) return null;

    if (modalType === 'view' && selectedUser) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <X size={24} className="text-gray-500 hover:text-gray-700" />
            </button>

            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-4">
                {/* ✅ AVATAR IN VIEW MODAL */}
                <img 
                  src={getUserAvatar(selectedUser)} 
                  alt={selectedUser.name || 'User'} 
                  className="w-16 h-16 rounded-full border-2 border-white shadow-lg object-cover"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.name || 'User')}&background=3b82f6&color=fff&size=80`;
                  }}
                />
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedUser.name}</h2>
                  <p className="text-blue-100 text-sm">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Role</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    {getRoleIcon(selectedUser.role)}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="font-medium flex items-center gap-2 mt-1">
                    {getStatusIcon(selectedUser.status)}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Tenant</p>
                  <p className="font-medium">{getTenantName(selectedUser.tenantId)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">User ID</p>
                  <p className="font-mono text-sm">{selectedUser.id}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="font-medium">{selectedUser.phone || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Last Login</p>
                  <p className="font-medium">{formatDate(selectedUser.lastLogin)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Created At</p>
                <p className="font-medium">{formatDate(selectedUser.createdAt)}</p>
              </div>

              {selectedUser.driverId && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs text-green-600">Driver ID</p>
                  <p className="font-mono text-sm text-green-700">{selectedUser.driverId}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button 
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    closeModal();
                    openEditModal(selectedUser);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Edit size={16} /> Edit User
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (modalType === 'delete' && selectedUser) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="absolute inset-0" onClick={closeModal}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <button 
              onClick={closeModal}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <X size={24} className="text-gray-500 hover:text-gray-700" />
            </button>

            <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Trash2 size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Delete User</h2>
                  <p className="text-red-100 text-sm">This action cannot be undone</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {errorMessage && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> {errorMessage}
                </div>
              )}

              <p className="text-gray-700">
                Are you sure you want to delete user <strong>{selectedUser.name}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">Email: {selectedUser.email}</p>

              <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
                <button 
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteUser}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Create/Edit Modal
    const isEdit = modalType === 'edit';
    const isCreate = modalType === 'create';
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={closeModal}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <button 
            onClick={closeModal}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl bg-gradient-to-r ${isEdit ? 'from-blue-600 to-blue-700' : 'from-green-600 to-green-700'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                {isEdit ? <Edit size={24} className="text-white" /> : <UserPlus size={24} className="text-white" />}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{isEdit ? 'Edit User' : 'Create User'}</h2>
                <p className="text-white/80 text-sm">{isEdit ? `Editing ${selectedUser?.name}` : 'Add a new user to the system'}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {errorMessage}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="john@example.com"
                    disabled={isEdit}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+254 700 000 000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isEdit ? 'New Password (optional)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'}
                    required={isCreate}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="car_owner">Car Owner</option>
                    <option value="driver">Driver</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant *
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.tenantId}
                    onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                  >
                    {tenants.length === 0 ? (
                      <option value="">No tenants available</option>
                    ) : (
                      tenants.map(tenant => (
                        <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                      ))
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Pending">Pending</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-gray-200">
                <button 
                  onClick={closeModal}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={isEdit ? handleUpdateUser : handleCreateUser}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    isEdit 
                      ? 'bg-blue-600 text-white hover:bg-blue-700' 
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isEdit ? <Edit size={16} /> : <UserPlus size={16} />}
                  {isEdit ? 'Update User' : 'Create User'}
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading users...</p>
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
      {/* Success/Error Messages */}
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
              <Users size={24} className="text-blue-600" />
              User Management
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Manage all platform users · 
              <span className="font-medium text-gray-700 ml-1">{totalUsers} users</span>
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
            <button 
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add User
            </button>
            <button className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-2">
              <Download size={16} /> Export
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div 
            key={i}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
                <p className="text-2xl font-bold mt-1 text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor} ${stat.textColor}`}>
                <stat.icon size={24} />
              </div>
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
                placeholder="Search users..." 
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
              {(roleFilter !== 'all' || statusFilter !== 'all' || tenantFilter !== 'all') && (
                <span className="ml-1 w-2 h-2 bg-blue-600 rounded-full"></span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Showing {filteredUsers.length} users</span>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="car_owner">Car Owner</option>
                <option value="driver">Driver</option>
              </select>
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500"
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
              >
                <option value="all">All Tenants</option>
                {tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                ))}
              </select>
            </div>
            {(roleFilter !== 'all' || statusFilter !== 'all' || tenantFilter !== 'all') && (
              <button 
                onClick={() => {
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setTenantFilter('all');
                }}
                className="mt-3 text-sm text-red-600 hover:text-red-800"
              >
                Clear All Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredUsers.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3 hidden md:table-cell">Email</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 hidden lg:table-cell">Tenant</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 hidden xl:table-cell">Last Login</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* ✅ AVATAR WITH FALLBACK - LIKE DRIVERS.JSX */}
                          <img 
                            src={getUserAvatar(user)} 
                            alt={user.name || 'User'} 
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            onError={(e) => {
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3b82f6&color=fff&size=80`;
                            }}
                          />
                          <div>
                            <p className="font-medium text-sm">{user.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{user.id?.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm hidden md:table-cell">
                        <div className="flex items-center gap-1">
                          <MailIcon size={14} className="text-gray-400" />
                          <span className="truncate max-w-[150px]">{user.email}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          {user.role}
                        </span>
                      </td>
                      <td className="p-3 text-sm hidden lg:table-cell">
                        {getTenantName(user.tenantId)}
                      </td>
                      <td className="p-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${getStatusColor(user.status)}`}>
                          {getStatusIcon(user.status)}
                          {user.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-3 text-sm hidden xl:table-cell">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button 
                            className="p-1 hover:bg-gray-200 rounded text-blue-600" 
                            title="View Details"
                            onClick={() => openViewModal(user)}
                          >
                            <Eye size={14} />
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-200 rounded text-green-600" 
                            title="Edit"
                            onClick={() => openEditModal(user)}
                          >
                            <Edit size={14} />
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-200 rounded text-purple-600" 
                            title="Reset Password"
                            onClick={() => handleResetPassword(user.id)}
                          >
                            <Key size={14} />
                          </button>
                          <button 
                            className="p-1 hover:bg-gray-200 rounded text-red-600" 
                            title="Delete"
                            onClick={() => openDeleteModal(user)}
                          >
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
                Total: <span className="font-semibold">{filteredUsers.length}</span> users · 
                <span className="ml-2">{activeUsers} active</span>
              </p>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>Rows per page: 10</span>
                <span>1-{filteredUsers.length} of {filteredUsers.length}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Users size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No users found</p>
            <p className="text-sm">Create a user to get started</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {renderModal()}
    </div>
  );
};

export default UsersManagement;