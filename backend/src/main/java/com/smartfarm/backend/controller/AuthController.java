package com.smartfarm.backend.controller;

import com.smartfarm.backend.common.ApiResponse;
import com.smartfarm.backend.dto.request.LoginRequest;
import com.smartfarm.backend.dto.request.RegisterRequest;
import com.smartfarm.backend.dto.response.AuthResponse;
import com.smartfarm.backend.dto.response.UserResponse;
import com.smartfarm.backend.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/auth")
@Tag(name = "1. Auth Management", description = "APIs Đăng nhập, Đăng ký và Xác thực JWT (F01)")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    @Operation(summary = "Đăng nhập hệ thống (F01)", description = "Xác thực tài khoản và trả về JWT Bearer Token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success("Đăng nhập thành công!", response));
    }

    @PostMapping("/register")
    @Operation(summary = "Đăng ký tài khoản người dùng", description = "Tạo tài khoản người dùng mới (ROLE_FARMER hoặc ROLE_ADMIN)")
    public ResponseEntity<ApiResponse<UserResponse>> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Đăng ký tài khoản thành công!", response));
    }

    @PostMapping("/logout")
    @Operation(summary = "Đăng xuất hệ thống (F01)", description = "Xóa phiên làm việc phía client (Client xóa JWT Token khỏi LocalStorage)")
    public ResponseEntity<ApiResponse<String>> logout() {
        return ResponseEntity.ok(ApiResponse.success("Đăng xuất thành công!", "JWT Token cần được xóa ở Client side."));
    }
}
