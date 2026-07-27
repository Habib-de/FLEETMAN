package com.fleetman.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "geofence_vehicles")
public class GeofenceVehicle {
    
    @EmbeddedId
    private GeofenceVehicleId id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("geofenceId")
    @JoinColumn(name = "geofence_id")
    private Geofence geofence;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("vehicleId")
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;
    
    @Column(name = "assigned_at")
    private LocalDateTime assignedAt;
    
    @PrePersist
    protected void onCreate() {
        assignedAt = LocalDateTime.now();
    }
}