// src/main/java/com/fleetman/dto/ChecklistDTO.java
package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ChecklistDTO {
    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String driverId;
    private String driverName;
    private String type;
    private String status;
    private String items;
    private Integer totalItems;
    private Integer passedItems;
    private Integer failedItems;
    private Integer defects;
    private Integer completionRate;
    private String signature;
    private LocalDateTime inspectionDate;
    private LocalDateTime submittedAt;
    private String submittedTo;
    private LocalDateTime createdAt;
}