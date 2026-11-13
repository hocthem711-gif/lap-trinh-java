package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.ThresholdRequest;
import com.smartfarm.backend.dto.response.ThresholdResponse;
import com.smartfarm.backend.entity.Farm;
import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.entity.Threshold;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.ThresholdRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.impl.ThresholdServiceImpl;
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
@DisplayName("Unit Tests - ThresholdService (F09)")
class ThresholdServiceTest {

    @Mock
    private ThresholdRepository thresholdRepository;

    @Mock
    private ZoneRepository zoneRepository;

    @InjectMocks
    private ThresholdServiceImpl thresholdService;

    private Zone mockZone;
    private Threshold mockThreshold;

    @BeforeEach
    void setUp() {
        Farm mockFarm = new Farm("Trang Trại Rau Sạch", "Đà Lạt", 5000.0, null);
        mockFarm.setId(1L);

        mockZone = new Zone("Zone A - Nhà Kính", "Rau thủy canh", mockFarm);
        mockZone.setId(10L);

        mockThreshold = new Threshold(SensorType.TEMPERATURE, 18.0, 32.0, mockZone);
        mockThreshold.setId(100L);
    }

    @Test
    @DisplayName("Tạo ngưỡng mới thành công khi dữ liệu hợp lệ")
    void testCreateThreshold_Success() {
        ThresholdRequest request = new ThresholdRequest(10L, SensorType.TEMPERATURE, 18.0, 32.0);

        when(zoneRepository.findById(10L)).thenReturn(Optional.of(mockZone));
        when(thresholdRepository.findByZoneIdAndSensorType(10L, SensorType.TEMPERATURE)).thenReturn(Optional.empty());
        when(thresholdRepository.save(any(Threshold.class))).thenReturn(mockThreshold);

        ThresholdResponse response = thresholdService.createThreshold(request);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals(SensorType.TEMPERATURE, response.getSensorType());
        assertEquals(18.0, response.getMinValue());
        assertEquals(32.0, response.getMaxValue());
        assertEquals(10L, response.getZoneId());
        assertEquals("Zone A - Nhà Kính", response.getZoneName());

        verify(zoneRepository, times(1)).findById(10L);
        verify(thresholdRepository, times(1)).save(any(Threshold.class));
    }

    @Test
    @DisplayName("Tạo ngưỡng thất bại khi Zone không tồn tại")
    void testCreateThreshold_ZoneNotFound() {
        ThresholdRequest request = new ThresholdRequest(999L, SensorType.TEMPERATURE, 18.0, 32.0);
        when(zoneRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> thresholdService.createThreshold(request));
        verify(thresholdRepository, never()).save(any());
    }

    @Test
    @DisplayName("Tạo ngưỡng thất bại khi loại sensor đã được cấu hình trong Zone")
    void testCreateThreshold_DuplicateSensorType() {
        ThresholdRequest request = new ThresholdRequest(10L, SensorType.TEMPERATURE, 15.0, 30.0);

        when(zoneRepository.findById(10L)).thenReturn(Optional.of(mockZone));
        when(thresholdRepository.findByZoneIdAndSensorType(10L, SensorType.TEMPERATURE))
                .thenReturn(Optional.of(mockThreshold));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> thresholdService.createThreshold(request));

        assertTrue(ex.getMessage().contains("đã tồn tại"));
        verify(thresholdRepository, never()).save(any());
    }

    @Test
    @DisplayName("Lấy tất cả ngưỡng trong hệ thống")
    void testGetAllThresholds() {
        when(thresholdRepository.findAll()).thenReturn(List.of(mockThreshold));

        List<ThresholdResponse> list = thresholdService.getAllThresholds();

        assertNotNull(list);
        assertEquals(1, list.size());
        assertEquals(SensorType.TEMPERATURE, list.get(0).getSensorType());
    }

    @Test
    @DisplayName("Lấy chi tiết ngưỡng theo ID thành công")
    void testGetThresholdById_Success() {
        when(thresholdRepository.findById(100L)).thenReturn(Optional.of(mockThreshold));

        ThresholdResponse response = thresholdService.getThresholdById(100L);

        assertNotNull(response);
        assertEquals(100L, response.getId());
        assertEquals(18.0, response.getMinValue());
    }

    @Test
    @DisplayName("Lấy chi tiết ngưỡng theo ID thất bại khi không tìm thấy")
    void testGetThresholdById_NotFound() {
        when(thresholdRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> thresholdService.getThresholdById(999L));
    }

    @Test
    @DisplayName("Lấy danh sách ngưỡng theo Zone ID")
    void testGetThresholdsByZoneId() {
        when(thresholdRepository.findByZoneId(10L)).thenReturn(List.of(mockThreshold));

        List<ThresholdResponse> list = thresholdService.getThresholdsByZoneId(10L);

        assertEquals(1, list.size());
        assertEquals(10L, list.get(0).getZoneId());
    }

    @Test
    @DisplayName("Cập nhật ngưỡng thành công")
    void testUpdateThreshold_Success() {
        ThresholdRequest updateReq = new ThresholdRequest(10L, SensorType.TEMPERATURE, 20.0, 35.0);

        when(thresholdRepository.findById(100L)).thenReturn(Optional.of(mockThreshold));
        when(thresholdRepository.save(any(Threshold.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ThresholdResponse response = thresholdService.updateThreshold(100L, updateReq);

        assertNotNull(response);
        assertEquals(20.0, response.getMinValue());
        assertEquals(35.0, response.getMaxValue());
        verify(thresholdRepository, times(1)).save(mockThreshold);
    }

    @Test
    @DisplayName("Xóa ngưỡng thành công")
    void testDeleteThreshold_Success() {
        when(thresholdRepository.findById(100L)).thenReturn(Optional.of(mockThreshold));
        doNothing().when(thresholdRepository).delete(mockThreshold);

        assertDoesNotThrow(() -> thresholdService.deleteThreshold(100L));
        verify(thresholdRepository, times(1)).delete(mockThreshold);
    }
}
