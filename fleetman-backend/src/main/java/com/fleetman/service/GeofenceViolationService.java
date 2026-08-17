package com.fleetman.service;

import com.fleetman.entity.GeofenceViolation;
import com.fleetman.entity.Incident;  
import com.fleetman.entity.enums.GeofenceViolationStatus; 
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.GeofenceViolationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class GeofenceViolationService {
    
    private final GeofenceViolationRepository geofenceViolationRepository;
    private final IncidentService incidentService; 
    
    @Transactional
    public GeofenceViolation createGeofenceViolation(GeofenceViolation violation) {
        return geofenceViolationRepository.save(violation);
    }
    
    public GeofenceViolation getGeofenceViolationById(String id) {
        return geofenceViolationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Geofence violation not found with id: " + id));
    }
    
    public List<GeofenceViolation> getGeofenceViolationsByTenant(String tenantId) {
        return geofenceViolationRepository.findByTenantId(tenantId);
    }
    
    public List<GeofenceViolation> getGeofenceViolationsByVehicle(String vehicleId) {
        return geofenceViolationRepository.findByVehicleId(vehicleId);
    }
    
    public List<GeofenceViolation> getGeofenceViolationsByGeofence(String geofenceId) {
        return geofenceViolationRepository.findByGeofenceId(geofenceId);
    }
    
    public List<GeofenceViolation> getUnresolvedGeofenceViolations() {
        return geofenceViolationRepository.findByResolvedFalse();
    }
    
    @Transactional
    public GeofenceViolation resolveGeofenceViolation(String id) {
        GeofenceViolation violation = getGeofenceViolationById(id);
        violation.setResolved(true);
        violation.setResolvedAt(LocalDateTime.now());
        return geofenceViolationRepository.save(violation);
    }
    
    @Transactional
    public void deleteGeofenceViolation(String id) {
        GeofenceViolation violation = getGeofenceViolationById(id);
        geofenceViolationRepository.delete(violation);
    }

        // ============================================
    // ✅ NEW: Override violation as manager-approved return
    // ============================================
    @Transactional
    public GeofenceViolation overrideAsReturn(String id, String reason) {
        GeofenceViolation violation = getGeofenceViolationById(id);
        
        // Update the violation
        violation.setOverridden(true);
        violation.setOverrideReason(reason);
        violation.setOverriddenBy("manager");
        violation.setOverriddenAt(LocalDateTime.now());
        violation.setResolved(true);
        violation.setStatus(GeofenceViolationStatus.overridden_return);
        
        GeofenceViolation saved = geofenceViolationRepository.save(violation);
        
        // ============================================
        // ✅ CREATE INCIDENT FOR MANAGER-APPROVED RETURN
        // ============================================
        try {
            Incident incident = new Incident();
            incident.setTenant(violation.getTenant());
            incident.setVehicle(violation.getVehicle());
            incident.setIncidentType("Manager Approved Return");
            incident.setSeverity("Low");
            incident.setStatus("Resolved");
            incident.setLocation("Return trip approved - " + violation.getGeofence().getName());
            incident.setDescription("Manager-approved return: " + reason);
            incident.setReportedBy("System (Override)");
            incident.setResolvedAt(LocalDateTime.now());
            incident.setCreatedAt(LocalDateTime.now());
            incident.setAttachments("[]");
            
            incidentService.createIncident(incident);
            System.out.println("✅ Incident created for manager-approved return");
            
        } catch (Exception e) {
            System.err.println("⚠️ Could not create incident: " + e.getMessage());
            // Don't throw - we still want the override to work
        }
        
        return saved;
    }

    // ============================================
    // ✅ NEW: Get overridden returns for a tenant
    // ============================================
    public List<GeofenceViolation> getOverriddenReturns(String tenantId) {
        return geofenceViolationRepository.findByTenantIdAndOverriddenTrueAndResolvedTrue(tenantId);
    }
}