package laglag.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "sensor_nodes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SensorNode {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    private String name;
    private String type;

    @Column(name = "zone_id")
    private Long zoneId;
}