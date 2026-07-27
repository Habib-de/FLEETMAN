package com.fleetman.repository;

import com.fleetman.entity.Compliance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ComplianceRepository extends JpaRepository<Compliance, String> {
    
    List<Compliance> findByTenantId(String tenantId);
    
    List<Compliance> findByVehicleId(String vehicleId);
    
    List<Compliance> findByDriverId(String driverId);
    
    List<Compliance> findByValidUntilBefore(LocalDate date);
    
    @Query("SELECT c FROM Compliance c WHERE c.tenant.id = :tenantId AND c.validUntil BETWEEN :start AND :end")
    List<Compliance> findExpiringSoon(@Param("tenantId") String tenantId, @Param("start") LocalDate start, @Param("end") LocalDate end);
}