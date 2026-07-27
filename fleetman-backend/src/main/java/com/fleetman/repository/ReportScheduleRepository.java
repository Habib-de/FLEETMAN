package com.fleetman.repository;

import com.fleetman.entity.ReportSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ReportScheduleRepository extends JpaRepository<ReportSchedule, String> {
    
    List<ReportSchedule> findByTenantId(String tenantId);
    
    List<ReportSchedule> findByStatus(String status);
    
    List<ReportSchedule> findByNextRunBefore(LocalDateTime dateTime);
}