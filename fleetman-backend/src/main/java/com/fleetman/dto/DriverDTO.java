package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class DriverDTO {
    private String id;
    private String tenantId;
    private String userId;
    private String name;
    private String licenseNumber;
    private LocalDate licenseExpiry;
    private String driverId;
    private String assignedVehicleId;
    private String assignedVehicleRegistration;
    private Integer safetyScore;
    private String training;
    private String status;
    private String phone;
    private String email;
    private LocalDateTime createdAt;
}