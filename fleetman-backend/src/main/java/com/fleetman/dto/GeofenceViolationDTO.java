package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class GeofenceViolationDTO {
    private String id;
    private String tenantId;
    private String geofenceId;
    private String geofenceName;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String violationType;
    private BigDecimal lat;
    private BigDecimal lng;
    private LocalDateTime timestamp;
    private Boolean resolved;
    private LocalDateTime resolvedAt;
    private LocalDateTime createdAt;
}