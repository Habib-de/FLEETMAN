package com.fleetman.repository;

import com.fleetman.entity.Alarm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlarmRepository extends JpaRepository<Alarm, String> {
    
    List<Alarm> findByTenantId(String tenantId);
    
    List<Alarm> findByVehicleId(String vehicleId);
    
    List<Alarm> findByResolvedFalse();
    
    List<Alarm> findByType(String type);
    
    List<Alarm> findBySeverity(String severity);
}