package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.LatestSensorTelemetryResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.SensorData;
import com.smartfarm.backend.entity.SensorStatus;
import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.SensorDataRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.SensorDataService;
import com.smartfarm.backend.validation.SensorDataValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class SensorDataServiceImpl implements SensorDataService {

    private static final Logger log = LoggerFactory.getLogger(SensorDataServiceImpl.class);

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final ZoneRepository zoneRepository;
    private final SensorDataValidator sensorDataValidator;

    public SensorDataServiceImpl(SensorRepository sensorRepository,
                                 SensorDataRepository sensorDataRepository,
                                 ZoneRepository zoneRepository,
                                 SensorDataValidator sensorDataValidator) {
        this.sensorRepository = sensorRepository;
        this.sensorDataRepository = sensorDataRepository;
        this.zoneRepository = zoneRepository;
        this.sensorDataValidator = sensorDataValidator;
    }

    @Override
    @Transactional
    public SensorDataResponse ingestData(SensorDataIngestRequest request) {
        Sensor sensor = sensorRepository.findBySensorCode(request.getSensorCode())
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", "sensorCode", request.getSensorCode()));

        LocalDateTime recordedAt = request.getRecordedAt() != null ? request.getRecordedAt() : LocalDateTime.now();

        // 1. Kiểm định tính hợp lệ theo nghiệp vụ và vật lý (F19)
        SensorDataValidator.ValidationResult validation = sensorDataValidator.validateReading(
                sensor.getSensorType(),
                request.getValue(),
                request.getBatteryLevel(),
                recordedAt
        );
        if (!validation.isValid()) {
            log.warn("Dữ liệu cảm biến không hợp lệ [{}]: {}", sensor.getSensorCode(), validation.getMessage());
            throw new IllegalArgumentException(validation.getMessage());
        }

        // 2. Chống ghi trùng mốc thời gian (Duplicate detection)
        if (sensorDataRepository.existsBySensorIdAndRecordedAt(sensor.getId(), recordedAt)) {
            log.warn("Bỏ qua bản ghi trùng mốc thời gian cho sensor [{}] tại {}", sensor.getSensorCode(), recordedAt);
            Optional<SensorData> existing = sensorDataRepository.findFirstBySensorIdOrderByRecordedAtDesc(sensor.getId());
            return existing.map(this::toResponse).orElse(null);
        }

        // 3. Chuẩn hóa đơn vị đo lường mặc định
        String unit = request.getUnit();
        if (unit == null || unit.trim().isEmpty()) {
            unit = getDefaultUnit(sensor.getSensorType());
        }

        String status = (request.getStatus() != null && !request.getStatus().trim().isEmpty())
                ? request.getStatus()
                : "NORMAL";

        SensorData sensorData = new SensorData(
                request.getValue(),
                unit,
                request.getBatteryLevel(),
                status,
                recordedAt,
                sensor
        );

        SensorData savedData = sensorDataRepository.save(sensorData);
        log.info("Thu nạp thành công dữ liệu cảm biến: {} = {}{} ({})",
                sensor.getSensorCode(), savedData.getValue(), savedData.getUnit(), savedData.getStatus());

        return toResponse(savedData);
    }

    @Override
    @Transactional
    public List<SensorDataResponse> ingestSimulatorPayload(IoTSimulatorPayload payload) {
        List<SensorDataResponse> responses = new ArrayList<>();

        LocalDateTime recordedAt;
        if (payload.getTimestamp() > 0) {
            recordedAt = LocalDateTime.ofInstant(
                    Instant.ofEpochSecond(payload.getTimestamp()),
                    ZoneId.systemDefault()
            );
        } else {
            recordedAt = LocalDateTime.now();
        }

        String deviceId = payload.getDeviceId();
        Long zoneId = payload.getZoneId();
        String status = payload.getStatus() != null ? payload.getStatus() : "NORMAL";

        // Tìm hoặc tự động khởi tạo Zone nếu zoneId được chỉ định
        Zone zone = null;
        if (zoneId != null) {
            zone = zoneRepository.findById(zoneId).orElse(null);
        }

        // Ingest lần lượt 4 chỉ số: Temperature, Humidity, Soil Moisture, Light
        ingestSingleMetric(deviceId + "-TEMP", SensorType.TEMPERATURE, payload.getTemperature(), "°C", status, recordedAt, zone)
                .ifPresent(responses::add);

        ingestSingleMetric(deviceId + "-HUM", SensorType.HUMIDITY, payload.getHumidity(), "%", status, recordedAt, zone)
                .ifPresent(responses::add);

        ingestSingleMetric(deviceId + "-SOIL", SensorType.SOIL_MOISTURE, payload.getSoilMoisture(), "%", status, recordedAt, zone)
                .ifPresent(responses::add);

        ingestSingleMetric(deviceId + "-LIGHT", SensorType.LIGHT, payload.getLight(), "lux", status, recordedAt, zone)
                .ifPresent(responses::add);

        log.info("Đã xử lý gói tin simulator từ device '{}' ({} chỉ số được lưu)", deviceId, responses.size());
        return responses;
    }

    private Optional<SensorDataResponse> ingestSingleMetric(String sensorCode,
                                                           SensorType sensorType,
                                                           Double value,
                                                           String unit,
                                                           String status,
                                                           LocalDateTime recordedAt,
                                                           Zone zone) {
        if (value == null) return Optional.empty();

        // Tìm sensor theo code, nếu chưa có thì tìm theo zone & sensorType hoặc tự động tạo mới
        Sensor sensor = sensorRepository.findBySensorCode(sensorCode).orElse(null);

        if (sensor == null && zone != null) {
            // Kiểm tra xem trong zone có sensor cùng loại chưa
            List<Sensor> existingInZone = sensorRepository.findByZoneId(zone.getId());
            sensor = existingInZone.stream()
                    .filter(s -> s.getSensorType() == sensorType)
                    .findFirst()
                    .orElse(null);

            // Nếu vẫn chưa có sensor, tự động tạo mới để tương thích hoàn toàn với IoT Simulator
            if (sensor == null) {
                sensor = new Sensor(sensorCode, sensorCode, sensorType, zone, 11.9404, 108.4583);
                sensor = sensorRepository.save(sensor);
                log.info("Tự động đăng ký cảm biến mới: {} (Loại: {}) cho Vùng ID: {}",
                        sensorCode, sensorType, zone.getId());
            }
        }

        if (sensor == null) {
            log.warn("Không tìm thấy sensor hoặc zone phù hợp cho mã: {}", sensorCode);
            return Optional.empty();
        }

        // Kiểm tra hợp lệ
        SensorDataValidator.ValidationResult validation = sensorDataValidator.validateReading(
                sensorType, value, null, recordedAt);
        if (!validation.isValid()) {
            log.warn("Bỏ qua chỉ số không hợp lệ [{}]: {}", sensorCode, validation.getMessage());
            return Optional.empty();
        }

        // Chống ghi trùng
        if (sensorDataRepository.existsBySensorIdAndRecordedAt(sensor.getId(), recordedAt)) {
            return Optional.empty();
        }

        SensorData data = new SensorData(value, unit, 100.0, status, recordedAt, sensor);
        SensorData saved = sensorDataRepository.save(data);
        return Optional.of(toResponse(saved));
    }

    @Override
    @Transactional(readOnly = true)
    public List<LatestSensorTelemetryResponse> getLatestTelemetryAll() {
        List<Sensor> allSensors = sensorRepository.findAll();
        return allSensors.stream()
                .map(this::toLatestTelemetryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LatestSensorTelemetryResponse> getLatestTelemetryByZone(Long zoneId) {
        if (!zoneRepository.existsById(zoneId)) {
            throw new ResourceNotFoundException("Zone", "id", zoneId);
        }
        List<Sensor> sensors = sensorRepository.findByZoneId(zoneId);
        return sensors.stream()
                .map(this::toLatestTelemetryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SensorDataResponse> getHistoricalData(Long sensorId, LocalDateTime start, LocalDateTime end) {
        if (!sensorRepository.existsById(sensorId)) {
            throw new ResourceNotFoundException("Sensor", "id", sensorId);
        }

        LocalDateTime effectiveStart = start != null ? start : LocalDateTime.now().minusDays(1);
        LocalDateTime effectiveEnd = end != null ? end : LocalDateTime.now();

        List<SensorData> records = sensorDataRepository.findBySensorIdAndRecordedAtBetween(
                sensorId, effectiveStart, effectiveEnd);

        return records.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private LatestSensorTelemetryResponse toLatestTelemetryResponse(Sensor sensor) {
        Optional<SensorData> latestDataOpt = sensorDataRepository.findFirstBySensorIdOrderByRecordedAtDesc(sensor.getId());

        Long zoneId = sensor.getZone() != null ? sensor.getZone().getId() : null;
        String zoneName = sensor.getZone() != null ? sensor.getZone().getName() : null;
        Long farmId = (sensor.getZone() != null && sensor.getZone().getFarm() != null) ? sensor.getZone().getFarm().getId() : null;
        String farmName = (sensor.getZone() != null && sensor.getZone().getFarm() != null) ? sensor.getZone().getFarm().getName() : null;

        Double latestValue = null;
        String unit = getDefaultUnit(sensor.getSensorType());
        Double batteryLevel = null;
        String dataStatus = "NO_DATA";
        LocalDateTime lastUpdated = null;

        if (latestDataOpt.isPresent()) {
            SensorData latest = latestDataOpt.get();
            latestValue = latest.getValue();
            if (latest.getUnit() != null) unit = latest.getUnit();
            batteryLevel = latest.getBatteryLevel();
            dataStatus = latest.getStatus();
            lastUpdated = latest.getRecordedAt();
        }

        return new LatestSensorTelemetryResponse(
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
                latestValue,
                unit,
                batteryLevel,
                dataStatus,
                lastUpdated
        );
    }

    private SensorDataResponse toResponse(SensorData data) {
        Sensor sensor = data.getSensor();
        Long sensorId = sensor != null ? sensor.getId() : null;
        String sensorCode = sensor != null ? sensor.getSensorCode() : null;
        SensorType sensorType = sensor != null ? sensor.getSensorType() : null;
        Long zoneId = (sensor != null && sensor.getZone() != null) ? sensor.getZone().getId() : null;
        String zoneName = (sensor != null && sensor.getZone() != null) ? sensor.getZone().getName() : null;

        return new SensorDataResponse(
                data.getId(),
                sensorId,
                sensorCode,
                sensorType,
                zoneId,
                zoneName,
                data.getValue(),
                data.getUnit(),
                data.getBatteryLevel(),
                data.getStatus(),
                data.getRecordedAt()
        );
    }

    private String getDefaultUnit(SensorType type) {
        if (type == null) return "";
        switch (type) {
            case TEMPERATURE: return "°C";
            case HUMIDITY:
            case SOIL_MOISTURE: return "%";
            case LIGHT: return "lux";
            case CO2: return "ppm";
            default: return "";
        }
    }
}
