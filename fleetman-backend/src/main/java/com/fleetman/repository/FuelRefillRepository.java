package com.fleetman.repository;

import com.fleetman.entity.FuelRefill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FuelRefillRepository extends JpaRepository<FuelRefill, String> {
    
    List<FuelRefill> findByTenantId(String tenantId);
    
    List<FuelRefill> findByVehicleId(String vehicleId);
    
    List<FuelRefill> findByVehicleIdAndDateTimeBetween(String vehicleId, LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT SUM(f.litres) FROM FuelRefill f WHERE f.vehicle.id = :vehicleId")
    Double getTotalFuelConsumed(@Param("vehicleId") String vehicleId);
    
    @Query("SELECT AVG(f.efficiency) FROM FuelRefill f WHERE f.vehicle.id = :vehicleId")
    Double getAverageEfficiency(@Param("vehicleId") String vehicleId);
}