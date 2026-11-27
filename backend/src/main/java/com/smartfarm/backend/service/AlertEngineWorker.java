package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.entity.Threshold;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorDataRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ThresholdRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class AlertEngineWorker {

    private static final Logger log = LoggerFactory.getLogger(AlertEngineWorker.class);

    private final SensorRepository sensorRepository;
    private final SensorDataRepository sensorDataRepository;
    private final ThresholdRepository thresholdRepository;
    private final AlertRepository alertRepository;
    private final TelemetryRealtimeService telemetryRealtimeService;
    private final EmailAlertService emailAlertService;

    public AlertEngineWorker(SensorRepository sensorRepository,
                             SensorDataRepository sensorDataRepository,
                             ThresholdRepository thresholdRepository,
                             AlertRepository alertRepository,
                             TelemetryRealtimeService telemetryRealtimeService) {
        this(sensorRepository, sensorDataRepository, thresholdRepository, alertRepository, telemetryRealtimeService, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public AlertEngineWorker(SensorRepository sensorRepository,
                             SensorDataRepository sensorDataRepository,
                             ThresholdRepository thresholdRepository,
                             AlertRepository alertRepository,
                             TelemetryRealtimeService telemetryRealtimeService,
                             @org.springframework.lang.Nullable EmailAlertService emailAlertService) {
        this.sensorRepository = sensorRepository;
        this.sensorDataRepository = sensorDataRepository;
        this.thresholdRepository = thresholdRepository;
        this.alertRepository = alertRepository;
        this.telemetryRealtimeService = telemetryRealtimeService;
        this.emailAlertService = emailAlertService;
    }

    /**
     * Quét dữ liệu đo định kỳ mỗi 5 giây
     */
    @Scheduled(fixedDelay = 5000)
    @Transactional
    public void scanAndEvaluateAlerts() {
        List<Sensor> sensors = sensorRepository.findAll();

        for (Sensor sensor : sensors) {
            if (sensor.getZone() == null || sensor.getSensorType() == null) {
                continue;
            }

            Optional<SensorData> latestDataOpt = sensorDataRepository.findFirstBySensorIdOrderByRecordedAtDesc(sensor.getId());
            if (latestDataOpt.isEmpty()) {
                continue;
            }
            SensorData data = latestDataOpt.get();

            Optional<Threshold> thresholdOpt = thresholdRepository.findByZoneIdAndSensorType(
                    sensor.getZone().getId(), sensor.getSensorType()
            );
            if (thresholdOpt.isEmpty()) {
                continue;
            }
            Threshold threshold = thresholdOpt.get();
            if (Boolean.FALSE.equals(threshold.getEnabled())) {
                continue;
            }

            Double val = data.getValue();
            Double minVal = threshold.getMinValue();
            Double maxVal = threshold.getMaxValue();
            Double critMin = threshold.getCriticalMin();
            Double critMax = threshold.getCriticalMax();

            boolean isViolated = false;
            String reason = "";

            if (maxVal != null && val > maxVal) {
                isViolated = true;
                reason = "vượt ngưỡng tối đa (" + val + " " + (data.getUnit() != null ? data.getUnit() : "")
                        + " > " + maxVal + ")";
            } else if (minVal != null && val < minVal) {
                isViolated = true;
                reason = "thấp hơn ngưỡng tối thiểu (" + val + " " + (data.getUnit() != null ? data.getUnit() : "")
                        + " < " + minVal + ")";
            }

            Optional<Alert> openAlertOpt = alertRepository.findFirstBySensorIdAndStatus(sensor.getId(), AlertStatus.OPEN);

            if (isViolated) {
                if (openAlertOpt.isEmpty()) {
                    AlertLevel level = AlertLevel.WARNING;
                    if ((critMax != null && val >= critMax) || (critMin != null && val <= critMin)) {
                        level = AlertLevel.CRITICAL;
                    } else if ((maxVal != null && val > maxVal * 1.2) || (minVal != null && val < minVal * 0.8)) {
                        level = AlertLevel.CRITICAL;
                    }

                    String message = String.format("Cảm biến %s (%s) tại khu vực %s %s!",
                            sensor.getName() != null ? sensor.getName() : sensor.getSensorCode(),
                            sensor.getSensorType(),
                            sensor.getZone().getName(),
                            reason
                    );

                    Alert newAlert = new Alert(message, level, sensor.getZone(), sensor);
                    newAlert.setStatus(AlertStatus.OPEN);
                    Alert savedAlert = alertRepository.save(newAlert);

                    log.warn("[ALERT-ENGINE] Phát hiện vi phạm: {}", message);

                    // Kích hoạt gửi email cảnh báo tự động nếu là cảnh báo CRITICAL hoặc WARNING (Dev 1 - LTJ-36)
                    if (emailAlertService != null && (savedAlert.getAlertLevel() == AlertLevel.CRITICAL || savedAlert.getAlertLevel() == AlertLevel.WARNING)) {
                        try {
                            emailAlertService.sendAlertEmail(savedAlert);
                        } catch (Exception ex) {
                            log.warn("[ALERT-ENGINE] Không thể gửi Email Alert: {}", ex.getMessage());
                        }
                    }

                    // Đóng gói AlertResponse (12 tham số) và broadcast tức thì qua WebSocket & SSE
                    try {
                        AlertResponse alertDto = new AlertResponse(
                                savedAlert.getId(),
                                savedAlert.getMessage(),
                                savedAlert.getAlertLevel(),
                                savedAlert.getIsRead(),
                                savedAlert.getStatus(),
                                savedAlert.getResolvedNote(),
                                savedAlert.getResolvedAt(),
                                sensor.getZone().getId(),
                                sensor.getZone().getName(),
                                sensor.getId(),
                                sensor.getName(),
                                savedAlert.getCreatedAt()
                        );
                        telemetryRealtimeService.broadcastAlert(alertDto);
                        log.info("[ALERT-ENGINE] Đã broadcast cảnh báo đỏ qua WebSocket (/topic/alerts) và SSE: Alert ID {}", savedAlert.getId());
                    } catch (Exception ex) {
                        log.warn("[ALERT-ENGINE] Không thể broadcast Alert: {}", ex.getMessage());
                    }
                }
            } else {
                if (openAlertOpt.isPresent()) {
                    Alert alert = openAlertOpt.get();
                    alert.setStatus(AlertStatus.RESOLVED);
                    alert.setResolvedAt(LocalDateTime.now());
                    alert.setResolvedNote("Hệ thống tự động đóng: Dữ liệu đo đã trở lại ngưỡng bình thường (" + val + ")");
                    alertRepository.save(alert);

                    log.info("[ALERT-ENGINE] Cảm biến {} đã an toàn. Đã đóng Alert ID: {}",
                            sensor.getSensorCode(), alert.getId());
                }
            }
        }
    }
}
