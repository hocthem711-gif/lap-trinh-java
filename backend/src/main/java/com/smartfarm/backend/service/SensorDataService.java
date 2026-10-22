package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.IoTSimulatorPayload;
import com.smartfarm.backend.dto.request.SensorDataIngestRequest;
import com.smartfarm.backend.dto.response.LatestSensorTelemetryResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;

import java.time.LocalDateTime;
import java.util.List;

public interface SensorDataService {

    /**
     * Thu nạp 1 bản ghi dữ liệu cảm biến đơn lẻ (F04, F19)
     */
    SensorDataResponse ingestData(SensorDataIngestRequest request);

    /**
     * Thu nạp gói tin tổng hợp từ IoT Simulator (Dev 5) chứa nhiều chỉ số môi trường
     */
    List<SensorDataResponse> ingestSimulatorPayload(IoTSimulatorPayload payload);

    /**
     * Lấy dữ liệu viễn trắc (telemetry) mới nhất của tất cả cảm biến kèm tọa độ GPS cho Leaflet Map (Dev 3 & Dev 4)
     */
    List<LatestSensorTelemetryResponse> getLatestTelemetryAll();

    /**
     * Lấy dữ liệu viễn trắc mới nhất theo từng Vùng canh tác (Zone ID)
     */
    List<LatestSensorTelemetryResponse> getLatestTelemetryByZone(Long zoneId);

    /**
     * Lấy lịch sử dữ liệu cảm biến phục vụ vẽ biểu đồ và phân tích
     */
    List<SensorDataResponse> getHistoricalData(Long sensorId, LocalDateTime start, LocalDateTime end);
}
