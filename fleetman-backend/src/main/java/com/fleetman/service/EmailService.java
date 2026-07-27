package com.fleetman.service;

import lombok.RequiredArgsConstructor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    // ============================================
    // PASSWORD RESET EMAIL (Existing)
    // ============================================
    public void sendResetPasswordEmail(String to, String resetToken) {
        String resetLink = "http://localhost:3000/reset-password?token=" + resetToken;
        
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("FLEETMAN - Password Reset Request");
        message.setText(
            "Hello,\n\n" +
            "You have requested to reset your password for your FLEETMAN account.\n\n" +
            "Click the link below to reset your password:\n" +
            resetLink + "\n\n" +
            "This link will expire in 1 hour.\n\n" +
            "If you did not request this, please ignore this email.\n\n" +
            "Best regards,\n" +
            "FLEETMAN Team"
        );
        
        mailSender.send(message);
        System.out.println("✅ Password reset email sent to: " + to);
    }

    // ============================================
    // SEND GENERAL EMAIL
    // ============================================
    public void sendEmail(String to, String subject, String body) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            
            mailSender.send(message);
            System.out.println("✅ Email sent to: " + to);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email to " + to + ": " + e.getMessage());
            throw e;
        }
    }
    
    // ============================================
    // SEND DEMO REQUEST EMAIL TO SALES TEAM
    // ============================================
    public void sendDemoRequestEmail(String userEmail, String userName, String message) {
        String salesEmail = "xabiiib0790@gmail.com"; // Replace with your actual sales email
        String subject = "🔔 New Demo Booking Request from " + userName;
        
        sendEmail(salesEmail, subject, message);
        System.out.println("✅ Demo request email sent to sales team: " + salesEmail);
    }
    
    // ============================================
    // SEND CONFIRMATION EMAIL TO USER
    // ============================================
    public void sendDemoConfirmationEmail(String to, String name) {
        String subject = "🎉 FLEETMAN - Demo Booking Confirmation";
        
        String body = 
            "Dear " + name + ",\n\n" +
            "Thank you for requesting a demo of FLEETMAN! 🚀\n\n" +
            // "We have received your request and our team will contact you within 24 hours to schedule your personalized demo.\n\n" +
            // "In the meantime, here's what you can do:\n" +
            // "1. 📚 Explore our website: https://www.fleetman.com\n" +
            // "2. 📖 Read our case studies: https://www.fleetman.com/case-studies\n" +
            // "3. 💬 Contact us at: support@fleetman.com\n\n" +
            "We look forward to showing you how FLEETMAN can transform your fleet operations!\n\n" +
            "Best regards,\n" +
            "The FLEETMAN Team\n" +
            "🚚 Operate Smarter™\n\n" +
            "This is an automated message. Please do not reply to this email.";
        
        sendEmail(to, subject, body);
        System.out.println("✅ Confirmation email sent to user: " + to);
    }

    // ============================================
    // SEND COMPLETE DEMO BOOKING WITH DETAILS
    // ============================================
    public void sendDemoBookingEmails(String userEmail, String userName, String company, 
                                      String phone, String fleetSize, String preferredDate, 
                                      String preferredTime, String message) {
        
        // 1. Build email for sales team
        String teamEmailBody = buildTeamEmailBody(userName, userEmail, company, phone, 
                                                   fleetSize, preferredDate, preferredTime, message);
        
        // 2. Send to sales team
        String salesEmail = "xabiiib0790@gmail.com"; // Replace with your actual sales email
        sendEmail(salesEmail, "🔔 New Demo Booking Request from " + userName, teamEmailBody);
        
        // 3. Send confirmation to user
        sendDemoConfirmationEmail(userEmail, userName);
    }

    // ============================================
    // BUILD TEAM EMAIL BODY
    // ============================================
    private String buildTeamEmailBody(String name, String email, String company, 
                                      String phone, String fleetSize, String preferredDate, 
                                      String preferredTime, String message) {
        StringBuilder body = new StringBuilder();
        body.append("===========================================\n");
        body.append("        🚀 NEW DEMO BOOKING REQUEST\n");
        body.append("===========================================\n\n");
        
        body.append("📋 BOOKING DETAILS:\n");
        body.append("-------------------------------------------\n");
        body.append("Name:           ").append(name).append("\n");
        body.append("Email:          ").append(email).append("\n");
        body.append("Phone:          ").append(phone != null && !phone.isEmpty() ? phone : "Not provided").append("\n");
        body.append("Company:        ").append(company).append("\n");
        body.append("Fleet Size:     ").append(fleetSize != null && !fleetSize.isEmpty() ? fleetSize : "Not specified").append("\n");
        body.append("Preferred Date: ").append(preferredDate != null && !preferredDate.isEmpty() ? preferredDate : "Not specified").append("\n");
        body.append("Preferred Time: ").append(preferredTime != null && !preferredTime.isEmpty() ? preferredTime : "Not specified").append("\n");
        body.append("-------------------------------------------\n\n");
        
        body.append("📝 MESSAGE:\n");
        body.append("-------------------------------------------\n");
        body.append(message != null && !message.isEmpty() ? message : "No additional message").append("\n");
        body.append("-------------------------------------------\n\n");
        
        body.append("📅 Requested at: ").append(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))).append("\n");
        body.append("===========================================\n");
        body.append("⚠️  Please contact this lead within 24 hours.\n");
        body.append("===========================================\n");
        
        return body.toString();
    }
}