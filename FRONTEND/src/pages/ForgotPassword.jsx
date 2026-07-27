import React, { useState } from 'react';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import { authService } from '../services/api';

const ForgotPassword = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(''); // ✅ ADD THIS

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setDebugInfo(''); // Clear previous debug
    setIsLoading(true);

    console.log('🔵 1. Starting forgot password request for:', email);

    try {
      console.log('🔵 2. Calling authService.forgotPassword with:', email);
      
      // Call backend API for forgot password
      const response = await authService.forgotPassword(email);
      
      console.log('🔵 3. Response received:', response);
      setDebugInfo(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('✅ Success! Response:', response);
        setSuccess('Password reset link sent to your email! Please check your inbox.');
        
        // ✅ If the response has a reset token, log it
        if (response.data && response.data.resetToken) {
          console.log('🔑 Reset Token:', response.data.resetToken);
          console.log('🔗 Reset Link:', response.data.resetLink);
          setDebugInfo(prev => prev + '\n\n🔑 Token: ' + response.data.resetToken);
        }
      } else {
        console.log('❌ Backend returned success: false', response);
        setError(response.message || 'No account found with this email address.');
      }
    } catch (err) {
      console.error('❌ 4. Error occurred:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response,
        status: err.status
      });
      
      // ✅ Show more detailed error
      let errorMessage = err.message || 'Something went wrong. Please try again.';
      
      if (err.response) {
        console.log('❌ Response error data:', err.response.data);
        errorMessage = err.response.data?.message || errorMessage;
      }
      
      setError(errorMessage);
      setDebugInfo(JSON.stringify({
        error: err.message,
        status: err.status || err.response?.status,
        data: err.response?.data
      }, null, 2));
    } finally {
      setIsLoading(false);
      console.log('🔵 5. Request completed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
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
  Forgot Password
</p>
  </div>
</div>

          {/* Form Section */}
          <div className="p-5">
            <div className="text-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Forgot Password</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Enter your email to receive a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                    <Mail size={16} />
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

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{error}</p>
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  <p className="text-xs text-green-600">{success}</p>
                </div>
              )}

              {/* ✅ DEBUG INFO - Show this for troubleshooting */}
              {debugInfo && (
                <div className="mt-2 p-2 bg-gray-100 border border-gray-300 rounded-lg">
                  <p className="text-xs font-medium text-gray-700 mb-1">🔍 Debug Info:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words max-h-40 overflow-auto">
                    {debugInfo}
                  </pre>
                </div>
              )}

              {/* Reset Button */}
              <button
  type="submit"
  disabled={isLoading}
  className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white py-2.5 rounded-lg font-semibold hover:from-gray-700 hover:to-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-gray-500/20 text-sm"
>
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;