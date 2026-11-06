package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.BulkSyncPayload;
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
import static org.mockito.ArgumentMatchers.anyList;
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
        sampleFarm.setId(1L);
        sampleZone = new Zone("Zone A", "Dau Tay", sampleFarm);
        sampleZone.setId(1L);
        sampleSensor = new Sensor("DEV-Z1-001-TEMP", "Cam bien nhiet", SensorType.TEMPERATURE, sampleZone, 11.9404, 108.4583);
        sampleSensor.setId(1L);
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
                "DEV-Z1-001-TEMP", 99.9, "°C", 98.0, "NORMAL", LocalDateTime.now()
        );

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));

        assertThrows(IllegalArgumentException.class, () -> sensorDataService.ingestData(request));
        verify(sensorDataRepository, never()).save(any(SensorData.class));
    }

    @Test
    @DisplayName("Bỏ qua bản ghi trùng mốc thời gian")
    void testIngestDataDuplicateTimestamp() {
        SensorDataIngestRequest request = new SensorDataIngestRequest(
                "DEV-Z1-001-TEMP", 25.0, "°C", 98.0, "NORMAL", LocalDateTime.now()
        );

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));
        when(sensorDataRepository.existsBySensorIdAndRecordedAt(any(), any())).thenReturn(true);
        when(sensorDataRepository.findFirstBySensorIdOrderByRecordedAtDesc(sampleSensor.getId()))
                .thenReturn(Optional.of(new SensorData(25.0, "°C", 98.0, "NORMAL", LocalDateTime.now(), sampleSensor)));

        SensorDataResponse response = sensorDataService.ingestData(request);

        assertNotNull(response);
        verify(sensorDataRepository, never()).save(any(SensorData.class));
    }

    @Test
    @DisplayName("Thu nạp telemetry từ IoT Simulator thành công")
    void testIngestSimulatorPayload() {
        IoTSimulatorPayload payload = new IoTSimulatorPayload(
                "DEV-Z1-001", 1L, 1L, 26.5, 65.0, 42.0, 15000.0, "NORMAL", 1793705200L
        );

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));
        when(zoneRepository.findById(1L)).thenReturn(Optional.of(sampleZone));
        when(sensorRepository.findByZoneId(1L)).thenReturn(Collections.singletonList(sampleSensor));
        when(sensorDataRepository.existsBySensorIdAndRecordedAt(any(), any())).thenReturn(false);
        when(sensorDataRepository.save(any(SensorData.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<SensorDataResponse> list = sensorDataService.ingestSimulatorPayload(payload);

        assertNotNull(list);
        assertFalse(list.isEmpty());
        verify(sensorDataRepository, atLeastOnce()).save(any(SensorData.class));
    }

    @Test
    @DisplayName("Truy vấn lịch sử phân trang thành công (F06)")
    void testGetHistoricalDataPaged() {
        Page<SensorData> mockPage = new PageImpl<>(Collections.emptyList());
        when(zoneRepository.existsById(1L)).thenReturn(true);
        when(sensorDataRepository.findBySensorZoneIdAndRecordedAtBetween(eq(1L), any(), any(), any(Pageable.class)))
                .thenReturn(mockPage);

        PagedResponse<SensorDataResponse> response = sensorDataService.getHistoricalDataPaged(
                null, 1L, null, null, 0, 10);

        assertNotNull(response);
        assertEquals(0, response.getContent().size());
        assertEquals(0, response.getTotalElements());
    }

    @Test
    @DisplayName("Tổng hợp dữ liệu chuỗi thời gian HOURLY thành công")
    void testGetTimeSeriesData() {
        Long sensorId = 1L;
        when(sensorRepository.findById(sensorId)).thenReturn(Optional.of(sampleSensor));

        LocalDateTime baseTime = LocalDateTime.of(2026, 10, 30, 10, 0, 0);
        SensorData d1 = new SensorData(24.0, "°C", 90.0, "NORMAL", baseTime.minusMinutes(30), sampleSensor);
        SensorData d2 = new SensorData(26.0, "°C", 89.0, "NORMAL", baseTime.minusMinutes(10), sampleSensor);

        when(sensorDataRepository.findBySensorIdAndRecordedAtBetweenOrderByRecordedAtAsc(eq(sensorId), any(), any()))
                .thenReturn(List.of(d1, d2));

        TimeSeriesResponse response = sensorDataService.getTimeSeriesData(sensorId, "HOURLY", null, null);

        assertNotNull(response);
        assertEquals(1, response.getDataPoints().size());
        assertEquals(25.0, response.getDataPoints().get(0).getAvgValue());
        assertEquals(24.0, response.getDataPoints().get(0).getMinValue());
        assertEquals(26.0, response.getDataPoints().get(0).getMaxValue());
    }

    @Test
    @DisplayName("Thống kê tổng quan Dashboard toàn trang trại (LTJ-16)")
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

    @Test
    @DisplayName("Bulk Insert thành công nhiều bản ghi từ UAV/Gateway (F20 - LTJ-21)")
    void testSyncBulkDataSuccess() {
        IoTSimulatorPayload item1 = new IoTSimulatorPayload("DEV-Z1-001", 1L, 1L, 25.0, 60.0, 45.0, 10000.0, "NORMAL", 1793705200L);
        BulkSyncPayload payload = new BulkSyncPayload("SESSION-001", "UAV-01", List.of(item1));

        Sensor tempSensor = new Sensor("DEV-Z1-001-TEMP", "TEMP", SensorType.TEMPERATURE, sampleZone, 11.0, 108.0);
        tempSensor.setId(10L);
        Sensor humSensor = new Sensor("DEV-Z1-001-HUM", "HUM", SensorType.HUMIDITY, sampleZone, 11.0, 108.0);
        humSensor.setId(11L);
        Sensor soilSensor = new Sensor("DEV-Z1-001-SOIL", "SOIL", SensorType.SOIL_MOISTURE, sampleZone, 11.0, 108.0);
        soilSensor.setId(12L);
        Sensor lightSensor = new Sensor("DEV-Z1-001-LIGHT", "LIGHT", SensorType.LIGHT, sampleZone, 11.0, 108.0);
        lightSensor.setId(13L);

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(tempSensor));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-HUM")).thenReturn(Optional.of(humSensor));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-SOIL")).thenReturn(Optional.of(soilSensor));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-LIGHT")).thenReturn(Optional.of(lightSensor));

        when(sensorDataRepository.existsBySensorIdAndRecordedAt(any(), any())).thenReturn(false);

        BulkSyncResponse response = sensorDataService.syncBulkData(payload);

        assertNotNull(response);
        assertEquals("SESSION-001", response.getSyncSessionId());
        assertEquals(1, response.getTotalReceived());
        assertEquals(4, response.getTotalSaved());
        assertEquals(0, response.getTotalDuplicatesSkipped());
        verify(sensorDataRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Bulk Insert đối chiếu mốc thời gian và chặn trùng lặp dữ liệu cũ (F20 - LTJ-21)")
    void testSyncBulkDataDeduplication() {
        IoTSimulatorPayload item1 = new IoTSimulatorPayload("DEV-Z1-001", 1L, 1L, 25.0, 60.0, 45.0, 10000.0, "NORMAL", 1793705200L);
        IoTSimulatorPayload item2 = new IoTSimulatorPayload("DEV-Z1-001", 1L, 1L, 25.0, 60.0, 45.0, 10000.0, "NORMAL", 1793705200L);
        BulkSyncPayload payload = new BulkSyncPayload("SESSION-002", "UAV-01", List.of(item1, item2));

        Sensor tempSensor = new Sensor("DEV-Z1-001-TEMP", "TEMP", SensorType.TEMPERATURE, sampleZone, 11.0, 108.0);
        tempSensor.setId(10L);
        Sensor humSensor = new Sensor("DEV-Z1-001-HUM", "HUM", SensorType.HUMIDITY, sampleZone, 11.0, 108.0);
        humSensor.setId(11L);
        Sensor soilSensor = new Sensor("DEV-Z1-001-SOIL", "SOIL", SensorType.SOIL_MOISTURE, sampleZone, 11.0, 108.0);
        soilSensor.setId(12L);
        Sensor lightSensor = new Sensor("DEV-Z1-001-LIGHT", "LIGHT", SensorType.LIGHT, sampleZone, 11.0, 108.0);
        lightSensor.setId(13L);

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(tempSensor));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-HUM")).thenReturn(Optional.of(humSensor));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-SOIL")).thenReturn(Optional.of(soilSensor));
        when(sensorRepository.findBySensorCode("DEV-Z1-001-LIGHT")).thenReturn(Optional.of(lightSensor));

        when(sensorDataRepository.existsBySensorIdAndRecordedAt(any(), any())).thenReturn(false);

        BulkSyncResponse response = sensorDataService.syncBulkData(payload);

        assertNotNull(response);
        assertEquals(2, response.getTotalReceived());
        assertEquals(4, response.getTotalSaved());
        assertEquals(4, response.getTotalDuplicatesSkipped());
        verify(sensorDataRepository, times(1)).saveAll(anyList());
    }

    @Test
    @DisplayName("Bulk Insert với payload rỗng trả về thông báo hợp lệ (F20 - LTJ-21)")
    void testSyncBulkDataEmpty() {
        BulkSyncResponse response = sensorDataService.syncBulkData(new BulkSyncPayload("SESS-EMPTY", "UAV", Collections.emptyList()));
        assertNotNull(response);
        assertEquals(0, response.getTotalReceived());
        assertEquals(0, response.getTotalSaved());
        assertEquals(0, response.getTotalDuplicatesSkipped());
    }
}
