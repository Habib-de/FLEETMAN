package com.fleetman.repository;

import com.fleetman.entity.User;
import com.fleetman.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    
    Optional<User> findByEmail(String email);
    
    boolean existsByEmail(String email);

    boolean existsByRole(UserRole role);
    
    List<User> findByTenantIdAndRole(String tenantId, UserRole role);
    
    List<User> findByTenantId(String tenantId);
    
    List<User> findByRole(UserRole role);
    
    long countByTenantId(String tenantId);

    // ✅ ADD THIS LINE HERE
    Optional<User> findByResetToken(String resetToken);
}