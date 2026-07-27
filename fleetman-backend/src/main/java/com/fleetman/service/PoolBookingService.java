package com.fleetman.service;

import com.fleetman.entity.PoolBooking;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.PoolBookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PoolBookingService {
    
    private final PoolBookingRepository poolBookingRepository;
    
    @Transactional
    public PoolBooking createPoolBooking(PoolBooking poolBooking) {
        return poolBookingRepository.save(poolBooking);
    }
    
    public PoolBooking getPoolBookingById(String id) {
        return poolBookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Pool booking not found with id: " + id));
    }
    
    public List<PoolBooking> getPoolBookingsByTenant(String tenantId) {
        return poolBookingRepository.findByTenantId(tenantId);
    }
    
    public List<PoolBooking> getPoolBookingsByVehicle(String vehicleId) {
        return poolBookingRepository.findByVehicleId(vehicleId);
    }
    
    public List<PoolBooking> getActiveBookingsForVehicle(String vehicleId) {
        return poolBookingRepository.findActiveBookingsForVehicle(vehicleId);
    }
    
    @Transactional
    public PoolBooking updatePoolBooking(String id, PoolBooking bookingDetails) {
        PoolBooking booking = getPoolBookingById(id);
        booking.setPurpose(bookingDetails.getPurpose());
        booking.setStartTime(bookingDetails.getStartTime());
        booking.setEndTime(bookingDetails.getEndTime());
        booking.setStatus(bookingDetails.getStatus());
        booking.setHandoverOdometer(bookingDetails.getHandoverOdometer());
        booking.setReturnOdometer(bookingDetails.getReturnOdometer());
        booking.setConditionNotes(bookingDetails.getConditionNotes());
        return poolBookingRepository.save(booking);
    }
    
    @Transactional
    public void deletePoolBooking(String id) {
        PoolBooking booking = getPoolBookingById(id);
        poolBookingRepository.delete(booking);
    }
}