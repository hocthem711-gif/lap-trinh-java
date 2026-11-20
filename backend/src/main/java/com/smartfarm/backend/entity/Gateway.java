package com.smartfarm.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "gateways")
@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
public class Gateway extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "ip_address")
    private String ipAddress;

    private String status; // ACTIVE, INACTIVE, OFFLINE

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "zone_id")
    private Zone zone;
}
