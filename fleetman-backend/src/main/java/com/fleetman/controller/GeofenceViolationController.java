package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.GeofenceViolationDTO;
import com.fleetman.entity.GeofenceViolation;
import com.fleetman.service.GeofenceViolationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/geofence-violations")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class GeofenceViolationController {

    private final GeofenceViolationService geofenceViolationService;

    @PostMapping
    public ResponseEntity<ApiResponse<GeofenceViolationDTO>> createGeofenceViolation(@Valid @RequestBody GeofenceViolation violation) {
        GeofenceViolation created = geofenceViolationService.createGeofenceViolation(violation);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Geofence violation created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GeofenceViolationDTO>> getGeofenceViolationById(@PathVariable String id) {
        GeofenceViolation violation = geofenceViolationService.getGeofenceViolationById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(violation)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<GeofenceViolationDTO>>> getGeofenceViolationsByTenant(@PathVariable String tenantId) {
        List<GeofenceViolation> violations = geofenceViolationService.getGeofenceViolationsByTenant(tenantId);
        List<GeofenceViolationDTO> dtos = violations.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<GeofenceViolationDTO>>> getGeofenceViolationsByVehicle(@PathVariable String vehicleId) {
        List<GeofenceViolation> violations = geofenceViolationService.getGeofenceViolationsByVehicle(vehicleId);
        List<GeofenceViolationDTO> dtos = violations.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/geofence/{geofenceId}")
    public ResponseEntity<ApiResponse<List<GeofenceViolationDTO>>> getGeofenceViolationsByGeofence(@PathVariable String geofenceId) {
        List<GeofenceViolation> violations = geofenceViolationService.getGeofenceViolationsByGeofence(geofenceId);
        List<GeofenceViolationDTO> dtos = violations.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/unresolved")
    public ResponseEntity<ApiResponse<List<GeofenceViolationDTO>>> getUnresolvedGeofenceViolations() {
        List<GeofenceViolation> violations = geofenceViolationService.getUnresolvedGeofenceViolations();
        List<GeofenceViolationDTO> dtos = violations.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<GeofenceViolationDTO>> resolveGeofenceViolation(@PathVariable String id) {
        GeofenceViolation resolved = geofenceViolationService.resolveGeofenceViolation(id);
        return ResponseEntity.ok(ApiResponse.success("Geofence violation resolved successfully", convertToDTO(resolved)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGeofenceViolation(@PathVariable String id) {
        geofenceViolationService.deleteGeofenceViolation(id);
        return ResponseEntity.ok(ApiResponse.success("Geofence violation deleted successfully", null));
    }

        // ============================================
    // ✅ NEW: Override violation as manager-approved return
    // ============================================
    @PutMapping("/{id}/override-return")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<GeofenceViolationDTO>> overrideAsReturn(
            @PathVariable String id,
            @RequestBody(required = false) Map<String, String> request) {
        
        String reason = request != null ? request.get("reason") : null;
        if (reason == null || reason.trim().isEmpty()) {
            reason = "Manager-approved return trip";
        }
        
        GeofenceViolation overridden = geofenceViolationService.overrideAsReturn(id, reason);
        return ResponseEntity.ok(ApiResponse.success(
            "Violation overridden as manager-approved return", 
            convertToDTO(overridden)
        ));
    }

    // ============================================
    // ✅ NEW: Get overridden returns for a tenant
    // ============================================
    @GetMapping("/tenant/{tenantId}/overridden-returns")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
    public ResponseEntity<ApiResponse<List<GeofenceViolationDTO>>> getOverriddenReturns(
            @PathVariable String tenantId) {
        List<GeofenceViolation> violations = geofenceViolationService.getOverriddenReturns(tenantId);
        List<GeofenceViolationDTO> dtos = violations.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    private GeofenceViolationDTO convertToDTO(GeofenceViolation violation) {
        GeofenceViolationDTO dto = new GeofenceViolationDTO();
        dto.setId(violation.getId());
        dto.setTenantId(violation.getTenant() != null ? violation.getTenant().getId() : null);
        dto.setGeofenceId(violation.getGeofence() != null ? violation.getGeofence().getId() : null);
        dto.setGeofenceName(violation.getGeofence() != null ? violation.getGeofence().getName() : null);
        dto.setVehicleId(violation.getVehicle() != null ? violation.getVehicle().getId() : null);
        dto.setVehicleRegistration(violation.getVehicle() != null ? violation.getVehicle().getRegistration() : null);
        // REMOVED: Driver references since they don't exist in the entity
        // dto.setDriverId(...);
        // dto.setDriverName(...);
        dto.setViolationType(violation.getViolationType());
        dto.setLat(violation.getLat());
        dto.setLng(violation.getLng());
        dto.setTimestamp(violation.getTimestamp());
        dto.setResolved(violation.getResolved());
        dto.setResolvedAt(violation.getResolvedAt());
        dto.setCreatedAt(violation.getCreatedAt());
        return dto;
    }
}