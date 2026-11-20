package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.entity.Alert;
import com.smartfarm.backend.service.EmailAlertService;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;

@Service
public class EmailAlertServiceImpl implements EmailAlertService {

    private static final Logger log = LoggerFactory.getLogger(EmailAlertServiceImpl.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private final JavaMailSender mailSender;

    @Value("${app.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${app.mail.alert-recipient:hieuclet249@gmail.com}")
    private String alertRecipient;

    @Value("${spring.mail.username:smartfarm.alerts@gmail.com}")
    private String senderEmail;

    public EmailAlertServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Override
    @Async
    public void sendAlertEmail(Alert alert) {
        if (alert == null) {
            return;
        }

        if (!mailEnabled) {
            log.info("[EMAIL-ALERT] Tính năng gửi mail đang tắt (app.mail.enabled=false). Bỏ qua gửi email cho Alert ID: {}", alert.getId());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail);
            helper.setTo(alertRecipient);
            helper.setSubject(String.format("[SMART FARM CẢNH BÁO - %s] %s", alert.getAlertLevel(), alert.getMessage()));

            String zoneName = alert.getZone() != null ? alert.getZone().getName() : "Toàn hệ thống";
            String sensorName = alert.getSensor() != null ? alert.getSensor().getName() : "Không xác định";
            String createdAt = alert.getCreatedAt() != null ? alert.getCreatedAt().format(DATE_FORMATTER) : "Vừa xong";

            String htmlBody = String.format(
                    "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;'>"
                            + "<h2 style='color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;'>🚨 CẢNH BÁO NÔNG TRẠI THÔNG MINH</h2>"
                            + "<p>Hệ thống giám sát Smart Farm phát hiện cảnh báo vượt ngưỡng:</p>"
                            + "<table style='width: 100%%; border-collapse: collapse; margin-top: 15px;'>"
                            + "<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;'>Mức độ:</td><td style='padding: 8px; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-weight: bold;'>%s</td></tr>"
                            + "<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;'>Nội dung:</td><td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>%s</td></tr>"
                            + "<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;'>Khu vực:</td><td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>%s</td></tr>"
                            + "<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;'>Cảm biến:</td><td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>%s</td></tr>"
                            + "<tr><td style='padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;'>Thời gian:</td><td style='padding: 8px; border-bottom: 1px solid #e2e8f0;'>%s</td></tr>"
                            + "</table>"
                            + "<p style='margin-top: 20px; color: #64748b; font-size: 13px;'>Vui lòng kiểm tra lại thiết bị hoặc khu vực liên quan trên Dashboard để xử lý kịp thời.</p>"
                            + "</div>",
                    alert.getAlertLevel(),
                    alert.getMessage(),
                    zoneName,
                    sensorName,
                    createdAt
            );

            helper.setText(htmlBody, true);
            mailSender.send(message);

            log.info("[EMAIL-ALERT] Đã gửi email cảnh báo thành công tới {} cho Alert ID: {}", alertRecipient, alert.getId());
        } catch (Exception e) {
            log.error("[EMAIL-ALERT] Lỗi khi gửi email cảnh báo cho Alert ID {}: {}", alert.getId(), e.getMessage());
        }
    }
}
