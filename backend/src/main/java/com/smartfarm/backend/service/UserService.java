package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.UpdateUserRequest;
import com.smartfarm.backend.dto.response.UserResponse;

import java.util.List;

public interface UserService {
    UserResponse getCurrentUserProfile();
    List<UserResponse> getAllUsers();
    UserResponse getUserById(Long id);
    UserResponse updateUser(Long id, UpdateUserRequest request);
    void deleteUser(Long id);
}
