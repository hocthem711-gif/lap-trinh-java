package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.LatestSensorTelemetryResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.exception.ResourceNotFoundException;
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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
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

    private SensorDataValidator sensorDataValidator;
    private SensorDataServiceImpl sensorDataService;

    private Zone sampleZone;
    private Sensor sampleSensor;

    @BeforeEach
    void setUp() {
        sensorDataValidator = new SensorDataValidator();
        sensorDataService = new SensorDataServiceImpl(
                sensorRepository, sensorDataRepository, zoneRepository, sensorDataValidator);

        Farm sampleFarm = new Farm("Farm Test", "Da Lat", 1000.0, null);
        sampleZone = new Zone("Zone A", "Dau Tay", sampleFarm);
        sampleSensor = new Sensor("DEV-Z1-001-TEMP", "Cam bien nhiet", SensorType.TEMPERATURE, sampleZone, 11.9404, 108.4583);
    }

    @Test
    @DisplayName("Thu nạp số liệu hợp lệ thành công")
    void testIngestDataSuccess() {
        SensorDataIngestRequest request = new SensorDataIngestRequest(
                "DEV-Z1-001-TEMP", 26.5, "°C", 95.0, "NORMAL", LocalDateTime.now()
        );

        when(sensorRepository.findBySensorCode("DEV-Z1-001-TEMP")).thenReturn(Optional.of(sampleSensor));
        when(sensorDataRepository.existsBySensorIdAndRecordedAt(any(), any())).thenReturn(false);
        when(sensorDataRepository.save(any(SensorData.class))).thenAnswer(invocation -> {
            SensorData sd = invocation.getArgument(0);
            sd.setId(100L);
            return sd;
        });

        SensorDataResponse response = sensorDataService.ingestData(request);

        assertNotNull(response);
        assertEquals(26.5, response.getValue());
        assertEquals("°C", response.getUnit());
        assertEquals("DEV-Z1-001-TEMP", response.getSensorCode());
        verify(sensorDataRepository, times(1)).save(any(SensorData.class));
    }

    @Test
    @DisplayName("Thu nạp số liệu thất bại khi sensor không tồn tại")
    void testIngestDataSensorNotFound() {
        SensorDataIngestRequest request = new SensorDataIngestRequest(
                "NON-EXISTENT", 26.5, "°C", 95.0, "NORMAL", LocalDateTime.now()
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
}
