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
@Table(name = "safety_events", indexes = {
    @Index(name = "idx_safety_event_driver", columnList = "driver_id"),
    @Index(name = "idx_safety_event_vehicle", columnList = "vehicle_id"),
    @Index(name = "idx_safety_event_timestamp", columnList = "timestamp")
})
public class SafetyEvent {

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id")
    private Trip trip;

    /**
     * HARSH_BRAKE, HARSH_ACCEL, HARSH_CORNER, SPEEDING
     */
    @Column(name = "type", nullable = false, length = 50)
    private String type;

    /**
     * LOW, MEDIUM, HIGH
     */
    @Column(name = "severity", nullable = false, length = 20)
    private String severity;

    @Column(name = "lat", precision = 10, scale = 8)
    private BigDecimal lat;

    @Column(name = "lng", precision = 11, scale = 8)
    private BigDecimal lng;

    @Column(name = "speed", precision = 10, scale = 2)
    private BigDecimal speed;

    @Column(name = "speed_delta", precision = 10, scale = 2)
    private BigDecimal speedDelta;

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