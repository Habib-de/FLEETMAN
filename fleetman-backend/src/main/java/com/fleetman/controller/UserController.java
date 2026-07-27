package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.UserDTO;
import com.fleetman.entity.User;
import com.fleetman.entity.UserRole;
import com.fleetman.repository.DriverRepository;
import com.fleetman.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public class UserController {

    private final UserService userService;
    private final DriverRepository driverRepository;

    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> createUser(@Valid @RequestBody User user) {
        User created = userService.createUser(user);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("User created successfully", convertToDTO(created)));
    }

    // ✅ ADD THIS - Get ALL users (super_admin only)
    @GetMapping
    @PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        List<UserDTO> dtos = users.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable String id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(user)));
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserByEmail(@PathVariable String email) {
        User user = userService.getUserByEmail(email);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(user)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getUsersByTenant(@PathVariable String tenantId) {
        List<User> users = userService.getUsersByTenant(tenantId);
        List<UserDTO> dtos = users.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(@PathVariable String id, @Valid @RequestBody User user) {
        User updated = userService.updateUser(id, user);
        return ResponseEntity.ok(ApiResponse.success("User updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.success("User deleted successfully", null));
    }

    @PutMapping("/{id}/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@PathVariable String id, @RequestParam String newPassword) {
        userService.changePassword(id, newPassword);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    @GetMapping("/count/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<Long>> countUsersByTenant(@PathVariable String tenantId) {
        long count = userService.countUsersByTenant(tenantId);
        return ResponseEntity.ok(ApiResponse.success(count));
    }

    @PostMapping("/{id}/avatar")
@PreAuthorize("hasAnyRole('super_admin', 'car_owner', 'driver')")
public ResponseEntity<ApiResponse<Map<String, String>>> uploadAvatar(
        @PathVariable String id,
        @RequestParam("avatar") MultipartFile file) {
    try {
        // ✅ ADD DEBUG LOGGING
        System.out.println("📸 ========== AVATAR UPLOAD START ==========");
        System.out.println("📸 User ID: " + id);
        System.out.println("📸 File name: " + file.getOriginalFilename());
        System.out.println("📸 File size: " + file.getSize() + " bytes");
        System.out.println("📸 Content type: " + file.getContentType());
        System.out.println("📸 Is empty: " + file.isEmpty());
        
        if (file.isEmpty()) {
            System.out.println("❌ File is empty!");
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("File is empty"));
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            System.out.println("❌ Invalid content type: " + contentType);
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Only image files are allowed"));
        }
        
        if (file.getSize() > 2 * 1024 * 1024) {
            System.out.println("❌ File too large: " + file.getSize());
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("File size must be less than 2MB"));
        }
        
        byte[] bytes = file.getBytes();
        System.out.println("📸 Bytes read: " + bytes.length);
        
        String base64Image = Base64.getEncoder().encodeToString(bytes);
        System.out.println("📸 Base64 length: " + base64Image.length());
        
        String avatarData = "data:" + contentType + ";base64," + base64Image;
        System.out.println("📸 Avatar data length: " + avatarData.length());
        
        User user = userService.updateAvatar(id, avatarData);
        System.out.println("✅ User updated: " + user.getId());
        System.out.println("✅ Avatar saved, length: " + (user.getAvatar() != null ? user.getAvatar().length() : 0));
        
        Map<String, String> responseData = new HashMap<>();
        responseData.put("avatar", avatarData);
        
        return ResponseEntity.ok(ApiResponse.success("Avatar uploaded successfully", responseData));
        
    } catch (IOException e) {
        System.err.println("❌ IOException: " + e.getMessage());
        e.printStackTrace();
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to upload avatar: " + e.getMessage()));
    } catch (Exception e) {
        System.err.println("❌ Exception: " + e.getMessage());
        e.printStackTrace();
        return ResponseEntity.internalServerError()
                .body(ApiResponse.error("Failed to upload avatar: " + e.getMessage()));
    }
}

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setTenantId(user.getTenant() != null ? user.getTenant().getId() : null);
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setRole(user.getRole().name());
        dto.setPermissions(user.getPermissions());
        dto.setAvatar(user.getAvatar());
        dto.setPhone(user.getPhone());
        dto.setLastLogin(user.getLastLogin());
        dto.setStatus(user.getStatus());
        dto.setCreatedAt(user.getCreatedAt());
         // ✅ ADD THESE 4 LINES:
    if (user.getRole() == UserRole.driver) {
        driverRepository.findByUserId(user.getId())
            .ifPresent(driver -> dto.setDriverId(driver.getId()));
    }
        return dto;
    }
}