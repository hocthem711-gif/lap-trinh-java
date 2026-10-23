package laglag.demo.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "sensor_data")
@Data
public class SensorData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nodeCode;      // Mã cảm biến (VD: NODE_01)
    private Double temperature;   // Nhiệt độ
    private Double humidity;      // Độ ẩm
    private Double soilMoisture; // Độ ẩm đất
    private LocalDateTime timestamp;
}