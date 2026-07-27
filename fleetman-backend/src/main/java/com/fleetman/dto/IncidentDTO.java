package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class IncidentDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String incidentType;
    private String severity;
    private String status;
    private String location;
    private String description;
    private String policeReport;
    private BigDecimal cost;
    private String attachments;
    private String reportedBy;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}