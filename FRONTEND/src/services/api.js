// src/services/api.js

// ============================================
// DYNAMIC API BASE URL - WORKS ON PHONE & COMPUTER
// ============================================
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return `http://${hostname}:8080/api`;
  }
  
  return 'http://localhost:8080/api';
};

const API_BASE_URL = getApiBaseUrl();

// Helper: get token from localStorage
const getToken = () => localStorage.getItem('fleetman_token');

// Helper function for API calls — token auto-attached
const apiCall = async (endpoint, method = 'GET', data = null, customToken = null) => {
  const token = customToken || getToken();
  
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    const text = await response.text();
    
    if (!text || text.trim() === '') {
      throw new Error('Server returned empty response');
    }
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Invalid JSON response:', text);
      throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(result.message || `Request failed with status ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ============================================
// MULTIPART API CALL (for file uploads)
// ============================================
const apiCallMultipart = async (endpoint, method = 'POST', formData, customToken = null) => {
  const token = customToken || getToken();
  
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // DO NOT set Content-Type - browser will set it with boundary

  const config = {
    method,
    headers,
    body: formData
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    const text = await response.text();
    
    if (!text || text.trim() === '') {
      throw new Error('Server returned empty response');
    }
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (parseError) {
      console.error('Invalid JSON response:', text);
      throw new Error(`Server returned invalid response: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(result.message || `Request failed with status ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ============================================
// AUTH SERVICES
// ============================================

export const authService = {
  login: async (email, password) => {
    const response = await apiCall('/auth/login', 'POST', { email, password });
    return response;
  },

  register: async (userData) => {
    const response = await apiCall('/auth/register', 'POST', userData);
    return response;
  },

  forgotPassword: async (email) => {
    const response = await apiCall('/auth/forgot-password', 'POST', { email });
    return response;
  },

  resetPassword: async (token, newPassword) => {
    const response = await apiCall('/auth/reset-password', 'POST', { token, newPassword });
    return response;
  },

  validateToken: async (token) => {
    const response = await apiCall('/auth/validate', 'GET', null, token);
    return response;
  },

  // NEW: Get current user from backend using stored token
  getCurrentUser: async () => {
    const response = await apiCall('/auth/me', 'GET');
    return response;
  },

  logout: () => {
    localStorage.removeItem('fleetman_auth');
    localStorage.removeItem('fleetman_token');
    localStorage.removeItem('fleetman_user');
    localStorage.removeItem('fleetman_role');
  },
};

// ============================================
// TENANT SERVICES
// ============================================

// ============================================
// TENANT SERVICES
// ============================================

export const tenantService = {
  create: async (tenantData) => {
    const response = await apiCall('/tenants', 'POST', tenantData);
    return response;
  },

  getAll: async () => {
    const response = await apiCall('/tenants', 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/tenants/${id}`, 'GET');
    return response;
  },

  getBySubdomain: async (subdomain) => {
    const response = await apiCall(`/tenants/subdomain/${subdomain}`);
    return response;
  },

  isCardPoolingEnabled: async (tenantId) => {
    const response = await apiCall(`/tenants/${tenantId}/card-pooling`);
    return response;
  },

  // ✅ ADD THESE TWO METHODS HERE:
  getLocation: async (id) => {
    const response = await apiCall(`/tenants/${id}/location`, 'GET');
    return response;
  },
  
  updateLocation: async (id, locationData) => {
    const response = await apiCall(`/tenants/${id}/location`, 'PUT', locationData);
    return response;
  },

  // Add these to tenantService (after updateLocation):

  // ✅ MULTI-LOCATION METHODS
  getLocations: async (tenantId) => {
    const response = await apiCall(`/tenants/${tenantId}/locations`, 'GET');
    return response;
  },

  addLocation: async (tenantId, locationData) => {
    const response = await apiCall(`/tenants/${tenantId}/locations`, 'POST', locationData);
    return response;
  },

  updateLocationById: async (tenantId, locationId, locationData) => {
    const response = await apiCall(`/tenants/${tenantId}/locations/${locationId}`, 'PUT', locationData);
    return response;
  },

  deleteLocation: async (tenantId, locationId) => {
    const response = await apiCall(`/tenants/${tenantId}/locations/${locationId}`, 'DELETE');
    return response;
  },

  // ✅ ADD THESE POOL BOOKING METHODS HERE
  requestPoolBooking: async (tenantId, enabled) => {
    const response = await apiCall(`/tenants/${tenantId}/pool-booking/request?enabled=${enabled}`, 'POST');
    return response;
  },

  approvePoolBooking: async (tenantId) => {
    const response = await apiCall(`/tenants/${tenantId}/pool-booking/approve`, 'POST');
    return response;
  },

  denyPoolBooking: async (tenantId, reason) => {
    const response = await apiCall(`/tenants/${tenantId}/pool-booking/deny?reason=${encodeURIComponent(reason)}`, 'POST');
    return response;
  },

  isPoolBookingAvailable: async (tenantId) => {
    const response = await apiCall(`/tenants/${tenantId}/pool-booking/available`, 'GET');
    return response;
  },

  getPoolBookingRequests: async () => {
    const response = await apiCall('/tenants/pool-booking/requests', 'GET');
    return response;
  },
};



// ============================================
// VEHICLE SERVICES
// ============================================

export const vehicleService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/vehicles/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/vehicles/${id}`, 'GET');
    return response;
  },

  create: async (vehicleData) => {
    const response = await apiCall('/vehicles', 'POST', vehicleData);
    return response;
  },

  update: async (id, vehicleData) => {
    const response = await apiCall(`/vehicles/${id}`, 'PUT', vehicleData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/vehicles/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// DRIVER SERVICES
// ============================================

export const driverService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/drivers/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/drivers/${id}`, 'GET');
    return response;
  },

  getByEmail: async (email) => {
    const response = await apiCall(`/drivers/email/${email}`, 'GET');
    return response;
  },

  create: async (driverData) => {
    const response = await apiCall('/drivers', 'POST', driverData);
    return response;
  },

  update: async (id, driverData) => {
    const response = await apiCall(`/drivers/${id}`, 'PUT', driverData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/drivers/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// INCIDENT SERVICES
// ============================================

export const incidentService = {
  getAll: async () => {
    const response = await apiCall('/incidents', 'GET');
    return response;
  },

  getByTenant: async (tenantId) => {
    const response = await apiCall(`/incidents/tenant/${tenantId}`, 'GET');
    return response;
  },

  getByDriver: async (driverId) => {
    const response = await apiCall(`/incidents/driver/${driverId}`, 'GET');
    return response;
  },

  create: async (incidentData) => {
    const response = await apiCall('/incidents', 'POST', incidentData);
    return response;
  },

  update: async (id, incidentData) => {
    const response = await apiCall(`/incidents/${id}`, 'PUT', incidentData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/incidents/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// GEOFENCE SERVICES - MERGED
// ============================================

export const geofenceService = {
  // ==========================================
  // GEOFENCE CRUD (for /geofences endpoints)
  // ==========================================
  
  // Get all geofences
  getAll: async () => {
    const response = await apiCall('/geofences', 'GET');
    return response;
  },

  // Get geofences by tenant
  getByTenant: async (tenantId) => {
    const response = await apiCall(`/geofences/tenant/${tenantId}`, 'GET');
    return response;
  },

  // Get active geofences by tenant
  getActive: async (tenantId) => {
    const response = await apiCall(`/geofences/tenant/${tenantId}/active`, 'GET');
    return response;
  },

  // Get geofence by ID
  getById: async (id) => {
    const response = await apiCall(`/geofences/${id}`, 'GET');
    return response;
  },

  // Create geofence
  create: async (geofenceData) => {
    const response = await apiCall('/geofences', 'POST', geofenceData);
    return response;
  },

  // Update geofence
  update: async (id, geofenceData) => {
    const response = await apiCall(`/geofences/${id}`, 'PUT', geofenceData);
    return response;
  },

  // Delete geofence
  delete: async (id) => {
    const response = await apiCall(`/geofences/${id}`, 'DELETE');
    return response;
  },

  // ==========================================
  // VEHICLE ASSIGNMENT METHODS ✅ ADD THESE
  // ==========================================

  // Assign a single vehicle to a geofence
  assignVehicle: async (geofenceId, vehicleId) => {
    const response = await apiCall(`/geofences/${geofenceId}/assign/${vehicleId}`, 'POST');
    return response;
  },

  // Unassign a vehicle from a geofence
  unassignVehicle: async (geofenceId, vehicleId) => {
    const response = await apiCall(`/geofences/${geofenceId}/unassign/${vehicleId}`, 'DELETE');
    return response;
  },

  // Assign multiple vehicles to a geofence (bulk assignment)
  assignVehicles: async (geofenceId, vehicleIds) => {
    const response = await apiCall(`/geofences/${geofenceId}/assign`, 'POST', { vehicleIds });
    return response;
  },

  // Get all assigned vehicles for a geofence
  getAssignedVehicles: async (geofenceId) => {
    const response = await apiCall(`/geofences/${geofenceId}/vehicles`, 'GET');
    return response;
  },

  // Get assigned vehicle IDs for a geofence
  getAssignedVehicleIds: async (geofenceId) => {
    const response = await apiCall(`/geofences/${geofenceId}/vehicle-ids`, 'GET');
    return response;
  },

  // Get vehicle count for a geofence
  getVehicleCount: async (geofenceId) => {
    const response = await apiCall(`/geofences/${geofenceId}/vehicle-count`, 'GET');
    return response;
  },

  // ==========================================
  // GEOFENCE VIOLATIONS (for /geofence-violations endpoints)
  // ==========================================

  // Get geofence violations for a tenant
  getViolations: async (tenantId) => {
    const response = await apiCall(`/geofence-violations/tenant/${tenantId}`, 'GET');
    return response;
  },

  // Get violations by vehicle
  getViolationsByVehicle: async (vehicleId) => {
    const response = await apiCall(`/geofence-violations/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  // Get violations by geofence
  getViolationsByGeofence: async (geofenceId) => {
    const response = await apiCall(`/geofence-violations/geofence/${geofenceId}`, 'GET');
    return response;
  },

  // Get unresolved violations
  getUnresolvedViolations: async () => {
    const response = await apiCall('/geofence-violations/unresolved', 'GET');
    return response;
  },

  // Resolve a violation
  resolveViolation: async (id) => {
    const response = await apiCall(`/geofence-violations/${id}/resolve`, 'PUT');
    return response;
  },

  // ==========================================
// ✅ NEW: Override violation as manager-approved return
// ==========================================
overrideAsReturn: async (id, reason) => {
  const response = await apiCall(`/geofence-violations/${id}/override-return`, 'PUT', { 
    reason: reason || 'Manager-approved return trip',
    overriddenBy: 'manager',
    overriddenAt: new Date().toISOString()
  });
  return response;
},

// Get overridden violations (approved returns)
getOverriddenReturns: async (tenantId) => {
  const response = await apiCall(`/geofence-violations/tenant/${tenantId}/overridden-returns`, 'GET');
  return response;
},
};

// ============================================
// USER SERVICES
// ============================================

export const userService = {
  getAll: async () => {
    const response = await apiCall('/users', 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/users/${id}`, 'GET');
    return response;
  },

  // ✅ ADD THIS - Get users by tenant
  getByTenant: async (tenantId) => {
    const response = await apiCall(`/users/tenant/${tenantId}`, 'GET');
    return response;
  },

  getByEmail: async (email) => {
    const response = await apiCall(`/users/email/${email}`, 'GET');
    return response;
  },

  // ✅ ADD THIS - Count users by tenant
  getCount: async (tenantId) => {
    const response = await apiCall(`/users/count/tenant/${tenantId}`, 'GET');
    return response;
  },

  getRecent: async (days = 7) => {
    const response = await apiCall(`/users/recent?days=${days}`, 'GET');
    return response;
  },

  create: async (userData) => {
    const response = await apiCall('/users', 'POST', userData);
    return response;
  },

  update: async (id, userData) => {
    const response = await apiCall(`/users/${id}`, 'PUT', userData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/users/${id}`, 'DELETE');
    return response;
  },

  changePassword: async (id, newPassword) => {
    const response = await apiCall(`/users/${id}/change-password?newPassword=${newPassword}`, 'PUT');
    return response;
  },

  // ✅ ADD THIS - Upload avatar
  uploadAvatar: async (userId, formData) => {
    const response = await apiCallMultipart(`/users/${userId}/avatar`, 'POST', formData);
    return response;
  },

};

// src/services/api.js - Add this

// ============================================
// TRACKING SERVICES - FIX FOR TRANSIENT ERROR
// ============================================

export const trackingService = {
  save: async (trackingData) => {
    // ✅ Send as flat object - backend controller should handle it
    const payload = {
      tenantId: trackingData.tenantId,      // Send plain ID
      vehicleId: trackingData.vehicleId,    // Send plain ID
      driverId: trackingData.driverId || null,
      lat: trackingData.lat,
      lng: trackingData.lng,
      speed: trackingData.speed || 0,
      heading: trackingData.heading || 0,
      altitude: trackingData.altitude || null,
      fuelLevel: trackingData.fuelLevel || null,
      engineTemp: trackingData.engineTemp || null,
      ignition: trackingData.ignition || false,
      timestamp: trackingData.timestamp || new Date().toISOString()
    };
    
    console.log('📤 Sending tracking payload:', payload);
    const response = await apiCall('/tracking', 'POST', payload);
    return response;
  },

  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/tracking/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getLatest: async (vehicleId) => {
    const response = await apiCall(`/tracking/vehicle/${vehicleId}/latest`, 'GET');
    return response;
  },

  getBetweenDates: async (vehicleId, start, end) => {
    const response = await apiCall(`/tracking/vehicle/${vehicleId}/between?start=${start}&end=${end}`, 'GET');
    return response;
  },

  getRecent: async (tenantId, since) => {
    const response = await apiCall(`/tracking/recent/${tenantId}?since=${since}`, 'GET');
    return response;
  },
};

// ============================================
// TRIP SERVICES
// ============================================

export const tripService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/trips/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/trips/${id}`, 'GET');
    return response;
  },

  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/trips/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getActiveByVehicle: async (vehicleId) => {
    const response = await apiCall(`/trips/vehicle/${vehicleId}/active`, 'GET');
    return response;
  },

  create: async (tripData) => {
    const response = await apiCall('/trips', 'POST', tripData);
    return response;
  },

  update: async (id, tripData) => {
    const response = await apiCall(`/trips/${id}`, 'PUT', tripData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/trips/${id}`, 'DELETE');
    return response;
  },

  countActive: async (tenantId) => {
    const response = await apiCall(`/trips/count/active/${tenantId}`, 'GET');
    return response;
  },
};

// ============================================
// FUEL SERVICES
// ============================================

export const fuelService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/fuel/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/fuel/${id}`, 'GET');
    return response;
  },

  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/fuel/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getByDriver: async (driverId) => {
    const response = await apiCall(`/fuel/driver/${driverId}`, 'GET');
    return response;
  },

  create: async (fuelData) => {
    const response = await apiCall('/fuel', 'POST', fuelData);
    return response;
  },

  update: async (id, fuelData) => {
    const response = await apiCall(`/fuel/${id}`, 'PUT', fuelData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/fuel/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// MAINTENANCE SERVICES
// ============================================

export const maintenanceService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/maintenance/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/maintenance/${id}`, 'GET');
    return response;
  },

  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/maintenance/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getByDriver: async (driverId) => {
    const response = await apiCall(`/maintenance/driver/${driverId}`, 'GET');
    return response;
  },

  create: async (maintenanceData) => {
    const response = await apiCall('/maintenance', 'POST', maintenanceData);
    return response;
  },

  update: async (id, maintenanceData) => {
    const response = await apiCall(`/maintenance/${id}`, 'PUT', maintenanceData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/maintenance/${id}`, 'DELETE');
    return response;
  },
};


// ============================================
// SERVICE SCHEDULE SERVICES
// ============================================
export const serviceScheduleService = {
  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/maintenance/schedules/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getByTenant: async (tenantId) => {
    const response = await apiCall(`/maintenance/schedules/tenant/${tenantId}`, 'GET');
    return response;
  },

  getUpcoming: async (tenantId, days = 30) => {
    const response = await apiCall(`/maintenance/schedules/tenant/${tenantId}/upcoming?days=${days}`, 'GET');
    return response;
  },

  create: async (scheduleData) => {
    const response = await apiCall('/maintenance/schedules', 'POST', scheduleData);
    return response;
  },

  update: async (id, scheduleData) => {
    const response = await apiCall(`/maintenance/schedules/${id}`, 'PUT', scheduleData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/maintenance/schedules/${id}`, 'DELETE');
    return response;
  },

  runCheckNow: async () => {
    const response = await apiCall('/maintenance/schedules/run-check', 'POST');
    return response;
  },
};

// ============================================
// MERCHANT SERVICES
// ============================================

export const merchantService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/merchants/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/merchants/${id}`, 'GET');
    return response;
  },

  getByTenantAndStatus: async (tenantId, status) => {
    const response = await apiCall(`/merchants/tenant/${tenantId}/status/${status}`, 'GET');
    return response;
  },

  create: async (merchantData) => {
    const response = await apiCall('/merchants', 'POST', merchantData);
    return response;
  },

  update: async (id, merchantData) => {
    const response = await apiCall(`/merchants/${id}`, 'PUT', merchantData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/merchants/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// COMPLIANCE SERVICES
// ============================================

export const complianceService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/compliance/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/compliance/${id}`, 'GET');
    return response;
  },

  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/compliance/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getExpired: async () => {
    const response = await apiCall('/compliance/expired', 'GET');
    return response;
  },

  getExpiringSoon: async (tenantId) => {
    const response = await apiCall(`/compliance/expiring/${tenantId}`, 'GET');
    return response;
  },

  create: async (complianceData) => {
    const response = await apiCall('/compliance', 'POST', complianceData);
    return response;
  },

  update: async (id, complianceData) => {
    const response = await apiCall(`/compliance/${id}`, 'PUT', complianceData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/compliance/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// POOL BOOKING SERVICES
// ============================================

export const poolBookingService = {
  getAll: async (tenantId) => {
    const response = await apiCall(`/pool/tenant/${tenantId}`, 'GET');
    return response;
  },

  getById: async (id) => {
    const response = await apiCall(`/pool/${id}`, 'GET');
    return response;
  },

  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/pool/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  getActiveByVehicle: async (vehicleId) => {
    const response = await apiCall(`/pool/vehicle/${vehicleId}/active`, 'GET');
    return response;
  },

  create: async (bookingData) => {
    const response = await apiCall('/pool', 'POST', bookingData);
    return response;
  },

  update: async (id, bookingData) => {
    const response = await apiCall(`/pool/${id}`, 'PUT', bookingData);
    return response;
  },

  delete: async (id) => {
    const response = await apiCall(`/pool/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// CHECKLIST SERVICES
// ============================================

export const checklistService = {
  // Create/save checklist
  create: async (checklistData) => {
    const response = await apiCall('/checklists', 'POST', checklistData);
    return response;
  },

  // Get checklist by ID
  getById: async (id) => {
    const response = await apiCall(`/checklists/${id}`, 'GET');
    return response;
  },

  // Get checklists by vehicle
  getByVehicle: async (vehicleId) => {
    const response = await apiCall(`/checklists/vehicle/${vehicleId}`, 'GET');
    return response;
  },

  // Get checklist history for a vehicle
  getHistory: async (vehicleId, tenantId) => {
    const response = await apiCall(`/checklists/vehicle/${vehicleId}/history?tenantId=${tenantId}`, 'GET');
    return response;
  },

  // Get checklists by driver
  getByDriver: async (driverId) => {
    const response = await apiCall(`/checklists/driver/${driverId}`, 'GET');
    return response;
  },

  // Update checklist
  update: async (id, checklistData) => {
    const response = await apiCall(`/checklists/${id}`, 'PUT', checklistData);
    return response;
  },

  // Submit checklist to fleet manager
  submit: async (id, submittedTo) => {
    const url = submittedTo 
      ? `/checklists/${id}/submit?submittedTo=${encodeURIComponent(submittedTo)}`
      : `/checklists/${id}/submit`;
    const response = await apiCall(url, 'POST');
    return response;
  },

  // Delete checklist
  delete: async (id) => {
    const response = await apiCall(`/checklists/${id}`, 'DELETE');
    return response;
  },
};

// // Add to default export
// export default {
//   // ... existing exports
//   checklist: checklistService,
// };

// ============================================
// NOTIFICATION SERVICES
// ============================================

export const notificationService = {
  // Get all notifications for a user
  getByUser: async (userId) => {
    const response = await apiCall(`/notifications/user/${userId}`, 'GET');
    return response;
  },

  // Get unread notifications for a user
  getUnread: async (userId) => {
    const response = await apiCall(`/notifications/user/${userId}/unread`, 'GET');
    return response;
  },

  // Get count of unread notifications
  getUnreadCount: async (userId) => {
    const response = await apiCall(`/notifications/user/${userId}/unread/count`, 'GET');
    return response;
  },

  // Create a new notification
  create: async (notificationData) => {
    const response = await apiCall('/notifications', 'POST', notificationData);
    return response;
  },

  // Mark a notification as read
  markAsRead: async (id) => {
    const response = await apiCall(`/notifications/${id}/read`, 'PUT');
    return response;
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId) => {
    const response = await apiCall(`/notifications/user/${userId}/read-all`, 'PUT');
    return response;
  },

  // Delete a notification
  delete: async (id) => {
    const response = await apiCall(`/notifications/${id}`, 'DELETE');
    return response;
  },
};

// ============================================
// ALERT SERVICES  (manager → driver)
// ============================================
export const alertService = {
  send: async (vehicleId, alertType, message, senderName) => {
    const response = await apiCall('/alerts/send', 'POST', {
      vehicleId,
      alertType,
      message,
      senderName,
    });
    return response;
  },
};


// ============================================
// DRIVER REPORT SERVICES  (driver → manager)
// ============================================
export const driverReportService = {
  send: async ({ vehicleId, driverId, reportType, message, lat, lng, speed }) => {
    const response = await apiCall('/alerts/report', 'POST', {
      vehicleId,
      driverId: driverId || null,
      reportType,
      message: message || '',
      lat: lat || null,
      lng: lng || null,
      speed: speed || 0,
    });
    return response;
  },

  // Manager acknowledges a driver report (marks the notification as read)
  acknowledge: async (notificationId) => {
    const response = await apiCall(`/notifications/${notificationId}/read`, 'PUT');
    return response;
  },

  // Manager replies to a driver report
  reply: async (notificationId, message, driverUserId = null) => {
    const response = await apiCall(`/notifications/${notificationId}/reply`, 'POST', {
      message,
      driverUserId,
    });
    return response;
  },
};


// ============================================
// SAFETY SERVICES  (driver safety score + events)
// ============================================
export const safetyService = {
  // Compute the safety score for a driver
  getScore: async (driverId) => {
    const response = await apiCall(`/drivers/${driverId}/safety-score`, 'GET');
    return response;
  },

  // Get recent safety events for a driver (harsh brakes, speeding, etc.)
  getEvents: async (driverId, limit = 50) => {
    const response = await apiCall(`/drivers/${driverId}/safety-events?limit=${limit}`, 'GET');
    return response;
  },
};

// ============================================
// AUDIT LOG SERVICES - Add this section
// ============================================

export const auditLogService = {
  // Get all audit logs (super_admin only)
  getAll: async () => {
    const response = await apiCall('/audit', 'GET');
    return response;
  },

  // Get audit logs by tenant
  getByTenant: async (tenantId) => {
    const response = await apiCall(`/audit/tenant/${tenantId}`, 'GET');
    return response;
  },

  // Get audit logs by user
  getByUser: async (userId) => {
    const response = await apiCall(`/audit/user/${userId}`, 'GET');
    return response;
  },

  // Get audit logs by entity
  getByEntity: async (entityType, entityId) => {
    const response = await apiCall(`/audit/entity?entityType=${entityType}&entityId=${entityId}`, 'GET');
    return response;
  },

  // Get audit logs by action
  getByAction: async (action) => {
    const response = await apiCall(`/audit/action/${action}`, 'GET');
    return response;
  },

  // Create audit log entry
  create: async (logData) => {
    const response = await apiCall('/audit', 'POST', logData);
    return response;
  },
};

export default {
  auth: authService,
  tenant: tenantService,
  vehicle: vehicleService,
  driver: driverService,
  incident: incidentService,
  geofence: geofenceService,
  user: userService,
  tracking: trackingService,
  trip: tripService,
  fuel: fuelService,          
  maintenance: maintenanceService,
  serviceSchedule: serviceScheduleService, 
  merchant: merchantService,
  compliance: complianceService,
  poolBooking: poolBookingService,
  checklist: checklistService,
  notification: notificationService,
  alert: alertService,
  driverReport: driverReportService,
  safety: safetyService,
  auditLog: auditLogService,
};