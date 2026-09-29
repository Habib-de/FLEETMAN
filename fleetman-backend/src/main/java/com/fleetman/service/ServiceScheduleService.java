package com.fleetman.service;

import com.fleetman.dto.ServiceScheduleDTO;
import com.fleetman.entity.Maintenance;
import com.fleetman.entity.ServiceSchedule;
import com.fleetman.entity.Vehicle;
import com.fleetman.repository.MaintenanceRepository;
import com.fleetman.repository.ServiceScheduleRepository;
import com.fleetman.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ServiceScheduleService {

    private final ServiceScheduleRepository scheduleRepository;
    private final MaintenanceRepository maintenanceRepository;
    private final VehicleRepository vehicleRepository;
    private final MaintenanceService maintenanceService;
    private final NotificationService notificationService;

    // ============================================
    // TUNABLES
    // ============================================
    private static final int DUE_SOON_KM_THRESHOLD = 500;   // trigger when within 500 km
    private static final int DUE_SOON_DAYS_THRESHOLD = 7;    // trigger when within 7 days
    private static final int DUPLICATE_WINDOW_DAYS = 7;      // skip if a job was created in last 7 days

    // ============================================
    // CRUD
    // ============================================
    @Transactional
    public ServiceSchedule create(ServiceSchedule schedule) {
        return scheduleRepository.save(schedule);
    }

    public ServiceSchedule getById(String id) {
        return scheduleRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Schedule not found: " + id));
    }

    // ✅ CHANGED: returns DTOs now, not entities
    @Transactional(readOnly = true)
    public List<ServiceScheduleDTO> getByTenant(String tenantId) {
        return scheduleRepository.findByTenantId(tenantId)
                .stream()
                .map(ServiceScheduleDTO::from)
                .collect(Collectors.toList());
    }

    // ✅ CHANGED: returns DTOs now, not entities
    @Transactional(readOnly = true)
    public List<ServiceScheduleDTO> getByVehicle(String vehicleId) {
        return scheduleRepository.findByVehicleId(vehicleId)
                .stream()
                .map(ServiceScheduleDTO::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public ServiceSchedule update(String id, ServiceSchedule updates) {
        ServiceSchedule existing = getById(id);

        if (updates.getServiceType() != null) existing.setServiceType(updates.getServiceType());
        if (updates.getIntervalKm() != null) existing.setIntervalKm(updates.getIntervalKm());
        if (updates.getIntervalDays() != null) existing.setIntervalDays(updates.getIntervalDays());
        if (updates.getLastServiceKm() != null) existing.setLastServiceKm(updates.getLastServiceKm());
        if (updates.getLastServiceDate() != null) existing.setLastServiceDate(updates.getLastServiceDate());
        if (updates.getIsActive() != null) existing.setIsActive(updates.getIsActive());
        if (updates.getNotes() != null) existing.setNotes(updates.getNotes());

        return scheduleRepository.save(existing);
    }

    @Transactional
    public void delete(String id) {
        scheduleRepository.deleteById(id);
    }

    // ============================================
    // COMPUTE NEXT DUE
    // ============================================
    /**
     * Returns a map containing:
     *   - nextDueKm (BigDecimal or null)
     *   - nextDueDate (LocalDate or null)
     *   - kmRemaining (BigDecimal or null)    — positive = still safe, negative = overdue
     *   - daysRemaining (Long or null)
     *   - dueNow (Boolean)                    — true if within threshold
     */
    public Map<String, Object> computeNextDue(ServiceSchedule schedule) {
        Map<String, Object> result = new HashMap<>();

        Vehicle vehicle = schedule.getVehicle();
        BigDecimal currentMileage = vehicle != null && vehicle.getMileage() != null
                ? vehicle.getMileage()
                : BigDecimal.ZERO;

        LocalDate today = LocalDate.now();

        // ----- KM-based -----
        BigDecimal nextDueKm = null;
        BigDecimal kmRemaining = null;
        if (schedule.getIntervalKm() != null && schedule.getLastServiceKm() != null) {
            nextDueKm = schedule.getLastServiceKm().add(schedule.getIntervalKm());
            kmRemaining = nextDueKm.subtract(currentMileage);
        }
        result.put("nextDueKm", nextDueKm);
        result.put("kmRemaining", kmRemaining);

        // ----- Date-based -----
        LocalDate nextDueDate = null;
        Long daysRemaining = null;
        if (schedule.getIntervalDays() != null && schedule.getLastServiceDate() != null) {
            nextDueDate = schedule.getLastServiceDate().plusDays(schedule.getIntervalDays());
            daysRemaining = ChronoUnit.DAYS.between(today, nextDueDate);
        }
        result.put("nextDueDate", nextDueDate);
        result.put("daysRemaining", daysRemaining);

        // ----- Due now? -----
        boolean dueByKm = kmRemaining != null && kmRemaining.compareTo(BigDecimal.valueOf(DUE_SOON_KM_THRESHOLD)) < 0;
        boolean dueByDate = daysRemaining != null && daysRemaining < DUE_SOON_DAYS_THRESHOLD;

        result.put("dueNow", dueByKm || dueByDate);
        result.put("dueByKm", dueByKm);
        result.put("dueByDate", dueByDate);

        return result;
    }

    /**
     * Returns schedules for a tenant that are due within the next 30 days,
     * with the due info merged into the response.
     */
    public List<Map<String, Object>> getUpcoming(String tenantId, int daysAhead) {
        List<ServiceSchedule> schedules = scheduleRepository.findByTenantIdAndIsActiveTrue(tenantId);
        List<Map<String, Object>> result = new ArrayList<>();

        for (ServiceSchedule s : schedules) {
            Map<String, Object> due = computeNextDue(s);

            // Include if within the window
            Object kmRemaining = due.get("kmRemaining");
            Object daysRemaining = due.get("daysRemaining");

            boolean isUpcoming =
                    (kmRemaining != null && ((BigDecimal) kmRemaining).compareTo(BigDecimal.valueOf(DUE_SOON_KM_THRESHOLD * 10)) < 0) ||
                    (daysRemaining != null && ((Long) daysRemaining) < daysAhead);

            if (!isUpcoming) continue;

            Map<String, Object> entry = new HashMap<>();
            entry.put("scheduleId", s.getId());
            entry.put("vehicleId", s.getVehicle() != null ? s.getVehicle().getId() : null);
            entry.put("vehicleRegistration", s.getVehicle() != null ? s.getVehicle().getRegistration() : null);
            entry.put("serviceType", s.getServiceType());
            entry.put("intervalKm", s.getIntervalKm());
            entry.put("intervalDays", s.getIntervalDays());
            entry.put("lastServiceKm", s.getLastServiceKm());
            entry.put("lastServiceDate", s.getLastServiceDate());
            entry.put("nextDueKm", due.get("nextDueKm"));
            entry.put("nextDueDate", due.get("nextDueDate"));
            entry.put("kmRemaining", due.get("kmRemaining"));
            entry.put("daysRemaining", due.get("daysRemaining"));
            entry.put("dueNow", due.get("dueNow"));
            result.add(entry);
        }

        return result;
    }

    // ============================================
    // DAILY SCHEDULER — runs at 2 AM every day
    // ============================================
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void runDailyCheck() {
        log.info("🔧 ServiceScheduleService: starting daily check...");
        List<ServiceSchedule> activeSchedules = scheduleRepository.findByIsActiveTrue();
        log.info("🔧 Found {} active schedules to check", activeSchedules.size());

        int created = 0;
        for (ServiceSchedule schedule : activeSchedules) {
            try {
                if (processSchedule(schedule)) {
                    created++;
                }
            } catch (Exception e) {
                log.warn("⚠️ Failed to process schedule {}: {}", schedule.getId(), e.getMessage());
            }
        }

        log.info("✅ ServiceScheduleService: daily check complete — {} work order(s) created", created);
    }

    /**
     * Manual trigger (for testing) — runs the check immediately.
     */
    @Transactional
    public int runNow() {
        List<ServiceSchedule> activeSchedules = scheduleRepository.findByIsActiveTrue();
        int created = 0;
        for (ServiceSchedule schedule : activeSchedules) {
            try {
                if (processSchedule(schedule)) created++;
            } catch (Exception e) {
                log.warn("⚠️ Failed to process schedule {}: {}", schedule.getId(), e.getMessage());
            }
        }
        return created;
    }

    /**
     * Returns true if a work order was created.
     */
    private boolean processSchedule(ServiceSchedule schedule) {
        Map<String, Object> due = computeNextDue(schedule);

        Boolean dueNow = (Boolean) due.get("dueNow");
        if (dueNow == null || !dueNow) return false;

        Vehicle vehicle = schedule.getVehicle();
        if (vehicle == null) return false;

        // -------- Duplicate prevention --------
        // If a non-closed maintenance row already exists for this vehicle + type
        // created in the last DUPLICATE_WINDOW_DAYS, skip.
        List<Maintenance> existing = maintenanceRepository.findByVehicleId(vehicle.getId());
        LocalDate cutoff = LocalDate.now().minusDays(DUPLICATE_WINDOW_DAYS);
        for (Maintenance m : existing) {
            boolean sameType = schedule.getServiceType() != null
                    && schedule.getServiceType().equalsIgnoreCase(m.getType());
            boolean notClosed = m.getStatus() == null || !"closed".equalsIgnoreCase(m.getStatus());
            boolean recent = m.getCreatedAt() != null
                    && m.getCreatedAt().toLocalDate().isAfter(cutoff);

            if (sameType && notClosed && recent) {
                log.info("⏭️ Skipping duplicate auto-create for {} / {}",
                        vehicle.getRegistration(), schedule.getServiceType());
                return false;
            }
        }

        // -------- Build a maintenance job --------
        Maintenance job = new Maintenance();
        job.setTenant(schedule.getTenant());
        job.setVehicle(vehicle);
        job.setType(schedule.getServiceType());
        job.setStatus("logged");
        job.setPriority("medium");
        job.setReportedBy("Scheduler");

        StringBuilder desc = new StringBuilder("Auto-created from service schedule.");
        Object kmRemaining = due.get("kmRemaining");
        Object daysRemaining = due.get("daysRemaining");
        if (kmRemaining != null) {
            BigDecimal km = (BigDecimal) kmRemaining;
            desc.append(" ").append(km.compareTo(BigDecimal.ZERO) < 0 ? "Overdue by " : "Due in ")
                .append(km.abs().setScale(0, java.math.RoundingMode.HALF_UP)).append(" km.");
        }
        if (daysRemaining != null) {
            Long d = (Long) daysRemaining;
            desc.append(" ").append(d < 0 ? "Overdue by " : "Due in ")
                .append(Math.abs(d)).append(" days.");
        }
        job.setDescription(desc.toString());

        // Default schedule today
        job.setScheduledDate(LocalDate.now().plusDays(3));

        Maintenance saved = maintenanceService.createMaintenance(job);
        log.info("🛠️ Work order created: {} for vehicle {} (id={})",
                schedule.getServiceType(), vehicle.getRegistration(), saved.getId());

        // -------- Notify car owners --------
        try {
            String title = "🔧 Service Due: " + schedule.getServiceType();
            String message = "Vehicle " + vehicle.getRegistration()
                    + " is due for " + schedule.getServiceType() + ". "
                    + desc.toString();
            notificationService.notifyTenantOwners(
                    schedule.getTenant().getId(),
                    "maintenance_due",
                    title,
                    message,
                    "/maintenance"
            );
        } catch (Exception e) {
            log.warn("⚠️ Failed to send service-due notification: {}", e.getMessage());
        }

        return true;
    }
}