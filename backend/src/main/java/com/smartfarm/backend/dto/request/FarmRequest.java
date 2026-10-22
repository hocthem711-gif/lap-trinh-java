package com.smartfarm.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public class FarmRequest {

    @NotBlank(message = "Tên trang trại không được để trống")
    @Size(max = 100, message = "Tên trang trại tối đa 100 ký tự")
    private String name;

    private String location;

    @Positive(message = "Diện tích trang trại phải là số dương")
    private Double areaSquareMeters;

    public FarmRequest() {}

    public FarmRequest(String name, String location, Double areaSquareMeters) {
        this.name = name;
        this.location = location;
        this.areaSquareMeters = areaSquareMeters;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getAreaSquareMeters() { return areaSquareMeters; }
    public void setAreaSquareMeters(Double areaSquareMeters) { this.areaSquareMeters = areaSquareMeters; }
}
