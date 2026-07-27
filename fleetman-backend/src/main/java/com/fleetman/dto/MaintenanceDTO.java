package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class MaintenanceDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String type;
    private String status;
    private String priority;
    private String description;
    private String reportedBy;
    private LocalDate scheduledDate;
    private LocalDate completedDate;
    private BigDecimal cost;
    private String mechanic;
    private String partsUsed;
    private BigDecimal estimatedHours;
    private BigDecimal actualHours;
    private String receiptImage;
    private LocalDateTime createdAt;
    
}