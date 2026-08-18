package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.VehicleDTO;
import com.fleetman.entity.Vehicle;
import com.fleetman.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/vehicles")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<VehicleDTO>> createVehicle(@Valid @RequestBody Vehicle vehicle) {
        Vehicle created = vehicleService.createVehicle(vehicle);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Vehicle created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<VehicleDTO>> getVehicleById(@PathVariable String id) {
        Vehicle vehicle = vehicleService.getVehicleById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(vehicle)));
    }

    @GetMapping("/registration/{registration}")
    public ResponseEntity<ApiResponse<VehicleDTO>> getVehicleByRegistration(@PathVariable String registration) {
        Vehicle vehicle = vehicleService.getVehicleByRegistration(registration);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(vehicle)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<VehicleDTO>>> getVehiclesByTenant(@PathVariable String tenantId) {
        List<Vehicle> vehicles = vehicleService.getVehiclesByTenant(tenantId);
        List<VehicleDTO> dtos = vehicles.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/tenant/{tenantId}/status/{status}")
    public ResponseEntity<ApiResponse<List<VehicleDTO>>> getVehiclesByTenantAndStatus(
            @PathVariable String tenantId,
            @PathVariable String status) {
        List<Vehicle> vehicles = vehicleService.getVehiclesByTenantAndStatus(tenantId, status);
        List<VehicleDTO> dtos = vehicles.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<VehicleDTO>> updateVehicle(@PathVariable String id, @Valid @RequestBody Vehicle vehicle) {
        Vehicle updated = vehicleService.updateVehicle(id, vehicle);
        return ResponseEntity.ok(ApiResponse.success("Vehicle updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(@PathVariable String id) {
        vehicleService.deleteVehicle(id);
        return ResponseEntity.ok(ApiResponse.success("Vehicle deleted successfully", null));
    }

    @GetMapping("/count/tenant/{tenantId}/status/{status}")
    public ResponseEntity<ApiResponse<Long>> countVehiclesByTenantAndStatus(
            @PathVariable String tenantId,
            @PathVariable String status) {
        long count = vehicleService.countVehiclesByTenantAndStatus(tenantId, status);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    private VehicleDTO convertToDTO(Vehicle vehicle) {
        VehicleDTO dto = new VehicleDTO();
        
        // Existing fields
        dto.setId(vehicle.getId());
        dto.setTenantId(vehicle.getTenant() != null ? vehicle.getTenant().getId() : null);
        dto.setRegistration(vehicle.getRegistration());
        dto.setVin(vehicle.getVin());
        dto.setMake(vehicle.getMake());
        dto.setModel(vehicle.getModel());
        dto.setYear(vehicle.getYear());
        dto.setCategory(vehicle.getCategory());
        dto.setStatus(vehicle.getStatus());
        dto.setMileage(vehicle.getMileage());
        dto.setOwner(vehicle.getOwner());
        dto.setCostCentre(vehicle.getCostCentre());
        dto.setLocation(vehicle.getLocation());
        dto.setCustodian(vehicle.getCustodian());
        dto.setInsurance(vehicle.getInsurance());
        dto.setPermit(vehicle.getPermit());
        dto.setLicenseExpiry(vehicle.getLicenseExpiry());
        dto.setRoadworthy(vehicle.getRoadworthy());
        dto.setAccessories(vehicle.getAccessories());
        dto.setLastService(vehicle.getLastService());
        dto.setNextService(vehicle.getNextService());
        
        // ✅ NEW FIELDS - Add these
        dto.setColor(vehicle.getColor());
        dto.setFuelType(vehicle.getFuelType());
        dto.setEngineSize(vehicle.getEngineSize());
        dto.setTransmission(vehicle.getTransmission());
        dto.setAcquisitionDate(vehicle.getAcquisitionDate());
        dto.setAcquisitionCost(vehicle.getAcquisitionCost());
        dto.setDisposalDate(vehicle.getDisposalDate());
        dto.setDisposalReason(vehicle.getDisposalReason());
        dto.setMaintenanceReason(vehicle.getMaintenanceReason());
        dto.setFuelTankCapacity(vehicle.getFuelTankCapacity() != null ? 
        vehicle.getFuelTankCapacity().doubleValue() : null);
        dto.setCurrentFuelLevel(vehicle.getCurrentFuelLevel() != null ? 
        vehicle.getCurrentFuelLevel().doubleValue() : null);
        dto.setLastFuelReport(vehicle.getLastFuelReport());
        dto.setDriverId(vehicle.getDriver() != null ? vehicle.getDriver().getId() : null);
        dto.setDriverName(vehicle.getDriver() != null ? vehicle.getDriver().getName() : null);
        
        dto.setCreatedAt(vehicle.getCreatedAt());
        return dto;
    }
}