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
@Table(name = "report_schedules")
public class ReportSchedule {
    
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
    
    @Column(name = "report_type", nullable = false, length = 100)
    private String reportType;
    
    @Column(name = "schedule", nullable = false, length = 100)
    private String schedule;
    
    @Column(name = "recipients", nullable = false, columnDefinition = "JSON")
    private String recipients;
    
    @Column(name = "format", length = 20)
    private String format = "pdf";
    
    @Column(name = "filters", columnDefinition = "JSON")
    private String filters;
    
    @Column(name = "status", length = 20)
    private String status = "active";
    
    @Column(name = "last_run")
    private LocalDateTime lastRun;
    
    @Column(name = "next_run")
    private LocalDateTime nextRun;
    
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