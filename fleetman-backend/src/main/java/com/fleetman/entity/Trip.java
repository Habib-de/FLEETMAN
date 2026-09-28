package com.fleetman.entity;

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
@Table(name = "trips")
public class Trip {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;

    // In Trip.java
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "geofence_id")
    private Geofence geofence;  // The route for this trip
    
    @Column(name = "start_location", length = 255)
    private String startLocation;
    
    @Column(name = "end_location", length = 255)
    private String endLocation;
    
    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;
    
    @Column(name = "end_time")
    private LocalDateTime endTime;
    
    @Column(name = "distance", precision = 10, scale = 2)
    private BigDecimal distance;
    
    @Column(name = "fuel_used", precision = 10, scale = 2)
    private BigDecimal fuelUsed;
    
    @Column(name = "average_speed", precision = 10, scale = 2)
    private BigDecimal averageSpeed;
    
    @Column(name = "cost", precision = 10, scale = 2)
    private BigDecimal cost;
    
    @Column(name = "status", length = 50)
    private String status = "planned";
    
    @Column(name = "start_odometer", precision = 10, scale = 2)
    private BigDecimal startOdometer;
    
    @Column(name = "end_odometer", precision = 10, scale = 2)
    private BigDecimal endOdometer;
    
    @Column(name = "purpose", columnDefinition = "TEXT")
    private String purpose;

    @Column(name = "priority", length = 20)
    private String priority = "normal"; 

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
    
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