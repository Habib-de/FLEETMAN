package com.fleetman.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleetman.entity.Tenant;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TenantService {
    
    private final TenantRepository tenantRepository;
    private final ObjectMapper objectMapper; // ✅ Add this
    
    @Transactional
    public Tenant createTenant(Tenant tenant) {
        if (tenantRepository.existsBySubdomain(tenant.getSubdomain())) {
            throw new RuntimeException("Subdomain already exists: " + tenant.getSubdomain());
        }
        return tenantRepository.save(tenant);
    }
    
    public Tenant getTenantById(String id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with id: " + id));
    }
    
    public Tenant getTenantBySubdomain(String subdomain) {
        return tenantRepository.findBySubdomain(subdomain)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant not found with subdomain: " + subdomain));
    }
    
    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }
    
    @Transactional
    public Tenant updateTenant(String id, Tenant tenantDetails) {
        Tenant tenant = getTenantById(id);
        tenant.setName(tenantDetails.getName());
        tenant.setSubdomain(tenantDetails.getSubdomain());
        tenant.setStatus(tenantDetails.getStatus());
        tenant.setConfig(tenantDetails.getConfig());
        tenant.setCardPoolingEnabled(tenantDetails.getCardPoolingEnabled());
        return tenantRepository.save(tenant);
    }
    
    @Transactional
    public void deleteTenant(String id) {
        Tenant tenant = getTenantById(id);
        tenantRepository.delete(tenant);
    }
    
    public boolean isCardPoolingEnabled(String tenantId) {
        Tenant tenant = getTenantById(tenantId);
        return tenant.getCardPoolingEnabled() != null && tenant.getCardPoolingEnabled();
    }
    
    // ============================================
    // ✅ NEW: UPDATE TENANT LOCATION
    // ============================================
    @Transactional
    public Tenant updateTenantLocation(String id, Map<String, Object> locationData) {
        Tenant tenant = getTenantById(id);
        
        try {
            Map<String, Object> config = new HashMap<>();
            
            // Get existing config if any
            if (tenant.getConfig() != null && !tenant.getConfig().isEmpty()) {
                config = objectMapper.readValue(tenant.getConfig(), Map.class);
            }
            
            // Update location data
            config.put("location", locationData);
            
            // Convert back to JSON string
            tenant.setConfig(objectMapper.writeValueAsString(config));
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to update location: " + e.getMessage());
        }
        
        return tenantRepository.save(tenant);
    }

    // ============================================
// ✅ POOL BOOKING METHODS
// ============================================

@Transactional
public Tenant requestPoolBooking(String tenantId, Boolean enabled) {
    Tenant tenant = getTenantById(tenantId);
    tenant.setPoolBookingEnabled(enabled);
    if (enabled) {
        tenant.setPoolBookingRequestedAt(LocalDateTime.now());
        tenant.setPoolBookingApproved(false);
        tenant.setPoolBookingDeniedReason(null);
    }
    return tenantRepository.save(tenant);
}

@Transactional
public Tenant approvePoolBooking(String tenantId) {
    Tenant tenant = getTenantById(tenantId);
    tenant.setPoolBookingApproved(true);
    tenant.setPoolBookingApprovedAt(LocalDateTime.now());
    tenant.setPoolBookingDeniedReason(null);
    return tenantRepository.save(tenant);
}

@Transactional
public Tenant denyPoolBooking(String tenantId, String reason) {
    Tenant tenant = getTenantById(tenantId);
    tenant.setPoolBookingApproved(false);
    tenant.setPoolBookingApprovedAt(LocalDateTime.now());
    tenant.setPoolBookingDeniedReason(reason);
    return tenantRepository.save(tenant);
}

public boolean isPoolBookingAvailable(String tenantId) {
    Tenant tenant = getTenantById(tenantId);
    return tenant.getPoolBookingEnabled() != null && 
           tenant.getPoolBookingEnabled() && 
           tenant.getPoolBookingApproved() != null && 
           tenant.getPoolBookingApproved();
}

public List<Tenant> getTenantsWithPoolBookingRequests() {
    return tenantRepository.findByPoolBookingEnabledTrue();
}
    
    // ============================================
    // ✅ NEW: GET TENANT LOCATION
    // ============================================
    public Map<String, Object> getTenantLocation(String id) {
        Tenant tenant = getTenantById(id);
        
        if (tenant.getConfig() == null || tenant.getConfig().isEmpty()) {
            return null;
        }
        
        try {
            Map<String, Object> config = objectMapper.readValue(tenant.getConfig(), Map.class);
            Object location = config.get("location");
            
            if (location instanceof Map) {
                return (Map<String, Object>) location;
            }
            return null;
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse location: " + e.getMessage());
        }
    }
}