package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.FarmRequest;
import com.smartfarm.backend.dto.response.FarmResponse;

import java.util.List;

public interface FarmService {
    FarmResponse createFarm(FarmRequest request);
    List<FarmResponse> getAllFarms();
    List<FarmResponse> getMyFarms();
    FarmResponse getFarmById(Long id);
    FarmResponse updateFarm(Long id, FarmRequest request);
    void deleteFarm(Long id);
}
