package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.TenantDTO;
import com.fleetman.entity.Tenant;
import com.fleetman.service.TenantService;
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
@RequestMapping("/tenants")
@RequiredArgsConstructor
// ❌ REMOVE THIS: @PreAuthorize("hasRole('super_admin')")
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    @PreAuthorize("hasRole('super_admin')")
    public ResponseEntity<ApiResponse<Tenant>> createTenant(@Valid @RequestBody Tenant tenant) {
        Tenant created = tenantService.createTenant(tenant);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Tenant created successfully", created));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
    public ResponseEntity<ApiResponse<List<TenantDTO>>> getAllTenants() {
        List<Tenant> tenants = tenantService.getAllTenants();
        List<TenantDTO> dtos = tenants.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
    public ResponseEntity<ApiResponse<TenantDTO>> getTenantById(@PathVariable String id) {
        Tenant tenant = tenantService.getTenantById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(tenant)));
    }

    @GetMapping("/subdomain/{subdomain}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<TenantDTO>> getTenantBySubdomain(@PathVariable String subdomain) {
        Tenant tenant = tenantService.getTenantBySubdomain(subdomain);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(tenant)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<TenantDTO>> updateTenant(@PathVariable String id, @Valid @RequestBody Tenant tenant) {
        Tenant updated = tenantService.updateTenant(id, tenant);
        return ResponseEntity.ok(ApiResponse.success("Tenant updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('super_admin')")
    public ResponseEntity<ApiResponse<Void>> deleteTenant(@PathVariable String id) {
        tenantService.deleteTenant(id);
        return ResponseEntity.ok(ApiResponse.success("Tenant deleted successfully", null));
    }

    @GetMapping("/{id}/card-pooling")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<Boolean>> isCardPoolingEnabled(@PathVariable String id) {
        boolean enabled = tenantService.isCardPoolingEnabled(id);
        return ResponseEntity.ok(ApiResponse.success(enabled));
    }

    // ✅ FIXED: Allow car_owner to access location endpoints
    @PutMapping("/{id}/location")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")  // ← Changed!
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTenantLocation(
            @PathVariable String id,
            @RequestBody Map<String, Object> locationData) {
        
        Tenant tenant = tenantService.updateTenantLocation(id, locationData);
        Map<String, Object> location = tenantService.getTenantLocation(id);
        return ResponseEntity.ok(ApiResponse.success("Location updated successfully", location));
    }

    // ✅ FIXED: Allow car_owner to access location endpoints
    @GetMapping("/{id}/location")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")  // ← Changed!
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTenantLocation(@PathVariable String id) {
        Map<String, Object> location = tenantService.getTenantLocation(id);
        if (location == null) {
            return ResponseEntity.ok(ApiResponse.success("No location set", null));
        }
        return ResponseEntity.ok(ApiResponse.success(location));
    }

    // ============================================
// ✅ POOL BOOKING ENDPOINTS
// ============================================

@PostMapping("/{id}/pool-booking/request")
@PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
public ResponseEntity<ApiResponse<TenantDTO>> requestPoolBooking(
        @PathVariable String id,
        @RequestParam Boolean enabled) {
    Tenant updated = tenantService.requestPoolBooking(id, enabled);
    return ResponseEntity.ok(ApiResponse.success("Pool booking request updated", convertToDTO(updated)));
}

@PostMapping("/{id}/pool-booking/approve")
@PreAuthorize("hasRole('super_admin')")
public ResponseEntity<ApiResponse<TenantDTO>> approvePoolBooking(@PathVariable String id) {
    Tenant updated = tenantService.approvePoolBooking(id);
    return ResponseEntity.ok(ApiResponse.success("Pool booking approved", convertToDTO(updated)));
}

@PostMapping("/{id}/pool-booking/deny")
@PreAuthorize("hasRole('super_admin')")
public ResponseEntity<ApiResponse<TenantDTO>> denyPoolBooking(
        @PathVariable String id,
        @RequestParam String reason) {
    Tenant updated = tenantService.denyPoolBooking(id, reason);
    return ResponseEntity.ok(ApiResponse.success("Pool booking denied", convertToDTO(updated)));
}

@GetMapping("/{id}/pool-booking/available")
@PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
public ResponseEntity<ApiResponse<Boolean>> isPoolBookingAvailable(@PathVariable String id) {
    boolean available = tenantService.isPoolBookingAvailable(id);
    return ResponseEntity.ok(ApiResponse.success(available));
}

@GetMapping("/pool-booking/requests")
@PreAuthorize("hasRole('super_admin')")
public ResponseEntity<ApiResponse<List<TenantDTO>>> getTenantsWithPoolBookingRequests() {
    List<Tenant> tenants = tenantService.getTenantsWithPoolBookingRequests();
    List<TenantDTO> dtos = tenants.stream().map(this::convertToDTO).collect(Collectors.toList());
    return ResponseEntity.ok(ApiResponse.success(dtos));
}

    private TenantDTO convertToDTO(Tenant tenant) {
        TenantDTO dto = new TenantDTO();
        dto.setId(tenant.getId());
        dto.setName(tenant.getName());
        dto.setSubdomain(tenant.getSubdomain());
        dto.setStatus(tenant.getStatus());
        dto.setConfig(tenant.getConfig());
        dto.setCardPoolingEnabled(tenant.getCardPoolingEnabled());
        dto.setCreatedAt(tenant.getCreatedAt());
        dto.setUpdatedAt(tenant.getUpdatedAt());
        dto.setPoolBookingEnabled(tenant.getPoolBookingEnabled());
        dto.setPoolBookingApproved(tenant.getPoolBookingApproved());
        dto.setPoolBookingRequestedAt(tenant.getPoolBookingRequestedAt());
        dto.setPoolBookingApprovedAt(tenant.getPoolBookingApprovedAt());
        dto.setPoolBookingDeniedReason(tenant.getPoolBookingDeniedReason());
        return dto;
    }
}