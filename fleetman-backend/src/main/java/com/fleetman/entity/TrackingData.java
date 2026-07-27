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
@Table(name = "tracking_data")
public class TrackingData {
    
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
    
    @Column(name = "lat", nullable = false, precision = 10, scale = 8)
    private BigDecimal lat;
    
    @Column(name = "lng", nullable = false, precision = 11, scale = 8)
    private BigDecimal lng;
    
    @Column(name = "speed", precision = 10, scale = 2)
    private BigDecimal speed;
    
    @Column(name = "heading")
    private Integer heading;
    
    @Column(name = "altitude", precision = 10, scale = 2)
    private BigDecimal altitude;
    
    @Column(name = "fuel_level", precision = 5, scale = 2)
    private BigDecimal fuelLevel;
    
    @Column(name = "engine_temp", precision = 5, scale = 2)
    private BigDecimal engineTemp;
    
    @Column(name = "ignition")
    private Boolean ignition;
    
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}