// src/pages/car-owner/Merchants.jsx
import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Download, Edit, Trash2, Eye, X,
  CheckCircle, AlertCircle,
  Save, BarChart3, Clock, Award, RefreshCw,
  Star, Phone, Mail, MapPin, TrendingUp, TrendingDown,
  Shield, Truck, Wrench, Fuel, Users, Building,
  Calendar, DollarSign, Link, ExternalLink, Package, Circle, Zap 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { merchantService, maintenanceService } from '../../services/api';

const Merchants = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('list');
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [merchants, setMerchants] = useState([]);
  const [maintenanceJobs, setMaintenanceJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [showJobHistory, setShowJobHistory] = useState(false);
  const [merchantJobs, setMerchantJobs] = useState([]);

  // ============================================
  // FORM DATA - Matches Database Schema
  // ============================================
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    contact: '',
    email: '',
    phone: '',
    address: '',
    sla: '',
    tat_avg: '',
    repeat_rate: '',
    status: 'pending',
    rating: 0,
    services: [],
    notes: '',
    website: '',
    yearsInBusiness: '',
    insurance: '',
    licenseNumber: ''
  });

  // ============================================
  // MERCHANT TYPES
  // ============================================
  const merchantTypes = [
    'Workshop',
    'Parts Supplier',
    'Fuel Station',
    'Towing Service',
    'Tire Center',
    'Battery Center',
    'Auto Electrician',
    'Panel Beater',
    'Car Wash',
    'Mechanic',
    'General Repairs',
    'Body Repair',
    'Recovery',
    'Specialist',
    'Diagnostic Center',
    'Transmission Specialist',
    'Air Conditioning Specialist',
    'Diesel Specialist'
  ];

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view merchants');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      const [merchantsRes, maintenanceRes] = await Promise.all([
        merchantService.getAll(tenant).catch(() => ({ data: [] })),
        maintenanceService.getAll(tenant).catch(() => ({ data: [] }))
      ]);

      const merchantsData = merchantsRes?.data || [];
      const maintenanceData = maintenanceRes?.data || [];
      
      // Enhance merchants with job counts
      const enhancedMerchants = merchantsData.map(m => {
        const jobs = maintenanceData.filter(j => j.mechanic === m.name || j.merchantId === m.id);
        return {
          ...m,
          jobsCompleted: jobs.filter(j => j.status === 'closed' || j.status === 'completed').length,
          totalJobs: jobs.length,
          activeJobs: jobs.filter(j => j.status !== 'closed' && j.status !== 'completed').length,
          totalCost: jobs.reduce((sum, j) => sum + (parseFloat(j.cost) || 0), 0),
          avgJobCost: jobs.length > 0 ? jobs.reduce((sum, j) => sum + (parseFloat(j.cost) || 0), 0) / jobs.length : 0
        };
      });

      setMerchants(enhancedMerchants);
      setMaintenanceJobs(maintenanceData);
      
      console.log('✅ Loaded merchants:', enhancedMerchants.length);
      console.log('✅ Loaded maintenance jobs:', maintenanceData.length);

    } catch (error) {
      console.error('Error loading merchants:', error);
      setErrorMessage('Failed to load merchants. Please try again.');
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
  // STATISTICS - ENHANCED
  // ============================================
  const stats = {
    total: merchants.length,
    pending: merchants.filter(m => m.status === 'pending').length,
    approved: merchants.filter(m => m.status === 'approved').length,
    rejected: merchants.filter(m => m.status === 'rejected').length,
    avgRating: merchants.length > 0 
      ? (merchants.reduce((sum, m) => sum + (parseFloat(m.rating) || 0), 0) / merchants.length).toFixed(1) 
      : 0,
    avgTAT: merchants.length > 0 
      ? merchants.reduce((sum, m) => sum + (parseFloat(m.tatAvg) || 0), 0) / merchants.length 
      : 0,
    totalTypes: [...new Set(merchants.map(m => m.type))].length,
    totalJobs: merchants.reduce((sum, m) => sum + (m.totalJobs || 0), 0),
    topPerformer: merchants.length > 0 
      ? merchants.reduce((a, b) => (parseFloat(a.rating) || 0) > (parseFloat(b.rating) || 0) ? a : b)
      : null,
    totalCost: merchants.reduce((sum, m) => sum + (m.totalCost || 0), 0)
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'approved': 'bg-green-100 text-green-700 border-green-200',
      'rejected': 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'pending': '⏳ Pending',
      'approved': '✅ Approved',
      'rejected': '❌ Rejected'
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircle size={14} className="text-green-600" />;
      case 'pending': return <Clock size={14} className="text-yellow-600" />;
      case 'rejected': return <AlertCircle size={14} className="text-red-600" />;
      default: return null;
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      'Workshop': <Wrench size={14} className="text-blue-500" />,
      'Parts Supplier': <Package size={14} className="text-orange-500" />,
      'Fuel Station': <Fuel size={14} className="text-yellow-500" />,
      'Towing Service': <Truck size={14} className="text-red-500" />,
      'Tire Center': <Circle size={14} className="text-purple-500" />,
      'Mechanic': <Wrench size={14} className="text-green-500" />,
      'Auto Electrician': <Zap size={14} className="text-yellow-500" />,
      'Panel Beater': <Shield size={14} className="text-blue-500" />,
      'General Repairs': <Wrench size={14} className="text-gray-500" />
    };
    return icons[type] || <Building size={14} className="text-gray-500" />;
  };

  const getRatingStars = (rating) => {
    const numRating = parseFloat(rating) || 0;
    const fullStars = Math.floor(numRating);
    const hasHalfStar = numRating - fullStars >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '⭐';
    if (hasHalfStar) stars += '⭐';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    return stars;
  };

  // ============================================
  // FILTER MERCHANTS
  // ============================================
  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch = (merchant.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (merchant.type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (merchant.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (merchant.contact || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || merchant.status === statusFilter;
    const matchesType = typeFilter === 'all' || merchant.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      contact: '',
      email: '',
      phone: '',
      address: '',
      sla: '',
      tat_avg: '',
      repeat_rate: '',
      status: 'pending',
      rating: 0,
      services: [],
      notes: '',
      website: '',
      yearsInBusiness: '',
      insurance: '',
      licenseNumber: ''
    });
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAddMerchant = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.name.trim() || !formData.type) {
      setErrorMessage('Name and type are required');
      setIsLoading(false);
      return;
    }

    try {
      const merchantData = {
        tenant: { id: tenantId },
        name: formData.name.trim(),
        type: formData.type,
        contact: formData.contact || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        sla: formData.sla || '',
        tatAvg: parseFloat(formData.tat_avg) || 0,
        repeatRate: parseFloat(formData.repeat_rate) || 0,
        status: formData.status || 'pending',
        rating: parseFloat(formData.rating) || 0,
        services: JSON.stringify(formData.services || []),
        notes: formData.notes || '',
        website: formData.website || '',
        yearsInBusiness: formData.yearsInBusiness || '',
        insurance: formData.insurance || '',
        licenseNumber: formData.licenseNumber || ''
      };

      const response = await merchantService.create(merchantData);
      
      if (response?.success) {
        setSuccessMessage(`✅ Merchant "${formData.name}" added successfully!`);
        setShowAddModal(false);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to add merchant. Please try again.');
      }
    } catch (error) {
      console.error('Error adding merchant:', error);
      setErrorMessage('Failed to add merchant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditMerchant = async () => {
    if (!selectedMerchant) return;

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const merchantData = {
        name: formData.name.trim(),
        type: formData.type,
        contact: formData.contact || '',
        email: formData.email || '',
        phone: formData.phone || '',
        address: formData.address || '',
        sla: formData.sla || '',
        tatAvg: parseFloat(formData.tat_avg) || 0,
        repeatRate: parseFloat(formData.repeat_rate) || 0,
        status: formData.status || 'pending',
        rating: parseFloat(formData.rating) || 0,
        services: JSON.stringify(formData.services || []),
        notes: formData.notes || '',
        website: formData.website || '',
        yearsInBusiness: formData.yearsInBusiness || '',
        insurance: formData.insurance || '',
        licenseNumber: formData.licenseNumber || ''
      };

      const response = await merchantService.update(selectedMerchant.id, merchantData);
      
      if (response?.success) {
        setSuccessMessage(`✅ Merchant "${formData.name}" updated successfully!`);
        setShowEditModal(false);
        setSelectedMerchant(null);
        resetForm();
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to update merchant. Please try again.');
      }
    } catch (error) {
      console.error('Error updating merchant:', error);
      setErrorMessage('Failed to update merchant. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMerchant = async () => {
    if (!selectedMerchant) return;

    try {
      const response = await merchantService.delete(selectedMerchant.id);
      
      if (response?.success) {
        setSuccessMessage(`✅ Merchant "${selectedMerchant.name}" deleted successfully!`);
        setShowDeleteConfirm(false);
        setSelectedMerchant(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to delete merchant. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting merchant:', error);
      setErrorMessage('Failed to delete merchant. Please try again.');
    }
  };

  const openEditModal = (merchant) => {
    let services = [];
    try {
      if (merchant.services) {
        services = typeof merchant.services === 'string' 
          ? JSON.parse(merchant.services) 
          : merchant.services;
      }
    } catch (e) {
      services = [];
    }

    setSelectedMerchant(merchant);
    setFormData({
      name: merchant.name || '',
      type: merchant.type || '',
      contact: merchant.contact || '',
      email: merchant.email || '',
      phone: merchant.phone || '',
      address: merchant.address || '',
      sla: merchant.sla || '',
      tat_avg: merchant.tatAvg || '',
      repeat_rate: merchant.repeatRate || '',
      status: merchant.status || 'pending',
      rating: merchant.rating || 0,
      services: services,
      notes: merchant.notes || '',
      website: merchant.website || '',
      yearsInBusiness: merchant.yearsInBusiness || '',
      insurance: merchant.insurance || '',
      licenseNumber: merchant.licenseNumber || ''
    });
    setShowEditModal(true);
  };

  const openDeleteConfirm = (merchant) => {
    setSelectedMerchant(merchant);
    setShowDeleteConfirm(true);
  };

  const viewMerchantJobs = (merchant) => {
    const jobs = maintenanceJobs.filter(j => 
      j.mechanic === merchant.name || 
      j.merchantId === merchant.id
    );
    setMerchantJobs(jobs);
    setShowJobHistory(true);
  };

  // ============================================
  // RENDER ADD/EDIT MODAL
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showAddModal;
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); }}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); }}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Merchant' : 'Add New Merchant'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update merchant details' : 'Add a new vendor or service provider'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name *</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter merchant name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="">Select Type</option>
                  {merchantTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Contact person name"
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input 
                  type="tel" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Email address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Website URL"
                  value={formData.website}
                  onChange={(e) => setFormData({...formData, website: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Physical address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 24h, 2 days"
                  value={formData.sla}
                  onChange={(e) => setFormData({...formData, sla: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Avg Turnaround Time (hours)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 3.2"
                  value={formData.tat_avg}
                  onChange={(e) => setFormData({...formData, tat_avg: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 2.5"
                  value={formData.repeat_rate}
                  onChange={(e) => setFormData({...formData, repeat_rate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rating (0-5)</label>
                <input 
                  type="number" 
                  step="0.1"
                  min="0"
                  max="5"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 4.5"
                  value={formData.rating}
                  onChange={(e) => setFormData({...formData, rating: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Business license number"
                  value={formData.licenseNumber}
                  onChange={(e) => setFormData({...formData, licenseNumber: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years in Business</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 5, 10+"
                  value={formData.yearsInBusiness}
                  onChange={(e) => setFormData({...formData, yearsInBusiness: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insurance</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Insurance provider"
                  value={formData.insurance}
                  onChange={(e) => setFormData({...formData, insurance: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Services Offered</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Comma separated services (e.g., Oil Change, Brake Service)"
                  value={Array.isArray(formData.services) ? formData.services.join(', ') : ''}
                  onChange={(e) => setFormData({...formData, services: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" 
                  rows="2"
                  placeholder="Additional notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={isEdit ? handleEditMerchant : handleAddMerchant}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Save size={18} />
                )}
                {isEdit ? 'Update Merchant' : 'Add Merchant'}
              </button>
              <button 
                onClick={() => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); }}
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
    if (!showDeleteConfirm || !selectedMerchant) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Merchant?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete "{selectedMerchant.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteMerchant}
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
  // RENDER MERCHANT DETAIL MODAL - ENHANCED
  // ============================================
  const renderMerchantModal = () => {
    if (!selectedMerchant) return null;
    
    let services = [];
    try {
      if (selectedMerchant.services) {
        services = typeof selectedMerchant.services === 'string' 
          ? JSON.parse(selectedMerchant.services) 
          : selectedMerchant.services;
      }
    } catch (e) {
      services = [];
    }
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setSelectedMerchant(null)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setSelectedMerchant(null)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedMerchant.name}</h2>
                <p className="text-blue-100 text-sm">{selectedMerchant.type}</p>
                {selectedMerchant.website && (
                  <a href={selectedMerchant.website} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-200 text-xs hover:text-white flex items-center gap-1">
                    {selectedMerchant.website} <ExternalLink size={12} />
                  </a>
                )}
              </div>
              <span className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${getStatusColor(selectedMerchant.status)}`}>
                {getStatusIcon(selectedMerchant.status)}
                {getStatusLabel(selectedMerchant.status)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="text-yellow-400 text-sm">{getRatingStars(selectedMerchant.rating)}</div>
              <span className="text-blue-100 text-sm">{selectedMerchant.rating} ★</span>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Jobs Completed</p>
                <p className="text-lg font-bold text-green-600">{selectedMerchant.jobsCompleted || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Active Jobs</p>
                <p className="text-lg font-bold text-blue-600">{selectedMerchant.activeJobs || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Avg Job Cost</p>
                <p className="text-lg font-bold text-purple-600">LSL {(selectedMerchant.avgJobCost || 0).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Contact</p>
                <p className="text-sm font-medium">{selectedMerchant.contact || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Phone</p>
                <div className="flex items-center justify-center gap-1">
                  <Phone size={14} className="text-gray-400" />
                  <p className="text-sm font-medium">{selectedMerchant.phone || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Email</p>
                <div className="flex items-center justify-center gap-1">
                  <Mail size={14} className="text-gray-400" />
                  <p className="text-sm font-medium truncate">{selectedMerchant.email || 'N/A'}</p>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">SLA</p>
                <p className="text-sm font-medium">{selectedMerchant.sla || 'N/A'}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Avg TAT</p>
                <p className="text-sm font-medium">{selectedMerchant.tatAvg || 0}h</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Repeat Rate</p>
                <p className="text-sm font-medium">{selectedMerchant.repeatRate || 0}%</p>
              </div>
            </div>

            {selectedMerchant.address && (
              <div className="mb-3 p-2 bg-gray-50 rounded-lg flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-gray-400" />
                <span>{selectedMerchant.address}</span>
              </div>
            )}

            {services && services.length > 0 && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Services Offered</h4>
                <div className="flex flex-wrap gap-2">
                  {services.map((service, idx) => (
                    <span key={idx} className="bg-gray-100 px-3 py-1 rounded-full text-sm">{service}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedMerchant.notes && (
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg">{selectedMerchant.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <button 
                onClick={() => { openEditModal(selectedMerchant); setSelectedMerchant(null); }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Edit size={16} /> Edit Merchant
              </button>
              <button 
                onClick={() => viewMerchantJobs(selectedMerchant)}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center justify-center gap-2"
              >
                <Wrench size={16} /> View Jobs
              </button>
              <button 
                onClick={() => { openDeleteConfirm(selectedMerchant); setSelectedMerchant(null); }}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER JOB HISTORY MODAL
  // ============================================
  const renderJobHistoryModal = () => {
    if (!showJobHistory) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowJobHistory(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setShowJobHistory(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-5 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">Job History</h2>
            <p className="text-green-100 text-sm">{merchantJobs.length} jobs associated with this merchant</p>
          </div>

          <div className="p-6">
            {merchantJobs.length > 0 ? (
              <div className="space-y-3">
                {merchantJobs.map(job => (
                  <div key={job.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div>
                      <p className="font-medium text-sm">{job.type || 'Service'}</p>
                      <p className="text-xs text-gray-500">
                        Vehicle: {job.vehicleRegistration || job.vehicleId || 'N/A'} · 
                        Status: <span className={`${job.status === 'closed' || job.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>
                          {job.status || 'In Progress'}
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">LSL {(job.cost || 0).toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{job.date ? new Date(job.date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Wrench size={48} className="mx-auto text-gray-300 mb-3" />
                <p>No jobs found for this merchant</p>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button 
                onClick={() => setShowJobHistory(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
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
              placeholder="Search merchants..." 
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
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> Add Merchant
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">All Types</option>
              {merchantTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="approved">✅ Approved</option>
              <option value="rejected">❌ Rejected</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Ratings</option>
              <option value="4.5">4.5+ ⭐</option>
              <option value="4.0">4.0+ ⭐</option>
              <option value="3.5">3.5+ ⭐</option>
            </select>
          </div>
        </div>
      )}

      {filteredMerchants.length > 0 ? (
        <div className="overflow-x-auto -mx-3 sm:mx-0">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Merchant</th>
                <th className="p-3 hidden sm:table-cell">Type</th>
                <th className="p-3 hidden md:table-cell">Contact</th>
                <th className="p-3">Jobs</th>
                <th className="p-3 hidden lg:table-cell">SLA</th>
                <th className="p-3">Rating</th>
                <th className="p-3 hidden sm:table-cell">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMerchants.map((merchant) => (
                <tr key={merchant.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="p-3" onClick={() => { setSelectedMerchant(merchant); }}>
                    <div>
                      <p className="font-medium text-sm">{merchant.name}</p>
                      <p className="text-xs text-gray-500">{merchant.email || 'No email'}</p>
                    </div>
                  </td>
                  <td className="p-3 text-sm hidden sm:table-cell">
                    <div className="flex items-center gap-1">
                      {getTypeIcon(merchant.type)}
                      {merchant.type}
                    </div>
                  </td>
                  <td className="p-3 text-sm hidden md:table-cell">{merchant.contact || merchant.phone || 'N/A'}</td>
                  <td className="p-3 text-sm">
                    <div>
                      <p className="font-medium">{merchant.jobsCompleted || 0}</p>
                      <p className="text-[10px] text-gray-400">completed</p>
                    </div>
                  </td>
                  <td className="p-3 text-sm hidden lg:table-cell">{merchant.sla || 'N/A'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <span className="text-xs">{getRatingStars(merchant.rating)}</span>
                      <span className="text-sm font-medium">{merchant.rating}</span>
                    </div>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(merchant.status)}`}>
                      {getStatusIcon(merchant.status)}
                      {getStatusLabel(merchant.status)}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => { setSelectedMerchant(merchant); }}
                        className="p-1 hover:bg-gray-200 rounded text-blue-600"
                        title="View Details"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        onClick={() => openEditModal(merchant)}
                        className="p-1 hover:bg-gray-200 rounded text-green-600"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        onClick={() => viewMerchantJobs(merchant)}
                        className="p-1 hover:bg-gray-200 rounded text-purple-600"
                        title="View Jobs"
                      >
                        <Wrench size={14} />
                      </button>
                      <button 
                        onClick={() => openDeleteConfirm(merchant)}
                        className="p-1 hover:bg-gray-200 rounded text-red-600"
                        title="Delete"
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
      ) : (
        <div className="text-center py-8 text-gray-500">
          <div className="text-6xl mb-3">🏪</div>
          <p className="font-medium">No merchants found</p>
          <p className="text-sm">Click "Add Merchant" to add your first merchant</p>
        </div>
      )}

      {filteredMerchants.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            Total merchants: <span className="font-semibold">{filteredMerchants.length}</span> · 
            Approved: <span className="font-semibold text-green-600">{stats.approved}</span> · 
            Avg Rating: <span className="font-semibold">{stats.avgRating} ★</span> · 
            Total Jobs: <span className="font-semibold">{stats.totalJobs}</span>
          </p>
          <button className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <Download size={14} /> Export Report
          </button>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER ANALYTICS VIEW - ENHANCED
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Merchants</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-400">{stats.totalTypes} types</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Approved</p>
          <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
          <p className="text-xs text-green-500">{stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}% of total</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Avg Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-yellow-600">{stats.avgRating}</p>
            <span className="text-yellow-400">★</span>
          </div>
          <p className="text-xs text-gray-400">Based on {stats.total} merchants</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Jobs</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalJobs}</p>
          <p className="text-xs text-gray-400">Total Cost: LSL {stats.totalCost.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Status Distribution</h5>
          <div className="space-y-2">
            {[
              { label: '✅ Approved', count: stats.approved, color: 'bg-green-500' },
              { label: '⏳ Pending', count: stats.pending, color: 'bg-yellow-500' },
              { label: '❌ Rejected', count: stats.rejected, color: 'bg-red-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-sm">
                  <span>{item.label}</span>
                  <span className="font-medium">{item.count} ({stats.total > 0 ? Math.round((item.count / stats.total) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className={`${item.color} rounded-full h-2 transition-all duration-500`} 
                    style={{ width: `${stats.total > 0 ? (item.count / stats.total) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
            <Award size={16} className="text-yellow-500" />
            Top Performing Merchants
          </h5>
          <div className="space-y-2">
            {merchants.sort((a, b) => (parseFloat(b.rating) || 0) - (parseFloat(a.rating) || 0)).slice(0, 5).map((merchant, index) => (
              <div key={merchant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => setSelectedMerchant(merchant)}>
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{merchant.name}</p>
                    <p className="text-xs text-gray-500 truncate">{merchant.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-medium text-yellow-600">{merchant.rating} ★</span>
                  {parseFloat(merchant.rating) >= 4.5 && <Award size={14} className="text-yellow-400 fill-yellow-400" />}
                </div>
              </div>
            ))}
            {merchants.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h5 className="font-medium text-sm mb-3">Service Type Distribution</h5>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(
            merchants.reduce((acc, m) => {
              acc[m.type] = (acc[m.type] || 0) + 1;
              return acc;
            }, {})
          )
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([type, count]) => (
              <div key={type} className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 transition-colors">
                <p className="text-lg font-bold text-blue-600">{count}</p>
                <p className="text-xs text-gray-500 truncate">{type}</p>
              </div>
            ))}
          {merchants.length === 0 && (
            <div className="col-span-full text-center text-gray-400 text-sm py-4">No data available</div>
          )}
        </div>
      </div>

      {stats.topPerformer && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-xl border border-yellow-200">
          <div className="flex items-start gap-3">
            <Award size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-700">🏆 Top Performer</p>
              <p className="text-sm font-bold">{stats.topPerformer.name}</p>
              <p className="text-xs text-gray-600">{stats.topPerformer.rating} ★ · {stats.topPerformer.type}</p>
            </div>
          </div>
        </div>
      )}
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
          <p className="mt-4 text-gray-500">Loading merchants...</p>
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
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Building size={24} className="text-blue-600" />
              Merchant Management
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {stats.total} merchants · {stats.approved} approved · ⭐ {stats.avgRating} avg rating
            </p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={16} /> Add Merchant
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'list', label: 'List', icon: CheckCircle },
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

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'list' && renderListView()}
        {activeTab === 'analytics' && renderAnalyticsView()}
      </div>

      {renderMerchantModal()}
      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
      {renderJobHistoryModal()}
    </div>
  );
};

export default Merchants;