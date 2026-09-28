package com.fleetman.service;

import com.fleetman.entity.Notification;
import com.fleetman.entity.User;
import com.fleetman.entity.UserRole;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.NotificationRepository;
import com.fleetman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ============================================
    // CREATE
    // ============================================

    @Transactional
    public Notification createNotification(Notification notification) {
        Notification saved = notificationRepository.save(notification);
        pushViaWebSocket(saved);
        return saved;
    }

    @Transactional
    public Notification notifyUser(User user, String type, String title, String message, String link) {
        if (user == null) {
            log.warn("⚠️ notifyUser called with null user");
            return null;
        }

        Notification n = new Notification();
        n.setTenant(user.getTenant());
        n.setUser(user);
        n.setType(type != null ? type : "info");
        n.setTitle(title);
        n.setMessage(message);
        n.setIsRead(false);
        n.setLink(link);

        Notification saved = notificationRepository.save(n);
        log.info("🔔 Notification created for user {}: {}", user.getId(), title);

        pushViaWebSocket(saved);
        return saved;
    }

    @Transactional
    public void notifyTenantOwners(String tenantId, String type, String title, String message, String link) {
        if (tenantId == null) {
            log.warn("⚠️ notifyTenantOwners called with null tenantId");
            return;
        }

        List<User> owners = userRepository.findByTenantIdAndRole(tenantId, UserRole.car_owner);
        if (owners == null || owners.isEmpty()) {
            log.warn("⚠️ No car_owners found for tenant {}", tenantId);
            return;
        }

        log.info("🔔 Sending notification to {} car_owner(s) of tenant {}", owners.size(), tenantId);

        for (User owner : owners) {
            notifyUser(owner, type, title, message, link);
        }
    }

    @Transactional
    public void notifyAllCarOwners(String type, String title, String message, String link) {
        List<User> owners = userRepository.findByRole(UserRole.car_owner);
        for (User owner : owners) {
            notifyUser(owner, type, title, message, link);
        }
    }

    // ============================================
    // READ
    // ============================================

    public Notification getNotificationById(String id) {
        return notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
    }

    public List<Notification> getUnreadNotifications(String userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    public List<Notification> getNotificationsByUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    public long countUnreadNotifications(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    // ============================================
    // UPDATE
    // ============================================

    @Transactional
    public void markAsRead(String id) {
        Notification notification = getNotificationById(id);
        notification.setIsRead(true);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllAsRead(String userId) {
        List<Notification> notifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
        notifications.forEach(notification -> {
            notification.setIsRead(true);
            notification.setReadAt(LocalDateTime.now());
        });
        notificationRepository.saveAll(notifications);
    }

    // ============================================
    // DELETE
    // ============================================

    @Transactional
    public void deleteNotification(String id) {
        Notification notification = getNotificationById(id);
        notificationRepository.delete(notification);
    }

    // ============================================
    // WEBSOCKET PUSH
    // ============================================

    private void pushViaWebSocket(Notification notification) {
        if (notification == null || notification.getUser() == null) return;

        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("id", notification.getId());
            payload.put("userId", notification.getUser().getId());
            payload.put("type", notification.getType());
            payload.put("title", notification.getTitle());
            payload.put("message", notification.getMessage());
            payload.put("link", notification.getLink());
            payload.put("isRead", false);
            payload.put("createdAt",
                    notification.getCreatedAt() != null ? notification.getCreatedAt().toString() : null);

            String destination = "/topic/notifications/" + notification.getUser().getId();
            messagingTemplate.convertAndSend(destination, payload);
            log.info("📡 Pushed notification to WebSocket topic: {}", destination);

        } catch (Exception e) {
            log.warn("⚠️ Failed to push notification via WebSocket: {}", e.getMessage());
        }
    }

        // ============================================
    // MANAGER → DRIVER REPLY
    // ============================================

    @Transactional
    public Notification replyToDriverReport(String originalNotificationId, String driverUserId, String message) {
        // 1. Load the original driver-report notification
        Notification original = notificationRepository.findById(originalNotificationId)
                .orElseThrow(() -> new IllegalArgumentException("Original notification not found: " + originalNotificationId));

        String type = original.getType();
        if (type == null || !type.startsWith("driver_report_")) {
            throw new IllegalArgumentException("Notification " + originalNotificationId + " is not a driver report");
        }

        // 2. Identify the driver user to notify
        User driverUser = null;

        // Priority A: explicit driverUserId from the request
        if (driverUserId != null && !driverUserId.isEmpty()) {
            driverUser = userRepository.findById(driverUserId).orElse(null);
        }

        // Priority B: fall back to parsing the message
        //   Original message format: "…— From: John Doe (KDA 123A)\n📍 lat, lng  🚗 45 km/h"
        if (driverUser == null) {
            driverUser = resolveDriverFromReportMessage(original);
        }

        if (driverUser == null) {
            throw new IllegalStateException("Could not determine which driver to reply to");
        }

        // 3. Build the reply notification
        String reportCode = type.replace("driver_report_", "");
        String title = "💬 Manager replied";
        String fullMessage = message + "\n— From: Fleet Manager";

        return notifyUser(driverUser, "driver_report_reply_" + reportCode, title, fullMessage, "/current-trip");
    }

    /**
     * Best-effort: parse the driver name from the original message and find
     * a user with that name in the same tenant.
     */
    private User resolveDriverFromReportMessage(Notification original) {
        if (original.getMessage() == null) return null;

        // Format: "…— From: <name> (<reg>)"
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("—\\s*From:\\s*([^\\(]+?)\\s*\\(");
        java.util.regex.Matcher m = p.matcher(original.getMessage());
        if (!m.find()) return null;

        String driverName = m.group(1).trim();
        if (driverName.isEmpty()) return null;

        // Try same tenant first
        if (original.getTenant() != null) {
            List<User> candidates = userRepository.findByTenantIdAndRole(
                    original.getTenant().getId(), UserRole.driver);
            if (candidates != null) {
                for (User u : candidates) {
                    if (driverName.equalsIgnoreCase(u.getName())) return u;
                }
            }
        }
        return null;
    }
}