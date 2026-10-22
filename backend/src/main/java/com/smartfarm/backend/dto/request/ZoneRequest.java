package com.smartfarm.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class ZoneRequest {

    @NotBlank(message = "Tên vùng canh tác không được để trống")
    @Size(max = 100, message = "Tên vùng canh tác tối đa 100 ký tự")
    private String name;

    private String cropType;

    @NotNull(message = "ID trang trại không được để trống")
    private Long farmId;

    public ZoneRequest() {}

    public ZoneRequest(String name, String cropType, Long farmId) {
        this.name = name;
        this.cropType = cropType;
        this.farmId = farmId;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCropType() { return cropType; }
    public void setCropType(String cropType) { this.cropType = cropType; }

    public Long getFarmId() { return farmId; }
    public void setFarmId(Long farmId) { this.farmId = farmId; }
}
