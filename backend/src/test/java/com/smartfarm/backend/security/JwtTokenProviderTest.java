package com.smartfarm.backend.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("LTJ-6: Kiểm thử bộ cấp phát và xác thực JWT Token (JwtTokenProvider)")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    // 256-bit test secret key
    private static final String TEST_SECRET = "404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970";
    private static final long TEST_EXPIRATION = 3600000; // 1 hour

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(jwtTokenProvider, "jwtExpirationMilliseconds", TEST_EXPIRATION);
        jwtTokenProvider.init();
    }

    @Test
    @DisplayName("Sinh token từ Authentication thành công")
    void testGenerateTokenFromAuthentication() {
        Authentication auth = new UsernamePasswordAuthenticationToken("admin", "password", Collections.emptyList());

        String token = jwtTokenProvider.generateToken(auth);

        assertNotNull(token);
        assertFalse(token.isBlank());
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("admin", jwtTokenProvider.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("Sinh token từ username trực tiếp thành công")
    void testGenerateTokenFromUsername() {
        String username = "farmer_user";

        String token = jwtTokenProvider.generateTokenFromUsername(username);

        assertNotNull(token);
        assertTrue(jwtTokenProvider.validateToken(token));
        assertEquals("farmer_user", jwtTokenProvider.getUsernameFromToken(token));
    }

    @Test
    @DisplayName("Xác thực token hợp lệ trả về true")
    void testValidateToken_Success() {
        String token = jwtTokenProvider.generateTokenFromUsername("hieuclet249");

        boolean isValid = jwtTokenProvider.validateToken(token);

        assertTrue(isValid);
    }

    @Test
    @DisplayName("Xác thực token hết hạn trả về false")
    void testValidateToken_Expired() {
        // Cấu hình expiration âm để tạo token đã hết hạn ngay khi sinh
        JwtTokenProvider expiredProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(expiredProvider, "jwtSecret", TEST_SECRET);
        ReflectionTestUtils.setField(expiredProvider, "jwtExpirationMilliseconds", -1000L);
        expiredProvider.init();

        String expiredToken = expiredProvider.generateTokenFromUsername("expired_user");

        boolean isValid = jwtTokenProvider.validateToken(expiredToken);

        assertFalse(isValid);
    }

    @Test
    @DisplayName("Xác thực token bị chỉnh sửa nội dung giả mạo trả về false")
    void testValidateToken_Tampered() {
        String token = jwtTokenProvider.generateTokenFromUsername("legit_user");
        String tamperedToken = token.substring(0, token.length() - 5) + "abcde";

        boolean isValid = jwtTokenProvider.validateToken(tamperedToken);

        assertFalse(isValid);
    }

    @Test
    @DisplayName("Xác thực token rỗng hoặc không hợp lệ định dạng trả về false")
    void testValidateToken_Malformed() {
        assertFalse(jwtTokenProvider.validateToken("not.a.real.jwt.token"));
        assertFalse(jwtTokenProvider.validateToken(""));
    }
}
