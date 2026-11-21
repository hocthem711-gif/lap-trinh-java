package com.smartfarm.backend.service.impl;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.smartfarm.backend.dto.response.AlertResponse;
import com.smartfarm.backend.dto.response.SensorDataResponse;
import com.smartfarm.backend.entity.Alert;
import com.smartfarm.backend.entity.AlertLevel;
import com.smartfarm.backend.entity.AlertStatus;
import com.smartfarm.backend.entity.SensorData;
import com.smartfarm.backend.entity.SyncLog;
import com.smartfarm.backend.repository.AlertRepository;
import com.smartfarm.backend.repository.SensorDataRepository;
import com.smartfarm.backend.repository.SyncLogRepository;
import com.smartfarm.backend.service.ExportService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExportServiceImpl implements ExportService {

    private final SensorDataRepository sensorDataRepository;
    private final AlertRepository alertRepository;
    private final SyncLogRepository syncLogRepository;

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Override
    public byte[] exportSensorDataExcel(List<SensorDataResponse> dataList, String title) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(title != null ? title : "Sensor_Data");

            CellStyle headerStyle = createHeaderStyle(workbook, IndexedColors.DARK_BLUE);
            CellStyle dataStyle = createDataStyle(workbook);
            CellStyle numStyle = createNumberStyle(workbook);

            createTitleRow(sheet, workbook, title != null ? title : "BÁO CÁO DỮ LIỆU CẢM BIẾN SMART FARM", 6);

            Row header = sheet.createRow(2);
            String[] headers = {"Mã Bản Ghi", "Thời Gian Đo", "Khu Vực (Zone)", "Mã Cảm Biến", "Loại Chỉ Số", "Giá Trị Đo", "Đơn Vị", "Mức Pin", "Trạng Thái"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 3;
            if (dataList != null) {
                for (SensorDataResponse d : dataList) {
                    Row r = sheet.createRow(rowIdx++);
                    r.createCell(0).setCellValue(d.getId() != null ? d.getId() : rowIdx);
                    r.createCell(1).setCellValue(d.getRecordedAt() != null ? d.getRecordedAt().format(DATE_TIME_FORMATTER) : "");
                    r.createCell(2).setCellValue(d.getZoneName() != null ? d.getZoneName() : "Khu vực");
                    r.createCell(3).setCellValue(d.getSensorCode() != null ? d.getSensorCode() : "");
                    r.createCell(4).setCellValue(d.getSensorType() != null ? d.getSensorType().name() : "");

                    Cell cVal = r.createCell(5);
                    if (d.getValue() != null) {
                        cVal.setCellValue(d.getValue());
                        cVal.setCellStyle(numStyle);
                    } else {
                        cVal.setCellValue(0.0);
                    }

                    r.createCell(6).setCellValue(d.getUnit() != null ? d.getUnit() : "");
                    r.createCell(7).setCellValue(d.getBatteryLevel() != null ? d.getBatteryLevel() + "%" : "100%");
                    r.createCell(8).setCellValue(d.getStatus() != null ? d.getStatus() : "NORMAL");

                    for (int c = 0; c < headers.length; c++) {
                        if (c != 5) r.getCell(c).setCellStyle(dataStyle);
                    }
                }
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT] Lỗi xuất Excel Sensor Data: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi xuất file Excel Sensor Data: " + e.getMessage());
        }
    }

    @Override
    public byte[] exportSensorDataPdf(List<SensorDataResponse> dataList, String title) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 20, 20, 25, 25);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.DARK_GRAY);
            Paragraph pTitle = new Paragraph(title != null ? title : "SMART FARM - SENSOR TELEMETRY REPORT", titleFont);
            pTitle.setAlignment(Element.ALIGN_CENTER);
            pTitle.setSpacingAfter(15);
            document.add(pTitle);

            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.2f, 2.2f, 2.2f, 2.0f, 1.8f, 1.5f, 1.2f, 1.5f});

            com.lowagie.text.Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            String[] headers = {"ID", "Time", "Zone", "Sensor", "Type", "Value", "Unit", "Status"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(30, 64, 175));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            com.lowagie.text.Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            if (dataList != null) {
                for (SensorDataResponse d : dataList) {
                    table.addCell(createPdfCell(String.valueOf(d.getId()), dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(d.getRecordedAt() != null ? d.getRecordedAt().format(DATE_TIME_FORMATTER) : "", dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(d.getZoneName() != null ? d.getZoneName() : "", dataFont, Element.ALIGN_LEFT));
                    table.addCell(createPdfCell(d.getSensorCode() != null ? d.getSensorCode() : "", dataFont, Element.ALIGN_LEFT));
                    table.addCell(createPdfCell(d.getSensorType() != null ? d.getSensorType().name() : "", dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(d.getValue() != null ? String.valueOf(d.getValue()) : "0", dataFont, Element.ALIGN_RIGHT));
                    table.addCell(createPdfCell(d.getUnit() != null ? d.getUnit() : "", dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(d.getStatus() != null ? d.getStatus() : "NORMAL", dataFont, Element.ALIGN_CENTER));
                }
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT] Lỗi xuất PDF Sensor Data: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi xuất file PDF Sensor Data: " + e.getMessage());
        }
    }

    @Override
    public byte[] exportAlertsExcel(List<AlertResponse> alertList, String title) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(title != null ? title : "Alert_Report");

            CellStyle headerStyle = createHeaderStyle(workbook, IndexedColors.RED);
            CellStyle dataStyle = createDataStyle(workbook);

            createTitleRow(sheet, workbook, title != null ? title : "BÁO CÁO CẢNH BÁO HỆ THỐNG SMART FARM (F08/F11)", 6);

            Row header = sheet.createRow(2);
            String[] headers = {"Mã Alert", "Thời Điểm Phát Sinh", "Khu Vực (Zone)", "Cảm Biến / Node", "Mức Độ (Level)", "Nội Dung Cảnh Báo", "Trạng Thái", "Biên Bản Xử Lý", "Thời Gian Xử Lý"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 3;
            if (alertList != null) {
                for (AlertResponse a : alertList) {
                    Row r = sheet.createRow(rowIdx++);
                    r.createCell(0).setCellValue(a.getId() != null ? a.getId() : rowIdx);
                    r.createCell(1).setCellValue(a.getCreatedAt() != null ? a.getCreatedAt().format(DATE_TIME_FORMATTER) : "");
                    r.createCell(2).setCellValue(a.getZoneName() != null ? a.getZoneName() : "Toàn trang trại");
                    r.createCell(3).setCellValue(a.getSensorName() != null ? a.getSensorName() : "");
                    r.createCell(4).setCellValue(a.getAlertLevel() != null ? a.getAlertLevel().name() : "WARNING");
                    r.createCell(5).setCellValue(a.getMessage() != null ? a.getMessage() : "");
                    r.createCell(6).setCellValue(a.getStatus() != null ? a.getStatus().name() : "OPEN");
                    r.createCell(7).setCellValue(a.getResolvedNote() != null ? a.getResolvedNote() : "Chưa xử lý");
                    r.createCell(8).setCellValue(a.getResolvedAt() != null ? a.getResolvedAt().format(DATE_TIME_FORMATTER) : "-");

                    for (int c = 0; c < headers.length; c++) {
                        r.getCell(c).setCellStyle(dataStyle);
                    }
                }
            }

            autoSizeColumns(sheet, headers.length);
            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT] Lỗi xuất Excel Alerts: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi xuất file Excel Alerts: " + e.getMessage());
        }
    }

    @Override
    public byte[] exportAlertsPdf(List<AlertResponse> alertList, String title) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4.rotate(), 20, 20, 25, 25);
            PdfWriter.getInstance(document, out);
            document.open();

            com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, Color.RED);
            Paragraph pTitle = new Paragraph(title != null ? title : "SMART FARM - ALERT REPORT (F08/F11)", titleFont);
            pTitle.setAlignment(Element.ALIGN_CENTER);
            pTitle.setSpacingAfter(15);
            document.add(pTitle);

            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.0f, 2.0f, 2.0f, 1.5f, 3.5f, 1.5f, 2.5f});

            com.lowagie.text.Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
            String[] headers = {"ID", "Created At", "Zone", "Level", "Message", "Status", "Resolution"};
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setBackgroundColor(new Color(185, 28, 28));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            com.lowagie.text.Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 9, Color.BLACK);
            if (alertList != null) {
                for (AlertResponse a : alertList) {
                    table.addCell(createPdfCell(String.valueOf(a.getId()), dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(a.getCreatedAt() != null ? a.getCreatedAt().format(DATE_TIME_FORMATTER) : "", dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(a.getZoneName() != null ? a.getZoneName() : "", dataFont, Element.ALIGN_LEFT));
                    table.addCell(createPdfCell(a.getAlertLevel() != null ? a.getAlertLevel().name() : "", dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(a.getMessage() != null ? a.getMessage() : "", dataFont, Element.ALIGN_LEFT));
                    table.addCell(createPdfCell(a.getStatus() != null ? a.getStatus().name() : "", dataFont, Element.ALIGN_CENTER));
                    table.addCell(createPdfCell(a.getResolvedNote() != null ? a.getResolvedNote() : "-", dataFont, Element.ALIGN_LEFT));
                }
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT] Lỗi xuất PDF Alerts: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi xuất file PDF Alerts: " + e.getMessage());
        }
    }

    @Override
    public byte[] exportMultiSheetWorkbook(List<SensorDataResponse> sensorDataList,
                                           List<AlertResponse> alertList,
                                           List<SyncLog> syncList,
                                           String reportTitle) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet s1 = workbook.createSheet("TongQuan_SmartFarm");
            createTitleRow(s1, workbook, reportTitle != null ? reportTitle : "BÁO CÁO TỔNG HỢP TOÀN TRANG TRẠI (F11)", 4);
            createOverviewSheet(s1, workbook, sensorDataList, alertList, syncList);

            Sheet s2 = workbook.createSheet("DuLieuCamBien_F11");
            populateSensorDataSheet(s2, workbook, sensorDataList);

            Sheet s3 = workbook.createSheet("DanhSachCanhBao_F08");
            populateAlertSheet(s3, workbook, alertList);

            Sheet s4 = workbook.createSheet("LichSuSyncUAV_F20");
            populateSyncLogSheet(s4, workbook, syncList);

            workbook.write(out);
            return out.toByteArray();
        } catch (Exception e) {
            log.error("[EXPORT] Lỗi xuất Multi-Sheet Workbook: {}", e.getMessage(), e);
            throw new RuntimeException("Lỗi khi xuất Multi-Sheet Excel: " + e.getMessage());
        }
    }

    private void createOverviewSheet(Sheet sheet, Workbook workbook,
                                    List<SensorDataResponse> sensors,
                                    List<AlertResponse> alerts,
                                    List<SyncLog> syncs) {
        CellStyle titleStyle = createHeaderStyle(workbook, IndexedColors.ROYAL_BLUE);
        CellStyle labelStyle = createDataStyle(workbook);
        org.apache.poi.ss.usermodel.Font boldFont = workbook.createFont();
        boldFont.setBold(true);
        labelStyle.setFont(boldFont);

        int rowIdx = 2;
        Row rHeader = sheet.createRow(rowIdx++);
        rHeader.createCell(0).setCellValue("Hạng Mục Thống Kê");
        rHeader.createCell(1).setCellValue("Số Lượng / Trạng Thái");
        rHeader.getCell(0).setCellStyle(titleStyle);
        rHeader.getCell(1).setCellStyle(titleStyle);

        Row r1 = sheet.createRow(rowIdx++);
        r1.createCell(0).setCellValue("Tổng số bản ghi viễn trắc cảm biến");
        r1.createCell(1).setCellValue(sensors != null ? sensors.size() : 0);

        Row r2 = sheet.createRow(rowIdx++);
        r2.createCell(0).setCellValue("Tổng số cảnh báo đã ghi nhận");
        r2.createCell(1).setCellValue(alerts != null ? alerts.size() : 0);

        long openAlerts = alerts != null ? alerts.stream().filter(a -> a.getStatus() == AlertStatus.OPEN).count() : 0;
        Row r3 = sheet.createRow(rowIdx++);
        r3.createCell(0).setCellValue("Cảnh báo chưa xử lý (OPEN)");
        r3.createCell(1).setCellValue(openAlerts);

        Row r4 = sheet.createRow(rowIdx++);
        r4.createCell(0).setCellValue("Tổng số phiên đồng bộ ngoại tuyến UAV");
        r4.createCell(1).setCellValue(syncs != null ? syncs.size() : 0);

        Row r5 = sheet.createRow(rowIdx++);
        r5.createCell(0).setCellValue("Thời điểm xuất báo cáo");
        r5.createCell(1).setCellValue(LocalDateTime.now().format(DATE_TIME_FORMATTER));

        Row r6 = sheet.createRow(rowIdx++);
        r6.createCell(0).setCellValue("Hệ thống phát triển");
        r6.createCell(1).setCellValue("Smart Farm IoT Platform - Dev 2 (Đào Thiện Hiếu)");

        autoSizeColumns(sheet, 2);
    }

    private void populateSensorDataSheet(Sheet sheet, Workbook workbook, List<SensorDataResponse> dataList) {
        CellStyle headerStyle = createHeaderStyle(workbook, IndexedColors.TEAL);
        CellStyle dataStyle = createDataStyle(workbook);
        Row header = sheet.createRow(0);
        String[] headers = {"Mã Bản Ghi", "Thời Gian", "Phân Khu", "Mã Cảm Biến", "Loại Chỉ Số", "Giá Trị", "Đơn Vị", "Trạng Thái"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int rowIdx = 1;
        if (dataList != null) {
            for (SensorDataResponse d : dataList) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(d.getId() != null ? d.getId() : rowIdx);
                r.createCell(1).setCellValue(d.getRecordedAt() != null ? d.getRecordedAt().format(DATE_TIME_FORMATTER) : "");
                r.createCell(2).setCellValue(d.getZoneName() != null ? d.getZoneName() : "");
                r.createCell(3).setCellValue(d.getSensorCode() != null ? d.getSensorCode() : "");
                r.createCell(4).setCellValue(d.getSensorType() != null ? d.getSensorType().name() : "");
                r.createCell(5).setCellValue(d.getValue() != null ? d.getValue() : 0.0);
                r.createCell(6).setCellValue(d.getUnit() != null ? d.getUnit() : "");
                r.createCell(7).setCellValue(d.getStatus() != null ? d.getStatus() : "NORMAL");

                for (int c = 0; c < headers.length; c++) r.getCell(c).setCellStyle(dataStyle);
            }
        }
        autoSizeColumns(sheet, headers.length);
    }

    private void populateAlertSheet(Sheet sheet, Workbook workbook, List<AlertResponse> alertList) {
        CellStyle headerStyle = createHeaderStyle(workbook, IndexedColors.CORAL);
        CellStyle dataStyle = createDataStyle(workbook);
        Row header = sheet.createRow(0);
        String[] headers = {"Mã Alert", "Thời Gian", "Khu Vực", "Thiết Bị", "Mức Độ", "Nội Dung", "Trạng Thái", "Biên Bản Xử Lý"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int rowIdx = 1;
        if (alertList != null) {
            for (AlertResponse a : alertList) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(a.getId() != null ? a.getId() : rowIdx);
                r.createCell(1).setCellValue(a.getCreatedAt() != null ? a.getCreatedAt().format(DATE_TIME_FORMATTER) : "");
                r.createCell(2).setCellValue(a.getZoneName() != null ? a.getZoneName() : "");
                r.createCell(3).setCellValue(a.getSensorName() != null ? a.getSensorName() : "");
                r.createCell(4).setCellValue(a.getAlertLevel() != null ? a.getAlertLevel().name() : "");
                r.createCell(5).setCellValue(a.getMessage() != null ? a.getMessage() : "");
                r.createCell(6).setCellValue(a.getStatus() != null ? a.getStatus().name() : "");
                r.createCell(7).setCellValue(a.getResolvedNote() != null ? a.getResolvedNote() : "-");

                for (int c = 0; c < headers.length; c++) r.getCell(c).setCellStyle(dataStyle);
            }
        }
        autoSizeColumns(sheet, headers.length);
    }

    private void populateSyncLogSheet(Sheet sheet, Workbook workbook, List<SyncLog> syncList) {
        CellStyle headerStyle = createHeaderStyle(workbook, IndexedColors.VIOLET);
        CellStyle dataStyle = createDataStyle(workbook);
        Row header = sheet.createRow(0);
        String[] headers = {"Mã Bản Ghi", "Thời Gian Đồng Bộ", "Mã UAV", "Session ID", "Trạng Thái", "Thông Điệp Đồng Bộ"};
        for (int i = 0; i < headers.length; i++) {
            Cell c = header.createCell(i);
            c.setCellValue(headers[i]);
            c.setCellStyle(headerStyle);
        }

        int rowIdx = 1;
        if (syncList != null) {
            for (SyncLog s : syncList) {
                Row r = sheet.createRow(rowIdx++);
                r.createCell(0).setCellValue(s.getId() != null ? s.getId() : rowIdx);
                r.createCell(1).setCellValue(s.getSyncTime() != null ? s.getSyncTime().format(DATE_TIME_FORMATTER) : "");
                r.createCell(2).setCellValue(s.getUavCode() != null ? s.getUavCode() : "");
                r.createCell(3).setCellValue(s.getSessionId() != null ? s.getSessionId() : s.getSyncSessionId());
                r.createCell(4).setCellValue(s.getStatus() != null ? s.getStatus() : "");
                r.createCell(5).setCellValue(s.getMessage() != null ? s.getMessage() : "");

                for (int c = 0; c < headers.length; c++) r.getCell(c).setCellStyle(dataStyle);
            }
        }
        autoSizeColumns(sheet, headers.length);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getSensorExportData(Long zoneId, Long sensorId, LocalDateTime start, LocalDateTime end) {
        List<SensorData> list;
        if (sensorId != null) {
            list = sensorDataRepository.findBySensorIdAndRecordedAtBetween(
                    sensorId,
                    start != null ? start : LocalDateTime.now().minusDays(30),
                    end != null ? end : LocalDateTime.now()
            );
        } else if (zoneId != null) {
            list = sensorDataRepository.findBySensorZoneIdOrderByRecordedAtDesc(zoneId);
        } else {
            list = sensorDataRepository.findAll();
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (SensorData d : list) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", d.getId());
            map.put("timestamp", d.getRecordedAt() != null ? d.getRecordedAt().toString() : "");
            map.put("zoneName", d.getSensor() != null && d.getSensor().getZone() != null ? d.getSensor().getZone().getName() : "Khu vực");
            map.put("sourceCode", d.getSensor() != null ? d.getSensor().getSensorCode() : "");
            map.put("categoryLabel", d.getSensor() != null && d.getSensor().getSensorType() != null ? d.getSensor().getSensorType().name() : "");
            map.put("primaryMetric", d.getValue() + " " + (d.getUnit() != null ? d.getUnit() : ""));
            map.put("secondaryMetric", "Chuẩn SmartFarm");
            map.put("statusLabel", d.getStatus() != null ? d.getStatus() : "NORMAL");
            map.put("gpsCoordinates", (d.getSensor() != null && d.getSensor().getLatitude() != null) ?
                    d.getSensor().getLatitude() + ", " + d.getSensor().getLongitude() : "10.8450, 106.7650");
            map.put("operatorOrNote", "Dữ liệu quan trắc tự động");
            rows.add(map);
        }
        return rows;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getAlertExportData(Long zoneId, String status, LocalDateTime start, LocalDateTime end) {
        List<Alert> alerts;
        if (zoneId != null) {
            alerts = alertRepository.findByZoneIdOrderByCreatedAtDesc(zoneId);
        } else {
            alerts = alertRepository.findAll();
        }

        List<Map<String, Object>> rows = new ArrayList<>();
        for (Alert a : alerts) {
            if (status != null && !status.isBlank() && !a.getStatus().name().equalsIgnoreCase(status)) {
                continue;
            }
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", a.getId());
            map.put("timestamp", a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
            map.put("zoneName", a.getZone() != null ? a.getZone().getName() : "Toàn trang trại");
            map.put("sourceCode", a.getSensor() != null ? a.getSensor().getSensorCode() : "SYSTEM");
            map.put("categoryLabel", a.getAlertLevel() != null ? a.getAlertLevel().name() : "WARNING");
            map.put("primaryMetric", a.getMessage());
            map.put("secondaryMetric", a.getAlertLevel() == AlertLevel.CRITICAL ? "Vượt 20% ngưỡng" : "Vượt ngưỡng chuẩn");
            map.put("statusLabel", a.getStatus() != null ? a.getStatus().name() : "OPEN");
            map.put("operatorOrNote", a.getResolvedNote() != null ? a.getResolvedNote() : "Chờ kỹ thuật viên kiểm tra");
            rows.add(map);
        }
        return rows;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUavSyncExportData() {
        List<SyncLog> syncList = syncLogRepository.findAllByOrderBySyncTimeDesc();
        List<Map<String, Object>> rows = new ArrayList<>();
        for (SyncLog s : syncList) {
            Map<String, Object> map = new LinkedHashMap<>();
            map.put("id", s.getId());
            map.put("timestamp", s.getSyncTime() != null ? s.getSyncTime().toString() : "");
            map.put("zoneName", "Khu A - Bay Khảo Sát");
            map.put("sourceCode", s.getUavCode());
            map.put("categoryLabel", "MQTT Bulk Handshake");
            map.put("primaryMetric", "Thành công (10 records/lô)");
            map.put("secondaryMetric", "0 trùng lặp");
            map.put("statusLabel", s.getStatus() != null ? s.getStatus() : "COMPLETED");
            map.put("operatorOrNote", s.getMessage() != null ? s.getMessage() : "Phiên sync hoàn tất");
            rows.add(map);
        }
        return rows;
    }

    // Helper CellStyles
    private CellStyle createHeaderStyle(Workbook workbook, IndexedColors color) {
        CellStyle style = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setBold(true);
        font.setColor(IndexedColors.WHITE.getIndex());
        font.setFontHeightInPoints((short) 11);
        style.setFont(font);
        style.setFillForegroundColor(color.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private CellStyle createDataStyle(Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        return style;
    }

    private CellStyle createNumberStyle(Workbook workbook) {
        CellStyle style = createDataStyle(workbook);
        style.setAlignment(HorizontalAlignment.RIGHT);
        DataFormat format = workbook.createDataFormat();
        style.setDataFormat(format.getFormat("#,##0.00"));
        return style;
    }

    private void createTitleRow(Sheet sheet, Workbook workbook, String title, int colSpan) {
        Row row = sheet.createRow(0);
        Cell cell = row.createCell(0);
        cell.setCellValue(title);
        CellStyle titleStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font font = workbook.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 14);
        font.setColor(IndexedColors.DARK_BLUE.getIndex());
        titleStyle.setFont(font);
        titleStyle.setAlignment(HorizontalAlignment.CENTER);
        cell.setCellStyle(titleStyle);
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, Math.max(1, colSpan - 1)));
    }

    private void autoSizeColumns(Sheet sheet, int colCount) {
        for (int i = 0; i < colCount; i++) {
            sheet.autoSizeColumn(i);
            int width = sheet.getColumnWidth(i);
            sheet.setColumnWidth(i, Math.min(width + 1200, 20000));
        }
    }

    private PdfPCell createPdfCell(String text, com.lowagie.text.Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Phrase(text != null ? text : "", font));
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(4);
        return cell;
    }
}
