package com.fleetman.repository;

import com.fleetman.entity.Maintenance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface MaintenanceRepository extends JpaRepository<Maintenance, String> {
    
    List<Maintenance> findByTenantId(String tenantId);

    // ✅ ADD THIS METHOD - fetches maintenance with vehicle data
    @Query("SELECT m FROM Maintenance m JOIN FETCH m.vehicle v WHERE m.tenant.id = :tenantId")
    List<Maintenance> findByTenantIdWithVehicle(@Param("tenantId") String tenantId);

    List<Maintenance> findByVehicleId(String vehicleId);
    
    List<Maintenance> findByTenantIdAndStatus(String tenantId, String status);
    
    List<Maintenance> findByVehicleIdAndStatus(String vehicleId, String status);
    
    List<Maintenance> findByScheduledDateBeforeAndStatusNot(LocalDate date, String status);
    
    @Query("SELECT m FROM Maintenance m WHERE m.tenant.id = :tenantId AND m.priority = 'critical' AND m.status != 'closed'")
    List<Maintenance> findCriticalMaintenance(@Param("tenantId") String tenantId);
}