package com.fleetman.repository;

import com.fleetman.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional; 

@Repository
public interface TripRepository extends JpaRepository<Trip, String> {
    
    List<Trip> findByTenantId(String tenantId);
    
    List<Trip> findByVehicleId(String vehicleId);
    
    List<Trip> findByDriverId(String driverId);
    
    List<Trip> findByTenantIdAndStatus(String tenantId, String status);
    
    List<Trip> findByVehicleIdAndStatus(String vehicleId, String status);
    
    List<Trip> findByStartTimeBetween(LocalDateTime start, LocalDateTime end);
    
    List<Trip> findByStatus(String status);
    
    @Query("SELECT t FROM Trip t WHERE t.tenant.id = :tenantId AND t.startTime >= :startDate")
    List<Trip> findTripsFromDate(@Param("tenantId") String tenantId, @Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT COUNT(t) FROM Trip t WHERE t.tenant.id = :tenantId AND t.status = 'active'")
    long countActiveTrips(@Param("tenantId") String tenantId);

    // ============================================
    // ✅ METHODS WITH GEOFENCE FETCH
    // ============================================

    @Query("SELECT DISTINCT t FROM Trip t " +
           "LEFT JOIN FETCH t.vehicle " +
           "LEFT JOIN FETCH t.tenant " +
           "LEFT JOIN FETCH t.driver " +
           "LEFT JOIN FETCH t.geofence " +  // ✅ HAS geofence
           "WHERE t.status = :status")
    List<Trip> findByStatusWithVehicle(@Param("status") String status);

    @Query("SELECT DISTINCT t FROM Trip t " +
           "LEFT JOIN FETCH t.vehicle " +
           "LEFT JOIN FETCH t.tenant " +
           "LEFT JOIN FETCH t.driver " +
           "LEFT JOIN FETCH t.geofence " +  // ✅ ADD THIS - WAS MISSING!
           "WHERE t.tenant.id = :tenantId AND t.status = :status")
    List<Trip> findByTenantIdAndStatusWithVehicle(@Param("tenantId") String tenantId, @Param("status") String status);

    @Query("SELECT DISTINCT t FROM Trip t " +
           "LEFT JOIN FETCH t.vehicle " +
           "LEFT JOIN FETCH t.tenant " +
           "LEFT JOIN FETCH t.driver " +
           "LEFT JOIN FETCH t.geofence " +  // ✅ ADD THIS - WAS MISSING!
           "WHERE t.vehicle.id = :vehicleId AND t.status = :status")
    List<Trip> findByVehicleIdAndStatusWithVehicle(@Param("vehicleId") String vehicleId, @Param("status") String status);

    @Query("SELECT DISTINCT t FROM Trip t " +
           "LEFT JOIN FETCH t.vehicle " +
           "LEFT JOIN FETCH t.tenant " +
           "LEFT JOIN FETCH t.driver " +
           "LEFT JOIN FETCH t.geofence " +  // ✅ HAS geofence
           "WHERE t.status IN ('In Progress', 'active')")
    List<Trip> findAllActiveWithVehicle();

    // ============================================
    // ✅ NEW METHOD - Find active trip for a vehicle
    // ============================================

    @Query("SELECT t FROM Trip t " +
           "LEFT JOIN FETCH t.geofence " +
           "WHERE t.vehicle.id = :vehicleId AND t.status IN ('active', 'In Progress', 'planned')")
    Optional<Trip> findActiveTripWithGeofence(@Param("vehicleId") String vehicleId);
}