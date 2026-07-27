package com.fleetman.service;

import com.fleetman.entity.Incident;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.IncidentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class IncidentService {
    
    private final IncidentRepository incidentRepository;
    
    @Transactional
    public Incident createIncident(Incident incident) {
        return incidentRepository.save(incident);
    }
    
    public Incident getIncidentById(String id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Incident not found with id: " + id));
    }
    
    public List<Incident> getIncidentsByTenant(String tenantId) {
        return incidentRepository.findByTenantId(tenantId);
    }
    
    public List<Incident> getIncidentsByVehicle(String vehicleId) {
        return incidentRepository.findByVehicleId(vehicleId);
    }
    
    public List<Incident> getIncidentsByTenantAndStatus(String tenantId, String status) {
        return incidentRepository.findByTenantIdAndStatus(tenantId, status);
    }
    
    public List<Incident> getRecentIncidents(String tenantId, LocalDateTime startDate) {
        return incidentRepository.findRecentIncidents(tenantId, startDate);
    }

    // In IncidentService.java - add this method
     public List<Incident> getAllIncidents() {
    return incidentRepository.findAll();
    }

    public List<Incident> getIncidentsByDriver(String driverId) {
    return incidentRepository.findByDriverId(driverId);
}
    
    @Transactional
    public Incident updateIncident(String id, Incident incidentDetails) {
        Incident incident = getIncidentById(id);
        incident.setIncidentType(incidentDetails.getIncidentType());
        incident.setSeverity(incidentDetails.getSeverity());
        incident.setStatus(incidentDetails.getStatus());
        incident.setLocation(incidentDetails.getLocation());
        incident.setDescription(incidentDetails.getDescription());
        incident.setPoliceReport(incidentDetails.getPoliceReport());
        incident.setCost(incidentDetails.getCost());
        incident.setAttachments(incidentDetails.getAttachments());
        incident.setResolvedAt(incidentDetails.getResolvedAt());
        return incidentRepository.save(incident);
    }
    
    @Transactional
    public void deleteIncident(String id) {
        Incident incident = getIncidentById(id);
        incidentRepository.delete(incident);
    }
}