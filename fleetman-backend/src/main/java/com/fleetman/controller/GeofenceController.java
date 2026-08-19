package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.GeofenceDTO;
import com.fleetman.dto.VehicleDTO;
import com.fleetman.entity.Geofence;
import com.fleetman.entity.Vehicle;
import com.fleetman.service.GeofenceService;
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
@RequestMapping("/geofences")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class GeofenceController {

    private final GeofenceService geofenceService;

    @PostMapping
    public ResponseEntity<ApiResponse<GeofenceDTO>> createGeofence(@Valid @RequestBody Geofence geofence) {
        Geofence created = geofenceService.createGeofence(geofence);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Geofence created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<GeofenceDTO>> getGeofenceById(@PathVariable String id) {
        Geofence geofence = geofenceService.getGeofenceById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(geofence)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<GeofenceDTO>>> getGeofencesByTenant(@PathVariable String tenantId) {
        List<Geofence> geofences = geofenceService.getGeofencesByTenant(tenantId);
        List<GeofenceDTO> dtos = geofences.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/tenant/{tenantId}/active")
    public ResponseEntity<ApiResponse<List<GeofenceDTO>>> getActiveGeofencesByTenant(@PathVariable String tenantId) {
        List<Geofence> geofences = geofenceService.getActiveGeofencesByTenant(tenantId);
        List<GeofenceDTO> dtos = geofences.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<GeofenceDTO>> updateGeofence(@PathVariable String id, @Valid @RequestBody Geofence geofence) {
        Geofence updated = geofenceService.updateGeofence(id, geofence);
        return ResponseEntity.ok(ApiResponse.success("Geofence updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteGeofence(@PathVariable String id) {
        geofenceService.deleteGeofence(id);
        return ResponseEntity.ok(ApiResponse.success("Geofence deleted successfully", null));
    }

    // ============================================
    // VEHICLE ASSIGNMENT ENDPOINTS
    // ============================================

    @PostMapping("/{geofenceId}/assign/{vehicleId}")
    public ResponseEntity<ApiResponse<Void>> assignVehicleToGeofence(
            @PathVariable String geofenceId,
            @PathVariable String vehicleId) {
        geofenceService.assignVehicleToGeofence(geofenceId, vehicleId);
        return ResponseEntity.ok(ApiResponse.success("Vehicle assigned to geofence successfully", null));
    }

    @DeleteMapping("/{geofenceId}/unassign/{vehicleId}")
    public ResponseEntity<ApiResponse<Void>> unassignVehicleFromGeofence(
            @PathVariable String geofenceId,
            @PathVariable String vehicleId) {
        geofenceService.unassignVehicleFromGeofence(geofenceId, vehicleId);
        return ResponseEntity.ok(ApiResponse.success("Vehicle unassigned from geofence successfully", null));
    }

    @PostMapping("/{geofenceId}/assign")
    public ResponseEntity<ApiResponse<Void>> assignVehiclesToGeofence(
            @PathVariable String geofenceId,
            @RequestBody Map<String, List<String>> request) {
        List<String> vehicleIds = request.get("vehicleIds");
        geofenceService.assignVehiclesToGeofence(geofenceId, vehicleIds);
        return ResponseEntity.ok(ApiResponse.success("Vehicles assigned to geofence successfully", null));
    }

    @GetMapping("/{geofenceId}/vehicles")
    public ResponseEntity<ApiResponse<List<VehicleDTO>>> getAssignedVehiclesForGeofence(@PathVariable String geofenceId) {
        List<Vehicle> vehicles = geofenceService.getAssignedVehiclesForGeofence(geofenceId);
        List<VehicleDTO> dtos = vehicles.stream()
                .map(this::convertVehicleToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/{geofenceId}/vehicle-ids")
    public ResponseEntity<ApiResponse<List<String>>> getAssignedVehicleIdsForGeofence(@PathVariable String geofenceId) {
        List<String> vehicleIds = geofenceService.getAssignedVehicleIdsForGeofence(geofenceId);
        return ResponseEntity.ok(ApiResponse.success(vehicleIds));
    }

    @GetMapping("/{geofenceId}/vehicle-count")
    public ResponseEntity<ApiResponse<Integer>> getVehicleCountForGeofence(@PathVariable String geofenceId) {
        int count = geofenceService.getVehicleCountForGeofence(geofenceId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    // ============================================
    // CONVERTER METHODS
    // ============================================

    private GeofenceDTO convertToDTO(Geofence geofence) {
        GeofenceDTO dto = new GeofenceDTO();
        dto.setId(geofence.getId());
        dto.setTenantId(geofence.getTenant() != null ? geofence.getTenant().getId() : null);
        dto.setName(geofence.getName());
        dto.setType(geofence.getType());
        dto.setCenterLat(geofence.getCenterLat());
        dto.setCenterLng(geofence.getCenterLng());
        dto.setRadius(geofence.getRadius());
        dto.setCoordinates(geofence.getCoordinates());
        dto.setColor(geofence.getColor());
        dto.setIsActive(geofence.getIsActive());
        dto.setCreatedAt(geofence.getCreatedAt());

        dto.setRouteDistance(geofence.getRouteDistance());
        
        // ✅ Add vehicle count and assigned vehicle IDs
        int vehicleCount = geofenceService.getVehicleCountForGeofence(geofence.getId());
        dto.setVehicleCount(vehicleCount);
        
        List<String> vehicleIds = geofenceService.getAssignedVehicleIdsForGeofence(geofence.getId());
        dto.setAssignedVehicleIds(vehicleIds);
        
        return dto;
    }

    private VehicleDTO convertVehicleToDTO(Vehicle vehicle) {
        VehicleDTO dto = new VehicleDTO();
        dto.setId(vehicle.getId());
        dto.setRegistration(vehicle.getRegistration());
        dto.setMake(vehicle.getMake());
        dto.setModel(vehicle.getModel());
        dto.setYear(vehicle.getYear());
        dto.setStatus(vehicle.getStatus());
        dto.setColor(vehicle.getColor());
        dto.setFuelType(vehicle.getFuelType());
        return dto;
    }
}