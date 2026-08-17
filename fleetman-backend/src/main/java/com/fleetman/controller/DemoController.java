package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.DemoBookingRequest;
import com.fleetman.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/demo")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DemoController {

    private final EmailService emailService;

    @PostMapping("/book")
    public ResponseEntity<ApiResponse<String>> bookDemo(@Valid @RequestBody DemoBookingRequest request) {
        try {
            System.out.println("📧 Received demo booking request from: " + request.getName());
            
            // 1. Build email for your team (sales team)
            String teamEmailBody = buildTeamEmailBody(request);
            
            // 2. Build confirmation email for the user
            String userEmailBody = buildUserConfirmationEmail(request);
            
            // 3. Send email to your sales team
            String salesEmail = "xabiiib0790@gmail.com"; // Replace with your actual sales email
            emailService.sendEmail(salesEmail, "🔔 New Demo Booking Request from " + request.getName(), teamEmailBody);
            System.out.println("✅ Demo request email sent to sales team: " + salesEmail);
            
            // 4. Send confirmation to the user
            emailService.sendEmail(request.getEmail(), "🎉 FLEETMAN - Demo Booking Confirmation", userEmailBody);
            System.out.println("✅ Confirmation email sent to user: " + request.getEmail());
            
            return ResponseEntity.ok(ApiResponse.success(
                "Demo booked successfully! We'll contact you within 24 hours.", 
                null
            ));
            
        } catch (Exception e) {
            System.err.println("❌ Error booking demo: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(ApiResponse.error("Failed to book demo: " + e.getMessage()));
        }
    }

    private String buildTeamEmailBody(DemoBookingRequest request) {
        StringBuilder body = new StringBuilder();
        body.append("===========================================\n");
        body.append("        🚀 NEW DEMO BOOKING REQUEST\n");
        body.append("===========================================\n\n");
        
        body.append("📋 BOOKING DETAILS:\n");
        body.append("-------------------------------------------\n");
        body.append("Name:           ").append(request.getName()).append("\n");
        body.append("Email:          ").append(request.getEmail()).append("\n");
        body.append("Phone:          ").append(request.getPhone() != null ? request.getPhone() : "Not provided").append("\n");
        body.append("Company:        ").append(request.getCompany()).append("\n");
        body.append("Fleet Size:     ").append(request.getFleetSize() != null ? request.getFleetSize() : "Not specified").append("\n");
        body.append("Preferred Date: ").append(request.getPreferredDate() != null ? request.getPreferredDate() : "Not specified").append("\n");
        body.append("Preferred Time: ").append(request.getPreferredTime() != null ? request.getPreferredTime() : "Not specified").append("\n");
        body.append("-------------------------------------------\n\n");
        
        body.append("📝 MESSAGE:\n");
        body.append("-------------------------------------------\n");
        body.append(request.getMessage() != null ? request.getMessage() : "No additional message").append("\n");
        body.append("-------------------------------------------\n\n");
        
        body.append("📅 Requested at: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append("\n");
        body.append("===========================================\n");
        body.append("⚠️  Please contact this lead within 24 hours.\n");
        body.append("===========================================\n");
        
        return body.toString();
    }

    private String buildUserConfirmationEmail(DemoBookingRequest request) {
        StringBuilder body = new StringBuilder();
        body.append("Dear ").append(request.getName()).append(",\n\n");
        
        body.append("Thank you for requesting a demo of FLEETMAN! 🚀\n\n");
        
        body.append("We have received your request and our team will contact you within 24 hours to schedule your personalized demo.\n\n");
        
        body.append("Here's a summary of your request:\n");
        body.append("-------------------------------------------\n");
        body.append("Company:        ").append(request.getCompany()).append("\n");
        body.append("Fleet Size:     ").append(request.getFleetSize() != null ? request.getFleetSize() : "Not specified").append("\n");
        body.append("Preferred Date: ").append(request.getPreferredDate() != null ? request.getPreferredDate() : "Not specified").append("\n");
        body.append("Preferred Time: ").append(request.getPreferredTime() != null ? request.getPreferredTime() : "Not specified").append("\n");
        body.append("-------------------------------------------\n\n");
        
        // body.append("In the meantime, here's what you can do:\n");
        // body.append("1. 📚 Explore our website: https://www.fleetman.com\n");
        // body.append("2. 📖 Read our case studies: https://www.fleetman.com/case-studies\n");
        // body.append("3. 💬 Contact us at: support@fleetman.com\n\n");
        
        body.append("We look forward to showing you how FLEETMAN can transform your fleet operations!\n\n");
        
        body.append("Best regards,\n");
        body.append("The FLEETMAN Team\n");
        body.append("🚚 Operate Smarter™\n");
        body.append("-------------------------------------------\n");
        body.append("This is an automated message. Please do not reply to this email.\n");
        
        return body.toString();
    }
}