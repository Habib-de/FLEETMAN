package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.ReportScheduleDTO;
import com.fleetman.entity.ReportSchedule;
import com.fleetman.service.ReportScheduleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
public class ReportScheduleController {

    private final ReportScheduleService reportScheduleService;

    @PostMapping("/schedule")
    public ResponseEntity<ApiResponse<ReportScheduleDTO>> createReportSchedule(@Valid @RequestBody ReportSchedule schedule) {
        ReportSchedule created = reportScheduleService.createReportSchedule(schedule);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Report schedule created successfully", convertToDTO(created)));
    }

    @GetMapping("/schedule/{id}")
    public ResponseEntity<ApiResponse<ReportScheduleDTO>> getReportScheduleById(@PathVariable String id) {
        ReportSchedule schedule = reportScheduleService.getReportScheduleById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(schedule)));
    }

    @GetMapping("/schedule/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<ReportScheduleDTO>>> getReportSchedulesByTenant(@PathVariable String tenantId) {
        List<ReportSchedule> schedules = reportScheduleService.getReportSchedulesByTenant(tenantId);
        List<ReportScheduleDTO> dtos = schedules.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/schedule/pending")
    @PreAuthorize("hasRole('super_admin')")
    public ResponseEntity<ApiResponse<List<ReportScheduleDTO>>> getScheduledReports() {
        List<ReportSchedule> schedules = reportScheduleService.getScheduledReports();
        List<ReportScheduleDTO> dtos = schedules.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/schedule/{id}")
    public ResponseEntity<ApiResponse<ReportScheduleDTO>> updateReportSchedule(@PathVariable String id, @Valid @RequestBody ReportSchedule schedule) {
        ReportSchedule updated = reportScheduleService.updateReportSchedule(id, schedule);
        return ResponseEntity.ok(ApiResponse.success("Report schedule updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/schedule/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReportSchedule(@PathVariable String id) {
        reportScheduleService.deleteReportSchedule(id);
        return ResponseEntity.ok(ApiResponse.success("Report schedule deleted successfully", null));
    }

    private ReportScheduleDTO convertToDTO(ReportSchedule schedule) {
        ReportScheduleDTO dto = new ReportScheduleDTO();
        dto.setId(schedule.getId());
        dto.setTenantId(schedule.getTenant() != null ? schedule.getTenant().getId() : null);
        dto.setName(schedule.getName());
        dto.setReportType(schedule.getReportType());
        dto.setSchedule(schedule.getSchedule());
        dto.setRecipients(schedule.getRecipients());
        dto.setFormat(schedule.getFormat());
        dto.setFilters(schedule.getFilters());
        dto.setStatus(schedule.getStatus());
        dto.setLastRun(schedule.getLastRun());
        dto.setNextRun(schedule.getNextRun());
        dto.setCreatedAt(schedule.getCreatedAt());
        return dto;
    }
}