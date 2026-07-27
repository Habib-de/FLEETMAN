package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ReportScheduleDTO {
    private String id;
    private String tenantId;
    private String name;
    private String reportType;
    private String schedule;
    private String recipients;
    private String format;
    private String filters;
    private String status;
    private LocalDateTime lastRun;
    private LocalDateTime nextRun;
    private LocalDateTime createdAt;
}