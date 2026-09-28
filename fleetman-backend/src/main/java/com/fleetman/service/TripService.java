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
        
        // ============================================
        // STANDARD FIELDS (update only if not null)
        // ============================================
        if (tripDetails.getStartLocation() != null) {
            trip.setStartLocation(tripDetails.getStartLocation());
        }
        
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
        
        if (tripDetails.getStartTime() != null) {
            trip.setStartTime(tripDetails.getStartTime());
        }
        
        if (tripDetails.getStartOdometer() != null) {
            trip.setStartOdometer(tripDetails.getStartOdometer());
        }
        
        // ============================================
        // ✅ FIX #1: PRIORITY + NOTES
        // ============================================
        if (tripDetails.getPriority() != null) {
            trip.setPriority(tripDetails.getPriority());
        }
        
        if (tripDetails.getNotes() != null) {
            trip.setNotes(tripDetails.getNotes());
        }
        
        // ============================================
        // ✅ FIX #2: DRIVER / VEHICLE / GEOFENCE
        // ============================================
        // For PLANNED trips (Dispatch), always update these
        // This allows "unassign" (setting to null)
        // ============================================
        boolean isPlannedTrip = "planned".equalsIgnoreCase(trip.getStatus()) 
                             || "planned".equalsIgnoreCase(tripDetails.getStatus());
        
        if (isPlannedTrip) {
            // Dispatch case: always overwrite (even with null)
            trip.setDriver(tripDetails.getDriver());
            trip.setVehicle(tripDetails.getVehicle());
            trip.setGeofence(tripDetails.getGeofence());
            System.out.println("📝 Planned trip updated - driver/vehicle/geofence refreshed");
        } else {
            // Normal trip: only update if not null
            if (tripDetails.getDriver() != null) {
                trip.setDriver(tripDetails.getDriver());
            }
            if (tripDetails.getVehicle() != null) {
                trip.setVehicle(tripDetails.getVehicle());
            }
            if (tripDetails.getGeofence() != null) {
                trip.setGeofence(tripDetails.getGeofence());
            }
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

    // ✅ NEW: Get all planned (scheduled) trips for a tenant
    public List<Trip> getPlannedTripsByTenant(String tenantId) {
        return tripRepository.findByTenantIdAndStatusWithVehicle(tenantId, "planned");
    }
    
    // ✅ NEW: Get upcoming planned trips for a driver
    public List<Trip> getUpcomingTripsForDriver(String driverId) {
        return tripRepository.findByDriverIdAndStatus(driverId, "planned");
    }

}