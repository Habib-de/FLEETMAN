package com.fleetman.service;

import com.fleetman.entity.Maintenance;
import com.fleetman.entity.ServiceSchedule;
import com.fleetman.repository.ServiceScheduleRepository;
import lombok.extern.slf4j.Slf4j;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.MaintenanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceService {
    
    private final MaintenanceRepository maintenanceRepository;
    private final ServiceScheduleRepository scheduleRepository;
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

        String oldStatus = maintenance.getStatus();

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

        Maintenance saved = maintenanceRepository.save(maintenance);

        advanceScheduleIfClosed(saved, oldStatus);

        return saved;
    }

    private void advanceScheduleIfClosed(Maintenance job, String oldStatus) {
        String newStatus = job.getStatus();

        boolean wasOpen = oldStatus == null
                || (!"closed".equalsIgnoreCase(oldStatus)
                    && !"completed".equalsIgnoreCase(oldStatus));

        boolean isClosing = "closed".equalsIgnoreCase(newStatus)
                || "completed".equalsIgnoreCase(newStatus);

        if (!(wasOpen && isClosing)) return;
        if (job.getVehicle() == null || job.getType() == null) return;

        try {
            List<ServiceSchedule> matches = scheduleRepository
                    .findByVehicleIdAndServiceType(job.getVehicle().getId(), job.getType());

            for (ServiceSchedule s : matches) {
                if (s.getIsActive() == null || !s.getIsActive()) continue;

                if (job.getVehicle().getMileage() != null) {
                    s.setLastServiceKm(job.getVehicle().getMileage());
                }
                s.setLastServiceDate(LocalDate.now());
                scheduleRepository.save(s);

                log.info("✅ Advanced schedule {} after closing job {}", s.getId(), job.getId());
            }
        } catch (Exception e) {
            log.warn("⚠️ Could not advance schedule after closing job {}: {}", job.getId(), e.getMessage());
        }
    }
    
    @Transactional
    public void deleteMaintenance(String id) {
        Maintenance maintenance = getMaintenanceById(id);
        maintenanceRepository.delete(maintenance);
    }
}