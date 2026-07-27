package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.TrackingDataDTO;
import com.fleetman.entity.TrackingData;
import com.fleetman.service.TrackingDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tracking")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class TrackingDataController {

    private final TrackingDataService trackingDataService;

    @PostMapping
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<TrackingDataDTO>> saveTrackingData(@Valid @RequestBody TrackingDataDTO dto) {
    TrackingData saved = trackingDataService.saveTrackingData(dto);
    return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.success("Tracking data saved successfully", convertToDTO(saved)));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<TrackingDataDTO>>> getTrackingDataByVehicle(@PathVariable String vehicleId) {
        List<TrackingData> data = trackingDataService.getTrackingDataByVehicle(vehicleId);
        List<TrackingDataDTO> dtos = data.stream()
                .filter(d -> d != null)  // ✅ Filter nulls
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}/latest")
    public ResponseEntity<ApiResponse<TrackingDataDTO>> getLatestTrackingData(@PathVariable String vehicleId) {
        TrackingData data = trackingDataService.getLatestTrackingData(vehicleId);
        // ✅ Handle null case - return success with null data
        if (data == null) {
            return ResponseEntity.ok(ApiResponse.success(null));
        }
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(data)));
    }

    @GetMapping("/vehicle/{vehicleId}/between")
    public ResponseEntity<ApiResponse<List<TrackingDataDTO>>> getTrackingDataByVehicleAndDateRange(
            @PathVariable String vehicleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<TrackingData> data = trackingDataService.getTrackingDataByVehicleAndDateRange(vehicleId, start, end);
        List<TrackingDataDTO> dtos = data.stream()
                .filter(d -> d != null)  // ✅ Filter nulls
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/recent/{tenantId}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<List<TrackingDataDTO>>> getRecentTrackingData(
            @PathVariable String tenantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime since) {
        List<TrackingData> data = trackingDataService.getRecentTrackingData(tenantId, since);
        List<TrackingDataDTO> dtos = data.stream()
                .filter(d -> d != null)  // ✅ Filter nulls
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    private TrackingDataDTO convertToDTO(TrackingData data) {
        // ✅ Check if data is null
        if (data == null) {
            return null;
        }
        
        TrackingDataDTO dto = new TrackingDataDTO();
        dto.setId(data.getId());
        dto.setTenantId(data.getTenant() != null ? data.getTenant().getId() : null);
        dto.setVehicleId(data.getVehicle() != null ? data.getVehicle().getId() : null);
        dto.setVehicleRegistration(data.getVehicle() != null ? data.getVehicle().getRegistration() : null);
        dto.setDriverId(data.getDriver() != null ? data.getDriver().getId() : null);
        dto.setDriverName(data.getDriver() != null ? data.getDriver().getName() : null);
        dto.setLat(data.getLat());
        dto.setLng(data.getLng());
        dto.setSpeed(data.getSpeed());
        dto.setHeading(data.getHeading());
        dto.setAltitude(data.getAltitude());
        dto.setFuelLevel(data.getFuelLevel());
        dto.setEngineTemp(data.getEngineTemp());
        dto.setIgnition(data.getIgnition());
        dto.setTimestamp(data.getTimestamp());
        dto.setCreatedAt(data.getCreatedAt());
        return dto;
    }
}