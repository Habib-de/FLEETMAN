package com.fleetman.repository;

import com.fleetman.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, String> {
    
    List<Driver> findByTenantId(String tenantId);
    
    Optional<Driver> findByLicenseNumber(String licenseNumber);
    
    Optional<Driver> findByDriverId(String driverId);
    
    List<Driver> findByTenantIdAndStatus(String tenantId, String status);
    
    List<Driver> findByAssignedVehicleId(String vehicleId);
    
    @Query("SELECT d FROM Driver d WHERE d.tenant.id = :tenantId AND d.safetyScore < :threshold")
    List<Driver> findDriversWithLowSafetyScore(@Param("tenantId") String tenantId, @Param("threshold") int threshold);
    Optional<Driver> findByUserId(String userId);
}