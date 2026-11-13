package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.ThresholdRequest;
import com.smartfarm.backend.dto.response.ThresholdResponse;
import com.smartfarm.backend.entity.Threshold;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.ThresholdRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.ThresholdService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ThresholdServiceImpl implements ThresholdService {

    private final ThresholdRepository thresholdRepository;
    private final ZoneRepository zoneRepository;

    public ThresholdServiceImpl(ThresholdRepository thresholdRepository, ZoneRepository zoneRepository) {
        this.thresholdRepository = thresholdRepository;
        this.zoneRepository = zoneRepository;
    }

    @Override
    @Transactional
    public ThresholdResponse createThreshold(ThresholdRequest request) {
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", request.getZoneId()));

        // Kiểm tra đã tồn tại threshold cho zone + sensorType chưa
        thresholdRepository.findByZoneIdAndSensorType(request.getZoneId(), request.getSensorType())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException(
                            "Ngưỡng cho " + request.getSensorType() + " tại Zone '" + zone.getName() + "' đã tồn tại (ID: " + existing.getId() + ")");
                });

        Threshold threshold = new Threshold(
                request.getSensorType(),
                request.getMinValue(),
                request.getMaxValue(),
                zone
        );

        Threshold saved = thresholdRepository.save(threshold);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ThresholdResponse> getAllThresholds() {
        return thresholdRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ThresholdResponse getThresholdById(Long id) {
        Threshold threshold = thresholdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Threshold", "id", id));
        return toResponse(threshold);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ThresholdResponse> getThresholdsByZoneId(Long zoneId) {
        return thresholdRepository.findByZoneId(zoneId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ThresholdResponse updateThreshold(Long id, ThresholdRequest request) {
        Threshold threshold = thresholdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Threshold", "id", id));

        if (request.getMinValue() != null) threshold.setMinValue(request.getMinValue());
        if (request.getMaxValue() != null) threshold.setMaxValue(request.getMaxValue());

        Threshold updated = thresholdRepository.save(threshold);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteThreshold(Long id) {
        Threshold threshold = thresholdRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Threshold", "id", id));
        thresholdRepository.delete(threshold);
    }

    private ThresholdResponse toResponse(Threshold threshold) {
        Zone zone = threshold.getZone();
        return new ThresholdResponse(
                threshold.getId(),
                threshold.getSensorType(),
                threshold.getMinValue(),
                threshold.getMaxValue(),
                zone != null ? zone.getId() : null,
                zone != null ? zone.getName() : null,
                threshold.getCreatedAt(),
                threshold.getUpdatedAt()
        );
    }
}
