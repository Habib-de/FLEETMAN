package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class VehicleDTO {
    // ============================================
    // EXISTING FIELDS
    // ============================================
    private String id;
    private String tenantId;
    private String registration;
    private String vin;
    private String make;
    private String model;
    private Integer year;
    private String category;
    private String status;
    private BigDecimal mileage;
    private String owner;
    private String costCentre;
    private String location;
    private String custodian;
    private String insurance;
    private String permit;
    private LocalDate licenseExpiry;
    private LocalDate roadworthy;
    private String accessories;
    private LocalDate lastService;
    private LocalDate nextService;
    private LocalDateTime createdAt;
    
    // ============================================
    // ✅ NEW FIELDS FOR VEHICLE DETAILS
    // ============================================
    private String color;
    private String fuelType;
    private String engineSize;
    private String transmission;
    private LocalDate acquisitionDate;
    private BigDecimal acquisitionCost;
    private LocalDate disposalDate;
    private String disposalReason;
    
    // ============================================
    // ✅ DRIVER ASSIGNMENT
    // ============================================
    private String driverId;
    private String driverName;
}