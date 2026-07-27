package com.fleetman.dto;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;

public class DemoBookingRequest {
    
    @NotBlank(message = "Name is required")
    private String name;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
    
    private String phone;
    
    @NotBlank(message = "Company name is required")
    private String company;
    
    private String fleetSize;
    private String preferredDate;
    private String preferredTime;
    private String message;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    
    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }
    
    public String getFleetSize() { return fleetSize; }
    public void setFleetSize(String fleetSize) { this.fleetSize = fleetSize; }
    
    public String getPreferredDate() { return preferredDate; }
    public void setPreferredDate(String preferredDate) { this.preferredDate = preferredDate; }
    
    public String getPreferredTime() { return preferredTime; }
    public void setPreferredTime(String preferredTime) { this.preferredTime = preferredTime; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}