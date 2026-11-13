package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.ThresholdRequest;
import com.smartfarm.backend.dto.response.ThresholdResponse;

import java.util.List;

public interface ThresholdService {
    ThresholdResponse createThreshold(ThresholdRequest request);
    List<ThresholdResponse> getAllThresholds();
    ThresholdResponse getThresholdById(Long id);
    List<ThresholdResponse> getThresholdsByZoneId(Long zoneId);
    ThresholdResponse updateThreshold(Long id, ThresholdRequest request);
    void deleteThreshold(Long id);
}
