// src/main/java/com/fleetman/service/ChecklistService.java
package com.fleetman.service;

import com.fleetman.entity.Checklist;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.ChecklistRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChecklistService {
    
    private final ChecklistRepository checklistRepository;
    
    @Transactional
    public Checklist createChecklist(Checklist checklist) {
        return checklistRepository.save(checklist);
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
        return checklistRepository.save(checklist);
    }
    
    @Transactional
    public Checklist submitChecklist(String id, String submittedTo) {
        Checklist checklist = getChecklistById(id);
        checklist.setStatus("submitted");
        checklist.setSubmittedAt(LocalDateTime.now());
        checklist.setSubmittedTo(submittedTo);
        return checklistRepository.save(checklist);
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
}