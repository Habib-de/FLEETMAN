package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class NotificationDTO {
    private String id;
    private String tenantId;
    private String userId;
    private String userName;
    private String type;
    private String title;
    private String message;
    private Boolean isRead;
    private LocalDateTime readAt;
    private String link;
    private LocalDateTime createdAt;
}