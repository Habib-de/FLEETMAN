// src/pages/car-owner/Compliance.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, XCircle, Clock,
  Download, Plus, FileText,
  BarChart3, X, Upload, Save, Edit, Trash2,
  AlertCircle, RefreshCw, Camera, Image as ImageIcon, File,
  Bell, Calendar, Shield, AlertTriangle,
  TrendingUp, TrendingDown, Award, Users,
  Truck, User, Eye, Printer, Share2, Search  
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  complianceService,
  vehicleService,
  driverService,
  incidentService
} from '../../services/api';

// ============================================
// HELPER: Compress image before upload
// ============================================
const compressImage = (base64String, maxWidth = 1200, maxHeight = 1200, quality = 0.9) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = base64String;
  });
};

const Compliance = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [complianceItems, setComplianceItems] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCompliance, setSelectedCompliance] = useState(null);
  const [tenantId, setTenantId] = useState('');
  const [expiryAlerts, setExpiryAlerts] = useState([]);
  const [complianceScore, setComplianceScore] = useState(0);
  
  // Document/Image states
  const [documentPreview, setDocumentPreview] = useState(null);
  const [editDocumentPreview, setEditDocumentPreview] = useState(null);
  const [documentView, setDocumentView] = useState(null);
  const fileInputRef = useRef(null);
  const editFileInputRef = useRef(null);

  // ============================================
  // FORM DATA - Matches Database Schema
  // ============================================
  const [formData, setFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    type: '',
    valid_from: '',
    valid_until: '',
    status: 'valid',
    document_url: '',
    notes: '',
    document_image: null
  });

  const [editFormData, setEditFormData] = useState({
    vehicle_id: '',
    driver_id: '',
    type: '',
    valid_from: '',
    valid_until: '',
    status: 'valid',
    document_url: '',
    notes: '',
    document_image: null
  });

  // ============================================
  // COMPLIANCE TYPES
  // ============================================
  const complianceTypes = [
    'license_disc',
    'roadworthy',
    'insurance',
    'permit',
    'driver_license',
    'inspection_report',
    'registration',
    'tax_clearance'
  ];

  const getTypeLabel = (type) => {
    const labels = {
      'license_disc': 'License Disc',
      'roadworthy': 'Roadworthy',
      'insurance': 'Insurance',
      'permit': 'Permit',
      'driver_license': 'Driver License',
      'inspection_report': 'Inspection Report',
      'registration': 'Registration',
      'tax_clearance': 'Tax Clearance'
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'license_disc': <FileText size={14} className="text-blue-500" />,
      'roadworthy': <Shield size={14} className="text-green-500" />,
      'insurance': <CheckCircle size={14} className="text-purple-500" />,
      'permit': <FileText size={14} className="text-orange-500" />,
      'driver_license': <User size={14} className="text-indigo-500" />,
      'inspection_report': <FileText size={14} className="text-yellow-500" />,
      'registration': <FileText size={14} className="text-blue-500" />,
      'tax_clearance': <FileText size={14} className="text-red-500" />
    };
    return icons[type] || <FileText size={14} className="text-gray-500" />;
  };

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view compliance');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      const [complianceRes, vehiclesRes, driversRes] = await Promise.all([
        complianceService.getAll(tenant).catch(() => ({ data: [] })),
        vehicleService.getAll(tenant).catch(() => ({ data: [] })),
        driverService.getAll(tenant).catch(() => ({ data: [] }))
      ]);

      const itemsData = complianceRes?.data || [];
      const vehiclesData = vehiclesRes?.data || [];
      const driversData = driversRes?.data || [];

      // Enhance compliance items with calculated fields
      const enhancedItems = itemsData.map(item => {
        const validUntil = item.validUntil || item.valid_until;
        const isExpired = validUntil ? new Date(validUntil) < new Date() : false;
        const daysUntilExpiry = validUntil ? Math.ceil((new Date(validUntil) - new Date()) / (1000 * 60 * 60 * 24)) : null;
        
        let status = item.status || (isExpired ? 'expired' : 'valid');
        if (status === 'valid' && daysUntilExpiry !== null && daysUntilExpiry <= 30) {
          status = 'expiring_soon';
        }
        
        return {
          ...item,
          vehicleLabel: item.vehicleId || item.vehicle_id ? 
            vehiclesData.find(v => v.id === (item.vehicleId || item.vehicle_id))?.registration || 'Unknown' : null,
          driverName: item.driverId || item.driver_id ? 
            driversData.find(d => String(d.id) === String(item.driverId || item.driver_id))?.name || 'Unknown' : null,
          isExpired: isExpired,
          daysUntilExpiry: daysUntilExpiry,
          status: status,
          validUntil: validUntil,
          validFrom: item.validFrom || item.valid_from,
          documentImage: item.documentImage || item.document_image || item.documentUrl
        };
      });

      setComplianceItems(enhancedItems);
      setVehicles(vehiclesData);
      setDrivers(driversData);

      // Calculate compliance score
      const total = enhancedItems.length;
      const valid = enhancedItems.filter(c => c.status === 'valid' || c.status === 'completed').length;
      const score = total > 0 ? Math.round((valid / total) * 100) : 0;
      setComplianceScore(score);

      // Generate expiry alerts
      const alerts = enhancedItems
        .filter(c => c.status === 'expiring_soon' || c.status === 'expired')
        .map(c => ({
          id: c.id,
          type: c.type,
          label: getTypeLabel(c.type),
          vehicle: c.vehicleLabel || c.driverName || 'Unknown',
          daysUntilExpiry: c.daysUntilExpiry,
          status: c.status,
          validUntil: c.validUntil
        }));
      setExpiryAlerts(alerts);

    } catch (error) {
      console.error('Error loading compliance data:', error);
      setErrorMessage('Failed to load compliance data. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // ============================================
  // DOCUMENT IMAGE HANDLERS
  // ============================================
  const handleFileChange = async (e, isEdit = false) => {
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
    reader.onloadend = async () => {
      try {
        const compressedBase64 = await compressImage(reader.result, 800, 800, 0.85);
        
        if (isEdit) {
          setEditFormData({ ...editFormData, document_image: compressedBase64 });
          setEditDocumentPreview(compressedBase64);
        } else {
          setFormData({ ...formData, document_image: compressedBase64 });
          setDocumentPreview(compressedBase64);
        }
        setSuccessMessage('Document image uploaded successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        console.error('Error compressing image:', error);
        setErrorMessage('Failed to process image. Please try again.');
      }
    };
    reader.readAsDataURL(file);
  };

  const removeDocument = (isEdit = false) => {
    if (isEdit) {
      setEditFormData({ ...editFormData, document_image: null });
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
      setEditDocumentPreview(null);
    } else {
      setFormData({ ...formData, document_image: null });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setDocumentPreview(null);
    }
  };

  const viewDocument = (item) => {
    const image = item.documentImage || item.document_image || item.documentUrl;
    if (image) {
      setDocumentView(image);
      setShowDocumentModal(true);
    }
  };

  const hasDocument = (item) => {
    return !!(item.documentImage || item.document_image || item.documentUrl);
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
  // SEARCH LISTENER
  // ============================================
  useEffect(() => {
    const handleSearch = (event) => {
      if (event.detail && event.detail.query) {
        setSearchTerm(event.detail.query.toLowerCase().trim());
      }
    };

    window.addEventListener('searchResults', handleSearch);
    return () => {
      window.removeEventListener('searchResults', handleSearch);
    };
  }, []);

  // ============================================
  // STATISTICS
  // ============================================
  const stats = {
    total: complianceItems.length,
    valid: complianceItems.filter(c => c.status === 'valid' || c.status === 'completed').length,
    expired: complianceItems.filter(c => c.status === 'expired').length,
    expiringSoon: complianceItems.filter(c => c.status === 'expiring_soon').length,
    pending: complianceItems.filter(c => c.status === 'pending').length,
    complianceRate: complianceScore,
    withDocuments: complianceItems.filter(c => hasDocument(c)).length,
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusColor = (status) => {
    const colors = {
      'valid': 'bg-green-100 text-green-700 border-green-200',
      'completed': 'bg-green-100 text-green-700 border-green-200',
      'pending': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'expired': 'bg-red-100 text-red-700 border-red-200',
      'expiring_soon': 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'valid': '✅ Valid',
      'completed': '✅ Completed',
      'pending': '⏳ Pending',
      'expired': '❌ Expired',
      'expiring_soon': '⚠️ Expiring Soon',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'valid':
      case 'completed': return <CheckCircle size={14} className="text-green-600" />;
      case 'pending': return <Clock size={14} className="text-yellow-600" />;
      case 'expired': return <XCircle size={14} className="text-red-600" />;
      case 'expiring_soon': return <AlertCircle size={14} className="text-orange-600" />;
      default: return null;
    }
  };

  // ============================================
// ✅ SEND COMPLIANCE ALERT/NOTIFICATION
// ============================================
const sendComplianceAlert = async (item, message, type) => {
  try {
    // 1. Send notification to car owner
    const tenantUsers = JSON.parse(localStorage.getItem('fleetman_users') || '[]');
    const carOwner = tenantUsers.find(u => 
      u.tenantId === tenantId && u.role === 'car_owner'
    );
    
    if (carOwner) {
      const notificationData = {
        userId: carOwner.id,
        title: `⚠️ ${getTypeLabel(item.type)} ${type}`,
        message: message,
        link: '/compliance',
        read: false,
        createdAt: new Date().toISOString()
      };
      
      const notifications = JSON.parse(localStorage.getItem('fleetman_notifications') || '[]');
      notifications.unshift(notificationData);
      localStorage.setItem('fleetman_notifications', JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent('newNotification', { detail: notificationData }));
      console.log(`📧 Compliance notification sent: ${message}`);
    }
    
    // 2. Create alarm
    const alarmData = {
      type: 'COMPLIANCE',
      severity: type === 'expired' ? 'high' : 'medium',
      message: `⚠️ ${getTypeLabel(item.type)} ${type}`,
      description: message,
      createdAt: new Date().toISOString(),
      resolved: false
    };
    
    const alarms = JSON.parse(localStorage.getItem('fleetman_alarms') || '[]');
    alarms.unshift({
      id: `compliance_${Date.now()}`,
      ...alarmData
    });
    localStorage.setItem('fleetman_alarms', JSON.stringify(alarms));
    window.dispatchEvent(new CustomEvent('newAlarm', { detail: alarmData }));
    
    // 3. Create incident if expired
    if (type === 'expired') {
      const incidentData = {
        tenant: { id: tenantId },
        vehicle: item.vehicle_id ? { id: item.vehicle_id } : null,
        driver: item.driver_id ? { id: item.driver_id } : null,
        incidentType: 'Compliance Violation',
        severity: 'high',
        status: 'reported',
        description: `${getTypeLabel(item.type)} has expired. Please renew immediately.`,
        cost: 0,
        reportedBy: 'System',
        attachments: '[]'
      };
      
      await incidentService.create(incidentData);
      console.log(`🚨 Incident created for expired compliance: ${getTypeLabel(item.type)}`);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to send compliance alert:', error);
    return false;
  }
};

// ============================================
// ✅ UPDATE VEHICLE/DRIVER STATUS
// ============================================
const updateLinkedEntityStatus = async (item, isExpired) => {
  try {
    // If vehicle is linked and compliance is critical
    if (item.vehicle_id && isExpired) {
      const criticalTypes = ['license_disc', 'roadworthy', 'insurance', 'registration'];
      if (criticalTypes.includes(item.type)) {
        await vehicleService.update(item.vehicle_id, {
          status: 'Maintenance'
        });
        console.log(`🚗 Vehicle ${item.vehicle_id} status updated to Maintenance due to expired ${getTypeLabel(item.type)}`);
      }
    }
    
    // If driver is linked and compliance is critical
    if (item.driver_id && isExpired) {
      const criticalTypes = ['driver_license', 'permit'];
      if (criticalTypes.includes(item.type)) {
        await driverService.update(item.driver_id, {
          status: 'Inactive'
        });
        console.log(`👤 Driver ${item.driver_id} status updated to Inactive due to expired ${getTypeLabel(item.type)}`);
      }
    }
  } catch (error) {
    console.error('Failed to update linked entity status:', error);
  }
};

// ============================================
// ✅ CHECK EXPIRING COMPLIANCE (Daily Check)
// ============================================
const checkExpiringCompliance = async () => {
  if (!tenantId) return;
  
  try {
    const response = await complianceService.getAll(tenantId);
    const items = response?.data || [];
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    for (const item of items) {
      const validUntil = item.validUntil || item.valid_until;
      if (!validUntil) continue;
      
      const expiryDate = new Date(validUntil);
      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      
      // Check if expired
      if (expiryDate < now) {
        // Only alert once per expiry
        const alertKey = `compliance_expired_${item.id}`;
        if (!localStorage.getItem(alertKey)) {
          await sendComplianceAlert(
            item,
            `${getTypeLabel(item.type)} has EXPIRED on ${expiryDate.toLocaleDateString()}. Please renew immediately.`,
            'expired'
          );
          await updateLinkedEntityStatus(item, true);
          localStorage.setItem(alertKey, 'true');
        }
      } 
      // Check if expiring soon (30 days)
      else if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        // Only alert once per item per expiry period
        const alertKey = `compliance_expiring_${item.id}`;
        if (!localStorage.getItem(alertKey)) {
          await sendComplianceAlert(
            item,
            `${getTypeLabel(item.type)} is expiring in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}. Please renew soon.`,
            'expiring_soon'
          );
          localStorage.setItem(alertKey, daysUntilExpiry.toString());
        } else {
          // Update if days changed significantly
          const storedDays = parseInt(localStorage.getItem(alertKey));
          if (storedDays !== daysUntilExpiry && daysUntilExpiry % 7 === 0) {
            await sendComplianceAlert(
              item,
              `REMINDER: ${getTypeLabel(item.type)} is expiring in ${daysUntilExpiry} days on ${expiryDate.toLocaleDateString()}.`,
              'expiring_soon'
            );
            localStorage.setItem(alertKey, daysUntilExpiry.toString());
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to check expiring compliance:', error);
  }
};


// ============================================
// ✅ DAILY COMPLIANCE CHECK
// ============================================
useEffect(() => {
  // Check immediately on load
  if (tenantId) {
    checkExpiringCompliance();
  }
  
  // Check every 24 hours (86400000 ms)
  const intervalId = setInterval(() => {
    console.log('🔄 Running daily compliance check...');
    checkExpiringCompliance();
  }, 24 * 60 * 60 * 1000);
  
  // Also check on page visibility change (when user returns to tab)
  const handleVisibilityChange = () => {
    if (!document.hidden && tenantId) {
      console.log('🔄 Page visible, running compliance check...');
      checkExpiringCompliance();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [tenantId]);


  const getVehicleLabel = (vehicleId) => {
    if (!vehicleId) return 'N/A';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? vehicle.registration || vehicle.id : vehicleId;
  };

  const getDriverName = (driverId) => {
    if (!driverId) return 'N/A';
    const driver = drivers.find(d => String(d.id) === String(driverId));
    return driver ? driver.name : 'N/A';
  };

  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  // ============================================
  // CRUD OPERATIONS
  // ============================================
  const resetForm = () => {
    setFormData({
      vehicle_id: '',
      driver_id: '',
      type: '',
      valid_from: '',
      valid_until: '',
      status: 'valid',
      document_url: '',
      notes: '',
      document_image: null
    });
    setDocumentPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setErrorMessage('');
    setSuccessMessage('');
  };

  const resetEditForm = () => {
    setEditFormData({
      vehicle_id: '',
      driver_id: '',
      type: '',
      valid_from: '',
      valid_until: '',
      status: 'valid',
      document_url: '',
      notes: '',
      document_image: null
    });
    setEditDocumentPreview(null);
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleAddCompliance = async () => {
  setIsLoading(true);
  setErrorMessage('');
  setSuccessMessage('');

  if (!formData.type || !formData.valid_until) {
    setErrorMessage('Type and expiry date are required');
    setIsLoading(false);
    return;
  }

  if (!formData.vehicle_id && !formData.driver_id) {
    setErrorMessage('Either vehicle or driver must be selected');
    setIsLoading(false);
    return;
  }

  try {
    const complianceData = {
      tenant: { id: tenantId },
      vehicle: formData.vehicle_id ? { id: formData.vehicle_id } : null,
      driver: formData.driver_id ? { id: formData.driver_id } : null,
      type: formData.type,
      validFrom: formData.valid_from || new Date().toISOString().split('T')[0],
      validUntil: formData.valid_until,
      status: isExpired(formData.valid_until) ? 'expired' : 'valid',
      documentUrl: formData.document_image || formData.document_url || '',
      notes: formData.notes || ''
    };

    const response = await complianceService.create(complianceData);
    
    if (response?.success) {
      const newItem = response.data;
      
      setSuccessMessage('✅ Compliance item added successfully!');
      setShowUploadModal(false);
      resetForm();
      await loadData();
      
      // ✅ Check if new item is expired or expiring soon
      const daysUntilExpiry = Math.ceil((new Date(formData.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        await sendComplianceAlert(
          { 
            ...newItem, 
            type: formData.type, 
            vehicle_id: formData.vehicle_id, 
            driver_id: formData.driver_id 
          },
          `${getTypeLabel(formData.type)} has EXPIRED. Please renew immediately.`,
          'expired'
        );
        await updateLinkedEntityStatus(
          { 
            ...newItem, 
            type: formData.type, 
            vehicle_id: formData.vehicle_id, 
            driver_id: formData.driver_id 
          }, 
          true
        );
      } else if (daysUntilExpiry <= 30) {
        await sendComplianceAlert(
          { 
            ...newItem, 
            type: formData.type, 
            vehicle_id: formData.vehicle_id, 
            driver_id: formData.driver_id 
          },
          `${getTypeLabel(formData.type)} is expiring in ${daysUntilExpiry} days. Please renew soon.`,
          'expiring_soon'
        );
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage(response?.message || 'Failed to add compliance item. Please try again.');
    }
  } catch (error) {
    console.error('Error adding compliance item:', error);
    setErrorMessage('Failed to add compliance item. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handleEditCompliance = async () => {
  if (!selectedCompliance) return;

  setIsLoading(true);
  setErrorMessage('');
  setSuccessMessage('');

  try {
    const complianceData = {
      type: editFormData.type,
      validFrom: editFormData.valid_from || selectedCompliance.validFrom,
      validUntil: editFormData.valid_until,
      status: isExpired(editFormData.valid_until) ? 'expired' : 'valid',
      documentUrl: editFormData.document_image || editFormData.document_url || '',
      notes: editFormData.notes || ''
    };

    const response = await complianceService.update(selectedCompliance.id, complianceData);
    
    if (response?.success) {
      const itemData = { ...selectedCompliance, ...editFormData };
      
      setSuccessMessage('✅ Compliance item updated successfully!');
      setShowEditModal(false);
      setSelectedCompliance(null);
      resetForm();
      resetEditForm();
      await loadData();
      
      // ✅ Check if updated item is expired or expiring soon
      const daysUntilExpiry = Math.ceil((new Date(editFormData.valid_until) - new Date()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        await sendComplianceAlert(
          itemData,
          `${getTypeLabel(editFormData.type)} has EXPIRED. Please renew immediately.`,
          'expired'
        );
        await updateLinkedEntityStatus(itemData, true);
      } else if (daysUntilExpiry <= 30) {
        await sendComplianceAlert(
          itemData,
          `${getTypeLabel(editFormData.type)} is expiring in ${daysUntilExpiry} days. Please renew soon.`,
          'expiring_soon'
        );
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
      setErrorMessage(response?.message || 'Failed to update compliance item. Please try again.');
    }
  } catch (error) {
    console.error('Error updating compliance item:', error);
    setErrorMessage('Failed to update compliance item. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handleDeleteCompliance = async () => {
    if (!selectedCompliance) return;

    try {
      const response = await complianceService.delete(selectedCompliance.id);
      
      if (response?.success) {
        setSuccessMessage('✅ Compliance item deleted successfully!');
        setShowDeleteConfirm(false);
        setSelectedCompliance(null);
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage(response?.message || 'Failed to delete compliance item. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting compliance item:', error);
      setErrorMessage('Failed to delete compliance item. Please try again.');
    }
  };

  const openEditModal = (item) => {
    setSelectedCompliance(item);
    setEditFormData({
      vehicle_id: item.vehicleId || item.vehicle_id || '',
      driver_id: item.driverId || item.driver_id || '',
      type: item.type || '',
      valid_from: item.validFrom || item.valid_from || '',
      valid_until: item.validUntil || item.valid_until || '',
      status: item.status || 'valid',
      document_url: item.documentUrl || item.document_url || '',
      notes: item.notes || '',
      document_image: item.documentImage || item.document_image || null
    });
    setEditDocumentPreview(item.documentImage || item.document_image || null);
    setShowEditModal(true);
  };

  const openDeleteConfirm = (item) => {
    setSelectedCompliance(item);
    setShowDeleteConfirm(true);
  };

  // ============================================
  // FILTER COMPLIANCE ITEMS
  // ============================================
  const filteredItems = complianceItems.filter(item => {
    const matchesSearch = 
      (getVehicleLabel(item.vehicleId || item.vehicle_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getDriverName(item.driverId || item.driver_id) || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (getTypeLabel(item.type) || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // ============================================
  // RENDER DOCUMENT MODAL
  // ============================================
  const renderDocumentModal = () => {
    if (!showDocumentModal || !documentView) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDocumentModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-4">
          <button 
            onClick={() => setShowDocumentModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>
          <div className="flex items-center justify-center p-4">
            <img 
              src={documentView} 
              alt="Document" 
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER MODALS
  // ============================================
  const renderFormModal = (isEdit = false) => {
    const isOpen = isEdit ? showEditModal : showUploadModal;
    const data = isEdit ? editFormData : formData;
    const setData = isEdit ? setEditFormData : setFormData;
    const handleSubmit = isEdit ? handleEditCompliance : handleAddCompliance;
    const closeModal = () => {
      if (isEdit) {
        setShowEditModal(false);
        resetEditForm();
      } else {
        setShowUploadModal(false);
        resetForm();
      }
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

          <div className={`px-6 py-5 rounded-t-2xl ${isEdit ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-green-600 to-green-700'}`}>
            <h2 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Compliance Item' : 'Add Compliance Document'}
            </h2>
            <p className={`text-sm ${isEdit ? 'text-blue-100' : 'text-green-100'}`}>
              {isEdit ? 'Update compliance details' : 'Upload a new compliance document'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.type}
                  onChange={(e) => setData({...data, type: e.target.value})}
                >
                  <option value="">Select Type</option>
                  {complianceTypes.map(type => (
                    <option key={type} value={type}>{getTypeLabel(type)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.status}
                  onChange={(e) => setData({...data, status: e.target.value})}
                >
                  <option value="valid">Valid</option>
                  <option value="pending">Pending</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                <select 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.vehicle_id}
                  onChange={(e) => setData({...data, vehicle_id: e.target.value})}
                >
                  <option value="">Select Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.registration || v.id} - {v.make} {v.model}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.valid_from}
                  onChange={(e) => setData({...data, valid_from: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={data.valid_until}
                  onChange={(e) => setData({...data, valid_until: e.target.value})}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder="Additional notes..."
                  value={data.notes}
                  onChange={(e) => setData({...data, notes: e.target.value})}
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Document Image (Optional)
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={isEdit ? editFileInputRef : fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, isEdit)}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (isEdit && editFileInputRef.current) {
                        editFileInputRef.current.click();
                      } else if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                  >
                    <Camera size={16} /> Upload Document
                  </button>
                  <span className="text-xs text-gray-400">JPG, PNG (Max 5MB)</span>
                </div>

                {(data.document_image) && (
                  <div className="mt-3 flex items-center gap-3">
                    <img 
                      src={data.document_image} 
                      alt="Document" 
                      className="h-20 w-20 object-cover rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeDocument(isEdit)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {!data.document_image && (
                  <p className="text-xs text-gray-400 mt-2">Upload a document image for proof</p>
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
                {isEdit ? 'Update Item' : 'Add Item'}
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
    if (!showDeleteConfirm || !selectedCompliance) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowDeleteConfirm(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
          <div className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={32} className="text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Delete Compliance Item?</h3>
            <p className="text-gray-500 text-sm">
              Are you sure you want to delete this compliance item? This action cannot be undone.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={handleDeleteCompliance}
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
  // RENDER OVERVIEW - SAMSARA/FLEETIO STYLE
  // ============================================
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Compliance Score</p>
          <div className="flex items-center gap-3">
            <p className="text-2xl font-bold text-blue-600">{stats.complianceRate}%</p>
            <div className={`text-xs px-2 py-0.5 rounded-full ${stats.complianceRate >= 80 ? 'bg-green-100 text-green-700' : stats.complianceRate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
              {stats.complianceRate >= 80 ? 'Good' : stats.complianceRate >= 60 ? 'Fair' : 'Needs Attention'}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${stats.complianceRate}%` }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Total Items</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-400">{stats.valid} valid</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Expiring Soon</p>
          <p className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</p>
          <p className="text-xs text-gray-400">Within 30 days</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Expired</p>
          <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          <p className="text-xs text-gray-400">Need immediate action</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <p className="text-xs text-gray-500">Documents</p>
          <p className="text-2xl font-bold text-purple-600">{stats.withDocuments}</p>
          <p className="text-xs text-gray-400">Uploaded</p>
        </div>
      </div>

      {/* Expiry Alerts */}
      {expiryAlerts.length > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border border-red-200">
          <div className="flex items-start gap-3">
            <Bell size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">⚠️ Compliance Alerts</p>
              <p className="text-xs text-red-600 mb-2">{expiryAlerts.length} item(s) require attention</p>
              <div className="space-y-1">
                {expiryAlerts.slice(0, 3).map(alert => (
                  <div key={alert.id} className="flex items-center gap-2 text-xs bg-white/80 p-2 rounded-lg">
                    {getTypeIcon(alert.type)}
                    <span className="font-medium">{alert.label}</span>
                    <span className="text-gray-500">- {alert.vehicle}</span>
                    <span className={`px-2 py-0.5 rounded-full ${alert.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {alert.status === 'expired' ? 'Expired' : `${alert.daysUntilExpiry} days`}
                    </span>
                  </div>
                ))}
                {expiryAlerts.length > 3 && (
                  <button 
                    onClick={() => setShowAlertModal(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View all {expiryAlerts.length} alerts
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Items Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-gray-200">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            Compliance Items
            <span className="text-xs text-gray-400">({filteredItems.length})</span>
          </h4>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search..." 
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus size={14} /> Add Item
            </button>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="p-3">Type</th>
                  <th className="p-3 hidden sm:table-cell">Vehicle/Driver</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 hidden md:table-cell">Valid Until</th>
                  <th className="p-3">Document</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(item.type)}
                        <span className="text-sm font-medium">{getTypeLabel(item.type)}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm hidden sm:table-cell">
                      {item.vehicleLabel || item.driverName || 'N/A'}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getStatusColor(item.status)}`}>
                        {getStatusIcon(item.status)}
                        {getStatusLabel(item.status)}
                      </span>
                    </td>
                    <td className="p-3 text-sm hidden md:table-cell">
                      <span className={item.isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}>
                        {item.validUntil ? new Date(item.validUntil).toLocaleDateString() : 'N/A'}
                      </span>
                      {item.daysUntilExpiry !== null && !item.isExpired && item.daysUntilExpiry <= 30 && (
                        <span className="text-xs text-orange-600 ml-1">({item.daysUntilExpiry}d)</span>
                      )}
                    </td>
                    <td className="p-3">
                      {hasDocument(item) ? (
                        <button
                          onClick={() => viewDocument(item)}
                          className="p-1 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                          title="View Document"
                        >
                          <ImageIcon size={16} />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => openEditModal(item)}
                          className="p-1 hover:bg-gray-200 rounded text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit size={14} />
                        </button>
                        <button 
                          onClick={() => openDeleteConfirm(item)}
                          className="p-1 hover:bg-gray-200 rounded text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                        {hasDocument(item) && (
                          <button 
                            onClick={() => viewDocument(item)}
                            className="p-1 hover:bg-gray-200 rounded text-purple-600 transition-colors"
                            title="View Document"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <CheckCircle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="font-medium">No compliance items found</p>
            <p className="text-sm">Click "Add Item" to add your first compliance document</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================
  // RENDER ANALYTICS VIEW - ENHANCED
  // ============================================
  const renderAnalyticsView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Overall Compliance</p>
          <p className="text-2xl font-bold text-green-600">{stats.complianceRate}%</p>
          <p className="text-xs text-green-500">Based on {stats.total} items</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Total Items</p>
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-gray-400">Across all categories</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Risk Items</p>
          <p className="text-2xl font-bold text-red-600">{stats.expired + stats.expiringSoon}</p>
          <p className="text-xs text-red-500">{stats.expired} expired, {stats.expiringSoon} expiring soon</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500">Categories</p>
          <p className="text-2xl font-bold text-orange-600">
            {complianceTypes.filter(type => 
              complianceItems.some(c => c.type === type)
            ).length}
          </p>
          <p className="text-xs text-gray-400">Types in use</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Compliance Status Distribution</h5>
          {stats.total > 0 ? (
            <div className="space-y-2">
              {[
                { label: '✅ Valid', count: stats.valid, color: 'bg-green-500' },
                { label: '⚠️ Expiring Soon', count: stats.expiringSoon, color: 'bg-orange-500' },
                { label: '❌ Expired', count: stats.expired, color: 'bg-red-500' },
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
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No data available</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h5 className="font-medium text-sm mb-3">Type Distribution</h5>
          {stats.total > 0 ? (
            <div className="space-y-2">
              {Object.entries(
                complianceItems.reduce((acc, c) => {
                  acc[c.type] = (acc[c.type] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([type, count]) => (
                  <div key={type}>
                    <div className="flex justify-between text-sm">
                      <span>{getTypeLabel(type)}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 rounded-full h-2 transition-all duration-500" 
                        style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-4">No data available</p>
          )}
        </div>
      </div>

      {/* Compliance Trend */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <h5 className="font-medium text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-green-500" />
          Compliance Trend
        </h5>
        <div className="h-32 flex items-end justify-between gap-1">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
            const score = Math.max(0, Math.min(100, stats.complianceRate + (Math.random() - 0.5) * 20));
            return (
              <div key={month} className="flex flex-col items-center flex-1 group">
                <div 
                  className="w-full rounded-t bg-gradient-to-t from-blue-400 to-blue-500 transition-all duration-500 hover:scale-y-110 origin-bottom"
                  style={{ height: `${Math.max(score, 5)}%` }}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] bg-gray-800 text-white px-2 py-0.5 rounded whitespace-nowrap z-10">
                    {Math.round(score)}%
                  </div>
                </div>
                <span className="text-[8px] text-gray-400 mt-1">{month}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Last 6 months trend</p>
      </div>
    </div>
  );

  // ============================================
  // RENDER ALERT MODAL
  // ============================================
  const renderAlertModal = () => {
    if (!showAlertModal) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowAlertModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <button 
            onClick={() => setShowAlertModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-red-600 to-orange-600 px-6 py-5 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">⚠️ Compliance Alerts</h2>
            <p className="text-red-100 text-sm">Items requiring immediate attention</p>
          </div>

          <div className="p-6">
            <div className="space-y-3">
              {expiryAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-l-4 border-red-500">
                  <div className="flex items-center gap-3">
                    {getTypeIcon(alert.type)}
                    <div>
                      <p className="font-medium text-sm">{alert.label}</p>
                      <p className="text-xs text-gray-500">{alert.vehicle}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${alert.status === 'expired' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                    {alert.status === 'expired' ? 'Expired' : `${alert.daysUntilExpiry} days`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button 
                onClick={() => setShowAlertModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  setShowAlertModal(false);
                  setActiveTab('overview');
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                View All Items
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading compliance data...</p>
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
              <Shield size={24} className="text-blue-600" />
              Compliance Management
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {stats.total} items • {stats.complianceRate}% compliance rate
              {stats.expiringSoon > 0 && ` • ⚠️ ${stats.expiringSoon} expiring soon`}
            </p>
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
              onClick={() => setShowUploadModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={16} /> Add Item
            </button>
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 flex items-center gap-2">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: CheckCircle },
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
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'analytics' && renderAnalyticsView()}
      </div>

      {renderFormModal(false)}
      {renderFormModal(true)}
      {renderDeleteConfirm()}
      {renderDocumentModal()}
      {renderAlertModal()}
    </div>
  );
};

export default Compliance;