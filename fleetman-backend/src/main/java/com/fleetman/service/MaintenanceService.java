package com.fleetman.service;

import com.fleetman.entity.Maintenance;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaintenanceService {
    
    private final MaintenanceRepository maintenanceRepository;
    
    @Transactional
    public Maintenance createMaintenance(Maintenance maintenance) {
        return maintenanceRepository.save(maintenance);
    }
    
    public Maintenance getMaintenanceById(String id) {
        return maintenanceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance record not found with id: " + id));
    }
    
    // ✅ UPDATE THIS METHOD to use findByTenantIdWithVehicle
    public List<Maintenance> getMaintenanceByTenant(String tenantId) {
        return maintenanceRepository.findByTenantIdWithVehicle(tenantId);
    }
    
    public List<Maintenance> getMaintenanceByVehicle(String vehicleId) {
        return maintenanceRepository.findByVehicleId(vehicleId);
    }
    
    public List<Maintenance> getMaintenanceByTenantAndStatus(String tenantId, String status) {
        return maintenanceRepository.findByTenantIdAndStatus(tenantId, status);
    }
    
    public List<Maintenance> getOverdueMaintenance() {
        return maintenanceRepository.findByScheduledDateBeforeAndStatusNot(LocalDate.now(), "closed");
    }
    
    public List<Maintenance> getCriticalMaintenance(String tenantId) {
        return maintenanceRepository.findCriticalMaintenance(tenantId);
    }
    
    @Transactional
    public Maintenance updateMaintenance(String id, Maintenance maintenanceDetails) {
        Maintenance maintenance = getMaintenanceById(id);
        
         // ✅ ADD THIS - Preserve or update vehicle
        if (maintenanceDetails.getVehicle() != null) {
         maintenance.setVehicle(maintenanceDetails.getVehicle());
        }
    
    // ✅ ADD THIS - Preserve or update driver
        if (maintenanceDetails.getDriver() != null) {
            maintenance.setDriver(maintenanceDetails.getDriver());
        }

        maintenance.setType(maintenanceDetails.getType());
        maintenance.setStatus(maintenanceDetails.getStatus());
        maintenance.setPriority(maintenanceDetails.getPriority());
        maintenance.setDescription(maintenanceDetails.getDescription());
        maintenance.setScheduledDate(maintenanceDetails.getScheduledDate());
        maintenance.setCompletedDate(maintenanceDetails.getCompletedDate());
        maintenance.setCost(maintenanceDetails.getCost());
        maintenance.setMechanic(maintenanceDetails.getMechanic());
        maintenance.setPartsUsed(maintenanceDetails.getPartsUsed());
        maintenance.setEstimatedHours(maintenanceDetails.getEstimatedHours());
        maintenance.setActualHours(maintenanceDetails.getActualHours());
        maintenance.setReceiptImage(maintenanceDetails.getReceiptImage());
        return maintenanceRepository.save(maintenance);
    }
    
    @Transactional
    public void deleteMaintenance(String id) {
        Maintenance maintenance = getMaintenanceById(id);
        maintenanceRepository.delete(maintenance);
    }
}