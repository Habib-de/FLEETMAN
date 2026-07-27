package com.fleetman.repository;

import com.fleetman.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    
    List<Notification> findByUserIdAndIsReadFalse(String userId);
    
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);
    
    long countByUserIdAndIsReadFalse(String userId);
}