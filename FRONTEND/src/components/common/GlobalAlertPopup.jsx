// src/components/common/GlobalAlertPopup.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, Check, Send, Eye } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { driverReportService, notificationService } from '../../services/api';

// ============================================
// REPORT TYPE METADATA
// ============================================
const REPORT_META = {
  EMERGENCY:  { icon: '🚨', severity: 'critical', label: 'Emergency' },
  ACCIDENT:   { icon: '💥', severity: 'critical', label: 'Accident' },
  BREAKDOWN:  { icon: '🔧', severity: 'high',     label: 'Breakdown' },
  CALLBACK:   { icon: '📞', severity: 'high',     label: 'Call Me' },
  ROAD_ISSUE: { icon: '🚧', severity: 'medium',   label: 'Road Issue' },
  FUEL:       { icon: '⛽', severity: 'medium',   label: 'Low Fuel' },
  TRAFFIC:    { icon: '🚦', severity: 'low',      label: 'Heavy Traffic' },
  DELAY:      { icon: '⏱️', severity: 'low',      label: 'Delay' },
  MESSAGE:    { icon: '💬', severity: 'low',      label: 'Message' },
  OTHER:      { icon: '📝', severity: 'low',      label: 'Other' },
};

// ============================================
// ALERT TYPE METADATA (manager → driver)
// ============================================
const ALERT_META = {
  MESSAGE:         { icon: '💬', severity: 'low' },
  SLOW_DOWN:       { icon: '⚠️', severity: 'medium' },
  STOP_VEHICLE:    { icon: '🛑', severity: 'high' },
  WRONG_ROUTE:     { icon: '📍', severity: 'medium' },
  RETURN_TO_DEPOT: { icon: '⏱️', severity: 'high' },
  TAKE_BREAK:      { icon: '☕', severity: 'low' },
  DANGER_AHEAD:    { icon: '🚨', severity: 'high' },
  CALL_DISPATCH:   { icon: '📞', severity: 'high' },
  ABORT_TRIP:      { icon: '🚫', severity: 'high' },
  ACKNOWLEDGE:     { icon: '✅', severity: 'low' },
};

const GlobalAlertPopup = () => {
  const { currentUser } = useAuth();
  const [activePopup, setActivePopup] = useState(null);
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplyInput, setShowReplyInput] = useState(false);

  const userRole = currentUser?.role || 'user';

  // ============================================
  // CLASSIFY A NOTIFICATION — is this for me?
  // ============================================
  const classifyNotification = useCallback((notif) => {
    const type = notif.type || '';

    // ---- MANAGER (car_owner / super_admin) ----
    if (userRole === 'car_owner' || userRole === 'super_admin') {
      // Driver reports come to managers
      if (
        type.startsWith('driver_report_') &&
        !type.startsWith('driver_report_reply_') &&
        !type.startsWith('driver_report_ack_') &&
        !type.startsWith('driver_report_resolved_')
      ) {
        const code = type.replace('driver_report_', '');
        const meta = REPORT_META[code] || { icon: '📝', severity: 'low', label: code };
        return {
          kind: 'driver_report',
          code,
          icon: meta.icon,
          severity: meta.severity,
          headerLabel: `Driver Report · ${meta.label}`,
          title: notif.title || `Driver Report: ${meta.label}`,
          message: notif.message || '',
          createdAt: notif.createdAt || new Date().toISOString(),
          notifId: notif.id,
        };
      }
    }

    // ---- DRIVER ----
    if (userRole === 'driver') {
      // Manager alerts
      if (type.startsWith('manager_alert_')) {
        const code = type.replace('manager_alert_', '');
        const meta = ALERT_META[code] || { icon: '📢', severity: 'medium' };
        return {
          kind: 'manager_alert',
          code,
          icon: meta.icon,
          severity: meta.severity,
          headerLabel: 'Alert from Fleet Manager',
          title: notif.title || 'Alert',
          message: notif.message || '',
          createdAt: notif.createdAt || new Date().toISOString(),
          notifId: notif.id,
        };
      }

      // Manager replies to my report
      if (type.startsWith('driver_report_reply_')) {
        return {
          kind: 'manager_reply',
          code: 'MESSAGE',
          icon: '💬',
          severity: 'medium',
          headerLabel: 'Manager replied',
          title: notif.title || '💬 Manager replied',
          message: notif.message || '',
          createdAt: notif.createdAt || new Date().toISOString(),
          notifId: notif.id,
        };
      }
    }

    return null;
  }, [userRole]);

  // ============================================
  // LISTEN FOR NEW NOTIFICATIONS
  // ============================================
  useEffect(() => {
    const handle = (event) => {
      const notif = event.detail;
      if (!notif) return;

      const classified = classifyNotification(notif);
      if (!classified) return;

      console.log('🔔 Global alert:', classified.kind, classified.code);

      // Replace any existing popup with the newest one
      setActivePopup(classified);
      setShowReplyInput(false);
      setReplyText('');
    };

    window.addEventListener('newNotification', handle);

    // Also: on mount, fetch unread and pick the most recent relevant one
    const fetchExisting = async () => {
      if (!currentUser?.id) return;
      try {
        const res = await notificationService.getUnread(currentUser.id);
        const notifications = res?.data || [];
        for (const n of notifications) {
          const classified = classifyNotification(n);
          if (classified) {
            setActivePopup(classified);
            break; // take the first (newest) relevant one
          }
        }
      } catch (e) {
        // silent
      }
    };
    fetchExisting();

    return () => window.removeEventListener('newNotification', handle);
  }, [currentUser?.id, classifyNotification]);

  // ============================================
  // ACTIONS
  // ============================================
  const handleDismiss = async () => {
    // Mark as read so it doesn't reappear
    if (activePopup?.notifId) {
      try { await notificationService.markAsRead(activePopup.notifId); } catch (e) {}
    }
    setActivePopup(null);
    setShowReplyInput(false);
    setReplyText('');
  };

  const handleAcknowledge = async () => {
    if (!activePopup?.notifId) return;
    try {
      await notificationService.markAsRead(activePopup.notifId);
      setActivePopup(null);
    } catch (e) {
      console.warn('Acknowledge failed:', e);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activePopup?.notifId) return;
    setIsReplying(true);
    try {
      await driverReportService.reply(activePopup.notifId, replyText.trim());
      setActivePopup(null);
      setShowReplyInput(false);
      setReplyText('');
    } catch (e) {
      console.error('Reply failed:', e);
    } finally {
      setIsReplying(false);
    }
  };

  // ============================================
  // SEVERITY STYLES
  // ============================================
  const severityStyles = {
    critical: 'bg-red-50 border-red-500 text-red-900',
    high:     'bg-orange-50 border-orange-500 text-orange-900',
    medium:   'bg-yellow-50 border-yellow-500 text-yellow-900',
    low:      'bg-blue-50 border-blue-500 text-blue-900',
  };

  if (!activePopup) return null;

  const style = severityStyles[activePopup.severity] || severityStyles.low;
  const isCritical = activePopup.severity === 'critical';

  return (
    <div className="fixed top-3 right-3 left-3 sm:left-auto sm:top-4 sm:right-4 z-[9998] sm:max-w-md pointer-events-none">
      <div
        className={`pointer-events-auto rounded-xl shadow-2xl border-2 p-4 ${style} ${isCritical ? 'animate-pulse' : ''}`}
      >
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 text-3xl leading-none">
            {activePopup.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">
              {activePopup.headerLabel}
            </p>
            <h3 className="text-base font-bold leading-tight mt-0.5">
              {activePopup.title}
            </h3>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-black/10 flex-shrink-0"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message body — click to open reply for managers */}
        <p className="text-sm mt-2 whitespace-pre-line line-clamp-3">
          {activePopup.message}
        </p>

        <p className="text-[10px] opacity-60 mt-2">
          {new Date(activePopup.createdAt).toLocaleString()}
        </p>

        {/* Reply input (only shown if user taps Reply) */}
        {showReplyInput && (
          <div className="mt-3 pt-3 border-t border-black/10">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={2}
              placeholder="Type your reply..."
              className="w-full text-sm p-2 rounded-lg border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white text-gray-800"
              disabled={isReplying}
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleSendReply}
                disabled={isReplying || !replyText.trim()}
                className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isReplying ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Send size={14} />
                )}
                {isReplying ? 'Sending…' : 'Send'}
              </button>
              <button
                onClick={() => { setShowReplyInput(false); setReplyText(''); }}
                disabled={isReplying}
                className="px-3 text-sm text-gray-600 hover:bg-black/5 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {!showReplyInput && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-black/10">
            {activePopup.kind === 'driver_report' && (
              <button
                onClick={() => setShowReplyInput(true)}
                className="flex-1 min-w-[80px] bg-blue-600 text-white text-xs py-1.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1.5"
              >
                <Send size={12} /> Reply
              </button>
            )}

            <button
              onClick={handleAcknowledge}
              className="flex-1 min-w-[80px] bg-green-600 text-white text-xs py-1.5 rounded-lg hover:bg-green-700 flex items-center justify-center gap-1.5"
            >
              <Check size={12} /> Acknowledge
            </button>

            <button
              onClick={handleDismiss}
              className="px-3 text-xs text-gray-600 hover:bg-black/5 rounded-lg py-1.5"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalAlertPopup;