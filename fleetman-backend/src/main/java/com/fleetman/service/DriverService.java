package com.fleetman.service;

import com.fleetman.entity.Driver;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.DriverRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DriverService {
    
    private final DriverRepository driverRepository;
    
    @Transactional
    public Driver createDriver(Driver driver) {
        return driverRepository.save(driver);
    }
    
    public Driver getDriverById(String id) {
        return driverRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with id: " + id));
    }
    
    public Driver getDriverByLicenseNumber(String licenseNumber) {
        return driverRepository.findByLicenseNumber(licenseNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found with license: " + licenseNumber));
    }
    
    public List<Driver> getDriversByTenant(String tenantId) {
        return driverRepository.findByTenantId(tenantId);
    }
    
    public List<Driver> getDriversByTenantAndStatus(String tenantId, String status) {
        return driverRepository.findByTenantIdAndStatus(tenantId, status);
    }
    
    public List<Driver> getDriversWithLowSafetyScore(String tenantId, int threshold) {
        return driverRepository.findDriversWithLowSafetyScore(tenantId, threshold);
    }
    
    @Transactional
public Driver updateDriver(String id, Driver driverDetails) {
    Driver driver = getDriverById(id);
    
    // ✅ Only update fields that are NOT null
    if (driverDetails.getName() != null) {
        driver.setName(driverDetails.getName());
    }
    if (driverDetails.getLicenseNumber() != null) {
        driver.setLicenseNumber(driverDetails.getLicenseNumber());
    }
    if (driverDetails.getLicenseExpiry() != null) {
        driver.setLicenseExpiry(driverDetails.getLicenseExpiry());
    }
    if (driverDetails.getDriverId() != null) {
        driver.setDriverId(driverDetails.getDriverId());
    }
    if (driverDetails.getSafetyScore() != null) {
        driver.setSafetyScore(driverDetails.getSafetyScore());
    }
    if (driverDetails.getTraining() != null) {
        driver.setTraining(driverDetails.getTraining());
    }
    if (driverDetails.getStatus() != null) {
        driver.setStatus(driverDetails.getStatus());
    }
    if (driverDetails.getPhone() != null) {
        driver.setPhone(driverDetails.getPhone());
    }
    if (driverDetails.getEmail() != null) {
        driver.setEmail(driverDetails.getEmail());
    }
    
    // ✅ CRITICAL: ONLY update assignedVehicle if it's explicitly provided
    // This prevents accidental unassignment when null is passed
    if (driverDetails.getAssignedVehicle() != null) {
        driver.setAssignedVehicle(driverDetails.getAssignedVehicle());
    }
    // If assignedVehicle is null, we SKIP updating it - preserving the existing assignment
    
    return driverRepository.save(driver);
}
    
    @Transactional
    public void deleteDriver(String id) {
        Driver driver = getDriverById(id);
        driverRepository.delete(driver);
    }
}