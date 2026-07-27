package com.fleetman.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserDTO {
    private String id;
    private String tenantId;
    private String email;
    private String name;
    private String role;
    private String permissions;
    private String avatar;
    private String phone;
    private LocalDateTime lastLogin;
    private String status;
    private LocalDateTime createdAt;
    private String driverId;
}