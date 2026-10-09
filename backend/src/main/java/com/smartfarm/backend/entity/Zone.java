package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "zones")
public class Zone extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "crop_type")
    private String cropType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "farm_id", nullable = false)
    private Farm farm;

    @OneToMany(mappedBy = "zone", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Sensor> sensors = new ArrayList<>();

    public Zone() {}

    public Zone(String name, String cropType, Farm farm) {
        this.name = name;
        this.cropType = cropType;
        this.farm = farm;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCropType() { return cropType; }
    public void setCropType(String cropType) { this.cropType = cropType; }

    public Farm getFarm() { return farm; }
    public void setFarm(Farm farm) { this.farm = farm; }

    public List<Sensor> getSensors() { return sensors; }
    public void setSensors(List<Sensor> sensors) { this.sensors = sensors; }
}
