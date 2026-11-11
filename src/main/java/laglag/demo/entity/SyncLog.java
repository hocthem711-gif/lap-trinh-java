package laglag.demo.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(name = "sync_logs")
public class SyncLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String uavCode; // Lưu mã UAV để dễ tra cứu log

    private String status; // "SUCCESS" hoặc "FAILED"

    private String message; // Lý do / thông báo chi tiết

    private LocalDateTime syncTime;
}