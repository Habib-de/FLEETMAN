package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class GeofenceDTO {
    private String id;
    private String tenantId;
    private String name;
    private String type;
    private BigDecimal centerLat;
    private BigDecimal centerLng;
    private BigDecimal radius;
    private String coordinates;
    private String color;
    private Boolean isActive;
    private LocalDateTime createdAt;

    private BigDecimal routeDistance;
    
    // ✅ ADD THESE FIELDS FOR VEHICLE ASSIGNMENTS
    private Integer vehicleCount;
    private List<String> assignedVehicleIds;
}