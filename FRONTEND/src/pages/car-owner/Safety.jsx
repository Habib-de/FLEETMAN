// src/pages/car-owner/Safety.jsx
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, Shield, AlertCircle,
  Award, User, Search, Filter, Download,
  Eye, X, Clock, AlertTriangle, CheckCircle,
  RefreshCw, BarChart3, Calendar, Star,
  Zap, Target, BookOpen, MessageSquare,
  ArrowUpRight, ArrowDownRight, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  driverService, 
  incidentService, 
  geofenceService,
  tripService,
  vehicleService,
  safetyService
} from '../../services/api';

const Safety = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [periodFilter, setPeriodFilter] = useState('this_month');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [trips, setTrips] = useState([]);
  const [violations, setViolations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [coachingData, setCoachingData] = useState([]);
  const [safetyTrends, setSafetyTrends] = useState([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [driverScores, setDriverScores] = useState({});         
  const [driverEvents, setDriverEvents] = useState({});

  // ============================================
  // LOAD DATA FROM BACKEND API - INTEGRATED
  // ============================================
  const loadData = async () => {
    setIsDataLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentUser) {
      setErrorMessage('Please login to view safety data');
      setIsDataLoading(false);
      return;
    }

    try {
      const tenant = currentUser.tenantId;
      setTenantId(tenant);

      // Load ALL related data in parallel
      const [
        driversRes,
        vehiclesRes,
        incidentsRes,
        tripsRes,
        geofenceRes
      ] = await Promise.all([
        driverService.getAll(tenant).catch(() => ({ data: [] })),
        vehicleService.getAll(tenant).catch(() => ({ data: [] })),
        incidentService.getByTenant(tenant).catch(() => ({ data: [] })),
        tripService.getAll(tenant).catch(() => ({ data: [] })),
        geofenceService.getViolations(tenant).catch(() => ({ data: [] }))
      ]);

      const driversData = driversRes?.data || [];
      const vehiclesData = vehiclesRes?.data || [];
      const incidentsData = incidentsRes?.data || [];
      const tripsData = tripsRes?.data || [];
      const geofenceData = geofenceRes?.data || [];

      setDrivers(driversData);
      setVehicles(vehiclesData);
      setIncidents(incidentsData);
      setTrips(tripsData);

      // Build enhanced driver safety data with data from other pages
      const enhancedDrivers = driversData.map(driver => {
        // Get incidents for this driver
        const driverIncidents = incidentsData.filter(inc => 
          String(inc.driverId || inc.driver?.id) === String(driver.id)
        );
        
        // Get trips for this driver
        const driverTrips = tripsData.filter(trip => 
          String(trip.driverId || trip.driver?.id) === String(driver.id)
        );
        
        // Calculate real metrics from actual data
        const totalViolations = driverIncidents.length;
        const resolvedViolations = driverIncidents.filter(inc => 
          inc.status === 'Resolved' || inc.status === 'resolved' || inc.status === 'closed'
        ).length;
        const totalTrips = driverTrips.length;
        const totalDistance = driverTrips.reduce((sum, t) => sum + (parseFloat(t.distance) || 0), 0);
        const avgTripDuration = driverTrips.length > 0 
          ? Math.round(driverTrips.reduce((sum, t) => sum + (parseFloat(t.duration) || 0), 0) / driverTrips.length)
          : 0;
        
        // Get assigned vehicle
        const assignedVehicle = vehiclesData.find(v => 
          v.id === driver.assignedVehicleId || 
          v.id === driver.assignedVehicle?.id
        );
        
        // Calculate safety trend based on incidents trend
        const recentIncidents = driverIncidents.filter(inc => {
          const date = new Date(inc.createdAt || inc.created_at);
          const now = new Date();
          const diffDays = (now - date) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        });
        const previousIncidents = driverIncidents.filter(inc => {
          const date = new Date(inc.createdAt || inc.created_at);
          const now = new Date();
          const diffDays = (now - date) / (1000 * 60 * 60 * 24);
          return diffDays > 30 && diffDays <= 60;
        });
        
        let trend = 'stable';
        if (recentIncidents.length < previousIncidents.length) trend = 'improving';
        else if (recentIncidents.length > previousIncidents.length) trend = 'declining';

        return {
          ...driver,
          assignedVehicle: assignedVehicle,
          totalViolations: totalViolations,
          resolvedViolations: resolvedViolations,
          unresolvedViolations: totalViolations - resolvedViolations,
          totalTrips: totalTrips,
          totalDistance: totalDistance.toFixed(0),
          avgTripDuration: avgTripDuration,
          safetyScore: driver.safetyScore || calculateSafetyScore(driver, driverIncidents, driverTrips),
          trend: trend,
          recentViolations: recentIncidents.length,
          status: driver.status || 'Active'
        };
      });

      setDrivers(enhancedDrivers);

      
      // ✅ NEW: Fetch REAL safety scores from backend for each driver
      try {
        const scorePromises = enhancedDrivers.map(async (d) => {
          try {
            const res = await safetyService.getScore(d.id);
            return { driverId: d.id, data: res?.data || null };
          } catch (e) {
            return { driverId: d.id, data: null };
          }
        });
        const scoreResults = await Promise.all(scorePromises);

        const scoresMap = {};
        scoreResults.forEach(({ driverId, data }) => {
          if (data) scoresMap[driverId] = data;
        });
        setDriverScores(scoresMap);

        // Overwrite the local score with the real computed score
        setDrivers(prev => prev.map(d => {
  const real = scoresMap[d.id];
  if (real && typeof real.score === 'number' && real.totalEvents > 0) {
    return { ...d, safetyScore: real.score, trend: real.trend || d.trend };
  }
  return d;
}));

        console.log('✅ Loaded real safety scores for', Object.keys(scoresMap).length, 'drivers');
      } catch (e) {
        console.warn('⚠️ Could not fetch real safety scores:', e);
      }

      // Build violations from incidents
      const safetyViolations = incidentsData.map(inc => ({
        id: inc.id,
        driverId: inc.driverId || inc.driver?.id || null,
        driverName: inc.driverName || inc.driver?.name || 'Unknown',
        vehicleId: inc.vehicleId || inc.vehicle?.id || null,
        vehicleReg: inc.vehicleRegistration || inc.vehicle?.registration || 'Unknown',
        type: inc.incidentType || 'Unknown',
        severity: inc.severity || 'Unknown',
        date: inc.createdAt ? new Date(inc.createdAt).toLocaleString() : 'N/A',
        location: inc.location || 'Unknown',
        status: inc.status === 'Resolved' || inc.status === 'resolved' || inc.status === 'closed' ? 'Resolved' : 'Unresolved',
        cost: inc.cost || 0,
        description: inc.description || ''
      }));
      setViolations(safetyViolations);

      // Build alerts from geofence violations
      const safetyAlerts = geofenceData.map(a => ({
        id: a.id,
        driverId: a.driverId || a.driver?.id || null,
        driverName: a.driverName || a.driver?.name || 'Unknown',
        vehicleId: a.vehicleId || a.vehicle?.id || null,
        vehicleReg: a.vehicleRegistration || a.vehicle?.registration || 'Unknown',
        type: a.violationType || 'Geofence Violation',
        severity: a.severity || 'medium',
        time: a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A',
        message: a.violationType || 'Vehicle violated geofence boundary',
        resolved: a.resolved || false,
        geofenceName: a.geofenceName || 'Unknown Geofence'
      }));
      setAlerts(safetyAlerts);

      // Generate coaching data from driver performance
      const coaching = enhancedDrivers
        .filter(d => d.safetyScore < 85)
        .map(d => ({
          driverId: d.id,
          driverName: d.name,
          score: d.safetyScore,
          recommended: d.safetyScore < 70 ? 'Urgent Coaching' : d.safetyScore < 80 ? 'Defensive Driving' : 'Review',
          priority: d.safetyScore < 70 ? 'high' : d.safetyScore < 80 ? 'medium' : 'low'
        }));
      setCoachingData(coaching);

      // Generate safety trends (last 6 months)
      const trends = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const monthName = month.toLocaleString('default', { month: 'short' });
        const monthIncidents = incidentsData.filter(inc => {
          const incDate = new Date(inc.createdAt || inc.created_at);
          return incDate.getMonth() === month.getMonth() && incDate.getFullYear() === month.getFullYear();
        });
        trends.push({
          month: monthName,
          incidents: monthIncidents.length,
          avgScore: enhancedDrivers.length > 0 
            ? Math.round(enhancedDrivers.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / enhancedDrivers.length)
            : 0
        });
      }
      setSafetyTrends(trends);

    } catch (error) {
      console.error('Error loading safety data:', error);
      setErrorMessage('Failed to load safety data. Please try again.');
    } finally {
      setIsDataLoading(false);
    }
  };

  // ============================================
  // CALCULATE SAFETY SCORE
  // ============================================
  const calculateSafetyScore = (driver, incidents, trips) => {
    let score = 100;
    
    // Deduct for incidents
    score -= incidents.length * 5;
    
    // Deduct for unresolved incidents
    const unresolved = incidents.filter(inc => 
      inc.status !== 'Resolved' && inc.status !== 'resolved' && inc.status !== 'closed'
    ).length;
    score -= unresolved * 3;
    
    // Deduct for high severity incidents
    const highSeverity = incidents.filter(inc => 
      inc.severity === 'high' || inc.severity === 'High' || inc.severity === 'critical'
    ).length;
    score -= highSeverity * 8;
    
    // Bonus for trips
    if (trips.length > 10) score += 2;
    if (trips.length > 20) score += 3;
    
    return Math.max(0, Math.min(100, Math.round(score)));
  };

  // ============================================
  // USE EFFECT
  // ============================================
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // ============================================
  // LISTEN FOR DRIVER SCORE UPDATES
  // ============================================
  useEffect(() => {
    const handleDriverScoreUpdate = (event) => {
      console.log('🔄 Safety page: Driver score updated, refreshing...', event?.detail);
      loadData();
    };

    window.addEventListener('driverScoreUpdated', handleDriverScoreUpdate);

    return () => {
      window.removeEventListener('driverScoreUpdated', handleDriverScoreUpdate);
    };
  }, []);

  // ============================================
  // STATISTICS - CALCULATED FROM REAL DATA
  // ============================================
  const stats = {
    avgScore: drivers.length > 0 
      ? Math.round(drivers.reduce((sum, d) => sum + (d.safetyScore || 0), 0) / drivers.length) 
      : 0,
    highPerformers: drivers.filter(d => (d.safetyScore || 0) >= 90).length,
    mediumPerformers: drivers.filter(d => (d.safetyScore || 0) >= 80 && (d.safetyScore || 0) < 90).length,
    lowPerformers: drivers.filter(d => (d.safetyScore || 0) < 80).length,
    totalViolations: violations.length,
    resolvedViolations: violations.filter(v => v.status === 'Resolved').length,
    activeAlerts: alerts.filter(a => !a.resolved).length,
    totalTrips: trips.length,
    needsCoaching: coachingData.length
  };

  // ============================================
  // RESOLVE ALERT
  // ============================================
  const resolveAlert = async (alertId) => {
    try {
      const response = await geofenceService.resolveViolation(alertId);
      if (response?.success) {
        setSuccessMessage('✅ Alert resolved successfully!');
        await loadData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setErrorMessage('Failed to resolve alert. Please try again.');
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      setErrorMessage('Failed to resolve alert. Please try again.');
    }
  };

  // ============================================
  // NAVIGATE TO DRIVER
  // ============================================
  const navigateToDriver = (driver) => {
    window.dispatchEvent(new CustomEvent('navigateTo', { 
      detail: { tab: 'drivers', driverId: driver.id } 
    }));
    if (typeof window.setActiveTab === 'function') {
      window.setActiveTab('drivers');
    }
  };

  // ============================================
  // FILTER DRIVERS
  // ============================================
  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.assignedVehicle?.registration || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.driverId || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const sortedDrivers = [...filteredDrivers].sort((a, b) => {
    if (sortBy === 'score') return (b.safetyScore || 0) - (a.safetyScore || 0);
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'violations') return (b.totalViolations || 0) - (a.totalViolations || 0);
    if (sortBy === 'trips') return (b.totalTrips || 0) - (a.totalTrips || 0);
    return 0;
  });

  // ============================================
  // RENDER OVERVIEW - SAMSARA/FLEETIO STYLE
  // ============================================
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Avg Safety Score</p>
          <p className="text-2xl font-bold">{stats.avgScore > 0 ? `${stats.avgScore}%` : 'N/A'}</p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div className="bg-blue-500 rounded-full h-1.5" style={{ width: `${stats.avgScore}%` }} />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">High Performers</p>
          <p className="text-2xl font-bold text-green-600">{stats.highPerformers}</p>
          <p className="text-xs text-gray-400">Score ≥ 90%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Needs Coaching</p>
          <p className="text-2xl font-bold text-red-600">{stats.needsCoaching}</p>
          <p className="text-xs text-gray-400">Score &lt; 80%</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Total Violations</p>
          <p className="text-2xl font-bold text-orange-600">{stats.totalViolations}</p>
          <p className="text-xs text-gray-400">{stats.resolvedViolations} resolved</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Active Alerts</p>
          <p className="text-2xl font-bold text-red-600">{stats.activeAlerts}</p>
          <p className="text-xs text-gray-400">Geofence violations</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500">Total Trips</p>
          <p className="text-2xl font-bold text-blue-600">{stats.totalTrips}</p>
          <p className="text-xs text-gray-400">Driver trips</p>
        </div>
      </div>

      {/* Safety Trends Chart */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Activity size={16} className="text-blue-500" />
            Safety Trends (Last 6 Months)
          </h4>
          <select 
            className="text-sm border border-gray-200 rounded-lg px-3 py-1 bg-white"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3_months">Last 3 Months</option>
            <option value="this_quarter">This Quarter</option>
          </select>
        </div>
        
        {safetyTrends.length > 0 ? (
          <div className="relative h-48 w-full">
            <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
              {/* Grid Lines */}
              <line x1="0" y1="40" x2="800" y2="40" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="0" y1="80" x2="800" y2="80" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="0" y1="120" x2="800" y2="120" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
              <line x1="0" y1="160" x2="800" y2="160" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
              
              {/* Y-Axis Labels */}
              <text x="10" y="35" fontSize="10" fill="#9ca3af">100%</text>
              <text x="10" y="75" fontSize="10" fill="#9ca3af">75%</text>
              <text x="10" y="115" fontSize="10" fill="#9ca3af">50%</text>
              <text x="10" y="155" fontSize="10" fill="#9ca3af">25%</text>
              
              {/* Calculate points for lines */}
              {(() => {
                const months = safetyTrends;
                const count = months.length;
                const maxScore = 100;
                const minScore = 0;
                const padding = 60;
                const width = 780;
                const height = 180;
                
                // Check if there's any real data
                const hasRealData = months.some(t => t.incidents > 0 || t.avgScore > 0);
                
                // Calculate points for score line
                const scorePoints = months.map((trend, i) => {
                  const x = padding + (i / (count - 1)) * (width - padding * 2);
                  const y = height - ((trend.avgScore - minScore) / (maxScore - minScore)) * height;
                  return { x, y, score: trend.avgScore, month: trend.month, incidents: trend.incidents };
                });
                
                // Calculate points for incident line (scaled to fit)
                const maxIncidents = Math.max(1, ...months.map(t => t.incidents));
                const incidentPoints = months.map((trend, i) => {
                  const x = padding + (i / (count - 1)) * (width - padding * 2);
                  const y = height - (trend.incidents / maxIncidents) * height * 0.6 - 20;
                  return { x, y, incidents: trend.incidents };
                });
                
                return (
                  <>
                    {/* Area fill under score line */}
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="incidentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                      </linearGradient>
                    </defs>
                    
                    {/* Score Area */}
                    <polygon 
                      points={scorePoints.map(p => `${p.x},${p.y}`).join(' ')} 
                      fill="url(#scoreGradient)" 
                    />
                    
                    {/* Score Line */}
                    <polyline
                      points={scorePoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                    />
                    
                    {/* Incident Area */}
                    <polygon 
                      points={incidentPoints.map(p => `${p.x},${p.y}`).join(' ')} 
                      fill="url(#incidentGradient)" 
                    />
                    
                    {/* Incident Line */}
                    <polyline
                      points={incidentPoints.map(p => `${p.x},${p.y}`).join(' ')}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                    />
                    
                    {/* Score Points (dots) */}
                    {scorePoints.map((p, i) => (
                      <g key={i} className="group">
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r="5" 
                          fill={p.score >= 90 ? '#22c55e' : p.score >= 80 ? '#f59e0b' : '#ef4444'}
                          stroke="white"
                          strokeWidth="2"
                          className="transition-all duration-300 hover:r-7"
                        />
                        {/* Tooltip on hover */}
                        <rect
                          x={p.x - 30}
                          y={p.y - 35}
                          width="60"
                          height="20"
                          rx="4"
                          fill="#1f2937"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        />
                        <text
                          x={p.x}
                          y={p.y - 20}
                          textAnchor="middle"
                          fontSize="9"
                          fill="white"
                          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                        >
                          {p.score}% · {p.incidents} incidents
                        </text>
                      </g>
                    ))}
                    
                    {/* Incident Points (dots) */}
                    {incidentPoints.map((p, i) => (
                      <circle 
                        key={`incident-${i}`}
                        cx={p.x} 
                        cy={p.y} 
                        r="3" 
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth="1.5"
                        className="transition-all duration-300 hover:r-5"
                      />
                    ))}
                    
                    {/* X-Axis Labels (Months) */}
                    {scorePoints.map((p, i) => (
                      <text 
                        key={`label-${i}`}
                        x={p.x} 
                        y={height + 15} 
                        textAnchor="middle" 
                        fontSize="10" 
                        fill="#9ca3af"
                        className="font-medium"
                      >
                        {p.month}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-blue-500"></div>
                <span className="text-gray-600">Safety Score</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-0.5 bg-red-500"></div>
                <span className="text-gray-600">Incidents</span>
              </div>
            </div>
            
            {/* ✅ Show overlay if all data is zero */}
            {safetyTrends.every(t => t.incidents === 0 && t.avgScore === 0) && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg pointer-events-none">
                <div className="text-center text-gray-400">
                  <Activity size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No data yet</p>
                  <p className="text-xs">Complete trips to see safety trends</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center text-gray-400 text-sm">
            <Activity size={32} className="text-gray-300 mb-2" />
            <p>No trend data available</p>
            <p className="text-xs">Complete trips and log incidents to see trends</p>
          </div>
        )}
      </div>

      {/* Top Performers & Coaching Needs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Award size={16} className="text-yellow-500" />
              Top Performers
            </h4>
            <button 
              onClick={() => setActiveTab('drivers')}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>
          {drivers.filter(d => d.safetyScore > 0).length > 0 ? (
            <div className="space-y-2">
              {drivers.filter(d => d.safetyScore > 0)
                .sort((a, b) => (b.safetyScore || 0) - (a.safetyScore || 0))
                .slice(0, 5)
                .map((driver, index) => (
                  <div key={driver.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => setSelectedDriver(driver)}>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                      <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=22c55e&color=fff&size=32`} 
                        alt={driver.name} 
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <p className="font-medium text-sm">{driver.name}</p>
                        <p className="text-xs text-gray-500">{driver.assignedVehicle?.registration || 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-green-600">{driver.safetyScore}%</span>
                      <Award size={14} className="text-yellow-400 fill-yellow-400" />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 text-sm">
              No drivers with safety scores yet
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <BookOpen size={16} className="text-blue-500" />
              Coaching Needed
            </h4>
            <button 
              onClick={() => setActiveTab('drivers')}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>
          {coachingData.length > 0 ? (
            <div className="space-y-2">
              {coachingData.slice(0, 5).map((coach, index) => (
                <div key={coach.driverId} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => {
                  const driver = drivers.find(d => String(d.id) === String(coach.driverId));
                  if (driver) setSelectedDriver(driver);
                }}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(coach.driverName)}&background=ef4444&color=fff&size=32`} 
                      alt={coach.driverName} 
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="font-medium text-sm">{coach.driverName}</p>
                      <p className="text-xs text-gray-500">{coach.recommended}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${coach.score < 70 ? 'text-red-600' : 'text-yellow-600'}`}>
                      {coach.score}%
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      coach.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {coach.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-green-600 text-sm flex items-center justify-center gap-2">
              <CheckCircle size={20} className="text-green-500" />
              All drivers are performing well!
            </div>
          )}
        </div>
      </div>

      {/* Recent Alerts */}
      {alerts.filter(a => !a.resolved).length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <AlertCircle size={16} className="text-red-500" />
              Active Alerts ({alerts.filter(a => !a.resolved).length})
            </h4>
            <button 
              onClick={() => setActiveTab('alerts')}
              className="text-xs text-blue-600 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {alerts.filter(a => !a.resolved).slice(0, 3).map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
                alert.severity === 'high' || alert.severity === 'High' ? 'border-red-500 bg-red-50' : 
                alert.severity === 'medium' || alert.severity === 'Medium' ? 'border-yellow-500 bg-yellow-50' : 
                'border-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{alert.driverName} - {alert.vehicleReg}</p>
                    <p className="text-xs text-gray-600">{alert.message}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER DRIVERS VIEW - WITH INTEGRATED DATA
  // ============================================
  const renderDriversView = () => (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search drivers..." 
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-40 sm:w-56"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
          >
            <Filter size={14} /> Filters
          </button>
          <select 
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
            <option value="violations">Sort by Violations</option>
            <option value="trips">Sort by Trips</option>
          </select>
        </div>
        <button 
          onClick={loadData}
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Vehicles</option>
              {[...new Set(vehicles.map(v => v.registration))].filter(Boolean).slice(0, 10).map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Scores</option>
              <option value="high">High (90+)</option>
              <option value="medium">Medium (80-89)</option>
              <option value="low">Low (&lt;80)</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      )}

      {sortedDrivers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Driver</th>
                <th className="p-3 hidden sm:table-cell">Vehicle</th>
                <th className="p-3">Score</th>
                <th className="p-3 hidden lg:table-cell">Trips</th>
                <th className="p-3">Violations</th>
                <th className="p-3 hidden md:table-cell">Trend</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDrivers.map((driver) => {
                return (
                  <tr key={driver.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedDriver(driver)}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(driver.name)}&background=${driver.safetyScore >= 90 ? '22c55e' : driver.safetyScore >= 80 ? 'f59e0b' : 'ef4444'}&color=fff&size=32`} 
                          alt={driver.name} 
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="font-medium text-sm">{driver.name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-sm hidden sm:table-cell">{driver.assignedVehicle?.registration || 'Unassigned'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              driver.safetyScore >= 90 ? 'bg-green-500' : 
                              driver.safetyScore >= 80 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`} 
                            style={{ width: `${driver.safetyScore || 0}%` }} 
                          />
                        </div>
                        <span className={`text-sm font-medium ${
                          driver.safetyScore >= 90 ? 'text-green-600' : 
                          driver.safetyScore >= 80 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {driver.safetyScore || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm hidden lg:table-cell">{driver.totalTrips || 0}</td>
                    <td className="p-3 text-sm text-red-600">{driver.totalViolations || 0}</td>
                    <td className="p-3 hidden md:table-cell">
                      {driver.trend === 'improving' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <TrendingUp size={14} /> Improving
                        </span>
                      ) : driver.trend === 'declining' ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <TrendingDown size={14} /> Declining
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        driver.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {driver.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedDriver(driver); }}
                        className="p-1 hover:bg-gray-200 rounded text-blue-600"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <User size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No drivers found</p>
          <p className="text-sm">Add drivers from the Drivers page</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER VIOLATIONS VIEW
  // ============================================
  const renderViolationsView = () => (
    <div>
      <h4 className="font-semibold text-sm mb-4">Violations History</h4>
      {violations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
              <tr>
                <th className="p-3">Driver</th>
                <th className="p-3 hidden sm:table-cell">Vehicle</th>
                <th className="p-3">Type</th>
                <th className="p-3 hidden md:table-cell">Date</th>
                <th className="p-3">Severity</th>
                <th className="p-3 hidden lg:table-cell">Status</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((violation) => (
                <tr key={violation.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium text-sm">{violation.driverName}</td>
                  <td className="p-3 text-sm hidden sm:table-cell">{violation.vehicleReg}</td>
                  <td className="p-3 text-sm">{violation.type}</td>
                  <td className="p-3 text-sm hidden md:table-cell">{violation.date}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(violation.severity)}`}>
                      {violation.severity}
                    </span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${violation.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {violation.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No violations found</p>
          <p className="text-sm">Violations will appear from incident reports</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // RENDER ALERTS VIEW
  // ============================================
  const renderAlertsView = () => (
    <div>
      <h4 className="font-semibold text-sm mb-4">Safety Alerts</h4>
      {alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`p-4 rounded-lg border-l-4 ${
              alert.severity === 'high' || alert.severity === 'High' ? 'border-red-500 bg-red-50' : 
              alert.severity === 'medium' || alert.severity === 'Medium' ? 'border-yellow-500 bg-yellow-50' : 
              'border-blue-500 bg-blue-50'
            } ${alert.resolved ? 'opacity-60' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} className={alert.severity === 'high' || alert.severity === 'High' ? 'text-red-500' : alert.severity === 'medium' || alert.severity === 'Medium' ? 'text-yellow-500' : 'text-blue-500'} />
                    <p className="font-medium text-sm">{alert.driverName} - {alert.vehicleReg}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getSeverityColor(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    {alert.resolved && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                  {alert.geofenceName && (
                    <p className="text-xs text-gray-400 mt-0.5">Geofence: {alert.geofenceName}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{alert.time}</span>
                  {!alert.resolved && (
                    <button 
                      className="text-xs text-blue-600 hover:underline"
                      onClick={() => resolveAlert(alert.id)}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <AlertCircle size={48} className="mx-auto text-gray-300 mb-3" />
          <p>No alerts found</p>
          <p className="text-sm">Alerts will appear from geofence violations</p>
        </div>
      )}
    </div>
  );

  // ============================================
  // GET HELPER FUNCTIONS
  // ============================================
  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score > 0) return 'text-red-600';
    return 'text-gray-400';
  };

  const getSeverityColor = (severity) => {
    const sev = severity?.toLowerCase() || '';
    const colors = {
      'high': 'bg-red-100 text-red-700',
      'critical': 'bg-red-100 text-red-700',
      'medium': 'bg-yellow-100 text-yellow-700',
      'low': 'bg-blue-100 text-blue-700',
    };
    return colors[sev] || 'bg-gray-100 text-gray-700';
  };

  // ============================================
  // RENDER DRIVER MODAL
  // ============================================
  const renderDriverModal = () => {
    if (!selectedDriver) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0" onClick={() => setSelectedDriver(null)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setSelectedDriver(null)}
            className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={24} className="text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 rounded-t-2xl">
            <div className="flex items-center gap-4">
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDriver.name)}&background=16a34a&color=fff&size=64`} 
                alt={selectedDriver.name} 
                className="w-16 h-16 rounded-full border-2 border-white"
              />
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedDriver.name}</h2>
                <p className="text-blue-100 text-sm">{selectedDriver.assignedVehicle?.registration || 'Unassigned'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    selectedDriver.safetyScore >= 90 ? 'bg-green-100 text-green-700' :
                    selectedDriver.safetyScore >= 80 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    Score: {selectedDriver.safetyScore}%
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                    {selectedDriver.totalTrips || 0} Trips
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Safety Score</p>
                <p className="text-lg font-bold text-blue-600">{selectedDriver.safetyScore}%</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Trips</p>
                <p className="text-lg font-bold text-purple-600">{selectedDriver.totalTrips || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Violations</p>
                <p className="text-lg font-bold text-red-600">{selectedDriver.totalViolations || 0}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500">Distance</p>
                <p className="text-lg font-bold text-green-600">{selectedDriver.totalDistance || '0'} km</p>
              </div>
            </div>

                        {/* ✅ NEW: Event breakdown from real backend data */}
            {driverScores[selectedDriver.id]?.breakdown?.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium text-sm mb-2">Recent Events Breakdown</h5>
                <div className="space-y-1">
                  {driverScores[selectedDriver.id].breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                      <span className="font-medium">
                        {item.type === 'HARSH_BRAKE' && '🛑 Harsh Brake'}
                        {item.type === 'HARSH_ACCEL' && '🚀 Harsh Accel'}
                        {item.type === 'HARSH_CORNER' && '↩️ Harsh Corner'}
                        {item.type === 'SPEEDING' && '⚡ Speeding'}
                        {!['HARSH_BRAKE','HARSH_ACCEL','HARSH_CORNER','SPEEDING'].includes(item.type) && item.type}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">{item.count}×</span>
                        <span className="text-red-600 font-medium">-{item.penalty} pts</span>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Based on the last 90 days · recent events count more
                </p>
              </div>
            )}

            <div className="mb-4">
              <h5 className="font-medium text-sm mb-2">Safety Trend</h5>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {selectedDriver.trend === 'improving' ? (
                  <>
                    <TrendingUp size={24} className="text-green-500" />
                    <div>
                      <p className="font-medium text-green-600">Improving</p>
                      <p className="text-xs text-gray-500">Safety performance is getting better</p>
                    </div>
                  </>
                ) : selectedDriver.trend === 'declining' ? (
                  <>
                    <TrendingDown size={24} className="text-red-500" />
                    <div>
                      <p className="font-medium text-red-600">Needs Attention</p>
                      <p className="text-xs text-gray-500">Safety performance is declining</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Activity size={24} className="text-yellow-500" />
                    <div>
                      <p className="font-medium text-yellow-600">Stable</p>
                      <p className="text-xs text-gray-500">Safety performance is consistent</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-200">
              <button 
                onClick={() => navigateToDriver(selectedDriver)}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                <User size={16} className="inline mr-1" /> View Full Profile
              </button>
              <button className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                <Download size={16} className="inline mr-1" /> Export Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================
  if (isDataLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading safety data...</p>
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

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Shield size={24} className="text-blue-600" />
              Safety Analytics
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              {drivers.length} drivers • {stats.totalViolations} total violations • {stats.activeAlerts} active alerts
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadData}
              className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200 flex items-center gap-1"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center gap-2">
              <Download size={16} /> Export Report
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mt-4 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: Shield },
            { id: 'drivers', label: 'Drivers', icon: User },
            { id: 'violations', label: 'Violations', icon: AlertTriangle },
            { id: 'alerts', label: 'Alerts', icon: AlertCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-t-lg transition-colors flex items-center gap-1 sm:gap-2 ${
                activeTab === tab.id 
                  ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={16} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-200">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'drivers' && renderDriversView()}
        {activeTab === 'violations' && renderViolationsView()}
        {activeTab === 'alerts' && renderAlertsView()}
      </div>

      {renderDriverModal()}
    </div>
  );
};

export default Safety;