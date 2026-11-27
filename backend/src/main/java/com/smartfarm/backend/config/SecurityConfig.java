package com.smartfarm.backend.config;

import com.smartfarm.backend.security.JwtAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .headers(headers -> headers.frameOptions(HeadersConfigurer.FrameOptionsConfig::disable))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/auth/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/h2-console/**",
                                "/health",
                                "/ws-telemetry/**",
                                "/realtime/**"
                        ).permitAll()
                        // Cho phép truy vấn đọc dữ liệu viễn trắc, lịch sử đồng bộ và xuất báo cáo dashboard
                        .requestMatchers(org.springframework.http.HttpMethod.GET,
                                "/farms/**",
                                "/zones/**",
                                "/sensors/**",
                                "/sensor-data/**",
                                "/thresholds/**",
                                "/alerts/**",
                                "/uavs/**",
                                "/uav/**",
                                "/gateways/**",
                                "/missions/**",
                                "/uav-sync/**",
                                "/reports/**"
                        ).permitAll()
                        // Cho phép cổng Ingestion dữ liệu tự động, cấu hình ngưỡng và tạo cảnh báo
                        .requestMatchers(org.springframework.http.HttpMethod.POST,
                                "/sensor-data/ingest",
                                "/sensor-data/simulator",
                                "/sensor-data/sync/bulk",
                                "/thresholds/**",
                                "/alerts/**",
                                "/sensors/**",
                                "/uavs/**",
                                "/uav/**",
                                "/gateways/**",
                                "/missions/**",
                                "/uav-sync/**",
                                "/reports/**"
                        ).permitAll()
                        // Cho phép cập nhật cấu hình ngưỡng, nhiệm vụ bay và review
                        .requestMatchers(org.springframework.http.HttpMethod.PUT,
                                "/thresholds/**",
                                "/missions/**",
                                "/uavs/**",
                                "/uav/**",
                                "/gateways/**",
                                "/sensors/**"
                        ).permitAll()
                        // Cho phép xử lý trạng thái cảnh báo, gateway và nhiệm vụ bay
                        .requestMatchers(org.springframework.http.HttpMethod.PATCH,
                                "/alerts/**",
                                "/gateways/**",
                                "/missions/**",
                                "/uavs/**"
                        ).permitAll()
                        // Cho phép xóa các đối tượng dữ liệu vận hành (ngưỡng, note nhiệm vụ, sensor)
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE,
                                "/thresholds/**",
                                "/sensors/**",
                                "/missions/**",
                                "/gateways/**",
                                "/uavs/**"
                        ).permitAll()
                        // Thắt chặt bảo mật cấp cao: Chỉ ADMIN mới được thực thi thao tác xóa nông trại, khu vực & cảnh báo (F02/SYS-03)
                        .requestMatchers(org.springframework.http.HttpMethod.DELETE,
                                "/farms/**",
                                "/zones/**",
                                "/alerts/**"
                        ).hasRole("ADMIN")
                        .anyRequest().authenticated()
                );

        http.addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(List.of("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
