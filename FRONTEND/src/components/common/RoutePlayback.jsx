// src/components/common/RoutePlayback.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  History, X, Play, Pause, Square, 
  SkipBack, SkipForward 
} from 'lucide-react';
import { trackingService } from '../../services/api';

// ============================================
// ROUTE PLAYBACK COMPONENT (Shared)
// ============================================
// Used by:
//   - Tracking.jsx  → live vehicle playback
//   - Trips.jsx     → historical trip playback
//
// Props:
//   vehicle      { id, reg }              — required
//   isOpen       boolean                  — required
//   onClose      () => void               — required
//   onMapCenter  (lat, lng) => void       — optional
//   tripId       string|null              — optional. Backend trip filter
//   tripStart    ISO string|null          — optional. Client-side filter start
//   tripEnd      ISO string|null          — optional. Client-side filter end
// ============================================

const RoutePlayback = ({ 
  vehicle, 
  isOpen, 
  onClose, 
  onMapCenter,
  tripId = null,
  tripStart = null,
  tripEnd = null,
  onPointChange = null,   // (point|null) => void  — current replay point
  onDataLoaded = null,    // (points[]) => void    — full sorted path
}) => {
  const [playbackData, setPlaybackData] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState('');
  const intervalRef = useRef(null);

  const loadTripHistory = async () => {
    if (!vehicle) return;

    setIsLoading(true);
    setEmptyMessage('');
    try {
      console.log('📡 Loading tracking data for vehicle:', vehicle.id,
        tripId ? `(trip: ${tripId})` : '(all)');

      const response = await trackingService.getByVehicle(vehicle.id);
      let data = response?.data || [];

      // Fallback to localStorage cache (unchanged behavior)
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

      // Filter to trip time window if provided
      const getTs = (p) => p.timestamp || p.createdAt || p.created_at || '';
      const stripTz = (v) => String(v || '').replace(/Z$/, '').replace(/[+-]\d{2}:?\d{2}$/, '');
      let windowProblem = '';

      if (tripStart && tripEnd && data.length > 0) {
        const startMs = new Date(stripTz(tripStart)).getTime();
        const endMs = new Date(stripTz(tripEnd)).getTime();

        if (isNaN(startMs) || isNaN(endMs)) {
          windowProblem = 'This trip has an invalid start or end time.';
        } else if (endMs <= startMs) {
          windowProblem = 'This trip\'s end time is before its start time, so its route cannot be matched.';
        } else {
          const before = data.length;
          data = data.filter(p => {
            const t = new Date(stripTz(getTs(p))).getTime();
            return !isNaN(t) && t >= startMs && t <= endMs;
          });
          console.log(`✂️ Filtered playback to trip window: ${before} → ${data.length} points`);
          if (data.length === 0) {
            windowProblem = 'No tracking points were recorded for this vehicle during this trip.';
          }
        }
        if (windowProblem) data = [];
      }

      // Fallback: generate sample points (existing behavior — only in Tracking's demo flow)
      if (data.length === 0 && !tripStart && vehicle.lat && vehicle.lng) {
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

      const sorted = [...data].sort((a, b) =>
        new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
      );

      if (sorted.length === 0) {
        setEmptyMessage(windowProblem || 'No tracking data available for this vehicle.');
      }
      setPlaybackData(sorted);
      if (onDataLoaded) onDataLoaded(sorted);
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
  }, [isOpen, vehicle?.id, tripId, tripStart, tripEnd]);

  useEffect(() => {
    if (onPointChange) onPointChange(playbackData[currentIndex] || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, playbackData]);

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

  const stats = useMemo(() => {
    if (playbackData.length < 2) {
      return { distance: 0, duration: '0s', avgSpeed: 0, maxSpeed: 0 };
    }

    let distance = 0;
    let maxSpeed = 0;

    for (let i = 1; i < playbackData.length; i++) {
      const lat1 = playbackData[i - 1].lat;
      const lon1 = playbackData[i - 1].lng;
      const lat2 = playbackData[i].lat;
      const lon2 = playbackData[i].lng;
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance += R * c;

      const speedVal = playbackData[i].speed || 0;
      if (speedVal > maxSpeed) maxSpeed = speedVal;
    }

    const start = new Date(playbackData[0].timestamp);
    const end = new Date(playbackData[playbackData.length - 1].timestamp);
    const diff = (end - start) / 1000;
    const mins = Math.floor(diff / 60);
    const secs = Math.floor(diff % 60);
    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const avgSpeed = diff > 0 ? (distance / (diff / 3600)) : 0;

    return {
      distance: distance.toFixed(1),
      duration,
      avgSpeed: avgSpeed.toFixed(1),
      maxSpeed: Math.round(maxSpeed)
    };
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

        {!isLoading && totalPoints === 0 && emptyMessage && (
          <div className="mb-3 p-2 md:p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs md:text-sm">
            {emptyMessage}
          </div>
        )}

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
            <span className="text-[10px] md:text-xs font-medium min-w-[24px] md:min-w-[32px] text-center">
              {speed}x
            </span>
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

export default RoutePlayback;