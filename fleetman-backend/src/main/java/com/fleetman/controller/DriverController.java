package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.DriverDTO;
import com.fleetman.entity.Driver;
import com.fleetman.service.DriverService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/drivers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")  // ✅ ADDED 'driver'
public class DriverController {

    private final DriverService driverService;

    @PostMapping
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")  // Only admins can create drivers
    public ResponseEntity<ApiResponse<DriverDTO>> createDriver(@Valid @RequestBody Driver driver) {
        Driver created = driverService.createDriver(driver);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Driver created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DriverDTO>> getDriverById(@PathVariable String id) {
        Driver driver = driverService.getDriverById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(driver)));
    }

    @GetMapping("/license/{licenseNumber}")
    public ResponseEntity<ApiResponse<DriverDTO>> getDriverByLicenseNumber(@PathVariable String licenseNumber) {
        Driver driver = driverService.getDriverByLicenseNumber(licenseNumber);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(driver)));
    }

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")  // ✅ Add explicit annotation
    public ResponseEntity<ApiResponse<List<DriverDTO>>> getDriversByTenant(@PathVariable String tenantId) {
        List<Driver> drivers = driverService.getDriversByTenant(tenantId);
        List<DriverDTO> dtos = drivers.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/tenant/{tenantId}/status/{status}")
    public ResponseEntity<ApiResponse<List<DriverDTO>>> getDriversByTenantAndStatus(
            @PathVariable String tenantId,
            @PathVariable String status) {
        List<Driver> drivers = driverService.getDriversByTenantAndStatus(tenantId, status);
        List<DriverDTO> dtos = drivers.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/safety-score/{tenantId}/{threshold}")
    public ResponseEntity<ApiResponse<List<DriverDTO>>> getDriversWithLowSafetyScore(
            @PathVariable String tenantId,
            @PathVariable int threshold) {
        List<Driver> drivers = driverService.getDriversWithLowSafetyScore(tenantId, threshold);
        List<DriverDTO> dtos = drivers.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<DriverDTO>> updateDriver(@PathVariable String id, @Valid @RequestBody Driver driver) {
        Driver updated = driverService.updateDriver(id, driver);
        return ResponseEntity.ok(ApiResponse.success("Driver updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")  // Only admins can delete drivers
    public ResponseEntity<ApiResponse<Void>> deleteDriver(@PathVariable String id) {
        driverService.deleteDriver(id);
        return ResponseEntity.ok(ApiResponse.success("Driver deleted successfully", null));
    }

    private DriverDTO convertToDTO(Driver driver) {
        DriverDTO dto = new DriverDTO();
        dto.setId(driver.getId());
        dto.setTenantId(driver.getTenant() != null ? driver.getTenant().getId() : null);
        dto.setUserId(driver.getUser() != null ? driver.getUser().getId() : null);
        dto.setName(driver.getName());
        dto.setLicenseNumber(driver.getLicenseNumber());
        dto.setLicenseExpiry(driver.getLicenseExpiry());
        dto.setDriverId(driver.getDriverId());
        dto.setAssignedVehicleId(driver.getAssignedVehicle() != null ? driver.getAssignedVehicle().getId() : null);
        dto.setAssignedVehicleRegistration(driver.getAssignedVehicle() != null ? driver.getAssignedVehicle().getRegistration() : null);
        dto.setSafetyScore(driver.getSafetyScore());
        dto.setTraining(driver.getTraining());
        dto.setStatus(driver.getStatus());
        dto.setPhone(driver.getPhone());
        dto.setEmail(driver.getEmail());
        dto.setCreatedAt(driver.getCreatedAt());
        return dto;
    }
}