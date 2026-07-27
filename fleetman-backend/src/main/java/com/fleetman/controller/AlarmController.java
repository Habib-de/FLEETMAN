package com.fleetman.controller;

import com.fleetman.dto.AlarmDTO;
import com.fleetman.dto.ApiResponse;
import com.fleetman.entity.Alarm;
import com.fleetman.service.AlarmService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/alarms")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
public class AlarmController {

    private final AlarmService alarmService;

    @PostMapping
    public ResponseEntity<ApiResponse<AlarmDTO>> createAlarm(@Valid @RequestBody Alarm alarm) {
        Alarm created = alarmService.createAlarm(alarm);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Alarm created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AlarmDTO>> getAlarmById(@PathVariable String id) {
        Alarm alarm = alarmService.getAlarmById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(alarm)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<AlarmDTO>>> getAlarmsByTenant(@PathVariable String tenantId) {
        List<Alarm> alarms = alarmService.getAlarmsByTenant(tenantId);
        List<AlarmDTO> dtos = alarms.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/vehicle/{vehicleId}")
    public ResponseEntity<ApiResponse<List<AlarmDTO>>> getAlarmsByVehicle(@PathVariable String vehicleId) {
        List<Alarm> alarms = alarmService.getAlarmsByVehicle(vehicleId);
        List<AlarmDTO> dtos = alarms.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/unresolved")
    public ResponseEntity<ApiResponse<List<AlarmDTO>>> getUnresolvedAlarms() {
        List<Alarm> alarms = alarmService.getUnresolvedAlarms();
        List<AlarmDTO> dtos = alarms.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<AlarmDTO>> updateAlarm(@PathVariable String id, @Valid @RequestBody Alarm alarm) {
        Alarm updated = alarmService.updateAlarm(id, alarm);
        return ResponseEntity.ok(ApiResponse.success("Alarm updated successfully", convertToDTO(updated)));
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<ApiResponse<Void>> resolveAlarm(@PathVariable String id) {
        alarmService.resolveAlarm(id);
        return ResponseEntity.ok(ApiResponse.success("Alarm resolved successfully", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteAlarm(@PathVariable String id) {
        alarmService.deleteAlarm(id);
        return ResponseEntity.ok(ApiResponse.success("Alarm deleted successfully", null));
    }

    private AlarmDTO convertToDTO(Alarm alarm) {
        AlarmDTO dto = new AlarmDTO();
        dto.setId(alarm.getId());
        dto.setTenantId(alarm.getTenant() != null ? alarm.getTenant().getId() : null);
        dto.setVehicleId(alarm.getVehicle() != null ? alarm.getVehicle().getId() : null);
        dto.setVehicleRegistration(alarm.getVehicle() != null ? alarm.getVehicle().getRegistration() : null);
        dto.setDriverId(alarm.getDriver() != null ? alarm.getDriver().getId() : null);
        dto.setDriverName(alarm.getDriver() != null ? alarm.getDriver().getName() : null);
        dto.setType(alarm.getType());
        dto.setSeverity(alarm.getSeverity());
        dto.setMessage(alarm.getMessage());
        dto.setLat(alarm.getLat());
        dto.setLng(alarm.getLng());
        dto.setResolved(alarm.getResolved());
        dto.setResolvedAt(alarm.getResolvedAt());
        dto.setCreatedAt(alarm.getCreatedAt());
        return dto;
    }
}