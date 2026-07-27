package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.FuelRefillDTO;
import com.fleetman.entity.FuelRefill;
import com.fleetman.service.FuelRefillService;
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
@RequestMapping("/fuel")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class FuelRefillController {

    private final FuelRefillService fuelRefillService;

    @PostMapping
    public ResponseEntity<ApiResponse<FuelRefillDTO>> createFuelRefill(@Valid @RequestBody FuelRefill fuelRefill) {
        FuelRefill created = fuelRefillService.createFuelRefill(fuelRefill);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Fuel refill created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FuelRefillDTO>> getFuelRefillById(@PathVariable String id) {
        FuelRefill fuelRefill = fuelRefillService.getFuelRefillById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(fuelRefill)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<FuelRefillDTO>>> getFuelRefillsByTenant(@PathVariable String tenantId) {
        List<FuelRefill> refills = fuelRefillService.getFuelRefillsByTenant(tenantId);
        List<FuelRefillDTO> dtos = refills.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<FuelRefillDTO>>> getFuelRefillsByVehicle(@PathVariable String vehicleId) {
        List<FuelRefill> refills = fuelRefillService.getFuelRefillsByVehicle(vehicleId);
        List<FuelRefillDTO> dtos = refills.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}/between")
    public ResponseEntity<ApiResponse<List<FuelRefillDTO>>> getFuelRefillsByVehicleAndDateRange(
            @PathVariable String vehicleId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<FuelRefill> refills = fuelRefillService.getFuelRefillsByVehicleAndDateRange(vehicleId, start, end);
        List<FuelRefillDTO> dtos = refills.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/total/{vehicleId}")
    public ResponseEntity<ApiResponse<Double>> getTotalFuelConsumed(@PathVariable String vehicleId) {
        Double total = fuelRefillService.getTotalFuelConsumed(vehicleId);
        return ResponseEntity.ok(ApiResponse.success(total));
    }

    @GetMapping("/efficiency/{vehicleId}")
    public ResponseEntity<ApiResponse<Double>> getAverageEfficiency(@PathVariable String vehicleId) {
        Double efficiency = fuelRefillService.getAverageEfficiency(vehicleId);
        return ResponseEntity.ok(ApiResponse.success(efficiency));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<FuelRefillDTO>> updateFuelRefill(@PathVariable String id, @Valid @RequestBody FuelRefill fuelRefill) {
        FuelRefill updated = fuelRefillService.updateFuelRefill(id, fuelRefill);
        return ResponseEntity.ok(ApiResponse.success("Fuel refill updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteFuelRefill(@PathVariable String id) {
        fuelRefillService.deleteFuelRefill(id);
        return ResponseEntity.ok(ApiResponse.success("Fuel refill deleted successfully", null));
    }

    private FuelRefillDTO convertToDTO(FuelRefill refill) {
        FuelRefillDTO dto = new FuelRefillDTO();
        dto.setId(refill.getId());
        dto.setTenantId(refill.getTenant() != null ? refill.getTenant().getId() : null);
        dto.setVehicleId(refill.getVehicle() != null ? refill.getVehicle().getId() : null);
        dto.setVehicleRegistration(refill.getVehicle() != null ? refill.getVehicle().getRegistration() : null);
        dto.setDriverId(refill.getDriver() != null ? refill.getDriver().getId() : null);
        dto.setDriverName(refill.getDriver() != null ? refill.getDriver().getName() : null);
        dto.setDateTime(refill.getDateTime());
        dto.setStation(refill.getStation());
        dto.setLitres(refill.getLitres());
        dto.setCost(refill.getCost());
        dto.setOdometer(refill.getOdometer());
        dto.setEfficiency(refill.getEfficiency());
        dto.setStatus(refill.getStatus());
        dto.setNotes(refill.getNotes());
        // ✅ ADD THIS LINE
        dto.setReceiptImage(refill.getReceiptImage());
        dto.setCreatedAt(refill.getCreatedAt());
        return dto;
    }
}