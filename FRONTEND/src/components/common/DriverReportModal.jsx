// src/components/common/DriverReportModal.jsx
import React, { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { driverReportService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const REPORT_TYPES = [
  { code: 'EMERGENCY',  icon: '🚨', label: 'Emergency',     severity: 'critical', message: 'I have an emergency. Please respond immediately.' },
  { code: 'ACCIDENT',   icon: '💥', label: 'Accident',      severity: 'critical', message: 'I have been in an accident. Please respond.' },
  { code: 'BREAKDOWN',  icon: '🔧', label: 'Breakdown',     severity: 'high',     message: 'My vehicle has broken down. I need assistance.' },
  { code: 'CALLBACK',   icon: '📞', label: 'Call Me',       severity: 'high',     message: 'Please call me as soon as possible.' },
  { code: 'ROAD_ISSUE', icon: '🚧', label: 'Road Issue',    severity: 'medium',   message: 'There is a road issue blocking my route.' },
  { code: 'FUEL',       icon: '⛽', label: 'Low Fuel',      severity: 'medium',   message: 'I am running low on fuel and need a refuel.' },
  { code: 'TRAFFIC',    icon: '🚦', label: 'Heavy Traffic', severity: 'low',      message: 'Heavy traffic. Expect delays.' },
  { code: 'DELAY',      icon: '⏱️', label: 'Delay',         severity: 'low',      message: 'I will be delayed.' },
  { code: 'MESSAGE',    icon: '💬', label: 'Message',       severity: 'low',      message: '' },
  { code: 'OTHER',      icon: '📝', label: 'Other',         severity: 'low',      message: '' },
];

const SEVERITY_COLORS = {
  low:      'bg-blue-100 text-blue-700 border-blue-200',
  medium:   'bg-yellow-100 text-yellow-700 border-yellow-200',
  high:     'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const DriverReportModal = ({
  vehicle,
  isOpen,
  onClose,
  onSent,
  currentLat = null,
  currentLng = null,
  currentSpeed = 0,
}) => {
  const { currentUser } = useAuth();
  const [selectedCode, setSelectedCode] = useState('BREAKDOWN');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !vehicle) return null;

  const selected = REPORT_TYPES.find(a => a.code === selectedCode) || REPORT_TYPES[0];

  const handleSend = async () => {
    setIsSending(true);
    setError('');
    setSuccess('');
    try {
      const response = await driverReportService.send({
        vehicleId: vehicle.id,
        driverId: currentUser?.driverId || null,
        reportType: selectedCode,
        message: message || '',
        lat: currentLat,
        lng: currentLng,
        speed: currentSpeed || 0,
      });

      if (response?.success) {
        setSuccess(`✅ Report sent to fleet manager`);
        setTimeout(() => {
          setMessage('');
          onSent?.(response.data);
          onClose();
        }, 900);
      } else {
        setError(response?.message || 'Failed to send report');
      }
    } catch (err) {
      setError(err.message || 'Failed to send report');
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (isSending) return;
    setMessage('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
      <div className="absolute inset-0" onClick={handleClose}></div>

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[95vh] overflow-y-auto">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg z-10"
          disabled={isSending}
        >
          <X size={22} className="text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Report to Fleet Manager</h2>
              <p className="text-orange-100 text-sm">
                Vehicle: <span className="font-semibold">{vehicle.reg || vehicle.registration}</span>
                {vehicle.driver && ` · Driver: ${vehicle.driver}`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Type selector */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What's happening?
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {REPORT_TYPES.map((type) => {
              const isSelected = type.code === selectedCode;
              return (
                <button
                  key={type.code}
                  onClick={() => setSelectedCode(type.code)}
                  className={`p-2.5 rounded-lg text-left text-sm flex items-center gap-2 transition-all border-2 ${
                    isSelected
                      ? 'bg-orange-50 border-orange-500 text-orange-900 font-medium'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-gray-50'
                  }`}
                  type="button"
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="flex-1 truncate">{type.label}</span>
                  {isSelected && <span className="text-orange-600">●</span>}
                </button>
              );
            })}
          </div>

          {/* Severity badge */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-sm text-gray-500">Severity:</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${SEVERITY_COLORS[selected.severity]}`}>
              {selected.severity.toUpperCase()}
            </span>
          </div>

          {/* Auto-attached context */}
          {(currentLat || currentSpeed > 0) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 flex flex-wrap gap-3">
              {currentLat && currentLng && (
                <span>📍 {parseFloat(currentLat).toFixed(4)}, {parseFloat(currentLng).toFixed(4)}</span>
              )}
              {currentSpeed > 0 && <span>🚗 {Math.round(currentSpeed)} km/h</span>}
              <span className="text-blue-500">Auto-attached</span>
            </div>
          )}

          {/* Message */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={selected.message || 'Describe your situation...'}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave empty to use the default: "{selected.message || 'No message'}"
          </p>

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-5 pt-4 border-t border-gray-200">
            <button
              onClick={handleSend}
              disabled={isSending}
              className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send size={16} />
              )}
              {isSending ? 'Sending...' : 'Send Report'}
            </button>
            <button
              onClick={handleClose}
              disabled={isSending}
              className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverReportModal;