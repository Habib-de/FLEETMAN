package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.ForgotPasswordRequest;
import com.fleetman.dto.LoginRequest;
import com.fleetman.dto.LoginResponse;
import com.fleetman.dto.RegisterRequest;
import com.fleetman.dto.ResetPasswordRequest;
import com.fleetman.dto.UserDTO;
import com.fleetman.entity.Driver;
import com.fleetman.entity.Tenant;
import com.fleetman.entity.User;
import com.fleetman.entity.UserRole;
import com.fleetman.repository.DriverRepository;
import com.fleetman.security.JwtTokenProvider;
import com.fleetman.service.EmailService;
import com.fleetman.service.TenantService;
import com.fleetman.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import javax.validation.Valid;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final TenantService tenantService;
    private final JwtTokenProvider tokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final DriverRepository driverRepository;
    private final EmailService emailService;

    @PostMapping("/login")
public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest request) {
    Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
    );

    SecurityContextHolder.getContext().setAuthentication(authentication);
    String jwt = tokenProvider.generateToken(authentication);

    User user = userService.getUserByEmail(request.getEmail());
    
    // ✅ ADD THIS STATUS CHECK HERE (BEFORE updateLastLogin)
    if ("pending".equals(user.getStatus())) {
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error("Your account is pending admin approval. Please contact Mansoft for activation."));
    }
    
    if ("suspended".equals(user.getStatus())) {
        return ResponseEntity
            .status(HttpStatus.FORBIDDEN)
            .body(ApiResponse.error("Your account has been suspended. Please contact support."));
    }
    
    userService.updateLastLogin(request.getEmail());

    Tenant tenant = user.getTenant();

    // ✅ FIXED - Using map() instead of ifPresent to avoid lambda assignment issue
    String driverId = null;
    if (user.getRole() == UserRole.driver) {
        driverId = driverRepository.findByUserId(user.getId())
                .map(Driver::getId)
                .orElse(null);
    }

    LoginResponse response = new LoginResponse(
            jwt,
            null,
            user.getId(),
            user.getEmail(),
            user.getName(),
            user.getRole().name().toLowerCase(),
            tenant.getId(),
            tenant.getName(),
            tenant.getCardPoolingEnabled() != null && tenant.getCardPoolingEnabled(),
            user.getAvatar(),
            driverId
    );

    return ResponseEntity.ok(ApiResponse.success("Login successful", response));
}

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(@Valid @RequestBody RegisterRequest request) {
        try {
            
            if ("super_admin".equals(request.getRole())) {
            // Check if super admin already exists
            boolean superAdminExists = userService.existsByRole(UserRole.super_admin);
            if (superAdminExists) {
                return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("A Super Admin already exists in the system"));
            }
            
            // ✅ VALIDATE ADMIN KEY ON BACKEND
            String adminKey = request.getAdminKey();
            String ADMIN_SECRET_KEY = System.getenv().getOrDefault("ADMIN_SECRET_KEY", "fleetman_admin_2024");
            if (adminKey == null || !adminKey.equals(ADMIN_SECRET_KEY)) {
                return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid admin registration key"));
            }
        }

            // Check if user already exists
            try {
                userService.getUserByEmail(request.getEmail());
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Email already registered"));
            } catch (Exception e) {
                // User not found - proceed
            }

            Tenant tenant;

            // ============================================
            // ✅ FIXED: Handle ALL roles including "driver"
            // ============================================
            
            // 1. CAR_OWNER - Create new tenant
            if ("car_owner".equals(request.getRole())) {
                tenant = new Tenant();
                tenant.setName(request.getCompanyName());
                tenant.setSubdomain(request.getTenantId().toLowerCase());
                tenant.setStatus("active");
                tenant.setCardPoolingEnabled(false);
                tenant = tenantService.createTenant(tenant);
            } 
            // 2. SUPER_ADMIN - Use default tenant
            else if ("super_admin".equals(request.getRole())) {
                try {
                    tenant = tenantService.getTenantBySubdomain("default");
                } catch (Exception e) {
                    // Create default tenant automatically (one-time only)
                    tenant = new Tenant();
                    tenant.setName("Default Organization");
                    tenant.setSubdomain("default");
                    tenant.setStatus("active");
                    tenant.setCardPoolingEnabled(false);
                    tenant = tenantService.createTenant(tenant);
                }
            } 
            // 3. ✅ DRIVER - Use existing tenant
            else if ("driver".equals(request.getRole())) {
                try {
                    // Use the tenantId from the request
                    if (request.getTenantId() == null) {
                        return ResponseEntity.badRequest()
                                .body(ApiResponse.error("Tenant ID is required for driver registration"));
                    }
                    tenant = tenantService.getTenantById(request.getTenantId());
                    if (tenant == null) {
                        return ResponseEntity.badRequest()
                                .body(ApiResponse.error("Tenant not found"));
                    }
                } catch (Exception e) {
                    return ResponseEntity.badRequest()
                            .body(ApiResponse.error("Invalid tenant: " + e.getMessage()));
                }
            } 
            // 4. Invalid role
            else {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Invalid role specified. Valid roles: super_admin, car_owner, driver"));
            }

            // Create user
            User user = new User();
            user.setTenant(tenant);
            user.setEmail(request.getEmail());
            user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            user.setName(request.getName());
            user.setPhone(request.getPhone());
            user.setRole(UserRole.valueOf(request.getRole()));
            user.setStatus("active");

            User savedUser = userService.createUser(user);

            // Convert to DTO
            UserDTO userDTO = new UserDTO();
            userDTO.setId(savedUser.getId());
            userDTO.setEmail(savedUser.getEmail());
            userDTO.setName(savedUser.getName());
            userDTO.setRole(savedUser.getRole().name());
            userDTO.setPhone(savedUser.getPhone());
            userDTO.setTenantId(tenant.getId());
            userDTO.setStatus(savedUser.getStatus());
            userDTO.setCreatedAt(savedUser.getCreatedAt());

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("User registered successfully", userDTO));

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Logout successful", null));
    }

    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Boolean>> validateToken(@RequestHeader("Authorization") String token) {
        if (token != null && token.startsWith("Bearer ")) {
            String jwt = token.substring(7);
            boolean isValid = tokenProvider.validateToken(jwt);
            return ResponseEntity.ok(ApiResponse.success("Token validation result", isValid));
        }
        return ResponseEntity.ok(ApiResponse.success("Token validation result", false));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<LoginResponse>> getCurrentUser(
            @RequestHeader("Authorization") String authHeader) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Missing or invalid authorization header"));
        }

        String token = authHeader.substring(7);

        if (!tokenProvider.validateToken(token)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid or expired token"));
        }

        String email = tokenProvider.getUsernameFromToken(token);
        User user = userService.getUserByEmail(email);

        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error("User not found"));
        }

        Tenant tenant = user.getTenant();

        // ✅ FIXED - Using map() instead of ifPresent to avoid lambda assignment issue
        String driverId = null;
        if (user.getRole() == UserRole.driver) {
            driverId = driverRepository.findByUserId(user.getId())
                    .map(Driver::getId)
                    .orElse(null);
        }

        LoginResponse response = new LoginResponse(
                null, // don't return token on /me
                null,
                user.getId(),
                user.getEmail(),
                user.getName(),
                user.getRole().name().toLowerCase(),
                tenant.getId(),
                tenant.getName(),
                tenant.getCardPoolingEnabled() != null && tenant.getCardPoolingEnabled(),
                user.getAvatar(),
                driverId
        );

        return ResponseEntity.ok(ApiResponse.success("User retrieved successfully", response));
    }

    @PostMapping("/forgot-password")
public ResponseEntity<ApiResponse<Map<String, String>>> forgotPassword(
        @Valid @RequestBody ForgotPasswordRequest request) {
    try {
        String email = request.getEmail();
        System.out.println("🔵 Forgot password request for: " + email);
        
        User user;
        try {
            user = userService.getUserByEmail(email);
            System.out.println("✅ User found: " + user.getEmail());
        } catch (Exception e) {
            System.out.println("❌ User not found: " + email);
            return ResponseEntity.ok(ApiResponse.success(
                "If an account exists with this email, a reset link will be sent", 
                null
            ));
        }
        
        if (user == null) {
            System.out.println("❌ User is null for: " + email);
            return ResponseEntity.ok(ApiResponse.success(
                "If an account exists with this email, a reset link will be sent", 
                null
            ));
        }

        // Generate reset token
        String resetToken = UUID.randomUUID().toString();
        LocalDateTime expiryTime = LocalDateTime.now().plusHours(1);
        
        user.setResetToken(resetToken);
        user.setResetTokenExpiry(expiryTime);
        userService.saveUser(user);
        
        System.out.println("=========================================");
        System.out.println("✅ RESET TOKEN GENERATED");
        System.out.println("📧 Email: " + email);
        System.out.println("🔑 Token: " + resetToken);
        System.out.println("=========================================");
        
        // ✅ SEND EMAIL WITH RESET LINK
        try {
            emailService.sendResetPasswordEmail(email, resetToken);
            System.out.println("✅ Email sent successfully to: " + email);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email: " + e.getMessage());
            e.printStackTrace();
            // Don't return here - continue to return the token
        }
        
        // Return token in response (for testing)
        Map<String, String> data = new HashMap<>();
        data.put("resetToken", resetToken);
        data.put("resetLink", "http://localhost:3000/reset-password?token=" + resetToken);
        
        return ResponseEntity.ok(ApiResponse.success(
            "Password reset link sent to your email", 
            data
        ));
        
    } catch (Exception e) {
        System.err.println("❌ Error in forgot password: " + e.getMessage());
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Failed to process reset request: " + e.getMessage()));
    }
}

@PostMapping("/reset-password")
public ResponseEntity<ApiResponse<String>> resetPassword(
        @Valid @RequestBody ResetPasswordRequest request) {
    try {
        String token = request.getToken();
        String newPassword = request.getNewPassword();
        
        if (token == null || token.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Reset token is required"));
        }
        
        if (newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Password must be at least 6 characters"));
        }
        
        User user = userService.findByResetToken(token);
        
        if (user == null) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Invalid or expired reset token"));
        }
        
        if (user.getResetTokenExpiry() == null || 
            user.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Reset token has expired"));
        }
        
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetToken(null);
        user.setResetTokenExpiry(null);
        userService.saveUser(user);
        
        return ResponseEntity.ok(ApiResponse.success(
            "Password reset successfully", 
            null
        ));
        
    } catch (Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("Failed to reset password: " + e.getMessage()));
    }
}
}