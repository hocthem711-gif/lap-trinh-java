package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.AlertCreateRequest;
import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.impl.AlertServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - AlertService (F08)")
class AlertServiceTest {

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @Mock
    private SensorRepository sensorRepository;

    @InjectMocks
    private AlertServiceImpl alertService;

    private Zone mockZone;
    private Sensor mockSensor;
    private Alert mockAlert;

    @BeforeEach
    void setUp() {
        Farm mockFarm = new Farm("Trang Trại Rau Sạch", "Đà Lạt", 5000.0, null);
        mockFarm.setId(1L);

        mockZone = new Zone("Zone A - Nhà Kính", "Rau thủy canh", mockFarm);
        mockZone.setId(10L);

        mockSensor = new Sensor("DEV-Z1-001-TEMP", "Cảm biến nhiệt độ Zone 1", SensorType.TEMPERATURE, mockZone, 11.9, 108.4);
        mockSensor.setId(50L);

        mockAlert = new Alert("Nhiệt độ vượt ngưỡng cho phép: 38.5°C", AlertLevel.WARNING, mockZone, mockSensor);
        mockAlert.setId(200L);
    }

    @Test
    @DisplayName("Tạo cảnh báo thành công có đầy đủ Zone và Sensor")
    void testCreateAlert_Success_WithZoneAndSensor() {
        AlertCreateRequest request = new AlertCreateRequest(
                "Nhiệt độ vượt ngưỡng cho phép: 38.5°C",
                AlertLevel.WARNING,
                10L,
                50L
        );

        when(zoneRepository.findById(10L)).thenReturn(Optional.of(mockZone));
        when(sensorRepository.findById(50L)).thenReturn(Optional.of(mockSensor));
        when(alertRepository.save(any(Alert.class))).thenReturn(mockAlert);

        AlertResponse response = alertService.createAlert(request);

        assertNotNull(response);
        assertEquals(200L, response.getId());
        assertEquals("Nhiệt độ vượt ngưỡng cho phép: 38.5°C", response.getMessage());
        assertEquals(AlertLevel.WARNING, response.getAlertLevel());
        assertFalse(response.getIsRead());
        assertEquals(10L, response.getZoneId());
        assertEquals("Zone A - Nhà Kính", response.getZoneName());
        assertEquals(50L, response.getSensorId());
        assertEquals("Cảm biến nhiệt độ Zone 1", response.getSensorName());

        verify(zoneRepository, times(1)).findById(10L);
        verify(sensorRepository, times(1)).findById(50L);
        verify(alertRepository, times(1)).save(any(Alert.class));
    }

    @Test
    @DisplayName("Tạo cảnh báo thành công không có sensorId (cảnh báo cấp Zone)")
    void testCreateAlert_Success_WithoutSensor() {
        AlertCreateRequest request = new AlertCreateRequest(
                "Mất kết nối toàn bộ Gateway Zone A",
                AlertLevel.CRITICAL,
                10L,
                null
        );

        Alert zoneLevelAlert = new Alert("Mất kết nối toàn bộ Gateway Zone A", AlertLevel.CRITICAL, mockZone, null);
        zoneLevelAlert.setId(201L);

        when(zoneRepository.findById(10L)).thenReturn(Optional.of(mockZone));
        when(alertRepository.save(any(Alert.class))).thenReturn(zoneLevelAlert);

        AlertResponse response = alertService.createAlert(request);

        assertNotNull(response);
        assertEquals(201L, response.getId());
        assertEquals(AlertLevel.CRITICAL, response.getAlertLevel());
        assertNull(response.getSensorId());
        verify(sensorRepository, never()).findById(any());
        verify(alertRepository, times(1)).save(any(Alert.class));
    }

    @Test
    @DisplayName("Tạo cảnh báo thất bại khi Zone không tồn tại")
    void testCreateAlert_ZoneNotFound() {
        AlertCreateRequest request = new AlertCreateRequest("Lỗi", AlertLevel.INFO, 999L, null);
        when(zoneRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> alertService.createAlert(request));
        verify(alertRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lấy danh sách tất cả cảnh báo")
    void testGetAllAlerts() {
        when(alertRepository.findAll()).thenReturn(List.of(mockAlert));

        List<AlertResponse> list = alertService.getAllAlerts();

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals("Nhiệt độ vượt ngưỡng cho phép: 38.5°C", list.get(0).getMessage());
    }

    @Test
    @DisplayName("Lấy danh sách cảnh báo theo Zone")
    void testGetAlertsByZoneId() {
        when(alertRepository.findByZoneIdOrderByCreatedAtDesc(10L)).thenReturn(List.of(mockAlert));

        List<AlertResponse> list = alertService.getAlertsByZoneId(10L);

        assertEquals(1, list.size());
        assertEquals(10L, list.get(0).getZoneId());
    }

    @Test
    @DisplayName("Lấy danh sách cảnh báo chưa đọc")
    void testGetUnreadAlerts() {
        when(alertRepository.findByIsReadFalse()).thenReturn(List.of(mockAlert));

        List<AlertResponse> list = alertService.getUnreadAlerts();

        assertEquals(1, list.size());
        assertFalse(list.get(0).getIsRead());
    }

    @Test
    @DisplayName("Đếm số lượng cảnh báo chưa đọc")
    void testCountUnreadAlerts() {
        when(alertRepository.countByIsReadFalse()).thenReturn(5L);

        long count = alertService.countUnreadAlerts();

        assertEquals(5L, count);
        verify(alertRepository, times(1)).countByIsReadFalse();
    }

    @Test
    @DisplayName("Đánh dấu cảnh báo đã đọc thành công")
    void testMarkAsRead_Success() {
        when(alertRepository.findById(200L)).thenReturn(Optional.of(mockAlert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertResponse response = alertService.markAsRead(200L);

        assertNotNull(response);
        assertTrue(response.getIsRead());
        verify(alertRepository, times(1)).save(mockAlert);
    }

    @Test
    @DisplayName("Xử lý đóng cảnh báo thành công (resolve)")
    void testResolveAlert_Success() {
        when(alertRepository.findById(200L)).thenReturn(Optional.of(mockAlert));
        when(alertRepository.save(any(Alert.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AlertResponse response = alertService.resolveAlert(200L, "Đã bật quạt thông gió làm mát");

        assertNotNull(response);
        assertTrue(response.getIsRead());
        verify(alertRepository, times(1)).save(mockAlert);
    }

    @Test
    @DisplayName("Xóa cảnh báo thành công")
    void testDeleteAlert_Success() {
        when(alertRepository.findById(200L)).thenReturn(Optional.of(mockAlert));
        doNothing().when(alertRepository).delete(mockAlert);

        assertDoesNotThrow(() -> alertService.deleteAlert(200L));
        verify(alertRepository, times(1)).delete(mockAlert);
    }
}
