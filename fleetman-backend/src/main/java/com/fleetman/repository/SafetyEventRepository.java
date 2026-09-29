package com.fleetman.repository;

import com.fleetman.entity.SafetyEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SafetyEventRepository extends JpaRepository<SafetyEvent, String> {

    List<SafetyEvent> findByDriverIdAndTimestampAfter(String driverId, LocalDateTime since);

    List<SafetyEvent> findByDriverIdOrderByTimestampDesc(String driverId);

    long countByDriverIdAndTimestampAfter(String driverId, LocalDateTime since);

    List<SafetyEvent> findByVehicleIdOrderByTimestampDesc(String vehicleId);
}