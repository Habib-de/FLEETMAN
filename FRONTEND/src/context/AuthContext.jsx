// src/context/AuthContext.jsx
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { authService, userService } from '../services/api';

export const roles = {
  SUPER_ADMIN: 'super_admin',
  CAR_OWNER: 'car_owner',
  DRIVER: 'driver'
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user from BACKEND on mount (not localStorage)
  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('fleetman_token');
      
      if (!token) {
        setCurrentUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await authService.getCurrentUser();
        
        // Your ApiResponse wraps data as: { success: true, message: "...", data: {...} }
        const userData = response.data;
        
        if (userData && (userData.id || userData.userId)) {
          // Normalize: backend might return userId, frontend expects id
          const normalizedUser = {
            ...userData,
            id: userData.id || userData.userId,
            tenantId: userData.tenantId,
            token: token,
            avatar: userData.avatar || null
          };
          setCurrentUser(normalizedUser);
        } else {
          authService.logout();
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('❌ AuthProvider: Failed to load user from backend:', error);
        authService.logout();
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const switchRole = useCallback((role) => {
    setCurrentUser(prev => {
      if (prev) {
        return { ...prev, role };
      }
      return prev;
    });
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setCurrentUser(null);
    window.location.href = '/login';
  }, []);

  // ✅ ADD THIS RIGHT HERE - after logout, before const value
const updateAvatar = useCallback(async (avatarFile) => {
  if (!currentUser) return;

  try {
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    
    const response = await userService.uploadAvatar(currentUser.id, formData);
    
    if (response?.success) {
      // Update current user with new avatar
      const avatarUrl = response.data?.avatar || response.avatar;
      setCurrentUser(prev => ({
        ...prev,
        avatar: avatarUrl
      }));
      
      // Also update localStorage
      const saved = localStorage.getItem('fleetman_auth');
      if (saved) {
        try {
          const userData = JSON.parse(saved);
          userData.avatar = avatarUrl;
          localStorage.setItem('fleetman_auth', JSON.stringify(userData));
        } catch (e) {}
      }
      
      return response;
    }
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
}, [currentUser]);


  const value = useMemo(() => ({
    currentUser,
    setCurrentUser,
    switchRole,
    logout,
    updateAvatar,
    roles,
    loading
  }), [currentUser, switchRole, logout, loading, updateAvatar]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};