package com.fleetman.repository;

import com.fleetman.entity.GeofenceViolation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeofenceViolationRepository extends JpaRepository<GeofenceViolation, String> {
    
    List<GeofenceViolation> findByTenantId(String tenantId);
    
    List<GeofenceViolation> findByVehicleId(String vehicleId);
    
    List<GeofenceViolation> findByGeofenceId(String geofenceId);
    
    List<GeofenceViolation> findByResolvedFalse();
}