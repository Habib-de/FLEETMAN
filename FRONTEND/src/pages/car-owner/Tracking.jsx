// src/pages/car-owner/Tracking.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTenantConfig } from '../../context/TenantConfigContext';
import { 
  Truck, Navigation, Clock, AlertTriangle, MapPinned, 
  RefreshCw, History, AlertCircle, Activity, X, Eye,
  Play, Square, Flag, MapPin, Pause, SkipBack, SkipForward,
  User, Battery, BatteryCharging, BatteryLow, BatteryMedium, BatteryFull,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  vehicleService, 
  driverService, 
  geofenceService, 
  trackingService,
  tripService,
  incidentService
} from '../../services/api';
import webSocketService from '../../services/websocket';

// Fix for default marker icons in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// DYNAMIC LOCATION NAME CACHE (populated from backend)
// ============================================
let locationNameCache = {};

// ============================================
// HELPER: Build location cache from geofences
// ============================================
const buildLocationCache = (geofences) => {
  const cache = {};
  
  geofences.forEach(geofence => {
    if (!geofence.isActive) return;
    
    if (geofence.type === 'route' && geofence.coordinates) {
      try {
        const points = typeof geofence.coordinates === 'string' 
          ? JSON.parse(geofence.coordinates) 
          : geofence.coordinates;
        
        if (Array.isArray(points)) {
          points.forEach((point, index) => {
            const lat = point.lat || point.latitude || point[0];
            const lng = point.lng || point.longitude || point[1];
            if (lat && lng) {
              const latFixed = parseFloat(lat).toFixed(4);
              const lngFixed = parseFloat(lng).toFixed(4);
              const keyWithSpace = `${latFixed}, ${lngFixed}`;
              const keyNoSpace = `${latFixed},${lngFixed}`;
              const name = point.name || point.location || `Point ${index + 1}`;
              
              cache[keyWithSpace] = name;
              cache[keyNoSpace] = name;
            }
          });
        }
      } catch (e) {
        console.warn('Could not parse route coordinates:', e);
      }
    }
    
    if (geofence.type === 'circular' && geofence.centerLat && geofence.centerLng) {
      const latFixed = parseFloat(geofence.centerLat).toFixed(4);
      const lngFixed = parseFloat(geofence.centerLng).toFixed(4);
      const keyWithSpace = `${latFixed}, ${lngFixed}`;
      const keyNoSpace = `${latFixed},${lngFixed}`;
      cache[keyWithSpace] = geofence.name;
      cache[keyNoSpace] = geofence.name;
    }
    
    if (geofence.type === 'polygon' && geofence.coordinates) {
      try {
        const points = typeof geofence.coordinates === 'string' 
          ? JSON.parse(geofence.coordinates) 
          : geofence.coordinates;
        
        if (Array.isArray(points) && points.length > 0) {
          const firstPoint = points[0];
          const lat = firstPoint.lat || firstPoint.latitude || firstPoint[0];
          const lng = firstPoint.lng || firstPoint.longitude || firstPoint[1];
          if (lat && lng) {
            const latFixed = parseFloat(lat).toFixed(4);
            const lngFixed = parseFloat(lng).toFixed(4);
            const keyWithSpace = `${latFixed}, ${lngFixed}`;
            const keyNoSpace = `${latFixed},${lngFixed}`;
            cache[keyWithSpace] = geofence.name;
            cache[keyNoSpace] = geofence.name;
          }
        }
      } catch (e) {
        console.warn('Could not parse polygon coordinates:', e);
      }
    }
  });
  
  return cache;
};

// ============================================
// DYNAMIC getLocationName - Uses cache from backend
// ============================================
const getLocationName = (lat, lng) => {
  if (!lat || !lng) return 'Unknown Location';
  
  const latFixed = parseFloat(lat).toFixed(4);
  const lngFixed = parseFloat(lng).toFixed(4);
  
  const keyWithSpace = `${latFixed}, ${lngFixed}`;
  if (locationNameCache[keyWithSpace]) {
    return locationNameCache[keyWithSpace];
  }
  
  const keyNoSpace = `${latFixed},${lngFixed}`;
  if (locationNameCache[keyNoSpace]) {
    return locationNameCache[keyNoSpace];
  }
  
  let closestMatch = null;
  let closestDistance = Infinity;
  
  for (const [key, name] of Object.entries(locationNameCache)) {
    const keyCoords = key.split(',').map(s => parseFloat(s.trim()));
    if (keyCoords.length === 2 && !isNaN(keyCoords[0]) && !isNaN(keyCoords[1])) {
      const distance = Math.sqrt(
        Math.pow(parseFloat(lat) - keyCoords[0], 2) + 
        Math.pow(parseFloat(lng) - keyCoords[1], 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestMatch = name;
      }
    }
  }
  
  if (closestMatch && closestDistance < 0.01) {
    return closestMatch;
  }
  
  return `${latFixed}, ${lngFixed}`;
};

// ============================================
// HELPER: Extract start and end from geofence
// ============================================
const extractRoutePoints = (geofence) => {
  if (!geofence || !geofence.coordinates) return { start: null, end: null };
  
  try {
    const points = typeof geofence.coordinates === 'string' 
      ? JSON.parse(geofence.coordinates) 
      : geofence.coordinates;
    
    if (Array.isArray(points) && points.length >= 2) {
      const firstPoint = points[0];
      const lastPoint = points[points.length - 1];
      
      return {
        start: firstPoint.name || firstPoint.location || 'Start',
        end: lastPoint.name || lastPoint.location || 'End',
        startLat: firstPoint.lat || firstPoint.latitude,
        startLng: firstPoint.lng || firstPoint.longitude,
        endLat: lastPoint.lat || lastPoint.latitude,
        endLng: lastPoint.lng || lastPoint.longitude
      };
    }
  } catch (e) {
    console.warn('Could not parse route points:', e);
  }
  
  return { start: null, end: null };
};

// ============================================
// COORDINATE HELPER FUNCTIONS
// ============================================

// Calculate distance between two coordinates in km using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if coordinates are within viewport radius
const isWithinViewport = (lat, lng, centerLat, centerLng, radiusKm = 100) => {
  if (!lat || !lng) return false;
  const distance = calculateDistance(
    parseFloat(lat),
    parseFloat(lng),
    centerLat,
    centerLng
  );
  return distance <= radiusKm;
};

// Check if geofence is within viewport
const isGeofenceInViewport = (geofence, centerLat, centerLng, radiusKm = 100) => {
  if (!geofence) return false;
  
  // For circular geofences
  if (geofence.type === 'circular' && geofence.centerLat && geofence.centerLng) {
    return isWithinViewport(
      parseFloat(geofence.centerLat),
      parseFloat(geofence.centerLng),
      centerLat,
      centerLng,
      radiusKm
    );
  }
  
  // For route and polygon geofences
  if (geofence.coordinates) {
    try {
      const points = typeof geofence.coordinates === 'string' 
        ? JSON.parse(geofence.coordinates) 
        : geofence.coordinates;
      
      if (Array.isArray(points) && points.length > 0) {
        // Check if ANY point is within the viewport
        return points.some(point => {
          const lat = point.lat || point.latitude || point[0];
          const lng = point.lng || point.longitude || point[1];
          if (lat && lng) {
            return isWithinViewport(
              parseFloat(lat),
              parseFloat(lng),
              centerLat,
              centerLng,
              radiusKm
            );
          }
          return false;
        });
      }
    } catch (e) {
      console.warn('Could not parse coordinates:', e);
    }
  }
  
  return false;
};

// ============================================
// SAFETY WRAPPER COMPONENTS
// ============================================
const SafeCircle = ({ center, children, ...props }) => {
  if (!center || !Array.isArray(center) || center.length < 2) {
    return null;
  }
  
  const lat = parseFloat(center[0]);
  const lng = parseFloat(center[1]);
  
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  
  try {
    return <Circle center={center} {...props}>{children}</Circle>;
  } catch (e) {
    return null;
  }
};

const SafePolyline = ({ positions, children, ...props }) => {
  if (!positions || !Array.isArray(positions) || positions.length < 2) {
    return null;
  }
  
  const validPositions = positions.filter(pos => {
    if (!pos || !Array.isArray(pos) || pos.length < 2) return false;
    const lat = parseFloat(pos[0]);
    const lng = parseFloat(pos[1]);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  });
  
  if (validPositions.length < 2) {
    return null;
  }
  
  try {
    return <Polyline positions={validPositions} {...props}>{children}</Polyline>;
  } catch (e) {
    return null;
  }
};

const SafeMarker = ({ position, children, ...props }) => {
  if (!position || !Array.isArray(position) || position.length < 2) {
    return null;
  }
  
  const lat = parseFloat(position[0]);
  const lng = parseFloat(position[1]);
  
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  
  try {
    return <Marker position={position} {...props}>{children}</Marker>;
  } catch (e) {
    return null;
  }
};

// ============================================
// STATS CARDS
// ============================================
const StatsCard = ({ label, value, icon: Icon, color }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600'
  };

  return (
    <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-xs text-gray-500">{label}</p>
          <p className="text-base sm:text-xl font-bold">{value}</p>
        </div>
        <div className={`p-1.5 sm:p-2 rounded-lg ${colors[color]}`}>
          <Icon size={14} className="sm:w-4 sm:h-4" />
        </div>
      </div>
    </div>
  );
};

// ============================================
// BATTERY ICON COMPONENT
// ============================================
const BatteryIcon = ({ percentage }) => {
  const getBatteryIcon = () => {
    if (percentage >= 80) return BatteryFull;
    if (percentage >= 50) return BatteryMedium;
    if (percentage >= 20) return BatteryLow;
    return Battery;
  };
  
  const getColor = () => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 50) return 'text-yellow-500';
    if (percentage >= 20) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const Icon = getBatteryIcon();
  
  return (
    <div className="flex items-center gap-1">
      <Icon size={14} className={getColor()} />
      <span className="text-xs font-medium">{Math.round(percentage)}%</span>
    </div>
  );
};

// ============================================
// FLEET SIDEBAR - Works on both desktop and mobile
// ============================================
const FleetSidebar = ({ 
  vehicles, 
  activeTrips, 
  onVehicleClick, 
  selectedVehicle,
  tenantConfig,
  isWebSocketConnected,
  movingCount,
  activeAlarmsCount
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Truck size={20} />
            Fleet Status
          </h3>
          <span className="text-white/80 text-xs bg-white/20 px-2 py-1 rounded-full">
            {vehicles.length} vehicles
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="text-white/90 text-center">
            <div className="text-xl font-bold">{movingCount}</div>
            <div className="text-[10px]">Moving</div>
          </div>
          <div className="text-white/90 text-center">
            <div className="text-xl font-bold">{activeTrips.length}</div>
            <div className="text-[10px]">Active Trips</div>
          </div>
          <div className="text-white/90 text-center">
            <div className="text-xl font-bold">{vehicles.filter(v => !v.hasTracking).length}</div>
            <div className="text-[10px]">Offline</div>
          </div>
        </div>
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isWebSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium">
            {isWebSocketConnected ? 'Live updates active' : 'Disconnected'}
          </span>
        </div>
        <span className="text-[10px] text-gray-400">{tenantConfig?.name || 'Nairobi'}</span>
      </div>
      
      {activeTrips.length > 0 && (
        <div className="p-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <Flag size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700">Active Trips ({activeTrips.length})</span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {activeTrips.slice(0, 3).map(trip => (
              <div key={trip.id} className="p-2 bg-white rounded-lg shadow-sm border border-green-100">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-xs">{trip.vehicleRegistration || trip.vehicleId}</span>
                  <span className="text-[8px] text-green-600 animate-pulse font-semibold">● LIVE</span>
                </div>
                <div className="text-[10px] text-gray-600 truncate">
                  {trip.startLocation || 'Start'} → {trip.endLocation || 'In progress'}
                </div>
                {trip.routeName && trip.routeName !== 'No route assigned' && (
                  <div className="text-[9px] text-blue-600 flex items-center gap-1 mt-0.5">
                    <MapPin size={9} /> {trip.routeName}
                  </div>
                )}
              </div>
            ))}
            {activeTrips.length > 3 && (
              <div className="text-[10px] text-gray-500 text-center">
                +{activeTrips.length - 3} more active trips
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className="p-3 max-h-[380px] overflow-y-auto space-y-2">
        {vehicles.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Truck size={32} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No vehicles in fleet</p>
            <p className="text-xs">Add vehicles from Vehicles page</p>
          </div>
        ) : (
          vehicles.map(v => {
            const isMoving = v.hasActiveTrip && v.speed > 3;
            const hasActiveTrip = v.hasActiveTrip;
            const hasLocation = v.lat !== null && v.lng !== null;
            
            return (
              <div 
                key={v.id} 
                onClick={() => hasLocation && onVehicleClick(v)}
                className={`p-3 rounded-lg transition-all cursor-pointer hover:shadow-md 
                  ${hasActiveTrip ? 'bg-blue-50 border-l-4 border-blue-500' : 
                    isMoving ? 'bg-green-50 border-l-4 border-green-500' : 
                    'bg-gray-50 border-l-4 border-gray-300'}
                  ${selectedVehicle?.id === v.id ? 'ring-2 ring-blue-400' : ''}
                  ${!hasLocation ? 'opacity-60 cursor-default' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
                      ${hasActiveTrip ? 'bg-blue-500' : isMoving ? 'bg-green-500' : 'bg-yellow-500'}`}>
                      {v.reg?.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-sm flex items-center gap-2">
                        {v.reg}
                        {hasActiveTrip && (
                          <span className="text-[8px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">
                            TRIP
                          </span>
                        )}
                        {!hasLocation && (
                          <span className="text-[8px] bg-gray-400 text-white px-1.5 py-0.5 rounded-full">
                            NO GPS
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <User size={12} /> {v.driver || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-blue-600">{hasLocation ? Math.round(v.speed) : 0} km/h</div>
                    <div className="text-[10px] text-gray-400">
                      {hasActiveTrip ? '📍 In transit' : isMoving ? '🚗 Moving' : '⏸️ Idle'}
                    </div>
                  </div>
                </div>
                
                {hasLocation && v.fuel && (
                  <div className="mt-2">
                    <BatteryIcon percentage={v.fuel} />
                  </div>
                )}
                
                {hasLocation && (
                  <div className="mt-1 text-[10px] text-blue-600 truncate flex items-center gap-1">
                    <MapPin size={10} /> {v.currentLocation || v.locationName || 'Unknown'}
                  </div>
                )}
                
                {hasActiveTrip && v.routeName && v.routeName !== 'No route assigned' && (
                  <div className="mt-1 text-[9px] text-blue-600 truncate flex items-center gap-1">
                    <Flag size={9} /> {v.routeName}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <p className="text-[10px] text-gray-500 mb-1">Legend</p>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span>On Trip</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Moving</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Idle</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span>Offline</span>
          </div>
        </div>
      </div>
      
      {activeAlarmsCount > 0 && (
        <div className="p-3 border-t border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-600" />
            <span className="text-xs font-semibold text-red-700">
              {activeAlarmsCount} Active Alarm{activeAlarmsCount > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// ROUTE PLAYBACK COMPONENT - Mobile Responsive
// ============================================
const RoutePlayback = ({ vehicle, isOpen, onClose, onMapCenter }) => {
  const [playbackData, setPlaybackData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const intervalRef = useRef(null);

  const loadTripHistory = async () => {
    if (!vehicle) return;
    
    setIsLoading(true);
    try {
      console.log('📡 Loading tracking data for vehicle:', vehicle.id);
      
      const response = await trackingService.getByVehicle(vehicle.id);
      let data = response?.data || [];
      
      if (data.length === 0) {
        const cached = localStorage.getItem(`tracking_${vehicle.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.length > 0) {
              data = parsed;
              console.log('✅ Loaded from localStorage:', data.length, 'points');
            }
          } catch (e) {
            console.warn('Could not parse cached data:', e);
          }
        }
      }
      
      if (data.length === 0 && vehicle.lat && vehicle.lng) {
        const centerLat = parseFloat(vehicle.lat);
        const centerLng = parseFloat(vehicle.lng);
        
        for (let i = 0; i < 30; i++) {
          const angle = (i / 29) * Math.PI * 2;
          const radius = 0.005 + (i / 29) * 0.02;
          data.push({
            lat: centerLat + Math.cos(angle) * radius,
            lng: centerLng + Math.sin(angle) * radius,
            speed: Math.round(20 + Math.sin(angle) * 20 + 20),
            heading: Math.round((angle * 180 / Math.PI) % 360),
            timestamp: new Date(Date.now() - (29 - i) * 5000).toISOString()
          });
        }
        console.log('✅ Generated sample points:', data.length);
      }
      
      const sorted = data.sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );
      
      setPlaybackData(sorted);
      setCurrentIndex(0);
      setPlaybackProgress(0);
      
      if (sorted.length > 0 && onMapCenter) {
        onMapCenter(sorted[0].lat, sorted[0].lng);
      }
      
      console.log('✅ Playback data loaded:', sorted.length, 'points');
      
    } catch (error) {
      console.error('❌ Failed to load playback data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && vehicle) {
      loadTripHistory();
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isOpen, vehicle]);

  const togglePlay = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const startPlayback = () => {
    if (currentIndex >= playbackData.length - 1) {
      setCurrentIndex(0);
      setPlaybackProgress(0);
    }
    setIsPlaying(true);
    intervalRef.current = setInterval(() => {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (next >= playbackData.length) {
          pausePlayback();
          return prev;
        }
        setPlaybackProgress((next / playbackData.length) * 100);
        
        if (playbackData[next] && onMapCenter) {
          onMapCenter(playbackData[next].lat, playbackData[next].lng);
        }
        return next;
      });
    }, 1000 / speed);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentIndex(0);
    setPlaybackProgress(0);
    if (playbackData.length > 0 && onMapCenter) {
      onMapCenter(playbackData[0].lat, playbackData[0].lng);
    }
  };

  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    setCurrentIndex(value);
    setPlaybackProgress((value / playbackData.length) * 100);
    if (playbackData[value] && onMapCenter) {
      onMapCenter(playbackData[value].lat, playbackData[value].lng);
    }
  };

  const goToStart = () => {
    pausePlayback();
    setCurrentIndex(0);
    setPlaybackProgress(0);
    if (playbackData.length > 0 && onMapCenter) {
      onMapCenter(playbackData[0].lat, playbackData[0].lng);
    }
  };

  const goToEnd = () => {
    pausePlayback();
    const lastIndex = playbackData.length - 1;
    setCurrentIndex(lastIndex);
    setPlaybackProgress(100);
    if (playbackData[lastIndex] && onMapCenter) {
      onMapCenter(playbackData[lastIndex].lat, playbackData[lastIndex].lng);
    }
  };

  const currentPoint = playbackData[currentIndex] || null;
  const totalPoints = playbackData.length;

  const stats = React.useMemo(() => {
    if (playbackData.length < 2) {
      return { distance: 0, duration: '0s', avgSpeed: 0, maxSpeed: 0 };
    }
    
    let distance = 0;
    let maxSpeed = 0;
    
    for (let i = 1; i < playbackData.length; i++) {
      const lat1 = playbackData[i-1].lat;
      const lon1 = playbackData[i-1].lng;
      const lat2 = playbackData[i].lat;
      const lon2 = playbackData[i].lng;
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance += R * c;
      
      const speed = playbackData[i].speed || 0;
      if (speed > maxSpeed) maxSpeed = speed;
    }
    
    const start = new Date(playbackData[0].timestamp);
    const end = new Date(playbackData[playbackData.length - 1].timestamp);
    const diff = (end - start) / 1000;
    const mins = Math.floor(diff / 60);
    const secs = Math.floor(diff % 60);
    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const avgSpeed = diff > 0 ? (distance / (diff / 3600)) : 0;
    
    return { distance: distance.toFixed(1), duration, avgSpeed: avgSpeed.toFixed(1), maxSpeed: Math.round(maxSpeed) };
  }, [playbackData]);

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-blue-500 shadow-lg rounded-t-2xl max-h-[50vh] md:max-h-[40vh] overflow-y-auto">
      <div className="max-w-7xl mx-auto p-3 md:p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h4 className="font-semibold text-xs md:text-sm flex items-center gap-1 md:gap-2">
              <History size={14} className="md:w-4 md:h-4 text-blue-600" />
              <span className="hidden xs:inline">Trip Replay:</span> {vehicle?.reg || 'Vehicle'}
            </h4>
            <span className="text-[10px] md:text-xs text-gray-400">
              {totalPoints} pts
            </span>
            {currentPoint && (
              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full hidden sm:inline">
                {new Date(currentPoint.timestamp).toLocaleTimeString()}
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} className="md:w-5 md:h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-[10px] md:text-xs text-gray-500 min-w-[40px] md:min-w-[60px]">
            {currentIndex > 0 && playbackData[currentIndex] ? 
              new Date(playbackData[currentIndex].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 
              'Start'
            }
          </span>

          <input
            type="range"
            min="0"
            max={Math.max(totalPoints - 1, 0)}
            value={currentIndex}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            disabled={isLoading}
          />

          <span className="text-[10px] md:text-xs text-gray-500 min-w-[40px] md:min-w-[60px] text-right">
            {totalPoints > 0 && playbackData[totalPoints - 1] ?
              new Date(playbackData[totalPoints - 1].timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) :
              'End'
            }
          </span>
        </div>

        <div className="mt-1 flex justify-between text-[8px] md:text-[10px] text-gray-400">
          <span>0%</span>
          <span>{Math.round(playbackProgress)}%</span>
          <span>100%</span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-0.5 md:gap-1">
            <button
              onClick={goToStart}
              disabled={isLoading || totalPoints === 0}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <SkipBack size={14} className="md:w-[18px] md:h-[18px] text-gray-600" />
            </button>
            <button
              onClick={resetPlayback}
              disabled={isLoading || totalPoints === 0}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <Square size={14} className="md:w-[18px] md:h-[18px] text-gray-600" />
            </button>
            <button
              onClick={togglePlay}
              disabled={isLoading || totalPoints === 0}
              className="p-2 md:p-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {isPlaying ? (
                <Pause size={14} className="md:w-[18px] md:h-[18px] text-white" />
              ) : (
                <Play size={14} className="md:w-[18px] md:h-[18px] text-white" />
              )}
            </button>
            <button
              onClick={goToEnd}
              disabled={isLoading || totalPoints === 0}
              className="p-1.5 md:p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <SkipForward size={14} className="md:w-[18px] md:h-[18px] text-gray-600" />
            </button>
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setSpeed(Math.max(0.5, speed - 0.5))}
              className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              -
            </button>
            <span className="text-[10px] md:text-xs font-medium min-w-[24px] md:min-w-[32px] text-center">{speed}x</span>
            <button
              onClick={() => setSpeed(Math.min(4, speed + 0.5))}
              className="px-1.5 md:px-2 py-0.5 md:py-1 text-[10px] md:text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              +
            </button>
          </div>

          {currentPoint && (
            <div className="hidden sm:flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-500">
              <span>📍 {currentPoint.lat?.toFixed(4)}, {currentPoint.lng?.toFixed(4)}</span>
              <span>🚀 {currentPoint.speed || 0} km/h</span>
            </div>
          )}
        </div>

        {playbackData.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex flex-wrap gap-2 md:gap-4 text-[9px] md:text-xs text-gray-500">
            <span>📍 {totalPoints} pts</span>
            <span>📏 {stats.distance} km</span>
            <span>⏱️ {stats.duration}</span>
            <span className="hidden xs:inline">⚡ {stats.avgSpeed} km/h</span>
            <span className="hidden xs:inline">🔴 {stats.maxSpeed} km/h</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN TRACKING COMPONENT
// ============================================
const Tracking = () => {
  const { currentUser } = useAuth();
  const { tenantConfig, currentTenant, switchTenant, getAvailablePresets } = useTenantConfig();
  
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [showGeofences, setShowGeofences] = useState(true);
  const [showAlarms, setShowAlarms] = useState(true);
  const [showRouteHistory, setShowRouteHistory] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: -1.2921, lng: 36.8219 });
  const [mapZoom, setMapZoom] = useState(13);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [geofences, setGeofences] = useState([]);
  const [alarms, setAlarms] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicleTrackingData, setVehicleTrackingData] = useState({});
  const [activeTrips, setActiveTrips] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVehicleHistory, setSelectedVehicleHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  
  const [showPlayback, setShowPlayback] = useState(false);
  const [playbackVehicle, setPlaybackVehicle] = useState(null);
  
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 10;
  
  const isFirstLoad = useRef(true);
  const mapRef = useRef(null);

  // ============================================
  // WEBSOCKET SETUP
  // ============================================
  const setupWebSocket = () => {
    console.log('🔌 WebSocket enabled - connecting...');
    
    const token = localStorage.getItem('fleetman_token');
    if (!token) {
      console.warn('⚠️ No token found, WebSocket connection failed');
      setIsWebSocketConnected(false);
      return;
    }

    webSocketService.connect(
      token,
      () => {
        console.log('✅ WebSocket connected successfully!');
        setIsWebSocketConnected(true);
        
        webSocketService.onMessage((type, data) => {
          if (type === 'tracking') {
            handleTrackingUpdate(data);
          } else if (type === 'trip') {
            handleTripUpdate(data);
          } else if (type === 'alarm') {
            handleAlarmUpdate(data);
          }
        });
      },
      () => {
        console.log('❌ WebSocket disconnected');
        setIsWebSocketConnected(false);
      }
    );
  };

  // ============================================
  // HANDLE TRACKING UPDATES
  // ============================================
  const handleTrackingUpdate = (data) => {
    console.log('📡 Tracking update received:', data);
    
    if (data.vehicleId && data.lat && data.lng) {
      const cacheKey = `tracking_${data.vehicleId}`;
      let cached = [];
      try {
        const existing = localStorage.getItem(cacheKey);
        if (existing) {
          cached = JSON.parse(existing);
        }
      } catch (e) {}
      
      cached.push({
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        speed: data.speed ? Math.round(parseFloat(data.speed)) : 0,
        heading: data.heading || 0,
        timestamp: data.timestamp || new Date().toISOString()
      });
      
      if (cached.length > 200) {
        cached = cached.slice(-200);
      }
      
      localStorage.setItem(cacheKey, JSON.stringify(cached));
      
      trackingService.save({
        tenantId: currentUser?.tenantId,
        vehicleId: data.vehicleId,
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lng),
        speed: data.speed ? parseFloat(data.speed) : 0,
        heading: data.heading || 0,
        fuelLevel: data.fuelLevel ? parseFloat(data.fuelLevel) : null,
        engineTemp: data.engineTemp ? parseFloat(data.engineTemp) : null,
        timestamp: data.timestamp || new Date().toISOString()
      }).then(() => {
        console.log('✅ Tracking point saved for vehicle:', data.vehicleId);
      }).catch(err => {
        console.warn('⚠️ Could not save tracking point:', err);
      });
    }

    setVehicles(prev => prev.map(v => {
      if (v.id === data.vehicleId) {
        const newLat = data.lat ? parseFloat(data.lat) : v.lat;
        const newLng = data.lng ? parseFloat(data.lng) : v.lng;
        const newSpeed = data.speed ? Math.round(parseFloat(data.speed)) : v.speed;
        
        const isActuallyMoving = newSpeed > 3;
        const effectiveSpeed = v.hasActiveTrip ? newSpeed : 0;
        const effectiveStatus = v.hasActiveTrip ? (isActuallyMoving ? 'moving' : 'idle') : 'idle';
        
        const location = getLocationName(newLat, newLng);
        
        return {
          ...v,
          lat: newLat,
          lng: newLng,
          speed: effectiveSpeed,
          heading: data.heading || v.heading,
          fuel: data.fuelLevel ? Math.round(parseFloat(data.fuelLevel)) : v.fuel,
          engineTemp: data.engineTemp ? Math.round(parseFloat(data.engineTemp)) : v.engineTemp,
          lastUpdate: data.timestamp ? new Date(data.timestamp) : new Date(),
          status: effectiveStatus,
          currentLocation: location,
          locationName: location,
          progress: data.progress || v.progress,
          elapsed: data.elapsed || v.elapsed,
          routeName: v.routeName || data.routeName || null,
        };
      }
      return v;
    }));
  };

  // ============================================
  // HANDLE TRIP UPDATES
  // ============================================
  const handleTripUpdate = (data) => {
    if (data.status === 'active' || data.status === 'planned' || data.status === 'In Progress') {
      setActiveTrips(prev => {
        const existing = prev.find(t => t.id === data.id);
        if (existing) {
          return prev.map(t => t.id === data.id ? { ...data, routeName: data.routeName || t.routeName } : t);
        }
        return [{ ...data, routeName: data.routeName || null }, ...prev];
      });
      
      setVehicles(prev => prev.map(v => {
        if (v.id === data.vehicleId) {
          const routeName = data.routeName || data.geofenceName || 'No route assigned';
          return {
            ...v,
            hasActiveTrip: true,
            tripId: data.id,
            tripDestination: data.endLocation || data.to || null,
            tripPurpose: data.purpose || null,
            tripStartTime: data.startTime || null,
            tripStartLocation: data.startLocation || data.from || null,
            routeName: routeName,
            status: 'moving',
            speed: v.speed || 20,
          };
        }
        return v;
      }));
    } else {
      setActiveTrips(prev => prev.filter(t => t.id !== data.id));
      
      setVehicles(prev => prev.map(v => {
        if (v.id === data.vehicleId) {
          return {
            ...v,
            hasActiveTrip: false,
            tripId: null,
            tripDestination: null,
            tripPurpose: null,
            tripStartTime: null,
            tripStartLocation: null,
            routeName: null,
            status: 'idle',
            speed: 0,
            progress: '100%',
            elapsed: '0s'
          };
        }
        return v;
      }));
    }
  };

  // ============================================
  // HANDLE ALARM UPDATES
  // ============================================
  const handleAlarmUpdate = (data) => {
    const newAlarm = {
      id: data.id || Date.now(),
      vehicleId: data.vehicleId || null,
      vehicle: data.vehicleRegistration || data.vehicleId || 'Unknown',
      type: data.violationType || 'geofence',
      lat: data.lat ? parseFloat(data.lat) : 0,
      lng: data.lng ? parseFloat(data.lng) : 0,
      time: data.timestamp ? new Date(data.timestamp).toLocaleString() : new Date().toLocaleString(),
      severity: data.resolved ? 'low' : 'high',
      message: data.violationType || 'Geofence violation detected',
      resolved: data.resolved || false,
      geofenceName: data.geofenceName || 'Unknown Geofence'
    };
    setAlarms(prev => [newAlarm, ...prev]);
  };

  // ============================================
// LOAD DATA FROM API - CORRECTED VERSION
// ============================================
const loadData = async () => {
  console.log('🚀 ===== LOADDATA STARTED =====');
  console.log('📌 Current tenant (from context):', currentTenant);
  console.log('📌 Current user:', currentUser);
  console.log('📌 Tenant config:', tenantConfig);
  
  setIsLoading(true);
  setError(null);
  
  try {
    console.log('🔄 Tracking: Loading data from API...');

    // 1. Get tenant ID
    const tenantId = currentUser?.tenantId || currentTenant;
    console.log('📌 Tenant ID being used:', tenantId);
    
    if (!tenantId) {
      console.warn('⚠️ No tenant ID found');
      setIsLoading(false);
      return;
    }

    // 2. Get available presets from context
    console.log('🔍 Getting available presets...');
    const presets = getAvailablePresets ? getAvailablePresets() : [];
    console.log('📍 Available presets:', presets.map(p => ({ id: p.id, name: p.name, map: p.map })));
    
    // 3. Find the current location from presets
    console.log(`🔍 Looking for location with ID: "${currentTenant}"`);
    let currentLocation = presets.find(loc => loc.id === currentTenant);

    // If not found by ID, try to find by name
    if (!currentLocation && tenantConfig) {
      console.log(`🔍 Trying to find location by name: "${tenantConfig.name}"`);
      currentLocation = presets.find(loc => 
        loc.name && tenantConfig.name && 
        loc.name.toLowerCase().includes(tenantConfig.name.toLowerCase())
      );
    }

    // If still not found, use tenantConfig directly
    if (!currentLocation && tenantConfig) {
      console.log('📦 Using tenantConfig directly as location');
      currentLocation = {
        id: currentTenant,
        name: tenantConfig.name || 'Location',
        map: tenantConfig.map || { center: { lat: -1.2921, lng: 36.8219 } }
      };
    }

    console.log('📍 Current location found:', currentLocation);

    // 4. Determine map center and location name
    let centerLat, centerLng, locationName;

    // ✅ FIX: FIRST PRIORITY - Use tenantConfig.map (database coordinates)
    if (tenantConfig?.map?.center) {
      centerLat = tenantConfig.map.center.lat;
      centerLng = tenantConfig.map.center.lng;
      locationName = tenantConfig.name || 'Location';
      console.log(`✅ Using map from tenantConfig (database): ${locationName} (${centerLat}, ${centerLng})`);
    } 
    // SECOND PRIORITY - Use currentLocation map
    else if (currentLocation && currentLocation.map && currentLocation.map.center) {
      centerLat = currentLocation.map.center.lat;
      centerLng = currentLocation.map.center.lng;
      locationName = currentLocation.name;
      console.log(`✅ Using map from currentLocation: ${locationName} (${centerLat}, ${centerLng})`);
    } 
    // FALLBACK - Default to Nairobi
    else {
      centerLat = -1.2921;
      centerLng = 36.8219;
      locationName = 'Nairobi (Default)';
      console.log(`⚠️ Using default map: ${locationName} (${centerLat}, ${centerLng})`);
    }
    
    const viewportRadius = 150; // 150km radius
    console.log(`📍 MAP CENTER: ${centerLat}, ${centerLng}`);
    console.log(`📍 LOCATION NAME: ${locationName}`);
    console.log(`📍 VIEWPORT RADIUS: ${viewportRadius}km`);

    // 5. Fetch vehicles
    console.log('📡 Fetching vehicles from API...');
    const vehiclesRes = await vehicleService.getAll(tenantId).catch(() => ({ data: [] }));
    const vehiclesData = vehiclesRes.data || [];
    console.log(`✅ Loaded ${vehiclesData.length} vehicles from API`);
    console.log('📋 Vehicle list:', vehiclesData.map(v => ({ id: v.id, reg: v.registration, lat: v.lat, lng: v.lng })));

    // 6. Fetch drivers
    console.log('📡 Fetching drivers from API...');
    const driversRes = await driverService.getAll(tenantId).catch(() => ({ data: [] }));
    const driversData = driversRes.data || [];
    setDrivers(driversData);
    console.log(`✅ Loaded ${driversData.length} drivers`);

    // 7. Fetch geofences with filtering
    console.log('📡 Fetching geofences from API...');
    const geofencesRes = await geofenceService.getByTenant(tenantId).catch(() => ({ data: [] }));
    const allGeofences = geofencesRes.data || [];
    console.log(`📊 Total geofences from API: ${allGeofences.length}`);
    console.log('📋 All geofences:', allGeofences.map(g => ({ 
      id: g.id, 
      name: g.name, 
      type: g.type,
      centerLat: g.centerLat,
      centerLng: g.centerLng,
      hasCoordinates: !!g.coordinates
    })));

    // 8. Filter geofences by coordinates
    console.log(`🔍 Filtering geofences within ${viewportRadius}km of (${centerLat}, ${centerLng})...`);
    const geofencesData = allGeofences.filter(g => {
      const isInView = isGeofenceInViewport(g, centerLat, centerLng, viewportRadius);
      console.log(`  Geofence "${g.name}": ${isInView ? '✅ IN VIEWPORT' : '❌ OUTSIDE VIEWPORT'}`);
      return isInView;
    });
    
    console.log(`✅ Loaded ${geofencesData.length} geofences within viewport`);
    console.log('📋 Filtered geofences:', geofencesData.map(g => g.name));
    
    setGeofences(geofencesData);
    locationNameCache = buildLocationCache(geofencesData);

    // 9. Fetch active trips
    console.log('📡 Fetching active trips...');
    let activeTripsData = [];
    try {
      const tripsRes = await tripService.getAll(tenantId).catch(() => ({ data: [] }));
      const allTrips = tripsRes.data || [];
      console.log(`📊 Total trips from API: ${allTrips.length}`);
      
      activeTripsData = allTrips
        .filter(t => {
          const isActive = t.status === 'active' || t.status === 'In Progress' || t.status === 'planned';
          console.log(`  Trip ${t.id} (${t.status}): ${isActive ? '✅ ACTIVE' : '❌ NOT ACTIVE'}`);
          return isActive;
        })
        .map(t => {
          const geofence = t.geofence || geofencesData.find(g => g.id === t.geofenceId);
          const routeName = geofence?.name || t.routeName || 'No route assigned';
          
          let startLocation = t.startLocation;
          let endLocation = t.endLocation;
          
          if (geofence && geofence.coordinates) {
            const routePoints = extractRoutePoints(geofence);
            if (routePoints.start && routePoints.end) {
              startLocation = routePoints.start;
              endLocation = routePoints.end;
            }
          }
          
          return {
            ...t,
            routeName: routeName,
            geofenceName: geofence?.name || null,
            routeId: geofence?.id || null,
            startLocation: startLocation || t.startLocation || 'Start',
            endLocation: endLocation || t.endLocation || 'End',
          };
        });
    } catch (e) {
      console.warn('Failed to load trips:', e);
      activeTripsData = [];
    }
    setActiveTrips(activeTripsData);
    console.log(`✅ Loaded ${activeTripsData.length} active trips`);

    // 10. Fetch tracking data
    console.log('📡 Fetching tracking data for each vehicle...');
    const trackingMap = {};
    for (const v of vehiclesData) {
      try {
        const latestRes = await trackingService.getLatest(v.id).catch(() => ({ data: null }));
        if (latestRes && latestRes.data) {
          trackingMap[v.id] = latestRes.data;
          console.log(`  ✅ Vehicle ${v.id}: tracking data found`);
        } else {
          console.log(`  ⚠️ Vehicle ${v.id}: no tracking data`);
        }
      } catch (e) {
        console.warn(`No tracking data for vehicle ${v.id}`);
      }
    }
    setVehicleTrackingData(trackingMap);
    console.log(`✅ Loaded tracking data for ${Object.keys(trackingMap).length} vehicles`);

    // 11. Fetch violations
    console.log('📡 Fetching geofence violations...');
    let violationsData = [];
    try {
      const violationsRes = await geofenceService.getViolations(tenantId).catch(() => ({ data: [] }));
      violationsData = violationsRes.data || [];
    } catch (e) {
      console.warn('Failed to load violations:', e);
      violationsData = [];
    }
    
    const alarmsData = violationsData
      .filter(v => !v.resolved)
      .map(v => ({
        id: v.id,
        vehicleId: v.vehicleId || null,
        vehicle: v.vehicleRegistration || v.vehicleId || 'Unknown',
        type: v.violationType || 'geofence',
        lat: v.lat ? parseFloat(v.lat) : 0,
        lng: v.lng ? parseFloat(v.lng) : 0,
        time: v.timestamp ? new Date(v.timestamp).toLocaleString() : new Date().toLocaleString(),
        severity: 'high',
        message: v.violationType || 'Geofence violation detected',
        resolved: v.resolved || false,
        geofenceName: v.geofenceName || 'Unknown Geofence',
        geofenceId: v.geofenceId || null
      }));
    setAlarms(alarmsData);
    console.log(`✅ Loaded ${alarmsData.length} active alarms`);

    // 12. Build vehicles with real data
    console.log('🏗️ Building vehicle objects with tracking data...');
    const trackingVehicles = vehiclesData.map((v, index) => {
      const assignedDriver = driversData.find(d => 
        d.assignedVehicleId === v.id || 
        d.assignedVehicleRegistration === v.registration
      );

      const track = trackingMap[v.id];
      const activeTrip = activeTripsData.find(t => 
        t.vehicleId === v.id || t.vehicle_id === v.id
      );
      
      let status = 'idle';
      let speed = 0;
      let lat = null;
      let lng = null;
      let heading = 0;
      let fuel = null;
      let engineTemp = null;
      let lastUpdate = new Date();
      let hasTracking = false;
      let progress = '0%';
      let elapsed = '0s';
      let routeName = null;
      
      if (track) {
        lat = track.lat ? parseFloat(track.lat) : null;
        lng = track.lng ? parseFloat(track.lng) : null;
        speed = track.speed ? Math.round(parseFloat(track.speed)) : 0;
        heading = track.heading || 0;
        fuel = track.fuelLevel ? Math.round(parseFloat(track.fuelLevel)) : null;
        engineTemp = track.engineTemp ? Math.round(parseFloat(track.engineTemp)) : null;
        lastUpdate = track.timestamp ? new Date(track.timestamp) : new Date();
        status = (activeTrip && speed > 3) ? 'moving' : 'idle';
        hasTracking = true;
        progress = track.progress || '0%';
        elapsed = track.elapsed || '0s';
      }

      if (!hasTracking) {
        lat = v.lat ? parseFloat(v.lat) : centerLat + (Math.random() - 0.5) * 0.02;
        lng = v.lng ? parseFloat(v.lng) : centerLng + (Math.random() - 0.5) * 0.02;
        speed = 0;
        status = 'idle';
        fuel = 50 + Math.random() * 40;
        hasTracking = true;
      }

      if (activeTrip) {
        routeName = activeTrip.routeName || activeTrip.geofenceName || 'No route assigned';
      }

      const finalSpeed = activeTrip ? speed : 0;
      const currentLocation = getLocationName(lat, lng);

      const vehicleObj = {
        id: v.id,
        reg: v.registration || v.id,
        lat: lat,
        lng: lng,
        speed: finalSpeed,
        status: status || 'idle',
        heading: heading || 0,
        driver: assignedDriver?.name || v.custodian || 'Unassigned',
        driverId: assignedDriver?.id || null,
        driverScore: assignedDriver?.safetyScore || 100,
        driverPhone: assignedDriver?.phone || null,
        driverEmail: assignedDriver?.email || null,
        driverLicense: assignedDriver?.licenseNumber || null,
        lastUpdate: lastUpdate,
        fuel: fuel,
        odometer: v.mileage || '0 km',
        engineTemp: engineTemp,
        make: v.make || 'Unknown',
        model: v.model || 'Unknown',
        year: v.year || '2024',
        color: v.color || 'White',
        nextService: v.nextService || 'N/A',
        licenseExpiry: v.licenseExpiry || 'N/A',
        location: v.location || tenantConfig?.name || 'Nairobi',
        hasTracking: hasTracking,
        hasActiveTrip: !!activeTrip,
        tripId: activeTrip?.id || null,
        tripDestination: activeTrip?.endLocation || activeTrip?.to || null,
        tripPurpose: activeTrip?.purpose || null,
        tripStartTime: activeTrip?.startTime || null,
        tripStartLocation: activeTrip?.startLocation || activeTrip?.from || null,
        routeName: routeName,
        currentLocation: currentLocation,
        locationName: currentLocation,
        progress: progress,
        elapsed: elapsed,
        geofenceId: activeTrip?.geofenceId || null,
      };
      
      console.log(`  Vehicle ${v.id} (${vehicleObj.reg}): lat=${lat}, lng=${lng}, hasActiveTrip=${!!activeTrip}`);
      return vehicleObj;
    });

    // 13. Filter vehicles by coordinates
    console.log(`🔍 Filtering vehicles within ${viewportRadius}km of (${centerLat}, ${centerLng})...`);
    const locationFilteredVehicles = trackingVehicles.filter(vehicle => {
      // Check if vehicle has coordinates and is within viewport
      if (vehicle.lat && vehicle.lng) {
        const isInView = isWithinViewport(
          vehicle.lat,
          vehicle.lng,
          centerLat,
          centerLng,
          viewportRadius
        );
        console.log(`  Vehicle ${vehicle.reg}: lat=${vehicle.lat}, lng=${vehicle.lng} -> ${isInView ? '✅ IN VIEWPORT' : '❌ OUTSIDE VIEWPORT'}`);
        return isInView;
      }
      
      // If vehicle has a geofence, check if geofence is within viewport
      if (vehicle.geofenceId) {
        const geofence = geofencesData.find(g => g.id === vehicle.geofenceId);
        if (geofence) {
          const isInView = isGeofenceInViewport(geofence, centerLat, centerLng, viewportRadius);
          console.log(`  Vehicle ${vehicle.reg} (via geofence ${geofence.name}): ${isInView ? '✅ IN VIEWPORT' : '❌ OUTSIDE VIEWPORT'}`);
          return isInView;
        }
      }
      
      // If no location info, EXCLUDE it (no fallback)
      console.log(`  Vehicle ${vehicle.reg}: ⚠️ No location info, EXCLUDING`);
      return false;
    });

    setVehicles(locationFilteredVehicles);
    console.log(`✅ ${locationFilteredVehicles.length} vehicles within viewport`);
    console.log('📋 Final vehicle list:', locationFilteredVehicles.map(v => ({ reg: v.reg, lat: v.lat, lng: v.lng })));

    // 14. Update map center
    console.log(`🗺️ Setting map center to: ${centerLat}, ${centerLng}`);
    setMapCenter({
      lat: centerLat,
      lng: centerLng
    });
    setMapZoom(tenantConfig?.map?.zoom || 13);

    setLastUpdated(new Date().toLocaleTimeString());

    if (isFirstLoad.current) {
      console.log('🔌 First load - setting up WebSocket...');
      setupWebSocket();
      isFirstLoad.current = false;
    }

    console.log('✅ ===== LOADDATA COMPLETED =====');
    console.log(`📊 Summary: ${geofencesData.length} geofences, ${locationFilteredVehicles.length} vehicles`);

  } catch (error) {
    console.error('❌ Tracking: Failed to load data:', error);
    setError(error.message || 'Failed to load tracking data');
  } finally {
    setIsLoading(false);
  }
};

  // ============================================
  // USE EFFECTS
  // ============================================
  useEffect(() => {
    loadData();
    
    return () => {
      if (!isFirstLoad.current) {
        webSocketService.disconnect();
      }
    };
  }, [currentTenant, currentUser]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!webSocketService.isConnected() && !isWebSocketConnected) {
        console.log('🔄 Auto-refreshing tracking data (REST polling)...');
        loadData();
      }
    }, 10000);

    return () => clearInterval(intervalId);
  }, [isWebSocketConnected]);

  // ============================================
  // AUTO-MOVE
  // ============================================
  useEffect(() => {
    if (vehicles.length === 0 || isWebSocketConnected) {
      return;
    }

    console.log('🔄 Auto-move started (WebSocket disconnected)');

    const moveInterval = setInterval(() => {
      setVehicles(prev => prev.map(v => {
        if (!v.hasActiveTrip) {
          return {
            ...v,
            speed: 0,
            status: 'idle'
          };
        }
        
        if (v.hasTracking && v.lat && v.lng) {
          return {
            ...v,
            speed: v.speed || 20,
            status: v.speed > 3 ? 'moving' : 'idle',
            lastUpdate: new Date()
          };
        }
        
        const speed = v.speed || 20;
        const moveLat = (Math.random() - 0.5) * 0.001 * (speed / 20);
        const moveLng = (Math.random() - 0.5) * 0.001 * (speed / 20);
        const newSpeed = Math.max(5, Math.min(80, v.speed + (Math.random() - 0.5) * 10));
        const newLat = v.lat + moveLat;
        const newLng = v.lng + moveLng;
        
        const cacheKey = `tracking_${v.id}`;
        let cached = [];
        try {
          const existing = localStorage.getItem(cacheKey);
          if (existing) {
            cached = JSON.parse(existing);
          }
        } catch (e) {}
        
        cached.push({
          lat: newLat,
          lng: newLng,
          speed: newSpeed,
          heading: v.heading || 0,
          timestamp: new Date().toISOString()
        });
        
        if (cached.length > 200) {
          cached = cached.slice(-200);
        }
        localStorage.setItem(cacheKey, JSON.stringify(cached));
        
        const location = getLocationName(newLat, newLng);
        
        return {
          ...v,
          lat: newLat,
          lng: newLng,
          speed: newSpeed,
          status: 'moving',
          lastUpdate: new Date(),
          currentLocation: location,
          locationName: location,
        };
      }));
    }, 3000);

    return () => clearInterval(moveInterval);
  }, [vehicles.length, isWebSocketConnected]);

  // ============================================
  // HANDLE FUNCTIONS
  // ============================================
  const getStatusColor = (status) => {
    switch(status) {
      case 'moving': return '#22c55e';
      case 'idle': return '#eab308';
      case 'alert': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch(status) {
      case 'moving': return 'Moving';
      case 'idle': return 'Idle';
      default: return 'Unknown';
    }
  };

  const getAlarmSeverityColor = (severity) => {
    switch(severity) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getAlarmIcon = (type) => {
    switch(type) {
      case 'panic': return <AlertCircle size={14} />;
      case 'speeding': return <AlertTriangle size={14} />;
      case 'geofence': return <MapPinned size={14} />;
      case 'harsh_braking': return <Activity size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  const handleVehicleClick = (vehicle) => {
    setSelectedVehicle(vehicle);
    setShowVehicleModal(true);
  };

  const closeModal = () => {
    setShowVehicleModal(false);
    setSelectedVehicle(null);
  };

  const closeRouteHistory = () => {
    setShowRouteHistory(false);
    setSelectedVehicleHistory([]);
    setSelectedVehicle(null);
    setHistoryPage(1);
  };

  const handleTrackVehicle = (vehicle) => {
    if (vehicle && vehicle.lat && vehicle.lng) {
      setMapCenter({ lat: vehicle.lat, lng: vehicle.lng });
      setMapZoom(15);
      closeModal();
    }
  };

  const handleViewHistory = async (vehicle) => {
    setHistoryLoading(true);
    setHistoryPage(1);
    try {
      console.log(`📡 Fetching history for vehicle ${vehicle.id}`);
      const historyRes = await trackingService.getByVehicle(vehicle.id);
      
      let historyData = [];
      if (historyRes && historyRes.success && Array.isArray(historyRes.data)) {
        historyData = historyRes.data;
      }
      
      console.log('📊 Extracted history data:', historyData.length, 'points');
      
      setSelectedVehicleHistory(historyData);
      setShowRouteHistory(true);
    } catch (e) {
      console.error('Failed to load history:', e);
      setSelectedVehicleHistory([]);
      setShowRouteHistory(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAlert = (vehicle) => {
    if (!vehicle) return;
    const createIncident = async () => {
      try {
        const incidentData = {
          tenant: { id: currentUser?.tenantId },
          vehicle: { id: vehicle.id },
          driver: vehicle.driverId ? { id: vehicle.driverId } : null,
          incidentType: 'Manual Alert',
          severity: 'High',
          status: 'reported',
          location: vehicle.lat && vehicle.lng ? `${vehicle.lat}, ${vehicle.lng}` : 'Unknown',
          description: `Manual alert triggered for vehicle ${vehicle.reg}`,
          reportedBy: currentUser?.name || 'System'
        };
        await incidentService.create(incidentData);
        alert(`Alert created for ${vehicle.reg}`);
        loadData();
      } catch (e) {
        console.error('Failed to create incident:', e);
        alert('Failed to create alert. Please try again.');
      }
    };
    createIncident();
    closeModal();
  };

  const handleNavigate = (vehicle) => {
    if (vehicle && vehicle.lat && vehicle.lng) {
      const url = `https://www.google.com/maps/search/?api=1&query=${vehicle.lat},${vehicle.lng}`;
      window.open(url, '_blank');
      closeModal();
    }
  };

  // ============================================
  // PLAYBACK HANDLERS
  // ============================================
  const handleOpenPlayback = (vehicle) => {
    setPlaybackVehicle(vehicle);
    setShowPlayback(true);
    closeModal();
  };

  const handleClosePlayback = () => {
    setShowPlayback(false);
    setPlaybackVehicle(null);
  };

  const handleMapCenter = (lat, lng) => {
    if (lat && lng) {
      setMapCenter({ lat, lng });
      setMapZoom(15);
    }
  };

  // ============================================
  // CALCULATE COUNTS
  // ============================================
  const vehiclesWithLocation = vehicles.filter(v => v && v.lat !== null && v.lng !== null);
  const movingCount = vehiclesWithLocation.filter(v => v.hasActiveTrip && v.speed > 3).length;
  const idleCount = vehiclesWithLocation.filter(v => !v.hasActiveTrip || v.speed <= 3).length;
  const noTrackingCount = vehicles.filter(v => !v.hasTracking).length;
  const activeAlarmsCount = alarms.filter(a => !a.resolved).length;
  const activeTripCount = activeTrips.filter(t => t.status === 'active' || t.status === 'In Progress').length;

  // ============================================
  // RENDER HISTORY MODAL WITH PAGINATION
  // ============================================
  const renderHistoryModal = () => {
    if (!showRouteHistory) return null;

    const normalizePoint = (point) => {
      return {
        lat: point.lat || point.latitude || 0,
        lng: point.lng || point.longitude || point.lon || 0,
        speed: point.speed || 0,
        timestamp: point.timestamp || point.createdAt || point.created_at || new Date().toISOString()
      };
    };

    const normalizedHistory = selectedVehicleHistory.map(normalizePoint);
    
    const totalItems = normalizedHistory.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (historyPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
    const currentPageItems = normalizedHistory.slice(startIndex, endIndex);

    const goToPage = (page) => {
      if (page >= 1 && page <= totalPages) {
        setHistoryPage(page);
      }
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="absolute inset-0" onClick={() => setShowRouteHistory(false)}></div>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <button 
            onClick={() => setShowRouteHistory(false)}
            className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
          >
            <X size={20} className="md:w-6 md:h-6 text-gray-500 hover:text-gray-700" />
          </button>

          <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-4 md:px-6 md:py-5 rounded-t-2xl">
            <h2 className="text-lg md:text-2xl font-bold text-white">Route History</h2>
            <p className="text-purple-100 text-xs md:text-sm">
              {selectedVehicle?.reg || 'Vehicle'} - {totalItems} tracking points
              {totalPages > 1 && ` (Page ${historyPage} of ${totalPages})`}
            </p>
          </div>

          <div className="p-4 md:p-6">
            {historyLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-500">Loading history...</p>
              </div>
            ) : totalItems === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History size={36} className="md:w-12 md:h-12 mx-auto text-gray-300 mb-3" />
                <p>No tracking history available</p>
                <p className="text-sm">This vehicle has no tracking data recorded</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-60 md:max-h-80 overflow-y-auto">
                  {currentPageItems.map((point, index) => {
                    const globalIndex = startIndex + index;
                    return (
                      <div key={globalIndex} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-gray-50 rounded-lg text-xs md:text-sm hover:bg-gray-100 transition-colors gap-1 sm:gap-0">
                        <div>
                          <span className="font-medium">#{globalIndex + 1}</span>
                          <span className="ml-2 md:ml-3 text-gray-600">
                            {point.lat?.toFixed(6)}, {point.lng?.toFixed(6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-xs text-gray-500">
                          <span>Speed: {Math.round(point.speed || 0)} km/h</span>
                          <span className="hidden xs:inline">{point.timestamp ? new Date(point.timestamp).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-gray-200 pt-4">
                    <div className="text-[10px] md:text-xs text-gray-500">
                      Showing {startIndex + 1} - {endIndex} of {totalItems} entries
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => goToPage(historyPage - 1)}
                        disabled={historyPage === 1}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft size={16} className="md:w-[18px] md:h-[18px] text-gray-600" />
                      </button>
                      
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (historyPage <= 3) {
                            pageNum = i + 1;
                          } else if (historyPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = historyPage - 2 + i;
                          }
                          
                          if (pageNum > 0 && pageNum <= totalPages) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`w-7 h-7 md:w-8 md:h-8 rounded-lg text-[10px] md:text-xs font-medium transition-colors ${
                                  historyPage === pageNum
                                    ? 'bg-purple-600 text-white'
                                    : 'hover:bg-gray-100 text-gray-600'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        })}
                      </div>
                      
                      <button
                        onClick={() => goToPage(historyPage + 1)}
                        disabled={historyPage === totalPages}
                        className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight size={16} className="md:w-[18px] md:h-[18px] text-gray-600" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button 
                onClick={() => setShowRouteHistory(false)}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm"
              >
                Close
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
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 md:h-12 md:w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500 text-sm md:text-base">Loading tracking data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md px-4">
          <div className="text-red-500 mb-4">
            <AlertCircle size={36} className="md:w-12 md:h-12 mx-auto" />
          </div>
          <p className="text-red-600 font-medium text-sm md:text-base">{error}</p>
          <button 
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto text-sm"
          >
            <RefreshCw size={14} className="md:w-4 md:h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4 overflow-x-hidden">
      {/* Controls Bar - Mobile Responsive - NO LOCATION DROPDOWN */}
      <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap flex-1 min-w-[150px]">
            <h3 className="font-semibold text-sm md:text-base">Live Tracking</h3>
            <span className="text-[10px] md:text-xs text-gray-400">
              Updated: {lastUpdated || 'Just now'}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <button 
              onClick={() => setShowGeofences(!showGeofences)} 
              className={`px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs rounded-lg transition-colors flex items-center gap-1 ${showGeofences ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <MapPinned size={12} className="md:w-[14px] md:h-[14px]" /> 
              <span className="hidden xs:inline">Geofences</span>
              <span className="xs:hidden">GF</span>
              <span className="hidden xs:inline">({geofences.length})</span>
            </button>
            
            <button 
              onClick={() => setShowAlarms(!showAlarms)} 
              className={`px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs rounded-lg transition-colors flex items-center gap-1 ${showAlarms ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}
            >
              <AlertCircle size={12} className="md:w-[14px] md:h-[14px]" /> 
              <span className="hidden xs:inline">Alarms</span>
              <span className="xs:hidden">AL</span>
              <span className="hidden xs:inline">({activeAlarmsCount})</span>
            </button>
            
            <button 
              onClick={loadData}
              className="px-2 py-1 md:px-3 md:py-1.5 text-[10px] md:text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
            >
              <RefreshCw size={12} className="md:w-[14px] md:h-[14px]" /> 
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Mobile status indicators */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-[10px] md:text-xs mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>Moving ({movingCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Idle ({idleCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
            <span>Offline ({noTrackingCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            <span>Alarms ({activeAlarmsCount})</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span>Trips ({activeTripCount})</span>
          </div>
          {isWebSocketConnected && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-green-600 text-[10px]">● Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Map + Sidebar - Sidebar goes below on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map takes full width on mobile, 3/4 on desktop */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          <div className="h-[400px] sm:h-[450px] md:h-[500px]">
            <MapContainer 
              key={`${mapCenter.lat}-${mapCenter.lng}`}
              center={[mapCenter.lat, mapCenter.lng]} 
              zoom={mapZoom} 
              style={{ height: '100%', width: '100%' }}
              className="z-0"
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {showGeofences && geofences.map((g) => {
                if (g.type === 'route' && g.coordinates) {
                  try {
                    const points = typeof g.coordinates === 'string' ? JSON.parse(g.coordinates) : g.coordinates;
                    if (points && points.length > 1) {
                      const positions = points.map(p => [p.lat, p.lng]);
                      return (
                        <SafePolyline
                          key={g.id}
                          positions={positions}
                          pathOptions={{
                            color: g.color || '#2563EB',
                            weight: 4,
                            opacity: 0.8,
                            dashArray: '10, 5',
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold">{g.name}</p>
                              <p className="text-gray-600">Route Path</p>
                              <p className="text-gray-600">Points: {points.length}</p>
                            </div>
                          </Popup>
                        </SafePolyline>
                      );
                    }
                  } catch (e) {
                    return null;
                  }
                }
                return null;
              })}

              {showGeofences && geofences.map((g) => {
                if (g.type === 'circular' && g.centerLat && g.centerLng) {
                  return (
                    <SafeCircle
                      key={g.id}
                      center={[parseFloat(g.centerLat), parseFloat(g.centerLng)]}
                      radius={g.radius ? parseFloat(g.radius) : 500}
                      pathOptions={{
                        color: g.color || '#2563EB',
                        fillColor: g.color || '#2563EB',
                        fillOpacity: 0.15,
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold">{g.name}</p>
                          <p className="text-gray-600">Type: {g.type || 'circular'}</p>
                          <p className="text-gray-600">Radius: {g.radius ? parseFloat(g.radius) : 500}m</p>
                          <p className="text-gray-600">Status: {g.isActive ? 'Active' : 'Inactive'}</p>
                        </div>
                      </Popup>
                    </SafeCircle>
                  );
                }
                return null;
              })}

              {showAlarms && alarms.filter(a => !a.resolved && a.lat && a.lng && a.lat !== 0 && a.lng !== 0).map(alarm => (
                <SafeCircle
                  key={alarm.id}
                  center={[parseFloat(alarm.lat), parseFloat(alarm.lng)]}
                  radius={50}
                  pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.3,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-bold text-red-600">⚠️ Geofence Violation</p>
                      <p>Vehicle: {alarm.vehicle}</p>
                      <p>Type: {alarm.type}</p>
                      <p>Geofence: {alarm.geofenceName || 'Unknown'}</p>
                      <p>Time: {alarm.time}</p>
                    </div>
                  </Popup>
                </SafeCircle>
              ))}

              {vehiclesWithLocation.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center text-gray-500 p-4">
                    <Truck size={36} className="md:w-12 md:h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm md:text-base">No vehicles with tracking data</p>
                    <p className="text-xs md:text-sm">Vehicles will appear here once tracking data is available</p>
                  </div>
                </div>
              ) : (
                vehiclesWithLocation.map(v => {
                  const isMoving = v.hasActiveTrip && v.speed > 3;
                  const hasActiveTrip = v.hasActiveTrip;
                  const color = hasActiveTrip ? '#2563EB' : (isMoving ? '#22c55e' : '#eab308');
                  
                  return (
                    <SafeMarker 
                      key={v.id}
                      position={[v.lat, v.lng]}
                      icon={L.divIcon({
                        className: 'custom-marker',
                        html: `<div class="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white shadow-lg" style="background-color: ${color}"></div>`,
                        iconSize: [12, 12],
                        iconAnchor: [6, 6],
                      })}
                      eventHandlers={{
                        click: () => handleVehicleClick(v),
                      }}
                    >
                      <Popup>
                        <div className="text-xs md:text-sm">
                          <p className="font-bold">{v.reg}</p>
                          <p className="text-gray-600">Driver: {v.driver}</p>
                          <p className="text-gray-600">Location: {v.currentLocation || v.locationName || 'Unknown'}</p>
                          <p className="text-gray-600">Status: 
                            <span className={`font-medium ${hasActiveTrip ? 'text-blue-600' : isMoving ? 'text-green-600' : 'text-yellow-600'}`}>
                              {hasActiveTrip ? '🚗 On Trip' : isMoving ? 'Moving' : 'Idle'}
                            </span>
                          </p>
                          {hasActiveTrip && v.routeName && v.routeName !== 'No route assigned' && (
                            <p className="text-blue-600 font-medium">📍 Route: {v.routeName}</p>
                          )}
                          <p className="text-gray-600">Speed: {Math.round(v.speed)} km/h</p>
                          {v.fuel && <p className="text-gray-600">Fuel: {Math.round(v.fuel)}%</p>}
                        </div>
                      </Popup>
                    </SafeMarker>
                  );
                })
              )}
            </MapContainer>
          </div>
        </div>

        {/* Fleet Sidebar - hidden on mobile, shown below map instead */}
        <div className="hidden lg:block lg:col-span-1">
          <FleetSidebar 
            vehicles={vehicles}
            activeTrips={activeTrips}
            onVehicleClick={handleVehicleClick}
            selectedVehicle={selectedVehicle}
            tenantConfig={tenantConfig}
            isWebSocketConnected={isWebSocketConnected}
            movingCount={movingCount}
            activeAlarmsCount={activeAlarmsCount}
          />
        </div>
      </div>

      {/* Mobile Fleet Status - shown below map on mobile only */}
      <div className="lg:hidden">
        <FleetSidebar 
          vehicles={vehicles}
          activeTrips={activeTrips}
          onVehicleClick={handleVehicleClick}
          selectedVehicle={selectedVehicle}
          tenantConfig={tenantConfig}
          isWebSocketConnected={isWebSocketConnected}
          movingCount={movingCount}
          activeAlarmsCount={activeAlarmsCount}
        />
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <StatsCard 
          label="Total Vehicles" 
          value={vehicles.length} 
          icon={Truck} 
          color="blue"
        />
        <StatsCard 
          label="Moving" 
          value={movingCount} 
          icon={Navigation} 
          color="green"
        />
        <StatsCard 
          label="Active Trips" 
          value={activeTripCount} 
          icon={Flag} 
          color="purple"
        />
        <StatsCard 
          label="Active Alarms" 
          value={activeAlarmsCount} 
          icon={AlertTriangle} 
          color="red"
        />
      </div>

      {/* Vehicle Detail Modal - Mobile Responsive */}
      {showVehicleModal && selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 md:p-4">
          <div className="absolute inset-0" onClick={closeModal}></div>
          
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto">
            <button 
              onClick={closeModal}
              className="absolute top-3 right-3 md:top-4 md:right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors z-10"
            >
              <X size={20} className="md:w-6 md:h-6 text-yellow-500 hover:text-yellow-700"/>
            </button>

            <div className={`px-4 py-4 md:px-6 md:py-5 rounded-t-2xl ${
              selectedVehicle.hasActiveTrip 
                ? 'bg-gradient-to-r from-blue-600 to-blue-700' 
                : selectedVehicle.speed > 3 
                  ? 'bg-gradient-to-r from-green-600 to-green-700' 
                  : 'bg-gradient-to-r from-yellow-600 to-yellow-700'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-lg bg-white/20`}>
                    <Truck size={20} className="md:w-7 md:h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg md:text-2xl font-bold text-white">{selectedVehicle.reg}</h2>
                    <p className="text-white/80 text-[10px] md:text-sm">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                  {selectedVehicle.hasActiveTrip && (
                    <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-xs font-semibold text-white bg-blue-500 animate-pulse">
                      ● TRIP
                    </span>
                  )}
                  <span className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-xs font-semibold text-white`} 
                        style={{ backgroundColor: selectedVehicle.hasActiveTrip ? '#2563EB' : selectedVehicle.speed > 3 ? '#22c55e' : '#eab308' }}>
                    {selectedVehicle.hasActiveTrip ? 'On Trip' : selectedVehicle.speed > 3 ? 'Moving' : 'Idle'}
                  </span>
                  {selectedVehicle.lat && selectedVehicle.lng && (
                    <button
                      onClick={() => handleOpenPlayback(selectedVehicle)}
                      className="px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-xs font-semibold bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
                    >
                      <Play size={10} className="md:w-3 md:h-3" /> Replay
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <p className="text-[10px] md:text-xs text-gray-500">Speed</p>
                  <p className="text-base md:text-lg font-bold text-blue-600">{Math.round(selectedVehicle.speed)} km/h</p>
                </div>
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <p className="text-[10px] md:text-xs text-gray-500">Fuel</p>
                  <p className="text-base md:text-lg font-bold text-yellow-600">
                    {selectedVehicle.fuel ? (
                      <div className="flex items-center justify-center gap-1">
                        <BatteryIcon percentage={selectedVehicle.fuel} />
                      </div>
                    ) : 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <p className="text-[10px] md:text-xs text-gray-500">Odometer</p>
                  <p className="text-base md:text-lg font-bold text-gray-700">{selectedVehicle.odometer}</p>
                </div>
                <div className="bg-gray-50 p-2 md:p-3 rounded-lg text-center">
                  <p className="text-[10px] md:text-xs text-gray-500">Engine Temp</p>
                  <p className="text-base md:text-lg font-bold text-orange-600">{selectedVehicle.engineTemp ? `${Math.round(selectedVehicle.engineTemp)}°C` : 'N/A'}</p>
                </div>
              </div>

              {selectedVehicle.currentLocation && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-[10px] md:text-xs text-gray-500">📍 Current Location</p>
                  <p className="text-sm md:text-base font-medium text-blue-700 break-words">{selectedVehicle.currentLocation || selectedVehicle.locationName}</p>
                </div>
              )}

              {selectedVehicle.hasActiveTrip && selectedVehicle.routeName && selectedVehicle.routeName !== 'No route assigned' && (
                <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                  <p className="text-[10px] md:text-xs text-gray-500">🗺️ Route</p>
                  <p className="text-sm md:text-base font-medium text-indigo-700">{selectedVehicle.routeName}</p>
                </div>
              )}

              {selectedVehicle.hasActiveTrip && selectedVehicle.progress && (
                <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-[10px] md:text-xs text-gray-500">🚗 Trip Progress</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full transition-all duration-500"
                        style={{ width: selectedVehicle.progress }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">{selectedVehicle.progress}</span>
                  </div>
                  <p className="text-[10px] md:text-xs text-gray-400 mt-1">Elapsed: {selectedVehicle.elapsed || '0s'}</p>
                </div>
              )}

              {selectedVehicle.hasActiveTrip && (
                <div className="mb-4 md:mb-6 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-xs md:text-sm font-semibold text-blue-700 mb-2 flex items-center gap-2">
                    <Flag size={14} className="md:w-4 md:h-4" />
                    Active Trip Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 md:gap-2 text-xs md:text-sm">
                    <div><span className="text-gray-500">From:</span> <span className="font-medium">{selectedVehicle.tripStartLocation || 'N/A'}</span></div>
                    <div><span className="text-gray-500">To:</span> <span className="font-medium">{selectedVehicle.tripDestination || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Purpose:</span> <span className="font-medium">{selectedVehicle.tripPurpose || 'N/A'}</span></div>
                    <div><span className="text-gray-500">Started:</span> <span className="font-medium">{selectedVehicle.tripStartTime ? new Date(selectedVehicle.tripStartTime).toLocaleString() : 'N/A'}</span></div>
                    {selectedVehicle.routeName && selectedVehicle.routeName !== 'No route assigned' && (
                      <div className="col-span-2"><span className="text-gray-500">Route:</span> <span className="font-medium text-blue-600">{selectedVehicle.routeName}</span></div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
                <div className="space-y-3">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-700 border-b pb-2">Vehicle Information</h4>
                  <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Driver:</span>
                      <span className="font-medium">{selectedVehicle.driver || 'Unassigned'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Driver Score:</span>
                      <span className="font-medium text-green-600">{selectedVehicle.driverScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Update:</span>
                      <span className="font-medium text-[10px] md:text-xs">
                        {selectedVehicle.lastUpdate ? new Date(selectedVehicle.lastUpdate).toLocaleString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Color:</span>
                      <span className="font-medium">{selectedVehicle.color || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Heading:</span>
                      <span className="font-medium">{selectedVehicle.heading || 0}°</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-700 border-b pb-2">Service & Maintenance</h4>
                  <div className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Next Service:</span>
                      <span className="font-medium">{selectedVehicle.nextService || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">License Expiry:</span>
                      <span className="font-medium">{selectedVehicle.licenseExpiry || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location:</span>
                      <span className="font-medium">{selectedVehicle.location || 'N/A'}</span>
                    </div>
                    {selectedVehicle.driverPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Driver Phone:</span>
                        <span className="font-medium">{selectedVehicle.driverPhone}</span>
                      </div>
                    )}
                    {selectedVehicle.driverEmail && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Driver Email:</span>
                        <span className="font-medium text-[10px] md:text-xs truncate">{selectedVehicle.driverEmail}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-500">Has Tracking:</span>
                      <span className={`font-medium ${selectedVehicle.hasTracking ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedVehicle.hasTracking ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 md:gap-2 pt-4 border-t border-gray-200">
                {selectedVehicle.lat && selectedVehicle.lng && (
                  <>
                    <button 
                      onClick={() => handleTrackVehicle(selectedVehicle)}
                      className="flex-1 min-w-[50px] bg-blue-600 text-white px-1.5 py-1 md:px-4 md:py-2 rounded-lg text-[8px] md:text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-0.5 md:gap-2"
                    >
                      <Eye size={10} className="md:w-4 md:h-4" /> 
                      <span className="text-[8px] md:text-sm">Center Map</span>
                    </button>
                    <button 
                      onClick={() => handleViewHistory(selectedVehicle)}
                      className="flex-1 min-w-[50px] bg-purple-600 text-white px-1.5 py-1 md:px-4 md:py-2 rounded-lg text-[8px] md:text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-0.5 md:gap-2"
                    >
                      <History size={10} className="md:w-4 md:h-4" /> 
                      <span className="text-[8px] md:text-sm">History</span>
                    </button>
                    <button 
                      onClick={() => handleNavigate(selectedVehicle)}
                      className="flex-1 min-w-[50px] bg-green-600 text-white px-1.5 py-1 md:px-4 md:py-2 rounded-lg text-[8px] md:text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-0.5 md:gap-2"
                    >
                      <Navigation size={10} className="md:w-4 md:h-4" /> 
                      <span className="text-[8px] md:text-sm">Navigate</span>
                    </button>
                  </>
                )}
                <button 
                  onClick={() => handleAlert(selectedVehicle)}
                  className={`${selectedVehicle.lat && selectedVehicle.lng ? 'flex-1 min-w-[50px]' : 'w-full'} bg-red-600 text-white px-1.5 py-1 md:px-4 md:py-2 rounded-lg text-[8px] md:text-sm font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-0.5 md:gap-2`}
                >
                  <AlertCircle size={10} className="md:w-4 md:h-4" /> 
                  <span className="text-[8px] md:text-sm">Alert</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderHistoryModal()}

      <RoutePlayback 
        vehicle={playbackVehicle}
        isOpen={showPlayback}
        onClose={handleClosePlayback}
        onMapCenter={handleMapCenter}
      />

      <style jsx>{`
        .custom-marker {
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .custom-marker:hover {
          transform: scale(1.5);
          z-index: 1000;
        }
        @media (max-width: 640px) {
          .custom-marker {
            transform: scale(0.8);
          }
          .custom-marker:hover {
            transform: scale(1.2);
          }
        }
        /* Prevent horizontal scroll */
        * {
          max-width: 100vw;
          box-sizing: border-box;
        }
        /* Mobile touch improvements */
        button, .cursor-pointer {
          touch-action: manipulation;
        }
        /* Fix map container on mobile */
        .leaflet-container {
          touch-action: pan-x pan-y !important;
        }
      `}</style>
    </div>
  );
};

export default Tracking;