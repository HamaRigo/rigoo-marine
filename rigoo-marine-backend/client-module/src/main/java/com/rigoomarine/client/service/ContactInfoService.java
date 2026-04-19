package com.rigoomarine.client.service;

import com.rigoomarine.client.dto.CreateContactInfoRequest;
import com.rigoomarine.client.dto.ContactInfoDTO;
import com.rigoomarine.client.entity.ContactInfo;
import com.rigoomarine.client.repository.ContactInfoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ContactInfoService {

    private final ContactInfoRepository contactInfoRepository;

    @Transactional(readOnly = true)
    public List<ContactInfoDTO> getAllContactInfo() {
        return contactInfoRepository.findAll().stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ContactInfoDTO> getContactInfoByCategory(String category) {
        return contactInfoRepository.findByActiveTrueOrderByDisplayOrder(category).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ContactInfoDTO getContactInfoByKey(String keyName) {
        return contactInfoRepository.findByKeyName(keyName)
                .map(this::toDTO)
                .orElseThrow(() -> new RuntimeException("Contact info not found with key: " + keyName));
    }

    public ContactInfoDTO createContactInfo(CreateContactInfoRequest request) {
        ContactInfo contactInfo = ContactInfo.builder()
                .keyName(request.getKeyName())
                .value(request.getValue())
                .category(request.getCategory())
                .displayOrder(request.getDisplayOrder())
                .active(request.getActive() != null ? request.getActive() : true)
                .build();

        ContactInfo saved = contactInfoRepository.save(contactInfo);
        log.info("Created contact info: {}", saved.getKeyName());
        return toDTO(saved);
    }

    public ContactInfoDTO updateContactInfo(Long id, CreateContactInfoRequest request) {
        ContactInfo contactInfo = contactInfoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Contact info not found with id: " + id));

        contactInfo.setValue(request.getValue());
        contactInfo.setCategory(request.getCategory());
        contactInfo.setDisplayOrder(request.getDisplayOrder());
        if (request.getActive() != null) {
            contactInfo.setActive(request.getActive());
        }

        ContactInfo updated = contactInfoRepository.save(contactInfo);
        log.info("Updated contact info: {}", updated.getKeyName());
        return toDTO(updated);
    }

    public void deleteContactInfo(Long id) {
        contactInfoRepository.deleteById(id);
        log.info("Deleted contact info: {}", id);
    }

    private ContactInfoDTO toDTO(ContactInfo contactInfo) {
        return ContactInfoDTO.builder()
                .id(contactInfo.getId())
                .keyName(contactInfo.getKeyName())
                .value(contactInfo.getValue())
                .category(contactInfo.getCategory())
                .displayOrder(contactInfo.getDisplayOrder())
                .active(contactInfo.getActive())
                .build();
    }
}
