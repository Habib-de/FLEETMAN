package com.fleetman.repository;

import com.fleetman.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    
    List<AuditLog> findByTenantIdOrderByCreatedAtDesc(String tenantId);
    
    List<AuditLog> findByUserIdOrderByCreatedAtDesc(String userId);
    
    List<AuditLog> findByEntityTypeAndEntityId(String entityType, String entityId);
    
    List<AuditLog> findByAction(String action);
}