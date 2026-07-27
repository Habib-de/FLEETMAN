package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.AuditLogDTO;
import com.fleetman.entity.AuditLog;
import com.fleetman.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/audit")
@RequiredArgsConstructor
@PreAuthorize("hasRole('super_admin')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<ApiResponse<AuditLogDTO>> createAuditLog(@RequestBody AuditLog auditLog) {
        AuditLog created = auditLogService.createAuditLog(auditLog);
        return ResponseEntity.ok(ApiResponse.success("Audit log created successfully", convertToDTO(created)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<AuditLogDTO>>> getAuditLogsByTenant(@PathVariable String tenantId) {
        List<AuditLog> logs = auditLogService.getAuditLogsByTenant(tenantId);
        List<AuditLogDTO> dtos = logs.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<AuditLogDTO>>> getAuditLogsByUser(@PathVariable String userId) {
        List<AuditLog> logs = auditLogService.getAuditLogsByUser(userId);
        List<AuditLogDTO> dtos = logs.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/entity")
    public ResponseEntity<ApiResponse<List<AuditLogDTO>>> getAuditLogsByEntity(
            @RequestParam String entityType,
            @RequestParam String entityId) {
        List<AuditLog> logs = auditLogService.getAuditLogsByEntity(entityType, entityId);
        List<AuditLogDTO> dtos = logs.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/action/{action}")
    public ResponseEntity<ApiResponse<List<AuditLogDTO>>> getAuditLogsByAction(@PathVariable String action) {
        List<AuditLog> logs = auditLogService.getAuditLogsByAction(action);
        List<AuditLogDTO> dtos = logs.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    private AuditLogDTO convertToDTO(AuditLog log) {
        AuditLogDTO dto = new AuditLogDTO();
        dto.setId(log.getId());
        dto.setTenantId(log.getTenant() != null ? log.getTenant().getId() : null);
        dto.setUserId(log.getUser() != null ? log.getUser().getId() : null);
        dto.setUserName(log.getUser() != null ? log.getUser().getName() : null);
        dto.setAction(log.getAction());
        dto.setEntityType(log.getEntityType());
        dto.setEntityId(log.getEntityId());
        dto.setOldValues(log.getOldValues());
        dto.setNewValues(log.getNewValues());
        dto.setIpAddress(log.getIpAddress());
        dto.setUserAgent(log.getUserAgent());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }
}