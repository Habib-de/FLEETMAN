package com.fleetman.service;

import com.fleetman.entity.Driver;
import com.fleetman.entity.SafetyEvent;
import com.fleetman.entity.TrackingData;
import com.fleetman.entity.Trip;
import com.fleetman.entity.Vehicle;
import com.fleetman.repository.DriverRepository;
import com.fleetman.repository.SafetyEventRepository;
import com.fleetman.repository.TripRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class SafetyService {

    private final SafetyEventRepository safetyEventRepository;
    private final DriverRepository driverRepository;
    private final TripRepository tripRepository;

    // ============================================
    // EVENT THRESHOLDS
    // ============================================
    private static final double HARSH_BRAKE_DROP_KMH = 20.0;      // speed drop threshold
    private static final double HARSH_ACCEL_RISE_KMH = 20.0;      // speed rise threshold
    private static final double HARSH_CORNER_DEGREES = 40.0;      // heading change threshold
    private static final double HARSH_CORNER_MIN_SPEED = 40.0;    // must be going fast
    private static final double SPEEDING_KMH = 75.0;              // over speed limit threshold

    // ============================================
    // SCORE WEIGHTS (points deducted per event)
    // ============================================
    private static final Map<String, Map<String, Integer>> WEIGHTS = new HashMap<>();
    static {
        Map<String, Integer> harshBrake = new HashMap<>();
        harshBrake.put("LOW", 2); harshBrake.put("MEDIUM", 4); harshBrake.put("HIGH", 7);
        WEIGHTS.put("HARSH_BRAKE", harshBrake);

        Map<String, Integer> harshAccel = new HashMap<>();
        harshAccel.put("LOW", 1); harshAccel.put("MEDIUM", 3); harshAccel.put("HIGH", 5);
        WEIGHTS.put("HARSH_ACCEL", harshAccel);

        Map<String, Integer> harshCorner = new HashMap<>();
        harshCorner.put("LOW", 2); harshCorner.put("MEDIUM", 4); harshCorner.put("HIGH", 6);
        WEIGHTS.put("HARSH_CORNER", harshCorner);

        Map<String, Integer> speeding = new HashMap<>();
        speeding.put("LOW", 3); speeding.put("MEDIUM", 6); speeding.put("HIGH", 10);
        WEIGHTS.put("SPEEDING", speeding);
    }

    // ============================================
    // DETECT EVENTS between two consecutive tracking points
    // ============================================
    @Transactional
    public void detectAndSaveEvents(TrackingData latest, TrackingData previous) {
        if (latest == null) return;

        // Need a previous point to compare against
        if (previous == null) {
            return;
        }

        // Both must be for the same vehicle
        if (latest.getVehicle() == null || previous.getVehicle() == null) return;
        if (!latest.getVehicle().getId().equals(previous.getVehicle().getId())) return;

        // Must have a driver (otherwise we can't attribute the event)
        if (latest.getDriver() == null) return;

        // Speed delta
        BigDecimal latestSpeed = latest.getSpeed() != null ? latest.getSpeed() : BigDecimal.ZERO;
        BigDecimal prevSpeed = previous.getSpeed() != null ? previous.getSpeed() : BigDecimal.ZERO;
        double speedDelta = latestSpeed.doubleValue() - prevSpeed.doubleValue();

        // Time delta in seconds
        long seconds = 0;
        if (latest.getTimestamp() != null && previous.getTimestamp() != null) {
            seconds = Math.abs(Duration.between(previous.getTimestamp(), latest.getTimestamp()).getSeconds());
        }
        if (seconds > 30 || seconds == 0) {
            // Too much time between points — skip (probably a gap)
            return;
        }

        // ---------- HARSH BRAKE ----------
        if (speedDelta <= -HARSH_BRAKE_DROP_KMH) {
            String severity = classifyBrakeAccelSeverity(Math.abs(speedDelta));
            saveEvent(latest, "HARSH_BRAKE", severity, BigDecimal.valueOf(speedDelta));
            return; // one event per point
        }

        // ---------- HARSH ACCEL ----------
        if (speedDelta >= HARSH_ACCEL_RISE_KMH) {
            String severity = classifyBrakeAccelSeverity(speedDelta);
            saveEvent(latest, "HARSH_ACCEL", severity, BigDecimal.valueOf(speedDelta));
            return;
        }

        // ---------- HARSH CORNER ----------
        if (latest.getHeading() != null && previous.getHeading() != null
                && latestSpeed.doubleValue() >= HARSH_CORNER_MIN_SPEED) {
            int headingDelta = Math.abs(latest.getHeading() - previous.getHeading());
            if (headingDelta > 180) headingDelta = 360 - headingDelta;
            if (headingDelta >= HARSH_CORNER_DEGREES) {
                String severity = classifyCornerSeverity(headingDelta);
                saveEvent(latest, "HARSH_CORNER", severity, BigDecimal.ZERO);
                return;
            }
        }

        // ---------- SPEEDING ----------
        if (latestSpeed.doubleValue() >= SPEEDING_KMH) {
            String severity = classifySpeedingSeverity(latestSpeed.doubleValue());
            saveEvent(latest, "SPEEDING", severity, BigDecimal.ZERO);
        }
    }

    private String classifyBrakeAccelSeverity(double delta) {
        if (delta >= 45) return "HIGH";
        if (delta >= 30) return "MEDIUM";
        return "LOW";
    }

    private String classifyCornerSeverity(int degrees) {
        if (degrees >= 90) return "HIGH";
        if (degrees >= 60) return "MEDIUM";
        return "LOW";
    }

    private String classifySpeedingSeverity(double speed) {
        if (speed >= 100) return "HIGH";
        if (speed >= 85) return "MEDIUM";
        return "LOW";
    }

    private void saveEvent(TrackingData data, String type, String severity, BigDecimal delta) {
        try {
            SafetyEvent event = new SafetyEvent();
            event.setTenant(data.getTenant());
            event.setVehicle(data.getVehicle());
            event.setDriver(data.getDriver());
            event.setType(type);
            event.setSeverity(severity);
            event.setLat(data.getLat());
            event.setLng(data.getLng());
            event.setSpeed(data.getSpeed());
            event.setSpeedDelta(delta);
            event.setTimestamp(data.getTimestamp() != null ? data.getTimestamp() : LocalDateTime.now());

            // Attach trip if there's an active one for this vehicle
            if (data.getVehicle() != null) {
                try {
                    Optional<Trip> activeTrip = tripRepository.findActiveTripWithGeofence(data.getVehicle().getId());
                    activeTrip.ifPresent(event::setTrip);
                } catch (Exception ignored) {
                }
            }

            safetyEventRepository.save(event);
            log.info("🚨 Safety event: {} ({}) for driver {}",
                    type, severity, data.getDriver().getName());

            // Recompute the driver's score immediately
            updateDriverScore(data.getDriver().getId());

        } catch (Exception e) {
            log.warn("⚠️ Failed to save safety event: {}", e.getMessage());
        }
    }

    // ============================================
    // COMPUTE SAFETY SCORE for a driver
    // ============================================
    public Map<String, Object> computeScore(String driverId) {
        Map<String, Object> result = new LinkedHashMap<>();

        Driver driver = driverRepository.findById(driverId).orElse(null);
        if (driver == null) {
            result.put("score", 100);
            result.put("breakdown", new ArrayList<>());
            result.put("eventCounts", new HashMap<>());
            result.put("totalEvents", 0);
            result.put("trend", "stable");
            result.put("computedAt", LocalDateTime.now());
            return result;
        }

        LocalDateTime since = LocalDateTime.now().minusDays(90);
        List<SafetyEvent> events = safetyEventRepository.findByDriverIdAndTimestampAfter(driverId, since);

        double score = 100.0;
        Map<String, Integer> eventCounts = new HashMap<>();
        Map<String, Double> eventPenalties = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        for (SafetyEvent event : events) {
            String type = event.getType();
            String severity = event.getSeverity();

            // Get weight
            Map<String, Integer> typeWeights = WEIGHTS.get(type);
            if (typeWeights == null) continue;
            Integer weight = typeWeights.get(severity);
            if (weight == null) continue;

            // Time decay: recent events count more
            long daysAgo = Duration.between(event.getTimestamp(), now).toDays();
            double decay = 1.0 / (1.0 + daysAgo * 0.05);

            double penalty = weight * decay;
            score -= penalty;

            // Accumulate for breakdown
            eventCounts.merge(type, 1, Integer::sum);
            eventPenalties.merge(type, penalty, Double::sum);
        }

        // Clamp
        score = Math.max(0.0, Math.min(100.0, score));

        // Trend: compare last 7 days vs previous 7 days
        String trend = computeTrend(driverId);

        // Build breakdown
        List<Map<String, Object>> breakdown = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : eventCounts.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("type", entry.getKey());
            item.put("count", entry.getValue());
            item.put("penalty", Math.round(eventPenalties.getOrDefault(entry.getKey(), 0.0) * 10.0) / 10.0);
            breakdown.add(item);
        }

        result.put("score", Math.round(score));
        result.put("breakdown", breakdown);
        result.put("eventCounts", eventCounts);
        result.put("totalEvents", events.size());
        result.put("trend", trend);
        result.put("computedAt", LocalDateTime.now());

        return result;
    }

    // ============================================
    // TREND: last 7 days vs previous 7 days
    // ============================================
    private String computeTrend(String driverId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysAgo = now.minusDays(7);
        LocalDateTime fourteenDaysAgo = now.minusDays(14);

        long recent = safetyEventRepository.countByDriverIdAndTimestampAfter(driverId, sevenDaysAgo);
        long previous = safetyEventRepository.countByDriverIdAndTimestampAfter(driverId, fourteenDaysAgo) - recent;

        if (recent < previous) return "improving";
        if (recent > previous) return "declining";
        return "stable";
    }

    // ============================================
    // UPDATE Driver.safetyScore (cached field)
    // ============================================
    @Transactional
    public void updateDriverScore(String driverId) {
        try {
            Map<String, Object> computed = computeScore(driverId);
            Object scoreObj = computed.get("score");
            Integer newScore = scoreObj instanceof Number ? ((Number) scoreObj).intValue() : 100;

            Driver driver = driverRepository.findById(driverId).orElse(null);
            if (driver == null) return;

            driver.setSafetyScore(newScore);
            driverRepository.save(driver);

            log.info("✅ Driver {} score updated to {}", driver.getName(), newScore);
        } catch (Exception e) {
            log.warn("⚠️ Failed to update driver score: {}", e.getMessage());
        }
    }

    // ============================================
    // RECENT EVENTS for a driver
    // ============================================
    public List<SafetyEvent> getRecentEvents(String driverId, int limit) {
        List<SafetyEvent> events = safetyEventRepository.findByDriverIdOrderByTimestampDesc(driverId);
        if (events.size() > limit) {
            return events.subList(0, limit);
        }
        return events;
    }
}