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

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GeofenceService {
    
    private final GeofenceRepository geofenceRepository;
    private final GeofenceVehicleRepository geofenceVehicleRepository;
    private final VehicleService vehicleService;
    
    @Transactional
    public Geofence createGeofence(Geofence geofence) {
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
        geofence.setName(geofenceDetails.getName());
        geofence.setType(geofenceDetails.getType());
        geofence.setCenterLat(geofenceDetails.getCenterLat());
        geofence.setCenterLng(geofenceDetails.getCenterLng());
        geofence.setRadius(geofenceDetails.getRadius());
        geofence.setCoordinates(geofenceDetails.getCoordinates());
        geofence.setColor(geofenceDetails.getColor());
        geofence.setIsActive(geofenceDetails.getIsActive());
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