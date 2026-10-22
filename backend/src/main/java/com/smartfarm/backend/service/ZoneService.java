package com.smartfarm.backend.service;

import com.smartfarm.backend.dto.request.ZoneRequest;
import com.smartfarm.backend.dto.response.ZoneResponse;

import java.util.List;

public interface ZoneService {
    ZoneResponse createZone(ZoneRequest request);
    List<ZoneResponse> getAllZones();
    List<ZoneResponse> getZonesByFarmId(Long farmId);
    ZoneResponse getZoneById(Long id);
    ZoneResponse updateZone(Long id, ZoneRequest request);
    void deleteZone(Long id);
}
