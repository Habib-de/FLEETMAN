// src/services/eventBus.js
// ============================================
// CENTRAL EVENT BUS
// ============================================
// This is the "PA system" for the whole app.
// Any page can EMIT (announce) events.
// Any page can LISTEN for events.
//
// Rule: Always use EVENTS.xxx (never type raw strings)
// ============================================

// ============================================
// EVENT NAMES — All events in ONE place
// ============================================
export const EVENTS = {
  // ---------- VEHICLE EVENTS ----------
  VEHICLE_CREATED: 'vehicle:created',
  VEHICLE_UPDATED: 'vehicle:updated',
  VEHICLE_DELETED: 'vehicle:deleted',
  VEHICLE_STATUS_CHANGED: 'vehicle:statusChanged',       // ← MAIN ONE for Fix #1
  VEHICLE_MILEAGE_UPDATED: 'vehicle:mileageUpdated',
  VEHICLE_ASSIGNED: 'vehicle:assigned',                  // driver assigned
  VEHICLE_UNASSIGNED: 'vehicle:unassigned',

  // ---------- DRIVER EVENTS ----------
  DRIVER_CREATED: 'driver:created',
  DRIVER_UPDATED: 'driver:updated',
  DRIVER_DELETED: 'driver:deleted',
  DRIVER_SCORE_CHANGED: 'driver:scoreChanged',
  DRIVER_ASSIGNED: 'driver:assigned',
  DRIVER_UNASSIGNED: 'driver:unassigned',

  // ---------- TRIP EVENTS ----------
  TRIP_STARTED: 'trip:started',
  TRIP_ENDED: 'trip:ended',
  TRIP_UPDATED: 'trip:updated',

  // ---------- INCIDENT EVENTS ----------
  INCIDENT_CREATED: 'incident:created',
  INCIDENT_UPDATED: 'incident:updated',
  INCIDENT_RESOLVED: 'incident:resolved',

  // ---------- COMPLIANCE EVENTS ----------
  COMPLIANCE_CREATED: 'compliance:created',
  COMPLIANCE_UPDATED: 'compliance:updated',
  COMPLIANCE_EXPIRED: 'compliance:expired',
  COMPLIANCE_EXPIRING: 'compliance:expiring',

  // ---------- FUEL EVENTS ----------
  FUEL_REFILL_ADDED: 'fuel:refillAdded',
  FUEL_REFILL_UPDATED: 'fuel:refillUpdated',
  FUEL_REFILL_DELETED: 'fuel:refillDeleted',
  FUEL_ANOMALY_DETECTED: 'fuel:anomalyDetected',

  // ---------- MAINTENANCE EVENTS ----------
  MAINTENANCE_CREATED: 'maintenance:created',
  MAINTENANCE_UPDATED: 'maintenance:updated',
  MAINTENANCE_STARTED: 'maintenance:started',
  MAINTENANCE_COMPLETED: 'maintenance:completed',

  // ---------- GEOFENCE EVENTS ----------
  GEOFENCE_CREATED: 'geofence:created',
  GEOFENCE_UPDATED: 'geofence:updated',
  GEOFENCE_DELETED: 'geofence:deleted',
  GEOFENCE_VIOLATION: 'geofence:violation',
  GEOFENCE_RESOLVED: 'geofence:resolved',

  // ---------- CHECKLIST EVENTS ----------
  CHECKLIST_CREATED: 'checklist:created',
  CHECKLIST_COMPLETED: 'checklist:completed',
  CHECKLIST_FAILED: 'checklist:failed',
  CHECKLIST_SUBMITTED: 'checklist:submitted',

  // ---------- POOL BOOKING EVENTS ----------
  POOL_BOOKING_CREATED: 'pool:bookingCreated',
  POOL_BOOKING_UPDATED: 'pool:bookingUpdated',
  POOL_BOOKING_ENDED: 'pool:bookingEnded',

  // ---------- GENERIC REFRESH ----------
  REFRESH_ALL: 'app:refreshAll',
};

// ============================================
// EVENT BUS
// ============================================
class EventBus {
  constructor() {
    if (typeof window === 'undefined') {
      this.listeners = {};
    }
  }

  /**
   * EMIT an event — announces it to everyone listening
   * @param {string} eventName - Use EVENTS.xxx
   * @param {object} data - Optional payload
   */
  emit(eventName, data = null) {
    if (typeof window === 'undefined') return;

    // Always dispatch a standard window event (backward compatible)
    const event = new CustomEvent(eventName, { detail: data });
    window.dispatchEvent(event);

    // Debug log (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📢 [EventBus] ${eventName}`, data || '');
    }
  }

  /**
   * LISTEN for an event
   * @param {string} eventName - Use EVENTS.xxx
   * @param {function} callback - Called with (data) when event fires
   * @returns {function} - Unsubscribe function
   */
  on(eventName, callback) {
    if (typeof window === 'undefined') return () => {};

    const handler = (e) => {
      callback(e.detail);
    };

    window.addEventListener(eventName, handler);

    // Return unsubscribe function
    return () => {
      window.removeEventListener(eventName, handler);
    };
  }

  /**
   * LISTEN for an event ONCE
   */
  once(eventName, callback) {
    if (typeof window === 'undefined') return () => {};

    const handler = (e) => {
      window.removeEventListener(eventName, handler);
      callback(e.detail);
    };

    window.addEventListener(eventName, handler);

    return () => {
      window.removeEventListener(eventName, handler);
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================
export const eventBus = new EventBus();
export default eventBus;