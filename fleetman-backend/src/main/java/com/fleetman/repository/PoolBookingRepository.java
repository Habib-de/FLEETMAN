package com.fleetman.repository;

import com.fleetman.entity.PoolBooking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface PoolBookingRepository extends JpaRepository<PoolBooking, String> {
    
    List<PoolBooking> findByTenantId(String tenantId);
    
    List<PoolBooking> findByVehicleId(String vehicleId);
    
    List<PoolBooking> findByStatus(String status);
    
    @Query("SELECT pb FROM PoolBooking pb WHERE pb.vehicle.id = :vehicleId AND pb.status IN ('pending', 'approved', 'active')")
    List<PoolBooking> findActiveBookingsForVehicle(@Param("vehicleId") String vehicleId);
    
    @Query("SELECT pb FROM PoolBooking pb WHERE pb.startTime BETWEEN :start AND :end")
    List<PoolBooking> findBookingsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}