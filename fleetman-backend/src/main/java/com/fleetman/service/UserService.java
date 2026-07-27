package com.fleetman.service;

import com.fleetman.entity.Tenant;
import com.fleetman.entity.User;
import com.fleetman.entity.UserRole;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final TenantService tenantService;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional
    public User createUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already exists: " + user.getEmail());
        }
        // user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        return userRepository.save(user);
    }
    
    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }
    
    public User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }
    
    public List<User> getUsersByTenant(String tenantId) {
        return userRepository.findByTenantId(tenantId);
    }
    
    public List<User> getUsersByRole(UserRole role) {
        return userRepository.findByRole(role);
    }
    
    // ✅ ADD THIS - Get ALL users
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    @Transactional
    public User updateUser(String id, User userDetails) {
        User user = getUserById(id);
        user.setName(userDetails.getName());
        user.setPhone(userDetails.getPhone());
        user.setAvatar(userDetails.getAvatar());
        user.setStatus(userDetails.getStatus());
        user.setRole(userDetails.getRole());
        user.setPermissions(userDetails.getPermissions());
        return userRepository.save(user);
    }
    
    @Transactional
    public void updateLastLogin(String email) {
        User user = getUserByEmail(email);
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }
    
    @Transactional
    public void changePassword(String id, String newPassword) {
        User user = getUserById(id);
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
    
    @Transactional
    public void deleteUser(String id) {
        User user = getUserById(id);
        userRepository.delete(user);
    }

    // Add to UserService.java
    @Transactional
    public User updateAvatar(String userId, String avatarData) {
    User user = getUserById(userId);
    user.setAvatar(avatarData);
    return userRepository.save(user);
    }
    
    public long countUsersByTenant(String tenantId) {
        return userRepository.countByTenantId(tenantId);
    }

    // ✅ ADD THESE TWO METHODS HERE
    public User findByResetToken(String resetToken) {
        return userRepository.findByResetToken(resetToken).orElse(null);
    }

    public User saveUser(User user) {
        return userRepository.save(user);
    }
}