package com.fleetman.entity;

import com.fleetman.entity.enums.GeofenceViolationStatus;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "geofence_violations")
public class GeofenceViolation {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "geofence_id", nullable = false)
    private Geofence geofence;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;
    
    @Column(name = "violation_type", nullable = false, length = 100)
    private String violationType;
    
    @Column(name = "lat", precision = 10, scale = 8)
    private BigDecimal lat;
    
    @Column(name = "lng", precision = 11, scale = 8)
    private BigDecimal lng;
    
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
    
    @Column(name = "resolved")
    private Boolean resolved = false;
    
    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "overridden", columnDefinition = "BOOLEAN DEFAULT FALSE")
    private Boolean overridden = false;
    
    @Column(name = "override_reason")
    private String overrideReason;
    
    @Column(name = "overridden_by")
    private String overriddenBy;
    
    @Column(name = "overridden_at")
    private LocalDateTime overriddenAt;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", columnDefinition = "VARCHAR(50) DEFAULT 'reported'")
    private GeofenceViolationStatus status = GeofenceViolationStatus.reported;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
        if (status == null) {
        status = GeofenceViolationStatus.reported;  // ✅ lowercase
        }
    }
}