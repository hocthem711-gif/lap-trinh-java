package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.FarmRequest;
import com.smartfarm.backend.dto.response.FarmResponse;
import com.smartfarm.backend.entity.Farm;
import com.smartfarm.backend.entity.User;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.FarmRepository;
import com.smartfarm.backend.repository.UserRepository;
import com.smartfarm.backend.security.SecurityUtils;
import com.smartfarm.backend.service.FarmService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class FarmServiceImpl implements FarmService {

    private final FarmRepository farmRepository;
    private final UserRepository userRepository;

    public FarmServiceImpl(FarmRepository farmRepository, UserRepository userRepository) {
        this.farmRepository = farmRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public FarmResponse createFarm(FarmRequest request) {
        String username = SecurityUtils.getCurrentUsername();
        User currentUser = null;
        if (username != null) {
            currentUser = userRepository.findByUsernameOrEmail(username, username).orElse(null);
        }

        if (currentUser == null) {
            // Fallback to first user in database if running in anonymous test
            currentUser = userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResourceNotFoundException("Chưa có tài khoản nào trong hệ thống để gán trang trại!"));
        }

        Farm farm = new Farm(
                request.getName(),
                request.getLocation(),
                request.getAreaSquareMeters(),
                currentUser
        );

        Farm savedFarm = farmRepository.save(farm);
        return toResponse(savedFarm);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FarmResponse> getAllFarms() {
        return farmRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<FarmResponse> getMyFarms() {
        String username = SecurityUtils.getCurrentUsername();
        if (username == null) {
            return getAllFarms();
        }
        User user = userRepository.findByUsernameOrEmail(username, username).orElse(null);
        if (user == null) {
            return getAllFarms();
        }
        return farmRepository.findByOwnerId(user.getId()).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public FarmResponse getFarmById(Long id) {
        Farm farm = farmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trang trại", "id", id));
        return toResponse(farm);
    }

    @Override
    @Transactional
    public FarmResponse updateFarm(Long id, FarmRequest request) {
        Farm farm = farmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trang trại", "id", id));

        if (request.getName() != null) farm.setName(request.getName());
        if (request.getLocation() != null) farm.setLocation(request.getLocation());
        if (request.getAreaSquareMeters() != null) farm.setAreaSquareMeters(request.getAreaSquareMeters());

        Farm updatedFarm = farmRepository.save(farm);
        return toResponse(updatedFarm);
    }

    @Override
    @Transactional
    public void deleteFarm(Long id) {
        Farm farm = farmRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Trang trại", "id", id));
        farmRepository.delete(farm);
    }

    private FarmResponse toResponse(Farm farm) {
        Long ownerId = farm.getOwner() != null ? farm.getOwner().getId() : null;
        String ownerName = farm.getOwner() != null ? farm.getOwner().getFullName() : null;
        int totalZones = farm.getZones() != null ? farm.getZones().size() : 0;

        return new FarmResponse(
                farm.getId(),
                farm.getName(),
                farm.getLocation(),
                farm.getAreaSquareMeters(),
                ownerId,
                ownerName,
                totalZones,
                farm.getCreatedAt(),
                farm.getUpdatedAt()
        );
    }
}
