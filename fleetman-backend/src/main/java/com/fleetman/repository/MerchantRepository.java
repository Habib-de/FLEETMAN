package com.fleetman.repository;

import com.fleetman.entity.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, String> {
    
    List<Merchant> findByTenantId(String tenantId);
    
    List<Merchant> findByTenantIdAndStatus(String tenantId, String status);
    
    List<Merchant> findByType(String type);
}