package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.SensorCreateRequest;
import com.smartfarm.backend.dto.response.SensorResponse;

import java.util.List;

public interface SensorService {
    SensorResponse createSensor(SensorCreateRequest request);
    List<SensorResponse> getAllSensors();
    List<SensorResponse> getSensorsByZoneId(Long zoneId);
    SensorResponse getSensorById(Long id);
    SensorResponse updateSensor(Long id, SensorCreateRequest request);
    void deleteSensor(Long id);
}
