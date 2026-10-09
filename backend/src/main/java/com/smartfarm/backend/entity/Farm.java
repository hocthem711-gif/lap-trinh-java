package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "farms")
public class Farm extends BaseEntity {

    @Column(nullable = false, length = 100)
    private String name;

    private String location;

    @Column(name = "area_square_meters")
    private Double areaSquareMeters;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    @OneToMany(mappedBy = "farm", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Zone> zones = new ArrayList<>();

    public Farm() {}

    public Farm(String name, String location, Double areaSquareMeters, User owner) {
        this.name = name;
        this.location = location;
        this.areaSquareMeters = areaSquareMeters;
        this.owner = owner;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Double getAreaSquareMeters() { return areaSquareMeters; }
    public void setAreaSquareMeters(Double areaSquareMeters) { this.areaSquareMeters = areaSquareMeters; }

    public User getOwner() { return owner; }
    public void setOwner(User owner) { this.owner = owner; }

    public List<Zone> getZones() { return zones; }
    public void setZones(List<Zone> zones) { this.zones = zones; }
}
