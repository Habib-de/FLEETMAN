package com.fleetman.repository;

import com.fleetman.entity.ServiceSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceScheduleRepository extends JpaRepository<ServiceSchedule, String> {

    // All schedules for a tenant
    List<ServiceSchedule> findByTenantId(String tenantId);

    // All schedules for a specific vehicle
    List<ServiceSchedule> findByVehicleId(String vehicleId);

    // Active schedules for a specific vehicle
    List<ServiceSchedule> findByVehicleIdAndIsActiveTrue(String vehicleId);

    // Active schedules for an entire tenant (used by the daily scheduler)
    List<ServiceSchedule> findByTenantIdAndIsActiveTrue(String tenantId);

    // Active schedules across ALL tenants (used when scheduler runs globally)
    List<ServiceSchedule> findByIsActiveTrue();

    // Lookup specific service type for a vehicle (prevents duplicate schedules)
    List<ServiceSchedule> findByVehicleIdAndServiceType(String vehicleId, String serviceType);
}