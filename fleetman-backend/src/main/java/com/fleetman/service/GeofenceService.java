package com.fleetman.service;

import com.fleetman.entity.Geofence;
import com.fleetman.entity.GeofenceVehicle;
import com.fleetman.entity.GeofenceVehicleId;
import com.fleetman.entity.Vehicle;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.GeofenceRepository;
import com.fleetman.repository.GeofenceVehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GeofenceService {
    
    private final GeofenceRepository geofenceRepository;
    private final GeofenceVehicleRepository geofenceVehicleRepository;
    private final VehicleService vehicleService;

    private static final double EARTH_RADIUS_KM = 6371.0;
    private final ObjectMapper objectMapper = new ObjectMapper();
    

    // ============================================
// ✅ ADD THESE 3 METHODS HERE
// ============================================

// 1. Haversine formula - distance between two points
private double calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    double dLat = Math.toRadians(lat2 - lat1);
    double dLon = Math.toRadians(lon2 - lon1);
    
    double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
               Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
               Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

// 2. Calculate total route distance from coordinates JSON
private BigDecimal calculateRouteDistance(String coordinatesJson) {
    if (coordinatesJson == null || coordinatesJson.isEmpty()) {
        return BigDecimal.ZERO;
    }
    
    try {
        List<Map<String, Object>> points = objectMapper.readValue(
            coordinatesJson,
            new TypeReference<List<Map<String, Object>>>() {}
        );
        
        if (points == null || points.size() < 2) {
            return BigDecimal.ZERO;
        }
        
        double totalDistance = 0.0;
        
        for (int i = 0; i < points.size() - 1; i++) {
            Map<String, Object> p1 = points.get(i);
            Map<String, Object> p2 = points.get(i + 1);
            
            double lat1 = getDouble(p1, "lat", "latitude");
            double lng1 = getDouble(p1, "lng", "longitude", "lon");
            double lat2 = getDouble(p2, "lat", "latitude");
            double lng2 = getDouble(p2, "lng", "longitude", "lon");
            
            if (lat1 == 0 || lng1 == 0 || lat2 == 0 || lng2 == 0) {
                continue;
            }
            
            double segmentDistance = calculateDistance(lat1, lng1, lat2, lng2);
            totalDistance += segmentDistance;
        }
        
        return BigDecimal.valueOf(totalDistance)
            .setScale(2, RoundingMode.HALF_UP);
        
    } catch (Exception e) {
        System.err.println("❌ Failed to calculate route distance: " + e.getMessage());
        return BigDecimal.ZERO;
    }
}

// 3. Helper to extract value from map
private double getDouble(Map<String, Object> map, String... keys) {
    for (String key : keys) {
        Object value = map.get(key);
        if (value instanceof Number) {
            return ((Number) value).doubleValue();
        }
    }
    return 0.0;
}


    @Transactional
public Geofence createGeofence(Geofence geofence) {
    // ✅ If it's a route with coordinates, calculate distance
    if ("route".equals(geofence.getType()) && geofence.getCoordinates() != null) {
        BigDecimal distance = calculateRouteDistance(geofence.getCoordinates());
        geofence.setRouteDistance(distance);
        System.out.println("✅ Route distance auto-calculated: " + distance + " km for " + geofence.getName());
    }
    
    return geofenceRepository.save(geofence);
}
    
    public Geofence getGeofenceById(String id) {
        return geofenceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Geofence not found with id: " + id));
    }
    
    public List<Geofence> getGeofencesByTenant(String tenantId) {
        return geofenceRepository.findByTenantId(tenantId);
    }
    
    public List<Geofence> getActiveGeofencesByTenant(String tenantId) {
        return geofenceRepository.findByTenantIdAndIsActiveTrue(tenantId);
    }
    
    @Transactional
public Geofence updateGeofence(String id, Geofence geofenceDetails) {
    Geofence geofence = getGeofenceById(id);
    
    // Update fields
    if (geofenceDetails.getName() != null) {
        geofence.setName(geofenceDetails.getName());
    }
    if (geofenceDetails.getType() != null) {
        geofence.setType(geofenceDetails.getType());
    }
    if (geofenceDetails.getCenterLat() != null) {
        geofence.setCenterLat(geofenceDetails.getCenterLat());
    }
    if (geofenceDetails.getCenterLng() != null) {
        geofence.setCenterLng(geofenceDetails.getCenterLng());
    }
    if (geofenceDetails.getRadius() != null) {
        geofence.setRadius(geofenceDetails.getRadius());
    }
    if (geofenceDetails.getCoordinates() != null) {
        geofence.setCoordinates(geofenceDetails.getCoordinates());
    }
    if (geofenceDetails.getColor() != null) {
        geofence.setColor(geofenceDetails.getColor());
    }
    if (geofenceDetails.getIsActive() != null) {
        geofence.setIsActive(geofenceDetails.getIsActive());
    }
    
    // ✅ Recalculate route distance if it's a route with coordinates
    if ("route".equals(geofence.getType()) && geofence.getCoordinates() != null) {
        BigDecimal distance = calculateRouteDistance(geofence.getCoordinates());
        geofence.setRouteDistance(distance);
        System.out.println("✅ Route distance recalculated: " + distance + " km for " + geofence.getName());
    }
    
    return geofenceRepository.save(geofence);
}
    
    @Transactional
    public void deleteGeofence(String id) {
        Geofence geofence = getGeofenceById(id);
        // This will cascade delete from geofence_vehicles due to ON DELETE CASCADE
        geofenceRepository.delete(geofence);
    }
    
    // ============================================
    // VEHICLE ASSIGNMENT METHODS
    // ============================================
    
    @Transactional
    public void assignVehicleToGeofence(String geofenceId, String vehicleId) {
        Geofence geofence = getGeofenceById(geofenceId);
        Vehicle vehicle = vehicleService.getVehicleById(vehicleId);
        
        // Check if already assigned
        GeofenceVehicleId id = new GeofenceVehicleId(geofenceId, vehicleId);
        if (!geofenceVehicleRepository.existsById(id)) {
            GeofenceVehicle assignment = new GeofenceVehicle();
            assignment.setId(id);
            assignment.setGeofence(geofence);
            assignment.setVehicle(vehicle);
            geofenceVehicleRepository.save(assignment);
        }
    }
    
    @Transactional
    public void unassignVehicleFromGeofence(String geofenceId, String vehicleId) {
        GeofenceVehicleId id = new GeofenceVehicleId(geofenceId, vehicleId);
        geofenceVehicleRepository.deleteById(id);
    }
    
    @Transactional
    public void assignVehiclesToGeofence(String geofenceId, List<String> vehicleIds) {
        // First, remove all existing assignments
        geofenceVehicleRepository.deleteByGeofenceId(geofenceId);
        
        // Then add new assignments
        for (String vehicleId : vehicleIds) {
            assignVehicleToGeofence(geofenceId, vehicleId);
        }
    }
    
    public List<Vehicle> getAssignedVehiclesForGeofence(String geofenceId) {
        List<GeofenceVehicle> assignments = geofenceVehicleRepository.findByGeofenceId(geofenceId);
        return assignments.stream()
                .map(GeofenceVehicle::getVehicle)
                .collect(Collectors.toList());
    }
    
    public List<String> getAssignedVehicleIdsForGeofence(String geofenceId) {
        List<GeofenceVehicle> assignments = geofenceVehicleRepository.findByGeofenceId(geofenceId);
        return assignments.stream()
                .map(gv -> gv.getVehicle().getId())
                .collect(Collectors.toList());
    }
    
    public int getVehicleCountForGeofence(String geofenceId) {
        return geofenceVehicleRepository.findByGeofenceId(geofenceId).size();
    }
}