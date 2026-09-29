package com.fleetman.service;

import com.fleetman.dto.TrackingDataDTO;
import com.fleetman.entity.Driver;
import com.fleetman.entity.Tenant;
import com.fleetman.entity.TrackingData;
import com.fleetman.entity.Vehicle;
import com.fleetman.repository.DriverRepository;
import com.fleetman.repository.TenantRepository;
import com.fleetman.repository.TrackingDataRepository;
import com.fleetman.repository.VehicleRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class TrackingDataService {
    
    private final TrackingDataRepository trackingDataRepository;
    private final TenantRepository tenantRepository;      
    private final VehicleRepository vehicleRepository;    
    private final DriverRepository driverRepository;
    private final SafetyService safetyService;      
    
    @Transactional
    public TrackingData saveTrackingData(TrackingDataDTO dto) {
    Tenant tenant = tenantRepository.findById(dto.getTenantId())
        .orElseThrow(() -> new RuntimeException("Tenant not found"));

    Vehicle vehicle = vehicleRepository.findById(dto.getVehicleId())
        .orElseThrow(() -> new RuntimeException("Vehicle not found"));

    TrackingData data = new TrackingData();
    data.setTenant(tenant);
    data.setVehicle(vehicle);
    data.setLat(dto.getLat());
    data.setLng(dto.getLng());
    data.setSpeed(dto.getSpeed());
    data.setHeading(dto.getHeading());
    data.setAltitude(dto.getAltitude());
    data.setFuelLevel(dto.getFuelLevel());
    data.setEngineTemp(dto.getEngineTemp());
    data.setIgnition(dto.getIgnition());
    data.setTimestamp(dto.getTimestamp() != null ? dto.getTimestamp() : LocalDateTime.now());

    if (dto.getDriverId() != null && !dto.getDriverId().isEmpty()) {
        Driver driver = driverRepository.findById(dto.getDriverId())
            .orElseThrow(() -> new RuntimeException("Driver not found"));
        data.setDriver(driver);
    }

        TrackingData saved = trackingDataRepository.save(data);

    // ✅ NEW: Detect safety events by comparing with previous point
    try {
        TrackingData previous = trackingDataRepository
            .findTopByVehicleIdOrderByTimestampDesc(saved.getVehicle().getId());
        if (previous != null && !previous.getId().equals(saved.getId())) {
            safetyService.detectAndSaveEvents(saved, previous);
        }
    } catch (Exception e) {
        // Never fail tracking save because of event detection
        log.warn("Safety event detection failed: {}", e.getMessage());
    }

    return saved;
    }
    
    public List<TrackingData> getTrackingDataByVehicle(String vehicleId) {
        try {
            List<TrackingData> result = trackingDataRepository.findByVehicleIdOrderByTimestampDesc(vehicleId);
            return result != null ? result : new ArrayList<>();
        } catch (Exception e) {
            System.err.println("❌ Error fetching tracking data for vehicle " + vehicleId + ": " + e.getMessage());
            return new ArrayList<>();
        }
    }
    
    public TrackingData getLatestTrackingData(String vehicleId) {
        try {
            return trackingDataRepository.findTopByVehicleIdOrderByTimestampDesc(vehicleId);
        } catch (Exception e) {
            System.err.println("❌ Error fetching latest tracking data for vehicle " + vehicleId + ": " + e.getMessage());
            return null;
        }
    }
    
    public List<TrackingData> getTrackingDataByVehicleAndDateRange(String vehicleId, LocalDateTime start, LocalDateTime end) {
        try {
            List<TrackingData> result = trackingDataRepository.findByVehicleIdAndTimestampBetween(vehicleId, start, end);
            return result != null ? result : new ArrayList<>();
        } catch (Exception e) {
            System.err.println("❌ Error fetching tracking data for vehicle " + vehicleId + " between dates: " + e.getMessage());
            return new ArrayList<>();
        }
    }
    
    public List<TrackingData> getRecentTrackingData(String tenantId, LocalDateTime since) {
        try {
            List<TrackingData> result = trackingDataRepository.findRecentData(tenantId, since);
            return result != null ? result : new ArrayList<>();
        } catch (Exception e) {
            System.err.println("❌ Error fetching recent tracking data for tenant " + tenantId + ": " + e.getMessage());
            return new ArrayList<>();
        }
    }
}