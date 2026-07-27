package com.fleetman.service;

import com.fleetman.entity.ReportSchedule;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.ReportScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportScheduleService {
    
    private final ReportScheduleRepository reportScheduleRepository;
    
    @Transactional
    public ReportSchedule createReportSchedule(ReportSchedule reportSchedule) {
        return reportScheduleRepository.save(reportSchedule);
    }
    
    public ReportSchedule getReportScheduleById(String id) {
        return reportScheduleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Report schedule not found with id: " + id));
    }
    
    public List<ReportSchedule> getReportSchedulesByTenant(String tenantId) {
        return reportScheduleRepository.findByTenantId(tenantId);
    }
    
    public List<ReportSchedule> getScheduledReports() {
        return reportScheduleRepository.findByNextRunBefore(LocalDateTime.now());
    }
    
    @Transactional
    public ReportSchedule updateReportSchedule(String id, ReportSchedule scheduleDetails) {
        ReportSchedule schedule = getReportScheduleById(id);
        schedule.setName(scheduleDetails.getName());
        schedule.setReportType(scheduleDetails.getReportType());
        schedule.setSchedule(scheduleDetails.getSchedule());
        schedule.setRecipients(scheduleDetails.getRecipients());
        schedule.setFormat(scheduleDetails.getFormat());
        schedule.setFilters(scheduleDetails.getFilters());
        schedule.setStatus(scheduleDetails.getStatus());
        schedule.setNextRun(scheduleDetails.getNextRun());
        return reportScheduleRepository.save(schedule);
    }
    
    @Transactional
    public void deleteReportSchedule(String id) {
        ReportSchedule schedule = getReportScheduleById(id);
        reportScheduleRepository.delete(schedule);
    }
}