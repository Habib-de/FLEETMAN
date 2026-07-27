package com.fleetman.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "tenants")
public class Tenant {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    
    @Column(name = "subdomain", nullable = false, unique = true, length = 100)
    private String subdomain;
    
    @Column(name = "status", length = 50)
    private String status = "active";
    
    @Column(name = "config", columnDefinition = "JSON")  // ✅ USE THIS FOR LOCATION!
    private String config;
    
    @Column(name = "card_pooling_enabled")
    private Boolean cardPoolingEnabled = false;

    // ============================================
// ✅ POOL BOOKING FEATURE FIELDS
// ============================================
    @Column(name = "pool_booking_enabled")
    private Boolean poolBookingEnabled = false;

    @Column(name = "pool_booking_approved")
    private Boolean poolBookingApproved = false;

    @Column(name = "pool_booking_requested_at")
    private LocalDateTime poolBookingRequestedAt;

    @Column(name = "pool_booking_approved_at")
    private LocalDateTime poolBookingApprovedAt;

    @Column(name = "pool_booking_denied_reason", length = 255)
    private String poolBookingDeniedReason;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}