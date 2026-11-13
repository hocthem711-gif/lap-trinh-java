package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.AlertCreateRequest;
import com.smartfarm.backend.dto.response.AlertResponse;

import java.util.List;

public interface AlertService {
    AlertResponse createAlert(AlertCreateRequest request);
    List<AlertResponse> getAllAlerts();
    List<AlertResponse> getAlertsByZoneId(Long zoneId);
    List<AlertResponse> getUnreadAlerts();
    long countUnreadAlerts();
    AlertResponse markAsRead(Long id);
    AlertResponse resolveAlert(Long id, String resolvedNote);
    void deleteAlert(Long id);
}
