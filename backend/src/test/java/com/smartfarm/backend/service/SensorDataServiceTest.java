package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.*;
import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorDataRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.impl.SensorDataServiceImpl;
import com.smartfarm.backend.validation.SensorDataValidator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - SensorDataService")
class SensorDataServiceTest {

    @Mock
    private SensorRepository sensorRepository;

    @Mock
    private SensorDataRepository sensorDataRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private AlertRepository alertRepository;

    private SensorDataValidator sensorDataValidator;
    private SensorDataServiceImpl sensorDataService;

    private Zone sampleZone;
    private Sensor sampleSensor;

    @BeforeEach
    void setUp() {
        sensorDataValidator = new SensorDataValidator();
        sensorDataService = new SensorDataServiceImpl(
                sensorRepository, sensorDataRepository, zoneRepository, alertRepository, sensorDataValidator);

        Farm sampleFarm = new Farm("Farm Test", "Da Lat", 1000.0, null);
        sampleZone = new Zone("Zone A", "Dau Tay", sampleFarm);
        sampleSensor = new Sensor("DEV-Z1-001-TEMP", "Cam bien nhiet", SensorType.TEMPERATURE, sampleZone, 11.9404, 108.4583);
    }

    @Test
    @DisplayName("Thu nạp số liệu cảm biến đơn lẻ hợp lệ thành công")
    void testIngestValidSensorData() {
        SensorDataIngestRequest request = new SensorDataIngestRequest(
                "DEV-Z1-001-TEMP", 25.5, "°C", 98.0, "NORMAL", LocalDateTime.now()
        );

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));
        when(sensorDataRepository.existsBySensorIdAndRecordedAt(any(), any())).thenReturn(false);
        when(sensorDataRepository.save(any(SensorData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SensorDataResponse response = sensorDataService.ingestData(request);

        assertNotNull(response);
        assertEquals(25.5, response.getValue());
        assertEquals("°C", response.getUnit());
        assertEquals("NORMAL", response.getStatus());
        verify(sensorDataRepository, times(1)).save(any(SensorData.class));
    }

    @Test
    @DisplayName("Thu nạp số liệu thất bại khi không tìm thấy sensorCode")
    void testIngestDataSensorNotFound() {
        SensorDataIngestRequest request = new SensorDataIngestRequest(
                "NON-EXISTENT", 25.5, "°C", 98.0, "NORMAL", LocalDateTime.now()
        );

        when(sensorRepository.findBySensorCode("NON-EXISTENT")).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> sensorDataService.ingestData(request));
    }

    @Test
    @DisplayName("Thu nạp số liệu thất bại khi giá trị vượt biên độ vật lý")
    void testIngestDataOutOfPhysicalRange() {
        SensorDataIngestRequest request = new SensorDataIngestRequest(
                "DEV-Z1-001-TEMP", 99.9, "°C", 95.0, "NORMAL", LocalDateTime.now()
        );

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));

        assertThrows(IllegalArgumentException.class, () -> sensorDataService.ingestData(request));
        verify(sensorDataRepository, never()).save(any());
    }

    @Test
    @DisplayName("Thu nạp gói tin từ IoT Simulator thành công")
    void testIngestSimulatorPayload() {
        IoTSimulatorPayload payload = new IoTSimulatorPayload(
                "DEV-Z1-001", 1L, 1L, 25.0, 65.0, 70.0, 800.0, "NORMAL", System.currentTimeMillis() / 1000
        );

        when(zoneRepository.findById(1L)).thenReturn(Optional.of(sampleZone));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));
        when(sensorDataRepository.save(any(SensorData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<SensorDataResponse> responses = sensorDataService.ingestSimulatorPayload(payload);

        assertNotNull(responses);
        assertFalse(responses.isEmpty());
    }

    @Test
    @DisplayName("Lấy danh sách viễn trắc mới nhất phục vụ Leaflet Map")
    void testGetLatestTelemetryAll() {
        SensorData sampleData = new SensorData(25.4, "°C", 90.0, "NORMAL", LocalDateTime.now(), sampleSensor);

        when(sensorRepository.findAll()).thenReturn(Collections.singletonList(sampleSensor));
        when(sensorDataRepository.findFirstBySensorIdOrderByRecordedAtDesc(sampleSensor.getId()))
                .thenReturn(Optional.of(sampleData));

        List<LatestSensorTelemetryResponse> telemetry = sensorDataService.getLatestTelemetryAll();

        assertEquals(1, telemetry.size());
        LatestSensorTelemetryResponse item = telemetry.get(0);
        assertEquals("DEV-Z1-001-TEMP", item.getSensorCode());
        assertEquals(25.4, item.getLatestValue());
        assertEquals(11.9404, item.getLatitude());
        assertEquals(108.4583, item.getLongitude());
    }

    @Test
    @DisplayName("Truy vấn lịch sử dữ liệu phân trang (F06)")
    void testGetHistoricalDataPaged() {
        Long sensorId = 1L;
        SensorData data1 = new SensorData(24.0, "°C", 90.0, "NORMAL", LocalDateTime.now(), sampleSensor);
        Page<SensorData> page = new PageImpl<>(List.of(data1));

        when(sensorRepository.existsById(sensorId)).thenReturn(true);
        when(sensorDataRepository.findBySensorIdAndRecordedAtBetween(eq(sensorId), any(), any(), any(Pageable.class)))
                .thenReturn(page);

        PagedResponse<SensorDataResponse> result = sensorDataService.getHistoricalDataPaged(
                sensorId, null, null, null, 0, 10);

        assertNotNull(result);
        assertEquals(1, result.getContent().size());
        assertEquals(24.0, result.getContent().get(0).getValue());
        assertEquals(1L, result.getTotalElements());
    }

    @Test
    @DisplayName("Lấy chuỗi dữ liệu thời gian tổng hợp (Time-series Aggregate)")
    void testGetTimeSeriesData() {
        Long sensorId = 1L;
        LocalDateTime baseTime = LocalDateTime.of(2026, 10, 30, 10, 0, 0);
        SensorData data1 = new SensorData(20.0, "°C", 90.0, "NORMAL", baseTime.plusMinutes(10), sampleSensor);
        SensorData data2 = new SensorData(24.0, "°C", 90.0, "NORMAL", baseTime.plusMinutes(20), sampleSensor);

        when(sensorRepository.findById(sensorId)).thenReturn(Optional.of(sampleSensor));
        when(sensorDataRepository.findBySensorIdAndRecordedAtBetweenOrderByRecordedAtAsc(eq(sensorId), any(), any()))
                .thenReturn(List.of(data1, data2));

        TimeSeriesResponse response = sensorDataService.getTimeSeriesData(sensorId, "HOURLY", baseTime, baseTime.plusHours(1));

        assertNotNull(response);
        assertEquals(sampleSensor.getSensorCode(), response.getSensorCode());
        assertEquals("HOURLY", response.getInterval());
        assertFalse(response.getDataPoints().isEmpty());
        assertEquals(22.0, response.getDataPoints().get(0).getAvgValue());
        assertEquals(20.0, response.getDataPoints().get(0).getMinValue());
        assertEquals(24.0, response.getDataPoints().get(0).getMaxValue());
    }

    @Test
    @DisplayName("Thống kê Dashboard tổng quan toàn trang trại (LTJ-16)")
    void testGetDashboardSummary() {
        when(sensorRepository.count()).thenReturn(10L);
        when(sensorRepository.countByStatus(SensorStatus.ACTIVE)).thenReturn(8L);
        when(sensorDataRepository.countByRecordedAtGreaterThanEqual(any())).thenReturn(120L);
        when(alertRepository.countByIsReadFalse()).thenReturn(1L);
        when(sensorDataRepository.getAverageBatteryLevelSince(any())).thenReturn(85.0);
        when(sensorDataRepository.getAverageBySensorTypeSince(eq(SensorType.TEMPERATURE), any())).thenReturn(24.2);
        when(sensorDataRepository.getAverageBySensorTypeSince(eq(SensorType.HUMIDITY), any())).thenReturn(68.5);

        DashboardSummaryResponse response = sensorDataService.getDashboardSummary();

        assertNotNull(response);
        assertEquals(10L, response.getTotalSensors());
        assertEquals(8L, response.getActiveSensors());
        assertEquals(2L, response.getInactiveSensors());
        assertEquals(85.0, response.getAvgBatteryLevel());
        assertEquals(24.2, response.getAvgTemperature());
        assertEquals(68.5, response.getAvgHumidity());
        assertEquals(120L, response.getTotalTelemetryToday());
        assertEquals(1L, response.getUnreadAlertsCount());
    }

    @Test
    @DisplayName("Thống kê Dashboard theo Vùng canh tác (LTJ-16)")
    void testGetDashboardSummaryByZone() {
        Long zoneId = 1L;
        when(zoneRepository.existsById(zoneId)).thenReturn(true);
        when(sensorRepository.countByZoneId(zoneId)).thenReturn(4L);
        when(sensorRepository.countByZoneIdAndStatus(zoneId, SensorStatus.ACTIVE)).thenReturn(4L);
        when(sensorDataRepository.countBySensorZoneIdAndRecordedAtGreaterThanEqual(eq(zoneId), any())).thenReturn(50L);
        when(alertRepository.countByZoneIdAndIsReadFalse(zoneId)).thenReturn(0L);
        when(sensorDataRepository.getAverageBatteryLevelByZoneSince(eq(zoneId), any())).thenReturn(90.0);
        when(sensorDataRepository.getAverageByZoneAndSensorTypeSince(eq(zoneId), eq(SensorType.TEMPERATURE), any())).thenReturn(23.0);
        when(sensorDataRepository.getAverageByZoneAndSensorTypeSince(eq(zoneId), eq(SensorType.HUMIDITY), any())).thenReturn(70.0);

        DashboardSummaryResponse response = sensorDataService.getDashboardSummaryByZone(zoneId);

        assertNotNull(response);
        assertEquals(4L, response.getTotalSensors());
        assertEquals(4L, response.getActiveSensors());
        assertEquals(0L, response.getInactiveSensors());
        assertEquals(90.0, response.getAvgBatteryLevel());
        assertEquals(23.0, response.getAvgTemperature());
        assertEquals(70.0, response.getAvgHumidity());
    }
}
