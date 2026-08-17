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

        // ============================================
    // ✅ MULTI-LOCATION MANAGEMENT METHODS
    // ============================================

    public List<Map<String, Object>> getLocations(Tenant tenant) {
        String config = tenant.getConfig();
        if (config == null || config.isEmpty()) {
            return new java.util.ArrayList<>();
        }
        try {
            Map<String, Object> configMap = objectMapper.readValue(config, 
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
            Object locationsObj = configMap.get("locations");
            if (locationsObj == null) {
                return new java.util.ArrayList<>();
            }
            String locationsJson = objectMapper.writeValueAsString(locationsObj);
            return objectMapper.readValue(locationsJson, 
                    new com.fasterxml.jackson.core.type.TypeReference<java.util.List<Map<String, Object>>>() {});
        } catch (Exception e) {
            e.printStackTrace();
            return new java.util.ArrayList<>();
        }
    }

    @Transactional
    public Map<String, Object> addLocation(Tenant tenant, Map<String, Object> locationData) {
        java.util.List<Map<String, Object>> locations = getLocations(tenant);
        String locationId = java.util.UUID.randomUUID().toString();
        locationData.put("id", locationId);
        if (locations.isEmpty()) {
            locationData.put("isDefault", true);
        }
        locations.add(locationData);
        saveLocations(tenant, locations);
        return locationData;
    }

    @Transactional
public Map<String, Object> updateLocation(Tenant tenant, String locationId, Map<String, Object> locationData) {
    List<Map<String, Object>> locations = getLocations(tenant);
    
    for (int i = 0; i < locations.size(); i++) {
        Map<String, Object> loc = locations.get(i);
        String locId = loc.get("id").toString(); // ✅ Convert to string safely
        
        if (locId.equals(locationId)) {
            // ✅ FIX: Don't add the ID back - keep it as is
            // Instead, create a new map with the updated data
            Map<String, Object> updatedLoc = new HashMap<>(locationData);
            
            // ✅ Keep the original ID
            updatedLoc.put("id", locationId);
            
            // ✅ Preserve isDefault if not provided
            if (!updatedLoc.containsKey("isDefault") && loc.containsKey("isDefault")) {
                updatedLoc.put("isDefault", loc.get("isDefault"));
            }
            
            locations.set(i, updatedLoc);
            saveLocations(tenant, locations);
            return updatedLoc;
        }
    }
    throw new RuntimeException("Location not found with id: " + locationId);
}

    @Transactional
    public void deleteLocation(Tenant tenant, String locationId) {
        java.util.List<Map<String, Object>> locations = getLocations(tenant);
        locations.removeIf(loc -> loc.get("id").equals(locationId));
        if (!locations.isEmpty() && locations.stream().noneMatch(loc -> Boolean.TRUE.equals(loc.get("isDefault")))) {
            locations.get(0).put("isDefault", true);
        }
        saveLocations(tenant, locations);
    }

    private void saveLocations(Tenant tenant, java.util.List<Map<String, Object>> locations) {
    try {
        String config = tenant.getConfig();
        Map<String, Object> configMap;
        if (config != null && !config.isEmpty()) {
            configMap = objectMapper.readValue(config, 
                    new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
        } else {
            configMap = new java.util.HashMap<>();
        }

        // ✅ CRITICAL: Remove old location data to avoid conflicts
        configMap.remove("location");
        
        configMap.put("locations", locations);
        tenant.setConfig(objectMapper.writeValueAsString(configMap));
        tenantRepository.save(tenant);
    } catch (Exception e) {
        e.printStackTrace();
        throw new RuntimeException("Failed to save locations: " + e.getMessage());
    }
}
}