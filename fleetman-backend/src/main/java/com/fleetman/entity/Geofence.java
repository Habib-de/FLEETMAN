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
@Table(name = "geofences")
public class Geofence {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    
    @Column(name = "type", length = 50)
    private String type = "circular";
    
    @Column(name = "center_lat", precision = 10, scale = 8)
    private BigDecimal centerLat;
    
    @Column(name = "center_lng", precision = 11, scale = 8)
    private BigDecimal centerLng;
    
    @Column(name = "radius", precision = 10, scale = 2)
    private BigDecimal radius;
    
    @Column(name = "coordinates", columnDefinition = "JSON")
    private String coordinates;

    @Column(name = "route_distance", precision = 10, scale = 2)
    private BigDecimal routeDistance;  
    
    @Column(name = "color", length = 7)
    private String color = "#2563EB";
    
    @Column(name = "is_active")
    private Boolean isActive = true;
    
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