package com.smartfarm.backend.service;

import com.smartfarm.backend.entity.*;
import com.smartfarm.backend.service.impl.EmailAlertServiceImpl;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests - EmailAlertService (F10)")
class EmailAlertServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailAlertServiceImpl emailAlertService;

    private Alert mockAlert;

    @BeforeEach
    void setUp() {
        Farm farm = new Farm("Smart Farm Đà Lạt", "Lâm Đồng", 10000.0, null);
        Zone zone = new Zone("Khu A - Cà chua", "Cà chua bi", farm);
        zone.setId(1L);
        Sensor sensor = new Sensor("SEN-001", "Cảm biến nhiệt", SensorType.TEMPERATURE, zone, 10.0, 10.0);
        sensor.setId(10L);

        mockAlert = new Alert("Nhiệt độ vượt quá 45°C!", AlertLevel.CRITICAL, zone, sensor);
        mockAlert.setId(99L);
    }

    @Test
    @DisplayName("Không gửi mail khi cờ cấu hình app.mail.enabled = false")
    void testSendAlertEmail_Disabled() {
        ReflectionTestUtils.setField(emailAlertService, "mailEnabled", false);

        emailAlertService.sendAlertEmail(mockAlert);

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Gửi mail thành công khi app.mail.enabled = true")
    void testSendAlertEmail_Enabled_Success() {
        ReflectionTestUtils.setField(emailAlertService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailAlertService, "alertRecipient", "admin@smartfarm.com");
        ReflectionTestUtils.setField(emailAlertService, "senderEmail", "noreply@smartfarm.com");

        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        assertDoesNotThrow(() -> emailAlertService.sendAlertEmail(mockAlert));

        verify(mailSender, times(1)).createMimeMessage();
        verify(mailSender, times(1)).send(mimeMessage);
    }

    @Test
    @DisplayName("Bỏ qua khi alert là null")
    void testSendAlertEmail_NullAlert() {
        emailAlertService.sendAlertEmail(null);
        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    @DisplayName("Bắt ngoại lệ an toàn nếu MailSender gặp sự cố")
    void testSendAlertEmail_ExceptionHandledSafely() {
        ReflectionTestUtils.setField(emailAlertService, "mailEnabled", true);
        ReflectionTestUtils.setField(emailAlertService, "alertRecipient", "admin@smartfarm.com");
        ReflectionTestUtils.setField(emailAlertService, "senderEmail", "noreply@smartfarm.com");

        MimeMessage mimeMessage = new MimeMessage(Session.getInstance(new Properties()));
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);
        doThrow(new MailSendException("SMTP server connection timeout"))
                .when(mailSender).send(any(MimeMessage.class));

        assertDoesNotThrow(() -> emailAlertService.sendAlertEmail(mockAlert));
    }
}
