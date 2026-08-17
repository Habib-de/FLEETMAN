package com.fleetman.service;

import com.fleetman.entity.Driver; 
import com.fleetman.entity.Incident;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncidentService {
    
    private final IncidentRepository incidentRepository;
    private final DriverService driverService;
    
        @Transactional
    public Incident createIncident(Incident incident) {
        Incident saved = incidentRepository.save(incident);
        
        // ============================================
        // ✅ UPDATE DRIVER SAFETY SCORE
        // ============================================
        if (saved.getDriver() != null && saved.getDriver().getId() != null) {
            updateDriverSafetyScore(saved.getDriver().getId(), saved.getSeverity());
        }
        
        return saved;
    }
    
    public Incident getIncidentById(String id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
    }
    
    public List<Incident> getIncidentsByTenant(String tenantId) {
        return incidentRepository.findByTenantId(tenantId);
    }
    
    public List<Incident> getIncidentsByVehicle(String vehicleId) {
        return incidentRepository.findByVehicleId(vehicleId);
    }
    
    public List<Incident> getIncidentsByTenantAndStatus(String tenantId, String status) {
        return incidentRepository.findByTenantIdAndStatus(tenantId, status);
    }
    
    public List<Incident> getRecentIncidents(String tenantId, LocalDateTime startDate) {
        return incidentRepository.findRecentIncidents(tenantId, startDate);
    }

    // In IncidentService.java - add this method
     public List<Incident> getAllIncidents() {
    return incidentRepository.findAll();
    }

    public List<Incident> getIncidentsByDriver(String driverId) {
    return incidentRepository.findByDriverId(driverId);
}
    
        @Transactional
    public Incident updateIncident(String id, Incident incidentDetails) {
        // Get existing incident
        Incident existing = getIncidentById(id);
        
        // Store old severity and driver
        String oldSeverity = existing.getSeverity();
        String driverId = existing.getDriver() != null ? existing.getDriver().getId() : null;
        
        // Update the incident fields
        existing.setIncidentType(incidentDetails.getIncidentType());
        existing.setSeverity(incidentDetails.getSeverity());
        existing.setStatus(incidentDetails.getStatus());
        existing.setLocation(incidentDetails.getLocation());
        existing.setDescription(incidentDetails.getDescription());
        existing.setPoliceReport(incidentDetails.getPoliceReport());
        existing.setCost(incidentDetails.getCost());
        existing.setAttachments(incidentDetails.getAttachments());
        existing.setResolvedAt(incidentDetails.getResolvedAt());
        
        Incident saved = incidentRepository.save(existing);
        
        // ✅ RECALCULATE SAFETY SCORE IF SEVERITY CHANGED
        if (driverId != null && !oldSeverity.equals(incidentDetails.getSeverity())) {
            recalculateDriverSafetyScore(driverId);
        }
        
        return saved;
    }
    
        @Transactional
    public void deleteIncident(String id) {
        Incident incident = getIncidentById(id);
        String driverId = incident.getDriver() != null ? incident.getDriver().getId() : null;
        
        incidentRepository.delete(incident);
        
        // ✅ Recalculate score after deletion
        if (driverId != null) {
            recalculateDriverSafetyScore(driverId);
        }
    }

        // ============================================
    // ✅ HELPER: Get deduction based on severity
    // ============================================
    private int getDeductionForSeverity(String severity) {
        if (severity == null) return 3;
        
        switch(severity.toLowerCase()) {
            case "critical":
                return 15;
            case "high":
                return 10;
            case "medium":
                return 5;
            case "low":
                return 2;
            default:
                return 3;
        }
    }

    // ============================================
    // ✅ HELPER: Update driver safety score
    // ============================================
    private void updateDriverSafetyScore(String driverId, String severity) {
        try {
            Driver driver = driverService.getDriverById(driverId);
            if (driver == null) {
                System.out.println("⚠️ Driver not found: " + driverId);
                return;
            }
            
            int currentScore = driver.getSafetyScore() != null ? driver.getSafetyScore() : 100;
            int deduction = getDeductionForSeverity(severity);
            int newScore = Math.max(0, currentScore - deduction);
            
            driver.setSafetyScore(newScore);
            driverService.updateDriver(driverId, driver);
            
            System.out.println("✅ Driver " + driver.getName() + " safety score updated: " + 
                currentScore + " → " + newScore + " (-" + deduction + ")");
            
        } catch (Exception e) {
            System.err.println("❌ Failed to update driver safety score: " + e.getMessage());
        }
    }

        // ============================================
    // ✅ RECALCULATE DRIVER SAFETY SCORE
    // ============================================
    private void recalculateDriverSafetyScore(String driverId) {
        try {
            // Get all incidents for this driver
            List<Incident> driverIncidents = incidentRepository.findByDriverId(driverId);
            
            Driver driver = driverService.getDriverById(driverId);
            if (driver == null) {
                System.out.println("⚠️ Driver not found: " + driverId);
                return;
            }
            
            // Start with base score 100
            int baseScore = 100;
            int totalDeduction = 0;
            
            // Calculate total deduction from all incidents
            for (Incident incident : driverIncidents) {
                // Only deduct if incident is NOT resolved (or always deduct, up to you)
                if (!"resolved".equalsIgnoreCase(incident.getStatus()) && 
                    !"closed".equalsIgnoreCase(incident.getStatus())) {
                    totalDeduction += getDeductionForSeverity(incident.getSeverity());
                }
            }
            
            // Ensure score doesn't go below 0 or above 100
            int newScore = Math.max(0, Math.min(100, baseScore - totalDeduction));
            
            driver.setSafetyScore(newScore);
            driverService.updateDriver(driverId, driver);
            
            System.out.println("🔄 Driver " + driver.getName() + " safety score recalculated: " + newScore);
            
        } catch (Exception e) {
            System.err.println("❌ Failed to recalculate driver safety score: " + e.getMessage());
        }
    }
}