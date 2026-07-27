// src/main/java/com/fleetman/controller/ChecklistController.java
package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.ChecklistDTO;
import com.fleetman.entity.Checklist;
import com.fleetman.service.ChecklistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/checklists")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class ChecklistController {

    private final ChecklistService checklistService;

    @PostMapping
    public ResponseEntity<ApiResponse<ChecklistDTO>> createChecklist(@Valid @RequestBody Checklist checklist) {
        Checklist created = checklistService.createChecklist(checklist);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Checklist saved successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ChecklistDTO>> getChecklistById(@PathVariable String id) {
        Checklist checklist = checklistService.getChecklistById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(checklist)));
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<List<ChecklistDTO>>> getChecklistsByTenant(@PathVariable String tenantId) {
        List<Checklist> checklists = checklistService.getChecklistsByTenant(tenantId);
        List<ChecklistDTO> dtos = checklists.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<ChecklistDTO>>> getChecklistsByVehicle(@PathVariable String vehicleId) {
        List<Checklist> checklists = checklistService.getChecklistsByVehicle(vehicleId);
        List<ChecklistDTO> dtos = checklists.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}/history")
    public ResponseEntity<ApiResponse<List<ChecklistDTO>>> getChecklistHistory(
            @PathVariable String vehicleId,
            @RequestParam String tenantId) {
        List<Checklist> checklists = checklistService.getChecklistsByVehicleHistory(tenantId, vehicleId);
        List<ChecklistDTO> dtos = checklists.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<ApiResponse<List<ChecklistDTO>>> getChecklistsByDriver(@PathVariable String driverId) {
        List<Checklist> checklists = checklistService.getChecklistsByDriver(driverId);
        List<ChecklistDTO> dtos = checklists.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ChecklistDTO>> updateChecklist(@PathVariable String id, @Valid @RequestBody Checklist checklist) {
        Checklist updated = checklistService.updateChecklist(id, checklist);
        return ResponseEntity.ok(ApiResponse.success("Checklist updated successfully", convertToDTO(updated)));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<ApiResponse<ChecklistDTO>> submitChecklist(
            @PathVariable String id,
            @RequestParam(required = false) String submittedTo) {
        Checklist submitted = checklistService.submitChecklist(id, submittedTo != null ? submittedTo : "Fleet Manager");
        return ResponseEntity.ok(ApiResponse.success("Checklist submitted successfully", convertToDTO(submitted)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<Void>> deleteChecklist(@PathVariable String id) {
        checklistService.deleteChecklist(id);
        return ResponseEntity.ok(ApiResponse.success("Checklist deleted successfully", null));
    }

    private ChecklistDTO convertToDTO(Checklist checklist) {
        ChecklistDTO dto = new ChecklistDTO();
        dto.setId(checklist.getId());
        dto.setTenantId(checklist.getTenant() != null ? checklist.getTenant().getId() : null);
        dto.setVehicleId(checklist.getVehicle() != null ? checklist.getVehicle().getId() : null);
        dto.setVehicleRegistration(checklist.getVehicle() != null ? checklist.getVehicle().getRegistration() : null);
        dto.setDriverId(checklist.getDriver() != null ? checklist.getDriver().getId() : null);
        dto.setDriverName(checklist.getDriverName());
        dto.setType(checklist.getType());
        dto.setStatus(checklist.getStatus());
        dto.setItems(checklist.getItems());
        dto.setTotalItems(checklist.getTotalItems());
        dto.setPassedItems(checklist.getPassedItems());
        dto.setFailedItems(checklist.getFailedItems());
        dto.setDefects(checklist.getDefects());
        dto.setCompletionRate(checklist.getCompletionRate());
        dto.setSignature(checklist.getSignature());
        dto.setInspectionDate(checklist.getInspectionDate());
        dto.setSubmittedAt(checklist.getSubmittedAt());
        dto.setSubmittedTo(checklist.getSubmittedTo());
        dto.setCreatedAt(checklist.getCreatedAt());
        return dto;
    }
}