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
@Table(name = "service_schedules", indexes = {
    @Index(name = "idx_service_schedule_tenant", columnList = "tenant_id"),
    @Index(name = "idx_service_schedule_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_service_schedule_active", columnList = "is_active")
})
public class ServiceSchedule {

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

    /**
     * Service type, e.g. "Oil Change", "Brake Service", "Tire Rotation"
     */
    @Column(name = "service_type", nullable = false, length = 100)
    private String serviceType;

    /**
     * How often this service is due, in km.
     * Nullable — a schedule can be based on time only.
     */
    @Column(name = "interval_km", precision = 10, scale = 2)
    private BigDecimal intervalKm;

    /**
     * How often this service is due, in days.
     * Nullable — a schedule can be based on mileage only.
     */
    @Column(name = "interval_days")
    private Integer intervalDays;

    /**
     * Odometer reading when this service was last performed.
     */
    @Column(name = "last_service_km", precision = 10, scale = 2)
    private BigDecimal lastServiceKm;

    /**
     * Date when this service was last performed.
     */
    @Column(name = "last_service_date")
    private LocalDate lastServiceDate;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

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
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}