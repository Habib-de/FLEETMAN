package com.fleetman.repository;

import com.fleetman.entity.TrackingData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TrackingDataRepository extends JpaRepository<TrackingData, String> {
    
    List<TrackingData> findByVehicleIdOrderByTimestampDesc(String vehicleId);
    
    List<TrackingData> findByVehicleIdAndTimestampBetween(String vehicleId, LocalDateTime start, LocalDateTime end);
    
    TrackingData findTopByVehicleIdOrderByTimestampDesc(String vehicleId);
    
    @Query("SELECT td FROM TrackingData td WHERE td.tenant.id = :tenantId AND td.timestamp >= :since ORDER BY td.timestamp DESC")
    List<TrackingData> findRecentData(@Param("tenantId") String tenantId, @Param("since") LocalDateTime since);
}