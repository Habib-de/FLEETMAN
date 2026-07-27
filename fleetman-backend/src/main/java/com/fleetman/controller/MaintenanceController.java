package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.MaintenanceDTO;
import com.fleetman.entity.Maintenance;
import com.fleetman.service.MaintenanceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/maintenance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    @PostMapping
    public ResponseEntity<ApiResponse<MaintenanceDTO>> createMaintenance(@Valid @RequestBody Maintenance maintenance) {
        Maintenance created = maintenanceService.createMaintenance(maintenance);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Maintenance record created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenanceDTO>> getMaintenanceById(@PathVariable String id) {
        Maintenance maintenance = maintenanceService.getMaintenanceById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(maintenance)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<MaintenanceDTO>>> getMaintenanceByTenant(@PathVariable String tenantId) {
        List<Maintenance> records = maintenanceService.getMaintenanceByTenant(tenantId);
        List<MaintenanceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<MaintenanceDTO>>> getMaintenanceByVehicle(@PathVariable String vehicleId) {
        List<Maintenance> records = maintenanceService.getMaintenanceByVehicle(vehicleId);
        List<MaintenanceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/tenant/{tenantId}/status/{status}")
    public ResponseEntity<ApiResponse<List<MaintenanceDTO>>> getMaintenanceByTenantAndStatus(
            @PathVariable String tenantId,
            @PathVariable String status) {
        List<Maintenance> records = maintenanceService.getMaintenanceByTenantAndStatus(tenantId, status);
        List<MaintenanceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/overdue")
    public ResponseEntity<ApiResponse<List<MaintenanceDTO>>> getOverdueMaintenance() {
        List<Maintenance> records = maintenanceService.getOverdueMaintenance();
        List<MaintenanceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/critical/{tenantId}")
    public ResponseEntity<ApiResponse<List<MaintenanceDTO>>> getCriticalMaintenance(@PathVariable String tenantId) {
        List<Maintenance> records = maintenanceService.getCriticalMaintenance(tenantId);
        List<MaintenanceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MaintenanceDTO>> updateMaintenance(@PathVariable String id, @Valid @RequestBody Maintenance maintenance) {
        Maintenance updated = maintenanceService.updateMaintenance(id, maintenance);
        return ResponseEntity.ok(ApiResponse.success("Maintenance record updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMaintenance(@PathVariable String id) {
        maintenanceService.deleteMaintenance(id);
        return ResponseEntity.ok(ApiResponse.success("Maintenance record deleted successfully", null));
    }

    private MaintenanceDTO convertToDTO(Maintenance maintenance) {
        MaintenanceDTO dto = new MaintenanceDTO();
        dto.setId(maintenance.getId());
        dto.setTenantId(maintenance.getTenant() != null ? maintenance.getTenant().getId() : null);
        dto.setVehicleId(maintenance.getVehicle() != null ? maintenance.getVehicle().getId() : null);
        dto.setVehicleRegistration(maintenance.getVehicle() != null ? maintenance.getVehicle().getRegistration() : null);
        dto.setDriverId(maintenance.getDriver() != null ? maintenance.getDriver().getId() : null);
        dto.setDriverName(maintenance.getDriver() != null ? maintenance.getDriver().getName() : null);
        dto.setType(maintenance.getType());
        dto.setStatus(maintenance.getStatus());
        dto.setPriority(maintenance.getPriority());
        dto.setDescription(maintenance.getDescription());
        dto.setReportedBy(maintenance.getReportedBy());
        dto.setScheduledDate(maintenance.getScheduledDate());
        dto.setCompletedDate(maintenance.getCompletedDate());
        dto.setCost(maintenance.getCost());
        dto.setMechanic(maintenance.getMechanic());
        dto.setPartsUsed(maintenance.getPartsUsed());
        dto.setEstimatedHours(maintenance.getEstimatedHours());
        dto.setActualHours(maintenance.getActualHours());
        // ✅ ADD THIS LINE
        dto.setReceiptImage(maintenance.getReceiptImage());
        dto.setCreatedAt(maintenance.getCreatedAt());
        return dto;
    }
}