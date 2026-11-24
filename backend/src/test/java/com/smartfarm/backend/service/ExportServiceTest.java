package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorDataRepository;
import com.smartfarm.backend.repository.SyncLogRepository;
import com.smartfarm.backend.service.impl.ExportServiceImpl;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - ExportService (Apache POI & OpenPDF - LTJ-37 / F11)")
class ExportServiceTest {

    @Mock
    private SensorDataRepository sensorDataRepository;

    @Mock
    private AlertRepository alertRepository;

    @Mock
    private SyncLogRepository syncLogRepository;

    @Mock
    private com.smartfarm.backend.repository.MissionRepository missionRepository;

    @InjectMocks
    private ExportServiceImpl exportService;

    private List<SensorDataResponse> sampleSensorData;
    private List<AlertResponse> sampleAlerts;
    private List<SyncLog> sampleSyncLogs;

    @BeforeEach
    void setUp() {
        sampleSensorData = new ArrayList<>();
        sampleSensorData.add(new SensorDataResponse(
                1L, 10L, "DEV-Z1-001-TEMP", SensorType.TEMPERATURE,
                1L, "Khu Vực A", 26.5, "°C", 95.0, "NORMAL", LocalDateTime.now()
        ));
        sampleSensorData.add(new SensorDataResponse(
                2L, 11L, "DEV-Z1-001-HUM", SensorType.HUMIDITY,
                1L, "Khu Vực A", 65.0, "%", 95.0, "NORMAL", LocalDateTime.now()
        ));

        sampleAlerts = new ArrayList<>();
        sampleAlerts.add(new AlertResponse(
                100L, "Nhiệt độ vượt ngưỡng 35°C", AlertLevel.WARNING, false,
                AlertStatus.OPEN, null, null, 1L, "Khu Vực A", 10L, "Cảm biến nhiệt", LocalDateTime.now()
        ));

        sampleSyncLogs = new ArrayList<>();
        sampleSyncLogs.add(new SyncLog(
                "UAV-ALPHA-01", LocalDateTime.now(), "SUCCESS", "Đồng bộ hoàn tất", "SESSION-001"
        ));
    }

    @Test
    @DisplayName("LTJ-37: Xuất dữ liệu cảm biến ra file Excel (.xlsx) hợp lệ")
    void testExportSensorDataExcel_Success() throws Exception {
        byte[] bytes = exportService.exportSensorDataExcel(sampleSensorData, "Sensor_Telemetry_Test");

        assertNotNull(bytes);
        assertTrue(bytes.length > 0, "Dữ liệu byte Excel không được rỗng");

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = workbook.getSheet("Sensor_Telemetry_Test");
            assertNotNull(sheet, "Sheet Sensor_Telemetry_Test phải tồn tại");
            assertTrue(sheet.getLastRowNum() >= 3, "Phải có ít nhất 2 dòng dữ liệu và header");
        }
    }

    @Test
    @DisplayName("LTJ-37: Xuất danh sách cảnh báo ra file Excel (.xlsx) hợp lệ")
    void testExportAlertsExcel_Success() throws Exception {
        byte[] bytes = exportService.exportAlertsExcel(sampleAlerts, "Alerts_Test");

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            Sheet sheet = workbook.getSheet("Alerts_Test");
            assertNotNull(sheet);
            assertTrue(sheet.getLastRowNum() >= 3);
        }
    }

    @Test
    @DisplayName("LTJ-37: Xuất Multi-Sheet Excel tổng hợp toàn bộ 4 Sheets chuẩn F11")
    void testExportMultiSheetWorkbook_Success() throws Exception {
        byte[] bytes = exportService.exportMultiSheetWorkbook(
                sampleSensorData, sampleAlerts, sampleSyncLogs, "BÁO CÁO TOÀN TRANG TRẠI"
        );

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(bytes))) {
            assertEquals(4, workbook.getNumberOfSheets(), "Workbook phải có đúng 4 sheets");
            assertNotNull(workbook.getSheet("TongQuan_SmartFarm"));
            assertNotNull(workbook.getSheet("DuLieuCamBien_F11"));
            assertNotNull(workbook.getSheet("DanhSachCanhBao_F08"));
            assertNotNull(workbook.getSheet("LichSuSyncUAV_F20"));
        }
    }

    @Test
    @DisplayName("LTJ-37: Xuất dữ liệu cảm biến ra file PDF hợp lệ")
    void testExportSensorDataPdf_Success() {
        byte[] bytes = exportService.exportSensorDataPdf(sampleSensorData, "PDF Sensor Telemetry");

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        // Header PDF chuẩn: %PDF-
        String header = new String(bytes, 0, Math.min(5, bytes.length));
        assertEquals("%PDF-", header);
    }

    @Test
    @DisplayName("LTJ-37: Xuất danh sách cảnh báo ra file PDF hợp lệ")
    void testExportAlertsPdf_Success() {
        byte[] bytes = exportService.exportAlertsPdf(sampleAlerts, "PDF Alert Report");

        assertNotNull(bytes);
        assertTrue(bytes.length > 0);
        String header = new String(bytes, 0, Math.min(5, bytes.length));
        assertEquals("%PDF-", header);
    }

    @Test
    @DisplayName("LTJ-37: Lấy dữ liệu cảm biến chuẩn hóa cho Frontend Report Catalog")
    void testGetSensorExportData_Success() {
        Sensor s = new Sensor("DEV-Z1-001-TEMP", "Cảm biến nhiệt", SensorType.TEMPERATURE, null, 10.84, 106.76);
        SensorData sd = new SensorData(27.0, "°C", 90.0, "NORMAL", LocalDateTime.now(), s);
        when(sensorDataRepository.findAll()).thenReturn(List.of(sd));

        List<Map<String, Object>> rows = exportService.getSensorExportData(null, null, null, null);

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("DEV-Z1-001-TEMP", rows.get(0).get("sourceCode"));
        assertEquals("TEMPERATURE", rows.get(0).get("categoryLabel"));
    }

    @Test
    @DisplayName("LTJ-37: Lấy dữ liệu lịch sử đồng bộ UAV chuẩn hóa cho Frontend Report")
    void testGetUavSyncExportData_Success() {
        SyncLog log = new SyncLog("UAV-ALPHA-01", LocalDateTime.now(), "SUCCESS", "Thành công", "SESSION-123");
        when(syncLogRepository.findAllByOrderBySyncTimeDesc()).thenReturn(List.of(log));

        List<Map<String, Object>> rows = exportService.getUavSyncExportData();

        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("UAV-ALPHA-01", rows.get(0).get("sourceCode"));
    }

    @Test
    @DisplayName("LTJ-37/39: Lấy dữ liệu nhiệm vụ bay chuẩn hóa và xuất Excel")
    void testMissionExport_Success() {
        Mission m = new Mission();
        m.setId(1L);
        m.setName("MSN-TEST-001");
        m.setStatus("COMPLETED");
        m.setProgressPercent(100.0);
        m.setCompletedWaypoints(4);
        m.setTotalWaypoints(4);

        when(missionRepository.findAll()).thenReturn(List.of(m));

        List<Map<String, Object>> rows = exportService.getMissionExportData("ALL");
        assertNotNull(rows);
        assertEquals(1, rows.size());
        assertEquals("MSN-TEST-001", rows.get(0).get("sourceCode"));

        byte[] excelBytes = exportService.exportMissionsExcel(rows, "Test Missions");
        assertNotNull(excelBytes);
        assertTrue(excelBytes.length > 500);
    }
}
