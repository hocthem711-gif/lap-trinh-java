package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.LoginRequest;
import com.smartfarm.backend.dto.request.RegisterRequest;
import com.smartfarm.backend.dto.response.AuthResponse;
import com.smartfarm.backend.dto.response.UserResponse;
import com.smartfarm.backend.entity.Role;
import com.smartfarm.backend.entity.RoleName;
import com.smartfarm.backend.entity.User;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.RoleRepository;
import com.smartfarm.backend.repository.UserRepository;
import com.smartfarm.backend.security.JwtTokenProvider;
import com.smartfarm.backend.service.AuthService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;

    public AuthServiceImpl(AuthenticationManager authenticationManager,
                           UserRepository userRepository,
                           RoleRepository roleRepository,
                           PasswordEncoder passwordEncoder,
                           JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsernameOrEmail(),
                        request.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String token = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsernameOrEmail(request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User", "username/email", request.getUsernameOrEmail()));

        List<String> roles = user.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toList());

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                roles
        );
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (Boolean.TRUE.equals(userRepository.existsByUsername(request.getUsername()))) {
            throw new IllegalArgumentException("Username '" + request.getUsername() + "' đã tồn tại!");
        }

        if (Boolean.TRUE.equals(userRepository.existsByEmail(request.getEmail()))) {
            throw new IllegalArgumentException("Email '" + request.getEmail() + "' đã tồn tại!");
        }

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getFullName()
        );

        Set<Role> roles = new HashSet<>();
        RoleName targetRole = RoleName.ROLE_FARMER;
        if (request.getRole() != null) {
            try {
                targetRole = RoleName.valueOf(request.getRole().toUpperCase());
            } catch (IllegalArgumentException ignored) {
                targetRole = RoleName.ROLE_FARMER;
            }
        }

        Role role = roleRepository.findByName(targetRole)
                .orElseGet(() -> roleRepository.save(new Role(RoleName.ROLE_FARMER)));
        roles.add(role);
        user.setRoles(roles);

        User savedUser = userRepository.save(user);

        List<String> roleNames = savedUser.getRoles().stream()
                .map(r -> r.getName().name())
                .collect(Collectors.toList());

        return new UserResponse(
                savedUser.getId(),
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getFullName(),
                savedUser.getActive(),
                roleNames,
                savedUser.getCreatedAt()
        );
    }
}
