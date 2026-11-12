package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.AlertCreateRequest;
import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.entity.AlertLevel;
import com.smartfarm.backend.entity.AlertStatus;
import com.smartfarm.backend.service.AlertService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LTJ-26: Kiểm thử tầng Controller cho AlertController (Dev 1)")
class AlertControllerTest {

    @Mock
    private AlertService alertService;

    @InjectMocks
    private AlertController controller;

    private AlertCreateRequest request;
    private AlertResponse mockResponse;

    @BeforeEach
    void setUp() {
        request = new AlertCreateRequest();
        request.setZoneId(1L);
        request.setMessage("Nhiệt độ vượt ngưỡng cảnh báo: 38.5°C");
        request.setAlertLevel(AlertLevel.WARNING);

        mockResponse = new AlertResponse(
                1L,
                "Nhiệt độ vượt ngưỡng cảnh báo: 38.5°C",
                AlertLevel.WARNING,
                false,
                AlertStatus.OPEN,
                null,
                null,
                1L,
                "Khu Vực 1",
                10L,
                "Cảm biến nhiệt độ Z1",
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("Tạo cảnh báo mới trả về HTTP 201 Created")
    void testCreateAlert_Success() {
        when(alertService.createAlert(any(AlertCreateRequest.class))).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<AlertResponse>> response = controller.createAlert(request);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1L, response.getBody().getData().getId());
        assertEquals(AlertLevel.WARNING, response.getBody().getData().getAlertLevel());
        verify(alertService).createAlert(any(AlertCreateRequest.class));
    }

    @Test
    @DisplayName("Lấy tất cả cảnh báo trả về HTTP 200 OK")
    void testGetAllAlerts() {
        when(alertService.getAllAlerts()).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<AlertResponse>>> response = controller.getAllAlerts();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("Lấy danh sách cảnh báo theo Zone trả về HTTP 200 OK")
    void testGetAlertsByZone() {
        when(alertService.getAlertsByZoneId(1L)).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<AlertResponse>>> response = controller.getAlertsByZone(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().size());
    }

    @Test
    @DisplayName("Lấy danh sách cảnh báo chưa đọc trả về HTTP 200 OK")
    void testGetUnreadAlerts() {
        when(alertService.getUnreadAlerts()).thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<AlertResponse>>> response = controller.getUnreadAlerts();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertFalse(response.getBody().getData().get(0).getIsRead());
    }

    @Test
    @DisplayName("Đếm số lượng cảnh báo chưa đọc trả về HTTP 200 OK")
    void testCountUnreadAlerts() {
        when(alertService.countUnreadAlerts()).thenReturn(5L);

        ResponseEntity<ApiResponse<Long>> response = controller.countUnreadAlerts();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(5L, response.getBody().getData());
    }

    @Test
    @DisplayName("Đánh dấu cảnh báo đã đọc trả về HTTP 200 OK")
    void testMarkAsRead() {
        mockResponse.setIsRead(true);
        when(alertService.markAsRead(1L)).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<AlertResponse>> response = controller.markAsRead(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getData().getIsRead());
    }

    @Test
    @DisplayName("Xử lý và đóng cảnh báo kèm ghi chú trả về HTTP 200 OK")
    void testResolveAlert() {
        mockResponse.setStatus(AlertStatus.RESOLVED);
        mockResponse.setResolvedNote("Đã bật quạt thông gió làm mát");
        mockResponse.setResolvedAt(LocalDateTime.now());
        when(alertService.resolveAlert(eq(1L), eq("Đã bật quạt thông gió làm mát"))).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<AlertResponse>> response =
                controller.resolveAlert(1L, Map.of("resolvedNote", "Đã bật quạt thông gió làm mát"));

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(AlertStatus.RESOLVED, response.getBody().getData().getStatus());
        assertEquals("Đã bật quạt thông gió làm mát", response.getBody().getData().getResolvedNote());
    }

    @Test
    @DisplayName("Xóa cảnh báo thành công trả về HTTP 200 OK")
    void testDeleteAlert() {
        ResponseEntity<ApiResponse<String>> response = controller.deleteAlert(1L);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(alertService).deleteAlert(1L);
    }
}
