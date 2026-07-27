package com.fleetman.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleetman.dto.TrackingDataDTO;
import com.fleetman.entity.*;
import com.fleetman.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.PostConstruct;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class GpsSimulator {
    
    private final TrackingDataService trackingDataService;
    private final TripService tripService;
    private final GeofenceRepository geofenceRepository;
    private final GeofenceViolationService geofenceViolationService;
    private final IncidentService incidentService;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    
    private final Random random = new Random();
    private final Map<String, VehicleState> vehicleStates = new HashMap<>();
    private final Map<String, RouteProgress> routeProgressMap = new HashMap<>();
    private final Map<String, Boolean> tripEndTriggered = new HashMap<>();
    private final Map<String, Long> lastViolationTime = new HashMap<>();
    
    // ============================================
    // CONFIGURATION
    // ============================================
    private static final double BASE_SPEED_KPH = 50.0;
    private static final double MIN_SPEED_KPH = 15.0;
    private static final double MAX_SPEED_KPH = 80.0;
    private static final int UPDATE_INTERVAL_MS = 3000;
    private static final double ROUTE_TOLERANCE_METERS = 150.0;
    private static final long VIOLATION_COOLDOWN_MS = 30000;
    private static final long MAX_TRIP_DURATION_SECONDS = 7200;
    private static final long IDLE_WARNING_SECONDS = 1800;
    
    // ============================================
    // NAIROBI LANDMARKS FOR REAL LOCATION NAMES
    // ============================================
    private static final Map<String, double[]> NAIROBI_LANDMARKS = new LinkedHashMap<>();
    
    static {
        NAIROBI_LANDMARKS.put("CBD", new double[]{-1.2921, 36.8219});
        NAIROBI_LANDMARKS.put("Westlands", new double[]{-1.2633, 36.8037});
        NAIROBI_LANDMARKS.put("Kilimani", new double[]{-1.2930, 36.7890});
        NAIROBI_LANDMARKS.put("Lavington", new double[]{-1.3080, 36.7870});
        NAIROBI_LANDMARKS.put("Karen", new double[]{-1.3235, 36.7165});
        NAIROBI_LANDMARKS.put("Kasarani", new double[]{-1.2200, 36.8900});
        NAIROBI_LANDMARKS.put("Mombasa Road", new double[]{-1.3500, 36.9200});
        NAIROBI_LANDMARKS.put("Thika Road", new double[]{-1.2000, 36.8500});
        NAIROBI_LANDMARKS.put("Ngong Road", new double[]{-1.2900, 36.7900});
        NAIROBI_LANDMARKS.put("Upper Hill", new double[]{-1.2980, 36.8120});
        NAIROBI_LANDMARKS.put("Industrial Area", new double[]{-1.3100, 36.8700});
        NAIROBI_LANDMARKS.put("Eastleigh", new double[]{-1.2700, 36.8400});
        NAIROBI_LANDMARKS.put("South C", new double[]{-1.3200, 36.8300});
        NAIROBI_LANDMARKS.put("Runda", new double[]{-1.2400, 36.7900});
        NAIROBI_LANDMARKS.put("Gigiri", new double[]{-1.2300, 36.8000});
        NAIROBI_LANDMARKS.put("Parklands", new double[]{-1.2600, 36.8100});
        NAIROBI_LANDMARKS.put("Lang'ata", new double[]{-1.3300, 36.7500});
        NAIROBI_LANDMARKS.put("JKIA", new double[]{-1.3192, 36.9278});
    }
    
    // ============================================
    // DRIVER BEHAVIOR PROFILES
    // ============================================
    private static final class DriverProfile {
        double speedFactor;
        double brakingFrequency;
        double speedingFrequency;
        double deviationFrequency;
        double smoothness;
        
        DriverProfile(double speedFactor, double brakingFrequency, 
                      double speedingFrequency, double deviationFrequency, 
                      double smoothness) {
            this.speedFactor = speedFactor;
            this.brakingFrequency = brakingFrequency;
            this.speedingFrequency = speedingFrequency;
            this.deviationFrequency = deviationFrequency;
            this.smoothness = smoothness;
        }
    }
    
    // ============================================
    // VEHICLE STATE
    // ============================================
    private static class VehicleState {
        BigDecimal lat;
        BigDecimal lng;
        BigDecimal speed;
        int heading;
        BigDecimal fuelLevel;
        BigDecimal engineTemp;
        boolean ignition;
        DriverProfile profile;
        boolean isSpeeding;
        double lastSpeedChange; // For smooth acceleration tracking
        
        VehicleState(BigDecimal lat, BigDecimal lng, double driverScore) {
            this.lat = lat;
            this.lng = lng;
            this.speed = BigDecimal.valueOf(50);
            this.heading = 0;
            this.fuelLevel = BigDecimal.valueOf(75);
            this.engineTemp = BigDecimal.valueOf(85);
            this.ignition = true;
            this.isSpeeding = false;
            this.lastSpeedChange = 0;
            
            double scoreFactor = Math.min(1.0, Math.max(0.3, driverScore / 100.0));
            
            this.profile = new DriverProfile(
                0.8 + (1.0 - scoreFactor) * 0.5,
                0.001 + (1.0 - scoreFactor) * 0.009,
                0.001 + (1.0 - scoreFactor) * 0.019,
                0.0003 + (1.0 - scoreFactor) * 0.0017,
                0.4 + scoreFactor * 0.6
            );
        }
    }
    
    // ============================================
    // ROUTE PROGRESS
    // ============================================
    private static class RouteProgress {
        String geofenceId;
        List<RoutePoint> points;
        int currentIndex;
        double progressToNext;
        String startLocation;
        String endLocation;
        boolean completed;
        long startTime;
        double totalDistanceMeters;
        double distanceTraveledMeters;
        double totalFuelUsedOnRoute;
        int completedSegments;
        int totalSegments;
        double progressBySegment;
        double maxSpeed; // Track max speed for analytics
        int hardBrakeCount;
        int rapidAccelerationCount;
        
        RouteProgress(String geofenceId, String geofenceName, List<RoutePoint> points) {
            this.geofenceId = geofenceId;
            this.points = points;
            this.currentIndex = 0;
            this.progressToNext = 0.0;
            this.startLocation = points.isEmpty() ? "Start" : points.get(0).name;
            this.endLocation = points.isEmpty() ? "End" : points.get(points.size() - 1).name;
            this.completed = false;
            this.startTime = System.currentTimeMillis();
            this.totalDistanceMeters = calculateTotalRouteDistance(points);
            this.distanceTraveledMeters = 0;
            this.totalFuelUsedOnRoute = 0;
            this.completedSegments = 0;
            this.totalSegments = Math.max(1, points.size() - 1);
            this.progressBySegment = 0.0;
            this.maxSpeed = 0;
            this.hardBrakeCount = 0;
            this.rapidAccelerationCount = 0;
            
            log.info("🔍 ROUTE CREATED: {} points, {} segments, total distance: {:.2f}km",
                points.size(), totalSegments, totalDistanceMeters / 1000);
        }
        
        private double calculateTotalRouteDistance(List<RoutePoint> routePoints) {
            if (routePoints == null || routePoints.size() < 2) return 0;
            double total = 0;
            for (int i = 0; i < routePoints.size() - 1; i++) {
                RoutePoint p1 = routePoints.get(i);
                RoutePoint p2 = routePoints.get(i + 1);
                total += haversineDistance(
                    p1.lat.doubleValue(), p1.lng.doubleValue(),
                    p2.lat.doubleValue(), p2.lng.doubleValue()
                );
            }
            return total;
        }
        
        RoutePoint getCurrentPoint() {
            if (points == null || points.isEmpty() || currentIndex >= points.size()) return null;
            return points.get(currentIndex);
        }
        
        RoutePoint getNextPoint() {
            if (points == null || points.isEmpty() || currentIndex >= points.size() - 1) return null;
            return points.get(currentIndex + 1);
        }
        
        boolean hasNext() {
            return points != null && !points.isEmpty() && currentIndex < points.size() - 1;
        }
        
        void advance() {
            if (hasNext()) {
                currentIndex++;
                progressToNext = 0.0;
                completedSegments++;
                progressBySegment = (double) completedSegments / totalSegments;
                log.info("📍 Vehicle advanced to point {} of {} (segment {}/{}, progress: {}%)",
                    currentIndex + 1, points.size(), completedSegments, totalSegments,
                    Math.round(progressBySegment * 100));
            } else {
                completed = true;
                progressBySegment = 1.0;
                log.info("🏁 Vehicle reached final point - marking as complete");
            }
        }
        
        boolean isComplete() {
            if (completed) return true;
            
            int totalPoints = points.size();
            int lastIndex = totalPoints - 1;
            
            if (currentIndex >= lastIndex && progressToNext >= 1.0) {
                completed = true;
                progressBySegment = 1.0;
                log.info("✅ Trip complete at final point");
                return true;
            }
            
            return false;
        }
        
        int getProgressPercent() {
            if (points == null || points.size() <= 1) return 0;
            
            double segmentProgress = (double) completedSegments / totalSegments;
            double currentSegmentFraction = progressToNext / totalSegments;
            
            int percent = (int) Math.min(100, Math.round((segmentProgress + currentSegmentFraction) * 100));
            
            if (percent >= 100 && !completed) {
                percent = 99;
            }
            
            return Math.min(100, Math.max(0, percent));
        }
        
        long getElapsedSeconds() {
            return (System.currentTimeMillis() - startTime) / 1000;
        }
        
        String formatETA(double seconds) {
            if (seconds < 60) return Math.round(seconds) + "s";
            if (seconds < 3600) return Math.round(seconds / 60) + "m";
            return String.format("%dh %dm", (int)(seconds / 3600), (int)((seconds % 3600) / 60));
        }
    }
    
    // ============================================
    // ROUTE POINT
    // ============================================
    private static class RoutePoint {
        BigDecimal lat;
        BigDecimal lng;
        String name;
        
        RoutePoint(BigDecimal lat, BigDecimal lng, String name) {
            this.lat = lat;
            this.lng = lng;
            this.name = name != null ? name : "Point";
        }
    }
    
    // ============================================
    // STATIC METHODS
    // ============================================
    private static double haversineDistance(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                   Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                   Math.sin(dLon/2) * Math.sin(dLon/2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    @PostConstruct
    public void init() {
        log.info("🚗 GPS Simulator v4.0 initialized - REALISTIC SPEED PATTERNS");
        log.info("📍 Progress based on segments, not distance");
        log.info("📍 Realistic speed with traffic patterns");
        log.info("📍 Nairobi landmarks loaded: {} locations", NAIROBI_LANDMARKS.size());
    }
    
    // ============================================
    // MAIN SIMULATION LOOP
    // ============================================
    @Scheduled(fixedDelay = UPDATE_INTERVAL_MS)
    @Transactional
    public void simulateGpsData() {
        try {
            List<Trip> activeTrips = tripService.getActiveTrips();
            
            if (activeTrips.isEmpty()) {
                if (!vehicleStates.isEmpty()) {
                    vehicleStates.clear();
                    routeProgressMap.clear();
                    tripEndTriggered.clear();
                    lastViolationTime.clear();
                }
                return;
            }
            
            for (Trip trip : activeTrips) {
                Vehicle vehicle = trip.getVehicle();
                Tenant tenant = trip.getTenant();
                
                if (vehicle == null || tenant == null) {
                    log.warn("⚠️ Trip has null vehicle or tenant, skipping");
                    continue;
                }
                
                double driverScore = 70;
                if (vehicle.getDriver() != null && vehicle.getDriver().getSafetyScore() != null) {
                    driverScore = vehicle.getDriver().getSafetyScore();
                }
                
                Geofence routeGeofence = findRouteForVehicle(vehicle.getId(), tenant.getId());
                
                if (routeGeofence != null) {
                    followRoute(vehicle, tenant, trip, routeGeofence, driverScore);
                } else {
                    log.warn("⚠️ No route geofence found for vehicle: {}", vehicle.getRegistration());
                    generateRandomGpsData(vehicle, tenant, driverScore);
                }
            }
            
        } catch (Exception e) {
            log.error("❌ Error in GPS simulation: {}", e.getMessage(), e);
        }
    }
    
    // ============================================
    // FIND ROUTE
    // ============================================
    private Geofence findRouteForVehicle(String vehicleId, String tenantId) {
        try {
            log.info("🔍 Finding route for vehicle ID: {}", vehicleId);
            
            Optional<Trip> activeTrip = tripService.findActiveTripWithGeofence(vehicleId);
            if (activeTrip.isPresent()) {
                Trip trip = activeTrip.get();
                Geofence tripGeofence = trip.getGeofence();
                if (tripGeofence != null && tripGeofence.getIsActive()) {
                    log.info("✅ Vehicle {} using TRIP-ASSIGNED route: {} (Trip: {})", 
                        vehicleId, tripGeofence.getName(), trip.getId());
                    return tripGeofence;
                } else if (tripGeofence != null) {
                    log.warn("⚠️ Trip has geofence but it's inactive: {}", tripGeofence.getName());
                } else {
                    log.warn("⚠️ Active trip found but no geofence assigned to trip: {}", trip.getId());
                }
            }
            
            List<Geofence> assignedRoutes = geofenceRepository.findAssignedRoutesForVehicle(vehicleId);
            if (assignedRoutes != null && !assignedRoutes.isEmpty()) {
                Geofence assignedRoute = assignedRoutes.get(0);
                log.info("✅ Vehicle {} has ASSIGNED route: {} (from geofence_vehicles table)", 
                    vehicleId, assignedRoute.getName());
                return assignedRoute;
            }
            
            log.warn("⚠️ No route found for vehicle {}. Will use random GPS.", vehicleId);
            return null;
            
        } catch (Exception e) {
            log.error("❌ Error finding route for vehicle {}: {}", vehicleId, e.getMessage(), e);
            return null;
        }
    }
    
    // ============================================
    // FOLLOW ROUTE - WITH REALISTIC SPEED
    // ============================================
    private void followRoute(Vehicle vehicle, Tenant tenant, Trip trip, 
                        Geofence routeGeofence, double driverScore) {
        String vehicleId = vehicle.getId();
        
        if (routeGeofence == null) {
            log.warn("⚠️ No route for vehicle {}, using random GPS", vehicle.getRegistration());
            generateRandomGpsData(vehicle, tenant, driverScore);
            return;
        }
        
        List<RoutePoint> routePoints = parseRoutePoints(routeGeofence);
        
        if (routePoints == null || routePoints.isEmpty()) {
            log.warn("⚠️ No valid points in route: {}", routeGeofence.getName());
            generateRandomGpsData(vehicle, tenant, driverScore);
            return;
        }
        
        RouteProgress progress = routeProgressMap.get(vehicleId);
        
        if (progress == null) {
            progress = new RouteProgress(
                routeGeofence.getId(),
                routeGeofence.getName(),
                routePoints
            );
            routeProgressMap.put(vehicleId, progress);
            
            VehicleState state = new VehicleState(
                routePoints.get(0).lat,
                routePoints.get(0).lng,
                driverScore
            );
            vehicleStates.put(vehicleId, state);
            
            log.info("🚗 Vehicle {} started route: {} → {} ({} points, {:.2f}km)",
                vehicle.getRegistration(),
                progress.startLocation,
                progress.endLocation,
                routePoints.size(),
                progress.totalDistanceMeters / 1000);
        }
        
        if (progress.isComplete()) {
            log.info("✅ Trip complete for vehicle {}, completing...", vehicle.getRegistration());
            completeTrip(vehicle, trip, progress, "Reached destination");
            return;
        }
        
        RoutePoint current = progress.getCurrentPoint();
        RoutePoint next = progress.getNextPoint();
        
        if (current == null || next == null) {
            log.warn("⚠️ No current or next point for vehicle {}", vehicleId);
            if (progress.currentIndex >= progress.points.size() - 1) {
                log.info("✅ Vehicle at last point, completing trip...");
                completeTrip(vehicle, trip, progress, "At final point");
            }
            return;
        }
        
        VehicleState state = vehicleStates.get(vehicleId);
        if (state == null) {
            state = new VehicleState(current.lat, current.lng, driverScore);
            vehicleStates.put(vehicleId, state);
        }
        
        // ✅ REPLACED: Calculate realistic speed
        double speedKph = calculateRealisticSpeed(state, progress);
        state.speed = BigDecimal.valueOf(speedKph);
        
        // Track max speed
        if (speedKph > progress.maxSpeed) {
            progress.maxSpeed = speedKph;
        }
        
        // Move vehicle
        double distancePerUpdate = (speedKph * 1000 / 3600) * (UPDATE_INTERVAL_MS / 1000.0);
        double totalSegmentDistance = haversineDistance(
            current.lat.doubleValue(), current.lng.doubleValue(),
            next.lat.doubleValue(), next.lng.doubleValue()
        );
        
        if (totalSegmentDistance == 0) {
            log.warn("⚠️ Zero distance between points, advancing...");
            progress.advance();
            return;
        }
        
        double progressIncrement = distancePerUpdate / totalSegmentDistance;
        progress.progressToNext += progressIncrement;
        
        double fraction = Math.min(progress.progressToNext, 1.0);
        double lat = current.lat.doubleValue() + (next.lat.doubleValue() - current.lat.doubleValue()) * fraction;
        double lng = current.lng.doubleValue() + (next.lng.doubleValue() - current.lng.doubleValue()) * fraction;
        
        double distanceThisUpdate = fraction * totalSegmentDistance;
        progress.distanceTraveledMeters += distanceThisUpdate;
        
        // ✅ Realistic fuel consumption
        double fuelConsumed = calculateRealisticFuel(speedKph, distanceThisUpdate);
        progress.totalFuelUsedOnRoute += fuelConsumed;
        
        BigDecimal newFuelLevel = state.fuelLevel.subtract(BigDecimal.valueOf(fuelConsumed));
        state.fuelLevel = newFuelLevel.max(BigDecimal.valueOf(5));
        
        // Update position
        state.lat = BigDecimal.valueOf(lat).setScale(8, RoundingMode.HALF_UP);
        state.lng = BigDecimal.valueOf(lng).setScale(8, RoundingMode.HALF_UP);
        state.heading = calculateHeading(current, next) + (random.nextInt(6) - 3);
        if (state.heading < 0) state.heading += 360;
        if (state.heading >= 360) state.heading -= 360;
        
        if (progress.progressToNext >= 1.0) {
            log.info("📍 Vehicle completed segment to '{}' (progress: {}%)",
                next.name, progress.getProgressPercent());
            progress.advance();
        }
        
        detectEvents(vehicle, tenant, state, progress, routeGeofence, routePoints);
        
        // ✅ Save and send updates with location name
        saveTrackingData(vehicle, tenant, state);
        sendTrackingUpdateWithLocation(vehicle, state, progress);
        
        int currentProgress = progress.getProgressPercent();
        if (currentProgress > 0 && currentProgress % 20 == 0) {
            log.info("🚗 Vehicle {}: {}% complete (segment {}/{}, elapsed: {}s)",
                vehicle.getRegistration(), currentProgress,
                progress.completedSegments, progress.totalSegments,
                progress.getElapsedSeconds());
        }
    }
    
    // ============================================
    // REALISTIC SPEED CALCULATION (NEW)
    // ============================================
    private double calculateRealisticSpeed(VehicleState state, RouteProgress progress) {
        double currentSpeed = state.speed.doubleValue();
        
        // 1. Get base speed based on location
        double baseSpeed = getBaseSpeed(state.lat, state.lng);
        
        // 2. Apply traffic factor based on time of day
        double trafficFactor = getTrafficFactor();
        
        // 3. Apply driver behavior
        double driverFactor = state.profile.speedFactor;
        
        // 4. Calculate target speed
        double targetSpeed = baseSpeed * trafficFactor * driverFactor;
        
        // 5. Add random variation for realism (±8%)
        targetSpeed *= (0.92 + random.nextDouble() * 0.16);
        
        // 6. Smooth acceleration/deceleration (realistic!)
        double maxAcceleration = 2.5; // km/h per second
        double speedChange = Math.max(-maxAcceleration, 
            Math.min(maxAcceleration, targetSpeed - currentSpeed));
        double newSpeed = currentSpeed + speedChange * (UPDATE_INTERVAL_MS / 1000.0);
        
        // 7. Detect hard braking or rapid acceleration
        if (speedChange < -1.5) {
            progress.hardBrakeCount++;
        }
        if (speedChange > 1.5) {
            progress.rapidAccelerationCount++;
        }
        
        // 8. Apply speed bumps / obstacles
        newSpeed = applyObstacles(newSpeed, state);
        
        // 9. Add slight realistic variation
        newSpeed += (random.nextDouble() - 0.5) * 0.5;
        
        // 10. Clamp to realistic ranges
        return Math.max(0, Math.min(120, newSpeed));
    }
    
    // ============================================
    // GET BASE SPEED BASED ON LOCATION
    // ============================================
    private double getBaseSpeed(BigDecimal lat, BigDecimal lng) {
        double latVal = lat.doubleValue();
        double lngVal = lng.doubleValue();
        
        // Check if on highway (Mombasa Road, Thika Road)
        if (isHighway(latVal, lngVal)) {
            return 80 + random.nextDouble() * 20; // 80-100 km/h
        }
        // Check if in city center (CBD, Westlands)
        else if (isCityCenter(latVal, lngVal)) {
            return 15 + random.nextDouble() * 20; // 15-35 km/h
        }
        // Suburbs
        else {
            return 40 + random.nextDouble() * 30; // 40-70 km/h
        }
    }
    
    // ============================================
    // HIGHWAY DETECTION
    // ============================================
    private boolean isHighway(double lat, double lng) {
        // Mombasa Road area
        if (lat >= -1.35 && lat <= -1.28 && lng >= 36.85 && lng <= 36.95) {
            return true;
        }
        // Thika Road area
        if (lat >= -1.25 && lat <= -1.15 && lng >= 36.78 && lng <= 36.88) {
            return true;
        }
        return false;
    }
    
    // ============================================
    // CITY CENTER DETECTION
    // ============================================
    private boolean isCityCenter(double lat, double lng) {
        // Nairobi CBD area
        if (lat >= -1.30 && lat <= -1.27 && lng >= 36.80 && lng <= 36.84) {
            return true;
        }
        // Westlands area
        if (lat >= -1.27 && lat <= -1.25 && lng >= 36.78 && lng <= 36.82) {
            return true;
        }
        return false;
    }
    
    // ============================================
    // TRAFFIC FACTOR BASED ON TIME OF DAY
    // ============================================
    private double getTrafficFactor() {
        LocalTime now = LocalTime.now();
        
        // Morning rush: 7:00 AM - 9:00 AM
        if (now.isAfter(LocalTime.of(7, 0)) && now.isBefore(LocalTime.of(9, 0))) {
            return 0.3 + random.nextDouble() * 0.2; // 30-50% speed (heavy traffic)
        }
        // Morning peak: 8:00 AM - 8:30 AM (WORST)
        if (now.isAfter(LocalTime.of(8, 0)) && now.isBefore(LocalTime.of(8, 30))) {
            return 0.2 + random.nextDouble() * 0.15; // 20-35% speed (gridlock!)
        }
        // Evening rush: 5:00 PM - 7:00 PM
        if (now.isAfter(LocalTime.of(17, 0)) && now.isBefore(LocalTime.of(19, 0))) {
            return 0.4 + random.nextDouble() * 0.2; // 40-60% speed
        }
        // Evening peak: 6:00 PM - 6:30 PM (WORST)
        if (now.isAfter(LocalTime.of(18, 0)) && now.isBefore(LocalTime.of(18, 30))) {
            return 0.25 + random.nextDouble() * 0.15; // 25-40% speed
        }
        // Night: 10:00 PM - 5:00 AM
        if (now.isAfter(LocalTime.of(22, 0)) || now.isBefore(LocalTime.of(5, 0))) {
            return 0.9 + random.nextDouble() * 0.2; // 90-110% speed (light traffic)
        }
        // Normal traffic
        return 0.7 + random.nextDouble() * 0.3; // 70-100% speed
    }
    
    // ============================================
    // OBSTACLE SIMULATION (Speed bumps, traffic lights)
    // ============================================
    private double applyObstacles(double speed, VehicleState state) {
        // Random speed bump (0.05% chance per update)
        if (random.nextDouble() < 0.0005) {
            log.info("🚧 Vehicle hit a speed bump! Slowing down.");
            return speed * 0.3; // Slow down to 30%
        }
        // Random traffic light stop (0.03% chance)
        if (random.nextDouble() < 0.0003) {
            log.info("🚦 Vehicle stopped at traffic light.");
            return 0; // Complete stop
        }
        return speed;
    }
    
    // ============================================
    // REALISTIC FUEL CONSUMPTION
    // ============================================
    private double calculateRealisticFuel(double speedKph, double distanceMeters) {
        double distanceKm = distanceMeters / 1000.0;
        
        double lPer100km;
        if (speedKph < 10) {
            lPer100km = 12 + random.nextDouble() * 3; // Idling/traffic
        } else if (speedKph < 50) {
            lPer100km = 8 + random.nextDouble() * 2; // City driving
        } else if (speedKph < 80) {
            lPer100km = 6 + random.nextDouble() * 1.5; // Highway optimal
        } else {
            lPer100km = 8 + random.nextDouble() * 2; // High speed
        }
        
        // Add slight randomness for realism
        double variation = 0.95 + random.nextDouble() * 0.1;
        lPer100km *= variation;
        
        return (lPer100km * distanceKm) / 100.0;
    }
    
    // ============================================
    // GET REAL LOCATION NAME FROM COORDINATES
    // ============================================
    private String getRealLocationName(double lat, double lng) {
        double minDist = Double.MAX_VALUE;
        String nearest = "Nairobi Area";
        
        for (Map.Entry<String, double[]> entry : NAIROBI_LANDMARKS.entrySet()) {
            double[] coords = entry.getValue();
            double dist = haversineDistance(lat, lng, coords[0], coords[1]);
            if (dist < minDist) {
                minDist = dist;
                nearest = entry.getKey();
            }
        }
        
        // If within 500m of a landmark, show the landmark name
        if (minDist < 500) {
            return nearest;
        }
        return nearest + " area";
    }
    
    // ============================================
    // SEND TRACKING UPDATE WITH LOCATION NAME
    // ============================================
    private void sendTrackingUpdateWithLocation(Vehicle vehicle, VehicleState state, RouteProgress progress) {
        try {
            double remainingDistance = progress.totalDistanceMeters - progress.distanceTraveledMeters;
            double currentSpeedKph = state.speed.doubleValue();
            double etaSeconds = currentSpeedKph > 0 ? remainingDistance / (currentSpeedKph * 1000 / 3600) : 0;
            
            // ✅ Get real location name
            String locationName = getRealLocationName(state.lat.doubleValue(), state.lng.doubleValue());
            
            Map<String, Object> update = new HashMap<>();
            update.put("vehicleId", vehicle.getId());
            update.put("vehicleRegistration", vehicle.getRegistration());
            update.put("lat", state.lat);
            update.put("lng", state.lng);
            update.put("speed", state.speed);
            update.put("heading", state.heading);
            update.put("fuelLevel", state.fuelLevel);
            update.put("engineTemp", state.engineTemp);
            update.put("ignition", state.ignition);
            update.put("timestamp", LocalDateTime.now());
            update.put("progress", progress.getProgressPercent() + "%");
            update.put("elapsed", progress.getElapsedSeconds() + "s");
            update.put("from", progress.startLocation);
            update.put("to", progress.endLocation);
            update.put("eta", etaSeconds > 0 ? progress.formatETA(etaSeconds) : "Arriving");
            update.put("remainingDistance", String.format("%.1f km", remainingDistance / 1000));
            update.put("fuelUsed", String.format("%.2f L", progress.totalFuelUsedOnRoute));
            update.put("distance", String.format("%.2f km", progress.distanceTraveledMeters / 1000));
            update.put("isSpeeding", state.isSpeeding);
            update.put("segment", String.format("%d/%d", progress.completedSegments, progress.totalSegments));
            // ✅ NEW: Location name
            update.put("locationName", locationName);
            
            messagingTemplate.convertAndSend("/topic/tracking", update);
            
        } catch (Exception e) {
            log.warn("⚠️ Error sending WebSocket update: {}", e.getMessage());
        }
    }
    
    // ============================================
    // CALCULATE SPEED (OLD - KEPT FOR COMPATIBILITY)
    // ============================================
    private double calculateSpeed(VehicleState state, RouteProgress progress) {
        // This is kept for backward compatibility
        // The new method calculateRealisticSpeed is now used
        DriverProfile profile = state.profile;
        
        double baseSpeed = BASE_SPEED_KPH * profile.speedFactor;
        double trafficFactor = 0.8 + random.nextDouble() * 0.4;
        double newSpeed = baseSpeed * trafficFactor;
        
        double currentSpeed = state.speed.doubleValue();
        double change = (newSpeed - currentSpeed) * 0.2;
        newSpeed = currentSpeed + change;
        
        newSpeed += (random.nextDouble() - 0.5) * 3;
        
        return Math.max(MIN_SPEED_KPH, Math.min(MAX_SPEED_KPH, newSpeed));
    }
    
    // ============================================
    // CALCULATE FUEL CONSUMPTION (OLD)
    // ============================================
    private double calculateFuelConsumption(double speedKph, double distanceMeters) {
        // This is kept for backward compatibility
        double distanceKm = distanceMeters / 1000.0;
        
        double baseLPer100km;
        if (speedKph < 30) {
            baseLPer100km = 10.0 + (30 - speedKph) / 30 * 5;
        } else if (speedKph < 60) {
            baseLPer100km = 8.0 + (60 - speedKph) / 30 * 2;
        } else if (speedKph < 90) {
            baseLPer100km = 7.5 + (speedKph - 60) / 30 * 2;
        } else {
            baseLPer100km = 9.5 + (speedKph - 90) / 30 * 3;
        }
        
        double variation = 0.9 + random.nextDouble() * 0.2;
        double lPer100km = baseLPer100km * variation;
        
        return (lPer100km * distanceKm) / 100.0;
    }
    
    // ============================================
    // DETECT EVENTS
    // ============================================
    private void detectEvents(Vehicle vehicle, Tenant tenant,
                             VehicleState state, RouteProgress progress,
                             Geofence routeGeofence, List<RoutePoint> routePoints) {
        
        DriverProfile profile = state.profile;
        
        // Speeding detection
        if (state.speed.doubleValue() > 75 && random.nextDouble() < profile.speedingFrequency) {
            createIncident(vehicle, tenant, "Speeding Violation", "High",
                state.lat, state.lng,
                String.format("Speeding detected: %.0f km/h", state.speed.doubleValue()));
            state.isSpeeding = true;
        }
        
        // Random deviation
        if (random.nextDouble() < profile.deviationFrequency) {
            double deviation = 50 + random.nextDouble() * 150;
            double angle = random.nextDouble() * 2 * Math.PI;
            double latDev = deviation / 111000 * Math.cos(angle);
            double lngDev = deviation / (111000 * Math.cos(Math.toRadians(state.lat.doubleValue()))) * Math.sin(angle);
            
            BigDecimal devLat = state.lat.add(BigDecimal.valueOf(latDev));
            BigDecimal devLng = state.lng.add(BigDecimal.valueOf(lngDev));
            
            createGeofenceViolation(vehicle, tenant, routeGeofence, devLat, devLng, routePoints);
        }
        
        // Check geofence violation
        if (state.speed.doubleValue() > 5) {
            checkGeofenceViolation(vehicle, tenant, routeGeofence,
                state.lat, state.lng, routePoints);
        }
    }
    
    // ============================================
    // CREATE INCIDENT
    // ============================================
    private void createIncident(Vehicle vehicle, Tenant tenant, String type,
                               String severity, BigDecimal lat, BigDecimal lng, String description) {
        try {
            Incident incident = new Incident();
            incident.setTenant(tenant);
            incident.setVehicle(vehicle);
            incident.setDriver(vehicle.getDriver());
            incident.setIncidentType(type);
            incident.setSeverity(severity);
            incident.setStatus("reported");
            incident.setLocation(lat + ", " + lng);
            incident.setDescription(description);
            incident.setReportedBy("GPS Simulator");
            incident.setCreatedAt(LocalDateTime.now());
            
            incidentService.createIncident(incident);
            
            Map<String, Object> alert = new HashMap<>();
            alert.put("id", incident.getId());
            alert.put("vehicleId", vehicle.getId());
            alert.put("vehicleRegistration", vehicle.getRegistration());
            alert.put("type", type);
            alert.put("severity", severity);
            alert.put("lat", lat);
            alert.put("lng", lng);
            alert.put("description", description);
            alert.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/alarms", alert);
            
        } catch (Exception e) {
            log.error("❌ Error creating incident: {}", e.getMessage());
        }
    }
    
    // ============================================
    // CHECK GEOFENCE VIOLATION
    // ============================================
    private void checkGeofenceViolation(Vehicle vehicle, Tenant tenant, Geofence geofence,
                                       BigDecimal lat, BigDecimal lng, List<RoutePoint> routePoints) {
        try {
            if (!"route".equals(geofence.getType())) {
                return;
            }
            
            VehicleState state = vehicleStates.get(vehicle.getId());
            if (state == null || state.speed.doubleValue() < 5) {
                return;
            }
            
            boolean isOnRoute = false;
            for (int i = 0; i < routePoints.size() - 1; i++) {
                RoutePoint p1 = routePoints.get(i);
                RoutePoint p2 = routePoints.get(i + 1);
                double distance = distanceToSegment(
                    lat.doubleValue(), lng.doubleValue(),
                    p1.lat.doubleValue(), p1.lng.doubleValue(),
                    p2.lat.doubleValue(), p2.lng.doubleValue()
                );
                if (distance <= ROUTE_TOLERANCE_METERS) {
                    isOnRoute = true;
                    break;
                }
            }
            
            if (!isOnRoute) {
                String key = vehicle.getId() + "_" + geofence.getId();
                long now = System.currentTimeMillis();
                Long lastTime = lastViolationTime.get(key);
                
                if (lastTime == null || (now - lastTime) > VIOLATION_COOLDOWN_MS) {
                    createGeofenceViolation(vehicle, tenant, geofence, lat, lng, routePoints);
                    lastViolationTime.put(key, now);
                }
            }
        } catch (Exception e) {
            log.warn("⚠️ Could not check geofence violation: {}", e.getMessage());
        }
    }
    
    // ============================================
    // CREATE GEOFENCE VIOLATION
    // ============================================
    private void createGeofenceViolation(Vehicle vehicle, Tenant tenant, Geofence geofence,
                                       BigDecimal lat, BigDecimal lng, List<RoutePoint> routePoints) {
        try {
            GeofenceViolation violation = new GeofenceViolation();
            violation.setTenant(tenant);
            violation.setGeofence(geofence);
            violation.setVehicle(vehicle);
            violation.setViolationType("route_deviation");
            violation.setLat(lat);
            violation.setLng(lng);
            violation.setTimestamp(LocalDateTime.now());
            violation.setResolved(false);
            
            geofenceViolationService.createGeofenceViolation(violation);
            
            double distance = distanceToRoute(lat.doubleValue(), lng.doubleValue(), routePoints);
            
            Map<String, Object> alarmData = new HashMap<>();
            alarmData.put("id", violation.getId());
            alarmData.put("vehicleId", vehicle.getId());
            alarmData.put("vehicleRegistration", vehicle.getRegistration());
            alarmData.put("geofenceId", geofence.getId());
            alarmData.put("geofenceName", geofence.getName());
            alarmData.put("lat", lat);
            alarmData.put("lng", lng);
            alarmData.put("violationType", "route_deviation");
            alarmData.put("severity", "high");
            alarmData.put("timestamp", LocalDateTime.now());
            alarmData.put("resolved", false);
            alarmData.put("distance", String.format("%.0f", distance));
            
            messagingTemplate.convertAndSend("/topic/alarms", alarmData);
            
        } catch (Exception e) {
            log.error("❌ Error creating geofence violation: {}", e.getMessage());
        }
    }
    
    // ============================================
    // DISTANCE CALCULATIONS
    // ============================================
    private double distanceToRoute(double lat, double lng, List<RoutePoint> routePoints) {
        if (routePoints == null || routePoints.size() < 2) return 0;
        
        double minDistance = Double.MAX_VALUE;
        for (int i = 0; i < routePoints.size() - 1; i++) {
            RoutePoint p1 = routePoints.get(i);
            RoutePoint p2 = routePoints.get(i + 1);
            double d = distanceToSegment(
                lat, lng,
                p1.lat.doubleValue(), p1.lng.doubleValue(),
                p2.lat.doubleValue(), p2.lng.doubleValue()
            );
            if (d < minDistance) minDistance = d;
        }
        return minDistance;
    }
    
    private double distanceToSegment(double px, double py, double x1, double y1, double x2, double y2) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        
        if (dx == 0 && dy == 0) {
            return haversineDistance(px, py, x1, y1);
        }
        
        double t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
        
        double nearestX = x1 + t * dx;
        double nearestY = y1 + t * dy;
        
        return haversineDistance(px, py, nearestX, nearestY);
    }
    
    // ============================================
    // COMPLETE TRIP
    // ============================================
    private void completeTrip(Vehicle vehicle, Trip trip, RouteProgress progress, String reason) {
        String vehicleId = vehicle.getId();
        
        if (tripEndTriggered.getOrDefault(vehicleId, false)) {
            log.info("🔍 Trip already ended for vehicle {}, skipping", vehicleId);
            return;
        }
        
        tripEndTriggered.put(vehicleId, true);
        
        long elapsed = progress.getElapsedSeconds();
        log.info("🏁 Vehicle {} completing trip: {}", vehicle.getRegistration(), reason);
        log.info("📍 Distance: {:.2f}km, Fuel: {:.2f}L",
            progress.totalDistanceMeters / 1000, progress.totalFuelUsedOnRoute);
        log.info("📊 Max Speed: {:.1f} km/h, Hard Brakes: {}, Rapid Accelerations: {}",
            progress.maxSpeed, progress.hardBrakeCount, progress.rapidAccelerationCount);
        
        try {
            double totalDistance = progress.totalDistanceMeters / 1000.0;
            
            trip.setStatus("Completed");
            trip.setEndTime(LocalDateTime.now());
            trip.setEndLocation(progress.endLocation);
            trip.setDistance(BigDecimal.valueOf(totalDistance));
            trip.setFuelUsed(BigDecimal.valueOf(progress.totalFuelUsedOnRoute));
            
            if (trip.getStartOdometer() != null) {
                trip.setEndOdometer(trip.getStartOdometer().add(
                    BigDecimal.valueOf(progress.totalDistanceMeters / 1000.0)));
            }
            
            tripService.updateTrip(trip.getId(), trip);
            
            Map<String, Object> tripComplete = new HashMap<>();
            tripComplete.put("id", trip.getId());
            tripComplete.put("vehicleId", vehicleId);
            tripComplete.put("vehicleRegistration", vehicle.getRegistration());
            tripComplete.put("status", "Completed");
            tripComplete.put("endLocation", progress.endLocation);
            tripComplete.put("distance", totalDistance);
            tripComplete.put("duration", elapsed + "s");
            tripComplete.put("fuelUsed", String.format("%.2f L", progress.totalFuelUsedOnRoute));
            tripComplete.put("message", String.format("Trip completed! %s", reason));
            tripComplete.put("progress", "100%");
            tripComplete.put("maxSpeed", String.format("%.1f km/h", progress.maxSpeed));
            
            messagingTemplate.convertAndSend("/topic/trips", tripComplete);
            
            // Clean up
            vehicleStates.remove(vehicleId);
            routeProgressMap.remove(vehicleId);
            tripEndTriggered.remove(vehicleId);
            lastViolationTime.remove(vehicleId + "_" + progress.geofenceId);
            
            log.info("✅ Trip for vehicle {} completed!", vehicle.getRegistration());
            
        } catch (Exception e) {
            log.error("❌ Error completing trip: {}", e.getMessage());
        }
    }
    
    // ============================================
// SAVE TRACKING DATA - FIXED TO USE DTO
// ============================================
private void saveTrackingData(Vehicle vehicle, Tenant tenant, VehicleState state) {
    try {
        // ✅ Build DTO instead of entity
        TrackingDataDTO dto = new TrackingDataDTO();
        dto.setTenantId(tenant.getId());
        dto.setVehicleId(vehicle.getId());
        dto.setDriverId(vehicle.getDriver() != null ? vehicle.getDriver().getId() : null);
        dto.setLat(state.lat);
        dto.setLng(state.lng);
        dto.setSpeed(state.speed);
        dto.setHeading(state.heading);
        dto.setAltitude(BigDecimal.valueOf(1500 + random.nextInt(200)));
        dto.setFuelLevel(state.fuelLevel);
        dto.setEngineTemp(state.engineTemp);
        dto.setIgnition(state.ignition);
        dto.setTimestamp(LocalDateTime.now());
        
        // ✅ Pass DTO to service
        trackingDataService.saveTrackingData(dto);
        
    } catch (Exception e) {
        log.warn("⚠️ Error saving tracking data: {}", e.getMessage());
    }
    }
    
    // ============================================
    // GENERATE RANDOM GPS DATA (FALLBACK)
    // ============================================
    private void generateRandomGpsData(Vehicle vehicle, Tenant tenant, double driverScore) {
        try {
            VehicleState state = vehicleStates.get(vehicle.getId());
            
            if (state == null) {
                BigDecimal lat = BigDecimal.valueOf(-1.2921 + (random.nextDouble() - 0.5) * 0.02);
                BigDecimal lng = BigDecimal.valueOf(36.8219 + (random.nextDouble() - 0.5) * 0.02);
                state = new VehicleState(lat, lng, driverScore);
                vehicleStates.put(vehicle.getId(), state);
            }
            
            double latChange = (random.nextDouble() - 0.5) * 0.001;
            double lngChange = (random.nextDouble() - 0.5) * 0.001;
            
            state.lat = state.lat.add(BigDecimal.valueOf(latChange)).setScale(8, RoundingMode.HALF_UP);
            state.lng = state.lng.add(BigDecimal.valueOf(lngChange)).setScale(8, RoundingMode.HALF_UP);
            
            if (state.lat.doubleValue() < -1.35) state.lat = BigDecimal.valueOf(-1.35);
            if (state.lat.doubleValue() > -1.25) state.lat = BigDecimal.valueOf(-1.25);
            if (state.lng.doubleValue() < 36.78) state.lng = BigDecimal.valueOf(36.78);
            if (state.lng.doubleValue() > 36.88) state.lng = BigDecimal.valueOf(36.88);
            
            // Use realistic speed even in fallback
            double realisticSpeed = 20 + random.nextDouble() * 40;
            state.speed = BigDecimal.valueOf(realisticSpeed);
            state.heading = random.nextInt(360);
            
            saveTrackingData(vehicle, tenant, state);
            
        } catch (Exception e) {
            log.error("❌ Error generating random GPS: {}", e.getMessage());
        }
    }
    
    // ============================================
    // PARSE ROUTE POINTS
    // ============================================
    private List<RoutePoint> parseRoutePoints(Geofence geofence) {
        List<RoutePoint> points = new ArrayList<>();
        
        try {
            String coordinatesJson = geofence.getCoordinates();
            if (coordinatesJson == null || coordinatesJson.isEmpty()) {
                log.warn("⚠️ Geofence '{}' has null/empty coordinates", geofence.getName());
                return points;
            }
            
            List<Map<String, Object>> coordList = objectMapper.readValue(
                coordinatesJson,
                new TypeReference<List<Map<String, Object>>>() {}
            );
            
            log.info("📝 Parsing {} points from geofence '{}'", coordList.size(), geofence.getName());
            
            for (Map<String, Object> coord : coordList) {
                Object latObj = coord.get("lat");
                Object lngObj = coord.get("lng");
                String name = coord.get("name") != null ? coord.get("name").toString() : "Point";
                
                if (latObj == null || lngObj == null) {
                    continue;
                }
                
                BigDecimal lat = new BigDecimal(latObj.toString());
                BigDecimal lng = new BigDecimal(lngObj.toString());
                points.add(new RoutePoint(lat, lng, name));
            }
            
            log.info("✅ Parsed {} route points from geofence '{}'", points.size(), geofence.getName());
            
        } catch (Exception e) {
            log.error("❌ Error parsing route points: {}", e.getMessage());
            return parseRoutePointsFallback(geofence);
        }
        
        return points;
    }
    
    private List<RoutePoint> parseRoutePointsFallback(Geofence geofence) {
        List<RoutePoint> points = new ArrayList<>();
        
        try {
            String coordinatesJson = geofence.getCoordinates();
            if (coordinatesJson == null || coordinatesJson.isEmpty()) {
                return points;
            }
            
            String cleaned = coordinatesJson.replace("[", "").replace("]", "");
            String[] pointStrings = cleaned.split("\\},\\{");
            
            for (String pointStr : pointStrings) {
                String cleanStr = pointStr.replace("{", "").replace("}", "").trim();
                String[] parts = cleanStr.split(",");
                
                BigDecimal lat = null;
                BigDecimal lng = null;
                String name = null;
                
                for (String part : parts) {
                    String[] kv = part.split(":");
                    if (kv.length == 2) {
                        String key = kv[0].trim().replace("\"", "");
                        String value = kv[1].trim().replace("\"", "");
                        if ("lat".equals(key) || "latitude".equals(key)) {
                            lat = new BigDecimal(value);
                        } else if ("lng".equals(key) || "longitude".equals(key)) {
                            lng = new BigDecimal(value);
                        } else if ("name".equals(key)) {
                            name = value;
                        }
                    }
                }
                
                if (lat != null && lng != null) {
                    if (name == null) name = "Point";
                    points.add(new RoutePoint(lat, lng, name));
                }
            }
            
        } catch (Exception e) {
            log.error("❌ Fallback parsing also failed: {}", e.getMessage());
        }
        
        return points;
    }
    
    // ============================================
    // CALCULATE HEADING
    // ============================================
    private int calculateHeading(RoutePoint from, RoutePoint to) {
        double lat1 = Math.toRadians(from.lat.doubleValue());
        double lon1 = Math.toRadians(from.lng.doubleValue());
        double lat2 = Math.toRadians(to.lat.doubleValue());
        double lon2 = Math.toRadians(to.lng.doubleValue());
        
        double dLon = lon2 - lon1;
        double y = Math.sin(dLon) * Math.cos(lat2);
        double x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        
        double bearing = Math.toDegrees(Math.atan2(y, x));
        return (int) ((bearing + 360) % 360);
    }
}