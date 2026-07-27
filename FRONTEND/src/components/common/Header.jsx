import React, { useState, useEffect } from 'react';
import { LogOut, Menu, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import AvatarUpload from '../AvatarUpload';

const Header = ({ activeTab, onLogout, toggleSidebar }) => {
  const { currentUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const userName = currentUser?.name || 'User';
  const userRole = currentUser?.role || 'user';
  const userEmail = currentUser?.email || 'user@example.com';
  const userAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=1e293b&color=fff&size=32`;

  const getDisplayRole = (role) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'car_owner': return 'Fleet Owner';
      case 'driver': return 'Driver';
      default: return 'User';
    }
  };

  return (
    <header className="bg-gradient-to-r from-gray-100 to-gray-200 border-b border-gray-300 px-0 sm:px-4 py-1 sm:py-2 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        {isMobile && (
          <button 
            onClick={toggleSidebar}
            className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-700 flex-shrink-0"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-0">
          <img src="/lgo2.png" alt="FLEETMAN Logo" className="h-10 sm:h-16 w-auto object-contain" />
          {/* <span className="font-bold text-sm sm:text-xl text-gray-800 whitespace-nowrap">
            FLEET<span className="text-blue-600">MAN</span>
          </span> */}
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
        <NotificationBell />

        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)} 
            className="flex items-center gap-1 p-1 rounded-lg hover:bg-gray-100"
            aria-label="User menu"
          >
            {/* ✅ Regular avatar in header - NO camera icon */}
            <img 
              src={userAvatar}
              alt={userName}
              className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover"
            />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-700">
                {isMobile ? userName.split(' ')[0] : userName}
              </p>
              <p className="text-xs text-gray-500">{getDisplayRole(userRole)}</p>
            </div>
            <ChevronDown size={14} className="text-gray-500 flex-shrink-0" />
          </button>
          
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20">
              <div className="p-3 border-b border-gray-200">
                {/* ✅ AvatarUpload with camera ONLY in dropdown */}
                <div className="flex items-center gap-3">
                  <AvatarUpload size="md" />
                  <div>
                    <p className="font-semibold text-sm">{userName}</p>
                    <p className="text-xs text-gray-500">{userEmail}</p>
                    <p className="text-xs text-gray-500 capitalize mt-1">{getDisplayRole(userRole)}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  onLogout();
                  setShowUserMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-gray-100 flex items-center gap-2"
              >
                <LogOut size={16} /> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;