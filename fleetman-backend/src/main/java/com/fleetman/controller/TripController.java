package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.TripDTO;
import com.fleetman.entity.Trip;
import com.fleetman.service.TripService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/trips")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class TripController {

    private final TripService tripService;

    @PostMapping
    public ResponseEntity<ApiResponse<TripDTO>> createTrip(@Valid @RequestBody Trip trip) {
        Trip created = tripService.createTrip(trip);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Trip created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TripDTO>> getTripById(@PathVariable String id) {
        Trip trip = tripService.getTripById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(trip)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<TripDTO>>> getTripsByTenant(@PathVariable String tenantId) {
        List<Trip> trips = tripService.getTripsByTenant(tenantId);
        List<TripDTO> dtos = trips.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<TripDTO>>> getTripsByVehicle(@PathVariable String vehicleId) {
        List<Trip> trips = tripService.getTripsByVehicle(vehicleId);
        List<TripDTO> dtos = trips.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}/active")
    public ResponseEntity<ApiResponse<List<TripDTO>>> getActiveTripsByVehicle(@PathVariable String vehicleId) {
        List<Trip> trips = tripService.getActiveTripsByVehicle(vehicleId);
        List<TripDTO> dtos = trips.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/driver/{driverId}")
    public ResponseEntity<ApiResponse<List<TripDTO>>> getTripsByDriver(@PathVariable String driverId) {
        List<Trip> trips = tripService.getTripsByDriver(driverId);
        List<TripDTO> dtos = trips.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/between")
    public ResponseEntity<ApiResponse<List<TripDTO>>> getTripsBetweenDates(
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        List<Trip> trips = tripService.getTripsBetweenDates(start, end);
        List<TripDTO> dtos = trips.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TripDTO>> updateTrip(@PathVariable String id, @Valid @RequestBody Trip trip) {
        Trip updated = tripService.updateTrip(id, trip);
        return ResponseEntity.ok(ApiResponse.success("Trip updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteTrip(@PathVariable String id) {
        tripService.deleteTrip(id);
        return ResponseEntity.ok(ApiResponse.success("Trip deleted successfully", null));
    }

    @GetMapping("/count/active/{tenantId}")
    public ResponseEntity<ApiResponse<Long>> countActiveTrips(@PathVariable String tenantId) {
        long count = tripService.countActiveTrips(tenantId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    private TripDTO convertToDTO(Trip trip) {
        TripDTO dto = new TripDTO();
        dto.setId(trip.getId());
        dto.setTenantId(trip.getTenant() != null ? trip.getTenant().getId() : null);
        dto.setVehicleId(trip.getVehicle() != null ? trip.getVehicle().getId() : null);
        dto.setVehicleRegistration(trip.getVehicle() != null ? trip.getVehicle().getRegistration() : null);
        dto.setDriverId(trip.getDriver() != null ? trip.getDriver().getId() : null);
        dto.setDriverName(trip.getDriver() != null ? trip.getDriver().getName() : null);
        dto.setStartLocation(trip.getStartLocation());
        dto.setEndLocation(trip.getEndLocation());
        dto.setStartTime(trip.getStartTime());
        dto.setEndTime(trip.getEndTime());
        dto.setDistance(trip.getDistance());
        dto.setFuelUsed(trip.getFuelUsed());
        dto.setAverageSpeed(trip.getAverageSpeed());
        dto.setCost(trip.getCost());
        dto.setStatus(trip.getStatus());
        dto.setStartOdometer(trip.getStartOdometer());
        dto.setEndOdometer(trip.getEndOdometer());
        dto.setPurpose(trip.getPurpose());
        dto.setCreatedAt(trip.getCreatedAt());
        return dto;
    }
}