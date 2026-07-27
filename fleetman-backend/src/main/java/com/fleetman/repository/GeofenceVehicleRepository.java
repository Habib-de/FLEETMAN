package com.fleetman.repository;

import com.fleetman.entity.GeofenceVehicle;
import com.fleetman.entity.GeofenceVehicleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeofenceVehicleRepository extends JpaRepository<GeofenceVehicle, GeofenceVehicleId> {
    
    List<GeofenceVehicle> findByGeofenceId(String geofenceId);
    
    List<GeofenceVehicle> findByVehicleId(String vehicleId);
    
    void deleteByGeofenceId(String geofenceId);
    
    void deleteByVehicleId(String vehicleId);
}