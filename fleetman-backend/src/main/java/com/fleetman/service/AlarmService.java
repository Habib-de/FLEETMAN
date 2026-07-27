package com.fleetman.service;

import com.fleetman.entity.Alarm;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.AlarmRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AlarmService {
    
    private final AlarmRepository alarmRepository;
    
    @Transactional
    public Alarm createAlarm(Alarm alarm) {
        return alarmRepository.save(alarm);
    }
    
    public Alarm getAlarmById(String id) {
        return alarmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alarm not found with id: " + id));
    }
    
    public List<Alarm> getAlarmsByTenant(String tenantId) {
        return alarmRepository.findByTenantId(tenantId);
    }
    
    public List<Alarm> getAlarmsByVehicle(String vehicleId) {
        return alarmRepository.findByVehicleId(vehicleId);
    }
    
    public List<Alarm> getUnresolvedAlarms() {
        return alarmRepository.findByResolvedFalse();
    }
    
    @Transactional
    public Alarm updateAlarm(String id, Alarm alarmDetails) {
        Alarm alarm = getAlarmById(id);
        alarm.setType(alarmDetails.getType());
        alarm.setSeverity(alarmDetails.getSeverity());
        alarm.setMessage(alarmDetails.getMessage());
        alarm.setLat(alarmDetails.getLat());
        alarm.setLng(alarmDetails.getLng());
        alarm.setResolved(alarmDetails.getResolved());
        if (alarmDetails.getResolved()) {
            alarm.setResolvedAt(LocalDateTime.now());
        }
        return alarmRepository.save(alarm);
    }
    
    @Transactional
    public void resolveAlarm(String id) {
        Alarm alarm = getAlarmById(id);
        alarm.setResolved(true);
        alarm.setResolvedAt(LocalDateTime.now());
        alarmRepository.save(alarm);
    }
    
    @Transactional
    public void deleteAlarm(String id) {
        Alarm alarm = getAlarmById(id);
        alarmRepository.delete(alarm);
    }
}