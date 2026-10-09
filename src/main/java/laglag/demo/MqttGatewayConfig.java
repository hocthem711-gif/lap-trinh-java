package laglag.demo; // Lưu ý: Đảm bảo dòng package này khớp với package của project bạn

import org.eclipse.paho.client.mqttv3.*;
import org.springframework.stereotype.Component;

@Component
public class MqttGatewayConfig {

    private final String brokerUrl = "tcp://localhost:1883";
    private final String clientId = "backend_gateway_server";
    private final String targetTopic = "iot/sensors/#"; // Lắng nghe mọi topic cảm biến bắt đầu bằng iot/sensors/

    public MqttGatewayConfig() {
        try {
            MqttClient client = new MqttClient(brokerUrl, clientId);
            MqttConnectOptions options = new MqttConnectOptions();
            options.setCleanSession(true);

            client.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("Mất kết nối với MQTT Broker!");
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) throws Exception {
                    String payload = new String(message.getPayload());

                    // 👉 LOGIC ROUTER/GATEWAY: Xử lý dữ liệu nhận được từ thiết bị IoT
                    System.out.println("Nhận dữ liệu từ Topic: [" + topic + "]");
                    System.out.println("Nội dung Payload JSON: " + payload);
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            client.connect(options);
            client.subscribe(targetTopic);
            System.out.println("Đã kết nối thành công tới MQTT Broker và đăng ký lắng nghe topic: " + targetTopic);

        } catch (MqttException e) {
            e.printStackTrace();
        }
    }
}