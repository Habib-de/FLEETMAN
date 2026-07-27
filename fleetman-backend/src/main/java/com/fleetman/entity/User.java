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
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", columnDefinition = "CHAR(36)")
    private String id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
    
    @Column(name = "email", nullable = false, unique = true, length = 255)
    private String email;
    
    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;
    
    @Column(name = "name", nullable = false, length = 255)
    private String name;
    
    // ✅ ENUM - matches database ENUM('super_admin', 'car_owner', 'driver')
    @Enumerated(EnumType.STRING)
    @Column(name = "role", columnDefinition = "ENUM('super_admin', 'car_owner', 'driver')")
    private UserRole role = UserRole.driver;
    
    @Column(name = "permissions", columnDefinition = "JSON")
    private String permissions;
    
    @Column(name = "avatar", columnDefinition = "LONGTEXT")
private String avatar;
    
    @Column(name = "phone", length = 50)
    private String phone;
    
    @Column(name = "last_login")
    private LocalDateTime lastLogin;
    
    @Column(name = "status", length = 50)
    private String status = "active";

    // ✅ ADD THESE TWO LINES HERE
    @Column(name = "reset_token", length = 255)
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;
    
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