import React, { useState, useEffect, useRef } from 'react';
import { 
  ClipboardCheck, CheckCircle, AlertCircle, XCircle,
  Car, Wrench, Fuel, Lightbulb,
  AlertTriangle, Save, Printer, Truck, User, Clock, History, RefreshCw,
  Camera, Signature, Send, Image as ImageIcon, X, Eye
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  driverService, 
  vehicleService, 
  checklistService
} from '../../services/api';

// ============================================
// HELPER: Compress image before upload
// ============================================
const compressImage = (base64String, maxWidth = 800, maxHeight = 800, quality = 0.85) => {
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

// ============================================
// SIGNATURE PAD COMPONENT
// ============================================
const SignaturePad = ({ onSave, onClear, value }) => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#1a1a1a';
    setCtx(context);

    if (value) {
      const img = new Image();
      img.onload = () => {
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, []);

  const getPosition = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDrawing = (e) => {
    e.preventDefault();
    setIsDrawing(false);
    if (onSave) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (onSave) onSave(null);
    if (onClear) onClear();
  };

  return (
    <div className="border-2 border-gray-200 rounded-lg overflow-hidden bg-white">
      <canvas
        ref={canvasRef}
        width={600}
        height={150}
        className="w-full touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={endDrawing}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={endDrawing}
      />
      <div className="flex justify-end p-1 bg-gray-50 border-t border-gray-200">
        <button
          onClick={clearSignature}
          className="text-xs text-red-600 hover:text-red-800 px-2 py-1"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

const Checklist = () => {
  const { currentUser } = useAuth();
  
  // ============================================
  // DEFAULT CHECKLIST ITEMS
  // ============================================
  const defaultChecklistItems = [
    { id: 1, label: 'Tire Pressure & Condition', status: 'pending', note: '', category: 'Tires', photo: null, defect: false },
    { id: 2, label: 'Engine Oil Level', status: 'pending', note: '', category: 'Engine', photo: null, defect: false },
    { id: 3, label: 'Coolant Level', status: 'pending', note: '', category: 'Engine', photo: null, defect: false },
    { id: 4, label: 'Brake Fluid', status: 'pending', note: '', category: 'Brakes', photo: null, defect: false },
    { id: 5, label: 'Headlights & Signals', status: 'pending', note: '', category: 'Lights', photo: null, defect: false },
    { id: 6, label: 'Windscreen & Wipers', status: 'pending', note: '', category: 'Exterior', photo: null, defect: false },
    { id: 7, label: 'Emergency Kit', status: 'pending', note: '', category: 'Safety', photo: null, defect: false },
    { id: 8, label: 'Driver ID Tag', status: 'pending', note: '', category: 'Driver', photo: null, defect: false },
    { id: 9, label: 'Fuel Level', status: 'pending', note: '', category: 'Fuel', photo: null, defect: false },
    { id: 10, label: 'Brake Performance', status: 'pending', note: '', category: 'Brakes', photo: null, defect: false },
  ];

  // ============================================
  // STATE
  // ============================================
  const [checklistItems, setChecklistItems] = useState(defaultChecklistItems);
  const [currentVehicle, setCurrentVehicle] = useState('');
  const [assignedVehicle, setAssignedVehicle] = useState(null);
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [driverName, setDriverName] = useState('');
  const [driverVehicles, setDriverVehicles] = useState([]);
  const [savedChecklists, setSavedChecklists] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checklistId, setChecklistId] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [signature, setSignature] = useState(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Image modal states (like Compliance page)
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  
  const photoInputRefs = useRef({});

  // ============================================
  // LOAD DRIVER & VEHICLE DATA
  // ============================================
  const loadDriverData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view your checklist');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenantId = currentUser.tenantId;
      
      let driver = null;
      if (currentUser.driverId) {
        try {
          const driverRes = await driverService.getById(currentUser.driverId);
          if (driverRes?.success && driverRes?.data) {
            driver = driverRes.data;
          }
        } catch (error) {
          console.warn('Could not fetch driver:', error.message);
        }
      }

      if (!driver && currentUser.email) {
        try {
          const driversRes = await driverService.getAll(tenantId);
          if (driversRes?.success && driversRes?.data) {
            const driversList = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
            driver = driversList.find(d => 
              d.email?.toLowerCase() === currentUser.email?.toLowerCase() ||
              d.userId === currentUser.id ||
              d.user_id === currentUser.id
            );
          }
        } catch (error) {
          console.warn('Could not find driver:', error.message);
        }
      }

      if (!driver) {
        setErrorMessage('Driver profile not found. Please contact your fleet manager.');
        setIsDataLoading(false);
        return;
      }

      setDriverName(driver.name || currentUser.name || 'Unknown Driver');

      const vehicleId = driver.assignedVehicleId || driver.assigned_vehicle || driver.vehicle_id;
      
      if (vehicleId) {
        try {
          const vehicleRes = await vehicleService.getById(vehicleId);
          if (vehicleRes?.success && vehicleRes?.data) {
            const vehicle = vehicleRes.data;
            setAssignedVehicle(vehicle);
            setCurrentVehicle(vehicle.registration || vehicle.reg || vehicle.id);
            setDriverVehicles([vehicle]);
            
            await loadSavedChecklists(vehicle);
            await loadLastChecklistForVehicle(vehicle);
          }
        } catch (error) {
          console.warn('Could not fetch vehicle:', error.message);
        }
      } else {
        console.warn('⚠️ No vehicle ID found in driver');
        await loadSavedChecklists(null);
        await loadLastChecklistForVehicle(null);
      }

    } catch (error) {
      console.error('Error loading driver data:', error);
      setErrorMessage('Failed to load data. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // ============================================
  // LOAD SAVED CHECKLISTS FROM API
  // ============================================
  const loadSavedChecklists = async (vehicle) => {
    const vehicleId = vehicle?.id || assignedVehicle?.id;
    
    if (!currentUser?.tenantId || !vehicleId) return;
    
    try {
      const response = await checklistService.getHistory(vehicleId, currentUser.tenantId);
      if (response?.success && response?.data) {
        setSavedChecklists(response.data);
      }
    } catch (error) {
      console.error('Failed to load checklists:', error);
    }
  };

  // ============================================
  // LOAD LAST CHECKLIST FOR VEHICLE
  // ============================================
  const loadLastChecklistForVehicle = async (vehicle) => {
    const vehicleId = vehicle?.id || assignedVehicle?.id;
    
    if (!currentUser?.tenantId || !vehicleId) return;
    
    try {
      const response = await checklistService.getHistory(vehicleId, currentUser.tenantId);
      if (response?.success && response?.data && response.data.length > 0) {
        const last = response.data[0];
        if (last && last.items) {
          try {
            const items = typeof last.items === 'string' ? JSON.parse(last.items) : last.items;
            setChecklistItems(items);
            setChecklistId(last.id);
            setInspectionDate(last.inspectionDate?.split('T')[0] || last.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]);
            setSignature(last.signature || null);
          } catch (e) {
            resetChecklist();
          }
        } else {
          resetChecklist();
        }
      } else {
        resetChecklist();
      }
    } catch (error) {
      resetChecklist();
    }
  };

  // ============================================
  // RESET CHECKLIST
  // ============================================
  const resetChecklist = () => {
    setChecklistItems(defaultChecklistItems);
    setChecklistId(null);
    setSignature(null);
  };

  // ============================================
  // PHOTO HANDLING
  // ============================================
  const handlePhotoUpload = async (itemId, e) => {
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
        setChecklistItems(prev => prev.map(item => 
          item.id === itemId ? { ...item, photo: compressedBase64 } : item
        ));
        setSuccessMessage('Photo uploaded successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (error) {
        setErrorMessage('Failed to process image. Please try again.');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const removePhoto = (itemId) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, photo: null } : item
    ));
  };

  const viewPhoto = (photo) => {
    if (photo) {
      setSelectedImage(photo);
      setShowImageModal(true);
    }
  };

  // ============================================
  // TOGGLE DEFECT
  // ============================================
  const toggleDefect = (id) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === id ? { ...item, defect: !item.defect } : item
    ));
  };

  // ============================================
  // SAVE CHECKLIST TO API
  // ============================================
  const saveChecklist = async () => {
    if (!currentVehicle) {
      setErrorMessage('No vehicle selected. Please select a vehicle.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const total = checklistItems.length;
      const passed = checklistItems.filter(i => i.status === 'pass').length;
      const failed = checklistItems.filter(i => i.status === 'fail').length;
      const pending = checklistItems.filter(i => i.status === 'pending').length;
      const defects = checklistItems.filter(i => i.defect).length;

      const vehicleId = assignedVehicle?.id;
      
      if (!vehicleId) {
        setErrorMessage('Vehicle ID not found. Please reload the page.');
        setIsLoading(false);
        return;
      }

      const checklistData = {
        tenant: { id: currentUser?.tenantId },
        vehicle: { id: vehicleId },
        driver: currentUser?.driverId ? { id: currentUser.driverId } : null,
        driverName: driverName || 'Unknown Driver',
        type: 'pre_trip',
        status: failed > 0 ? 'failed' : pending > 0 ? 'in_progress' : 'completed',
        items: JSON.stringify(checklistItems),
        totalItems: total,
        passedItems: passed,
        failedItems: failed,
        defects: defects,
        completionRate: Math.round((passed / total) * 100),
        signature: signature,
        inspectionDate: inspectionDate ? new Date(inspectionDate).toISOString() : null,
      };

      let response;
      if (checklistId) {
        response = await checklistService.update(checklistId, checklistData);
      } else {
        response = await checklistService.create(checklistData);
      }

      if (response?.success) {
        const data = response.data;
        setChecklistId(data.id);
        await loadSavedChecklists(assignedVehicle);

        if (failed === 0 && pending === 0 && defects === 0) {
          setSuccessMessage(`✅ Inspection complete! All ${total} items passed!`);
        } else if (defects > 0) {
          setSuccessMessage(`⚠️ Inspection saved. ${defects} defects reported.`);
        } else if (failed > 0) {
          setSuccessMessage(`⚠️ Inspection saved. ${failed} items need attention.`);
        } else {
          setSuccessMessage(`📋 Inspection saved. ${pending} items pending.`);
        }
      } else {
        setErrorMessage(response?.message || 'Failed to save checklist');
      }
    } catch (error) {
      console.error('Error saving checklist:', error);
      setErrorMessage('Failed to save checklist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // SUBMIT CHECKLIST TO FLEET MANAGER
  // ============================================
  const submitChecklist = async () => {
    if (!signature) {
      setErrorMessage('Please add your signature before submitting.');
      setShowSignatureModal(true);
      return;
    }

    if (!checklistId) {
      setErrorMessage('Please save the checklist first before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await checklistService.submit(checklistId, 'Fleet Manager');
      
      if (response?.success) {
        setSuccessMessage('✅ Inspection submitted to fleet manager successfully!');
        setShowSignatureModal(false);
        await loadSavedChecklists(assignedVehicle);
      } else {
        setErrorMessage(response?.message || 'Failed to submit checklist');
      }
    } catch (error) {
      console.error('Error submitting checklist:', error);
      setErrorMessage('Failed to submit checklist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // LOAD CHECKLIST FROM HISTORY
  // ============================================
  const loadChecklistFromHistory = (checklist) => {
    try {
      const items = typeof checklist.items === 'string' ? JSON.parse(checklist.items) : checklist.items;
      setChecklistItems(items);
      setChecklistId(checklist.id);
      setInspectionDate(checklist.inspectionDate?.split('T')[0] || checklist.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setCurrentVehicle(checklist.vehicleId || checklist.vehicle_id);
      setSignature(checklist.signature || null);
      setShowHistory(false);
      setSuccessMessage(`Loaded checklist from ${new Date(checklist.createdAt || checklist.created_at).toLocaleDateString()}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (e) {
      console.error('Error loading checklist from history:', e);
      setErrorMessage('Failed to load checklist from history');
    }
  };

  // ============================================
  // TOGGLE STATUS
  // ============================================
  const toggleStatus = (id) => {
    setChecklistItems(prev => prev.map(item => {
      if (item.id === id) {
        const statusMap = { pass: 'fail', fail: 'pending', pending: 'pass' };
        const newStatus = statusMap[item.status];
        if (newStatus === 'fail' && !item.defect) {
          return { ...item, status: newStatus, defect: true };
        }
        return { ...item, status: newStatus };
      }
      return item;
    }));
  };

  // ============================================
  // UPDATE NOTE
  // ============================================
  const updateNote = (id, note) => {
    setChecklistItems(prev => prev.map(item => 
      item.id === id ? { ...item, note } : item
    ));
  };

  // ============================================
  // HELPERS
  // ============================================
  const getStatusIcon = (status) => {
    switch(status) {
      case 'pass': return <CheckCircle size={18} className="text-green-600" />;
      case 'fail': return <XCircle size={18} className="text-red-600" />;
      case 'pending': return <AlertCircle size={18} className="text-yellow-600" />;
      default: return null;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pass': return 'bg-green-100 text-green-700';
      case 'fail': return 'bg-red-100 text-red-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const stats = {
    total: checklistItems.length,
    passed: checklistItems.filter(i => i.status === 'pass').length,
    failed: checklistItems.filter(i => i.status === 'fail').length,
    pending: checklistItems.filter(i => i.status === 'pending').length,
    defects: checklistItems.filter(i => i.defect).length,
    completionRate: Math.round((checklistItems.filter(i => i.status === 'pass').length / checklistItems.length) * 100),
  };

  const categories = [...new Set(checklistItems.map(i => i.category))];

  // ============================================
  // RENDER IMAGE MODAL (Like Compliance page)
  // ============================================
  const renderImageModal = () => {
    if (!showImageModal || !selectedImage) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowImageModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-4">
          <button 
            onClick={() => setShowImageModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>
          <div className="flex items-center justify-center p-4">
            <img 
              src={selectedImage} 
              alt="Inspection" 
              className="max-h-[80vh] max-w-full object-contain rounded-lg"
            />
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // LOAD DATA ON MOUNT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadDriverData();
    }
  }, [currentUser]);

  // ============================================
  // RENDER - LOADING
  // ============================================
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading checklist data...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - NO DRIVER
  // ============================================
  if (errorMessage && !driverName) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 rounded-full bg-yellow-100 mx-auto flex items-center justify-center mb-4">
            <Truck size={48} className="text-yellow-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Driver Profile</h3>
          <p className="text-gray-500">{errorMessage}</p>
          <button
            onClick={loadDriverData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - MAIN
  // ============================================
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
              <ClipboardCheck size={24} className="text-blue-600" />
              Vehicle Inspection Checklist
            </h3>
            <p className="text-sm text-gray-500 mt-1">Complete pre-trip inspections with photos and signature</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600 font-medium">{driverName || 'Driver'}</span>
            </div>
            {signature && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle size={12} /> Signed
              </span>
            )}
            {checklistId && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                ID: {checklistId.substring(0, 8)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Selection */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-blue-600" />
            <label className="text-sm font-medium text-gray-700">Vehicle:</label>
          </div>
          
          {driverVehicles.length === 0 ? (
            <div className="flex items-center gap-2 text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg">
              <AlertTriangle size={16} />
              <span className="text-sm">No vehicles assigned</span>
            </div>
          ) : driverVehicles.length === 1 ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {driverVehicles[0].registration || driverVehicles[0].reg || driverVehicles[0].id}
              </span>
              <span className="text-xs text-gray-500">
                {driverVehicles[0].make || ''} {driverVehicles[0].model || ''}
              </span>
            </div>
          ) : (
            <select 
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              value={currentVehicle}
              onChange={(e) => {
                setCurrentVehicle(e.target.value);
                const vehicle = driverVehicles.find(v => (v.registration || v.reg || v.id) === e.target.value);
                setAssignedVehicle(vehicle || null);
              }}
            >
              {driverVehicles.map(v => {
                const id = v.registration || v.reg || v.id;
                return (
                  <option key={id} value={id}>
                    {id} - {v.make || ''} {v.model || ''}
                  </option>
                );
              })}
            </select>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-600">Date:</label>
            <input 
              type="date" 
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
            />
          </div>
        </div>

        {assignedVehicle && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 border-t border-gray-100 pt-2">
            <span>VIN: {assignedVehicle.vin || 'N/A'}</span>
            <span>|</span>
            <span>Color: {assignedVehicle.color || 'N/A'}</span>
            <span>|</span>
            <span>License: {assignedVehicle.licenseExpiry || 'N/A'}</span>
            <span>|</span>
            <span>Odometer: {assignedVehicle.mileage || 'N/A'} km</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Total Items</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Passed</p>
          <p className="text-2xl font-bold text-green-600">{stats.passed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Failed</p>
          <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Defects</p>
          <p className="text-2xl font-bold text-orange-600">{stats.defects}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Complete</p>
          <p className="text-2xl font-bold text-blue-600">{stats.completionRate}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between text-sm mb-2">
          <span>Inspection Progress</span>
          <span className="font-medium">{stats.completionRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${stats.completionRate >= 80 ? 'bg-green-500' : stats.completionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${stats.completionRate}%` }}
          ></div>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h4 className="font-semibold text-sm">Inspection Items</h4>
          <div className="flex flex-wrap items-center gap-2">
            {savedChecklists.length > 0 && (
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-1"
              >
                <History size={14} /> History ({savedChecklists.length})
              </button>
            )}
            <button 
              onClick={() => setShowSignatureModal(true)}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1 ${
                signature ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              <Signature size={14} /> {signature ? 'Signed' : 'Sign'}
            </button>
            <button 
              onClick={resetChecklist}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1"
            >
              Reset
            </button>
            <button 
              onClick={saveChecklist}
              disabled={isLoading || !currentVehicle}
              className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Save size={14} /> {isLoading ? 'Saving...' : 'Save'}
            </button>
            <button 
              onClick={submitChecklist}
              disabled={submitting || !currentVehicle || !checklistId}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
            >
              <Send size={14} /> {submitting ? 'Submitting...' : 'Submit'}
            </button>
            <button className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-1">
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {/* History Panel - Like Compliance Page Cards */}
        {showHistory && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
            <h5 className="text-sm font-medium text-gray-700 mb-2">Previous Checklists</h5>
            {savedChecklists.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {savedChecklists.map((c, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => loadChecklistFromHistory(c)}
                  >
                    <div>
                      <span className="text-sm font-medium">
                        {new Date(c.createdAt || c.created_at).toLocaleDateString()} 
                      </span>
                      <span className="text-xs text-gray-500 ml-2 block">
                        {c.passedItems || c.passed_items}/{c.totalItems || c.total_items} passed
                        {(c.defects || 0) > 0 && ` ⚠️ ${c.defects} defects`}
                      </span>
                      <div className="flex gap-1 mt-1">
                        {c.status === 'completed' && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✅ Complete</span>}
                        {c.status === 'failed' && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">❌ Failed</span>}
                        {c.status === 'in_progress' && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">⏳ In Progress</span>}
                        {c.status === 'submitted' && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">📤 Submitted</span>}
                      </div>
                    </div>
                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Load</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No previous checklists found</p>
            )}
          </div>
        )}

        {categories.map((category) => (
          <div key={category} className="mb-4">
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              {category === 'Tires' && <Car size={16} className="text-blue-600" />}
              {category === 'Engine' && <Wrench size={16} className="text-orange-600" />}
              {category === 'Brakes' && <AlertCircle size={16} className="text-red-600" />}
              {category === 'Lights' && <Lightbulb size={16} className="text-yellow-600" />}
              {category === 'Exterior' && <Car size={16} className="text-green-600" />}
              {category === 'Safety' && <AlertTriangle size={16} className="text-red-600" />}
              {category === 'Driver' && <ClipboardCheck size={16} className="text-purple-600" />}
              {category === 'Fuel' && <Fuel size={16} className="text-yellow-600" />}
              {category}
              <span className="text-xs text-gray-400 ml-2">
                ({checklistItems.filter(item => item.category === category).length} items)
              </span>
            </h5>
            <div className="space-y-2">
              {checklistItems.filter(item => item.category === category).map((item) => (
                <div 
                  key={item.id} 
                  className={`flex flex-wrap items-center justify-between p-3 rounded-lg transition-colors ${
                    item.status === 'pass' ? 'bg-green-50 hover:bg-green-100' :
                    item.status === 'fail' ? 'bg-red-50 hover:bg-red-100' :
                    'bg-yellow-50 hover:bg-yellow-100'
                  } ${item.defect ? 'border-l-4 border-orange-500' : ''}`}
                >
                  <div className="flex items-center gap-3 min-w-[40%]">
                    {getStatusIcon(item.status)}
                    <span className="text-sm font-medium">{item.label}</span>
                    {item.defect && (
                      <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                        ⚠️ Defect
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Photo Upload */}
                    <div className="relative">
                      <input
                        ref={el => photoInputRefs.current[item.id] = el}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(item.id, e)}
                      />
                      <button
                        onClick={() => photoInputRefs.current[item.id]?.click()}
                        className="p-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        title="Add Photo"
                      >
                        <Camera size={14} />
                      </button>
                      {item.photo && (
                        <>
                          <button
                            onClick={() => viewPhoto(item.photo)}
                            className="relative"
                          >
                            <img 
                              src={item.photo} 
                              alt="Inspection" 
                              className="h-10 w-10 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                            />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removePhoto(item.id); }}
                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    {/* Defect Toggle */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleDefect(item.id); }}
                      className={`p-1 text-xs rounded ${item.defect ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                      title={item.defect ? 'Mark as OK' : 'Mark as Defect'}
                    >
                      ⚠️
                    </button>
                    <input 
                      type="text" 
                      className="text-xs border border-gray-200 rounded px-2 py-0.5 w-24 sm:w-32 bg-white"
                      placeholder="Add note..."
                      value={item.note || ''}
                      onChange={(e) => updateNote(item.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleStatus(item.id); }}
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(item.status)}`}
                    >
                      {item.status.toUpperCase()}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Summary:</span>
            <span className="text-green-600">✅ {stats.passed} Passed</span>
            <span className="text-red-600">❌ {stats.failed} Failed</span>
            <span className="text-yellow-600">⏳ {stats.pending} Pending</span>
            <span className="text-orange-600">⚠️ {stats.defects} Defects</span>
          </div>
          {stats.failed === 0 && stats.pending === 0 && stats.defects === 0 && (
            <span className="text-sm text-green-600 font-medium flex items-center gap-1">
              <CheckCircle size={16} /> All items passed! ✅
            </span>
          )}
          {stats.defects > 0 && (
            <span className="text-sm text-orange-600 font-medium flex items-center gap-1">
              <AlertTriangle size={16} /> {stats.defects} defects reported
            </span>
          )}
          {stats.failed > 0 && stats.defects === 0 && (
            <span className="text-sm text-red-600 font-medium flex items-center gap-1">
              <AlertCircle size={16} /> {stats.failed} items need attention
            </span>
          )}
          {stats.pending > 0 && stats.failed === 0 && stats.defects === 0 && (
            <span className="text-sm text-yellow-600 font-medium flex items-center gap-1">
              <Clock size={16} /> {stats.pending} items pending
            </span>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowSignatureModal(false)}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setShowSignatureModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <XCircle size={24} className="text-gray-500 hover:text-gray-700" />
            </button>

            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Signature size={24} className="text-blue-600" />
              Driver Signature
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Sign below to confirm the inspection is complete and accurate.
            </p>

            <SignaturePad 
              onSave={setSignature}
              value={signature}
            />

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowSignatureModal(false);
                  if (!signature) {
                    setErrorMessage('Please add your signature.');
                  }
                }}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {signature ? '✅ Confirm Signature' : 'Skip for now'}
              </button>
              <button
                onClick={() => setShowSignatureModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal - Like Compliance page */}
      {renderImageModal()}
    </div>
  );
};

export default Checklist;