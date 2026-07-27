package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TripDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String startLocation;
    private String endLocation;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private BigDecimal distance;
    private BigDecimal fuelUsed;
    private BigDecimal averageSpeed;
    private BigDecimal cost;
    private String status;
    private BigDecimal startOdometer;
    private BigDecimal endOdometer;
    private String purpose;
    private LocalDateTime createdAt;
}