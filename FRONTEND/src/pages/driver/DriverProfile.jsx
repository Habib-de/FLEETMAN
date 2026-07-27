import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Award, MapPin, 
  Car, Shield, AlertCircle, 
  Edit, Save, X, BarChart3,
  Camera, Key, CheckCircle, AlertTriangle,
  Calendar, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  driverService, 
  tripService, 
  userService,
  vehicleService
} from '../../services/api';

const DriverProfile = () => {
  const { currentUser, updateAvatar  } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef(null);
  
  // State for driver data
  const [driver, setDriver] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    license: '',
    licenseExpiry: '',
    driverId: '',
    assignedVehicle: '',
    assignedVehicleId: '',
    joinedDate: '',
    safetyScore: 0,
    status: '',
    avatar: '',
    tenantId: ''
  });
  
  const [originalDriver, setOriginalDriver] = useState({});
  
  // State for stats
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDistance: '0 km',
    violations: 0,
    monthlyScores: []
  });

  // State for achievements
  const [achievements, setAchievements] = useState([]);
  
  // Password reset state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // ============================================
  // LOAD DRIVER DATA FROM API
  // ============================================
  const loadDriverData = async () => {
    console.log('📋 ========== LOAD DRIVER DATA START ==========');
    console.log('📋 Current user:', currentUser);
    
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      if (!currentUser) {
        console.log('❌ No current user');
        setErrorMessage('Please login to view your profile');
        setIsLoading(false);
        return;
      }

      console.log('✅ Current user ID:', currentUser.id);
      console.log('✅ Current user email:', currentUser.email);
      console.log('✅ Current user driverId:', currentUser.driverId);
      console.log('✅ Current user tenantId:', currentUser.tenantId);
      console.log('✅ Current user avatar:', currentUser.avatar ? '✅ Has avatar' : '❌ No avatar');

      const tenantId = currentUser.tenantId;
      let driverData = null;

      // 1. Get driver profile from API
      if (currentUser.driverId) {
        console.log('📡 Fetching driver by ID:', currentUser.driverId);
        try {
          const driverRes = await driverService.getById(currentUser.driverId);
          console.log('📡 Driver response:', driverRes);
          if (driverRes?.success && driverRes?.data) {
            driverData = driverRes.data;
            console.log('✅ Driver found:', driverData);
            console.log('✅ Driver avatar field:', driverData.avatar ? 'Has avatar' : 'No avatar');
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch driver:', error.message);
        }
      }

      // If no driver found, try to find by user ID
      if (!driverData) {
        console.log('📡 No driver by ID, searching by user ID...');
        try {
          const driversRes = await driverService.getAll(tenantId);
          console.log('📡 All drivers response:', driversRes);
          if (driversRes?.success && driversRes?.data) {
            const driversList = Array.isArray(driversRes.data) ? driversRes.data : [driversRes.data];
            console.log('📡 Found', driversList.length, 'drivers');
            driverData = driversList.find(d => 
              d.userId === currentUser?.id || 
              d.user_id === currentUser?.id ||
              d.email === currentUser?.email
            );
            console.log('📡 Found driver by user ID:', driverData);
          }
        } catch (error) {
          console.warn('⚠️ Could not find driver:', error.message);
        }
      }

      if (!driverData) {
        console.log('❌ No driver profile found!');
        setErrorMessage('Driver profile not found. Please contact your fleet manager.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Driver data loaded:', {
        id: driverData.id,
        name: driverData.name,
        email: driverData.email,
        driverId: driverData.driverId || driverData.driver_id,
        assignedVehicle: driverData.assignedVehicleId || driverData.assigned_vehicle,
        safetyScore: driverData.safetyScore || driverData.safety_score,
        avatar: driverData.avatar ? 'Has avatar' : 'No avatar'
      });

      // 2. Get vehicle info if assigned
      let vehicleReg = 'Not Assigned';
      const vehicleId = driverData.assignedVehicleId || driverData.assigned_vehicle;
      console.log('📡 Vehicle ID from driver:', vehicleId);
      
      if (vehicleId) {
        try {
          console.log('📡 Fetching vehicle by ID:', vehicleId);
          const vehicleRes = await vehicleService.getById(vehicleId);
          console.log('📡 Vehicle response:', vehicleRes);
          if (vehicleRes?.success && vehicleRes?.data) {
            vehicleReg = vehicleRes.data.registration || vehicleRes.data.reg || vehicleId;
            console.log('✅ Vehicle found:', vehicleReg);
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch vehicle:', error.message);
        }
      } else {
        console.log('ℹ️ No vehicle assigned to this driver');
      }

      // 3. Set driver state
      const avatarUrl = currentUser?.avatar || driverData?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(driverData.name || 'Driver')}&background=1e293b&color=fff&size=120`;
      console.log('📸 Final avatar URL:', avatarUrl ? '✅ Set' : '❌ Not set');
      
      setDriver({
        id: driverData.id || '',
        name: driverData.name || '',
        email: driverData.email || '',
        phone: driverData.phone || '',
        license: driverData.licenseNumber || driverData.license_number || '',
        licenseExpiry: driverData.licenseExpiry || driverData.license_expiry || '',
        driverId: driverData.driverId || driverData.driver_id || '',
        assignedVehicle: vehicleReg,
        assignedVehicleId: vehicleId || '',
        joinedDate: driverData.createdAt ? driverData.createdAt.split('T')[0] : '',
        safetyScore: driverData.safetyScore || driverData.safety_score || 0,
        status: driverData.status || 'Active',
        tenantId: driverData.tenantId || '',
        avatar: avatarUrl
      });

      // 4. Load trips for stats
      let totalTrips = 0;
      let totalDistance = 0;
      let violations = 0;
      const monthlyScores = [];
      
      console.log('📡 Fetching trips for stats...');
      try {
        const tripsRes = await tripService.getAll(tenantId);
        console.log('📡 Trips response:', tripsRes);
        if (tripsRes?.success && tripsRes?.data) {
          const allTrips = Array.isArray(tripsRes.data) ? tripsRes.data : [tripsRes.data];
          console.log('📡 Found', allTrips.length, 'total trips');
          
          const driverTrips = allTrips.filter(t => 
            t.driverId === driverData.id || 
            t.driver_id === driverData.id ||
            t.driverName === driverData.name
          );
          console.log('📡 Found', driverTrips.length, 'trips for this driver');
          
          totalTrips = driverTrips.length;
          
          driverTrips.forEach(trip => {
            const dist = parseFloat(trip.distance);
            if (!isNaN(dist)) totalDistance += dist;
            if (trip.status === 'violation' || trip.hasViolation) violations++;
          });
          
          // Generate monthly scores from trip data
          if (driverTrips.length > 0) {
            const tripsByMonth = {};
            driverTrips.forEach(trip => {
              const date = trip.startTime || trip.start_time || trip.createdAt;
              if (date) {
                const month = date.substring(0, 7);
                if (!tripsByMonth[month]) tripsByMonth[month] = [];
                tripsByMonth[month].push(trip);
              }
            });
            
            const months = Object.keys(tripsByMonth).sort();
            const recentMonths = months.slice(-6);
            
            recentMonths.forEach(month => {
              const monthTrips = tripsByMonth[month];
              const completed = monthTrips.filter(t => t.status === 'Completed').length;
              const rate = monthTrips.length > 0 ? (completed / monthTrips.length) * 100 : 0;
              const score = Math.min(100, Math.max(70, 70 + rate * 0.3));
              monthlyScores.push(Math.round(score));
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch trips:', error.message);
      }

      setStats({
        totalTrips: totalTrips,
        totalDistance: totalDistance > 0 ? `${totalDistance.toFixed(0)} km` : '0 km',
        violations: violations,
        monthlyScores: monthlyScores.length > 0 ? monthlyScores.slice(0, 6) : [85, 85, 85, 85, 85, 85]
      });

      // 5. Build achievements from real data
      const achievementsList = [];
      
      if (totalTrips > 0) {
        if (totalTrips >= 100) {
          achievementsList.push({ 
            title: `${totalTrips} Trips Completed`, 
            date: new Date().toISOString().split('T')[0], 
            icon: Car 
          });
        } else if (totalTrips >= 50) {
          achievementsList.push({ 
            title: `${totalTrips} Trips Completed`, 
            date: new Date().toISOString().split('T')[0], 
            icon: Car 
          });
        } else if (totalTrips >= 10) {
          achievementsList.push({ 
            title: `${totalTrips} Trips Completed`, 
            date: new Date().toISOString().split('T')[0], 
            icon: Car 
          });
        }
      }
      
      const safetyScore = driverData.safetyScore || driverData.safety_score || 0;
      if (safetyScore >= 95) {
        achievementsList.push({ 
          title: 'Excellent Safety Score', 
          date: new Date().toISOString().split('T')[0], 
          icon: Shield 
        });
      } else if (safetyScore >= 85) {
        achievementsList.push({ 
          title: 'Good Safety Score', 
          date: new Date().toISOString().split('T')[0], 
          icon: Shield 
        });
      }
      
      const licenseExpiry = driverData.licenseExpiry || driverData.license_expiry;
      if (licenseExpiry) {
        const expiryDate = new Date(licenseExpiry);
        const today = new Date();
        if (expiryDate > today) {
          achievementsList.push({ 
            title: 'Valid License', 
            date: licenseExpiry, 
            icon: Award 
          });
        }
      }
      
      if (vehicleId) {
        achievementsList.push({ 
          title: 'Vehicle Assigned', 
          date: new Date().toISOString().split('T')[0], 
          icon: Car 
        });
      }
      
      if (achievementsList.length === 0) {
        achievementsList.push({ 
          title: 'Welcome to Fleetman', 
          date: new Date().toISOString().split('T')[0], 
          icon: Award 
        });
      }
      
      setAchievements(achievementsList);
      console.log('🏆 Achievements:', achievementsList.length);
      
    } catch (error) {
      console.error('❌ Error loading driver data:', error);
      setErrorMessage('Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
      console.log('📋 ========== LOAD DRIVER DATA END ==========');
    }
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
  // HANDLE PROFILE UPDATE
  // ============================================
  const handleSave = async () => {
    console.log('💾 ========== SAVE PROFILE START ==========');
    console.log('💾 Driver data:', driver);
    
    setIsLoading(true);
    
    try {
      // Update driver profile via API
      const updateData = {
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.license,
        licenseExpiry: driver.licenseExpiry,
        status: driver.status
      };
      
      console.log('📤 Sending update to API:', updateData);
      const response = await driverService.update(driver.id, updateData);
      console.log('📡 Update response:', response);
      
      if (response?.success) {
        console.log('✅ Profile updated successfully');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        await loadDriverData(); // Reload data after save
      } else {
        console.log('❌ Update failed:', response);
        setErrorMessage('Failed to update profile. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error saving driver:', error);
      setErrorMessage('Failed to update profile. Please try again.');
    }
    
    setIsEditing(false);
    setIsLoading(false);
    console.log('💾 ========== SAVE PROFILE END ==========');
  };

  const handleEdit = () => {
    console.log('✏️ Edit mode enabled');
    setOriginalDriver({ ...driver });
    setIsEditing(true);
  };

  const handleCancel = () => {
    console.log('❌ Edit cancelled');
    setDriver(originalDriver);
    setIsEditing(false);
  };

  const handleAvatarChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  console.log('📸 Uploading avatar:', file.name);

  try {
    // ✅ UPLOAD TO SERVER
    const response = await updateAvatar(file);
    console.log('📸 Upload response:', response);
    
    if (response?.success) {
      // ✅ Show preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setDriver({ ...driver, avatar: reader.result });
      };
      reader.readAsDataURL(file);
    }
  } catch (error) {
    console.error('Upload failed:', error);
    setErrorMessage('Failed to upload avatar');
  }
};
  // ============================================
  // HANDLE PASSWORD RESET
  // ============================================
  const handleResetPassword = async () => {
    console.log('🔑 ========== RESET PASSWORD START ==========');
    console.log('🔑 Current user ID:', currentUser?.id);
    
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword) {
      console.log('❌ No current password');
      setPasswordError('Please enter your current password');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      console.log('❌ New password too short');
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      console.log('❌ Passwords do not match');
      setPasswordError('Passwords do not match');
      return;
    }

    console.log('🔑 Password validation passed');

    try {
      // Call API to change password
      console.log('📤 Sending password change request...');
      const response = await userService.changePassword(
        currentUser?.id, 
        passwordData.newPassword
      );
      console.log('📡 Password change response:', response);
      
      if (response?.success) {
        console.log('✅ Password reset successful');
        setPasswordSuccess('Password reset successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setTimeout(() => {
          setShowPasswordModal(false);
          setPasswordSuccess('');
        }, 2000);
      } else {
        console.log('❌ Password reset failed:', response);
        setPasswordError('Failed to reset password. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error resetting password:', error);
      setPasswordError('Failed to reset password. Please try again.');
    }
    console.log('🔑 ========== RESET PASSWORD END ==========');
  };

  // ============================================
  // RENDER - LOADING
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER - ERROR
  // ============================================
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center p-8 max-w-md">
          <div className="w-24 h-24 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-4">
            <AlertCircle size={48} className="text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Profile Not Found</h3>
          <p className="text-gray-500">{errorMessage}</p>
          <button
            onClick={() => {
              console.log('🔄 Retry loading profile...');
              loadDriverData();
            }}
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
  // RENDER - PROFILE
  // ============================================
  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm text-green-700">Profile updated successfully!</p>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            console.log('🔄 Manual refresh triggered');
            loadDriverData();
          }}
          className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Profile Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex flex-wrap items-center gap-6">
          {/* Avatar with Upload */}
          <div className="relative group">
            <img 
              src={driver.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name || 'Driver')}&background=1e293b&color=fff&size=120`} 
              alt={driver.name || 'Driver'} 
              className="w-24 h-24 rounded-full border-4 border-white/30 object-cover"
              onError={(e) => {
                console.log('❌ Avatar image failed to load, using fallback');
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name || 'Driver')}&background=1e293b&color=fff&size=120`;
              }}
            />
            {isEditing && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-500 p-1.5 rounded-full border-2 border-white hover:bg-blue-400 transition-colors"
                >
                  <Camera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{driver.name || 'Driver'}</h2>
                <p className="text-blue-100">{driver.driverId || 'No ID'} · {driver.assignedVehicle || 'No Vehicle'}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{driver.status || 'Active'}</span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Award size={12} /> Score: {driver.safetyScore || 0}
                  </span>
                  {driver.joinedDate && (
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar size={12} /> Joined: {driver.joinedDate}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {!isEditing ? (
                  <button 
                    onClick={handleEdit}
                    className="bg-white/20 px-4 py-2 rounded-lg text-sm hover:bg-white/30 transition-colors flex items-center gap-2"
                  >
                    <Edit size={16} /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handleSave}
                      className="bg-green-500 px-4 py-2 rounded-lg text-sm hover:bg-green-400 transition-colors flex items-center gap-2"
                    >
                      <Save size={16} /> Save
                    </button>
                    <button 
                      onClick={handleCancel}
                      className="bg-red-500/50 px-4 py-2 rounded-lg text-sm hover:bg-red-500/70 transition-colors flex items-center gap-2"
                    >
                      <X size={16} /> Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Trips', value: stats.totalTrips || 0, icon: Car, color: 'blue' },
          { label: 'Total Distance', value: stats.totalDistance || '0 km', icon: MapPin, color: 'green' },
          { label: 'Safety Score', value: `${driver.safetyScore || 0}/100`, icon: Shield, color: 'purple' },
          { label: 'Violations', value: stats.violations || 0, icon: AlertCircle, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 bg-${stat.color}-50 rounded-lg text-${stat.color}-600`}>
                <stat.icon size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Score Trend */}
      {stats.monthlyScores && stats.monthlyScores.some(s => s > 0) && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" />
            Safety Score Trend (Last 6 Months)
          </h4>
          <div className="h-20 flex items-end justify-between gap-1">
            {stats.monthlyScores.map((score, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div 
                  className={`w-full rounded-t ${score >= 90 ? 'bg-green-400' : score >= 80 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ height: `${Math.min((score / 100) * 100, 100)}%` }}
                >
                  <div className="text-[8px] text-white text-center pt-1">{score}</div>
                </div>
                <span className="text-[8px] text-gray-400 mt-1">M{i+1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <User size={16} className="text-blue-600" />
            Personal Information
          </h4>
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.name}
                    onChange={(e) => {
                      console.log('✏️ Name changed to:', e.target.value);
                      setDriver({...driver, name: e.target.value});
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.email}
                    onChange={(e) => {
                      console.log('✏️ Email changed to:', e.target.value);
                      setDriver({...driver, email: e.target.value});
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Phone</label>
                  <input 
                    type="tel" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.phone}
                    onChange={(e) => {
                      console.log('✏️ Phone changed to:', e.target.value);
                      setDriver({...driver, phone: e.target.value});
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">Full Name</span>
                  <span className="text-sm font-medium">{driver.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">Email</span>
                  <span className="text-sm font-medium">{driver.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">Phone</span>
                  <span className="text-sm font-medium">{driver.phone || 'N/A'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* License & Vehicle */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Car size={16} className="text-green-600" />
            License & Vehicle
          </h4>
          <div className="space-y-3">
            {isEditing ? (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">License Number</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.license}
                    onChange={(e) => {
                      console.log('✏️ License changed to:', e.target.value);
                      setDriver({...driver, license: e.target.value});
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">License Expiry</label>
                  <input 
                    type="date" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.licenseExpiry}
                    onChange={(e) => {
                      console.log('✏️ License expiry changed to:', e.target.value);
                      setDriver({...driver, licenseExpiry: e.target.value});
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Driver ID</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.driverId}
                    onChange={(e) => {
                      console.log('✏️ Driver ID changed to:', e.target.value);
                      setDriver({...driver, driverId: e.target.value});
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Assigned Vehicle</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={driver.assignedVehicle}
                    onChange={(e) => {
                      console.log('✏️ Assigned vehicle changed to:', e.target.value);
                      setDriver({...driver, assignedVehicle: e.target.value});
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">License</span>
                  <span className="text-sm font-medium">{driver.license || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">License Expiry</span>
                  <span className={`text-sm font-medium ${driver.licenseExpiry && driver.licenseExpiry < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-green-600'}`}>
                    {driver.licenseExpiry || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">Driver ID</span>
                  <span className="text-sm font-medium font-mono">{driver.driverId || 'N/A'}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-500">Assigned Vehicle</span>
                  <span className="text-sm font-medium">{driver.assignedVehicle || 'Not Assigned'}</span>
                </div>
                {driver.joinedDate && (
                  <div className="flex justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-500">Joined</span>
                    <span className="text-sm font-medium">{driver.joinedDate}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Reset Password Button */}
          <button
            onClick={() => {
              console.log('🔑 Password modal opened');
              setShowPasswordModal(true);
            }}
            className="mt-4 w-full py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-sm hover:bg-yellow-100 transition-colors flex items-center justify-center gap-2"
          >
            <Key size={16} /> Reset Password
          </button>
        </div>
      </div>

      {/* Achievements */}
      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
            <Award size={16} className="text-yellow-600" />
            Achievements
          </h4>
          <div className="space-y-2">
            {achievements.length > 0 ? (
              achievements.map((achievement, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    <achievement.icon size={16} className="text-yellow-600" />
                    <span className="text-sm">{achievement.title}</span>
                  </div>
                  <span className="text-xs text-gray-400">{achievement.date}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No achievements yet. Start driving to earn rewards!</p>
            )}
          </div>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Key size={20} className="text-yellow-600" />
                Reset Password
              </h3>
              <button 
                onClick={() => {
                  console.log('🔑 Password modal closed');
                  setShowPasswordModal(false);
                  setPasswordError('');
                  setPasswordSuccess('');
                  setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: ''
                  });
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => {
                    console.log('🔑 Current password entered');
                    setPasswordData({...passwordData, currentPassword: e.target.value});
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => {
                    console.log('🔑 New password entered');
                    setPasswordData({...passwordData, newPassword: e.target.value});
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => {
                    console.log('🔑 Confirm password entered');
                    setPasswordData({...passwordData, confirmPassword: e.target.value});
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm new password"
                />
              </div>

              {passwordError && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{passwordError}</p>
                </div>
              )}

              {passwordSuccess && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-600">{passwordSuccess}</p>
                </div>
              )}

              <button
                onClick={handleResetPassword}
                className="w-full py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center gap-2"
              >
                <Key size={18} /> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverProfile;