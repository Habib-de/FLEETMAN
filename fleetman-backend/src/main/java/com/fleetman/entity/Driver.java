package com.fleetman.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.GenericGenerator;

import javax.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "drivers")
public class Driver {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    
    @Column(name = "license_number", nullable = false, length = 50)
    private String licenseNumber;
    
    @Column(name = "license_expiry", nullable = false)
    private LocalDate licenseExpiry;
    
    @Column(name = "driver_id", unique = true, length = 50)
    private String driverId;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_vehicle")
    private Vehicle assignedVehicle;
    
    @Column(name = "safety_score")
    private Integer safetyScore = 100;
    
    @Column(name = "training", columnDefinition = "TEXT")
    private String training;
    
    @Column(name = "status", length = 50)
    private String status = "active";
    
    @Column(name = "phone", length = 50)
    private String phone;
    
    @Column(name = "email", length = 255)
    private String email;
    
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