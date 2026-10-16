package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.LoginRequest;
import com.smartfarm.backend.dto.request.RegisterRequest;
import com.smartfarm.backend.dto.response.AuthResponse;
import com.smartfarm.backend.dto.response.UserResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);
    UserResponse register(RegisterRequest request);
}
