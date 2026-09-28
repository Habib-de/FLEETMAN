// src/components/common/NotificationBell.jsx
import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle, AlertCircle, AlertTriangle, Info, X, Users, ChevronRight, Eye, Calendar, Clock, MapPin, Truck, User, Shield, AlertOctagon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService, 
  incidentService, 
  geofenceService, 
  tenantService, 
  userService,
  notificationService
} from '../../services/api';

const NotificationBell = () => {
  const { currentUser } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const userRole = currentUser?.role || 'user';
  const userName = currentUser?.name || 'User';
  const userTenantId = currentUser?.tenantId;
  const userEmail = currentUser?.email;

  // ============================================
  // NAVIGATION
  // ============================================
  const navigateToNotifications = () => {
    setShowNotifications(false);
    if (typeof window.setActiveTab === 'function') {
      window.setActiveTab('notifications');
    } else {
      window.dispatchEvent(new CustomEvent('navigateTo', {
        detail: { tab: 'notifications' }
      }));
    }
  };

  // Helper to extract array from API response
  const getData = (res) => {
    if (res?.status === 'fulfilled') {
      const val = res.value;
      return Array.isArray(val) ? val : (val?.data || []);
    }
    return res?.data || [];
  };

  // ============================================
  // LOAD NOTIFICATIONS
  // ============================================
  const loadNotifications = async () => {
    if (!currentUser) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const items = [];

    try {
      // ============================================
      // FETCH DATA
      // ============================================
      
      let vehicles = [];
      let drivers = [];
      let incidents = [];
      let geofenceViolations = [];
      let tenants = [];
      let users = [];
      let backendNotifications = [];

      try {
        const [vehiclesRes, driversRes, incidentsRes, geofenceRes, notifsRes] = await Promise.all([
          vehicleService.getAll(userTenantId),
          driverService.getAll(userTenantId),
          incidentService.getByTenant(userTenantId),
          geofenceService.getViolations(userTenantId),
          notificationService.getByUser(currentUser.id).catch(() => ({ data: [] }))
        ]);
        
        vehicles = getData(vehiclesRes);
        drivers = getData(driversRes);
        incidents = getData(incidentsRes);
        geofenceViolations = getData(geofenceRes);
        backendNotifications = notifsRes?.data || [];
      } catch (e) {
        console.warn('Failed to fetch data:', e);
      }

      // Super admin only
      if (userRole === 'super_admin') {
        try {
          const tenantsRes = await tenantService.getAll();
          tenants = getData(tenantsRes);
          
          if (tenants.length > 0) {
            const userPromises = tenants.map(tenant => 
              userService.getByTenant(tenant.id)
                .then(res => getData(res))
                .catch(() => [])
            );
            const userResults = await Promise.all(userPromises);
            users = userResults.flat();
          }
        } catch (e) {
          console.warn('Failed to fetch admin data:', e);
        }
      }

      // ============================================
      // BUILD NOTIFICATIONS WITH DETAILED DATA
      // ============================================

      // ========== SUPER ADMIN ==========
      if (userRole === 'super_admin') {
        if (tenants.length === 0) {
          items.push({
            id: 'no_tenants',
            title: 'No Tenants Registered',
            description: 'No tenants have been registered in the system yet',
            details: 'The system currently has no tenants. Please register a tenant to get started.',
            time: 'Now',
            type: 'info',
            role: 'super_admin',
            icon: 'Users',
            actionLabel: 'Register Tenant',
            action: () => navigateToNotifications()
          });
        }

        const unresolvedIncidents = incidents.filter(i => 
          i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'resolved'
        );
        if (unresolvedIncidents.length > 0) {
          const highSeverity = unresolvedIncidents.filter(i => 
            i.severity === 'high' || i.severity === 'critical'
          ).length;
          items.push({
            id: 'incident_summary',
            title: '🚨 Unresolved Incidents',
            description: `${unresolvedIncidents.length} incident(s) require attention across the system`,
            details: `Total: ${unresolvedIncidents.length}\nHigh Severity: ${highSeverity}\nType: Various incidents reported across tenants`,
            time: 'Now',
            type: 'alert',
            role: 'super_admin',
            icon: 'AlertOctagon',
            actionLabel: 'View Incidents',
            action: () => navigateToNotifications()
          });
        }

        const unresolvedViolations = geofenceViolations.filter(v => !v.resolved);
        if (unresolvedViolations.length > 0) {
          items.push({
            id: 'violation_summary',
            title: '📍 Geofence Violations',
            description: `${unresolvedViolations.length} geofence violation(s) detected across all tenants`,
            details: `Total violations: ${unresolvedViolations.length}\nAffected tenants: ${new Set(geofenceViolations.map(v => v.tenantId)).size}`,
            time: 'Now',
            type: 'alert',
            role: 'super_admin',
            icon: 'MapPin',
            actionLabel: 'View Violations',
            action: () => navigateToNotifications()
          });
        }

        if (users.length > 0) {
          const newUsers = users.filter(u => {
            const created = new Date(u.createdAt);
            const now = new Date();
            return (now - created) < 7 * 24 * 60 * 60 * 1000;
          });
          items.push({
            id: 'new_users',
            title: 'New User Signups',
            description: `${users.length} user(s) registered in the system`,
            details: `Total users: ${users.length}\nNew this week: ${newUsers.length}\nRoles: ${[...new Set(users.map(u => u.role))].join(', ')}`,
            time: 'Now',
            type: 'info',
            role: 'super_admin',
            icon: 'Users',
            actionLabel: 'View Users',
            action: () => navigateToNotifications()
          });
        }
      }

      // ========== CAR OWNER ==========
      if (userRole === 'car_owner') {
        const tenantVehicles = vehicles.filter(v => 
          v.tenantId === userTenantId || v.costCentre === userTenantId
        );
        const vehicleRegs = tenantVehicles.map(v => v.registration || v.id);
        const tenantDrivers = drivers.filter(d => d.tenantId === userTenantId);

        // Vehicles in maintenance
        const vehiclesInMaintenance = tenantVehicles.filter(v => 
          v.status === 'Maintenance' || v.status === 'maintenance'
        );
        if (vehiclesInMaintenance.length > 0) {
          items.push({
            id: 'maintenance',
            title: '🔧 Vehicles in Maintenance',
            description: `${vehiclesInMaintenance.length} vehicle(s) in maintenance`,
            details: `Vehicles: ${vehiclesInMaintenance.map(v => v.registration).join(', ')}\nPlease check maintenance status.`,
            time: 'Now',
            type: 'warning',
            role: 'car_owner',
            icon: 'Truck',
            actionLabel: 'View Vehicles',
            action: () => {
              if (typeof window.setActiveTab === 'function') {
                window.setActiveTab('vehicles');
              }
            }
          });
        }

        // Unassigned vehicles
        const unassignedVehicles = tenantVehicles.filter(v => 
          !v.driver_id && v.status === 'Active'
        );
        if (unassignedVehicles.length > 0) {
          items.push({
            id: 'unassigned',
            title: '🚗 Unassigned Vehicles',
            description: `${unassignedVehicles.length} vehicle(s) without driver`,
            details: `Vehicles: ${unassignedVehicles.map(v => v.registration).join(', ')}\nPlease assign drivers to these vehicles.`,
            time: 'Now',
            type: 'warning',
            role: 'car_owner',
            icon: 'Truck',
            actionLabel: 'Assign Drivers',
            action: () => {
              if (typeof window.setActiveTab === 'function') {
                window.setActiveTab('drivers');
              }
            }
          });
        }

        // Expired vehicle licenses
        const expiredLicenseVehicles = tenantVehicles.filter(v => {
          if (!v.licenseExpiry) return false;
          return new Date(v.licenseExpiry) < new Date();
        });
        if (expiredLicenseVehicles.length > 0) {
          items.push({
            id: 'expired_license',
            title: '📅 Expired Vehicle Licenses',
            description: `${expiredLicenseVehicles.length} vehicle(s) have expired licenses`,
            details: `Vehicles: ${expiredLicenseVehicles.map(v => v.registration).join(', ')}\nPlease renew the licenses immediately.`,
            time: 'Now',
            type: 'alert',
            role: 'car_owner',
            icon: 'AlertCircle',
            actionLabel: 'View Vehicles',
            action: () => {
              if (typeof window.setActiveTab === 'function') {
                window.setActiveTab('vehicles');
              }
            }
          });
        }

        // Expired driver licenses
        const expiredDrivers = tenantDrivers.filter(d => {
          if (!d.licenseExpiry) return false;
          return new Date(d.licenseExpiry) < new Date();
        });
        if (expiredDrivers.length > 0) {
          items.push({
            id: 'driver_expired_licenses',
            title: '🚨 Drivers with Expired Licenses',
            description: `${expiredDrivers.length} driver(s) have expired licenses`,
            details: `Drivers: ${expiredDrivers.map(d => d.name).join(', ')}\nPlease renew driver licenses.`,
            time: 'Now',
            type: 'alert',
            role: 'car_owner',
            icon: 'User',
            actionLabel: 'View Drivers',
            action: () => {
              if (typeof window.setActiveTab === 'function') {
                window.setActiveTab('drivers');
              }
            }
          });
        }

        // Low safety scores
        const lowScoreDrivers = tenantDrivers.filter(d => (d.safetyScore || 100) < 70);
        if (lowScoreDrivers.length > 0) {
          items.push({
            id: 'low_safety_scores',
            title: '⚠️ Drivers with Low Safety Scores',
            description: `${lowScoreDrivers.length} driver(s) have safety scores below 70`,
            details: `Drivers: ${lowScoreDrivers.map(d => d.name).join(', ')}\nScores: ${lowScoreDrivers.map(d => d.safetyScore).join(', ')}\nPlease provide coaching.`,
            time: 'Now',
            type: 'alert',
            role: 'car_owner',
            icon: 'Shield',
            actionLabel: 'View Safety',
            action: () => {
              if (typeof window.setActiveTab === 'function') {
                window.setActiveTab('safety');
              }
            }
          });
        }

        // Unresolved incidents
        const tenantIncidents = incidents.filter(i => {
          const vehicleMatch = vehicleRegs.some(reg => 
            i.vehicleId === reg || i.vehicleRegistration === reg
          );
          const driverMatch = tenantDrivers.some(d => 
            i.driverId === d.id || i.driverName === d.name
          );
          return vehicleMatch || driverMatch || i.tenantId === userTenantId;
        });
        
        const unresolvedTenantIncidents = tenantIncidents.filter(i => 
          i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'resolved'
        );
        if (unresolvedTenantIncidents.length > 0) {
          const highSeverity = unresolvedTenantIncidents.filter(i => 
            i.severity === 'high' || i.severity === 'critical'
          ).length;
          items.push({
            id: 'tenant_incidents',
            title: '🚨 Fleet Incidents',
            description: `${unresolvedTenantIncidents.length} unresolved incident(s) in your fleet`,
            details: `Total: ${unresolvedTenantIncidents.length}\nHigh Severity: ${highSeverity}\nPlease review and resolve.`,
            time: 'Now',
            type: 'alert',
            role: 'car_owner',
            icon: 'AlertOctagon',
            actionLabel: 'View Incidents',
            action: () => {
              if (typeof window.setActiveTab === 'function') {
                window.setActiveTab('incidents');
              }
            }
          });
        }
      }

      // ========== DRIVER ==========
      if (userRole === 'driver') {
        const currentDriver = drivers.find(d => 
          d.email === userEmail || d.userId === currentUser?.id
        );
        
        if (currentDriver) {
          const assignedVehicle = vehicles.find(v => 
            v.registration === currentDriver.assignedVehicleRegistration || 
            v.id === currentDriver.assignedVehicleId
          );
          
          if (assignedVehicle) {
            if (assignedVehicle.status === 'Maintenance' || assignedVehicle.status === 'maintenance') {
              items.push({
                id: 'vehicle_maintenance',
                title: '🔧 Your Vehicle in Maintenance',
                description: `Your vehicle ${assignedVehicle.registration} is currently in maintenance`,
                details: `Vehicle: ${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.registration})\nStatus: Maintenance\nPlease check with your fleet manager.`,
                time: 'Now',
                type: 'warning',
                role: 'driver',
                icon: 'Truck',
                actionLabel: 'View Vehicle',
                action: () => {
                  if (typeof window.setActiveTab === 'function') {
                    window.setActiveTab('my-vehicle');
                  }
                }
              });
            }
            
            if (assignedVehicle.licenseExpiry) {
              const expiry = new Date(assignedVehicle.licenseExpiry);
              const now = new Date();
              const diff = (expiry - now) / (1000 * 60 * 60 * 24);
              if (diff < 30 && diff > 0) {
                items.push({
                  id: 'vehicle_license_expiring',
                  title: '📅 Vehicle License Expiring',
                  description: `Your vehicle ${assignedVehicle.registration} license expires in ${Math.round(diff)} days`,
                  details: `Vehicle: ${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.registration})\nLicense expires: ${assignedVehicle.licenseExpiry}\nDays remaining: ${Math.round(diff)}\nPlease notify your fleet manager.`,
                  time: 'Now',
                  type: 'warning',
                  role: 'driver',
                  icon: 'Calendar',
                  actionLabel: 'View Vehicle',
                  action: () => {
                    if (typeof window.setActiveTab === 'function') {
                      window.setActiveTab('my-vehicle');
                    }
                  }
                });
              }
              if (diff < 0) {
                items.push({
                  id: 'vehicle_license_expired',
                  title: '🚨 Vehicle License Expired',
                  description: `Your vehicle ${assignedVehicle.registration} license has expired!`,
                  details: `Vehicle: ${assignedVehicle.make} ${assignedVehicle.model} (${assignedVehicle.registration})\nExpired on: ${assignedVehicle.licenseExpiry}\nPlease contact your fleet manager immediately.`,
                  time: 'Now',
                  type: 'alert',
                  role: 'driver',
                  icon: 'AlertCircle',
                  actionLabel: 'View Vehicle',
                  action: () => {
                    if (typeof window.setActiveTab === 'function') {
                      window.setActiveTab('my-vehicle');
                    }
                  }
                });
              }
            }
          }

          if (currentDriver.licenseExpiry) {
            const expiry = new Date(currentDriver.licenseExpiry);
            const now = new Date();
            const diff = (expiry - now) / (1000 * 60 * 60 * 24);
            if (diff < 30 && diff > 0) {
              items.push({
                id: 'driver_license_expiring',
                title: '📅 Your License Expiring',
                description: `Your driver license expires in ${Math.round(diff)} days`,
                details: `License: ${currentDriver.licenseNumber}\nExpires: ${currentDriver.licenseExpiry}\nDays remaining: ${Math.round(diff)}\nPlease renew your license.`,
                time: 'Now',
                type: 'warning',
                role: 'driver',
                icon: 'User',
                actionLabel: 'View Profile',
                action: () => {
                  if (typeof window.setActiveTab === 'function') {
                    window.setActiveTab('profile');
                  }
                }
              });
            }
            if (diff < 0) {
              items.push({
                id: 'driver_license_expired',
                title: '🚨 Your License Expired',
                description: 'Your driver license has expired! Please renew immediately.',
                details: `License: ${currentDriver.licenseNumber}\nExpired on: ${currentDriver.licenseExpiry}\nPlease renew your license immediately.`,
                time: 'Now',
                type: 'alert',
                role: 'driver',
                icon: 'AlertCircle',
                actionLabel: 'View Profile',
                action: () => {
                  if (typeof window.setActiveTab === 'function') {
                    window.setActiveTab('profile');
                  }
                }
              });
            }
          }

          const safetyScore = currentDriver.safetyScore || 100;
          if (safetyScore < 70) {
            items.push({
              id: 'low_safety_score',
              title: '⚠️ Low Safety Score',
              description: `Your safety score is ${safetyScore}/100. Please drive carefully.`,
              details: `Safety Score: ${safetyScore}/100\nScore is below 70.\nPlease drive carefully and follow road rules.\nContact your fleet manager for coaching.`,
              time: 'Now',
              type: 'alert',
              role: 'driver',
              icon: 'Shield',
              actionLabel: 'View Safety',
              action: () => {
                if (typeof window.setActiveTab === 'function') {
                  window.setActiveTab('safety');
                }
              }
            });
          } else if (safetyScore >= 95) {
            items.push({
              id: 'excellent_safety_score',
              title: '⭐ Excellent Safety Score!',
              description: `Your safety score is ${safetyScore}/100. Keep up the great work!`,
              details: `Safety Score: ${safetyScore}/100\nExcellent performance!\nKeep up the great work and stay safe.`,
              time: 'Now',
              type: 'success',
              role: 'driver',
              icon: 'Award',
              actionLabel: 'View Profile',
              action: () => {
                if (typeof window.setActiveTab === 'function') {
                  window.setActiveTab('profile');
                }
              }
            });
          }

          const driverIncidents = incidents.filter(i => 
            i.driverId === currentDriver.id || 
            i.driverName === currentDriver.name
          );
          const unresolvedDriverIncidents = driverIncidents.filter(i => 
            i.status !== 'Resolved' && i.status !== 'Closed' && i.status !== 'resolved'
          );
          if (unresolvedDriverIncidents.length > 0) {
            const highSeverity = unresolvedDriverIncidents.filter(i => 
              i.severity === 'high' || i.severity === 'critical'
            ).length;
            items.push({
              id: 'driver_incidents',
              title: '🚨 Your Incidents',
              description: `You have ${unresolvedDriverIncidents.length} unresolved incident(s)`,
              details: `Total: ${unresolvedDriverIncidents.length}\nHigh Severity: ${highSeverity}\nPlease review your incidents.`,
              time: 'Now',
              type: 'alert',
              role: 'driver',
              icon: 'AlertOctagon',
              actionLabel: 'View Incidents',
              action: () => {
                if (typeof window.setActiveTab === 'function') {
                  window.setActiveTab('incidents');
                }
              }
            });
          }
        } else {
          items.push({
            id: 'no_driver_profile',
            title: 'No Driver Profile Found',
            description: 'Please contact your fleet manager to set up your profile',
            details: 'Your account is not linked to a driver profile.\nPlease contact your fleet manager for assistance.',
            time: 'Now',
            type: 'info',
            role: 'driver',
            icon: 'User',
            actionLabel: 'Contact Manager',
            action: () => {}
          });
        }
      }

      // ============================================
      // ✅ BACKEND NOTIFICATIONS (from database)
      // ============================================
      if (Array.isArray(backendNotifications)) {
        backendNotifications.forEach(n => {
          // Skip if we already added an item with this ID
          if (items.some(item => item.id === n.id)) return;

          items.push({
            id: n.id,
            title: n.title || 'Notification',
            description: n.message || '',
            details: n.message || 'No additional details.',
            time: n.createdAt ? new Date(n.createdAt).toLocaleString() : 'Now',
            type: n.type || 'info',
            role: userRole,
            icon: 'Bell',
            actionLabel: 'View',
            link: n.link,
            action: () => {
              if (n.link) {
                const tab = n.link.replace(/^\//, '');
                if (typeof window.setActiveTab === 'function') {
                  window.setActiveTab(tab);
                } else {
                  window.dispatchEvent(new CustomEvent('navigateTo', {
                    detail: { tab }
                  }));
                }
              }
              setShowNotifications(false);
            },
            read: n.isRead === true || n.read === true,
            fromBackend: true
          });
        });
      }

    } catch (error) {
      console.error('Failed to load notifications:', error);
    }

    // ============================================
    // SORT AND LIMIT
    // ============================================
    const priorityOrder = { alert: 0, warning: 1, info: 2, success: 3 };
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return (priorityOrder[a.type] || 4) - (priorityOrder[b.type] || 4);
      }
      if (a.time === 'Now' && b.time !== 'Now') return -1;
      if (a.time !== 'Now' && b.time === 'Now') return 1;
      return 0;
    });

    const limitedItems = items.slice(0, 10);
    const unread = limitedItems.filter(item => !item.read).length;

    setNotifications(limitedItems);
    setUnreadCount(unread);
    setIsLoading(false);
  };

  // ============================================
  // AUTO-REFRESH NOTIFICATIONS
  // ============================================
  useEffect(() => {
    loadNotifications();
    
    const interval = setInterval(() => {
      loadNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // ============================================
  // WEBSOCKET LISTENER
  // ============================================
  useEffect(() => {
    const handleNewNotification = (event) => {
      const newNotif = event.detail;
      if (!newNotif) return;

      // Normalize to our shape
      const normalized = {
        id: newNotif.id,
        title: newNotif.title || 'Notification',
        description: newNotif.message || '',
        details: newNotif.message || 'No additional details.',
        time: newNotif.createdAt ? new Date(newNotif.createdAt).toLocaleString() : 'Now',
        type: newNotif.type || 'info',
        role: userRole,
        icon: 'Bell',
        actionLabel: 'View',
        link: newNotif.link,
        action: () => {
          if (newNotif.link) {
            const tab = newNotif.link.replace(/^\//, '');
            if (typeof window.setActiveTab === 'function') {
              window.setActiveTab(tab);
            }
          }
          setShowNotifications(false);
        },
        read: false,
        fromBackend: true
      };

      setNotifications(prev => {
        if (prev.some(n => n.id === normalized.id)) return prev;
        return [normalized, ...prev].slice(0, 10);
      });
      setUnreadCount(prev => prev + 1);
    };

    window.addEventListener('newNotification', handleNewNotification);

    return () => {
      window.removeEventListener('newNotification', handleNewNotification);
    };
  }, [userRole]);

  // ============================================
  // MARK FUNCTIONS
  // ============================================
  const markAllAsRead = async () => {
    // Update UI immediately
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);

    // Sync with backend
    try {
      if (currentUser?.id) {
        await notificationService.markAllAsRead(currentUser.id);
      }
    } catch (error) {
      console.warn('Failed to mark all as read on backend:', error);
    }
  };

  const markAsRead = async (id) => {
    // Update UI immediately
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Sync with backend ONLY if this is a backend notification
    const notif = notifications.find(n => n.id === id);
    if (notif?.fromBackend) {
      try {
        await notificationService.markAsRead(id);
      } catch (error) {
        console.warn('Failed to mark as read on backend:', error);
      }
    }
  };

  // ============================================
  // OPEN NOTIFICATION MODAL
  // ============================================
  const openNotificationModal = (notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    if (!notification.read) {
      markAsRead(notification.id);
    }
    setShowNotifications(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNotification(null);
  };

  // ============================================
  // UI HELPERS
  // ============================================
  const getIcon = (type) => {
    switch(type) {
      case 'alert': return <AlertCircle size={14} className="text-red-500" />;
      case 'warning': return <AlertTriangle size={14} className="text-yellow-500" />;
      case 'success': return <CheckCircle size={14} className="text-green-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  const getBgColor = (type) => {
    switch(type) {
      case 'alert': return 'bg-red-50 hover:bg-red-100';
      case 'warning': return 'bg-yellow-50 hover:bg-yellow-100';
      case 'success': return 'bg-green-50 hover:bg-green-100';
      default: return 'bg-blue-50 hover:bg-blue-100';
    }
  };

  const getTypeColor = (type) => {
    switch(type) {
      case 'alert': return 'text-red-600 border-red-200';
      case 'warning': return 'text-yellow-600 border-yellow-200';
      case 'success': return 'text-green-600 border-green-200';
      default: return 'text-blue-600 border-blue-200';
    }
  };

  // ============================================
  // RENDER NOTIFICATION MODAL
  // ============================================
  const renderNotificationModal = () => {
    if (!showModal || !selectedNotification) return null;

    const notif = selectedNotification;

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

          <div className={`px-6 py-5 rounded-t-2xl border-b ${getTypeColor(notif.type)} bg-gradient-to-r ${
            notif.type === 'alert' ? 'from-red-50 to-red-100' :
            notif.type === 'warning' ? 'from-yellow-50 to-yellow-100' :
            notif.type === 'success' ? 'from-green-50 to-green-100' :
            'from-blue-50 to-blue-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                notif.type === 'alert' ? 'bg-red-100' :
                notif.type === 'warning' ? 'bg-yellow-100' :
                notif.type === 'success' ? 'bg-green-100' :
                'bg-blue-100'
              }`}>
                {getIcon(notif.type)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{notif.title}</h2>
                <p className="text-sm text-gray-500">{notif.role?.replace('_', ' ').toUpperCase()}</p>
              </div>
              <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${
                notif.type === 'alert' ? 'bg-red-500 text-white' :
                notif.type === 'warning' ? 'bg-yellow-500 text-white' :
                notif.type === 'success' ? 'bg-green-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {notif.type.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{notif.description}</p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Details</h3>
              <div className="bg-gray-50 p-3 rounded-lg whitespace-pre-line text-sm text-gray-600">
                {notif.details || 'No additional details available.'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Time</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock size={14} className="text-gray-400" />
                  {notif.time || 'Just now'}
                </p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  {getIcon(notif.type)}
                  {notif.type.charAt(0).toUpperCase() + notif.type.slice(1)}
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              {notif.action && (
                <button 
                  onClick={() => {
                    if (notif.action) notif.action();
                    closeModal();
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Eye size={16} />
                  {notif.actionLabel || 'View Details'}
                </button>
              )}
              <button 
                onClick={closeModal}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
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
  // RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="relative">
        <button className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 relative">
          <Bell size={20} />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <button 
          onClick={() => setShowNotifications(!showNotifications)} 
          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 relative"
          aria-label="Notifications"
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {showNotifications && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:absolute sm:right-0 sm:mt-2 sm:w-80 sm:inset-auto sm:block sm:max-h-[80vh]">
            {/* Mobile backdrop */}
            <div className="absolute inset-0 bg-black/30 sm:hidden" onClick={() => setShowNotifications(false)}></div>
            
            {/* Notification panel */}
            <div className="relative w-full max-h-[80vh] bg-white rounded-t-2xl sm:rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20 sm:max-h-[80vh]">
              <div className="p-3 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  Notifications
                  {userRole === 'car_owner' && (
                    <Users size={14} className="text-blue-500" />
                  )}
                  <span className="text-xs text-gray-400 font-normal">
                    ({notifications.length})
                  </span>
                </h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto max-h-[60vh] sm:max-h-64">
                {notifications.length > 0 ? (
                  <>
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-3 border-b border-gray-100 transition-colors cursor-pointer ${getBgColor(notif.type)} ${!notif.read ? 'border-l-4 border-l-blue-500' : ''}`}
                        onClick={() => openNotificationModal(notif)}
                      >
                        <div className="flex items-start gap-2">
                          {getIcon(notif.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{notif.title}</p>
                            <p className="text-xs text-gray-600 truncate">{notif.description}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{notif.time}</p>
                          </div>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1"></span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    <div 
                      onClick={navigateToNotifications}
                      className="p-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-t border-gray-200 flex items-center justify-center gap-1"
                    >
                      <span className="text-sm text-blue-600 font-medium">View All Notifications</span>
                      <ChevronRight size={16} className="text-blue-600" />
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm font-medium">All clear!</p>
                    <p className="text-xs">No notifications for you</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notification Modal */}
      {renderNotificationModal()}
    </>
  );
};

export default NotificationBell;