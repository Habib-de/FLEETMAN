// src/main/java/com/fleetman/repository/ChecklistRepository.java
package com.fleetman.repository;

import com.fleetman.entity.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChecklistRepository extends JpaRepository<Checklist, String> {
    
    List<Checklist> findByTenantId(String tenantId);
    
    List<Checklist> findByVehicleId(String vehicleId);
    
    List<Checklist> findByDriverId(String driverId);
    
    List<Checklist> findByTenantIdAndVehicleIdOrderByCreatedAtDesc(String tenantId, String vehicleId);
    
    List<Checklist> findByStatus(String status);
    
    List<Checklist> findByCreatedAtAfter(LocalDateTime date);
    
    List<Checklist> findBySubmittedAtIsNotNull();
}