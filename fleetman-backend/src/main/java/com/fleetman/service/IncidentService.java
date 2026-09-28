package com.fleetman.service;

import com.fleetman.entity.Driver; 
import com.fleetman.entity.Incident;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {
    
    private final IncidentRepository incidentRepository;
    private final DriverService driverService;
    private final NotificationService notificationService;  // ✅ ADDED

    // ============================================
    // ✅ CREATE + NOTIFY
    // ============================================
    @Transactional
    public Incident createIncident(Incident incident) {
        Incident saved = incidentRepository.save(incident);
        
        // ============================================
        // ✅ UPDATE DRIVER SAFETY SCORE
        // ============================================
        if (saved.getDriver() != null && saved.getDriver().getId() != null) {
            updateDriverSafetyScore(saved.getDriver().getId(), saved.getSeverity());
        }

        // ============================================
        // ✅ NEW: NOTIFY CAR OWNERS
        // ============================================
        notifyTenantAboutIncident(saved);
        
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

    public List<Incident> getAllIncidents() {
        return incidentRepository.findAll();
    }

    public List<Incident> getIncidentsByDriver(String driverId) {
        return incidentRepository.findByDriverId(driverId);
    }
    
    // ============================================
    // ✅ UPDATE + NOTIFY ON ESCALATION
    // ============================================
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

        // ✅ NEW: NOTIFY IF SEVERITY ESCALATED
        boolean severityEscalated = isSeverityEscalated(oldSeverity, incidentDetails.getSeverity());
        if (severityEscalated) {
            log.info("🔔 Severity escalated: {} → {}", oldSeverity, incidentDetails.getSeverity());
            notifyTenantAboutIncident(saved);
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
    // ✅ NEW: NOTIFY TENANT OWNERS ABOUT INCIDENT
    // ============================================
    private void notifyTenantAboutIncident(Incident incident) {
        try {
            if (incident == null || incident.getTenant() == null) {
                log.warn("⚠️ Cannot notify — incident has no tenant");
                return;
            }

            String severity = incident.getSeverity() != null 
                ? incident.getSeverity().toLowerCase() 
                : "medium";

            // High severity → alert, others → warning
            String type = (severity.equals("high") || severity.equals("critical")) 
                ? "alert" 
                : "warning";

            String vehicleReg = incident.getVehicle() != null 
                ? incident.getVehicle().getRegistration() 
                : "Unknown vehicle";

            String incidentType = incident.getIncidentType() != null 
                ? incident.getIncidentType() 
                : "Incident";

            String title = "🚨 " + incidentType + " Reported";

            String message = String.format(
                "%s on %s. Severity: %s. %s",
                incidentType,
                vehicleReg,
                incident.getSeverity() != null ? incident.getSeverity() : "Medium",
                incident.getDescription() != null ? incident.getDescription() : ""
            );

            notificationService.notifyTenantOwners(
                incident.getTenant().getId(),
                type,
                title,
                message,
                "/incidents"
            );

            log.info("🔔 Incident notification sent to tenant owners: {}", title);

        } catch (Exception e) {
            log.error("❌ Failed to send incident notification: {}", e.getMessage(), e);
        }
    }

    // ============================================
    // ✅ NEW: Check if severity went UP
    // ============================================
    private boolean isSeverityEscalated(String oldSeverity, String newSeverity) {
        if (oldSeverity == null || newSeverity == null) return false;
        
        int oldLevel = getSeverityLevel(oldSeverity);
        int newLevel = getSeverityLevel(newSeverity);
        
        return newLevel > oldLevel;
    }

    private int getSeverityLevel(String severity) {
        if (severity == null) return 0;
        switch (severity.toLowerCase()) {
            case "critical": return 4;
            case "high": return 3;
            case "medium": return 2;
            case "low": return 1;
            default: return 0;
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
                log.warn("⚠️ Driver not found: {}", driverId);
                return;
            }
            
            int currentScore = driver.getSafetyScore() != null ? driver.getSafetyScore() : 100;
            int deduction = getDeductionForSeverity(severity);
            int newScore = Math.max(0, currentScore - deduction);
            
            driver.setSafetyScore(newScore);
            driverService.updateDriver(driverId, driver);
            
            log.info("✅ Driver {} safety score updated: {} → {} (-{})",
                driver.getName(), currentScore, newScore, deduction);
            
        } catch (Exception e) {
            log.error("❌ Failed to update driver safety score: {}", e.getMessage());
        }
    }

    // ============================================
    // ✅ RECALCULATE DRIVER SAFETY SCORE
    // ============================================
    private void recalculateDriverSafetyScore(String driverId) {
        try {
            List<Incident> driverIncidents = incidentRepository.findByDriverId(driverId);
            
            Driver driver = driverService.getDriverById(driverId);
            if (driver == null) {
                log.warn("⚠️ Driver not found: {}", driverId);
                return;
            }
            
            int baseScore = 100;
            int totalDeduction = 0;
            
            for (Incident incident : driverIncidents) {
                if (!"resolved".equalsIgnoreCase(incident.getStatus()) && 
                    !"closed".equalsIgnoreCase(incident.getStatus())) {
                    totalDeduction += getDeductionForSeverity(incident.getSeverity());
                }
            }
            
            int newScore = Math.max(0, Math.min(100, baseScore - totalDeduction));
            
            driver.setSafetyScore(newScore);
            driverService.updateDriver(driverId, driver);
            
            log.info("🔄 Driver {} safety score recalculated: {}", driver.getName(), newScore);
            
        } catch (Exception e) {
            log.error("❌ Failed to recalculate driver safety score: {}", e.getMessage());
        }
    }
}