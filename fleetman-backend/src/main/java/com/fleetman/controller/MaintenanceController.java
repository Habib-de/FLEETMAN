package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.MaintenanceDTO;
import com.fleetman.dto.ServiceScheduleDTO;
import com.fleetman.entity.Maintenance;
import com.fleetman.service.MaintenanceService;
import com.fleetman.service.ServiceScheduleService;
import com.fleetman.entity.ServiceSchedule;
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
    private final ServiceScheduleService serviceScheduleService;

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

    
    // ============================================
    // SERVICE SCHEDULES
    // ============================================

    /**
     * Create a new service schedule.
     * POST /api/maintenance/schedules
     * Body: { vehicleId, serviceType, intervalKm, intervalDays, lastServiceKm, lastServiceDate, isActive, notes }
     */
        @PostMapping("/schedules")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<ServiceScheduleDTO>> createSchedule(@RequestBody ServiceSchedule body) {
        try {
            ServiceSchedule saved = serviceScheduleService.create(body);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Service schedule created", ServiceScheduleDTO.from(saved)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * List all schedules for a vehicle.
     */
    @GetMapping("/schedules/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<ServiceScheduleDTO>>> getSchedulesByVehicle(@PathVariable String vehicleId) {
        return ResponseEntity.ok(ApiResponse.success(serviceScheduleService.getByVehicle(vehicleId)));
    }

    /**
     * List all schedules for a tenant.
     */
    @GetMapping("/schedules/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<ServiceScheduleDTO>>> getSchedulesByTenant(@PathVariable String tenantId) {
        return ResponseEntity.ok(ApiResponse.success(serviceScheduleService.getByTenant(tenantId)));
    }

    /**
     * Get upcoming service schedules (due within N days), with due info merged in.
     * GET /api/maintenance/schedules/tenant/{tenantId}/upcoming?days=30
     */
    @GetMapping("/schedules/tenant/{tenantId}/upcoming")
    public ResponseEntity<ApiResponse<List<java.util.Map<String, Object>>>> getUpcomingSchedules(
            @PathVariable String tenantId,
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.success(serviceScheduleService.getUpcoming(tenantId, days)));
    }

    /**
     * Update a schedule.
     */
        @PutMapping("/schedules/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<ServiceScheduleDTO>> updateSchedule(
            @PathVariable String id,
            @RequestBody ServiceSchedule body) {
        try {
            ServiceSchedule updated = serviceScheduleService.update(id, body);
            return ResponseEntity.ok(ApiResponse.success("Service schedule updated", ServiceScheduleDTO.from(updated)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Delete a schedule.
     */
    @DeleteMapping("/schedules/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<Void>> deleteSchedule(@PathVariable String id) {
        try {
            serviceScheduleService.delete(id);
            return ResponseEntity.ok(ApiResponse.success("Service schedule deleted", null));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    /**
     * Manually run the daily check now (for testing).
     * Returns the number of work orders created.
     */
    @PostMapping("/schedules/run-check")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> runScheduleCheckNow() {
        try {
            int created = serviceScheduleService.runNow();
            java.util.Map<String, Object> result = new java.util.HashMap<>();
            result.put("workOrdersCreated", created);
            return ResponseEntity.ok(ApiResponse.success("Schedule check complete", result));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(ApiResponse.error(e.getMessage()));
        }
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