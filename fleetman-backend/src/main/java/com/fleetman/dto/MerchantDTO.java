package com.fleetman.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class MerchantDTO {
    private String id;
    private String tenantId;
    private String name;
    private String type;
    private String contact;
    private String email;
    private String phone;
    private String address;
    private String sla;
    private BigDecimal tatAvg;
    private BigDecimal repeatRate;
    private String status;
    private BigDecimal rating;
    private String services;
    private LocalDateTime createdAt;
}