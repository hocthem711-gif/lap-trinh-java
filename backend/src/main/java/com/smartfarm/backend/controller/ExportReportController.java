package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.SyncLog;
import com.smartfarm.backend.repository.SyncLogRepository;
import com.smartfarm.backend.service.AlertService;
import com.smartfarm.backend.service.ExportService;
import com.smartfarm.backend.service.SensorDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * REST Controller xuất báo cáo Excel (Apache POI) / PDF và cung cấp tập dữ liệu cho Frontend (F11 - LTJ-37).
 */
@RestController
@RequestMapping({"/api/v1/reports", "/reports"})
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Report & Export Management", description = "APIs xuất dữ liệu và báo cáo Excel / PDF (F11 - LTJ-37)")
public class ExportReportController {

    private final ExportService exportService;
    private final SensorDataService sensorDataService;
    private final AlertService alertService;
    private final SyncLogRepository syncLogRepository;

    @GetMapping("/export/excel")
    @Operation(summary = "Tải file Excel (.xlsx) xuất dữ liệu Sensor, Alerts hoặc Tổng hợp Multi-Sheet")
    public ResponseEntity<byte[]> downloadExcelReport(
            @RequestParam(defaultValue = "all") String type,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long sensorId) {

        byte[] excelBytes;
        String fileName;

        if ("sensors".equalsIgnoreCase(type)) {
            List<SensorDataResponse> list = (sensorId != null) ?
                    sensorDataService.getHistoricalData(sensorId, LocalDateTime.now().minusDays(30), LocalDateTime.now()) :
                    sensorDataService.getHistoricalDataPaged(null, zoneId, null, null, 0, 500).getContent();
            excelBytes = exportService.exportSensorDataExcel(list, "DuLieuCamBien");
            fileName = "SmartFarm_SensorData_" + System.currentTimeMillis() + ".xlsx";
        } else if ("alerts".equalsIgnoreCase(type)) {
            List<AlertResponse> alerts = (zoneId != null) ?
                    alertService.getAlertsByZoneId(zoneId) :
                    alertService.getAllAlerts();
            excelBytes = exportService.exportAlertsExcel(alerts, "DanhSachCanhBao");
            fileName = "SmartFarm_AlertReport_" + System.currentTimeMillis() + ".xlsx";
        } else {
            // Multi-sheet workbook tổng hợp
            List<SensorDataResponse> sensors = sensorDataService.getHistoricalDataPaged(null, null, null, null, 0, 500).getContent();
            List<AlertResponse> alerts = alertService.getAllAlerts();
            List<SyncLog> syncs = syncLogRepository.findAllByOrderBySyncTimeDesc();
            excelBytes = exportService.exportMultiSheetWorkbook(sensors, alerts, syncs, "BÁO CÁO TỔNG HỢP TOÀN TRANG TRẠI");
            fileName = "SmartFarm_MultiSheet_Report_" + System.currentTimeMillis() + ".xlsx";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/export/pdf")
    @Operation(summary = "Tải file PDF xuất dữ liệu Sensor hoặc Danh sách Cảnh báo")
    public ResponseEntity<byte[]> downloadPdfReport(
            @RequestParam(defaultValue = "sensors") String type,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long sensorId) {

        byte[] pdfBytes;
        String fileName;

        if ("alerts".equalsIgnoreCase(type)) {
            List<AlertResponse> alerts = (zoneId != null) ?
                    alertService.getAlertsByZoneId(zoneId) :
                    alertService.getAllAlerts();
            pdfBytes = exportService.exportAlertsPdf(alerts, "BÁO CÁO CẢNH BÁO SMART FARM");
            fileName = "SmartFarm_Alerts_" + System.currentTimeMillis() + ".pdf";
        } else {
            List<SensorDataResponse> list = (sensorId != null) ?
                    sensorDataService.getHistoricalData(sensorId, LocalDateTime.now().minusDays(30), LocalDateTime.now()) :
                    sensorDataService.getHistoricalDataPaged(null, zoneId, null, null, 0, 500).getContent();
            pdfBytes = exportService.exportSensorDataPdf(list, "BÁO CÁO VIỄN TRẮC CẢM BIẾN SMART FARM");
            fileName = "SmartFarm_Sensors_" + System.currentTimeMillis() + ".pdf";
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/export/sensors")
    @Operation(summary = "Lấy dữ liệu cảm biến định dạng bảng xuất file hoặc tải file trực tiếp (F11)")
    public ResponseEntity<?> getSensorsForExport(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) Long sensorId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {

        if ("xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format)) {
            List<SensorDataResponse> list = (sensorId != null) ?
                    sensorDataService.getHistoricalData(sensorId, start != null ? start : LocalDateTime.now().minusDays(30), end != null ? end : LocalDateTime.now()) :
                    sensorDataService.getHistoricalDataPaged(null, zoneId, start, end, 0, 500).getContent();
            byte[] excelBytes = exportService.exportSensorDataExcel(list, "DuLieuCamBien");
            String fileName = "SmartFarm_SensorData_" + System.currentTimeMillis() + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        }

        List<Map<String, Object>> rows = exportService.getSensorExportData(zoneId, sensorId, start, end);
        return ResponseEntity.ok(ApiResponse.success("Trích xuất dữ liệu cảm biến thành công", rows));
    }

    @GetMapping("/export/alerts")
    @Operation(summary = "Lấy dữ liệu cảnh báo định dạng bảng xuất file hoặc tải file trực tiếp (F11)")
    public ResponseEntity<?> getAlertsForExport(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) Long zoneId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {

        if ("xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format)) {
            List<AlertResponse> alerts = (zoneId != null) ?
                    alertService.getAlertsByZoneId(zoneId) :
                    alertService.getAllAlerts();
            byte[] excelBytes = exportService.exportAlertsExcel(alerts, "DanhSachCanhBao");
            String fileName = "SmartFarm_AlertReport_" + System.currentTimeMillis() + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        }

        List<Map<String, Object>> rows = exportService.getAlertExportData(zoneId, status, start, end);
        return ResponseEntity.ok(ApiResponse.success("Trích xuất danh sách cảnh báo thành công", rows));
    }

    @GetMapping("/export/uav-sync")
    @Operation(summary = "Lấy dữ liệu lịch sử đồng bộ UAV định dạng bảng xuất file hoặc tải file trực tiếp (F11)")
    public ResponseEntity<?> getUavSyncForExport(
            @RequestParam(required = false) String format) {

        if ("xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format)) {
            List<SyncLog> syncs = syncLogRepository.findAllByOrderBySyncTimeDesc();
            List<Map<String, Object>> rows = exportService.getUavSyncExportData();
            byte[] excelBytes = exportService.exportMissionsExcel(rows, "BÁO CÁO ĐỒNG BỘ NGOẠI TUYẾN UAV");
            String fileName = "SmartFarm_UavSync_" + System.currentTimeMillis() + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        }

        List<Map<String, Object>> rows = exportService.getUavSyncExportData();
        return ResponseEntity.ok(ApiResponse.success("Trích xuất lịch sử đồng bộ UAV thành công", rows));
    }

    @GetMapping("/export/missions")
    @Operation(summary = "Lấy dữ liệu nhiệm vụ và điểm bay UAV hoặc tải file trực tiếp (F11, F17)")
    public ResponseEntity<?> getMissionsForExport(
            @RequestParam(required = false) String format,
            @RequestParam(required = false) String missionId) {

        List<Map<String, Object>> rows = exportService.getMissionExportData(missionId);

        if ("xlsx".equalsIgnoreCase(format) || "excel".equalsIgnoreCase(format)) {
            byte[] excelBytes = exportService.exportMissionsExcel(rows, "BÁO CÁO TIẾN ĐỘ VÀ NGHIỆM THU NHIỆM VỤ BAY");
            String fileName = "SmartFarm_MissionReview_" + System.currentTimeMillis() + ".xlsx";
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(excelBytes);
        }

        return ResponseEntity.ok(ApiResponse.success("Trích xuất dữ liệu nhiệm vụ bay thành công", rows));
    }

    @GetMapping("/export/full-workbook")
    @Operation(summary = "Tải file Multi-Sheet Excel Workbook 5 Sheet toàn diện (F11 - LTJ-37/39)")
    public ResponseEntity<byte[]> getFullWorkbookForExport() {
        List<SensorDataResponse> sensors = sensorDataService.getHistoricalDataPaged(null, null, null, null, 0, 500).getContent();
        List<AlertResponse> alerts = alertService.getAllAlerts();
        List<SyncLog> syncs = syncLogRepository.findAllByOrderBySyncTimeDesc();
        byte[] excelBytes = exportService.exportMultiSheetWorkbook(sensors, alerts, syncs, "BÁO CÁO TỔNG HỢP TOÀN TRANG TRẠI (F11)");
        String fileName = "SmartFarm_FullWorkbook_" + System.currentTimeMillis() + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }
}
