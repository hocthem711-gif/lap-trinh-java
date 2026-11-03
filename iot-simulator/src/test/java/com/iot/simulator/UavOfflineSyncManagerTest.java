package com.iot.simulator;

import org.eclipse.paho.client.mqttv3.MqttException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Kiểm thử luồng tự động của UAV Offline Sync (LTJ-25):
 * mất mạng -> lưu SQLite, có mạng lại -> tự đồng bộ, rớt mạng giữa chừng -> không mất dữ liệu.
 */
class UavOfflineSyncManagerTest {

    /** MQTT giả: bật/tắt mạng tùy ý và ghi lại các topic đã gửi. */
    static class FakePublisher extends MqttPublisher {
        boolean online = true;
        int failAfter = Integer.MAX_VALUE; // Rớt mạng sau N lần gửi
        final List<String> topics = new ArrayList<>();

        FakePublisher() {
            super("tcp://fake:1883", "fake", 1);
        }

        @Override
        public boolean isConnected() {
            return online;
        }

        @Override
        public double publishWithLatency(String topic, String payload) throws MqttException {
            if (!online || topics.size() >= failAfter) {
                online = false;
                throw new MqttException(MqttException.REASON_CODE_CONNECTION_LOST);
            }
            topics.add(topic);
            return 1.0;
        }
    }

    @TempDir
    Path tempDir;
    private OfflineStorageManager storage;
    private UavOfflineSyncManager sync;
    private FakePublisher mqtt;

    @BeforeEach
    void setUp() throws Exception {
        storage = new OfflineStorageManager(tempDir.resolve("sync.db").toString());
        sync = new UavOfflineSyncManager("UAV-TEST", storage);
        mqtt = new FakePublisher();
    }

    @AfterEach
    void tearDown() throws Exception {
        storage.close();
    }

    private void sendData(int n) throws Exception {
        for (int i = 0; i < n; i++) {
            sync.sendOrStore(mqtt, "iot/ltj/sensor/test", SensorData.generateRandom("DEV-" + i));
        }
    }

    @Test
    void coMangThiGuiThangKhongLuuSQLite() throws Exception {
        sendData(5);
        assertEquals(5, mqtt.topics.size());
        assertEquals(0, storage.countPending());
    }

    @Test
    void matMangThiTuLuuVaoSQLite() throws Exception {
        mqtt.online = false;
        sendData(25);
        assertEquals(0, mqtt.topics.size());
        assertEquals(25, storage.countPending());
    }

    @Test
    void coMangLaiThiTuDongBoDungThuTu() throws Exception {
        mqtt.online = false;
        sendData(25);

        mqtt.online = true;
        sync.syncIfOnline(mqtt, 10);

        assertEquals(0, storage.countPending());
        // 1 handshake + 3 lô (10 + 10 + 5) + 1 báo hoàn tất
        assertEquals(List.of(
                UavOfflineSyncManager.TOPIC_HANDSHAKE,
                UavOfflineSyncManager.TOPIC_BULK,
                UavOfflineSyncManager.TOPIC_BULK,
                UavOfflineSyncManager.TOPIC_BULK,
                UavOfflineSyncManager.TOPIC_COMPLETE), mqtt.topics);
    }

    @Test
    void rotMangGiuaChungKhongMatDuLieu() throws Exception {
        mqtt.online = false;
        sendData(25);

        // Có mạng lại nhưng rớt sau 2 lần gửi (handshake + lô 1)
        mqtt.online = true;
        mqtt.failAfter = 2;
        sync.syncIfOnline(mqtt, 10);
        assertEquals(15, storage.countPending(), "Lô 1 đã gửi, 15 bản ghi còn lại phải giữ nguyên");

        // Có mạng lại lần nữa -> gửi nốt phần còn lại
        mqtt.online = true;
        mqtt.failAfter = Integer.MAX_VALUE;
        sync.syncIfOnline(mqtt, 10);
        assertEquals(0, storage.countPending());
        assertEquals(25, storage.countSynced());
    }
}
