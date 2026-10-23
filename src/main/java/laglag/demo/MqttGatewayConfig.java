package laglag.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import laglag.demo.entity.SensorData;
import laglag.demo.repository.SensorDataRepository;
import org.eclipse.paho.client.mqttv3.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;

import jakarta.annotation.PostConstruct;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class MqttGatewayConfig {

    @Autowired
    private SensorDataRepository sensorDataRepository;

    @Autowired
    private ObjectMapper objectMapper;

    // Map lưu thời gian nhận tin nhắn cuối cùng theo từng Node để làm Rate Limiting
    private final ConcurrentHashMap<String, Long> lastMessageTimeMap = new ConcurrentHashMap<>();
    private static final long MIN_INTERVAL_MS = 3000; // Chỉ cho phép lưu 3 giây/lần cho mỗi node

    @PostConstruct
    @SuppressWarnings("resource")
    public void initMqtt() {
        try {
            String broker = "tcp://localhost:1883"; // Hoặc cấu hình từ application.yml
            String clientId = "SpringCloudServer_" + System.currentTimeMillis();

            MqttClient client = new MqttClient(broker, clientId);
            MqttConnectOptions connOpts = new MqttConnectOptions();
            connOpts.setCleanSession(true);

            client.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("Mất kết nối MQTT Broker: " + cause.getMessage());
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    String payload = new String(message.getPayload());
                    System.out.println("Nhận tin nhắn từ topic [" + topic + "]: " + payload);

                    try {
                        // 1. Parse JSON payload sang Entity SensorData
                        SensorData data = objectMapper.readValue(payload, SensorData.class);
                        if (data.getTimestamp() == null) {
                            data.setTimestamp(LocalDateTime.now());
                        }

                        // 2. Kiểm tra Rate Limiting trước khi lưu vào DB
                        String nodeCode = data.getNodeCode();
                        if (nodeCode != null && isAllowedByRateLimiter(nodeCode)) {
                            sensorDataRepository.save(data);
                            System.out.println("-> [DB SAVED] Đã lưu dữ liệu thành công cho node: " + nodeCode);
                        } else {
                            System.out.println("-> [RATE LIMIT] Bỏ qua dữ liệu dồn dập từ node: " + nodeCode);
                        }

                    } catch (Exception e) {
                        System.err.println("Lỗi xử lý/parse bản tin MQTT: " + e.getMessage());
                    }
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                }
            });

            client.connect(connOpts);
            client.subscribe("iot/sensors/#");
            System.out.println("Đã kết nối thành công tới MQTT Broker và đăng ký lắng nghe topic: iot/sensors/#");

        } catch (MqttException e) {
            e.printStackTrace();
        }
    }

    // Hàm kiểm tra giới hạn tần suất gửi dữ liệu (Rate Limiter)
    private boolean isAllowedByRateLimiter(String nodeCode) {
        long currentTime = System.currentTimeMillis();
        Long lastTime = lastMessageTimeMap.get(nodeCode);

        if (lastTime == null || (currentTime - lastTime) >= MIN_INTERVAL_MS) {
            lastMessageTimeMap.put(nodeCode, currentTime);
            return true;
        }
        return false;
    }
}