package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.ThresholdRequest;
import com.smartfarm.backend.dto.response.ThresholdResponse;
import com.smartfarm.backend.entity.SensorType;
import com.smartfarm.backend.service.ThresholdService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LTJ-26: Kiểm thử tầng Controller cho ThresholdController (Dev 1)")
class ThresholdControllerTest {

    @Mock
    private ThresholdService thresholdService;

    @InjectMocks
    private ThresholdController controller;

    private ThresholdRequest request;
    private ThresholdResponse mockResponse;

    @BeforeEach
    void setUp() {
        request = new ThresholdRequest();
        request.setZoneId(1L);
        request.setSensorType(SensorType.TEMPERATURE);
        request.setMinValue(18.0);
        request.setMaxValue(32.0);
        request.setCriticalMin(12.0);
        request.setCriticalMax(40.0);
        request.setEnabled(true);

        mockResponse = new ThresholdResponse(1L, SensorType.TEMPERATURE, 18.0, 32.0, 1L, "Khu Vực 1", java.time.LocalDateTime.now(), java.time.LocalDateTime.now());
        mockResponse.setCriticalMin(12.0);
        mockResponse.setCriticalMax(40.0);
        mockResponse.setEnabled(true);
    }

    @Test
    @DisplayName("Tạo cấu hình ngưỡng mới trả về HTTP 201 Created")
    void testCreateThreshold_Success() {
        when(thresholdService.createThreshold(any(ThresholdRequest.class))).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<ThresholdResponse>> response = controller.createThreshold(request);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1L, response.getBody().getData().getId());
        assertEquals(SensorType.TEMPERATURE, response.getBody().getData().getSensorType());
        verify(thresholdService).createThreshold(any(ThresholdRequest.class));
    }

    @Test
    @DisplayName("Lấy danh sách tất cả các ngưỡng trả về HTTP 200 OK")
    void testGetAllThresholds() {
        when(thresholdService.getAllThresholds()).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<ThresholdResponse>>> response = controller.getAllThresholds();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("Lấy chi tiết ngưỡng theo ID trả về HTTP 200 OK")
    void testGetThresholdById() {
        when(thresholdService.getThresholdById(1L)).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<ThresholdResponse>> response = controller.getThresholdById(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(18.0, response.getBody().getData().getMinValue());
    }

    @Test
    @DisplayName("Lấy danh sách ngưỡng theo Zone trả về HTTP 200 OK")
    void testGetThresholdsByZone() {
        when(thresholdService.getThresholdsByZoneId(1L)).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<ThresholdResponse>>> response = controller.getThresholdsByZone(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("Cập nhật ngưỡng thành công trả về HTTP 200 OK")
    void testUpdateThreshold() {
        when(thresholdService.updateThreshold(eq(1L), any(ThresholdRequest.class))).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<ThresholdResponse>> response = controller.updateThreshold(1L, request);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(32.0, response.getBody().getData().getMaxValue());
    }

    @Test
    @DisplayName("Xóa cấu hình ngưỡng thành công trả về HTTP 200 OK")
    void testDeleteThreshold() {
        ResponseEntity<ApiResponse<String>> response = controller.deleteThreshold(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(thresholdService).deleteThreshold(1L);
    }
}
