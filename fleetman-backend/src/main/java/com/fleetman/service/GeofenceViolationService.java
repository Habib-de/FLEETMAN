package com.fleetman.service;

import com.fleetman.entity.GeofenceViolation;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.GeofenceViolationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GeofenceViolationService {
    
    private final GeofenceViolationRepository geofenceViolationRepository;
    
    @Transactional
    public GeofenceViolation createGeofenceViolation(GeofenceViolation violation) {
        return geofenceViolationRepository.save(violation);
    }
    
    public GeofenceViolation getGeofenceViolationById(String id) {
        return geofenceViolationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Geofence violation not found with id: " + id));
    }
    
    public List<GeofenceViolation> getGeofenceViolationsByTenant(String tenantId) {
        return geofenceViolationRepository.findByTenantId(tenantId);
    }
    
    public List<GeofenceViolation> getGeofenceViolationsByVehicle(String vehicleId) {
        return geofenceViolationRepository.findByVehicleId(vehicleId);
    }
    
    public List<GeofenceViolation> getGeofenceViolationsByGeofence(String geofenceId) {
        return geofenceViolationRepository.findByGeofenceId(geofenceId);
    }
    
    public List<GeofenceViolation> getUnresolvedGeofenceViolations() {
        return geofenceViolationRepository.findByResolvedFalse();
    }
    
    @Transactional
    public GeofenceViolation resolveGeofenceViolation(String id) {
        GeofenceViolation violation = getGeofenceViolationById(id);
        violation.setResolved(true);
        violation.setResolvedAt(LocalDateTime.now());
        return geofenceViolationRepository.save(violation);
    }
    
    @Transactional
    public void deleteGeofenceViolation(String id) {
        GeofenceViolation violation = getGeofenceViolationById(id);
        geofenceViolationRepository.delete(violation);
    }
}