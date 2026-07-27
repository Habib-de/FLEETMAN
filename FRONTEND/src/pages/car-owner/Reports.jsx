// src/pages/car-owner/Reports.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, FileDown, BarChart3, 
  Clock, Download, Eye, Filter, X,
  AlertTriangle, Activity, Users, Fuel,
  CheckCircle, AlertCircle,
  Calendar, Search, ChevronDown, ChevronUp,
  Wrench, DollarSign, MapPinned,
  AlertOctagon, Upload, File, Truck, Image, FilePlus,
  FolderOpen, RefreshCw, Printer, Share2,
  PieChart, LineChart, TrendingUp, TrendingDown,
  Zap, Shield, Award, Settings, Link, Bookmark, Save
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  vehicleService, 
  driverService, 
  incidentService,
  tripService,
  maintenanceService,
  fuelService,
  geofenceService
} from '../../services/api';

// ============================================
// REPORT TEMPLATES
// ============================================
const REPORT_TEMPLATES = {
  'executive_summary': {
    id: 'executive_summary',
    label: 'Executive Summary',
    icon: BarChart3,
    color: 'blue',
    description: 'High-level fleet overview with key metrics',
    categories: ['Fleet Management', 'Operations']
  },
  'fleet_performance': {
    id: 'fleet_performance',
    label: 'Fleet Performance Report',
    icon: TrendingUp,
    color: 'green',
    description: 'Vehicle utilization, uptime, and efficiency',
    categories: ['Fleet Management']
  },
  'fuel_consumption': {
    id: 'fuel_consumption',
    label: 'Fuel Consumption Analysis',
    icon: Fuel,
    color: 'yellow',
    description: 'Fuel usage, cost, and efficiency trends',
    categories: ['Fuel']
  },
  'driver_safety': {
    id: 'driver_safety',
    label: 'Driver Safety Scorecard',
    icon: Shield,
    color: 'red',
    description: 'Safety scores, violations, and coaching needs',
    categories: ['Safety']
  },
  'maintenance_cost': {
    id: 'maintenance_cost',
    label: 'Maintenance Cost Analysis',
    icon: Wrench,
    color: 'orange',
    description: 'Cost breakdown by vehicle and service type',
    categories: ['Maintenance']
  },
  'compliance_status': {
    id: 'compliance_status',
    label: 'Compliance Status Report',
    icon: CheckCircle,
    color: 'green',
    description: 'License, insurance, and inspection status',
    categories: ['Compliance']
  }
};

const Reports = () => {
  const { currentUser } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeView, setActiveView] = useState('reports');
  const [dateRange, setDateRange] = useState('this_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [exportFormat, setExportFormat] = useState('pdf');
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Data from API
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [fuelRefills, setFuelRefills] = useState([]);
  const [geofenceViolations, setGeofenceViolations] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [reportCategories, setReportCategories] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [scheduledReports, setScheduledReports] = useState([]);

  // ============================================
  // LOAD DATA FROM API
  // ============================================
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view reports');
      setIsLoading(false);
      return;
    }

    try {
      const tenantId = currentUser.tenantId;
      console.log('📊 Loading report data from API for tenant:', tenantId);

      const [
        vehiclesRes,
        driversRes,
        incidentsRes,
        tripsRes,
        maintenanceRes,
        fuelRes,
        geofenceRes
      ] = await Promise.all([
        vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
        driverService.getAll(tenantId).catch(() => ({ data: [] })),
        incidentService.getByTenant(tenantId).catch(() => ({ data: [] })),
        tripService.getAll(tenantId).catch(() => ({ data: [] })),
        maintenanceService.getAll(tenantId).catch(() => ({ data: [] })),
        fuelService.getAll(tenantId).catch(() => ({ data: [] })),
        geofenceService.getViolations(tenantId).catch(() => ({ data: [] }))
      ]);

      const vehiclesData = vehiclesRes?.data || [];
      const driversData = driversRes?.data || [];
      const incidentsData = incidentsRes?.data || [];
      const tripsData = tripsRes?.data || [];
      const maintenanceData = maintenanceRes?.data || [];
      const fuelData = fuelRes?.data || [];
      const geofenceData = geofenceRes?.data || [];

      setVehicles(vehiclesData);
      setDrivers(driversData);
      setIncidents(incidentsData);
      setTrips(tripsData);
      setMaintenance(maintenanceData);
      setFuelRefills(fuelData);
      setGeofenceViolations(geofenceData);

      loadUploadedFiles();
      loadSavedReports();
      loadScheduledReports();

      generateCategories(
        vehiclesData,
        driversData,
        incidentsData,
        tripsData,
        maintenanceData,
        fuelData,
        geofenceData
      );

    } catch (error) {
      console.error('❌ Error loading report data:', error);
      setErrorMessage('Failed to load report data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  // ============================================
  // LOAD SAVED REPORTS
  // ============================================
  const loadSavedReports = () => {
    const saved = localStorage.getItem('fleetman_saved_reports');
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch (e) {
        setSavedReports([]);
      }
    }
  };

  const loadScheduledReports = () => {
    const scheduled = localStorage.getItem('fleetman_scheduled_reports');
    if (scheduled) {
      try {
        setScheduledReports(JSON.parse(scheduled));
      } catch (e) {
        setScheduledReports([]);
      }
    }
  };

  // ============================================
  // LOAD UPLOADED FILES
  // ============================================
  const loadUploadedFiles = () => {
    const savedFiles = localStorage.getItem('fleetman_report_uploads');
    if (savedFiles) {
      try {
        const parsed = JSON.parse(savedFiles);
        setUploadedFiles(parsed);
        console.log('✅ Loaded uploaded files:', parsed.length);
      } catch (e) {
        console.error('Failed to load uploaded files:', e);
        setUploadedFiles([]);
      }
    } else {
      setUploadedFiles([]);
    }
  };

  // ============================================
  // GENERATE DYNAMIC CATEGORIES FROM DATA
  // ============================================
  const generateCategories = (
    vehiclesData,
    driversData,
    incidentsData,
    tripsData,
    maintenanceData,
    fuelRefillsData,
    geofenceViolationsData
  ) => {
    const categories = [];

    // Fleet Management
    if (vehiclesData.length > 0) {
      const serviceDue = vehiclesData.filter(v => {
        const nextService = v.nextService;
        if (!nextService) return false;
        const today = new Date();
        const serviceDate = new Date(nextService);
        const diff = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));
        return diff <= 30;
      });

      categories.push({
        id: 'fleet_management',
        label: 'Fleet Management',
        icon: Truck,
        color: 'blue',
        reports: [
          { 
            id: 'service_due', 
            label: 'Service Due/Overdue List', 
            icon: Wrench, 
            color: 'orange',
            description: `${serviceDue.length} vehicles due or overdue for service`,
            dataSource: 'vehicles'
          },
          { 
            id: 'downtime', 
            label: 'Downtime & Fleet Availability', 
            icon: Clock, 
            color: 'blue',
            description: `${vehiclesData.filter(v => v.status === 'Maintenance' || v.status === 'maintenance').length} vehicles in maintenance`,
            dataSource: 'vehicles'
          },
          { 
            id: 'fleet_summary', 
            label: 'Fleet Summary Report', 
            icon: BarChart3, 
            color: 'purple',
            description: `${vehiclesData.length} vehicles total, ${vehiclesData.filter(v => v.status === 'Active' || v.status === 'active').length} active`,
            dataSource: 'vehicles'
          },
          { 
            id: 'utilization', 
            label: 'Vehicle Utilization Report', 
            icon: Activity, 
            color: 'green',
            description: 'Vehicle usage and efficiency analysis',
            dataSource: 'vehicles'
          }
        ]
      });
    }

    // Maintenance
    if (maintenanceData.length > 0) {
      const totalCost = maintenanceData.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0);
      categories.push({
        id: 'maintenance',
        label: 'Maintenance',
        icon: Wrench,
        color: 'orange',
        reports: [
          { 
            id: 'maintenance_costs', 
            label: 'Maintenance Costs by Vehicle', 
            icon: DollarSign, 
            color: 'green',
            description: `${maintenanceData.length} maintenance records, total cost: LSL ${totalCost.toLocaleString()}`,
            dataSource: 'maintenance'
          },
          { 
            id: 'maintenance_category', 
            label: 'Maintenance Costs by Type', 
            icon: BarChart3, 
            color: 'blue',
            description: `${new Set(maintenanceData.map(m => m.type)).size} maintenance types`,
            dataSource: 'maintenance'
          },
          { 
            id: 'maintenance_trend', 
            label: 'Maintenance Trend Analysis', 
            icon: TrendingUp, 
            color: 'purple',
            description: 'Monthly maintenance cost trends',
            dataSource: 'maintenance'
          }
        ]
      });
    }

    // Safety
    if (incidentsData.length > 0 || geofenceViolationsData.length > 0) {
      const safetyReports = [];
      
      if (incidentsData.length > 0) {
        safetyReports.push({ 
          id: 'incident_summary', 
          label: 'Incident Summary & Trends', 
          icon: AlertTriangle, 
          color: 'red',
          description: `${incidentsData.length} incidents, ${incidentsData.filter(i => i.severity === 'high' || i.severity === 'High').length} high severity`,
          dataSource: 'incidents'
        });
      }
      
      if (geofenceViolationsData.length > 0) {
        safetyReports.push({ 
          id: 'panic_alerts', 
          label: 'Panic Alerts Report', 
          icon: AlertOctagon, 
          color: 'red',
          description: `${geofenceViolationsData.filter(v => v.violationType === 'panic_alert' || v.violationType === 'panic').length} panic alerts`,
          dataSource: 'geofence_violations'
        });
        safetyReports.push({ 
          id: 'geofence_exceptions', 
          label: 'Geofence Exceptions', 
          icon: MapPinned, 
          color: 'blue',
          description: `${geofenceViolationsData.length} geofence violations`,
          dataSource: 'geofence_violations'
        });
      }
      
      if (driversData.length > 0) {
        const avgScore = Math.round(driversData.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / driversData.length);
        safetyReports.push({ 
          id: 'driver_performance', 
          label: 'Driver Performance Scorecard', 
          icon: Users, 
          color: 'green',
          description: `${driversData.length} drivers, avg safety score: ${avgScore || 0}`,
          dataSource: 'drivers'
        });
        safetyReports.push({ 
          id: 'driver_coaching', 
          label: 'Driver Coaching Needs', 
          icon: Award, 
          color: 'yellow',
          description: 'Drivers needing safety coaching',
          dataSource: 'drivers'
        });
      }
      
      categories.push({
        id: 'safety',
        label: 'Safety',
        icon: AlertTriangle,
        color: 'red',
        reports: safetyReports
      });
    }

    // Fuel
    if (fuelRefillsData.length > 0) {
      const totalLitres = fuelRefillsData.reduce((sum, f) => sum + (parseFloat(f.litres) || 0), 0);
      categories.push({
        id: 'fuel',
        label: 'Fuel',
        icon: Fuel,
        color: 'yellow',
        reports: [
          { 
            id: 'fuel_refills', 
            label: 'Fuel Refills & Cost Trends', 
            icon: Fuel, 
            color: 'yellow',
            description: `${fuelRefillsData.length} refills, ${totalLitres.toFixed(0)}L total`,
            dataSource: 'fuel_refills'
          },
          { 
            id: 'fuel_anomalies', 
            label: 'Fuel Usage & Anomalies', 
            icon: Fuel, 
            color: 'red',
            description: `${fuelRefillsData.filter(f => f.status === 'anomaly' || f.status === 'high').length} anomalies detected`,
            dataSource: 'fuel_refills'
          },
          { 
            id: 'fuel_efficiency', 
            label: 'Fuel Efficiency Analysis', 
            icon: TrendingUp, 
            color: 'green',
            description: 'Fuel consumption efficiency by vehicle',
            dataSource: 'fuel_refills'
          }
        ]
      });
    }

    // Operations
    if (tripsData.length > 0) {
      const totalDistance = tripsData.reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0);
      categories.push({
        id: 'operations',
        label: 'Operations',
        icon: Activity,
        color: 'purple',
        reports: [
          { 
            id: 'trip_summary', 
            label: 'Trip Summaries & Utilisation', 
            icon: Activity, 
            color: 'purple',
            description: `${tripsData.length} trips, ${totalDistance.toFixed(0)} km total`,
            dataSource: 'trips'
          },
          { 
            id: 'trip_efficiency', 
            label: 'Trip Efficiency Analysis', 
            icon: TrendingUp, 
            color: 'green',
            description: 'Average trip duration and efficiency',
            dataSource: 'trips'
          }
        ]
      });
    }

    // Compliance
    if (driversData.some(d => d.licenseExpiry)) {
      const expiringSoon = driversData.filter(d => {
        if (!d.licenseExpiry) return false;
        const diff = Math.ceil((new Date(d.licenseExpiry) - new Date()) / (1000 * 60 * 60 * 24));
        return diff <= 90;
      });
      categories.push({
        id: 'compliance',
        label: 'Compliance',
        icon: CheckCircle,
        color: 'green',
        reports: [
          { 
            id: 'license_expiry', 
            label: 'Driver Licence Expiry Exceptions', 
            icon: AlertCircle, 
            color: 'red',
            description: `${expiringSoon.length} licenses expiring soon`,
            dataSource: 'drivers'
          },
          { 
            id: 'compliance_report', 
            label: 'Compliance Report', 
            icon: CheckCircle, 
            color: 'green',
            description: `${vehiclesData.filter(v => v.insurance || v.licenseExpiry).length} vehicles with compliance data`,
            dataSource: 'vehicles'
          }
        ]
      });
    }

    // Executive Summary - Always show
    categories.unshift({
      id: 'executive',
      label: 'Executive Summary',
      icon: BarChart3,
      color: 'purple',
      reports: [
        { 
          id: 'executive_summary', 
          label: 'Executive Summary Dashboard', 
          icon: BarChart3, 
          color: 'purple',
          description: `Complete fleet overview with ${vehiclesData.length} vehicles, ${driversData.length} drivers, ${tripsData.length} trips`,
          dataSource: 'all'
        }
      ]
    });

    setReportCategories(categories);
    console.log('✅ Generated categories:', categories.length);
  };

  // ============================================
  // USE EFFECT - Load data on mount
  // ============================================
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // USE EFFECT - Listen for data updates
  // ============================================
  useEffect(() => {
    const handleDataUpdate = () => {
      console.log('🔄 Data update detected, reloading...');
      loadData();
    };

    const handleStorageChange = (e) => {
      if (e.key && e.key.startsWith('fleetman_')) {
        loadData();
      }
    };

    window.addEventListener('vehiclesUpdated', handleDataUpdate);
    window.addEventListener('driversUpdated', handleDataUpdate);
    window.addEventListener('incidentsUpdated', handleDataUpdate);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('vehiclesUpdated', handleDataUpdate);
      window.removeEventListener('driversUpdated', handleDataUpdate);
      window.removeEventListener('incidentsUpdated', handleDataUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadData]);

  // ============================================
  // HELPERS
  // ============================================
  const getCategoryColor = (category) => {
    const colors = {
      'Fleet Management': 'bg-blue-100 text-blue-700',
      'Maintenance': 'bg-orange-100 text-orange-700',
      'Fuel': 'bg-yellow-100 text-yellow-700',
      'Safety': 'bg-red-100 text-red-700',
      'Compliance': 'bg-green-100 text-green-700',
      'Operations': 'bg-purple-100 text-purple-700',
      'Executive': 'bg-indigo-100 text-indigo-700',
    };
    return colors[category] || 'bg-gray-100 text-gray-700';
  };

  const getIconColor = (color) => {
    const colors = {
      'red': 'text-red-600',
      'orange': 'text-orange-600',
      'yellow': 'text-yellow-600',
      'green': 'text-green-600',
      'blue': 'text-blue-600',
      'purple': 'text-purple-600',
      'indigo': 'text-indigo-600',
    };
    return colors[color] || 'text-blue-600';
  };

  const filteredCategories = reportCategories
    .map(category => ({
      ...category,
      reports: category.reports.filter(report => 
        report.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }))
    .filter(category => category.reports.length > 0);

  // ============================================
  // GENERATE REPORT DATA
  // ============================================
  const generateReportData = (reportId) => {
    let data = [];
    let summary = {};

    switch(reportId) {
      case 'executive_summary':
        data = { vehicles, drivers, trips, incidents, maintenance, fuelRefills };
        summary = {
          totalVehicles: vehicles.length,
          activeVehicles: vehicles.filter(v => v.status === 'Active' || v.status === 'active').length,
          totalDrivers: drivers.length,
          activeDrivers: drivers.filter(d => d.status === 'Active').length,
          totalTrips: trips.length,
          completedTrips: trips.filter(t => t.status === 'completed' || t.status === 'Completed').length,
          totalIncidents: incidents.length,
          resolvedIncidents: incidents.filter(i => i.status === 'resolved' || i.status === 'Resolved').length,
          totalMaintenance: maintenance.length,
          totalFuel: fuelRefills.reduce((sum, f) => sum + (parseFloat(f.litres) || 0), 0),
          totalCost: maintenance.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0) + fuelRefills.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0),
          avgSafetyScore: drivers.length > 0 ? Math.round(drivers.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / drivers.length) : 0
        };
        break;

      case 'service_due':
        data = vehicles.filter(v => {
          const nextService = v.nextService;
          if (!nextService) return false;
          const today = new Date();
          const serviceDate = new Date(nextService);
          const diff = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));
          return diff <= 30;
        });
        summary = {
          total: data.length,
          overdue: data.filter(v => new Date(v.nextService) < new Date()).length,
          dueSoon: data.filter(v => {
            const diff = Math.ceil((new Date(v.nextService) - new Date()) / (1000 * 60 * 60 * 24));
            return diff > 0 && diff <= 14;
          }).length
        };
        break;

      case 'fleet_summary':
        data = vehicles;
        summary = {
          total: data.length,
          active: data.filter(v => v.status === 'Active' || v.status === 'active').length,
          maintenance: data.filter(v => v.status === 'Maintenance' || v.status === 'maintenance').length,
          decommissioned: data.filter(v => v.status === 'Decommissioned' || v.status === 'decommissioned').length,
          avgAge: data.length > 0 ? Math.round(data.reduce((sum, v) => sum + (new Date().getFullYear() - parseInt(v.year)), 0) / data.length) : 0
        };
        break;

      case 'maintenance_costs':
        data = maintenance;
        summary = {
          total: data.length,
          totalCost: data.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0),
          avgCost: data.length > 0 ? Math.round(data.reduce((sum, m) => sum + (parseFloat(m.cost) || 0), 0) / data.length) : 0,
          byType: data.reduce((acc, m) => {
            acc[m.type] = (acc[m.type] || 0) + 1;
            return acc;
          }, {})
        };
        break;

      case 'incident_summary':
        data = incidents;
        summary = {
          total: data.length,
          high: data.filter(i => i.severity === 'high' || i.severity === 'High' || i.severity === 'critical').length,
          resolved: data.filter(i => i.status === 'resolved' || i.status === 'Resolved' || i.status === 'closed').length,
          totalCost: data.reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0)
        };
        break;

      case 'fuel_refills':
        data = fuelRefills;
        summary = {
          total: data.length,
          totalLitres: data.reduce((sum, f) => sum + (parseFloat(f.litres) || 0), 0),
          totalCost: data.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0),
          avgCostPerLitre: data.reduce((sum, f) => sum + (parseFloat(f.litres) || 0), 0) > 0 
            ? data.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0) / data.reduce((sum, f) => sum + (parseFloat(f.litres) || 0), 0)
            : 0
        };
        break;

      case 'fuel_anomalies':
        data = fuelRefills.filter(f => f.status === 'anomaly' || f.status === 'high');
        summary = {
          total: data.length,
          totalLitres: data.reduce((sum, f) => sum + (parseFloat(f.litres) || 0), 0),
          totalCost: data.reduce((sum, f) => sum + (parseFloat(f.cost) || 0), 0)
        };
        break;

      case 'trip_summary':
        data = trips;
        summary = {
          total: data.length,
          totalDistance: data.reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0),
          completed: data.filter(t => t.status === 'completed' || t.status === 'Completed').length,
          active: data.filter(t => t.status === 'active' || t.status === 'Active' || t.status === 'in_progress').length
        };
        break;

      case 'geofence_exceptions':
        data = geofenceViolations;
        summary = {
          total: data.length,
          resolved: data.filter(v => v.resolved).length,
          unresolved: data.filter(v => !v.resolved).length
        };
        break;

      case 'driver_performance':
        data = drivers;
        summary = {
          total: data.length,
          avgSafetyScore: data.length > 0 ? Math.round(data.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / data.length) : 0,
          topPerformers: data.filter(d => (d.safetyScore || 0) >= 90).length,
          needsCoaching: data.filter(d => (d.safetyScore || 0) < 70).length
        };
        break;

      case 'driver_coaching':
        data = drivers.filter(d => (d.safetyScore || 0) < 70);
        summary = {
          total: data.length,
          avgScore: data.length > 0 ? Math.round(data.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / data.length) : 0
        };
        break;

      case 'license_expiry':
        data = drivers.filter(d => {
          if (!d.licenseExpiry) return false;
          const today = new Date();
          const expiry = new Date(d.licenseExpiry);
          const diff = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
          return diff <= 90;
        });
        summary = {
          total: data.length,
          expired: data.filter(d => new Date(d.licenseExpiry) < new Date()).length,
          expiringSoon: data.filter(d => {
            const diff = Math.ceil((new Date(d.licenseExpiry) - new Date()) / (1000 * 60 * 60 * 24));
            return diff > 0 && diff <= 30;
          }).length
        };
        break;

      case 'panic_alerts':
        data = geofenceViolations.filter(v => 
          v.violationType === 'panic_alert' || 
          v.violationType === 'panic' || 
          v.violationType === 'Panic Alert'
        );
        summary = {
          total: data.length,
          resolved: data.filter(v => v.resolved).length,
          unresolved: data.filter(v => !v.resolved).length
        };
        break;

      case 'utilization':
        data = vehicles.filter(v => v.status === 'Active' || v.status === 'active');
        summary = {
          total: data.length,
          withTrips: data.filter(v => trips.some(t => t.vehicleId === v.id || t.vehicle_id === v.id)).length,
          utilizationRate: data.length > 0 ? Math.round((data.filter(v => trips.some(t => t.vehicleId === v.id || t.vehicle_id === v.id)).length / data.length) * 100) : 0
        };
        break;

      default:
        data = [];
        summary = { total: 0 };
    }

    return { data, summary };
  };

  // ============================================
  // FILE UPLOAD HANDLERS
  // ============================================
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadMessage('');
    setUploadError('');

    if (files.length === 0) {
      setUploadError('No files selected');
      return;
    }

    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError(`File "${file.name}" is too large (max 10MB)`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const newFiles = validFiles.map(file => ({
      id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: file.name,
      size: (file.size / 1024).toFixed(1) + ' KB',
      type: file.type,
      uploadDate: new Date().toISOString(),
      status: 'uploaded',
      data: file.size < 1024 * 1024 ? URL.createObjectURL(file) : null
    }));

    const updatedFiles = [...uploadedFiles, ...newFiles];
    setUploadedFiles(updatedFiles);
    
    try {
      const filesToSave = updatedFiles.map(f => ({
        ...f,
        data: undefined
      }));
      localStorage.setItem('fleetman_report_uploads', JSON.stringify(filesToSave));
      setUploadMessage(`✅ ${newFiles.length} file(s) uploaded successfully!`);
      setTimeout(() => setUploadMessage(''), 3000);
    } catch (error) {
      console.error('Error saving files:', error);
      setUploadError('Failed to save files. Please try again.');
    }

    e.target.value = '';
  };

  const deleteFile = (fileId) => {
    const updatedFiles = uploadedFiles.filter(f => f.id !== fileId);
    setUploadedFiles(updatedFiles);
    localStorage.setItem('fleetman_report_uploads', JSON.stringify(updatedFiles));
    setUploadMessage('🗑️ File deleted successfully');
    setTimeout(() => setUploadMessage(''), 3000);
  };

  const downloadFile = (file) => {
    alert(`📥 Downloading: ${file.name}\nSize: ${file.size}\nUploaded: ${new Date(file.uploadDate).toLocaleDateString()}`);
  };

  // ============================================
  // HANDLERS
  // ============================================
  const handleGenerateReport = (report) => {
    setSelectedReport(report);
    setShowPreview(true);
    setIsGenerating(true);
    
    setTimeout(() => {
      const reportResult = generateReportData(report.id);
      setReportData(reportResult);
      setIsGenerating(false);
    }, 800);
  };

  const handleExport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      alert(`✅ Report "${selectedReport?.label}" exported as ${exportFormat.toUpperCase()}`);
    }, 1500);
  };

  const handleSaveReport = () => {
    if (!selectedReport || !reportData) return;
    
    const savedReport = {
      id: `saved_${Date.now()}`,
      reportId: selectedReport.id,
      label: selectedReport.label,
      date: new Date().toISOString(),
      summary: reportData.summary,
      filters: { dateRange, selectedVehicle, selectedDriver }
    };
    
    const updated = [...savedReports, savedReport];
    setSavedReports(updated);
    localStorage.setItem('fleetman_saved_reports', JSON.stringify(updated));
    setSuccessMessage('✅ Report saved successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // ============================================
  // RENDER DOCUMENTS VIEW
  // ============================================
  const renderDocumentsView = () => {
    const savedFiles = localStorage.getItem('fleetman_report_uploads');
    let files = [];
    if (savedFiles) {
      try {
        files = JSON.parse(savedFiles);
      } catch (e) {
        console.error('Failed to load files:', e);
      }
    }

    if (files.length === 0) {
      return (
        <div className="text-center py-12">
          <FolderOpen size={64} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">No Documents Uploaded</h3>
          <p className="text-gray-500 text-sm">Upload your first document using the "Upload Docs" button</p>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="mt-4 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-700 flex items-center gap-2 mx-auto"
          >
            <Upload size={16} /> Upload Documents
          </button>
        </div>
      );
    }

    const groupedFiles = files.reduce((acc, file) => {
      const date = new Date(file.uploadDate).toLocaleDateString();
      if (!acc[date]) acc[date] = [];
      acc[date].push(file);
      return acc;
    }, {});

    const sortedDates = Object.keys(groupedFiles).sort((a, b) => new Date(b) - new Date(a));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Total Documents</p>
            <p className="text-2xl font-bold">{files.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">Total Size</p>
            <p className="text-2xl font-bold">
              {files.reduce((sum, f) => sum + (parseFloat(f.size) || 0), 0).toFixed(0)} KB
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500">File Types</p>
            <p className="text-2xl font-bold">
              {new Set(files.map(f => {
                if (f.type?.includes('pdf')) return 'PDF';
                if (f.type?.includes('excel') || f.type?.includes('sheet')) return 'Excel';
                if (f.type?.includes('word') || f.type?.includes('document')) return 'Word';
                if (f.type?.startsWith('image/')) return 'Image';
                return 'Other';
              })).size}
            </p>
          </div>
        </div>

        {sortedDates.map((date) => (
          <div key={date} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                {date}
                <span className="text-xs text-gray-400 ml-2">({groupedFiles[date].length} files)</span>
              </h4>
            </div>
            <div className="divide-y divide-gray-100">
              {groupedFiles[date].map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`p-2 rounded-lg ${file.type?.startsWith('image/') ? 'bg-blue-50' : 'bg-gray-100'} flex-shrink-0`}>
                      {file.type?.startsWith('image/') ? (
                        <Image size={18} className="text-blue-500" />
                      ) : file.type?.includes('pdf') ? (
                        <FileText size={18} className="text-red-500" />
                      ) : file.type?.includes('excel') || file.type?.includes('sheet') ? (
                        <FileText size={18} className="text-green-500" />
                      ) : file.type?.includes('word') || file.type?.includes('document') ? (
                        <FileText size={18} className="text-blue-500" />
                      ) : (
                        <File size={18} className="text-gray-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        <span>{file.size}</span>
                        <span>•</span>
                        <span className="capitalize">{file.type?.split('/')[1] || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(file.uploadDate).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => downloadFile(file)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded">
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm(`Delete "${file.name}"?`)) {
                          const updatedFiles = files.filter(f => f.id !== file.id);
                          localStorage.setItem('fleetman_report_uploads', JSON.stringify(updatedFiles));
                          loadData();
                        }
                      }}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <X size={16} />
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

  // ============================================
  // RENDER UPLOAD MODAL
  // ============================================
  const renderUploadModal = () => {
    if (!showUploadModal) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowUploadModal(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setShowUploadModal(false)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-5 rounded-t-2xl">
            <h2 className="text-2xl font-bold text-white">Upload Report Documents</h2>
            <p className="text-purple-100 text-sm">Upload reports, invoices, and other documents</p>
            <p className="text-purple-200 text-xs mt-1">{uploadedFiles.length} files uploaded</p>
          </div>

          <div className="p-6">
            {uploadMessage && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <CheckCircle size={16} /> {uploadMessage}
              </div>
            )}
            {uploadError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={16} /> {uploadError}
              </div>
            )}

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors relative">
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 font-medium">Drag & drop files here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse</p>
              <input 
                type="file" 
                multiple 
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileUpload}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
              />
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">PDF</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Excel</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Word</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">CSV</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">Images</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">Max file size: 10MB per file</p>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center justify-between">
                <span>Uploaded Files ({uploadedFiles.length})</span>
                {uploadedFiles.length > 0 && (
                  <span className="text-xs text-gray-400">
                    Total: {uploadedFiles.reduce((sum, f) => sum + (parseFloat(f.size) || 0), 0).toFixed(0)} KB
                  </span>
                )}
              </h4>
              
              {uploadedFiles.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-2 rounded-lg ${file.type?.startsWith('image/') ? 'bg-blue-50' : 'bg-gray-100'}`}>
                          {file.type?.startsWith('image/') ? (
                            <Image size={18} className="text-blue-500" />
                          ) : file.type?.includes('pdf') ? (
                            <FileText size={18} className="text-red-500" />
                          ) : file.type?.includes('excel') || file.type?.includes('sheet') ? (
                            <FileText size={18} className="text-green-500" />
                          ) : (
                            <File size={18} className="text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-400">{file.size} · {new Date(file.uploadDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => downloadFile(file)} className="p-1 text-blue-500 hover:bg-blue-50 rounded">
                          <Download size={16} />
                        </button>
                        <button onClick={() => deleteFile(file.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm border rounded-lg">
                  <FilePlus size={32} className="mx-auto text-gray-300 mb-2" />
                  <p>No files uploaded yet</p>
                  <p className="text-xs">Click the upload area above to add files</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200 mt-4">
              <button 
                onClick={() => setShowUploadModal(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
              {uploadedFiles.length > 0 && (
                <button 
                  onClick={() => {
                    alert(`📁 Uploaded Files:\n\n${uploadedFiles.map(f => `• ${f.name} (${f.size})`).join('\n')}`);
                  }}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <FileDown size={16} /> View All Files
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER PREVIEW MODAL
  // ============================================
  const renderPreviewModal = () => {
    if (!showPreview || !selectedReport) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setShowPreview(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedReport.label}</h2>
              <p className="text-blue-100 text-sm">{selectedReport.description}</p>
            </div>
            <button 
              onClick={() => setShowPreview(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} className="text-white" />
            </button>
          </div>

          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <select 
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  <option value="today">Today</option>
                  <option value="this_week">This Week</option>
                  <option value="this_month">This Month</option>
                  <option value="last_month">Last Month</option>
                  <option value="this_quarter">This Quarter</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
              {dateRange === 'custom' && (
                <>
                  <input 
                    type="date" 
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                  <span className="text-gray-500">to</span>
                  <input 
                    type="date" 
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </>
              )}
              {vehicles.length > 0 && (
                <select 
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                >
                  <option value="all">All Vehicles ({vehicles.length})</option>
                  {vehicles.map(v => (
                    <option key={v.registration || v.id} value={v.registration || v.id}>
                      {v.registration || v.id} - {v.make || 'Unknown'} {v.model || ''}
                    </option>
                  ))}
                </select>
              )}
              {drivers.length > 0 && (
                <select 
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                >
                  <option value="all">All Drivers ({drivers.length})</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              )}
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="word">Word</option>
              </select>
              <button 
                onClick={handleSaveReport}
                disabled={!reportData || reportData.data?.length === 0}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 flex items-center gap-1 disabled:opacity-50"
              >
                <Save size={14} /> Save
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-500">Generating report from your data...</p>
              </div>
            ) : reportData ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Report Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(reportData.summary).map(([key, value]) => (
                      <div key={key} className="bg-white p-3 rounded-lg">
                        <p className="text-xs text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                        <p className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString() : 'N/A'}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-xs text-gray-400">
                    Based on {Array.isArray(reportData.data) ? reportData.data.length : Object.keys(reportData.data).length} records from your fleet data
                  </div>
                </div>
                
                {Array.isArray(reportData.data) && reportData.data.length > 0 ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Data Preview</h4>
                      <span className="text-xs text-gray-400">Showing {Math.min(10, reportData.data.length)} of {reportData.data.length} records</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(reportData.data[0]).slice(0, 5).map((key) => (
                              <th key={key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {reportData.data.slice(0, 10).map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                              {Object.entries(row).slice(0, 5).map(([key, value]) => (
                                <td key={key} className="px-3 py-2 text-xs">
                                  {typeof value === 'object' ? JSON.stringify(value).slice(0, 30) : String(value || 'N/A').slice(0, 30)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : !Array.isArray(reportData.data) && Object.keys(reportData.data).length > 0 ? (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-sm mb-3">Data Overview</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries(reportData.data).map(([key, value]) => (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-xs text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                          <p className="text-lg font-bold">{Array.isArray(value) ? value.length : typeof value === 'object' ? Object.keys(value).length : value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FileText size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No data available for this report</p>
                    <p className="text-xs">Try adjusting your filters or adding data</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500">No report data available</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Export as:</span>
              <select 
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="csv">CSV</option>
                <option value="word">Word</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => {
                  if (window.confirm('Print this report?')) {
                    window.print();
                  }
                }}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Printer size={16} /> Print
              </button>
              <button 
                onClick={handleExport}
                disabled={isGenerating || !reportData || (Array.isArray(reportData.data) && reportData.data.length === 0)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download size={16} />
                {isGenerating ? 'Exporting...' : `Export`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDER REPORTS VIEW
  // ============================================
  const renderReportsView = () => (
    <div>
      {/* Saved Reports Section */}
      {savedReports.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium text-sm text-gray-700 mb-3 flex items-center gap-2">
            <Bookmark size={16} className="text-purple-500" />
            Saved Reports
            <span className="text-xs text-gray-400">({savedReports.length})</span>
          </h4>
          <div className="flex flex-wrap gap-2">
            {savedReports.slice(0, 5).map((report) => (
              <button
                key={report.id}
                onClick={() => {
                  const category = reportCategories.find(c => 
                    c.reports.some(r => r.id === report.reportId)
                  );
                  const reportDef = category?.reports.find(r => r.id === report.reportId);
                  if (reportDef) handleGenerateReport(reportDef);
                }}
                className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 flex items-center gap-1"
              >
                <FileText size={12} />
                {report.label}
                <span className="text-xs text-purple-400 ml-1">
                  {new Date(report.date).toLocaleDateString()}
                </span>
              </button>
            ))}
            {savedReports.length > 5 && (
              <button className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                +{savedReports.length - 5} more
              </button>
            )}
          </div>
        </div>
      )}

      {/* Report Categories */}
      {filteredCategories.length > 0 ? (
        <div className="space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.id}>
              <button 
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => toggleSection(category.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg bg-${category.color}-50 ${getIconColor(category.color)}`}>
                    <category.icon size={16} />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(category.label)}`}>
                    {category.label}
                  </span>
                  <span className="text-sm font-medium">{category.label}</span>
                  <span className="text-xs text-gray-400">({category.reports.length} reports)</span>
                </div>
                {expandedSection === category.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {expandedSection === category.id && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 pl-4">
                  {category.reports.map((report) => (
                    <button 
                      key={report.id}
                      onClick={() => handleGenerateReport(report)}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors text-left group border border-transparent hover:border-blue-200"
                    >
                      <div className={`p-2 rounded-lg bg-${report.color}-50 ${getIconColor(report.color)} group-hover:scale-110 transition-transform`}>
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
        <div className="text-center py-8 text-gray-500">
          <FileText size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No reports available</p>
          <p className="text-sm">Add data to your fleet to see reports here</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading report data...</p>
        </div>
      </div>
    );
  }

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

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <BarChart3 size={24} className="text-blue-600" />
              Reports & Analytics
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {reportCategories.length} report categories · {reportCategories.reduce((sum, cat) => sum + cat.reports.length, 0)} available reports
              {uploadedFiles.length > 0 && ` · 📁 ${uploadedFiles.length} uploaded files`}
              {savedReports.length > 0 && ` · 💾 ${savedReports.length} saved reports`}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
  <button 
    onClick={loadData}
    className="p-1.5 sm:p-2 text-gray-400 hover:text-blue-600 transition-colors"
    title="Refresh data"
  >
    <RefreshCw size={16} className="sm:w-[18px] sm:h-[18px] hover:rotate-180 transition-transform duration-500" />
  </button>
  
  <button 
    onClick={() => setShowUploadModal(true)}
    className="bg-purple-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-purple-700 flex items-center gap-1 sm:gap-2 whitespace-nowrap"
  >
    <Upload size={12} className="sm:w-4 sm:h-4" /> 
    <span className="text-[10px] sm:text-sm">Upload Docs</span>
    {uploadedFiles.length > 0 && <span className="text-[10px] sm:text-sm">({uploadedFiles.length})</span>}
  </button>
  
  {/* Mobile Search - Compact */}
  <div className="relative">
    <Search size={14} className="sm:hidden absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
    <Search size={16} className="hidden sm:block absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input 
      type="text" 
      placeholder="Search..." 
      className="pl-7 sm:pl-9 pr-2 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-24 sm:w-48 transition-all duration-300"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>
</div>
        </div>

        <div className="flex gap-1 mt-4 border-b border-gray-200">
          <button
            onClick={() => setActiveView('reports')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeView === 'reports' 
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart3 size={16} className="inline mr-1" />
            Reports
          </button>
          <button
            onClick={() => setActiveView('documents')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeView === 'documents' 
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FolderOpen size={16} className="inline mr-1" />
            Documents {uploadedFiles.length > 0 && `(${uploadedFiles.length})`}
          </button>
          <button
            onClick={() => {
              // Show saved reports only
              setActiveView('saved');
            }}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeView === 'saved' 
                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Bookmark size={16} className="inline mr-1" />
            Saved {savedReports.length > 0 && `(${savedReports.length})`}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        {activeView === 'reports' && renderReportsView()}
        {activeView === 'documents' && renderDocumentsView()}
        {activeView === 'saved' && (
          <div>
            {savedReports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedReports.map((report) => (
                  <div key={report.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <div>
                      <p className="font-medium text-sm">{report.label}</p>
                      <p className="text-xs text-gray-500">
                        Saved: {new Date(report.date).toLocaleString()}
                      </p>
                      <div className="flex gap-2 mt-1 text-xs text-gray-400">
                        <span>Date: {report.filters?.dateRange || 'N/A'}</span>
                        <span>•</span>
                        <span>Vehicle: {report.filters?.selectedVehicle || 'All'}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const category = reportCategories.find(c => 
                            c.reports.some(r => r.id === report.reportId)
                          );
                          const reportDef = category?.reports.find(r => r.id === report.reportId);
                          if (reportDef) handleGenerateReport(reportDef);
                        }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const updated = savedReports.filter(r => r.id !== report.id);
                          setSavedReports(updated);
                          localStorage.setItem('fleetman_saved_reports', JSON.stringify(updated));
                          setSuccessMessage('🗑️ Report deleted');
                          setTimeout(() => setSuccessMessage(''), 3000);
                        }}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Bookmark size={48} className="mx-auto text-gray-300 mb-3" />
                <p>No saved reports</p>
                <p className="text-sm">Generate and save reports to see them here</p>
              </div>
            )}
          </div>
        )}
      </div>

      {activeView === 'reports' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehicles.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-500">Total Vehicles</p>
              <p className="text-2xl font-bold">{vehicles.length}</p>
              <p className="text-xs text-gray-400">{vehicles.filter(v => v.status === 'Active' || v.status === 'active').length} active</p>
            </div>
          )}
          {drivers.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-500">Total Drivers</p>
              <p className="text-2xl font-bold">{drivers.length}</p>
              <p className="text-xs text-gray-400">{drivers.filter(d => d.status === 'Active').length} active</p>
            </div>
          )}
          {trips.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-500">Total Trips</p>
              <p className="text-2xl font-bold">{trips.length}</p>
              <p className="text-xs text-gray-400">{trips.filter(t => t.status === 'completed' || t.status === 'Completed').length} completed</p>
            </div>
          )}
          {incidents.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <p className="text-xs text-gray-500">Incidents</p>
              <p className="text-2xl font-bold">{incidents.length}</p>
              <p className="text-xs text-gray-400">{incidents.filter(i => i.status === 'resolved' || i.status === 'Resolved').length} resolved</p>
            </div>
          )}
          {vehicles.length === 0 && drivers.length === 0 && trips.length === 0 && incidents.length === 0 && (
            <div className="col-span-4 text-center py-4 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              <p>No data available yet. Start adding vehicles, drivers, and trips!</p>
            </div>
          )}
        </div>
      )}

      {renderUploadModal()}
      {renderPreviewModal()}
    </div>
  );
};

export default Reports;