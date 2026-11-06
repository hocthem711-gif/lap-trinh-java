package laglag.demo.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
@Table(name = "waypoints")
public class Waypoint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double latitude; // Vĩ độ
    private Double longitude; // Kinh độ

    // Khai báo quan hệ nhiều Waypoints thuộc về 1 Mission
    @ManyToOne
    @JoinColumn(name = "mission_id")
    private Mission mission;
}