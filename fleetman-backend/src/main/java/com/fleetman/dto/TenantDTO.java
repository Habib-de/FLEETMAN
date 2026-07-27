package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class TenantDTO {
    private String id;
    private String name;
    private String subdomain;
    private String status;
    private String config;
    private Boolean cardPoolingEnabled;
    // ✅ POOL BOOKING FIELDS
    private Boolean poolBookingEnabled;
    private Boolean poolBookingApproved;
    private LocalDateTime poolBookingRequestedAt;
    private LocalDateTime poolBookingApprovedAt;
    private String poolBookingDeniedReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}