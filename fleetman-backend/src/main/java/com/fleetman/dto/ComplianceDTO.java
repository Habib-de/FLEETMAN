package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class ComplianceDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String type;
    private LocalDate validFrom;
    private LocalDate validUntil;
    private String status;
    private String documentUrl;
    private String notes;
    private LocalDateTime createdAt;
}