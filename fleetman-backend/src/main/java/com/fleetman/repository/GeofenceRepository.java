package com.fleetman.repository;

import com.fleetman.entity.Geofence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeofenceRepository extends JpaRepository<Geofence, String> {
    
    // ============================================
    // BASIC QUERIES
    // ============================================
    
    List<Geofence> findByTenantId(String tenantId);
    
    List<Geofence> findByTenantIdAndIsActiveTrue(String tenantId);
    
    List<Geofence> findByTenantIdAndType(String tenantId, String type);

    // ============================================
    // VEHICLE ASSIGNMENT QUERIES
    // ============================================
    
    // Get assigned route IDs for a vehicle (native query - returns just IDs)
    @Query(value = "SELECT gv.geofence_id FROM geofence_vehicles gv WHERE gv.vehicle_id = :vehicleId", nativeQuery = true)
    List<String> findAssignedRouteIdsForVehicle(@Param("vehicleId") String vehicleId);
    
    // Get FULL assigned route objects for a vehicle (JPQL - returns full Geofence objects)
    @Query("SELECT g FROM Geofence g " +
           "JOIN GeofenceVehicle gv ON g.id = gv.geofence.id " +
           "WHERE gv.vehicle.id = :vehicleId AND g.type = 'route' AND g.isActive = true")
    List<Geofence> findAssignedRoutesForVehicle(@Param("vehicleId") String vehicleId);
    
    // Get all active routes for a tenant
    @Query("SELECT g FROM Geofence g " +
           "WHERE g.tenant.id = :tenantId AND g.type = 'route' AND g.isActive = true")
    List<Geofence> findActiveRoutesByTenant(@Param("tenantId") String tenantId);
}