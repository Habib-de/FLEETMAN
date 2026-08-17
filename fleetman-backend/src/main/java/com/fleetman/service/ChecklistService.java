// src/main/java/com/fleetman/service/ChecklistService.java
package com.fleetman.service;

import com.fleetman.entity.Checklist;
import com.fleetman.entity.Vehicle;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.ChecklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.ArrayList;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChecklistService {
    
    private final ChecklistRepository checklistRepository;
    private final VehicleService vehicleService;
    
    @Transactional
    public Checklist createChecklist(Checklist checklist) {
        Checklist saved = checklistRepository.save(checklist);  // ✅ Save first
        updateVehicleStatusFromChecklist(saved);                // ✅ Then update vehicle
        return saved; 
    }
    
    @Transactional
    public Checklist updateChecklist(String id, Checklist checklistDetails) {
        Checklist checklist = getChecklistById(id);
        checklist.setStatus(checklistDetails.getStatus());
        checklist.setItems(checklistDetails.getItems());
        checklist.setTotalItems(checklistDetails.getTotalItems());
        checklist.setPassedItems(checklistDetails.getPassedItems());
        checklist.setFailedItems(checklistDetails.getFailedItems());
        checklist.setDefects(checklistDetails.getDefects());
        checklist.setCompletionRate(checklistDetails.getCompletionRate());
        checklist.setSignature(checklistDetails.getSignature());
        Checklist saved = checklistRepository.save(checklist);  // ✅ Save first
        updateVehicleStatusFromChecklist(saved);                // ✅ Then update vehicle
        return saved;  
    }
    
    @Transactional
    public Checklist submitChecklist(String id, String submittedTo) {
        Checklist checklist = getChecklistById(id);
        checklist.setStatus("submitted");
        checklist.setSubmittedAt(LocalDateTime.now());
        checklist.setSubmittedTo(submittedTo);
        Checklist saved = checklistRepository.save(checklist);  // ✅ Save first
        updateVehicleStatusFromChecklist(saved);                // ✅ ADD THIS - Update vehicle
        return saved;
    }
    
    public Checklist getChecklistById(String id) {
        return checklistRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Checklist not found with id: " + id));
    }
    
    public List<Checklist> getChecklistsByTenant(String tenantId) {
        return checklistRepository.findByTenantId(tenantId);
    }
    
    public List<Checklist> getChecklistsByVehicle(String vehicleId) {
        return checklistRepository.findByVehicleId(vehicleId);
    }
    
    public List<Checklist> getChecklistsByDriver(String driverId) {
        return checklistRepository.findByDriverId(driverId);
    }
    
    public List<Checklist> getChecklistsByVehicleHistory(String tenantId, String vehicleId) {
        return checklistRepository.findByTenantIdAndVehicleIdOrderByCreatedAtDesc(tenantId, vehicleId);
    }
    
    @Transactional
    public void deleteChecklist(String id) {
        Checklist checklist = getChecklistById(id);
        checklistRepository.delete(checklist);
    }

    private String determineVehicleStatus(Checklist checklist) {
        // If there are defects, vehicle needs maintenance
        if (checklist.getDefects() != null && checklist.getDefects() > 0) {
            return "Maintenance";
        }
        
        // If there are failed items, vehicle needs maintenance
        if (checklist.getFailedItems() != null && checklist.getFailedItems() > 0) {
            return "Maintenance";
        }
        
        // If all passed, vehicle is active
        if (checklist.getPassedItems() != null && 
            checklist.getTotalItems() != null && 
            checklist.getPassedItems().equals(checklist.getTotalItems())) {
            return "Active";
        }
        
        // Default - no change
        return null;
    }

    private String buildMaintenanceReason(Checklist checklist) {
    List<String> reasons = new ArrayList<>();
    
    try {
        String itemsJson = checklist.getItems();
        if (itemsJson != null && !itemsJson.isEmpty()) {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> items = mapper.readValue(itemsJson, 
                new TypeReference<List<Map<String, Object>>>() {});
            
            // Find failed items
            List<String> failedItems = items.stream()
                .filter(item -> "fail".equalsIgnoreCase((String) item.get("status")))
                .map(item -> (String) item.get("label"))
                .collect(Collectors.toList());
            
            // Find items with defects
            List<String> defectItems = items.stream()
                .filter(item -> Boolean.TRUE.equals(item.get("defect")))
                .map(item -> (String) item.get("label"))
                .collect(Collectors.toList());
            
            if (!failedItems.isEmpty()) {
                reasons.add("Failed: " + String.join(", ", failedItems));
            }
            
            if (!defectItems.isEmpty()) {
                reasons.add("Defects: " + String.join(", ", defectItems));
            }
        }
    } catch (Exception e) {
        log.warn("Could not parse checklist items: {}", e.getMessage());
    }
    
    if (reasons.isEmpty()) {
        return "Maintenance required - please review checklist";
    }
    
    return String.join("; ", reasons);
}
    
    private void updateVehicleStatusFromChecklist(Checklist checklist) {
    if (checklist.getVehicle() == null) {
        log.warn("No vehicle linked to checklist, skipping status update");
        return;
    }
    
    String newStatus = determineVehicleStatus(checklist);
    log.info("📊 Determined new status: {}", newStatus);
    
    if (newStatus == null) {
        log.debug("No status change needed");
        return;
    }
    
    try {
        Vehicle vehicle = vehicleService.getVehicleById(checklist.getVehicle().getId());
        String oldStatus = vehicle.getStatus();
        log.info("📊 Current vehicle status: {}", oldStatus);
        
        // ✅ ALWAYS update maintenance reason when in Maintenance
        if ("Maintenance".equalsIgnoreCase(newStatus)) {
            String reason = buildMaintenanceReason(checklist);
            log.info("🔧 Built maintenance reason: {}", reason);
            vehicle.setMaintenanceReason(reason);
        } else {
            // Clear reason when vehicle becomes Active
            vehicle.setMaintenanceReason(null);
        }
        
        // ✅ Only update status if it changed
        if (!newStatus.equalsIgnoreCase(oldStatus)) {
            vehicle.setStatus(newStatus);
            vehicleService.updateVehicle(vehicle.getId(), vehicle);
            log.info("✅ Vehicle {} status updated: {} → {}", 
                vehicle.getRegistration(), oldStatus, newStatus);
        } else {
            // ✅ Still save the vehicle (reason might have changed)
            vehicleService.updateVehicle(vehicle.getId(), vehicle);
            log.info("✅ Vehicle {} maintenance reason updated (status unchanged)", 
                vehicle.getRegistration());
        }
        
    } catch (Exception e) {
        log.error("Failed to update vehicle status: {}", e.getMessage());
    }
}
}