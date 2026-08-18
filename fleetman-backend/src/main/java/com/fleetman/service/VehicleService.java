package com.fleetman.service;

import com.fleetman.entity.Driver;
import com.fleetman.entity.Vehicle;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class VehicleService {
    
    private final VehicleRepository vehicleRepository;
    private final DriverService driverService; // ✅ Inject DriverService for sync
    
    @Transactional
    public Vehicle createVehicle(Vehicle vehicle) {
        Vehicle savedVehicle = vehicleRepository.save(vehicle);
        
        // ✅ If a driver is assigned, update the driver's assignedVehicle
        if (savedVehicle.getDriver() != null) {
            try {
                Driver driver = savedVehicle.getDriver();
                // Make sure we have a managed entity
                Driver managedDriver = driverService.getDriverById(driver.getId());
                managedDriver.setAssignedVehicle(savedVehicle);
                driverService.updateDriver(managedDriver.getId(), managedDriver);
                System.out.println("✅ Vehicle " + savedVehicle.getRegistration() + " assigned to driver: " + managedDriver.getName());
            } catch (Exception e) {
                System.err.println("❌ Failed to assign driver during vehicle creation: " + e.getMessage());
            }
        }
        
        return savedVehicle;
    }
    
    public Vehicle getVehicleById(String id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with id: " + id));
    }
    
    public Vehicle getVehicleByRegistration(String registration) {
        return vehicleRepository.findByRegistration(registration)
                .orElseThrow(() -> new ResourceNotFoundException("Vehicle not found with registration: " + registration));
    }
    
    public List<Vehicle> getVehiclesByTenant(String tenantId) {
        return vehicleRepository.findByTenantId(tenantId);
    }
    
    public List<Vehicle> getVehiclesByTenantAndStatus(String tenantId, String status) {
        return vehicleRepository.findByTenantIdAndStatus(tenantId, status);
    }
    
    public List<Vehicle> getVehiclesByTenantAndCategory(String tenantId, String category) {
        return vehicleRepository.findByTenantIdAndCategory(tenantId, category);
    }
    
    @Transactional
    public Vehicle updateVehicle(String id, Vehicle vehicleDetails) {
        Vehicle vehicle = getVehicleById(id);

        vehicleDetails.setTenant(vehicle.getTenant());
        
        // ✅ Store old driver before updating
        Driver oldDriver = vehicle.getDriver();
        Driver newDriver = vehicleDetails.getDriver();
        
        // Update all existing fields
        vehicle.setRegistration(vehicleDetails.getRegistration());
        vehicle.setVin(vehicleDetails.getVin());
        vehicle.setMake(vehicleDetails.getMake());
        vehicle.setModel(vehicleDetails.getModel());
        vehicle.setYear(vehicleDetails.getYear());
        vehicle.setCategory(vehicleDetails.getCategory());
        vehicle.setStatus(vehicleDetails.getStatus());
        vehicle.setMileage(vehicleDetails.getMileage());
        vehicle.setOwner(vehicleDetails.getOwner());
        vehicle.setCostCentre(vehicleDetails.getCostCentre());
        vehicle.setLocation(vehicleDetails.getLocation());
        vehicle.setCustodian(vehicleDetails.getCustodian());
        vehicle.setInsurance(vehicleDetails.getInsurance());
        vehicle.setPermit(vehicleDetails.getPermit());
        vehicle.setLicenseExpiry(vehicleDetails.getLicenseExpiry());
        vehicle.setRoadworthy(vehicleDetails.getRoadworthy());
        vehicle.setAccessories(vehicleDetails.getAccessories());
        vehicle.setLastService(vehicleDetails.getLastService());
        vehicle.setNextService(vehicleDetails.getNextService());
        
        // ✅ NEW FIELDS
        vehicle.setColor(vehicleDetails.getColor());
        vehicle.setFuelType(vehicleDetails.getFuelType());
        vehicle.setFuelTankCapacity(vehicleDetails.getFuelTankCapacity());
        vehicle.setCurrentFuelLevel(vehicleDetails.getCurrentFuelLevel());
        vehicle.setLastFuelReport(vehicleDetails.getLastFuelReport());
        vehicle.setEngineSize(vehicleDetails.getEngineSize());
        vehicle.setTransmission(vehicleDetails.getTransmission());
        vehicle.setAcquisitionDate(vehicleDetails.getAcquisitionDate());
        vehicle.setAcquisitionCost(vehicleDetails.getAcquisitionCost());
        vehicle.setDisposalDate(vehicleDetails.getDisposalDate());
        vehicle.setDisposalReason(vehicleDetails.getDisposalReason());
        
        // ✅ Update driver
        if (newDriver != null) {
        vehicle.setDriver(newDriver);
        }
        
        // ✅ Save vehicle first
        Vehicle savedVehicle = vehicleRepository.save(vehicle);
        
        // ✅ Handle driver assignment synchronization
        String oldDriverId = oldDriver != null ? oldDriver.getId() : null;
        String newDriverId = newDriver != null ? newDriver.getId() : null;
        
        // If driver changed, update both old and new drivers
        if (!Objects.equals(oldDriverId, newDriverId)) {
            // 1. Unassign old driver
            if (oldDriver != null) {
                try {
                    // Refresh the driver entity
                    Driver oldDriverEntity = driverService.getDriverById(oldDriver.getId());
                    oldDriverEntity.setAssignedVehicle(null);
                    driverService.updateDriver(oldDriverEntity.getId(), oldDriverEntity);
                    System.out.println("✅ Vehicle " + savedVehicle.getRegistration() + " unassigned from driver: " + oldDriverEntity.getName());
                } catch (Exception e) {
                    System.err.println("❌ Failed to unassign old driver: " + e.getMessage());
                }
            }
            
            // 2. Assign new driver
            if (newDriver != null) {
                try {
                    // Refresh the driver entity
                    Driver newDriverEntity = driverService.getDriverById(newDriver.getId());
                    newDriverEntity.setAssignedVehicle(savedVehicle);
                    driverService.updateDriver(newDriverEntity.getId(), newDriverEntity);
                    System.out.println("✅ Vehicle " + savedVehicle.getRegistration() + " assigned to driver: " + newDriverEntity.getName());
                } catch (Exception e) {
                    System.err.println("❌ Failed to assign new driver: " + e.getMessage());
                }
            }
        } else {
            // Driver didn't change, but if there is a driver, ensure the relationship is correct
            if (newDriver != null) {
                try {
                    Driver currentDriver = driverService.getDriverById(newDriver.getId());
                    // Only update if the assigned vehicle is not already set correctly
                    if (currentDriver.getAssignedVehicle() == null || 
                        !currentDriver.getAssignedVehicle().getId().equals(savedVehicle.getId())) {
                        currentDriver.setAssignedVehicle(savedVehicle);
                        driverService.updateDriver(currentDriver.getId(), currentDriver);
                        System.out.println("✅ Ensured vehicle " + savedVehicle.getRegistration() + " is assigned to driver: " + currentDriver.getName());
                    }
                } catch (Exception e) {
                    System.err.println("❌ Failed to verify driver assignment: " + e.getMessage());
                }
            }
        }
        
        return savedVehicle;
    }
    
    @Transactional
    public void deleteVehicle(String id) {
        Vehicle vehicle = getVehicleById(id);
        
        // ✅ If vehicle has a driver, unassign first
        if (vehicle.getDriver() != null) {
            try {
                Driver driver = vehicle.getDriver();
                Driver managedDriver = driverService.getDriverById(driver.getId());
                managedDriver.setAssignedVehicle(null);
                driverService.updateDriver(managedDriver.getId(), managedDriver);
                System.out.println("✅ Vehicle " + vehicle.getRegistration() + " unassigned from driver before deletion: " + managedDriver.getName());
            } catch (Exception e) {
                System.err.println("❌ Failed to unassign driver before deletion: " + e.getMessage());
            }
        }
        
        vehicleRepository.delete(vehicle);
        System.out.println("✅ Vehicle " + vehicle.getRegistration() + " deleted successfully");
    }
    
    public long countVehiclesByTenantAndStatus(String tenantId, String status) {
        return vehicleRepository.countByTenantIdAndStatus(tenantId, status);
    }
}