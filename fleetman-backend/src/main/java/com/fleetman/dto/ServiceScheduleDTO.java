package com.fleetman.dto;

import com.fleetman.entity.ServiceSchedule;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ServiceScheduleDTO {

    private String id;
    private String tenantId;
    private String vehicleId;
    private String vehicleRegistration;
    private String vehicleMake;
    private String vehicleModel;
    private String serviceType;
    private BigDecimal intervalKm;
    private Integer intervalDays;
    private BigDecimal lastServiceKm;
    private LocalDate lastServiceDate;
    private Boolean isActive;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ServiceScheduleDTO() {
    }

    // ============================================
    // STATIC MAPPER: Entity -> DTO
    // ============================================
    public static ServiceScheduleDTO from(ServiceSchedule s) {
        if (s == null) return null;

        ServiceScheduleDTO dto = new ServiceScheduleDTO();
        dto.id = s.getId();

        if (s.getTenant() != null) {
            dto.tenantId = s.getTenant().getId();
        }

        if (s.getVehicle() != null) {
            dto.vehicleId = s.getVehicle().getId();
            dto.vehicleRegistration = s.getVehicle().getRegistration();
            dto.vehicleMake = s.getVehicle().getMake();
            dto.vehicleModel = s.getVehicle().getModel();
        }

        dto.serviceType = s.getServiceType();
        dto.intervalKm = s.getIntervalKm();
        dto.intervalDays = s.getIntervalDays();
        dto.lastServiceKm = s.getLastServiceKm();
        dto.lastServiceDate = s.getLastServiceDate();
        dto.isActive = s.getIsActive();
        dto.notes = s.getNotes();
        dto.createdAt = s.getCreatedAt();
        dto.updatedAt = s.getUpdatedAt();

        return dto;
    }

    // ============================================
    // GETTERS & SETTERS
    // ============================================

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getTenantId() { return tenantId; }
    public void setTenantId(String tenantId) { this.tenantId = tenantId; }

    public String getVehicleId() { return vehicleId; }
    public void setVehicleId(String vehicleId) { this.vehicleId = vehicleId; }

    public String getVehicleRegistration() { return vehicleRegistration; }
    public void setVehicleRegistration(String vehicleRegistration) { this.vehicleRegistration = vehicleRegistration; }

    public String getVehicleMake() { return vehicleMake; }
    public void setVehicleMake(String vehicleMake) { this.vehicleMake = vehicleMake; }

    public String getVehicleModel() { return vehicleModel; }
    public void setVehicleModel(String vehicleModel) { this.vehicleModel = vehicleModel; }

    public String getServiceType() { return serviceType; }
    public void setServiceType(String serviceType) { this.serviceType = serviceType; }

    public BigDecimal getIntervalKm() { return intervalKm; }
    public void setIntervalKm(BigDecimal intervalKm) { this.intervalKm = intervalKm; }

    public Integer getIntervalDays() { return intervalDays; }
    public void setIntervalDays(Integer intervalDays) { this.intervalDays = intervalDays; }

    public BigDecimal getLastServiceKm() { return lastServiceKm; }
    public void setLastServiceKm(BigDecimal lastServiceKm) { this.lastServiceKm = lastServiceKm; }

    public LocalDate getLastServiceDate() { return lastServiceDate; }
    public void setLastServiceDate(LocalDate lastServiceDate) { this.lastServiceDate = lastServiceDate; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}