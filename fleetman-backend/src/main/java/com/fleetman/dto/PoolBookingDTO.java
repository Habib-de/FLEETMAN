package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class PoolBookingDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String bookedById;
    private String bookedByName;
    private String purpose;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
    private BigDecimal handoverOdometer;
    private BigDecimal returnOdometer;
    private String conditionNotes;
    private LocalDateTime createdAt;
}