package com.fleetman.repository;

import com.fleetman.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List; 
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, String> {
    
    Optional<Tenant> findBySubdomain(String subdomain);
    
    Optional<Tenant> findByName(String name);
    
    boolean existsBySubdomain(String subdomain);

    // ✅ POOL BOOKING METHODS
List<Tenant> findByPoolBookingEnabledTrue();

List<Tenant> findByPoolBookingApprovedTrue();

List<Tenant> findByPoolBookingEnabledTrueAndPoolBookingApprovedFalse();
}