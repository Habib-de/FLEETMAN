import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, User, Phone, Shield, Building, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { authService, tenantService } from '../services/api';

const Register = ({ onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'car_owner',
    tenantId: '',
    companyName: '',
    adminKey: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const ADMIN_SECRET_KEY = 'fleetman_admin_2024';

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError('Full name is required');
        return false;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        return false;
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required');
        return false;
      }
      return true;
    }
    
    if (currentStep === 2) {
      if (!formData.password) {
        setError('Password is required');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      return true;
    }
    
    if (currentStep === 3) {
      if (formData.role === 'car_owner') {
        if (!formData.tenantId) {
          setError('Tenant ID is required');
          return false;
        }
        if (!formData.companyName) {
          setError('Company name is required');
          return false;
        }
      }
      if (formData.role === 'super_admin') {
        if (!formData.adminKey || formData.adminKey !== ADMIN_SECRET_KEY) {
          setError('❌ Invalid admin registration key');
          return false;
        }
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Prepare registration data for backend
      const registerData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
        tenantId: formData.tenantId,
        companyName: formData.companyName,
        adminKey: formData.adminKey,
      };

      // Call backend registration API
      const response = await authService.register(registerData);
      
      if (response.success) {
        setSuccess('✅ Account created successfully! Redirecting to login...');
        setTimeout(() => {
          onNavigate('login');
        }, 2500);
      } else {
        setError(response.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { id: 1, label: 'Personal Info', icon: User },
    { id: 2, label: 'Security', icon: Lock },
    { id: 3, label: 'Account', icon: Shield },
  ];

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-3 overflow-hidden fixed inset-0">
      <div className="w-full max-w-sm h-full max-h-[620px] flex items-center">
        <div className="w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
<div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-4 text-center border-b border-gray-300 relative">
  <button
    onClick={() => onNavigate('login')}
    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-800 transition-colors"
  >
    <ArrowLeft size={18} />
  </button>
  <div className="flex justify-center">
    <img 
      src="/lgo2.png" 
      alt="FLEETMAN Logo" 
      className="w-full max-w-[140px] h-auto object-contain mx-auto"
    />
  </div>
  <div className="mt-2">
  <p className="text-gray-700 text-xs font-bold italic tracking-wide">
    Create Account
  </p>
</div>
</div>

          {/* Step Progress */}
          <div className="px-4 pt-3">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex flex-col items-center">
                    <div 
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        currentStep === step.id 
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100' 
                          : currentStep > step.id 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step.id ? <CheckCircle size={14} /> : step.id}
                    </div>
                    <span className={`text-[7px] mt-0.5 font-medium ${
                      currentStep === step.id ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-0.5 ${
                      currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Form Section */}
          <div className="p-4 overflow-y-auto max-h-[380px]">
            <div className="text-center mb-2">
              <h2 className="text-xs font-semibold text-gray-800">
                Step {currentStep} of 3: {steps[currentStep - 1].label}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-2.5">
              {/* STEP 1 */}
              {currentStep === 1 && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Full Name *</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full pl-9 pr-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Email Address *</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-9 pr-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Phone Number *</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full pl-9 pr-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                        placeholder="Enter your phone number"
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    Next Step <ChevronRight size={15} />
                  </button>
                </>
              )}

              {/* STEP 2 */}
              {currentStep === 2 && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Password *</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        className="w-full pl-9 pr-10 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                        placeholder="Min 6 characters"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Confirm Password *</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                        className="w-full pl-9 pr-10 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                        placeholder="Confirm your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      Next Step <ChevronRight size={15} />
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 */}
              {currentStep === 3 && (
                <>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Account Type *</label>
                    <div className="relative">
                      <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                        className="w-full pl-9 pr-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50/50 hover:bg-white focus:bg-white text-sm"
                      >
                        <option value="car_owner">Fleet Owner</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </div>
                  </div>

                  {formData.role === 'car_owner' && (
                    <div className="space-y-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                      <p className="text-[10px] font-medium text-blue-700">🏢 Fleet Owner Details</p>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Tenant ID *</label>
                        <div className="relative">
                          <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={formData.tenantId}
                            onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                            className="w-full pl-9 pr-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                            placeholder="e.g., lec_001"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Company Name *</label>
                        <div className="relative">
                          <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={formData.companyName}
                            onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                            className="w-full pl-9 pr-3 py-1.5 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm"
                            placeholder="e.g., Lesotho Electricity Company"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.role === 'super_admin' && (
                    <div className="space-y-2 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-[10px] font-medium text-yellow-700 flex items-center gap-1">
                        <Shield size={12} /> Super Admin Registration
                      </p>
                      <div>
                        <label className="block text-[10px] font-medium text-gray-700 mb-0.5">Admin Registration Key *</label>
                        <div className="relative">
                          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="password"
                            value={formData.adminKey}
                            onChange={(e) => setFormData({...formData, adminKey: e.target.value})}
                            className="w-full pl-9 pr-3 py-1.5 border-2 border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none bg-white text-sm"
                            placeholder="Enter admin registration key"
                            required
                          />
                        </div>
                        <p className="text-[8px] text-gray-400 mt-0.5">
                          ⚠️ Contact system administrator for the key
                        </p>
                      </div>
                      <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-1.5">
                        <p className="text-[8px] text-yellow-800">
                          ⚠️ Only ONE Super Admin account is allowed in the system.
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 p-1.5 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle size={12} className="text-red-500 flex-shrink-0" />
                      <p className="text-[10px] text-red-600">{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className="flex items-center gap-2 p-1.5 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                      <p className="text-[10px] text-green-600">{success}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleBack}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <ChevronLeft size={15} /> Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 text-sm"
                    >
                      {isLoading ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        'Create Account'
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  Sign In
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

export default Register;