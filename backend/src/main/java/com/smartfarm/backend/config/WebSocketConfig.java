package com.smartfarm.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Cấu hình WebSocket STOMP Message Broker phục vụ truyền dữ liệu viễn trắc thời gian thực (F15).
 * Task: LTJ-31 - Sprint 7 (Dev 1 - Backend Core)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Kênh phát tin từ Server xuống Web Client
        config.enableSimpleBroker("/topic", "/queue");
        // Tiền tố nhận lệnh từ Web Client gửi lên Server
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Endpoint WebSocket hỗ trợ SockJS fallback
        registry.addEndpoint("/ws-telemetry")
                .setAllowedOriginPatterns("*")
                .withSockJS();

        // Endpoint WebSocket thuần (Native WebSocket)
        registry.addEndpoint("/ws-telemetry")
                .setAllowedOriginPatterns("*");
    }
}
