package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.PoolBookingDTO;
import com.fleetman.entity.PoolBooking;
import com.fleetman.service.PoolBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/pool")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
public class PoolBookingController {

    private final PoolBookingService poolBookingService;

    @PostMapping
    public ResponseEntity<ApiResponse<PoolBookingDTO>> createPoolBooking(@Valid @RequestBody PoolBooking poolBooking) {
        PoolBooking created = poolBookingService.createPoolBooking(poolBooking);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Pool booking created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<PoolBookingDTO>> getPoolBookingById(@PathVariable String id) {
        PoolBooking booking = poolBookingService.getPoolBookingById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(booking)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<PoolBookingDTO>>> getPoolBookingsByTenant(@PathVariable String tenantId) {
        List<PoolBooking> bookings = poolBookingService.getPoolBookingsByTenant(tenantId);
        List<PoolBookingDTO> dtos = bookings.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<PoolBookingDTO>>> getPoolBookingsByVehicle(@PathVariable String vehicleId) {
        List<PoolBooking> bookings = poolBookingService.getPoolBookingsByVehicle(vehicleId);
        List<PoolBookingDTO> dtos = bookings.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}/active")
    public ResponseEntity<ApiResponse<List<PoolBookingDTO>>> getActiveBookingsForVehicle(@PathVariable String vehicleId) {
        List<PoolBooking> bookings = poolBookingService.getActiveBookingsForVehicle(vehicleId);
        List<PoolBookingDTO> dtos = bookings.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<PoolBookingDTO>> updatePoolBooking(@PathVariable String id, @Valid @RequestBody PoolBooking booking) {
        PoolBooking updated = poolBookingService.updatePoolBooking(id, booking);
        return ResponseEntity.ok(ApiResponse.success("Pool booking updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deletePoolBooking(@PathVariable String id) {
        poolBookingService.deletePoolBooking(id);
        return ResponseEntity.ok(ApiResponse.success("Pool booking deleted successfully", null));
    }

    private PoolBookingDTO convertToDTO(PoolBooking booking) {
        PoolBookingDTO dto = new PoolBookingDTO();
        dto.setId(booking.getId());
        dto.setTenantId(booking.getTenant() != null ? booking.getTenant().getId() : null);
        dto.setVehicleId(booking.getVehicle() != null ? booking.getVehicle().getId() : null);
        dto.setVehicleRegistration(booking.getVehicle() != null ? booking.getVehicle().getRegistration() : null);
        dto.setDriverId(booking.getDriver() != null ? booking.getDriver().getId() : null);
        dto.setDriverName(booking.getDriver() != null ? booking.getDriver().getName() : null);
        dto.setBookedById(booking.getBookedBy() != null ? booking.getBookedBy().getId() : null);
        dto.setBookedByName(booking.getBookedBy() != null ? booking.getBookedBy().getName() : null);
        dto.setPurpose(booking.getPurpose());
        dto.setStartTime(booking.getStartTime());
        dto.setEndTime(booking.getEndTime());
        dto.setStatus(booking.getStatus());
        dto.setHandoverOdometer(booking.getHandoverOdometer());
        dto.setReturnOdometer(booking.getReturnOdometer());
        dto.setConditionNotes(booking.getConditionNotes());
        dto.setCreatedAt(booking.getCreatedAt());
        return dto;
    }
}