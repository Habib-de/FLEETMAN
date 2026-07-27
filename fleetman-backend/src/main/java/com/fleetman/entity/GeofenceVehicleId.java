package com.fleetman.entity;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import javax.persistence.Column;
import javax.persistence.Embeddable;
import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class GeofenceVehicleId implements Serializable {
    
    private static final long serialVersionUID = 1L;
    
    @Column(name = "geofence_id")
    private String geofenceId;
    
    @Column(name = "vehicle_id")
    private String vehicleId;
}