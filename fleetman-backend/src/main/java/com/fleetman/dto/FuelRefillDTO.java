package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class FuelRefillDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private LocalDateTime dateTime;
    private String station;
    private BigDecimal litres;
    private BigDecimal cost;
    private BigDecimal odometer;
    private BigDecimal efficiency;
    private String status;
    private String notes;
    private String receiptImage;  // ✅ ADD THIS - Base64 image or URL
    private LocalDateTime createdAt;
}