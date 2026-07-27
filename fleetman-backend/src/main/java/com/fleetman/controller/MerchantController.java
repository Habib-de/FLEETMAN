package com.fleetman.controller;

import com.fleetman.dto.ApiResponse;
import com.fleetman.dto.MerchantDTO;
import com.fleetman.entity.Merchant;
import com.fleetman.service.MerchantService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/merchants")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('super_admin', 'car_owner')")
public class MerchantController {

    private final MerchantService merchantService;

    @PostMapping
    public ResponseEntity<ApiResponse<MerchantDTO>> createMerchant(@Valid @RequestBody Merchant merchant) {
        Merchant created = merchantService.createMerchant(merchant);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Merchant created successfully", convertToDTO(created)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<MerchantDTO>> getMerchantById(@PathVariable String id) {
        Merchant merchant = merchantService.getMerchantById(id);
        return ResponseEntity.ok(ApiResponse.success(convertToDTO(merchant)));
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<ApiResponse<List<MerchantDTO>>> getMerchantsByTenant(@PathVariable String tenantId) {
        List<Merchant> merchants = merchantService.getMerchantsByTenant(tenantId);
        List<MerchantDTO> dtos = merchants.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/tenant/{tenantId}/status/{status}")
    public ResponseEntity<ApiResponse<List<MerchantDTO>>> getMerchantsByTenantAndStatus(
            @PathVariable String tenantId,
            @PathVariable String status) {
        List<Merchant> merchants = merchantService.getMerchantsByTenantAndStatus(tenantId, status);
        List<MerchantDTO> dtos = merchants.stream().map(this::convertToDTO).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<MerchantDTO>> updateMerchant(@PathVariable String id, @Valid @RequestBody Merchant merchant) {
        Merchant updated = merchantService.updateMerchant(id, merchant);
        return ResponseEntity.ok(ApiResponse.success("Merchant updated successfully", convertToDTO(updated)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMerchant(@PathVariable String id) {
        merchantService.deleteMerchant(id);
        return ResponseEntity.ok(ApiResponse.success("Merchant deleted successfully", null));
    }

    private MerchantDTO convertToDTO(Merchant merchant) {
        MerchantDTO dto = new MerchantDTO();
        dto.setId(merchant.getId());
        dto.setTenantId(merchant.getTenant() != null ? merchant.getTenant().getId() : null);
        dto.setName(merchant.getName());
        dto.setType(merchant.getType());
        dto.setContact(merchant.getContact());
        dto.setEmail(merchant.getEmail());
        dto.setPhone(merchant.getPhone());
        dto.setAddress(merchant.getAddress());
        dto.setSla(merchant.getSla());
        dto.setTatAvg(merchant.getTatAvg());
        dto.setRepeatRate(merchant.getRepeatRate());
        dto.setStatus(merchant.getStatus());
        dto.setRating(merchant.getRating());
        dto.setServices(merchant.getServices());
        dto.setCreatedAt(merchant.getCreatedAt());
        return dto;
    }
}