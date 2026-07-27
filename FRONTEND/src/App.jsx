import React, { useState, useEffect } from 'react';
import { useAuth, roles } from './context/AuthContext';
import { AuthProvider } from './context/AuthContext';
import { TenantConfigProvider } from './context/TenantConfigContext';
import { TripProvider } from './context/TripContext';
import MainLayout from './components/layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LandingPage from './pages/LandingPage'; 

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import Tenants from './pages/admin/Tenants';
import SystemHealth from './pages/admin/SystemHealth';
import AuditLog from './pages/admin/AuditLog';
import MLModels from './pages/admin/MLModels';
import PlatformAnalytics from './pages/admin/PlatformAnalytics';
import UsersManagement from './pages/admin/UsersManagement'; 

// Car Owner Pages
import OwnerDashboard from './pages/car-owner/OwnerDashboard';
import Tracking from './pages/car-owner/Tracking';
import Vehicles from './pages/car-owner/Vehicles';
import Maintenance from './pages/car-owner/Maintenance';
import Drivers from './pages/car-owner/Drivers';
import FuelManagement from './pages/car-owner/FuelManagement';
import Incidents from './pages/car-owner/Incidents';
import Safety from './pages/car-owner/Safety';
import Reports from './pages/car-owner/Reports';
import Geofencing from './pages/car-owner/Geofencing';
import Compliance from './pages/car-owner/Compliance';
import PoolVehicles from './pages/car-owner/PoolVehicles';
import Merchants from './pages/car-owner/Merchants';

// Driver Pages
import DriverDashboard from './pages/driver/DriverDashboard';
import MyVehicle from './pages/driver/MyVehicle';
import CurrentTrip from './pages/driver/CurrentTrip';
import Checklist from './pages/driver/Checklist';
import DriverProfile from './pages/driver/DriverProfile';

import { 
  LayoutDashboard, Map, Truck, Wrench, ShieldAlert, 
  Users, Server, FileText, Activity, BarChart3,
  Fuel, AlertTriangle, BadgeCheck, Calendar, Store,
  MapPinned, Car, Navigation, ClipboardList, User, UserCircle  
} from 'lucide-react';

import { tenantService } from './services/api';

// Navigation items configuration
// Navigation items configuration
const getNavItems = (role, poolBookingAvailable = false) => {
  const commonItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const roleSpecificItems = {
    [roles.SUPER_ADMIN]: [
      ...commonItems,
      { id: 'tracking', label: 'Live Tracking', icon: Map },
      { id: 'tenants', label: 'Tenants', icon: Users },
      { id: 'users', label: 'Users', icon: UserCircle },
      { id: 'system', label: 'System Health', icon: Server },
      { id: 'audit', label: 'Audit Log', icon: FileText },
      { id: 'ml-models', label: 'ML Models', icon: Activity },
      { id: 'analytics', label: 'Platform Analytics', icon: BarChart3 },
    ],
    [roles.CAR_OWNER]: [
      ...commonItems,
      { id: 'tracking', label: 'Live Tracking', icon: Map },
      { id: 'vehicles', label: 'Vehicles', icon: Truck },
      { id: 'maintenance', label: 'Maintenance', icon: Wrench },
      { id: 'drivers', label: 'Drivers', icon: Users },
      { id: 'fuel', label: 'Fuel Management', icon: Fuel },
      { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
      { id: 'safety', label: 'Safety Scores', icon: ShieldAlert },
      { id: 'reports', label: 'Reports', icon: FileText },
      { id: 'geofencing', label: 'Geo-Fencing', icon: MapPinned },
      { id: 'compliance', label: 'Compliance', icon: BadgeCheck },
      // ✅ Only show Pool Vehicles if available
      ...(poolBookingAvailable ? [{ id: 'pool', label: 'Pool Vehicles', icon: Calendar }] : []),
      { id: 'merchants', label: 'Merchants', icon: Store },
    ],
    [roles.DRIVER]: [
      ...commonItems,
      { id: 'my-vehicle', label: 'My Vehicle', icon: Car },
      { id: 'trip', label: 'Current Trip', icon: Navigation },
      { id: 'checklist', label: 'Checklist', icon: ClipboardList },
      { id: 'profile', label: 'My Profile', icon: User },
    ]
  };

  return roleSpecificItems[role] || roleSpecificItems[roles.CAR_OWNER];
};

// Page renderer
const PageRenderer = ({ tab, role, setActiveTab }) => {
  // Admin Pages
  if (role === roles.SUPER_ADMIN) {
    const adminPages = {
      dashboard: <AdminDashboard setActiveTab={setActiveTab}/>,
      tenants: <Tenants setActiveTab={setActiveTab}/>,
      users: <UsersManagement setActiveTab={setActiveTab}/>,
      system: <SystemHealth setActiveTab={setActiveTab}/>,
      audit: <AuditLog setActiveTab={setActiveTab}/>,
      'ml-models': <MLModels setActiveTab={setActiveTab}/>,
      analytics: <PlatformAnalytics setActiveTab={setActiveTab}/>,
      tracking: <Tracking setActiveTab={setActiveTab}/>,
    };
    return adminPages[tab] || <AdminDashboard setActiveTab={setActiveTab} />;
  }

  // Driver Pages
  if (role === roles.DRIVER) {
    const driverPages = {
      dashboard: <DriverDashboard setActiveTab={setActiveTab} />,
      'my-vehicle': <MyVehicle setActiveTab={setActiveTab} />,
      trip: <CurrentTrip setActiveTab={setActiveTab} />,
      checklist: <Checklist setActiveTab={setActiveTab} />,
      profile: <DriverProfile setActiveTab={setActiveTab} />,
    };
    return driverPages[tab] || <DriverDashboard />;
  }

  // Car Owner Pages
  const ownerPages = {
    dashboard: <OwnerDashboard setActiveTab={setActiveTab} />,
    tracking: <Tracking setActiveTab={setActiveTab} />,
    vehicles: <Vehicles setActiveTab={setActiveTab} />,
    maintenance: <Maintenance setActiveTab={setActiveTab} />,
    drivers: <Drivers setActiveTab={setActiveTab} />,
    fuel: <FuelManagement setActiveTab={setActiveTab} />,
    incidents: <Incidents setActiveTab={setActiveTab} />,
    safety: <Safety setActiveTab={setActiveTab} />,
    reports: <Reports setActiveTab={setActiveTab} />,
    geofencing: <Geofencing setActiveTab={setActiveTab} />,
    compliance: <Compliance setActiveTab={setActiveTab} />,
    pool: <PoolVehicles setActiveTab={setActiveTab} />,
    merchants: <Merchants setActiveTab={setActiveTab} />,
  };
  return ownerPages[tab] || <OwnerDashboard setActiveTab={setActiveTab} />;
};

// Main App Component with Authentication
const AppContent = ({ onLogout, userRole }) => {
  const { currentUser, switchRole, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('fleetman_active_tab');
    return savedTab || 'dashboard';
  });

  const [poolBookingAvailable, setPoolBookingAvailable] = useState(false);
  const [isPoolLoading, setIsPoolLoading] = useState(true);

  // ✅ HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURN
  // Save active tab to localStorage
  useEffect(() => {
    localStorage.setItem('fleetman_active_tab', activeTab);
  }, [activeTab]);

  // ============================================
  // LISTEN FOR NAVIGATION MESSAGES
  // ============================================
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('📨 Message received in AppContent:', event.data);
      
      if (event.data && event.data.type === 'navigate') {
        console.log('🚗 Navigating to tab:', event.data.tab);
        console.log('🚗 Vehicle:', event.data.vehicle);
        
        if (event.data.tab) {
          setActiveTab(event.data.tab);
          console.log('✅ Tab changed to:', event.data.tab);
        }
        
        if (event.data.vehicle) {
          localStorage.setItem('tracking_selected_vehicle', event.data.vehicle);
          console.log('💾 Stored vehicle in localStorage:', event.data.vehicle);
        }
      }
    };

    const handleCustomEvent = (event) => {
      console.log('📨 Custom event received:', event.detail);
      if (event.detail && event.detail.tab) {
        setActiveTab(event.detail.tab);
        if (event.detail.vehicle) {
          localStorage.setItem('tracking_selected_vehicle', event.detail.vehicle);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    window.addEventListener('navigateTo', handleCustomEvent);
    window.setActiveTab = setActiveTab;
    
    console.log('✅ Message listeners added');
    console.log('✅ window.setActiveTab is available');
    
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('navigateTo', handleCustomEvent);
      delete window.setActiveTab;
    };
  }, []);

  // Update user role when login happens or on refresh
  useEffect(() => {
    if (userRole && currentUser?.role !== userRole) {
      switchRole(userRole);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  // ✅ CHECK POOL BOOKING AVAILABILITY
useEffect(() => {
  const checkPoolBooking = async () => {
    if (currentUser?.tenantId && currentUser?.role === roles.CAR_OWNER) {
      try {
        const response = await tenantService.isPoolBookingAvailable(currentUser.tenantId);
        if (response?.success) {
          setPoolBookingAvailable(response.data);
          console.log('✅ Pool booking available:', response.data);
        }
      } catch (error) {
        console.error('Failed to check pool booking:', error);
        setPoolBookingAvailable(false);
      }
    }
    setIsPoolLoading(false);
  };
  
  checkPoolBooking();
}, [currentUser]);

  // ✅ NOW CONDITIONAL RETURN AFTER ALL HOOKS
  // Show loading while auth is loading
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 font-medium">Loading your session...</p>
        </div>
      </div>
    );
  }



  const navItems = getNavItems(currentUser?.role || roles.CAR_OWNER, poolBookingAvailable);

  console.log('🔍 AppContent - currentUser:', currentUser);

  return (
    <MainLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      navItems={navItems}
      onLogout={onLogout}
      userRole={userRole}
    >
      <PageRenderer tab={activeTab} role={currentUser?.role || roles.CAR_OWNER} setActiveTab={setActiveTab} />
    </MainLayout>
  );
};

// App wrapper with AuthProvider, TenantConfigProvider, TripProvider, and Login
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const saved = localStorage.getItem('fleetman_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Check if it's an object with user data (not a string "true" or "false")
        const isValid = typeof parsed === 'object' && parsed !== null && parsed.id;
        console.log('🔍 App init - isAuthenticated:', isValid, parsed);
        return isValid;
      } catch {
        return false;
      }
    }
    return false;
  });

  const [userData, setUserData] = useState(() => {
    const saved = localStorage.getItem('fleetman_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const [userRole, setUserRole] = useState(() => {
    const saved = localStorage.getItem('fleetman_role');
    return saved || null;
  });

  // State for authentication screen navigation
  // State for authentication screen navigation
const [authScreen, setAuthScreen] = useState('landing');

  // ✅ PUT THE useEffect HERE - RIGHT AFTER THE useState declarations
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('token');
    if (resetToken) {
      setAuthScreen('reset-password');
    }
  }, []);

  const handleLogin = (userData) => {
  console.log('✅ App.handleLogin called with:', userData);
  
  // Get token from userData or localStorage
  const token = userData.token || localStorage.getItem('fleetman_token') || localStorage.getItem('token');
  
  // Ensure token is in the user data
  const userWithToken = {
    ...userData,
    token: token,
  };
  
  setUserData(userWithToken);
  setUserRole(userData.role || userData.userRole);
  setIsAuthenticated(true);
  setAuthScreen('login');
  
  // Store token in all possible locations
  if (token) {
    localStorage.setItem('fleetman_token', token);
    localStorage.setItem('token', token);
    localStorage.setItem('fleetman_auth', JSON.stringify(userWithToken));
    localStorage.setItem('fleetman_user', JSON.stringify(userWithToken));
    localStorage.setItem('fleetman_role', userData.role || userData.userRole || '');
  }
};

  const handleLogout = () => {
    console.log('✅ App.handleLogout called');
    setUserData(null);
    setUserRole(null);
    setIsAuthenticated(false);
    localStorage.removeItem('fleetman_auth');
    localStorage.removeItem('fleetman_user');
    localStorage.removeItem('fleetman_role');
    localStorage.removeItem('fleetman_active_tab');
    setAuthScreen('login');
  };

  // Handle navigation between auth screens
  const handleNavigate = (screen) => {
    setAuthScreen(screen);
  };

  console.log('🔍 App state:', { isAuthenticated, userData, userRole, authScreen });

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
  switch (authScreen) {
    case 'landing':
      return <LandingPage onNavigate={handleNavigate} />;
    case 'register':
      return <Register onNavigate={handleNavigate} />;
    case 'forgot-password':
      return <ForgotPassword onNavigate={handleNavigate} />;
    case 'reset-password':
      return <ResetPassword onNavigate={handleNavigate} />;
    case 'login':
    default:
      return <Login onLogin={handleLogin} onNavigate={handleNavigate} />;
  }
}

  return (
  <AuthProvider>            
    <TenantConfigProvider>  
      <TripProvider>        
        <AppContent onLogout={handleLogout} userRole={userRole} />
      </TripProvider>
    </TenantConfigProvider>
  </AuthProvider>
);
};

export default App;