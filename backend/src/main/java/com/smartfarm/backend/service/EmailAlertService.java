package com.smartfarm.backend.service;

import com.smartfarm.backend.entity.Alert;

/**
 * Service gửi email thông báo cảnh báo nông trại (F10 - JavaMailSender)
 */
public interface EmailAlertService {

    /**
     * Gửi email cảnh báo vi phạm ngưỡng nông trại
     *
     * @param alert Đối tượng cảnh báo
     */
    void sendAlertEmail(Alert alert);
}
