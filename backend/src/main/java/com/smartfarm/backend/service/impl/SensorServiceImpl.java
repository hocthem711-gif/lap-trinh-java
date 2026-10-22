package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.SensorCreateRequest;
import com.smartfarm.backend.dto.response.SensorResponse;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.SensorService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class SensorServiceImpl implements SensorService {

    private final SensorRepository sensorRepository;
    private final ZoneRepository zoneRepository;

    public SensorServiceImpl(SensorRepository sensorRepository, ZoneRepository zoneRepository) {
        this.sensorRepository = sensorRepository;
        this.zoneRepository = zoneRepository;
    }

    @Override
    @Transactional
    public SensorResponse createSensor(SensorCreateRequest request) {
        if (sensorRepository.existsBySensorCode(request.getSensorCode())) {
            throw new IllegalArgumentException("Mã cảm biến '" + request.getSensorCode() + "' đã tồn tại!");
        }

        Zone zone = zoneRepository.findById(request.getZoneId())
                .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", request.getZoneId()));

        Sensor sensor = new Sensor(
                request.getSensorCode(),
                request.getName() != null ? request.getName() : request.getSensorCode(),
                request.getSensorType(),
                zone,
                request.getLatitude(),
                request.getLongitude()
        );

        Sensor savedSensor = sensorRepository.save(sensor);
        return toResponse(savedSensor);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SensorResponse> getAllSensors() {
        return sensorRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SensorResponse> getSensorsByZoneId(Long zoneId) {
        if (!zoneRepository.existsById(zoneId)) {
            throw new ResourceNotFoundException("Zone", "id", zoneId);
        }
        return sensorRepository.findByZoneId(zoneId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public SensorResponse getSensorById(Long id) {
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", "id", id));
        return toResponse(sensor);
    }

    @Override
    @Transactional
    public SensorResponse updateSensor(Long id, SensorCreateRequest request) {
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", "id", id));

        if (request.getName() != null) sensor.setName(request.getName());
        if (request.getSensorType() != null) sensor.setSensorType(request.getSensorType());
        if (request.getLatitude() != null) sensor.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) sensor.setLongitude(request.getLongitude());

        if (request.getZoneId() != null && (sensor.getZone() == null || !request.getZoneId().equals(sensor.getZone().getId()))) {
            Zone newZone = zoneRepository.findById(request.getZoneId())
                    .orElseThrow(() -> new ResourceNotFoundException("Zone", "id", request.getZoneId()));
            sensor.setZone(newZone);
        }

        Sensor updatedSensor = sensorRepository.save(sensor);
        return toResponse(updatedSensor);
    }

    @Override
    @Transactional
    public void deleteSensor(Long id) {
        Sensor sensor = sensorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", "id", id));
        sensorRepository.delete(sensor);
    }

    private SensorResponse toResponse(Sensor sensor) {
        Long zoneId = sensor.getZone() != null ? sensor.getZone().getId() : null;
        String zoneName = sensor.getZone() != null ? sensor.getZone().getName() : null;
        Long farmId = (sensor.getZone() != null && sensor.getZone().getFarm() != null) ? sensor.getZone().getFarm().getId() : null;
        String farmName = (sensor.getZone() != null && sensor.getZone().getFarm() != null) ? sensor.getZone().getFarm().getName() : null;

        return new SensorResponse(
                sensor.getId(),
                sensor.getSensorCode(),
                sensor.getName(),
                sensor.getSensorType(),
                sensor.getStatus(),
                zoneId,
                zoneName,
                farmId,
                farmName,
                sensor.getLatitude(),
                sensor.getLongitude(),
                sensor.getInstalledAt()
        );
    }
}
