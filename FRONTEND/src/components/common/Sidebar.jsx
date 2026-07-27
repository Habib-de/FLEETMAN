import React, { useEffect, useState } from 'react';  // ✅ Added useState
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Sidebar = ({ sidebarOpen, setSidebarOpen, activeTab, setActiveTab, navItems }) => {
  const { currentUser } = useAuth();
  const [incidentCount, setIncidentCount] = useState(0);  // ✅ NEW

  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (window.innerWidth < 768 && sidebarOpen) {
        const sidebar = document.querySelector('.sidebar-container');
        if (sidebar && !sidebar.contains(e.target)) {
          setSidebarOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sidebarOpen, setSidebarOpen]);

  // Close sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && sidebarOpen) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, setSidebarOpen]);

  // ✅ NEW: Load incident count
  useEffect(() => {
    const loadIncidentCount = () => {
      try {
        const incidentsData = localStorage.getItem('fleetman_incidents');
        if (incidentsData) {
          const incidents = JSON.parse(incidentsData);
          const unresolved = incidents.filter(inc => 
            inc.status !== 'Resolved' && inc.status !== 'Closed'
          ).length;
          setIncidentCount(unresolved);
        } else {
          setIncidentCount(0);
        }
      } catch (e) {
        console.error('Error loading incidents:', e);
        setIncidentCount(0);
      }
    };

    loadIncidentCount();

    const handleIncidentUpdate = () => {
      loadIncidentCount();
    };

    window.addEventListener('incidentsUpdated', handleIncidentUpdate);
    
    return () => {
      window.removeEventListener('incidentsUpdated', handleIncidentUpdate);
    };
  }, []);

  // Get user display data
  const userName = currentUser?.name || 'User';
  const userRole = currentUser?.role || 'user';
  const userAvatar = currentUser?.avatar || `https://ui-avatars.com/api/?name=${userName}&background=1e293b&color=fff&size=40`;

  // Format role for display
  const getDisplayRole = (role) => {
    switch(role) {
      case 'super_admin': return 'Super Admin';
      case 'car_owner': return 'Fleet Owner';
      case 'driver': return 'Driver';
      default: return 'User';
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <aside 
        className={`sidebar-container fixed md:relative bg-slate-900 text-white transition-all duration-300 flex flex-col z-50 h-full
          ${sidebarOpen ? 'w-56 left-0' : 'w-14 -left-14 md:left-0'}
          ${sidebarOpen && window.innerWidth < 768 ? 'left-0 shadow-2xl' : ''}
        `}
      >
        {/* TOP: Collapse Toggle */}
        <div className={`flex items-center ${sidebarOpen ? 'justify-end px-3' : 'justify-center'} py-2 border-b border-slate-700/50`}>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-1 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? (
              <ChevronLeft size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth < 768) setSidebarOpen(false);
              }}
              className={`w-full flex items-center ${sidebarOpen ? 'px-3' : 'justify-center px-1.5'} py-2 hover:bg-slate-800 transition-colors relative ${
                activeTab === item.id ? 'bg-slate-800 border-r-4 border-blue-500' : ''
              }`}
              title={!sidebarOpen ? item.label : ''}
            >
              <item.icon size={18} className="flex-shrink-0" />
              <span className={`ml-2.5 text-sm ${!sidebarOpen && 'hidden'}`}>{item.label}</span>
              {item.id === 'incidents' && sidebarOpen && (
                <span className="ml-auto bg-red-500 text-[9px] px-1.5 py-0.5 rounded-full">
                  {incidentCount}  {/* ✅ DYNAMIC */}
                </span>
              )}
              {item.id === 'incidents' && !sidebarOpen && (
                <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-[8px] w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {incidentCount}  {/* ✅ DYNAMIC */}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* BOTTOM: User Profile */}
        <div className={`border-t border-slate-700/50 ${sidebarOpen ? 'p-3' : 'p-1.5'}`}>
          <div className={`flex items-center ${sidebarOpen ? 'gap-2.5' : 'justify-center'}`}>
            <img 
              src={userAvatar}
              alt={userName} 
              className={`${sidebarOpen ? 'w-8 h-8' : 'w-7 h-7'} rounded-full flex-shrink-0`} 
            />
            <div className={`flex-1 min-w-0 ${!sidebarOpen && 'hidden'}`}>
              <p className="text-sm font-semibold truncate">{userName}</p>
              <p className="text-xs text-slate-400">{getDisplayRole(userRole)}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;