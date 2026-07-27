package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TrackingDataDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private BigDecimal lat;
    private BigDecimal lng;
    private BigDecimal speed;
    private Integer heading;
    private BigDecimal altitude;
    private BigDecimal fuelLevel;
    private BigDecimal engineTemp;
    private Boolean ignition;
    private LocalDateTime timestamp;
    private LocalDateTime createdAt;
}