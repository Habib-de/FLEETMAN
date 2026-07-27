package com.fleetman.repository;

import com.fleetman.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, String> {
    
    // ✅ Use @Query to explicitly join with tenant.id
    @Query("SELECT v FROM Vehicle v WHERE v.tenant.id = :tenantId")
    List<Vehicle> findByTenantId(@Param("tenantId") String tenantId);
    
    Optional<Vehicle> findByRegistration(String registration);
    
    Optional<Vehicle> findByVin(String vin);
    
    @Query("SELECT v FROM Vehicle v WHERE v.tenant.id = :tenantId AND v.status = :status")
    List<Vehicle> findByTenantIdAndStatus(@Param("tenantId") String tenantId, @Param("status") String status);
    
    @Query("SELECT v FROM Vehicle v WHERE v.tenant.id = :tenantId AND v.category = :category")
    List<Vehicle> findByTenantIdAndCategory(@Param("tenantId") String tenantId, @Param("category") String category);
    
    @Query("SELECT COUNT(v) FROM Vehicle v WHERE v.tenant.id = :tenantId AND v.status = :status")
    long countByTenantIdAndStatus(@Param("tenantId") String tenantId, @Param("status") String status);
    
    @Query("SELECT v FROM Vehicle v WHERE v.tenant.id = :tenantId AND v.mileage IS NOT NULL ORDER BY v.mileage DESC")
    List<Vehicle> findTopVehiclesByMileage(@Param("tenantId") String tenantId);
}