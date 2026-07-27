package com.fleetman.repository;

import com.fleetman.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, String> {
    
    List<Incident> findByTenantId(String tenantId);
    
    List<Incident> findByVehicleId(String vehicleId);
    
    List<Incident> findByTenantIdAndStatus(String tenantId, String status);
    
    List<Incident> findBySeverity(String severity);

    List<Incident> findByDriverId(String driverId);
    
    @Query("SELECT i FROM Incident i WHERE i.tenant.id = :tenantId AND i.createdAt >= :startDate")
    List<Incident> findRecentIncidents(@Param("tenantId") String tenantId, @Param("startDate") LocalDateTime startDate);
}