package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.SyncLog;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * Service xuất báo cáo Excel (Apache POI) và PDF (OpenPDF) (F11 - Sprint 8 - LTJ-37).
 * Hỗ trợ xuất dữ liệu quan trắc cảm biến, cảnh báo và đồng bộ UAV.
 */
public interface ExportService {

    /**
     * Xuất danh sách dữ liệu cảm biến ra file Excel (.xlsx) bằng Apache POI
     */
    byte[] exportSensorDataExcel(List<SensorDataResponse> dataList, String title);

    /**
     * Xuất danh sách dữ liệu cảm biến ra file PDF bằng OpenPDF
     */
    byte[] exportSensorDataPdf(List<SensorDataResponse> dataList, String title);

    /**
     * Xuất danh sách cảnh báo (Alerts) ra file Excel (.xlsx) bằng Apache POI
     */
    byte[] exportAlertsExcel(List<AlertResponse> alertList, String title);

    /**
     * Xuất danh sách cảnh báo (Alerts) ra file PDF bằng OpenPDF
     */
    byte[] exportAlertsPdf(List<AlertResponse> alertList, String title);

    /**
     * Xuất báo cáo tổng hợp SmartFarm đa trang tính (Multi-Sheet Excel Workbook)
     * Sheet 1: Tổng quan Farm & Thống kê
     * Sheet 2: Dữ liệu Cảm biến (Sensor Telemetry)
     * Sheet 3: Danh sách Cảnh báo (Alerts)
     * Sheet 4: Lịch sử Đồng bộ UAV (Sync History)
     */
    byte[] exportMultiSheetWorkbook(List<SensorDataResponse> sensorDataList,
                                   List<AlertResponse> alertList,
                                   List<SyncLog> syncList,
                                   String reportTitle);

    /**
     * Lấy dữ liệu cảm biến định dạng bảng chuẩn hóa cho Frontend Export (khớp F11 /api/v1/reports/export/sensors)
     */
    List<Map<String, Object>> getSensorExportData(Long zoneId, Long sensorId, LocalDateTime start, LocalDateTime end);

    /**
     * Lấy dữ liệu cảnh báo định dạng bảng chuẩn hóa cho Frontend Export (khớp F11 /api/v1/reports/export/alerts)
     */
    List<Map<String, Object>> getAlertExportData(Long zoneId, String status, LocalDateTime start, LocalDateTime end);

    /**
     * Lấy dữ liệu đồng bộ UAV định dạng bảng chuẩn hóa cho Frontend Export (khớp F11 /api/v1/reports/export/uav-sync)
     */
    List<Map<String, Object>> getUavSyncExportData();
}
