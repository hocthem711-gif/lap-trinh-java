package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.AlertCreateRequest;
import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.entity.Alert;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.AlertService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;
    private final ZoneRepository zoneRepository;
    private final SensorRepository sensorRepository;

    public AlertServiceImpl(AlertRepository alertRepository, ZoneRepository zoneRepository,
                            SensorRepository sensorRepository) {
        this.alertRepository = alertRepository;
        this.zoneRepository = zoneRepository;
        this.sensorRepository = sensorRepository;
    }

    @Override
    @Transactional
    public AlertResponse createAlert(AlertCreateRequest request) {
        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", request.getZoneId()));

        Sensor sensor = null;
        if (request.getSensorId() != null) {
            sensor = sensorRepository.findById(request.getSensorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Sensor", "id", request.getSensorId()));
        }

        Alert alert = new Alert(request.getMessage(), request.getAlertLevel(), zone, sensor);
        Alert saved = alertRepository.save(alert);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> getAllAlerts() {
        return alertRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> getAlertsByZoneId(Long zoneId) {
        return alertRepository.findByZoneIdOrderByCreatedAtDesc(zoneId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<AlertResponse> getUnreadAlerts() {
        return alertRepository.findByIsReadFalse().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public long countUnreadAlerts() {
        return alertRepository.countByIsReadFalse();
    }

    @Override
    @Transactional
    public AlertResponse markAsRead(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
        alert.setIsRead(true);
        Alert updated = alertRepository.save(alert);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public AlertResponse resolveAlert(Long id, String resolvedNote) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
        alert.setIsRead(true);
        Alert updated = alertRepository.save(alert);
        return toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteAlert(Long id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
        alertRepository.delete(alert);
    }

    private AlertResponse toResponse(Alert alert) {
        Zone zone = alert.getZone();
        Sensor sensor = alert.getSensor();
        return new AlertResponse(
                alert.getId(),
                alert.getMessage(),
                alert.getAlertLevel(),
                alert.getIsRead(),
                zone != null ? zone.getId() : null,
                zone != null ? zone.getName() : null,
                sensor != null ? sensor.getId() : null,
                sensor != null ? sensor.getName() : null,
                alert.getCreatedAt()
        );
    }
}
