package com.fleetman.util;

import java.util.regex.Pattern;

public class ValidationUtils {
    
    // Email regex pattern
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[A-Za-z0-9+_.-]+@(.+)$"
    );
    
    // Phone regex pattern (international format)
    private static final Pattern PHONE_PATTERN = Pattern.compile(
        "^\\+?[0-9]{10,15}$"
    );
    
    // VIN regex pattern (17 characters)
    private static final Pattern VIN_PATTERN = Pattern.compile(
        "^[A-HJ-NPR-Z0-9]{17}$"
    );
    
    // License plate regex (various formats)
    private static final Pattern LICENSE_PLATE_PATTERN = Pattern.compile(
        "^[A-Z0-9-]{3,10}$"
    );
    
    private ValidationUtils() {
        // Private constructor to prevent instantiation
    }
    
    /**
     * Validate email address
     */
    public static boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) return false;
        return EMAIL_PATTERN.matcher(email).matches();
    }
    
    /**
     * Validate phone number
     */
    public static boolean isValidPhone(String phone) {
        if (phone == null || phone.isEmpty()) return false;
        return PHONE_PATTERN.matcher(phone).matches();
    }
    
    /**
     * Validate VIN number
     */
    public static boolean isValidVIN(String vin) {
        if (vin == null || vin.isEmpty()) return false;
        return VIN_PATTERN.matcher(vin).matches();
    }
    
    /**
     * Validate license plate
     */
    public static boolean isValidLicensePlate(String plate) {
        if (plate == null || plate.isEmpty()) return false;
        return LICENSE_PLATE_PATTERN.matcher(plate).matches();
    }
    
    /**
     * Validate that a string is not null or empty
     */
    public static boolean isNotBlank(String str) {
        return str != null && !str.trim().isEmpty();
    }
    
    /**
     * Validate that a string is null or empty
     */
    public static boolean isBlank(String str) {
        return str == null || str.trim().isEmpty();
    }
    
    /**
     * Validate that a number is positive
     */
    public static boolean isPositive(Number number) {
        if (number == null) return false;
        return number.doubleValue() > 0;
    }
    
    /**
     * Validate that a number is not negative
     */
    public static boolean isNotNegative(Number number) {
        if (number == null) return false;
        return number.doubleValue() >= 0;
    }
    
    /**
     * Validate that a number is within range
     */
    public static boolean isWithinRange(Number number, Number min, Number max) {
        if (number == null || min == null || max == null) return false;
        double val = number.doubleValue();
        return val >= min.doubleValue() && val <= max.doubleValue();
    }
    
    /**
     * Validate that a string length is within range
     */
    public static boolean isLengthValid(String str, int min, int max) {
        if (str == null) return false;
        int len = str.length();
        return len >= min && len <= max;
    }
    
    /**
     * Validate that a string contains only alphanumeric characters
     */
    public static boolean isAlphanumeric(String str) {
        if (str == null) return false;
        return str.matches("^[a-zA-Z0-9]+$");
    }
    
    /**
     * Validate that a string contains only letters
     */
    public static boolean isAlpha(String str) {
        if (str == null) return false;
        return str.matches("^[a-zA-Z]+$");
    }
    
    /**
     * Validate that a string contains only numbers
     */
    public static boolean isNumeric(String str) {
        if (str == null) return false;
        return str.matches("^[0-9]+$");
    }
    
    /**
     * Validate that a string contains only letters and spaces
     */
    public static boolean isAlphaWithSpaces(String str) {
        if (str == null) return false;
        return str.matches("^[a-zA-Z\\s]+$");
    }
    
    /**
     * Check if two strings are equal (case insensitive)
     */
    public static boolean equalsIgnoreCase(String str1, String str2) {
        if (str1 == null || str2 == null) return false;
        return str1.equalsIgnoreCase(str2);
    }
    
    /**
     * Check if two strings are equal (case sensitive)
     */
    public static boolean equals(String str1, String str2) {
        if (str1 == null || str2 == null) return false;
        return str1.equals(str2);
    }
    
    /**
     * Validate coordinates (latitude)
     */
    public static boolean isValidLatitude(double lat) {
        return lat >= -90 && lat <= 90;
    }
    
    /**
     * Validate coordinates (longitude)
     */
    public static boolean isValidLongitude(double lng) {
        return lng >= -180 && lng <= 180;
    }
    
    /**
     * Validate that a value is not null
     */
    public static <T> boolean isNotNull(T value) {
        return value != null;
    }
    
    /**
     * Validate that a value is null
     */
    public static <T> boolean isNull(T value) {
        return value == null;
    }
}