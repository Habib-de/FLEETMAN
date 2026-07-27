// src/pages/Login.js

import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authService } from '../services/api';

const Login = ({ onLogin, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setIsLoading(true);

  try {
    const response = await authService.login(email, password);
    
    console.log('📡 Login response:', response);
    
    if (response.success && response.data) {
      const userData = response.data;
      
      console.log('✅ User data received, has token:', !!userData.token);
      
      // 🔥 Store token with multiple keys
      if (userData.token) {
        localStorage.setItem('fleetman_token', userData.token);
        localStorage.setItem('token', userData.token);
        localStorage.setItem('fleetman_auth', JSON.stringify(userData));
        localStorage.setItem('fleetman_user', JSON.stringify(userData));
        localStorage.setItem('fleetman_role', userData.role || userData.userRole || '');
      } else {
        console.error('❌ No token in response!');
        setError('Login failed: No token received');
        setIsLoading(false);
        return;
      }
      
      // Call onLogin with user data
      onLogin(userData);
    } else {
      setError(response.message || 'Invalid email or password');
    }
  } catch (err) {
    console.error('❌ Login error:', err);
    setError(err.message || 'Login failed. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-3 overflow-hidden fixed inset-0">
      <div className="w-full max-w-sm h-full max-h-[600px] flex items-center">
        <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Logo Header */}
          {/* Logo Header */}
<div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-4 text-center border-b border-gray-300">
  <div className="flex justify-center">
    <img 
      src="/lgo2.png" 
      alt="FLEETMAN Logo" 
      className="w-full max-w-[140px] h-auto object-contain mx-auto"
    />
  </div>
  <div className="mt-2">
    {/* <p className="text-gray-700 text-xs font-bold italic tracking-wide uppercase">
      Fleet Management System
    </p> */}
  </div>
</div>

          {/* Form Section */}
          <div className="p-4">
            <div className="text-center mb-2">
              <h2 className="text-sm font-semibold text-gray-800">Welcome Back</h2>
              <p className="text-gray-500 text-xs mt-0.5">Sign in to manage your fleet</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-0.5">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 text-sm"
              >
                {isLoading ? (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-2.5 text-center">
              <p className="text-xs text-gray-500">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Create Account
                </button>
              </p>
            </div>
          </div>

          <div className="text-center pb-2">
            <p className="text-[8px] sm:text-[10px] text-gray-400 font-bold sm:font-normal">
              &copy; 2026 FLEETMAN. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;