package com.fleetman.service;

import com.fleetman.entity.FuelRefill;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.FuelRefillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FuelRefillService {
    
    private final FuelRefillRepository fuelRefillRepository;
    
    @Transactional
    public FuelRefill createFuelRefill(FuelRefill fuelRefill) {
        return fuelRefillRepository.save(fuelRefill);
    }
    
    public FuelRefill getFuelRefillById(String id) {
        return fuelRefillRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Fuel refill not found with id: " + id));
    }
    
    public List<FuelRefill> getFuelRefillsByTenant(String tenantId) {
        return fuelRefillRepository.findByTenantId(tenantId);
    }
    
    public List<FuelRefill> getFuelRefillsByVehicle(String vehicleId) {
        return fuelRefillRepository.findByVehicleId(vehicleId);
    }
    
    public List<FuelRefill> getFuelRefillsByVehicleAndDateRange(String vehicleId, LocalDateTime start, LocalDateTime end) {
        return fuelRefillRepository.findByVehicleIdAndDateTimeBetween(vehicleId, start, end);
    }
    
    public Double getTotalFuelConsumed(String vehicleId) {
        return fuelRefillRepository.getTotalFuelConsumed(vehicleId);
    }
    
    public Double getAverageEfficiency(String vehicleId) {
        return fuelRefillRepository.getAverageEfficiency(vehicleId);
    }
    
    @Transactional
    public FuelRefill updateFuelRefill(String id, FuelRefill fuelRefillDetails) {
        FuelRefill fuelRefill = getFuelRefillById(id);
        fuelRefill.setDateTime(fuelRefillDetails.getDateTime());
        fuelRefill.setStation(fuelRefillDetails.getStation());
        fuelRefill.setLitres(fuelRefillDetails.getLitres());
        fuelRefill.setCost(fuelRefillDetails.getCost());
        fuelRefill.setOdometer(fuelRefillDetails.getOdometer());
        fuelRefill.setEfficiency(fuelRefillDetails.getEfficiency());
        fuelRefill.setStatus(fuelRefillDetails.getStatus());
        fuelRefill.setNotes(fuelRefillDetails.getNotes());
        // ✅ ADD THIS
        fuelRefill.setReceiptImage(fuelRefillDetails.getReceiptImage());
        return fuelRefillRepository.save(fuelRefill);
    }
    
    @Transactional
    public void deleteFuelRefill(String id) {
        FuelRefill fuelRefill = getFuelRefillById(id);
        fuelRefillRepository.delete(fuelRefill);
    }
}