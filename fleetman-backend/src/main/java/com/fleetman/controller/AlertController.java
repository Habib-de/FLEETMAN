package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.service.AlertService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/alerts")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class AlertController {

    private final AlertService alertService;

    /**
     * Manager (car owner / super admin) sends an alert to the driver of a given vehicle.
     * POST /api/alerts/send
     * Body: {
     *   "vehicleId": "uuid",
     *   "alertType": "SLOW_DOWN",
     *   "message": "optional custom text",
     *   "senderName": "Manager Name"
     * }
     */
    @PostMapping("/send")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendAlert(@RequestBody Map<String, String> body) {
        try {
            String vehicleId = body.get("vehicleId");
            String alertType = body.get("alertType");
            String message = body.get("message");
            String senderName = body.get("senderName");

            log.info("🚨 Alert send request: vehicle={}, type={}", vehicleId, alertType);

            if (vehicleId == null || vehicleId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("vehicleId is required"));
            }
            if (alertType == null || alertType.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("alertType is required"));
            }

            Map<String, Object> result = alertService.sendManagerAlert(
                    vehicleId,
                    alertType,
                    message,
                    senderName
            );

            return ResponseEntity.ok(ApiResponse.success("Alert sent to driver", result));

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("⚠️ Alert send failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Alert send crashed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to send alert"));
        }
    }

    
    /**
     * Driver sends a report to the manager(s) of their tenant.
     * POST /api/alerts/report
     * Body: {
     *   "vehicleId": "uuid",
     *   "driverId": "uuid (optional)",
     *   "reportType": "BREAKDOWN",
     *   "message": "optional custom text",
     *   "lat": -1.2921,
     *   "lng": 36.8219,
     *   "speed": 45
     * }
     */
    @PostMapping("/report")
    @PreAuthorize("hasRole('driver')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> sendDriverReport(
            @RequestBody Map<String, Object> body) {
        try {
            String vehicleId  = body.get("vehicleId")  != null ? body.get("vehicleId").toString()  : null;
            String driverId   = body.get("driverId")   != null ? body.get("driverId").toString()   : null;
            String reportType = body.get("reportType") != null ? body.get("reportType").toString() : null;
            String message    = body.get("message")    != null ? body.get("message").toString()    : null;

            Double lat   = body.get("lat")   != null ? ((Number) body.get("lat")).doubleValue()   : null;
            Double lng   = body.get("lng")   != null ? ((Number) body.get("lng")).doubleValue()   : null;
            Double speed = body.get("speed") != null ? ((Number) body.get("speed")).doubleValue() : null;

            log.info("📣 Driver report request: vehicle={}, type={}", vehicleId, reportType);

            if (vehicleId == null || vehicleId.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("vehicleId is required"));
            }
            if (reportType == null || reportType.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("reportType is required"));
            }

            Map<String, Object> result = alertService.sendDriverReport(
                    vehicleId,
                    driverId,
                    reportType,
                    message,
                    lat,
                    lng,
                    speed
            );

            return ResponseEntity.ok(ApiResponse.success("Report sent to manager", result));

        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("⚠️ Driver report failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("❌ Driver report crashed: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to send report"));
        }
    }
}