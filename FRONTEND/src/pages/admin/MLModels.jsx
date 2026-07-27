// src/pages/admin/MLModels.jsx - HONEST VERSION
import React, { useState, useEffect } from 'react';
import { 
  Brain, Sparkles, Activity, BarChart3, 
  Clock, AlertCircle, RefreshCw, Eye, X,
  Server, Database, Zap, Layers, 
  Cpu, Code, Terminal, GitBranch, 
  Construction, Calendar, Users, Truck,
  TrendingUp, Award
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  tenantService, 
  vehicleService, 
  driverService,
  incidentService,
  tripService,
  fuelService,
  maintenanceService
} from '../../services/api';

const MLModels = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataStats, setDataStats] = useState({
    tenants: 0,
    vehicles: 0,
    drivers: 0,
    trips: 0,
    incidents: 0,
    fuelRefills: 0,
    maintenanceRecords: 0
  });

  // ============================================
  // LOAD REAL DATA - SHOW WHAT'S AVAILABLE
  // ============================================
  const loadData = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError(null);

    try {
      console.log('🔄 Loading fleet data for ML readiness...');

      const tenantsRes = await tenantService.getAll().catch(() => ({ data: [] }));
      const tenantsData = tenantsRes.data || [];

      let allVehicles = [];
      let allDrivers = [];
      let allIncidents = [];
      let allTrips = [];
      let allFuel = [];
      let allMaintenance = [];

      for (const tenant of tenantsData) {
        const tenantId = tenant.id;
        if (!tenantId) continue;

        try {
          const [
            vehiclesRes, 
            driversRes, 
            incidentsRes, 
            tripsRes, 
            fuelRes, 
            maintenanceRes
          ] = await Promise.all([
            vehicleService.getAll(tenantId).catch(() => ({ data: [] })),
            driverService.getAll(tenantId).catch(() => ({ data: [] })),
            incidentService.getByTenant(tenantId).catch(() => ({ data: [] })),
            tripService.getAll(tenantId).catch(() => ({ data: [] })),
            fuelService.getAll(tenantId).catch(() => ({ data: [] })),
            maintenanceService.getAll(tenantId).catch(() => ({ data: [] }))
          ]);

          allVehicles = [...allVehicles, ...(vehiclesRes.data || [])];
          allDrivers = [...allDrivers, ...(driversRes.data || [])];
          allIncidents = [...allIncidents, ...(incidentsRes.data || [])];
          allTrips = [...allTrips, ...(tripsRes.data || [])];
          allFuel = [...allFuel, ...(fuelRes.data || [])];
          allMaintenance = [...allMaintenance, ...(maintenanceRes.data || [])];
        } catch (err) {
          console.warn(`⚠️ Failed to fetch data for tenant ${tenantId}:`, err.message);
        }
      }

      setDataStats({
        tenants: tenantsData.length,
        vehicles: allVehicles.length,
        drivers: allDrivers.length,
        trips: allTrips.length,
        incidents: allIncidents.length,
        fuelRefills: allFuel.length,
        maintenanceRecords: allMaintenance.length
      });

      setLastUpdated(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('❌ Failed to load data:', error);
      setError(error.message || 'Failed to load data.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  // ============================================
  // RENDER
  // ============================================
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle size={48} className="mx-auto" />
          </div>
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={() => loadData(true)}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isDataSufficient = dataStats.vehicles >= 5 && dataStats.drivers >= 3 && dataStats.trips >= 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <Brain size={24} className="text-purple-600" />
              ML Models
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Machine Learning models for your fleet
              <span className="text-xs text-gray-400 ml-2">· Coming Soon</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">
              Last updated: {lastUpdated || 'Just now'}
            </span>
            <button
              onClick={() => loadData(false)}
              className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
              title="Refresh data"
            >
              <RefreshCw size={18} className="hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </div>
      </div>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-full">
            <Construction size={32} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <h4 className="text-lg font-bold text-purple-800">🚀 ML Models Coming Soon!</h4>
            <p className="text-purple-700 mt-1">
              We're working on training machine learning models using your fleet data. 
              Once ready, you'll get:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-purple-600">
              <li className="flex items-center gap-2">✅ <span>Driver Safety Predictions</span></li>
              <li className="flex items-center gap-2">✅ <span>Maintenance Alerts & Predictions</span></li>
              <li className="flex items-center gap-2">✅ <span>Fuel Consumption Forecasting</span></li>
              <li className="flex items-center gap-2">✅ <span>Incident Risk Scoring</span></li>
            </ul>
            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <span className="bg-white px-3 py-1 rounded-full text-purple-700 shadow-sm">
                🚗 {dataStats.vehicles} Vehicles
              </span>
              <span className="bg-white px-3 py-1 rounded-full text-purple-700 shadow-sm">
                👤 {dataStats.drivers} Drivers
              </span>
              <span className="bg-white px-3 py-1 rounded-full text-purple-700 shadow-sm">
                📊 {dataStats.trips} Trips
              </span>
              <span className="bg-white px-3 py-1 rounded-full text-purple-700 shadow-sm">
                ⚠️ {dataStats.incidents} Incidents
              </span>
              <span className="bg-white px-3 py-1 rounded-full text-purple-700 shadow-sm">
                ⛽ {dataStats.fuelRefills} Fuel Records
              </span>
            </div>
          </div>
          <div className="flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isDataSufficient 
                ? 'bg-green-100 text-green-700' 
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {isDataSufficient ? '✅ Data Ready' : '⏳ Need More Data'}
            </span>
          </div>
        </div>
      </div>

      {/* Data Readiness */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Database size={16} className="text-blue-500" />
            Data Availability
          </h4>
          <div className="mt-4 space-y-3">
            <DataRow label="Vehicles" count={dataStats.vehicles} required={5} />
            <DataRow label="Drivers" count={dataStats.drivers} required={3} />
            <DataRow label="Trips" count={dataStats.trips} required={10} />
            <DataRow label="Incidents" count={dataStats.incidents} required={2} />
            <DataRow label="Fuel Records" count={dataStats.fuelRefills} required={5} />
            <DataRow label="Maintenance Records" count={dataStats.maintenanceRecords} required={3} />
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {isDataSufficient 
                ? '✅ Great! You have enough data to train models.' 
                : '⏳ Add more data to enable ML model training.'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <Cpu size={16} className="text-purple-500" />
            Model Pipeline (Coming Soon)
          </h4>
          <div className="mt-4 space-y-3">
            <PipelineStep 
              step={1} 
              label="Data Collection" 
              status={isDataSufficient ? 'complete' : 'pending'}
              description={`${dataStats.vehicles} vehicles, ${dataStats.drivers} drivers`}
            />
            <PipelineStep 
              step={2} 
              label="Feature Engineering" 
              status={isDataSufficient ? 'in-progress' : 'waiting'}
              description="Extracting patterns from your data"
            />
            <PipelineStep 
              step={3} 
              label="Model Training" 
              status="waiting"
              description="Training will start when data is ready"
            />
            <PipelineStep 
              step={4} 
              label="Model Validation" 
              status="waiting"
              description="Validating model accuracy"
            />
            <PipelineStep 
              step={5} 
              label="Deployment" 
              status="waiting"
              description="Deploying to production"
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
          <span>ML Engine: TensorFlow (planned)</span>
          <span>Training ETA: Q3 2026</span>
          <span>Contact support for early access</span>
        </div>
      </div>
    </div>
  );
};

// ============================================
// HELPER COMPONENTS
// ============================================

const DataRow = ({ label, count, required }) => {
  const isMet = count >= required;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isMet ? 'text-green-600' : 'text-yellow-600'}`}>
          {count}
        </span>
        <span className="text-xs text-gray-400">/ {required}+</span>
        <span className={`text-sm ${isMet ? 'text-green-500' : 'text-yellow-500'}`}>
          {isMet ? '✅' : '⏳'}
        </span>
      </div>
    </div>
  );
};

const PipelineStep = ({ step, label, status, description }) => {
  const statusColors = {
    'complete': 'bg-green-500',
    'in-progress': 'bg-yellow-500 animate-pulse',
    'waiting': 'bg-gray-300',
    'pending': 'bg-gray-300'
  };

  const statusLabels = {
    'complete': '✅ Complete',
    'in-progress': '🔄 In Progress',
    'waiting': '⏳ Waiting',
    'pending': '⏳ Pending'
  };

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${statusColors[status]}`}>
        {step}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <span className={`text-xs ${
        status === 'complete' ? 'text-green-600' : 
        status === 'in-progress' ? 'text-yellow-600' : 
        'text-gray-400'
      }`}>
        {statusLabels[status]}
      </span>
    </div>
  );
};

export default MLModels;