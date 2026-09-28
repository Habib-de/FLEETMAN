package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.NotificationDTO;
import com.fleetman.entity.Notification;
import com.fleetman.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
    public ResponseEntity<ApiResponse<NotificationDTO>> createNotification(@Valid @RequestBody Notification notification) {
        Notification created = notificationService.createNotification(notification);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Notification created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationDTO>> getNotificationById(@PathVariable String id) {
        Notification notification = notificationService.getNotificationById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(notification)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsByUser(@PathVariable String userId) {
        List<Notification> notifications = notificationService.getNotificationsByUser(userId);
        List<NotificationDTO> dtos = notifications.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getUnreadNotifications(@PathVariable String userId) {
        List<Notification> notifications = notificationService.getUnreadNotifications(userId);
        List<NotificationDTO> dtos = notifications.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/user/{userId}/unread/count")
    public ResponseEntity<ApiResponse<Long>> countUnreadNotifications(@PathVariable String userId) {
        long count = notificationService.countUnreadNotifications(userId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable String id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(@PathVariable String userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.success("Notification deleted successfully", null));
    }

        /**
     * Manager replies to a driver report.
     * The reply is sent as a notification to the driver referenced by the
     * original driver-report notification.
     *
     * POST /api/notifications/{id}/reply
     * Body: { "message": "On my way", "driverUserId": "uuid" }
     */
    @PostMapping("/{id}/reply")
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<Void>> replyToDriver(
            @PathVariable String id,
            @RequestBody java.util.Map<String, String> body) {
        String message = body.get("message");
        String driverUserId = body.get("driverUserId");

        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("message is required"));
        }

        try {
            notificationService.replyToDriverReport(id, driverUserId, message);
            return ResponseEntity.ok(ApiResponse.success("Reply sent to driver", null));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.error("Failed to send reply"));
        }
    }

    private NotificationDTO convertToDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setTenantId(notification.getTenant() != null ? notification.getTenant().getId() : null);
        dto.setUserId(notification.getUser() != null ? notification.getUser().getId() : null);
        dto.setUserName(notification.getUser() != null ? notification.getUser().getName() : null);
        dto.setType(notification.getType());
        dto.setTitle(notification.getTitle());
        dto.setMessage(notification.getMessage());
        dto.setIsRead(notification.getIsRead());
        dto.setReadAt(notification.getReadAt());
        dto.setLink(notification.getLink());
        dto.setCreatedAt(notification.getCreatedAt());
        return dto;
    }
}