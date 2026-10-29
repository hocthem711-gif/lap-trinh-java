package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.BulkSyncPayload;
import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.BulkSyncResponse;
import com.smartfarm.backend.dto.response.DashboardSummaryResponse;
import com.smartfarm.backend.dto.response.PagedResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.dto.response.TimeSeriesResponse;
import com.smartfarm.backend.service.SensorDataService;
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
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("LTJ-11: Kiểm thử tầng Controller cho SensorDataController (Dev 1)")
class SensorDataControllerTest {

    @Mock
    private SensorDataService sensorDataService;

    @InjectMocks
    private SensorDataController controller;

    private SensorDataIngestRequest ingestRequest;
    private SensorDataResponse mockResponse;

    @BeforeEach
    void setUp() {
        ingestRequest = new SensorDataIngestRequest();
        ingestRequest.setSensorCode("TEMP-Z1-01");
        ingestRequest.setValue(26.5);
        ingestRequest.setBatteryLevel(95.0);
        ingestRequest.setRecordedAt(LocalDateTime.now());

        mockResponse = new SensorDataResponse();
        mockResponse.setId(100L);
        mockResponse.setSensorCode("TEMP-Z1-01");
        mockResponse.setValue(26.5);
        mockResponse.setStatus("NORMAL");
    }

    @Test
    @DisplayName("Nạp dữ liệu cảm biến đơn lẻ trả về HTTP 201 Created")
    void testIngestReading_Success() {
        when(sensorDataService.ingestData(any(SensorDataIngestRequest.class))).thenReturn(mockResponse);

        ResponseEntity<ApiResponse<SensorDataResponse>> response = controller.ingestReading(ingestRequest);

        assertNotNull(response);
        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(200, response.getBody().getStatus());
        assertEquals("TEMP-Z1-01", response.getBody().getData().getSensorCode());
        verify(sensorDataService).ingestData(any(SensorDataIngestRequest.class));
    }

    @Test
    @DisplayName("Nạp gói tin từ IoT Simulator trả về HTTP 201 và danh sách viễn trắc")
    void testIngestSimulatorPayload() {
        IoTSimulatorPayload payload = new IoTSimulatorPayload();
        payload.setDeviceId("DEV-SIM-01");
        when(sensorDataService.ingestSimulatorPayload(any(IoTSimulatorPayload.class)))
                .thenReturn(List.of(mockResponse));

        ResponseEntity<ApiResponse<List<SensorDataResponse>>> response = controller.ingestSimulatorPayload(payload);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(1, response.getBody().getData().size());
        verify(sensorDataService).ingestSimulatorPayload(any(IoTSimulatorPayload.class));
    }

    @Test
    @DisplayName("Đồng bộ dữ liệu Bulk Sync từ UAV/Gateway trả về HTTP 201")
    void testSyncBulkData() {
        BulkSyncPayload payload = new BulkSyncPayload();
        payload.setSyncSessionId("SYNC-TEST-01");
        BulkSyncResponse syncResponse = new BulkSyncResponse();
        syncResponse.setSyncSessionId("SYNC-TEST-01");
        syncResponse.setTotalReceived(10);

        when(sensorDataService.syncBulkData(any(BulkSyncPayload.class))).thenReturn(syncResponse);

        ResponseEntity<ApiResponse<BulkSyncResponse>> response = controller.syncBulkData(payload);

        assertEquals(HttpStatus.CREATED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("SYNC-TEST-01", response.getBody().getData().getSyncSessionId());
    }

    @Test
    @DisplayName("Lấy viễn trắc mới nhất trả về HTTP 200 OK")
    void testGetLatestTelemetryAll() {
        when(sensorDataService.getLatestTelemetryAll()).thenReturn(Collections.emptyList());

        var response = controller.getLatestTelemetryAll();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getData().isEmpty());
    }

    @Test
    @DisplayName("LTJ-16: Lấy chuỗi thời gian HOURLY thành công trả về HTTP 200")
    void testGetTimeSeriesData_Hourly_Success() {
        TimeSeriesResponse mockTs = new TimeSeriesResponse();
        mockTs.setSensorId(1L);
        mockTs.setInterval("HOURLY");
        when(sensorDataService.getTimeSeriesData(1L, "HOURLY", null, null)).thenReturn(mockTs);

        ResponseEntity<ApiResponse<TimeSeriesResponse>> response = controller.getTimeSeriesData(1L, "HOURLY", null, null);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("HOURLY", response.getBody().getData().getInterval());
    }

    @Test
    @DisplayName("LTJ-16: Lấy chuỗi thời gian với interval không hợp lệ ném IllegalArgumentException")
    void testGetTimeSeriesData_InvalidInterval_ThrowsException() {
        assertThrows(IllegalArgumentException.class, () ->
                controller.getTimeSeriesData(1L, "YEARLY", null, null));
    }

    @Test
    @DisplayName("LTJ-16: Lấy chuỗi thời gian với start > end ném IllegalArgumentException")
    void testGetTimeSeriesData_InvalidDateRange_ThrowsException() {
        LocalDateTime now = LocalDateTime.now();
        assertThrows(IllegalArgumentException.class, () ->
                controller.getTimeSeriesData(1L, "HOURLY", now.plusDays(1), now));
    }

    @Test
    @DisplayName("LTJ-16: Phân trang lịch sử với size > 100 tự động giới hạn ở 100")
    void testGetHistoricalDataPaged_CappedSize() {
        PagedResponse<SensorDataResponse> mockPaged = new PagedResponse<>(Collections.emptyList(), 0, 100, 0L, 0, true);
        when(sensorDataService.getHistoricalDataPaged(1L, null, null, null, 0, 100)).thenReturn(mockPaged);

        ResponseEntity<ApiResponse<PagedResponse<SensorDataResponse>>> response =
                controller.getHistoricalDataPaged(1L, null, null, null, 0, 500);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        verify(sensorDataService).getHistoricalDataPaged(1L, null, null, null, 0, 100);
    }

    @Test
    @DisplayName("LTJ-16: Lấy Dashboard summary trả về HTTP 200")
    void testGetDashboardSummary() {
        DashboardSummaryResponse mockSummary = new DashboardSummaryResponse();
        when(sensorDataService.getDashboardSummary()).thenReturn(mockSummary);

        ResponseEntity<ApiResponse<DashboardSummaryResponse>> response = controller.getDashboardSummary();

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
    }
}
