package com.fleetman.service;

import com.fleetman.entity.Merchant;
import com.fleetman.exception.ResourceNotFoundException;
import com.fleetman.repository.MerchantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MerchantService {
    
    private final MerchantRepository merchantRepository;
    
    @Transactional
    public Merchant createMerchant(Merchant merchant) {
        return merchantRepository.save(merchant);
    }
    
    public Merchant getMerchantById(String id) {
        return merchantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Merchant not found with id: " + id));
    }
    
    public List<Merchant> getMerchantsByTenant(String tenantId) {
        return merchantRepository.findByTenantId(tenantId);
    }
    
    public List<Merchant> getMerchantsByTenantAndStatus(String tenantId, String status) {
        return merchantRepository.findByTenantIdAndStatus(tenantId, status);
    }
    
    @Transactional
    public Merchant updateMerchant(String id, Merchant merchantDetails) {
        Merchant merchant = getMerchantById(id);
        merchant.setName(merchantDetails.getName());
        merchant.setType(merchantDetails.getType());
        merchant.setContact(merchantDetails.getContact());
        merchant.setEmail(merchantDetails.getEmail());
        merchant.setPhone(merchantDetails.getPhone());
        merchant.setAddress(merchantDetails.getAddress());
        merchant.setSla(merchantDetails.getSla());
        merchant.setTatAvg(merchantDetails.getTatAvg());
        merchant.setRepeatRate(merchantDetails.getRepeatRate());
        merchant.setStatus(merchantDetails.getStatus());
        merchant.setRating(merchantDetails.getRating());
        merchant.setServices(merchantDetails.getServices());
        return merchantRepository.save(merchant);
    }
    
    @Transactional
    public void deleteMerchant(String id) {
        Merchant merchant = getMerchantById(id);
        merchantRepository.delete(merchant);
    }
}