package com.fleetman.service;

import com.fleetman.entity.Compliance;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.ComplianceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ComplianceService {
    
    private final ComplianceRepository complianceRepository;
    
    @Transactional
    public Compliance createCompliance(Compliance compliance) {
        return complianceRepository.save(compliance);
    }
    
    public Compliance getComplianceById(String id) {
        return complianceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Compliance record not found with id: " + id));
    }
    
    public List<Compliance> getComplianceByTenant(String tenantId) {
        return complianceRepository.findByTenantId(tenantId);
    }
    
    public List<Compliance> getComplianceByVehicle(String vehicleId) {
        return complianceRepository.findByVehicleId(vehicleId);
    }
    
    public List<Compliance> getExpiredCompliance() {
        return complianceRepository.findByValidUntilBefore(LocalDate.now());
    }
    
    public List<Compliance> getExpiringSoon(String tenantId) {
        LocalDate today = LocalDate.now();
        LocalDate thirtyDaysLater = today.plusDays(30);
        return complianceRepository.findExpiringSoon(tenantId, today, thirtyDaysLater);
    }
    
    @Transactional
    public Compliance updateCompliance(String id, Compliance complianceDetails) {
        Compliance compliance = getComplianceById(id);
        compliance.setType(complianceDetails.getType());
        compliance.setValidFrom(complianceDetails.getValidFrom());
        compliance.setValidUntil(complianceDetails.getValidUntil());
        compliance.setStatus(complianceDetails.getStatus());
        compliance.setDocumentUrl(complianceDetails.getDocumentUrl());
        compliance.setNotes(complianceDetails.getNotes());
        return complianceRepository.save(compliance);
    }
    
    @Transactional
    public void deleteCompliance(String id) {
        Compliance compliance = getComplianceById(id);
        complianceRepository.delete(compliance);
    }
}