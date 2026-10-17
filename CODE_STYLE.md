# ☕ Quy Tắc Viết Code Java

## 📁 1. Cấu Trúc Thư Mục Dự Án

```
src/
├── main/
│   ├── java/
│   │   └── com/iot/
│   │       ├── model/          ← Các class dữ liệu (Entity, DTO)
│   │       ├── service/        ← Logic nghiệp vụ
│   │       ├── controller/     ← Điều khiển luồng chương trình
│   │       ├── repository/     ← Truy xuất dữ liệu
│   │       ├── config/         ← Cấu hình ứng dụng
│   │       ├── util/           ← Hàm tiện ích dùng chung
│   │       ├── exception/      ← Các class exception tùy chỉnh
│   │       └── constant/       ← Hằng số
│   └── resources/
│       └── application.properties
└── test/
    └── java/
        └── com/iot/            ← Test tương ứng với main
```

---

## 🏷️ 2. Quy Tắc Đặt Tên

### Class & Interface
| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Class thường | PascalCase, danh từ | `SensorData`, `MqttConnection` |
| Interface | PascalCase, tính từ hoặc danh từ | `Connectable`, `DataProcessor` |
| Abstract class | Prefix `Abstract` | `AbstractSensor` |
| Exception | Suffix `Exception` | `SensorNotFoundException` |
| Enum | PascalCase, danh từ | `SensorType`, `ConnectionStatus` |
| Test class | Suffix `Test` | `SensorDataTest` |

### Method (Phương thức)
| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Hành động | camelCase, bắt đầu bằng động từ | `sendData()`, `connectBroker()` |
| Getter | `get` + Tên thuộc tính | `getTemperature()` |
| Setter | `set` + Tên thuộc tính | `setTemperature(double temp)` |
| Boolean | `is/has/can` + Tính từ | `isConnected()`, `hasData()` |
| Factory | `create/of/from` | `createSensor()`, `fromJson()` |

### Biến (Variable)
| Loại | Quy tắc | Ví dụ |
|------|---------|-------|
| Biến thường | camelCase | `sensorValue`, `connectionTimeout` |
| Hằng số | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `DEFAULT_PORT` |
| Biến boolean | `is/has/can` prefix | `isActive`, `hasError` |
| Collection | Số nhiều | `sensors`, `dataPoints` |

### Package
- Toàn bộ chữ thường, không dấu
- Format: `com.iot.<module>.<submodule>`
- Ví dụ: `com.iot.simulator`, `com.iot.model`

---

## 📝 3. Quy Tắc Comment & Javadoc

### Khi nào PHẢI comment
- Mỗi class public → Javadoc mô tả mục đích
- Mỗi method public → Javadoc mô tả chức năng, params, return
- Logic phức tạp → Comment inline giải thích TẠI SAO

### Khi nào KHÔNG comment
- Code đã tự giải thích (ví dụ: `getUserName()`)
- Comment lặp lại code: ❌ `// tăng i lên 1` → `i++`

### Format Javadoc
```java
/**
 * Gửi dữ liệu cảm biến tới MQTT broker.
 * 
 * <p>Phương thức này sẽ tự động retry nếu kết nối thất bại,
 * tối đa {@value MAX_RETRY_COUNT} lần.</p>
 *
 * @param sensorData dữ liệu cảm biến cần gửi
 * @param topic      tên topic MQTT đích
 * @return {@code true} nếu gửi thành công
 * @throws MqttException nếu không thể kết nối broker
 * @author TênBạn
 * @since 1.0
 */
public boolean sendData(SensorData sensorData, String topic) throws MqttException {
    // ...
}
```

---

## 🏗️ 4. Quy Tắc Thiết Kế Code

### Nguyên tắc SOLID
| Nguyên tắc | Giải thích đơn giản | Ví dụ |
|------------|---------------------|-------|
| **S** - Single Responsibility | Mỗi class chỉ làm 1 việc | `MqttPublisher` chỉ gửi, `MqttSubscriber` chỉ nhận |
| **O** - Open/Closed | Mở để mở rộng, đóng để sửa đổi | Dùng interface `Sensor`, thêm `TemperatureSensor` mới |
| **L** - Liskov Substitution | Class con thay thế được class cha | `TemperatureSensor` dùng được mọi nơi cần `Sensor` |
| **I** - Interface Segregation | Interface nhỏ, chuyên biệt | `Readable`, `Writable` thay vì `ReadWritable` |
| **D** - Dependency Inversion | Phụ thuộc vào abstraction | Inject `DataService` interface, không phải `MySqlDataService` |

### Quy tắc quan trọng khác
1. **DRY** (Don't Repeat Yourself) — Không lặp code, trích thành method/class chung
2. **KISS** (Keep It Simple) — Viết đơn giản, không over-engineering
3. **Fail Fast** — Validate input đầu method, throw exception sớm
4. **Defensive Programming** — Luôn kiểm tra null, kiểm tra boundary

---

## ⚡ 5. Quy Tắc Xử Lý Lỗi

```java
// ✅ TỐT - Bắt exception cụ thể, log rõ ràng
try {
    mqttClient.connect(options);
} catch (MqttSecurityException e) {
    logger.error("Xác thực MQTT thất bại: {}", e.getMessage());
    throw new AuthenticationException("Không thể xác thực với broker", e);
} catch (MqttException e) {
    logger.error("Kết nối MQTT thất bại: {}", e.getMessage());
    throw new ConnectionException("Không thể kết nối broker", e);
}

// ❌ XẤU - Bắt chung chung, nuốt exception
try {
    mqttClient.connect(options);
} catch (Exception e) {
    e.printStackTrace();  // Không bao giờ dùng cái này
}
```

### Nguyên tắc
1. **KHÔNG** dùng `e.printStackTrace()` → Dùng Logger
2. **KHÔNG** bắt `Exception` chung chung → Bắt exception cụ thể
3. **KHÔNG** nuốt exception (catch rỗng) → Ít nhất phải log
4. **NÊN** tạo custom exception cho nghiệp vụ riêng
5. **NÊN** dùng `try-with-resources` cho AutoCloseable

---

## 🧪 6. Quy Tắc Test

### Đặt tên test
```java
// Format: methodName_condition_expectedResult
@Test
void sendData_validSensorData_returnsTrue() { ... }

@Test  
void sendData_nullData_throwsIllegalArgument() { ... }

@Test
void connect_brokerOffline_throwsConnectionException() { ... }
```

### Cấu trúc test (AAA Pattern)
```java
@Test
void calculateAverage_multipleValues_returnsCorrectAverage() {
    // Arrange - Chuẩn bị dữ liệu
    List<Double> values = List.of(10.0, 20.0, 30.0);
    
    // Act - Thực hiện hành động
    double result = calculator.calculateAverage(values);
    
    // Assert - Kiểm tra kết quả
    assertEquals(20.0, result, 0.001);
}
```

---

## 📏 7. Format & Style

| Quy tắc | Chi tiết |
|----------|---------|
| Indent | 4 spaces (KHÔNG dùng tab) |
| Độ dài dòng | Tối đa 120 ký tự |
| Ngoặc nhọn | Cùng dòng (K&R style) |
| Import | Không dùng wildcard `*`, import cụ thể |
| Dòng trống | 1 dòng giữa các method, 2 dòng giữa các section |
| Encoding | UTF-8 |

```java
// ✅ Format đúng
public class SensorManager {

    private static final int MAX_SENSORS = 100;
    
    private final List<Sensor> sensors;
    private final MqttClient mqttClient;

    public SensorManager(MqttClient mqttClient) {
        this.mqttClient = mqttClient;
        this.sensors = new ArrayList<>();
    }

    public void addSensor(Sensor sensor) {
        if (sensor == null) {
            throw new IllegalArgumentException("Sensor không được null");
        }
        if (sensors.size() >= MAX_SENSORS) {
            throw new IllegalStateException("Đã đạt giới hạn số lượng sensor");
        }
        sensors.add(sensor);
    }
}
```
