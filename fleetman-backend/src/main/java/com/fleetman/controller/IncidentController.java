package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.IncidentDTO;
import com.fleetman.entity.Incident;
import com.fleetman.service.IncidentService;
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
@RequestMapping("/incidents")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping
    public ResponseEntity<ApiResponse<IncidentDTO>> createIncident(@Valid @RequestBody Incident incident) {
        Incident created = incidentService.createIncident(incident);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Incident created successfully", convertToDTO(created)));
    }

    // ✅ ADD THIS - Get ALL incidents (super_admin only)
    @GetMapping
    @PreAuthorize("hasRole('super_admin')")
    public ResponseEntity<ApiResponse<List<IncidentDTO>>> getAllIncidents() {
        List<Incident> incidents = incidentService.getAllIncidents();
        List<IncidentDTO> dtos = incidents.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDTO>> getIncidentById(@PathVariable String id) {
        Incident incident = incidentService.getIncidentById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(incident)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<IncidentDTO>>> getIncidentsByTenant(@PathVariable String tenantId) {
        List<Incident> incidents = incidentService.getIncidentsByTenant(tenantId);
        List<IncidentDTO> dtos = incidents.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<IncidentDTO>>> getIncidentsByVehicle(@PathVariable String vehicleId) {
        List<Incident> incidents = incidentService.getIncidentsByVehicle(vehicleId);
        List<IncidentDTO> dtos = incidents.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/tenant/{tenantId}/status/{status}")
    public ResponseEntity<ApiResponse<List<IncidentDTO>>> getIncidentsByTenantAndStatus(
            @PathVariable String tenantId,
            @PathVariable String status) {
        List<Incident> incidents = incidentService.getIncidentsByTenantAndStatus(tenantId, status);
        List<IncidentDTO> dtos = incidents.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/recent/{tenantId}")
    public ResponseEntity<ApiResponse<List<IncidentDTO>>> getRecentIncidents(
            @PathVariable String tenantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate) {
        List<Incident> incidents = incidentService.getRecentIncidents(tenantId, startDate);
        List<IncidentDTO> dtos = incidents.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/driver/{driverId}")
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public ResponseEntity<ApiResponse<List<IncidentDTO>>> getIncidentsByDriver(@PathVariable String driverId) {
    List<Incident> incidents = incidentService.getIncidentsByDriver(driverId);
    List<IncidentDTO> dtos = incidents.stream().map(this::convertToDTO).collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.success(dtos));
}

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<IncidentDTO>> updateIncident(@PathVariable String id, @Valid @RequestBody Incident incident) {
        Incident updated = incidentService.updateIncident(id, incident);
        return ResponseEntity.ok(ApiResponse.success("Incident updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteIncident(@PathVariable String id) {
        incidentService.deleteIncident(id);
        return ResponseEntity.ok(ApiResponse.success("Incident deleted successfully", null));
    }

    private IncidentDTO convertToDTO(Incident incident) {
        IncidentDTO dto = new IncidentDTO();
        dto.setId(incident.getId());
        dto.setTenantId(incident.getTenant() != null ? incident.getTenant().getId() : null);
        dto.setVehicleId(incident.getVehicle() != null ? incident.getVehicle().getId() : null);
        dto.setVehicleRegistration(incident.getVehicle() != null ? incident.getVehicle().getRegistration() : null);
        dto.setDriverId(incident.getDriver() != null ? incident.getDriver().getId() : null);
        dto.setDriverName(incident.getDriver() != null ? incident.getDriver().getName() : null);
        dto.setIncidentType(incident.getIncidentType());
        dto.setSeverity(incident.getSeverity());
        dto.setStatus(incident.getStatus());
        dto.setLocation(incident.getLocation());
        dto.setDescription(incident.getDescription());
        dto.setPoliceReport(incident.getPoliceReport());
        dto.setCost(incident.getCost());
        dto.setAttachments(incident.getAttachments());
        dto.setReportedBy(incident.getReportedBy());
        dto.setResolvedAt(incident.getResolvedAt());
        dto.setCreatedAt(incident.getCreatedAt());
        return dto;
    }
}