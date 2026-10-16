package com.smartfarm.backend.service.impl;

import com.smartfarm.backend.dto.request.ZoneRequest;
import com.smartfarm.backend.dto.response.ZoneResponse;
import com.smartfarm.backend.entity.Farm;
import com.smartfarm.backend.entity.Zone;
import com.smartfarm.backend.exception.ResourceNotFoundException;
import com.smartfarm.backend.repository.FarmRepository;
import com.smartfarm.backend.repository.ZoneRepository;
import com.smartfarm.backend.service.ZoneService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ZoneServiceImpl implements ZoneService {

    private final ZoneRepository zoneRepository;
    private final FarmRepository farmRepository;

    public ZoneServiceImpl(ZoneRepository zoneRepository, FarmRepository farmRepository) {
        this.zoneRepository = zoneRepository;
        this.farmRepository = farmRepository;
    }

    @Override
    @Transactional
    public ZoneResponse createZone(ZoneRequest request) {
        Farm farm = farmRepository.findById(request.getFarmId())
                .orElseThrow(() -> new ResourceNotFoundException("Trang trại", "id", request.getFarmId()));

        Zone zone = new Zone(
                request.getName(),
                request.getCropType(),
                farm
        );

        Zone savedZone = zoneRepository.save(zone);
        return toResponse(savedZone);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ZoneResponse> getAllZones() {
        return zoneRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ZoneResponse> getZonesByFarmId(Long farmId) {
        if (!farmRepository.existsById(farmId)) {
            throw new ResourceNotFoundException("Trang trại", "id", farmId);
        }
        return zoneRepository.findByFarmId(farmId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ZoneResponse getZoneById(Long id) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vùng canh tác", "id", id));
        return toResponse(zone);
    }

    @Override
    @Transactional
    public ZoneResponse updateZone(Long id, ZoneRequest request) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vùng canh tác", "id", id));

        if (request.getName() != null) zone.setName(request.getName());
        if (request.getCropType() != null) zone.setCropType(request.getCropType());

        if (request.getFarmId() != null && (zone.getFarm() == null || !request.getFarmId().equals(zone.getFarm().getId()))) {
            Farm newFarm = farmRepository.findById(request.getFarmId())
                    .orElseThrow(() -> new ResourceNotFoundException("Trang trại", "id", request.getFarmId()));
            zone.setFarm(newFarm);
        }

        Zone updatedZone = zoneRepository.save(zone);
        return toResponse(updatedZone);
    }

    @Override
    @Transactional
    public void deleteZone(Long id) {
        Zone zone = zoneRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vùng canh tác", "id", id));
        zoneRepository.delete(zone);
    }

    private ZoneResponse toResponse(Zone zone) {
        Long farmId = zone.getFarm() != null ? zone.getFarm().getId() : null;
        String farmName = zone.getFarm() != null ? zone.getFarm().getName() : null;
        int totalSensors = zone.getSensors() != null ? zone.getSensors().size() : 0;

        return new ZoneResponse(
                zone.getId(),
                zone.getName(),
                zone.getCropType(),
                farmId,
                farmName,
                totalSensors,
                zone.getCreatedAt(),
                zone.getUpdatedAt()
        );
    }
}
