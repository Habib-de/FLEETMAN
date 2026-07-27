package com.fleetman.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private String token;
    private String refreshToken;
    private String id;              // was userId — matches frontend expectation
    private String email;
    private String name;
    private String role;
    private String tenantId;
    private String tenantName;
    private boolean cardPoolingEnabled;
    private String avatar;   
    private String driverId;        // NEW — needed for header profile image
}