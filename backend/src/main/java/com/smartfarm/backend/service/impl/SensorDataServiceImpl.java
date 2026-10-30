package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.*;
import com.smartfarm.backend.entity.Sensor;
import com.smartfarm.backend.entity.SensorData;
import com.smartfarm.backend.entity.SensorStatus;
import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorDataRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.SensorDataService;
import com.smartfarm.backend.validation.SensorDataValidator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SensorDataServiceImpl implements SensorDataService {

    private static final Logger log = LoggerFactory.getLogger(SensorDataServiceImpl.class);

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final ZoneRepository zoneRepository;
    private final AlertRepository alertRepository;
    private final SensorDataValidator sensorDataValidator;

    public SensorDataServiceImpl(SensorRepository sensorRepository,
                                 SensorDataRepository sensorDataRepository,
                                 ZoneRepository zoneRepository,
                                 AlertRepository alertRepository,
                                 SensorDataValidator sensorDataValidator) {
        this.sensorRepository = sensorRepository;
        this.sensorDataRepository = sensorDataRepository;
        this.zoneRepository = zoneRepository;
        this.alertRepository = alertRepository;
        this.sensorDataValidator = sensorDataValidator;
    }

    @Override
    @Transactional
    public SensorDataResponse ingestData(SensorDataIngestRequest request) {
        Sensor sensor = sensorRepository.findBySensorCode(request.getSensorCode())
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", "sensorCode", request.getSensorCode()));

        LocalDateTime recordedAt = request.getRecordedAt() != null ? request.getRecordedAt() : LocalDateTime.now();

        // 1. Kiểm định tính hợp lệ theo dải vật lý (F19)
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

        // 3. Chuẩn hóa đơn vị đo
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
        log.info("Thu nạp thành công: {} = {}{} ({})",
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

        Zone zone = zoneId != null ? zoneRepository.findById(zoneId).orElse(null) : null;

        ingestSingleMetric(deviceId + "-TEMP", SensorType.TEMPERATURE, payload.getTemperature(), "°C", status, recordedAt, zone)
                .ifPresent(responses::add);
        ingestSingleMetric(deviceId + "-HUM", SensorType.HUMIDITY, payload.getHumidity(), "%", status, recordedAt, zone)
                .ifPresent(responses::add);
        ingestSingleMetric(deviceId + "-SOIL", SensorType.SOIL_MOISTURE, payload.getSoilMoisture(), "%", status, recordedAt, zone)
                .ifPresent(responses::add);
        ingestSingleMetric(deviceId + "-LIGHT", SensorType.LIGHT, payload.getLight(), "lux", status, recordedAt, zone)
                .ifPresent(responses::add);

        log.info("Đã xử lý telemetry simulator từ device '{}' ({} chỉ số)", deviceId, responses.size());
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

        Sensor sensor = sensorRepository.findBySensorCode(sensorCode).orElse(null);

        if (sensor == null && zone != null) {
            List<Sensor> existingInZone = sensorRepository.findByZoneId(zone.getId());
            sensor = existingInZone.stream()
                    .filter(s -> s.getSensorType() == sensorType)
                    .findFirst()
                    .orElse(null);

            if (sensor == null) {
                sensor = new Sensor(sensorCode, sensorCode, sensorType, zone, 11.9404, 108.4583);
                sensor = sensorRepository.save(sensor);
            }
        }

        if (sensor == null) return Optional.empty();

        SensorDataValidator.ValidationResult validation = sensorDataValidator.validateReading(
                sensorType, value, null, recordedAt);
        if (!validation.isValid()) return Optional.empty();

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
        return sensorRepository.findAll().stream()
                .map(this::toLatestTelemetryResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<LatestSensorTelemetryResponse> getLatestTelemetryByZone(Long zoneId) {
        if (!zoneRepository.existsById(zoneId)) {
            throw new ResourceNotFoundException("Zone", "id", zoneId);
        }
        return sensorRepository.findByZoneId(zoneId).stream()
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

        return sensorDataRepository.findBySensorIdAndRecordedAtBetween(sensorId, effectiveStart, effectiveEnd)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public PagedResponse<SensorDataResponse> getHistoricalDataPaged(
            Long sensorId, Long zoneId, LocalDateTime start, LocalDateTime end, int page, int size) {
        LocalDateTime effectiveStart = start != null ? start : LocalDateTime.now().minusDays(7);
        LocalDateTime effectiveEnd = end != null ? end : LocalDateTime.now();

        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "recordedAt"));

        Page<SensorData> dataPage;
        if (sensorId != null) {
            if (!sensorRepository.existsById(sensorId)) throw new ResourceNotFoundException("Sensor", "id", sensorId);
            dataPage = sensorDataRepository.findBySensorIdAndRecordedAtBetween(sensorId, effectiveStart, effectiveEnd, pageable);
        } else if (zoneId != null) {
            if (!zoneRepository.existsById(zoneId)) throw new ResourceNotFoundException("Zone", "id", zoneId);
            dataPage = sensorDataRepository.findBySensorZoneIdAndRecordedAtBetween(zoneId, effectiveStart, effectiveEnd, pageable);
        } else {
            dataPage = sensorDataRepository.findByRecordedAtBetween(effectiveStart, effectiveEnd, pageable);
        }

        List<SensorDataResponse> content = dataPage.getContent().stream()
                .map(this::toResponse).collect(Collectors.toList());

        return new PagedResponse<>(content, dataPage.getNumber(), dataPage.getSize(), dataPage.getTotalElements(), dataPage.getTotalPages(), dataPage.isLast());
    }

    @Override
    @Transactional(readOnly = true)
    public TimeSeriesResponse getTimeSeriesData(Long sensorId, String interval, LocalDateTime start, LocalDateTime end) {
        Sensor sensor = sensorRepository.findById(sensorId)
                .orElseThrow(() -> new ResourceNotFoundException("Sensor", "id", sensorId));

        String intervalType = (interval != null && interval.equalsIgnoreCase("DAILY")) ? "DAILY" : "HOURLY";
        LocalDateTime effectiveStart = start != null ? start :
                (intervalType.equals("DAILY") ? LocalDateTime.now().minusDays(30) : LocalDateTime.now().minusHours(24));
        LocalDateTime effectiveEnd = end != null ? end : LocalDateTime.now();

        List<SensorData> rawData = sensorDataRepository
                .findBySensorIdAndRecordedAtBetweenOrderByRecordedAtAsc(sensorId, effectiveStart, effectiveEnd);

        DateTimeFormatter formatter = intervalType.equals("DAILY") ?
                DateTimeFormatter.ofPattern("yyyy-MM-dd") :
                DateTimeFormatter.ofPattern("yyyy-MM-dd HH:00");

        Map<String, List<Double>> grouped = new LinkedHashMap<>();
        for (SensorData data : rawData) {
            if (data.getValue() != null && data.getRecordedAt() != null) {
                grouped.computeIfAbsent(data.getRecordedAt().format(formatter), k -> new ArrayList<>()).add(data.getValue());
            }
        }

        List<TimeSeriesPointDTO> points = new ArrayList<>();
        for (Map.Entry<String, List<Double>> entry : grouped.entrySet()) {
            List<Double> vals = entry.getValue();
            double avg = vals.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            double min = vals.stream().mapToDouble(Double::doubleValue).min().orElse(0.0);
            double max = vals.stream().mapToDouble(Double::doubleValue).max().orElse(0.0);
            points.add(new TimeSeriesPointDTO(entry.getKey(), avg, min, max, vals.size()));
        }

        return new TimeSeriesResponse(sensor.getId(), sensor.getSensorCode(), sensor.getSensorType().name(),
                getDefaultUnit(sensor.getSensorType()), intervalType, points);
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummary() {
        long totalSensors = sensorRepository.count();
        long activeSensors = sensorRepository.countByStatus(SensorStatus.ACTIVE);
        long inactiveSensors = totalSensors - activeSensors;

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long totalTelemetryToday = sensorDataRepository.countByRecordedAtGreaterThanEqual(startOfDay);
        long unreadAlerts = alertRepository.countByIsReadFalse();

        LocalDateTime since24h = LocalDateTime.now().minusHours(24);
        Double avgBattery = sensorDataRepository.getAverageBatteryLevelSince(since24h);
        Double avgTemp = sensorDataRepository.getAverageBySensorTypeSince(SensorType.TEMPERATURE, since24h);
        Double avgHum = sensorDataRepository.getAverageBySensorTypeSince(SensorType.HUMIDITY, since24h);

        return new DashboardSummaryResponse(
                totalSensors,
                activeSensors,
                inactiveSensors,
                avgBattery,
                avgTemp,
                avgHum,
                totalTelemetryToday,
                unreadAlerts
        );
    }

    @Override
    @Transactional(readOnly = true)
    public DashboardSummaryResponse getDashboardSummaryByZone(Long zoneId) {
        if (!zoneRepository.existsById(zoneId)) {
            throw new ResourceNotFoundException("Zone", "id", zoneId);
        }

        long totalSensors = sensorRepository.countByZoneId(zoneId);
        long activeSensors = sensorRepository.countByZoneIdAndStatus(zoneId, SensorStatus.ACTIVE);
        long inactiveSensors = totalSensors - activeSensors;

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long totalTelemetryToday = sensorDataRepository.countBySensorZoneIdAndRecordedAtGreaterThanEqual(zoneId, startOfDay);
        long unreadAlerts = alertRepository.countByZoneIdAndIsReadFalse(zoneId);

        LocalDateTime since24h = LocalDateTime.now().minusHours(24);
        Double avgBattery = sensorDataRepository.getAverageBatteryLevelByZoneSince(zoneId, since24h);
        Double avgTemp = sensorDataRepository.getAverageByZoneAndSensorTypeSince(zoneId, SensorType.TEMPERATURE, since24h);
        Double avgHum = sensorDataRepository.getAverageByZoneAndSensorTypeSince(zoneId, SensorType.HUMIDITY, since24h);

        return new DashboardSummaryResponse(
                totalSensors,
                activeSensors,
                inactiveSensors,
                avgBattery,
                avgTemp,
                avgHum,
                totalTelemetryToday,
                unreadAlerts
        );
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
                sensor.getId(), sensor.getSensorCode(), sensor.getName(), sensor.getSensorType(), sensor.getStatus(),
                zoneId, zoneName, farmId, farmName, sensor.getLatitude(), sensor.getLongitude(),
                latestValue, unit, batteryLevel, dataStatus, lastUpdated
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
                data.getId(), sensorId, sensorCode, sensorType, zoneId, zoneName,
                data.getValue(), data.getUnit(), data.getBatteryLevel(), data.getStatus(), data.getRecordedAt()
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
