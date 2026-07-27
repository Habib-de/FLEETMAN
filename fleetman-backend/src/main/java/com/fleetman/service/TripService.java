package com.fleetman.service;

import com.fleetman.entity.Trip;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.TripRepository;
import lombok.RequiredArgsConstructor;
// import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
// import java.util.ArrayList;
import java.util.List;
import java.util.Optional; 
// import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TripService {
    
    private final TripRepository tripRepository;
    
    @Transactional
    public Trip createTrip(Trip trip) {
        return tripRepository.save(trip);
    }
    
    public Trip getTripById(String id) {
        return tripRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trip not found with id: " + id));
    }
    
    public List<Trip> getTripsByTenant(String tenantId) {
        return tripRepository.findByTenantId(tenantId);
    }
    
    public List<Trip> getTripsByVehicle(String vehicleId) {
        return tripRepository.findByVehicleId(vehicleId);
    }
    
    public List<Trip> getTripsByDriver(String driverId) {
        return tripRepository.findByDriverId(driverId);
    }
    
    public List<Trip> getActiveTripsByVehicle(String vehicleId) {
        return tripRepository.findByVehicleIdAndStatus(vehicleId, "active");
    }

    // Add this method after getActiveTrips()
public Optional<Trip> findActiveTripWithGeofence(String vehicleId) {
    return tripRepository.findActiveTripWithGeofence(vehicleId);
}
    
    public List<Trip> getTripsBetweenDates(LocalDateTime start, LocalDateTime end) {
        return tripRepository.findByStartTimeBetween(start, end);
    }

    // In TripService.java - Add this method
    // In TripService.java
    public List<Trip> getActiveTrips() {
    // ✅ Use the new eager fetching method from TripRepository
    return tripRepository.findAllActiveWithVehicle();
    }
    
    @Transactional
    public Trip updateTrip(String id, Trip tripDetails) {
        Trip trip = getTripById(id);
        
        // ✅ ONLY update fields if they are NOT null
        // This preserves existing values when fields are not sent
        if (tripDetails.getStartLocation() != null) {
            trip.setStartLocation(tripDetails.getStartLocation());
        }
        // If startLocation is null, keep the existing value - DON'T set to null
        
        if (tripDetails.getEndLocation() != null) {
            trip.setEndLocation(tripDetails.getEndLocation());
        }
        
        if (tripDetails.getEndTime() != null) {
            trip.setEndTime(tripDetails.getEndTime());
        }
        
        if (tripDetails.getDistance() != null) {
            trip.setDistance(tripDetails.getDistance());
        }
        
        if (tripDetails.getFuelUsed() != null) {
            trip.setFuelUsed(tripDetails.getFuelUsed());
        }
        
        if (tripDetails.getAverageSpeed() != null) {
            trip.setAverageSpeed(tripDetails.getAverageSpeed());
        }
        
        if (tripDetails.getCost() != null) {
            trip.setCost(tripDetails.getCost());
        }
        
        if (tripDetails.getStatus() != null) {
            trip.setStatus(tripDetails.getStatus());
        }
        
        if (tripDetails.getEndOdometer() != null) {
            trip.setEndOdometer(tripDetails.getEndOdometer());
        }
        
        if (tripDetails.getPurpose() != null) {
            trip.setPurpose(tripDetails.getPurpose());
        }
        
        // Note: startTime and startOdometer are usually set once and not updated
        // But if you want to allow updating them:
        if (tripDetails.getStartTime() != null) {
            trip.setStartTime(tripDetails.getStartTime());
        }
        
        if (tripDetails.getStartOdometer() != null) {
            trip.setStartOdometer(tripDetails.getStartOdometer());
        }
        
        return tripRepository.save(trip);
    }
    
    @Transactional
    public void deleteTrip(String id) {
        Trip trip = getTripById(id);
        tripRepository.delete(trip);
    }
    
    public long countActiveTrips(String tenantId) {
        return tripRepository.countActiveTrips(tenantId);
    }
}