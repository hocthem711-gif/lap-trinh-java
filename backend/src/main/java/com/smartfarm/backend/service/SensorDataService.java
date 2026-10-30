package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.*;

import java.time.LocalDateTime;
import java.util.List;

public interface SensorDataService {

    /**
     * Thu nạp 1 bản ghi dữ liệu cảm biến đơn lẻ (F04, F19)
     */
    SensorDataResponse ingestData(SensorDataIngestRequest request);

    /**
     * Thu nạp gói tin tổng hợp từ IoT Simulator (Dev 5)
     */
    List<SensorDataResponse> ingestSimulatorPayload(IoTSimulatorPayload payload);

    /**
     * Dữ liệu viễn trắc mới nhất toàn bộ cảm biến cho Leaflet Map (Dev 3 & 4)
     */
    List<LatestSensorTelemetryResponse> getLatestTelemetryAll();

    /**
     * Dữ liệu viễn trắc mới nhất theo Vùng canh tác
     */
    List<LatestSensorTelemetryResponse> getLatestTelemetryByZone(Long zoneId);

    /**
     * Lịch sử dữ liệu cảm biến cơ bản
     */
    List<SensorDataResponse> getHistoricalData(Long sensorId, LocalDateTime start, LocalDateTime end);

    /**
     * Lịch sử dữ liệu phân trang lọc đa tiêu chí (F06 - Tối ưu hiệu năng)
     */
    PagedResponse<SensorDataResponse> getHistoricalDataPaged(Long sensorId, Long zoneId, LocalDateTime start, LocalDateTime end, int page, int size);

    /**
     * Chuỗi thời gian tổng hợp (Time-series Aggregate) cho biểu đồ Chart.js (Dev 3 - LTJ-18)
     */
    TimeSeriesResponse getTimeSeriesData(Long sensorId, String interval, LocalDateTime start, LocalDateTime end);

    /**
     * Thống kê tổng hợp Dashboard toàn trang trại (LTJ-16)
     */
    DashboardSummaryResponse getDashboardSummary();

    /**
     * Thống kê tổng hợp Dashboard theo Vùng canh tác (LTJ-16)
     */
    DashboardSummaryResponse getDashboardSummaryByZone(Long zoneId);
}
