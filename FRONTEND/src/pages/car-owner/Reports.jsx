// src/pages/car-owner/Reports.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileText, BarChart3, Clock, Download, Eye, X,
  AlertTriangle, Activity, Users, Fuel,
  CheckCircle, AlertCircle, Calendar, Search,
  ChevronDown, ChevronUp, Wrench, DollarSign, MapPinned,
  Upload, File, Truck, Image, FilePlus, FolderOpen,
  RefreshCw, Printer, TrendingUp, Shield, Award, Bookmark, Save, Trash2,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  vehicleService, driverService, incidentService,
  tripService, maintenanceService, fuelService, geofenceService
} from '../../services/api';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  subMonths, subDays, parseISO, isValid
} from 'date-fns';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { openDB } from 'idb';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const ICON_BG = { red:'bg-red-50', orange:'bg-orange-50', yellow:'bg-yellow-50', green:'bg-green-50', blue:'bg-blue-50', purple:'bg-purple-50', indigo:'bg-indigo-50', gray:'bg-gray-50' };
const ICON_TEXT = { red:'text-red-600', orange:'text-orange-600', yellow:'text-yellow-600', green:'text-green-600', blue:'text-blue-600', purple:'text-purple-600', indigo:'text-indigo-600', gray:'text-gray-600' };
const BADGE = { red:'bg-red-100 text-red-700', orange:'bg-orange-100 text-orange-700', yellow:'bg-yellow-100 text-yellow-700', green:'bg-green-100 text-green-700', blue:'bg-blue-100 text-blue-700', purple:'bg-purple-100 text-purple-700', indigo:'bg-indigo-100 text-indigo-700', gray:'bg-gray-100 text-gray-700' };
const getIconBg = (c) => ICON_BG[c] || ICON_BG.blue;
const getIconText = (c) => ICON_TEXT[c] || ICON_TEXT.blue;
const getBadge = (c) => BADGE[c] || BADGE.gray;
const CATEGORY_COLOR = { 'Fleet Management':'blue','Maintenance':'orange','Fuel':'yellow','Safety':'red','Compliance':'green','Operations':'purple','Executive Summary':'indigo' };

const safeParseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isValid(v) ? v : null;
  try { const d = typeof v === 'string' ? parseISO(v) : new Date(v); return isValid(d) ? d : null; }
  catch { return null; }
};

const getDateBounds = (range, customStart, customEnd) => {
  const now = new Date();
  switch (range) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) };
    case 'this_week': return { start: startOfWeek(now,{weekStartsOn:1}), end: endOfWeek(now,{weekStartsOn:1}) };
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'last_month': { const lm = subMonths(now,1); return { start: startOfMonth(lm), end: endOfMonth(lm) }; }
    case 'last_30_days': return { start: startOfDay(subDays(now,30)), end: endOfDay(now) };
    case 'this_quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'custom': { const s = safeParseDate(customStart); const e = safeParseDate(customEnd); return { start: s?startOfDay(s):null, end: e?endOfDay(e):null }; }
    case 'all': default: return { start: null, end: null };
  }
};

const inRange = (val, start, end) => {
  if (!start && !end) return true;
  const d = safeParseDate(val);
  if (!d) return false;
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
};

const fmtDate = (v) => { const d = safeParseDate(v); return d ? d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : 'N/A'; };
const fmtDateTime = (v) => { const d = safeParseDate(v); return d ? d.toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}) : 'N/A'; };
const fmtNum = (n) => { const v = parseFloat(n); return isNaN(v) ? '0' : v.toLocaleString(undefined,{maximumFractionDigits:2}); };

// ═══════════════════════════════════════════════════════════════
// INDEXEDDB FOR FILE BLOBS
// ═══════════════════════════════════════════════════════════════
const DB_NAME = 'fleetman_files_db';
const STORE = 'report_files';
const getDB = () => openDB(DB_NAME, 1, { upgrade(db) { if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath:'id' }); } });
const saveBlob = async (id, blob) => { const db = await getDB(); await db.put(STORE, { id, blob }); };
const getBlob  = async (id) => { const db = await getDB(); const r = await db.get(STORE, id); return r?.blob || null; };
const delBlob  = async (id) => { const db = await getDB(); await db.delete(STORE, id); };

// ═══════════════════════════════════════════════════════════════
// EXPORTERS
// ═══════════════════════════════════════════════════════════════
const escapeCSV = (v) => {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
};
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const exportCSV = (rows, filename) => {
  if (!rows.length) throw new Error('No data to export');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escapeCSV(r[h])).join(','))].join('\n');
  downloadBlob(new Blob(['\uFEFF' + csv], { type:'text/csv;charset=utf-8;' }), filename);
};

const exportXLSX = (rows, filename, sheetName='Report') => {
  if (!rows.length) throw new Error('No data to export');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0,31));
  XLSX.writeFile(wb, filename);
};

const exportPDF = (title, subtitle, summary, rows, filename) => {
  const doc = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' });
  doc.setFontSize(18); doc.setTextColor(30);
  doc.text(title, 40, 40);
  doc.setFontSize(10); doc.setTextColor(120);
  doc.text(subtitle || '', 40, 58);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 72);

  let y = 92;
  if (summary && Object.keys(summary).length > 0) {
    doc.setFontSize(12); doc.setTextColor(30);
    doc.text('Summary', 40, y); y += 8;
    const summaryRows = Object.entries(summary)
      .filter(([,v]) => typeof v === 'number' || typeof v === 'string')
      .map(([k,v]) => [k.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase()), typeof v === 'number' ? v.toLocaleString() : String(v)]);
    doc.autoTable({
      startY: y, head: [['Metric','Value']], body: summaryRows,
      theme: 'striped', headStyles: { fillColor:[37,99,235] },
      styles: { fontSize: 9, cellPadding: 5 },
      margin: { left: 40, right: 40 },
    });
    y = doc.lastAutoTable.finalY + 20;
  }
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const body = rows.slice(0, 500).map(r => headers.map(h => {
      const v = r[h];
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return JSON.stringify(v).slice(0, 50);
      return String(v).slice(0, 80);
    }));
    doc.autoTable({
      startY: y,
      head: [headers.map(h => h.replace(/([A-Z])/g,' $1').replace(/^./, c => c.toUpperCase()))],
      body,
      theme: 'grid', headStyles: { fillColor:[37,99,235] },
      styles: { fontSize: 8, cellPadding: 4 },
      margin: { left: 40, right: 40 },
    });
    if (rows.length > 500) {
      doc.setFontSize(9); doc.setTextColor(150);
      doc.text(`Showing first 500 of ${rows.length} rows. Export CSV/Excel for full data.`, 40, doc.lastAutoTable.finalY + 16);
    }
  } else {
    doc.setFontSize(10); doc.setTextColor(150);
    doc.text('No data to display for the selected filters.', 40, y + 20);
  }
  doc.save(filename);
};

// ═══════════════════════════════════════════════════════════════
// WHICH FILTERS APPLY TO WHICH REPORT
// ═══════════════════════════════════════════════════════════════
const FILTER_APPLICABILITY = {
  executive_summary:    { date:true,  vehicle:true,  driver:true  },
  service_due:          { date:false, vehicle:true,  driver:false },
  downtime:             { date:false, vehicle:true,  driver:false },
  fleet_summary:        { date:false, vehicle:true,  driver:false },
  utilization:          { date:true,  vehicle:true,  driver:true  },
  maintenance_costs:    { date:true,  vehicle:true,  driver:true  },
  maintenance_category: { date:true,  vehicle:true,  driver:false },
  incident_summary:     { date:true,  vehicle:true,  driver:true  },
  geofence_exceptions:  { date:true,  vehicle:true,  driver:true  },
  driver_performance:   { date:true,  vehicle:true,  driver:true  },
  driver_coaching:      { date:true,  vehicle:true,  driver:true  },
  license_expiry:       { date:false, vehicle:true,  driver:true  },
  compliance_report:    { date:false, vehicle:true,  driver:true  },
  fuel_refills:         { date:true,  vehicle:true,  driver:true  },
  fuel_anomalies:       { date:true,  vehicle:true,  driver:true  },
  trip_summary:         { date:true,  vehicle:true,  driver:true  },
};

// ═══════════════════════════════════════════════════════════════
// NORMALIZERS
// ═══════════════════════════════════════════════════════════════
const nVehicle = (v) => ({
  ...v,
  id: v.id || v.vehicleId,
  registration: v.registration || v.reg || v.id || 'Unknown',
  status: v.status || 'Active',
  year: v.year || null,
  insurance: v.insurance || v.insurance_expiry || null,
  licenseExpiry: v.licenseExpiry || v.license_expiry || null,
  roadworthy: v.roadworthy || v.roadworthy_date || null,
  nextService: v.nextService || v.next_service || null,
  mileage: parseFloat(v.mileage) || 0,
});

const nDriver = (d) => ({
  ...d,
  id: d.id,
  name: d.name || 'Unknown',
  status: d.status || 'Active',
  safetyScore: d.safetyScore ?? d.safety_score ?? 0,
  licenseExpiry: d.licenseExpiry || d.license_expiry || null,
  licenseNumber: d.licenseNumber || d.license_number || '',
  assignedVehicleId: d.assignedVehicleId || d.assigned_vehicle || d.assignedVehicle?.id || null,
  userId: d.userId || d.user_id || null,
});

const nTrip = (t) => ({
  ...t,
  id: t.id,
  vehicleId: t.vehicleId || t.vehicle_id || t.vehicle?.id || null,
  driverId: t.driverId || t.driver_id || t.driver?.id || null,
  status: t.status || 'Completed',
  distance: parseFloat(t.distance) || 0,
  fuelUsed: parseFloat(t.fuelUsed || t.fuel_used) || 0,
  startLocation: t.startLocation || t.start_location || t.from || '',
  endLocation: t.endLocation || t.end_location || t.to || '',
  startTime: t.startTime || t.start_time || t.createdAt || t.created_at || null,
  endTime: t.endTime || t.end_time || null,
  createdAt: t.createdAt || t.created_at || null,
  cost: parseFloat(t.cost) || 0,
});

const nMaint = (m) => ({
  ...m,
  id: m.id,
  type: m.type || 'General',
  status: m.status || 'logged',
  cost: parseFloat(m.cost) || 0,
  vehicleId: m.vehicle?.id || m.vehicleId || m.vehicle_id || null,
  driverId: m.driver?.id || m.driverId || m.driver_id || null,
  mechanic: m.mechanic || '',
  createdAt: m.createdAt || m.created_at || null,
  completedDate: m.completedDate || m.completed_date || null,
  scheduledDate: m.scheduledDate || m.scheduled_date || null,
});

const nFuel = (f) => ({
  ...f,
  id: f.id,
  vehicleId: f.vehicleId || f.vehicle_id || f.vehicle?.id || null,
  driverId: f.driverId || f.driver_id || f.driver?.id || null,
  litres: parseFloat(f.litres) || 0,
  cost: parseFloat(f.cost) || 0,
  efficiency: parseFloat(f.efficiency) || 0,
  status: f.status || 'normal',
  dateTime: f.dateTime || f.date_time || f.createdAt || f.created_at || null,
  createdAt: f.createdAt || f.created_at || null,
});

const nIncident = (i) => ({
  ...i,
  id: i.id,
  vehicleId: i.vehicleId || i.vehicle_id || i.vehicle?.id || null,
  driverId: i.driverId || i.driver_id || i.driver?.id || null,
  severity: (i.severity || 'medium').toLowerCase(),
  status: i.status || 'reported',
  cost: parseFloat(i.cost) || 0,
  incidentType: i.incidentType || i.incident_type || 'Other',
  createdAt: i.createdAt || i.created_at || i.timestamp || null,
});

const nViolation = (v) => ({
  ...v,
  id: v.id,
  vehicleId: v.vehicleId || v.vehicle_id || null,
  driverId: v.driverId || v.driver_id || null,
  violationType: v.violationType || v.violation_type || 'geofence',
  severity: (v.severity || 'medium').toLowerCase(),
  resolved: !!v.resolved,
  timestamp: v.timestamp || v.createdAt || v.created_at || null,
});

// ═══════════════════════════════════════════════════════════════
// CATEGORY BUILDER
// ═══════════════════════════════════════════════════════════════
function buildCategories({ vehicles, drivers, incidents, trips, maintenance, fuelRefills, geofenceViolations }) {
  const cats = [];

  cats.push({
    id: 'executive', label: 'Executive Summary', icon: BarChart3, color: 'indigo',
    reports: [{
      id: 'executive_summary', label: 'Executive Summary Dashboard', icon: BarChart3, color: 'indigo',
      description: `${vehicles.length} vehicles · ${drivers.length} drivers · ${trips.length} trips`,
    }],
  });

  if (vehicles.length > 0) {
    cats.push({
      id: 'fleet_management', label: 'Fleet Management', icon: Truck, color: 'blue',
      reports: [
        { id: 'service_due',   label: 'Service Due / Overdue', icon: Wrench, color: 'orange',
          description: `${vehicles.filter(v => { const d=safeParseDate(v.nextService); return d && Math.ceil((d-new Date())/86400000) <= 30; }).length} due or overdue` },
        { id: 'downtime',      label: 'Downtime & Availability', icon: Clock, color: 'blue',
          description: `${vehicles.filter(v => (v.status||'').toLowerCase()==='maintenance').length} in maintenance` },
        { id: 'fleet_summary', label: 'Fleet Summary', icon: BarChart3, color: 'purple',
          description: `${vehicles.filter(v => (v.status||'').toLowerCase()==='active').length} active of ${vehicles.length}` },
        { id: 'utilization',   label: 'Vehicle Utilization', icon: Activity, color: 'green',
          description: 'Usage and efficiency per vehicle' },
      ],
    });
  }

  if (maintenance.length > 0) {
    const totalCost = maintenance.reduce((s,m) => s + m.cost, 0);
    cats.push({
      id: 'maintenance', label: 'Maintenance', icon: Wrench, color: 'orange',
      reports: [
        { id: 'maintenance_costs',    label: 'Maintenance Costs by Vehicle', icon: DollarSign, color: 'green',
          description: `${maintenance.length} records · LSL ${fmtNum(totalCost)}` },
        { id: 'maintenance_category', label: 'Costs by Type', icon: BarChart3, color: 'blue',
          description: `${new Set(maintenance.map(m => m.type)).size} types` },
      ],
    });
  }

  if (incidents.length > 0 || geofenceViolations.length > 0) {
    const safetyReports = [];
    if (incidents.length > 0) {
      safetyReports.push({
        id: 'incident_summary', label: 'Incident Summary', icon: AlertTriangle, color: 'red',
        description: `${incidents.length} incidents · ${incidents.filter(i => ['high','critical'].includes(i.severity)).length} high`,
      });
    }
    if (geofenceViolations.length > 0) {
      safetyReports.push({
        id: 'geofence_exceptions', label: 'Geofence Exceptions', icon: MapPinned, color: 'blue',
        description: `${geofenceViolations.length} violations`,
      });
    }
    if (drivers.length > 0) {
      const avg = Math.round(drivers.reduce((s,d) => s + d.safetyScore, 0) / drivers.length);
      safetyReports.push({
        id: 'driver_performance', label: 'Driver Performance', icon: Users, color: 'green',
        description: `${drivers.length} drivers · avg ${avg}`,
      });
      safetyReports.push({
        id: 'driver_coaching', label: 'Coaching Needs', icon: Award, color: 'yellow',
        description: `${drivers.filter(d => d.safetyScore < 70).length} need coaching`,
      });
    }
    cats.push({ id: 'safety', label: 'Safety', icon: AlertTriangle, color: 'red', reports: safetyReports });
  }

  if (fuelRefills.length > 0) {
    const totalL = fuelRefills.reduce((s,f) => s + f.litres, 0);
    cats.push({
      id: 'fuel', label: 'Fuel', icon: Fuel, color: 'yellow',
      reports: [
        { id: 'fuel_refills',   label: 'Fuel Refills & Costs', icon: Fuel, color: 'yellow',
          description: `${fuelRefills.length} refills · ${fmtNum(totalL)}L` },
        { id: 'fuel_anomalies', label: 'Fuel Anomalies', icon: AlertTriangle, color: 'red',
          description: `${fuelRefills.filter(f => ['anomaly','high'].includes(f.status)).length} flagged` },
      ],
    });
  }

  if (trips.length > 0) {
    const totalDist = trips.reduce((s,t) => s + t.distance, 0);
    cats.push({
      id: 'operations', label: 'Operations', icon: Activity, color: 'purple',
      reports: [
        { id: 'trip_summary', label: 'Trip Summary', icon: Activity, color: 'purple',
          description: `${trips.length} trips · ${fmtNum(totalDist)} km` },
      ],
    });
  }

  if (drivers.some(d => d.licenseExpiry) || vehicles.some(v => v.licenseExpiry || v.insurance)) {
    const expiring = drivers.filter(d => {
      const e = safeParseDate(d.licenseExpiry); if (!e) return false;
      return Math.ceil((e - new Date())/86400000) <= 90;
    });
    cats.push({
      id: 'compliance', label: 'Compliance', icon: CheckCircle, color: 'green',
      reports: [
        { id: 'license_expiry',    label: 'Driver License Expiry', icon: AlertCircle, color: 'red',
          description: `${expiring.length} expiring soon` },
        { id: 'compliance_report', label: 'Vehicle Compliance', icon: CheckCircle, color: 'green',
          description: `${vehicles.filter(v => v.insurance || v.licenseExpiry).length} vehicles with data` },
      ],
    });
  }

  return cats;
}

// ═══════════════════════════════════════════════════════════════
// REPORT GENERATOR — with proper filter application per report
// ═══════════════════════════════════════════════════════════════
function generateReport(reportId, ctx) {
  const {
    vehicles, drivers, incidents, trips, maintenance, fuelRefills, geofenceViolations,
    filters, appliedFilters, vehicleMap, driverMap,
  } = ctx;

  const applicable = appliedFilters;
  const { start, end, selectedVehicle, selectedDriver } = filters;

  // ─── Helper: filter a list of entities that have vehicle/date ───
  const filterByVehicleDate = (list) => list.filter(item => {
    const vId = item.vehicleId;
    const dt  = item.createdAt || item.startTime || item.dateTime || item.timestamp || item.scheduledDate || item.completedDate;
    if (applicable.vehicle && selectedVehicle !== 'all' && String(vId) !== String(selectedVehicle)) return false;
    if (applicable.date && !inRange(dt, start, end)) return false;
    return true;
  });

  const filterByDriverDate = (list) => list.filter(item => {
    const dId = item.driverId;
    const dt  = item.createdAt || item.startTime || item.dateTime || item.timestamp;
    if (applicable.driver && selectedDriver !== 'all' && String(dId) !== String(selectedDriver)) return false;
    if (applicable.date && !inRange(dt, start, end)) return false;
    return true;
  });

  // ─── Helper: driver-level filter (assignedVehicle + activity date) ───
  const filterDrivers = (list) => {
    let out = list;

    // Vehicle filter → only drivers currently assigned to that vehicle
    if (applicable.vehicle && selectedVehicle !== 'all') {
      out = out.filter(d => String(d.assignedVehicleId) === String(selectedVehicle));
    }

    // Driver filter
    if (applicable.driver && selectedDriver !== 'all') {
      out = out.filter(d => String(d.id) === String(selectedDriver));
    }

    // Date filter → only drivers who had activity in range
    if (applicable.date && (start || end)) {
      const activeIds = new Set();
      trips.forEach(t => {
        if (t.driverId && inRange(t.startTime || t.createdAt, start, end)) activeIds.add(String(t.driverId));
      });
      incidents.forEach(i => {
        if (i.driverId && inRange(i.createdAt, start, end)) activeIds.add(String(i.driverId));
      });
      fuelRefills.forEach(f => {
        if (f.driverId && inRange(f.dateTime || f.createdAt, start, end)) activeIds.add(String(f.driverId));
      });
      out = out.filter(d => activeIds.has(String(d.id)));
    }

    return out;
  };

  // ─── Helper: filter vehicles ───
  const filterVehicles = (list) => {
    let out = list;
    if (applicable.vehicle && selectedVehicle !== 'all') {
      out = out.filter(v => String(v.id) === String(selectedVehicle));
    }
    if (applicable.driver && selectedDriver !== 'all') {
      // vehicles currently assigned to that driver
      const drv = drivers.find(d => String(d.id) === String(selectedDriver));
      const vId = drv?.assignedVehicleId;
      out = vId ? out.filter(v => String(v.id) === String(vId)) : [];
    }
    if (applicable.date && (start || end)) {
      // vehicles with any activity in range
      const activeIds = new Set();
      trips.forEach(t => { if (t.vehicleId && inRange(t.startTime || t.createdAt, start, end)) activeIds.add(String(t.vehicleId)); });
      incidents.forEach(i => { if (i.vehicleId && inRange(i.createdAt, start, end)) activeIds.add(String(i.vehicleId)); });
      fuelRefills.forEach(f => { if (f.vehicleId && inRange(f.dateTime || f.createdAt, start, end)) activeIds.add(String(f.vehicleId)); });
      maintenance.forEach(m => { if (m.vehicleId && inRange(m.createdAt || m.completedDate || m.scheduledDate, start, end)) activeIds.add(String(m.vehicleId)); });
      // keep only active vehicles IF there's any activity, else empty
      out = out.filter(v => activeIds.has(String(v.id)));
    }
    return out;
  };

  switch (reportId) {

    case 'executive_summary': {
      const fVeh = filterVehicles(vehicles);
      const fDrv = filterDrivers(drivers);
      const fTrips = filterByVehicleDate(filterByDriverDate(trips));
      const fInc = filterByVehicleDate(filterByDriverDate(incidents));
      const fMaint = filterByVehicleDate(maintenance);
      const fFuel = filterByVehicleDate(filterByDriverDate(fuelRefills));
      return {
        data: {
          vehicles: fVeh.slice(0, 10).map(v => ({
            registration: v.registration, make: v.make, model: v.model,
            status: v.status, mileage: v.mileage,
          })),
          drivers: fDrv.slice(0, 10).map(d => ({
            name: d.name, status: d.status, safetyScore: d.safetyScore,
          })),
          trips: fTrips.slice(0, 10).map(t => ({
            vehicle: vehicleMap[t.vehicleId] || '—',
            driver: driverMap[t.driverId] || '—',
            distance: t.distance, status: t.status, date: fmtDate(t.startTime),
          })),
          incidents: fInc.slice(0, 10).map(i => ({
            vehicle: vehicleMap[i.vehicleId] || '—',
            driver: driverMap[i.driverId] || '—',
            type: i.incidentType, severity: i.severity, date: fmtDate(i.createdAt),
          })),
        },
        summary: {
          totalVehicles: fVeh.length,
          activeVehicles: fVeh.filter(v => (v.status||'').toLowerCase()==='active').length,
          totalDrivers: fDrv.length,
          activeDrivers: fDrv.filter(d => d.status === 'Active').length,
          totalTrips: fTrips.length,
          completedTrips: fTrips.filter(t => ['completed','Completed'].includes(t.status)).length,
          totalDistance: Math.round(fTrips.reduce((s,t) => s + t.distance, 0)),
          totalIncidents: fInc.length,
          resolvedIncidents: fInc.filter(i => ['resolved','Resolved','closed'].includes(i.status)).length,
          totalMaintenanceCost: Math.round(fMaint.reduce((s,m) => s + m.cost, 0)),
          totalFuelCost: Math.round(fFuel.reduce((s,f) => s + f.cost, 0)),
          avgSafetyScore: fDrv.length ? Math.round(fDrv.reduce((s,d) => s + d.safetyScore, 0)/fDrv.length) : 0,
        },
      };
    }

    case 'service_due': {
      let list = filterVehicles(vehicles).filter(v => {
        const d = safeParseDate(v.nextService);
        if (!d) return false;
        return Math.ceil((d - new Date())/86400000) <= 30;
      });
      return {
        data: list.map(v => ({
          registration: v.registration, make: v.make, model: v.model,
          nextService: fmtDate(v.nextService),
          daysUntil: v.nextService ? Math.ceil((safeParseDate(v.nextService) - new Date())/86400000) : 'N/A',
          mileage: v.mileage,
        })),
        summary: {
          total: list.length,
          overdue: list.filter(v => safeParseDate(v.nextService) < new Date()).length,
          dueSoon: list.filter(v => { const d = safeParseDate(v.nextService); return d && d >= new Date(); }).length,
        },
      };
    }

    case 'downtime': {
      const list = filterVehicles(vehicles);
      return {
        data: list.map(v => ({
          registration: v.registration, status: v.status,
          make: v.make, model: v.model, location: v.location || '—',
        })),
        summary: {
          total: list.length,
          active: list.filter(v => (v.status||'').toLowerCase()==='active').length,
          maintenance: list.filter(v => (v.status||'').toLowerCase()==='maintenance').length,
          decommissioned: list.filter(v => (v.status||'').toLowerCase()==='decommissioned').length,
        },
      };
    }

    case 'fleet_summary': {
      const list = filterVehicles(vehicles);
      return {
        data: list.map(v => ({
          registration: v.registration, make: v.make, model: v.model,
          year: v.year, status: v.status, mileage: v.mileage,
          licenseExpiry: fmtDate(v.licenseExpiry),
        })),
        summary: {
          total: list.length,
          active: list.filter(v => (v.status||'').toLowerCase()==='active').length,
          maintenance: list.filter(v => (v.status||'').toLowerCase()==='maintenance').length,
          decommissioned: list.filter(v => (v.status||'').toLowerCase()==='decommissioned').length,
        },
      };
    }

    case 'utilization': {
      const list = filterVehicles(vehicles);
      const fTrips = filterByVehicleDate(trips);
      return {
        data: list.map(v => {
          const vTrips = fTrips.filter(t => String(t.vehicleId) === String(v.id));
          return {
            registration: v.registration, make: v.make, model: v.model,
            trips: vTrips.length,
            distance: Math.round(vTrips.reduce((s,t) => s + t.distance, 0)),
            status: v.status,
          };
        }),
        summary: {
          total: list.length,
          withTrips: list.filter(v => fTrips.some(t => String(t.vehicleId) === String(v.id))).length,
          utilizationRate: list.length ? Math.round((list.filter(v => fTrips.some(t => String(t.vehicleId) === String(v.id))).length / list.length) * 100) : 0,
        },
      };
    }

    case 'maintenance_costs': {
      const list = filterByVehicleDate(filterByDriverDate(maintenance));
      return {
        data: list.map(m => ({
          vehicle: vehicleMap[m.vehicleId] || '—',
          driver: driverMap[m.driverId] || '—',
          type: m.type, status: m.status, cost: m.cost,
          mechanic: m.mechanic || '—',
          date: fmtDate(m.completedDate || m.scheduledDate || m.createdAt),
        })),
        summary: {
          total: list.length,
          totalCost: Math.round(list.reduce((s,m) => s + m.cost, 0)),
          avgCost: list.length ? Math.round(list.reduce((s,m) => s + m.cost, 0)/list.length) : 0,
          completed: list.filter(m => ['closed','completed'].includes((m.status||'').toLowerCase())).length,
        },
      };
    }

    case 'maintenance_category': {
      const list = filterByVehicleDate(maintenance);
      const byType = {};
      list.forEach(m => {
        byType[m.type] = byType[m.type] || { count: 0, cost: 0 };
        byType[m.type].count += 1; byType[m.type].cost += m.cost;
      });
      return {
        data: Object.entries(byType).map(([type, { count, cost }]) => ({
          type, count, totalCost: Math.round(cost), avgCost: Math.round(cost/count),
        })),
        summary: {
          types: Object.keys(byType).length,
          totalRecords: list.length,
          totalCost: Math.round(list.reduce((s,m) => s + m.cost, 0)),
        },
      };
    }

    case 'incident_summary': {
      const list = filterByVehicleDate(filterByDriverDate(incidents));
      return {
        data: list.map(i => ({
          vehicle: vehicleMap[i.vehicleId] || '—',
          driver: driverMap[i.driverId] || '—',
          type: i.incidentType, severity: i.severity, status: i.status,
          cost: i.cost, date: fmtDate(i.createdAt),
        })),
        summary: {
          total: list.length,
          highSeverity: list.filter(i => ['high','critical'].includes(i.severity)).length,
          resolved: list.filter(i => ['resolved','Resolved','closed'].includes(i.status)).length,
          totalCost: Math.round(list.reduce((s,i) => s + i.cost, 0)),
        },
      };
    }

    case 'geofence_exceptions': {
      const list = filterByVehicleDate(filterByDriverDate(geofenceViolations));
      return {
        data: list.map(v => ({
          vehicle: vehicleMap[v.vehicleId] || '—',
          driver: driverMap[v.driverId] || '—',
          type: v.violationType, severity: v.severity,
          resolved: v.resolved ? 'Yes' : 'No',
          date: fmtDate(v.timestamp),
        })),
        summary: {
          total: list.length,
          resolved: list.filter(v => v.resolved).length,
          unresolved: list.filter(v => !v.resolved).length,
        },
      };
    }

    case 'driver_performance': {
      const list = filterDrivers(drivers);
      return {
        data: list.map(d => ({
          name: d.name, status: d.status,
          safetyScore: d.safetyScore,
          assignedVehicle: vehicleMap[d.assignedVehicleId] || '—',
          licenseNumber: d.licenseNumber || '—',
          licenseExpiry: fmtDate(d.licenseExpiry),
        })),
        summary: {
          total: list.length,
          avgSafetyScore: list.length ? Math.round(list.reduce((s,d) => s + d.safetyScore, 0)/list.length) : 0,
          highPerformers: list.filter(d => d.safetyScore >= 90).length,
          needsCoaching: list.filter(d => d.safetyScore < 70).length,
        },
      };
    }

    case 'driver_coaching': {
      const list = filterDrivers(drivers).filter(d => d.safetyScore < 70);
      return {
        data: list.map(d => ({
          name: d.name, safetyScore: d.safetyScore, status: d.status,
          assignedVehicle: vehicleMap[d.assignedVehicleId] || '—',
          priority: d.safetyScore < 50 ? 'Critical' : d.safetyScore < 60 ? 'High' : 'Medium',
        })),
        summary: {
          total: list.length,
          avgScore: list.length ? Math.round(list.reduce((s,d) => s + d.safetyScore, 0)/list.length) : 0,
        },
      };
    }

    case 'license_expiry': {
      const list = filterDrivers(drivers).filter(d => {
        const e = safeParseDate(d.licenseExpiry); if (!e) return false;
        return Math.ceil((e - new Date())/86400000) <= 90;
      });
      return {
        data: list.map(d => ({
          name: d.name, licenseNumber: d.licenseNumber || '—',
          expiry: fmtDate(d.licenseExpiry),
          daysUntil: d.licenseExpiry ? Math.ceil((safeParseDate(d.licenseExpiry) - new Date())/86400000) : 'N/A',
          status: safeParseDate(d.licenseExpiry) < new Date() ? 'EXPIRED' : 'Expiring',
        })),
        summary: {
          total: list.length,
          expired: list.filter(d => safeParseDate(d.licenseExpiry) < new Date()).length,
          expiringSoon: list.filter(d => { const e = safeParseDate(d.licenseExpiry); return e && e >= new Date(); }).length,
        },
      };
    }

    case 'compliance_report': {
      const list = filterVehicles(vehicles);
      return {
        data: list.map(v => ({
          registration: v.registration,
          insurance: fmtDate(v.insurance),
          licenseExpiry: fmtDate(v.licenseExpiry),
          roadworthy: fmtDate(v.roadworthy),
          status: v.status,
        })),
        summary: {
          total: list.length,
          withInsurance: list.filter(v => v.insurance).length,
          withLicense: list.filter(v => v.licenseExpiry).length,
          withRoadworthy: list.filter(v => v.roadworthy).length,
        },
      };
    }

    case 'fuel_refills': {
      const list = filterByVehicleDate(filterByDriverDate(fuelRefills));
      return {
        data: list.map(f => ({
          vehicle: vehicleMap[f.vehicleId] || '—',
          driver: driverMap[f.driverId] || '—',
          litres: f.litres, cost: f.cost, efficiency: f.efficiency,
          status: f.status, date: fmtDate(f.dateTime),
        })),
        summary: {
          total: list.length,
          totalLitres: Math.round(list.reduce((s,f) => s + f.litres, 0)),
          totalCost: Math.round(list.reduce((s,f) => s + f.cost, 0)),
          avgCostPerLitre: list.reduce((s,f) => s + f.litres, 0) > 0
            ? Math.round((list.reduce((s,f) => s + f.cost, 0) / list.reduce((s,f) => s + f.litres, 0)) * 100) / 100
            : 0,
        },
      };
    }

    case 'fuel_anomalies': {
      const list = filterByVehicleDate(filterByDriverDate(fuelRefills)).filter(f => ['anomaly','high'].includes(f.status));
      return {
        data: list.map(f => ({
          vehicle: vehicleMap[f.vehicleId] || '—',
          driver: driverMap[f.driverId] || '—',
          litres: f.litres, cost: f.cost, efficiency: f.efficiency,
          status: f.status, date: fmtDate(f.dateTime),
        })),
        summary: {
          total: list.length,
          totalLitres: Math.round(list.reduce((s,f) => s + f.litres, 0)),
          totalCost: Math.round(list.reduce((s,f) => s + f.cost, 0)),
        },
      };
    }

    case 'trip_summary': {
      const list = filterByVehicleDate(filterByDriverDate(trips));
      return {
        data: list.map(t => ({
          vehicle: vehicleMap[t.vehicleId] || '—',
          driver: driverMap[t.driverId] || '—',
          from: t.startLocation || '—', to: t.endLocation || '—',
          distance: t.distance, fuelUsed: t.fuelUsed,
          status: t.status, startTime: fmtDate(t.startTime),
        })),
        summary: {
          total: list.length,
          totalDistance: Math.round(list.reduce((s,t) => s + t.distance, 0)),
          completed: list.filter(t => ['completed','Completed'].includes(t.status)).length,
          active: list.filter(t => ['active','Active','in_progress'].includes(t.status)).length,
        },
      };
    }

    default:
      return { data: [], summary: { total: 0 } };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const Reports = () => {
  const { currentUser } = useAuth();

  const [selectedReport, setSelectedReport] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeView, setActiveView] = useState('reports');
  const [expandedSection, setExpandedSection] = useState('executive');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');

  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [exportError, setExportError] = useState('');

  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelRefills, setFuelRefills] = useState([]);
  const [geofenceViolations, setGeofenceViolations] = useState([]);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [savedReports, setSavedReports] = useState([]);

  const successTimer = useRef(null);
  const errorTimer = useRef(null);

  // ─── Flash messages ───
  const flashSuccess = (msg) => {
    setSuccessMessage(msg);
    clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMessage(''), 4000);
  };
  const flashError = (msg) => {
    setErrorMessage(msg);
    clearTimeout(errorTimer.current);
    errorTimer.current = setTimeout(() => setErrorMessage(''), 5000);
  };

  // ─── Load data ───
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    if (!currentUser) { setErrorMessage('Please login'); setIsLoading(false); return; }

    try {
      const tenantId = currentUser.tenantId;
      const violationsPromise =
        typeof geofenceService?.getViolations === 'function'
          ? geofenceService.getViolations(tenantId).catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] });

      const [vR, dR, iR, tR, mR, fR, gR] = await Promise.all([
        vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
        driverService.getAll(tenantId).catch(() => ({ data: [] })),
        incidentService.getByTenant(tenantId).catch(() => ({ data: [] })),
        tripService.getAll(tenantId).catch(() => ({ data: [] })),
        maintenanceService.getAll(tenantId).catch(() => ({ data: [] })),
        fuelService.getAll(tenantId).catch(() => ({ data: [] })),
        violationsPromise,
      ]);

      const unwrap = (r) => { const d = r?.data; return Array.isArray(d) ? d : d ? [d] : []; };

      setVehicles(unwrap(vR).map(nVehicle));
      setDrivers(unwrap(dR).map(nDriver));
      setIncidents(unwrap(iR).map(nIncident));
      setTrips(unwrap(tR).map(nTrip));
      setMaintenance(unwrap(mR).map(nMaint));
      setFuelRefills(unwrap(fR).map(nFuel));
      setGeofenceViolations(unwrap(gR).map(nViolation));

      // Load persisted stuff
      try { const raw = localStorage.getItem('fleetman_report_uploads'); setUploadedFiles(raw ? JSON.parse(raw) : []); } catch { setUploadedFiles([]); }
      try { const raw = localStorage.getItem('fleetman_saved_reports'); setSavedReports(raw ? JSON.parse(raw) : []); } catch { setSavedReports([]); }
    } catch (err) {
      console.error('Error loading data:', err);
      setErrorMessage('Failed to load report data.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  // Listen for external updates
  useEffect(() => {
    const h = () => loadData();
    ['vehiclesUpdated','driversUpdated','incidentsUpdated','tripsUpdated','maintenanceUpdated','fuelUpdated'].forEach(e =>
      window.addEventListener(e, h)
    );
    return () => {
      ['vehiclesUpdated','driversUpdated','incidentsUpdated','tripsUpdated','maintenanceUpdated','fuelUpdated'].forEach(e =>
        window.removeEventListener(e, h)
      );
    };
  }, [loadData]);

  // ─── Derived data ───
  const reportCategories = useMemo(
    () => buildCategories({ vehicles, drivers, incidents, trips, maintenance, fuelRefills, geofenceViolations }),
    [vehicles, drivers, incidents, trips, maintenance, fuelRefills, geofenceViolations]
  );

  const vehicleMap = useMemo(() => {
    const m = {};
    vehicles.forEach(v => { m[String(v.id)] = v.registration; });
    return m;
  }, [vehicles]);

  const driverMap = useMemo(() => {
    const m = {};
    drivers.forEach(d => { m[String(d.id)] = d.name; });
    return m;
  }, [drivers]);

  const filters = useMemo(() => {
    const { start, end } = getDateBounds(dateRange, startDate, endDate);
    return { start, end, selectedVehicle, selectedDriver };
  }, [dateRange, startDate, endDate, selectedVehicle, selectedDriver]);

  const appliedFilters = useMemo(() => {
    if (!selectedReport) return { date:false, vehicle:false, driver:false };
    return FILTER_APPLICABILITY[selectedReport.id] || { date:true, vehicle:true, driver:true };
  }, [selectedReport]);

  const reportData = useMemo(() => {
    if (!selectedReport) return null;
    return generateReport(selectedReport.id, {
      vehicles, drivers, incidents, trips, maintenance, fuelRefills, geofenceViolations,
      filters, appliedFilters, vehicleMap, driverMap,
    });
  }, [selectedReport, filters, appliedFilters, vehicles, drivers, incidents, trips, maintenance, fuelRefills, geofenceViolations, vehicleMap, driverMap]);

  const filteredCategories = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return reportCategories;
    return reportCategories
      .map(c => ({ ...c, reports: c.reports.filter(r =>
        r.label.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)
      )}))
      .filter(c => c.reports.length > 0);
  }, [reportCategories, searchTerm]);

  // ─── Handlers ───
  const handleGenerateReport = (report) => {
    setSelectedReport(report);
    setShowPreview(true);
    setExportError('');
  };

  const handleSaveReport = () => {
    if (!selectedReport || !reportData) return;
    const saved = {
      id: `saved_${Date.now()}`,
      reportId: selectedReport.id,
      label: selectedReport.label,
      date: new Date().toISOString(),
      summary: reportData.summary,
      filters: { dateRange, startDate, endDate, selectedVehicle, selectedDriver },
    };
    const updated = [saved, ...savedReports].slice(0, 50);
    setSavedReports(updated);
    localStorage.setItem('fleetman_saved_reports', JSON.stringify(updated));
    flashSuccess('✅ Report saved');
  };

  const handleDeleteSavedReport = (id) => {
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    localStorage.setItem('fleetman_saved_reports', JSON.stringify(updated));
    flashSuccess('🗑️ Deleted');
  };

  // ═══════════ EXPORT — actually works ═══════════
  const handleExport = () => {
    setExportError('');
    if (!reportData || !selectedReport) {
      setExportError('No report data to export');
      return;
    }

    // Extract rows (may be array OR object of arrays)
    let rows = [];
    if (Array.isArray(reportData.data)) {
      rows = reportData.data;
    } else if (reportData.data && typeof reportData.data === 'object') {
      // Flatten object of arrays
      Object.entries(reportData.data).forEach(([key, val]) => {
        if (Array.isArray(val)) {
          val.forEach(item => {
            if (item && typeof item === 'object') rows.push({ section: key, ...item });
          });
        }
      });
    }

    if (rows.length === 0 && Object.keys(reportData.summary || {}).length === 0) {
      setExportError('No data to export. Adjust filters.');
      return;
    }

    const filenameBase = `${selectedReport.id}_${new Date().toISOString().split('T')[0]}`;

    try {
      if (rows.length === 0) {
        // No tabular data — export summary only
        const summaryRows = Object.entries(reportData.summary || {}).map(([k, v]) => ({
          Metric: k.replace(/_/g, ' '),
          Value: typeof v === 'number' ? v : String(v),
        }));

        if (exportFormat === 'csv') exportCSV(summaryRows, `${filenameBase}.csv`);
        else if (exportFormat === 'excel') exportXLSX(summaryRows, `${filenameBase}.xlsx`, selectedReport.label);
        else exportPDF(selectedReport.label, selectedReport.description, reportData.summary, [], `${filenameBase}.pdf`);
      } else {
        if (exportFormat === 'csv') exportCSV(rows, `${filenameBase}.csv`);
        else if (exportFormat === 'excel') exportXLSX(rows, `${filenameBase}.xlsx`, selectedReport.label);
        else exportPDF(selectedReport.label, selectedReport.description, reportData.summary, rows, `${filenameBase}.pdf`);
      }

      flashSuccess(`✅ Exported as ${exportFormat.toUpperCase()}`);
    } catch (err) {
      console.error('Export error:', err);
      setExportError(`Export failed: ${err.message}`);
    }
  };

  const handlePrint = () => {
    if (!reportData || !selectedReport) return;
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) return;

    let rows = [];
    if (Array.isArray(reportData.data)) rows = reportData.data.slice(0, 200);
    else if (reportData.data && typeof reportData.data === 'object') {
      Object.entries(reportData.data).forEach(([k, v]) => {
        if (Array.isArray(v)) v.forEach(item => {
          if (item && typeof item === 'object') rows.push({ section: k, ...item });
        });
      });
    }

    const summaryHtml = reportData.summary && Object.keys(reportData.summary).length
      ? `<div class="summary"><h2>Summary</h2>${Object.entries(reportData.summary)
          .filter(([,v]) => typeof v === 'number' || typeof v === 'string')
          .map(([k,v]) => `<div class="row"><span>${k.replace(/_/g,' ')}</span><b>${typeof v==='number'?v.toLocaleString():v}</b></div>`)
          .join('')}</div>`
      : '';

    const tableHtml = rows.length
      ? (() => {
          const headers = Object.keys(rows[0]);
          return `<table><thead><tr>${headers.map(h => `<th>${h.replace(/([A-Z])/g,' $1').replace(/^./, c => c.toUpperCase())}</th>`).join('')}</tr></thead>
            <tbody>${rows.map(r => `<tr>${headers.map(h => {
              const v = r[h];
              return `<td>${v===null||v===undefined?'':(typeof v==='object'?JSON.stringify(v).slice(0,40):String(v).slice(0,80))}</td>`;
            }).join('')}</tr>`).join('')}</tbody></table>`;
        })()
      : '<p>No data.</p>';

    win.document.write(`<!DOCTYPE html><html><head><title>${selectedReport.label}</title>
      <style>
        body { font-family: -apple-system, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
        .summary { margin-bottom: 24px; padding: 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
        .summary h2 { font-size: 14px; margin: 0 0 8px; }
        .summary .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; border-bottom: 1px solid #e5e7eb; }
        .summary .row:last-child { border-bottom: none; }
        table { border-collapse: collapse; width: 100%; font-size: 11px; }
        th, td { border: 1px solid #e5e7eb; padding: 6px 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style></head><body>
        <h1>${selectedReport.label}</h1>
        <div class="meta">${selectedReport.description||''} · Generated ${new Date().toLocaleString()}</div>
        ${summaryHtml}${tableHtml}
        <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
      </body></html>`);
    win.document.close();
  };

  // ─── Upload handlers ───
  const handleFileUpload = async (e) => {
    setUploadMessage(''); setUploadError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX = 10 * 1024 * 1024;
    const tooBig = files.find(f => f.size > MAX);
    if (tooBig) { setUploadError(`"${tooBig.name}" exceeds 10MB`); e.target.value = ''; return; }

    const newEntries = [];
    for (const f of files) {
      const id = `file_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
      try {
        await saveBlob(id, f);
        newEntries.push({
          id, name: f.name,
          size: (f.size/1024).toFixed(1) + ' KB',
          sizeBytes: f.size, type: f.type,
          uploadDate: new Date().toISOString(),
        });
      } catch (err) { console.warn('Store failed:', err); }
    }
    const updated = [...uploadedFiles, ...newEntries];
    setUploadedFiles(updated);
    localStorage.setItem('fleetman_report_uploads', JSON.stringify(updated));
    setUploadMessage(`✅ ${newEntries.length} file(s) uploaded`);
    e.target.value = '';
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const deleteFile = async (id) => {
    try { await delBlob(id); } catch {}
    const updated = uploadedFiles.filter(f => f.id !== id);
    setUploadedFiles(updated);
    localStorage.setItem('fleetman_report_uploads', JSON.stringify(updated));
    setUploadMessage('🗑️ Deleted');
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const downloadFile = async (file) => {
    try {
      const blob = await getBlob(file.id);
      if (!blob) { setUploadError('File data not found (was it uploaded before the update?)'); return; }
      downloadBlob(blob, file.name);
    } catch { setUploadError('Download failed'); }
  };

  // ═══════════ RENDER: Reports View ═══════════
  const renderReportsView = () => (
    <div>
      {savedReports.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Bookmark size={16} className="text-purple-500" />
            Recent Saved Reports <span className="text-xs text-gray-400">({savedReports.length})</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {savedReports.slice(0, 5).map(r => {
              const cat = reportCategories.find(c => c.reports.some(x => x.id === r.reportId));
              const def = cat?.reports.find(x => x.id === r.reportId);
              return (
                <button key={r.id} onClick={() => def && handleGenerateReport(def)} disabled={!def}
                  className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 flex items-center gap-1 disabled:opacity-50">
                  <FileText size={12} /> {r.label}
                  <span className="text-xs text-purple-400 ml-1">{fmtDate(r.date)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {filteredCategories.length > 0 ? (
        <div className="space-y-3">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <button className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => setExpandedSection(expandedSection === cat.id ? null : cat.id)}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-lg ${getIconBg(cat.color)} ${getIconText(cat.color)} flex-shrink-0`}>
                    <cat.icon size={16} />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getBadge(CATEGORY_COLOR[cat.label]||'gray')}`}>{cat.label}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">({cat.reports.length})</span>
                </div>
                {expandedSection === cat.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {expandedSection === cat.id && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3 bg-white">
                  {cat.reports.map(report => (
                    <button key={report.id} onClick={() => handleGenerateReport(report)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors text-left group border border-transparent hover:border-blue-200">
                      <div className={`p-2 rounded-lg ${getIconBg(report.color)} ${getIconText(report.color)} group-hover:scale-110 transition-transform flex-shrink-0`}>
                        <report.icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.label}</p>
                        <p className="text-xs text-gray-500 truncate">{report.description}</p>
                      </div>
                      <Eye size={14} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium">{searchTerm ? `No reports match "${searchTerm}"` : 'No reports available'}</p>
          <p className="text-sm">{searchTerm ? 'Try a different search' : 'Add vehicles, drivers, trips to unlock reports'}</p>
        </div>
      )}
    </div>
  );

  // ═══════════ RENDER: Documents ═══════════
  const renderDocumentsView = () => {
    if (uploadedFiles.length === 0) {
      return (
        <div className="text-center py-12">
          <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Documents</h3>
          <p className="text-gray-500 text-sm mb-4">Upload reports, invoices, or files</p>
          <button onClick={() => setShowUploadModal(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 inline-flex items-center gap-2">
            <Upload size={16} /> Upload Documents
          </button>
        </div>
      );
    }

    const grouped = uploadedFiles.reduce((acc, f) => {
      const d = fmtDate(f.uploadDate);
      (acc[d] = acc[d] || []).push(f);
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Total Files</p>
            <p className="text-2xl font-bold">{uploadedFiles.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Total Size</p>
            <p className="text-2xl font-bold">{(uploadedFiles.reduce((s,f) => s + (f.sizeBytes||0), 0)/1024).toFixed(0)} KB</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Types</p>
            <p className="text-2xl font-bold">{new Set(uploadedFiles.map(f => (f.type||'').split('/')[0]||'other')).size}</p>
          </div>
        </div>

        {Object.entries(grouped).map(([date, files]) => (
          <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" /> {date}
                <span className="text-xs text-gray-400 ml-2">({files.length} files)</span>
              </h4>
            </div>
            <div className="divide-y divide-gray-100">
              {files.map(file => (
                <div key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50 group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 rounded-lg bg-gray-100 flex-shrink-0">
                      <File size={18} className="text-gray-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <p className="text-xs text-gray-400">{file.size} · {file.type || 'unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => downloadFile(file)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded" title="Download">
                      <Download size={16} />
                    </button>
                    <button onClick={() => deleteFile(file.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ═══════════ RENDER: Upload modal ═══════════
  const renderUploadModal = () => {
    if (!showUploadModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={() => setShowUploadModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <button onClick={() => setShowUploadModal(false)} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg z-10">
            <X size={24} className="text-gray-500" />
          </button>
          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">Upload Documents</h2>
            <p className="text-purple-100 text-sm">{uploadedFiles.length} file(s) stored</p>
          </div>
          <div className="p-6">
            {uploadMessage && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2"><CheckCircle size={16} /> {uploadMessage}</div>}
            {uploadError && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2"><AlertCircle size={16} /> {uploadError}</div>}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors relative">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 font-medium">Click to browse or drag files here</p>
              <input type="file" multiple className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg" />
              <p className="text-xs text-gray-400 mt-2">Max 10MB per file</p>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Files ({uploadedFiles.length})</h4>
              {uploadedFiles.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <File size={18} className="text-gray-500 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{file.size}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => downloadFile(file)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Download size={16} /></button>
                        <button onClick={() => deleteFile(file.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm border rounded-lg">
                  <FilePlus size={32} className="mx-auto text-gray-300 mb-2" /> No files yet
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button onClick={() => setShowUploadModal(false)} className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════ RENDER: Preview modal ═══════════
  const renderPreviewModal = () => {
    if (!showPreview || !selectedReport) return null;

    const data = reportData?.data;
    const summary = reportData?.summary || {};
    const isArrayData = Array.isArray(data);
    let rowCount = 0;
    if (isArrayData) rowCount = data.length;
    else if (data && typeof data === 'object') {
      rowCount = Object.values(data).reduce((s, v) => s + (Array.isArray(v) ? v.length : 0), 0);
    }

    const showVehicleFilter = appliedFilters.vehicle;
    const showDriverFilter = appliedFilters.driver;
    const showDateFilter = appliedFilters.date;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
        <div className="absolute inset-0" onClick={() => setShowPreview(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white truncate">{selectedReport.label}</h2>
              <p className="text-blue-100 text-sm truncate">{selectedReport.description}</p>
            </div>
            <button onClick={() => setShowPreview(false)} className="p-1.5 hover:bg-white/20 rounded-lg flex-shrink-0 ml-3">
              <X size={24} className="text-white" />
            </button>
          </div>

          {/* Filters bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-2">
              {showDateFilter ? (
                <>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-500" />
                    <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                      value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                      <option value="today">Today</option>
                      <option value="this_week">This Week</option>
                      <option value="this_month">This Month</option>
                      <option value="last_month">Last Month</option>
                      <option value="last_30_days">Last 30 Days</option>
                      <option value="this_quarter">This Quarter</option>
                      <option value="all">All Time</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                  {dateRange === 'custom' && (
                    <>
                      <input type="date" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                        value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                      <span className="text-gray-500 text-sm">to</span>
                      <input type="date" className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                        value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-400" title="This filter doesn't apply to this report">
                  <Calendar size={14} /> Date — N/A
                </div>
              )}

              {showVehicleFilter && vehicles.length > 0 ? (
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}>
                  <option value="all">All Vehicles ({vehicles.length})</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.registration}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-400" title="This filter doesn't apply to this report">
                  <Truck size={14} /> Vehicle — N/A
                </div>
              )}

              {showDriverFilter && drivers.length > 0 ? (
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)}>
                  <option value="all">All Drivers ({drivers.length})</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-xs text-gray-400" title="This filter doesn't apply to this report">
                  <Users size={14} /> Driver — N/A
                </div>
              )}

              <button onClick={handleSaveReport} disabled={!reportData || rowCount === 0}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1 disabled:opacity-50 ml-auto">
                <Save size={14} /> Save
              </button>
            </div>

            {/* Active filter chips */}
            {((showDateFilter && dateRange !== 'all') || (showVehicleFilter && selectedVehicle !== 'all') || (showDriverFilter && selectedDriver !== 'all')) && (
              <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-gray-200">
                <span className="text-xs text-gray-500">Active:</span>
                {showDateFilter && dateRange !== 'all' && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{dateRange.replace(/_/g,' ')}</span>
                )}
                {showVehicleFilter && selectedVehicle !== 'all' && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    {vehicleMap[selectedVehicle] || selectedVehicle}
                  </span>
                )}
                {showDriverFilter && selectedDriver !== 'all' && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {driverMap[selectedDriver] || selectedDriver}
                  </span>
                )}
                <button onClick={() => { setDateRange('all'); setSelectedVehicle('all'); setSelectedDriver('all'); }}
                  className="text-xs text-gray-500 hover:text-gray-700 underline ml-1">Clear all</button>
              </div>
            )}

            {/* Info banner for inapplicable filters */}
            {(!showDateFilter || !showVehicleFilter || !showDriverFilter) && (
              <div className="flex items-start gap-2 mt-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded p-2">
                <Info size={12} className="mt-0.5 flex-shrink-0 text-blue-500" />
                <span>
                  Some filters don't apply to this report. Greyed-out filters are disabled.
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {reportData ? (
              <div className="space-y-4">
                {/* Summary */}
                {Object.keys(summary).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-sm text-gray-700 mb-3">Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(summary).map(([k, v]) => (
                        <div key={k} className="bg-white p-3 rounded-lg border border-gray-100">
                          <p className="text-xs text-gray-500 capitalize truncate">{k.replace(/_/g,' ')}</p>
                          <p className="text-lg font-bold truncate">
                            {typeof v === 'number' ? v.toLocaleString() : String(v ?? 'N/A')}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data preview */}
                {isArrayData && data.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                      <h4 className="font-medium text-sm">Data Preview</h4>
                      <span className="text-xs text-gray-400">Showing {Math.min(20, data.length)} of {data.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(data[0]).slice(0, 6).map(k => (
                              <th key={k} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                                {k.replace(/([A-Z])/g,' $1').replace(/^./, c => c.toUpperCase())}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.slice(0, 20).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.entries(row).slice(0, 6).map(([k, v]) => (
                                <td key={k} className="px-3 py-2 text-xs whitespace-nowrap">
                                  {typeof v === 'object' ? JSON.stringify(v).slice(0,40) : String(v ?? 'N/A').slice(0,60)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : !isArrayData && data && Object.keys(data).length > 0 ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-3">Data Overview</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(data).map(([k, v]) => (
                        <div key={k} className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 capitalize truncate">{k.replace(/([A-Z])/g,' $1').trim()}</p>
                          <p className="text-lg font-bold">
                            {Array.isArray(v) ? `${v.length} rows` : typeof v === 'object' ? Object.keys(v).length : v}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="font-medium">No data for the current filters</p>
                    <p className="text-xs">Try clearing filters or widening the date range</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">Loading report…</div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
            {exportError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs flex items-center gap-2">
                <AlertCircle size={14} /> {exportError}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Export as:</span>
                <select className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
                  <option value="pdf">PDF</option>
                  <option value="excel">Excel (.xlsx)</option>
                  <option value="csv">CSV</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg">Close</button>
                <button onClick={handlePrint} disabled={!reportData}
                  className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50">
                  <Printer size={16} /> Print
                </button>
                <button onClick={handleExport} disabled={!reportData || rowCount === 0}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
                  <Download size={16} /> Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════ MAIN RENDER ═══════════
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading report data…</p>
        </div>
      </div>
    );
  }

  const totalReports = reportCategories.reduce((s,c) => s + c.reports.length, 0);

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 size={24} className="text-blue-600" /> Reports & Analytics
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {reportCategories.length} categories · {totalReports} reports
              {uploadedFiles.length > 0 && ` · 📁 ${uploadedFiles.length} files`}
              {savedReports.length > 0 && ` · 💾 ${savedReports.length} saved`}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={loadData} className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Refresh">
              <RefreshCw size={16} className="sm:w-[18px] sm:h-[18px] hover:rotate-180 transition-transform duration-500" />
            </button>
            <button onClick={() => setShowUploadModal(true)}
              className="bg-purple-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-purple-700 flex items-center gap-1 sm:gap-2 whitespace-nowrap">
              <Upload size={12} className="sm:w-4 sm:h-4" />
              <span>Upload Docs</span>
              {uploadedFiles.length > 0 && <span>({uploadedFiles.length})</span>}
            </button>
            <div className="relative">
              <Search size={14} className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <Search size={16} className="hidden sm:block absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search reports…"
                className="pl-7 sm:pl-9 pr-2 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-32 sm:w-56"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 border-b border-gray-200">
          {[
            { id:'reports',   label:'Reports',   icon: BarChart3,  count: totalReports },
            { id:'documents', label:'Documents', icon: FolderOpen, count: uploadedFiles.length },
            { id:'saved',     label:'Saved',     icon: Bookmark,   count: savedReports.length },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveView(tab.id)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1.5 ${
                activeView === tab.id ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <tab.icon size={16} /> {tab.label}
              {tab.count > 0 && <span className="text-xs">({tab.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {activeView === 'reports' && renderReportsView()}
        {activeView === 'documents' && renderDocumentsView()}
        {activeView === 'saved' && (
          <div>
            {savedReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedReports.map(report => {
                  const cat = reportCategories.find(c => c.reports.some(r => r.id === report.reportId));
                  const def = cat?.reports.find(r => r.id === report.reportId);
                  return (
                    <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{report.label}</p>
                        <p className="text-xs text-gray-500">Saved: {new Date(report.date).toLocaleString()}</p>
                        <div className="flex gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                          <span>{report.filters?.dateRange || 'all'}</span>
                          <span>·</span>
                          <span>Veh: {report.filters?.selectedVehicle === 'all' ? 'all' : (vehicleMap[report.filters?.selectedVehicle] || report.filters?.selectedVehicle)}</span>
                          <span>·</span>
                          <span>Drv: {report.filters?.selectedDriver === 'all' ? 'all' : (driverMap[report.filters?.selectedDriver] || report.filters?.selectedDriver)}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => def && handleGenerateReport(def)} disabled={!def}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-30" title={def ? 'Open' : 'Report unavailable'}>
                          <Eye size={16} />
                        </button>
                        <button onClick={() => handleDeleteSavedReport(report.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bookmark size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="font-medium">No saved reports</p>
                <p className="text-sm">Open any report and click Save to bookmark it</p>
                <button onClick={() => setActiveView('reports')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 inline-flex items-center gap-2">
                  <BarChart3 size={16} /> Browse Reports
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {renderUploadModal()}
      {renderPreviewModal()}
    </div>
  );
};

export default Reports;