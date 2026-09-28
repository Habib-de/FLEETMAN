package com.fleetman.service;

import com.fleetman.entity.Alarm;
import com.fleetman.entity.Driver;
import com.fleetman.entity.Notification;
import com.fleetman.entity.User;
import com.fleetman.entity.UserRole;
import com.fleetman.entity.Vehicle;
import com.fleetman.repository.DriverRepository;
import com.fleetman.repository.UserRepository;
import com.fleetman.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final NotificationService notificationService;
    private final AlarmService alarmService;
    private final DriverRepository driverRepository;
    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;

    // ============================================
    // Alert catalog: code → [title, severity, defaultMessage, alarmType]
    // ============================================
    private static final Map<String, String[]> ALERT_TYPES = new HashMap<>();
    static {
        ALERT_TYPES.put("MESSAGE",         new String[]{"💬 Message",          "low",    "Please call the office when you can.",         "MANAGER_MESSAGE"});
        ALERT_TYPES.put("SLOW_DOWN",       new String[]{"⚠️ Slow Down",        "medium", "You were speeding. Please slow down.",         "MANAGER_SLOW_DOWN"});
        ALERT_TYPES.put("STOP_VEHICLE",    new String[]{"🛑 Stop Vehicle",     "high",   "Pull over safely immediately.",                "MANAGER_STOP"});
        ALERT_TYPES.put("WRONG_ROUTE",     new String[]{"📍 Wrong Route",      "medium", "You are off the planned route. Please return.", "MANAGER_WRONG_ROUTE"});
        ALERT_TYPES.put("RETURN_TO_DEPOT", new String[]{"⏱️ Return to Depot", "high",   "Please return to the depot immediately.",       "MANAGER_RETURN_DEPOT"});
        ALERT_TYPES.put("TAKE_BREAK",      new String[]{"☕ Take a Break",     "low",    "You've been driving a long time. Take a break.", "MANAGER_TAKE_BREAK"});
        ALERT_TYPES.put("DANGER_AHEAD",    new String[]{"🚨 Danger Ahead",     "high",   "Hazard reported on your route. Drive carefully.", "MANAGER_DANGER_AHEAD"});
        ALERT_TYPES.put("CALL_DISPATCH",   new String[]{"📞 Call Dispatch",    "high",   "Please call the dispatch office urgently.",     "MANAGER_CALL_DISPATCH"});
        ALERT_TYPES.put("ABORT_TRIP",      new String[]{"🚫 Abort Trip",       "high",   "Cancel the current trip and stand by.",         "MANAGER_ABORT"});
        ALERT_TYPES.put("ACKNOWLEDGE",     new String[]{"✅ Acknowledge",      "low",    "Confirm receipt of this message.",              "MANAGER_ACK"});
    }

    
    // ============================================
    // Driver report catalog: code → [title, severity, defaultMessage]
    // (reverse of ALERT_TYPES — driver → manager)
    // ============================================
    private static final Map<String, String[]> DRIVER_REPORTS = new HashMap<>();
    static {
        DRIVER_REPORTS.put("EMERGENCY",  new String[]{"🚨 Emergency",     "critical", "I have an emergency. Please respond immediately."});
        DRIVER_REPORTS.put("ACCIDENT",   new String[]{"💥 Accident",      "critical", "I have been in an accident. Please respond."});
        DRIVER_REPORTS.put("BREAKDOWN",  new String[]{"🔧 Breakdown",     "high",     "My vehicle has broken down. I need assistance."});
        DRIVER_REPORTS.put("CALLBACK",   new String[]{"📞 Call Me",       "high",     "Please call me as soon as possible."});
        DRIVER_REPORTS.put("ROAD_ISSUE", new String[]{"🚧 Road Issue",    "medium",   "There is a road issue blocking my route."});
        DRIVER_REPORTS.put("FUEL",       new String[]{"⛽ Low Fuel",      "medium",   "I am running low on fuel and need a refuel."});
        DRIVER_REPORTS.put("TRAFFIC",    new String[]{"🚦 Heavy Traffic", "low",      "Heavy traffic. Expect delays."});
        DRIVER_REPORTS.put("DELAY",      new String[]{"⏱️ Delay",         "low",      "I will be delayed."});
        DRIVER_REPORTS.put("MESSAGE",    new String[]{"💬 Message",       "low",      "Message from driver."});
        DRIVER_REPORTS.put("OTHER",      new String[]{"📝 Other",         "low",      "Other report from driver."});
    }

    // ============================================
    // Main entry point — send alert from manager to driver
    // ============================================
    @Transactional
    public Map<String, Object> sendManagerAlert(
            String vehicleId,
            String alertCode,
            String customMessage,
            String senderName
    ) {
        Map<String, Object> result = new HashMap<>();

        // 1. Validate alert code
        String[] meta = ALERT_TYPES.get(alertCode);
        if (meta == null) {
            throw new IllegalArgumentException("Unknown alert type: " + alertCode);
        }
        String title = meta[0];
        String severity = meta[1];
        String defaultMessage = meta[2];
        String alarmType = meta[3];
        String message = (customMessage != null && !customMessage.trim().isEmpty())
                ? customMessage.trim()
                : defaultMessage;

        // 2. Find vehicle
        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(vehicleId);
       if (!vehicleOpt.isPresent()) {
            throw new IllegalArgumentException("Vehicle not found: " + vehicleId);
        }
        Vehicle vehicle = vehicleOpt.get();

        // 3. Find driver assigned to this vehicle
        List<Driver> drivers = driverRepository.findByAssignedVehicleId(vehicleId);
        if (drivers == null || drivers.isEmpty()) {
            throw new IllegalStateException("No driver assigned to vehicle " + vehicle.getRegistration());
        }
        Driver driver = drivers.get(0);

        if (driver.getUser() == null) {
            throw new IllegalStateException("Driver has no linked user account — cannot push notification");
        }

        // 4. Create Notification (this pushes via WebSocket)
        String notifType = "manager_alert_" + alertCode;
        String fullMessage = message + "\n— From: " + (senderName != null ? senderName : "Fleet Manager");

        Notification savedNotif = notificationService.notifyUser(
                driver.getUser(),
                notifType,
                title,
                fullMessage,
                "/current-trip"
        );

        // 5. Create Alarm (audit trail for car owner)
        try {
            Alarm alarm = new Alarm();
            alarm.setTenant(vehicle.getTenant());
            alarm.setVehicle(vehicle);
            alarm.setDriver(driver);
            alarm.setType(alarmType);
            alarm.setSeverity(severity);
            alarm.setMessage(title + " — " + message);
            alarm.setLat(null);
            alarm.setLng(null);
            alarm.setResolved(false);
            alarmService.createAlarm(alarm);
            log.info("📝 Alarm logged: {} for vehicle {}", alarmType, vehicle.getRegistration());
        } catch (Exception e) {
            log.warn("⚠️ Could not create alarm log: {}", e.getMessage());
            // Don't fail the whole alert if alarm creation fails
        }

        // 6. Build response
        result.put("notificationId", savedNotif != null ? savedNotif.getId() : null);
        result.put("driverId", driver.getId());
        result.put("driverName", driver.getName());
        result.put("alertCode", alertCode);
        result.put("title", title);
        result.put("severity", severity);
        result.put("vehicleRegistration", vehicle.getRegistration());

        log.info("✅ Manager alert '{}' sent to driver {} ({})", alertCode, driver.getName(), driver.getUser().getId());

        return result;
    }

    // ============================================
    // Main entry point — driver sends a report to the manager(s)
    // Reverse of sendManagerAlert()
    // ============================================
    @Transactional
    public Map<String, Object> sendDriverReport(
            String vehicleId,
            String driverId,
            String reportCode,
            String customMessage,
            Double lat,
            Double lng,
            Double speed
    ) {
        Map<String, Object> result = new HashMap<>();

        // 1. Validate report code
        String[] meta = DRIVER_REPORTS.get(reportCode);
        if (meta == null) {
            throw new IllegalArgumentException("Unknown report type: " + reportCode);
        }
        String title = meta[0];
        String severity = meta[1];
        String defaultMessage = meta[2];
        String message = (customMessage != null && !customMessage.trim().isEmpty())
                ? customMessage.trim()
                : defaultMessage;

        // 2. Find vehicle (same lookup as sendManagerAlert)
        Optional<Vehicle> vehicleOpt = vehicleRepository.findById(vehicleId);
        if (!vehicleOpt.isPresent()) {
            throw new IllegalArgumentException("Vehicle not found: " + vehicleId);
        }
        Vehicle vehicle = vehicleOpt.get();

        // 3. Find driver — prefer explicit ID, fallback to assigned vehicle
        Driver driver = null;
        if (driverId != null && !driverId.isEmpty()) {
            driver = driverRepository.findById(driverId).orElse(null);
        }
        if (driver == null) {
            List<Driver> drivers = driverRepository.findByAssignedVehicleId(vehicleId);
            if (drivers != null && !drivers.isEmpty()) {
                driver = drivers.get(0);
            }
        }
        if (driver == null) {
            throw new IllegalStateException("No driver found for vehicle " + vehicle.getRegistration());
        }

        // 4. Find the manager(s) — the tenant's car_owner(s)
        if (vehicle.getTenant() == null) {
            throw new IllegalStateException("Vehicle has no tenant — cannot find manager");
        }
        List<User> managers = userRepository.findByTenantIdAndRole(
                vehicle.getTenant().getId(),
                UserRole.car_owner
        );
        if (managers == null || managers.isEmpty()) {
            throw new IllegalStateException("No manager found for tenant " + vehicle.getTenant().getId());
        }

        // 5. Notify every manager (this pushes via WebSocket, same as driver side)
        String notifType = "driver_report_" + reportCode;
        String fullMessage = message
                + "\n— From: " + driver.getName()
                + " (" + vehicle.getRegistration() + ")"
                + (lat != null && lng != null ? "\n📍 " + lat + ", " + lng : "")
                + (speed != null ? "  🚗 " + Math.round(speed) + " km/h" : "");

        for (User manager : managers) {
            notificationService.notifyUser(
                    manager,
                    notifType,
                    title,
                    fullMessage,
                    "/tracking"
            );
        }

        // 6. Also log an Alarm (audit trail — same as sendManagerAlert)
        try {
            Alarm alarm = new Alarm();
            alarm.setTenant(vehicle.getTenant());
            alarm.setVehicle(vehicle);
            alarm.setDriver(driver);
            alarm.setType("DRIVER_" + reportCode);
            alarm.setSeverity(severity);
            alarm.setMessage(title + " — " + message);
            alarm.setLat(lat != null ? java.math.BigDecimal.valueOf(lat) : null);
            alarm.setLng(lng != null ? java.math.BigDecimal.valueOf(lng) : null);
            alarm.setResolved(false);
            alarmService.createAlarm(alarm);
            log.info("📝 Driver alarm logged: DRIVER_{} for vehicle {}", reportCode, vehicle.getRegistration());
        } catch (Exception e) {
            log.warn("⚠️ Could not create alarm log: {}", e.getMessage());
        }

        // 7. Build response
        result.put("reportType", reportCode);
        result.put("title", title);
        result.put("severity", severity);
        result.put("driverId", driver.getId());
        result.put("driverName", driver.getName());
        result.put("vehicleRegistration", vehicle.getRegistration());
        result.put("notifiedManagers", managers.size());

        log.info("✅ Driver report '{}' sent — {} manager(s) notified", reportCode, managers.size());
        return result;
    }
}