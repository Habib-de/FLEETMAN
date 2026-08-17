package com.fleetman.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "vehicles")
public class Vehicle {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @Column(name = "registration", nullable = false, length = 50)
    private String registration;
    
    @Column(name = "vin", unique = true, length = 17)
    private String vin;
    
    @Column(name = "make", nullable = false, length = 100)
    private String make;
    
    @Column(name = "model", nullable = false, length = 100)
    private String model;
    
    @Column(name = "year")
    private Integer year;
    
    @Column(name = "category", length = 50)
    private String category;
    
    @Column(name = "status", length = 50)
    private String status = "active";
    
    @Column(name = "mileage", precision = 10, scale = 2)
    private BigDecimal mileage;
    
    @Column(name = "owner", length = 255)
    private String owner;
    
    @Column(name = "cost_centre", length = 50)
    private String costCentre;
    
    @Column(name = "location", length = 255)
    private String location;
    
    @Column(name = "custodian", length = 255)
    private String custodian;
    
    @Column(name = "insurance", length = 255)
    private String insurance;
    
    @Column(name = "permit", length = 255)
    private String permit;
    
    @Column(name = "license_expiry")
    private LocalDate licenseExpiry;
    
    @Column(name = "roadworthy")
    private LocalDate roadworthy;
    
    @Column(name = "accessories", columnDefinition = "JSON")
    private String accessories;
    
    @Column(name = "last_service")
    private LocalDate lastService;
    
    @Column(name = "next_service")
    private LocalDate nextService;
    
    // ============================================
    // ✅ ADD THESE MISSING FIELDS
    // ============================================
    
    @Column(name = "color", length = 50)
    private String color;
    
    @Column(name = "fuel_type", length = 50)
    private String fuelType;
    
    @Column(name = "engine_size", length = 50)
    private String engineSize;
    
    @Column(name = "transmission", length = 50)
    private String transmission;
    
    @Column(name = "acquisition_date")
    private LocalDate acquisitionDate;
    
    @Column(name = "acquisition_cost", precision = 10, scale = 2)
    private BigDecimal acquisitionCost;
    
    @Column(name = "disposal_date")
    private LocalDate disposalDate;
    
    @Column(name = "disposal_reason", length = 255)
    private String disposalReason;

    @Column(name = "maintenance_reason", length = 500)
    private String maintenanceReason;
    
    // ============================================
    // ✅ DRIVER ASSIGNMENT
    // ============================================
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private Driver driver;
    
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