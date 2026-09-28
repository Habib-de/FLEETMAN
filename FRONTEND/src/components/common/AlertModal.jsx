// src/components/common/AlertModal.jsx
import React, { useState } from 'react';
import { X, Send, AlertTriangle } from 'lucide-react';
import { alertService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ALERT_TYPES = [
  { code: 'MESSAGE',         icon: '💬', label: 'Message',          severity: 'low',    message: 'Please call the office when you can.' },
  { code: 'SLOW_DOWN',       icon: '⚠️', label: 'Slow Down',        severity: 'medium', message: 'You were speeding. Please slow down.' },
  { code: 'STOP_VEHICLE',    icon: '🛑', label: 'Stop Vehicle',     severity: 'high',   message: 'Pull over safely immediately.' },
  { code: 'WRONG_ROUTE',     icon: '📍', label: 'Wrong Route',      severity: 'medium', message: 'You are off the planned route. Please return.' },
  { code: 'RETURN_TO_DEPOT', icon: '⏱️', label: 'Return to Depot', severity: 'high',   message: 'Please return to the depot immediately.' },
  { code: 'TAKE_BREAK',      icon: '☕', label: 'Take a Break',     severity: 'low',    message: "You've been driving a long time. Take a break." },
  { code: 'DANGER_AHEAD',    icon: '🚨', label: 'Danger Ahead',     severity: 'high',   message: 'Hazard reported on your route. Drive carefully.' },
  { code: 'CALL_DISPATCH',   icon: '📞', label: 'Call Dispatch',    severity: 'high',   message: 'Please call the dispatch office urgently.' },
  { code: 'ABORT_TRIP',      icon: '🚫', label: 'Abort Trip',       severity: 'high',   message: 'Cancel the current trip and stand by.' },
  { code: 'ACKNOWLEDGE',     icon: '✅', label: 'Acknowledge',      severity: 'low',    message: 'Confirm receipt of this message.' },
];

const SEVERITY_COLORS = {
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  high: 'bg-red-100 text-red-700 border-red-200',
};

const AlertModal = ({ vehicle, isOpen, onClose, onSent }) => {
  const { currentUser } = useAuth();
  const [selectedCode, setSelectedCode] = useState('SLOW_DOWN');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen || !vehicle) return null;

  const selected = ALERT_TYPES.find(a => a.code === selectedCode) || ALERT_TYPES[0];

  const handleSend = async () => {
    setIsSending(true);
    setError('');
    setSuccess('');
    try {
      const response = await alertService.send(
        vehicle.id,
        selectedCode,
        message || '',
        currentUser?.name || 'Fleet Manager'
      );
      if (response?.success) {
        setSuccess(`✅ Alert sent to ${response.data?.driverName || 'driver'}`);
        setTimeout(() => {
          setMessage('');
          onSent?.(response.data);
          onClose();
        }, 800);
      } else {
        setError(response?.message || 'Failed to send alert');
      }
    } catch (err) {
      setError(err.message || 'Failed to send alert');
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
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Send Alert to Driver</h2>
              <p className="text-red-100 text-sm">
                Vehicle: <span className="font-semibold">{vehicle.reg || vehicle.registration}</span>
                {vehicle.driver && ` · Driver: ${vehicle.driver}`}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Type selector */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alert Type
          </label>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {ALERT_TYPES.map((type) => {
              const isSelected = type.code === selectedCode;
              return (
                <button
                  key={type.code}
                  onClick={() => setSelectedCode(type.code)}
                  className={`p-2.5 rounded-lg text-left text-sm flex items-center gap-2 transition-all border-2 ${
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-medium'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                  type="button"
                >
                  <span className="text-lg">{type.icon}</span>
                  <span className="flex-1 truncate">{type.label}</span>
                  {isSelected && <span className="text-blue-600">●</span>}
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

          {/* Message */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message to driver
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={selected.message}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">
            Leave empty to use the default message: "{selected.message}"
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
              className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              ) : (
                <Send size={16} />
              )}
              {isSending ? 'Sending...' : 'Send Alert'}
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

export default AlertModal;