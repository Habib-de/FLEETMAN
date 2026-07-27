package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.ComplianceDTO;
import com.fleetman.entity.Compliance;
import com.fleetman.service.ComplianceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/compliance")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class ComplianceController {

    private final ComplianceService complianceService;

    @PostMapping
    public ResponseEntity<ApiResponse<ComplianceDTO>> createCompliance(@Valid @RequestBody Compliance compliance) {
        Compliance created = complianceService.createCompliance(compliance);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Compliance record created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ComplianceDTO>> getComplianceById(@PathVariable String id) {
        Compliance compliance = complianceService.getComplianceById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(compliance)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<ComplianceDTO>>> getComplianceByTenant(@PathVariable String tenantId) {
        List<Compliance> records = complianceService.getComplianceByTenant(tenantId);
        List<ComplianceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<ComplianceDTO>>> getComplianceByVehicle(@PathVariable String vehicleId) {
        List<Compliance> records = complianceService.getComplianceByVehicle(vehicleId);
        List<ComplianceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/expired")
    public ResponseEntity<ApiResponse<List<ComplianceDTO>>> getExpiredCompliance() {
        List<Compliance> records = complianceService.getExpiredCompliance();
        List<ComplianceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/expiring/{tenantId}")
    public ResponseEntity<ApiResponse<List<ComplianceDTO>>> getExpiringSoon(@PathVariable String tenantId) {
        List<Compliance> records = complianceService.getExpiringSoon(tenantId);
        List<ComplianceDTO> dtos = records.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ComplianceDTO>> updateCompliance(@PathVariable String id, @Valid @RequestBody Compliance compliance) {
        Compliance updated = complianceService.updateCompliance(id, compliance);
        return ResponseEntity.ok(ApiResponse.success("Compliance record updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCompliance(@PathVariable String id) {
        complianceService.deleteCompliance(id);
        return ResponseEntity.ok(ApiResponse.success("Compliance record deleted successfully", null));
    }

    private ComplianceDTO convertToDTO(Compliance compliance) {
        ComplianceDTO dto = new ComplianceDTO();
        dto.setId(compliance.getId());
        dto.setTenantId(compliance.getTenant() != null ? compliance.getTenant().getId() : null);
        dto.setVehicleId(compliance.getVehicle() != null ? compliance.getVehicle().getId() : null);
        dto.setVehicleRegistration(compliance.getVehicle() != null ? compliance.getVehicle().getRegistration() : null);
        dto.setDriverId(compliance.getDriver() != null ? compliance.getDriver().getId() : null);
        dto.setDriverName(compliance.getDriver() != null ? compliance.getDriver().getName() : null);
        dto.setType(compliance.getType());
        dto.setValidFrom(compliance.getValidFrom());
        dto.setValidUntil(compliance.getValidUntil());
        dto.setStatus(compliance.getStatus());
        dto.setDocumentUrl(compliance.getDocumentUrl());
        dto.setNotes(compliance.getNotes());
        dto.setCreatedAt(compliance.getCreatedAt());
        return dto;
    }
}