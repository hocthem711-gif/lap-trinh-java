package com.iot.simulator;

import com.google.gson.Gson;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Đồng bộ dữ liệu từ SQLite lên MQTT khi UAV có mạng trở lại (Sprint 5 - LTJ-25).
 *
 * Quy trình 3 bước:
 *   1. Gửi Handshake (SYNC_REQUEST)  -> iot/ltj/sync/handshake/request   (Dev 2 - LTJ-22)
 *   2. Gửi dữ liệu theo từng lô       -> iot/ltj/sync/bulk                (Dev 1 - LTJ-21)
 *   3. Gửi báo cáo kết thúc phiên     -> iot/ltj/sync/handshake/complete  (Dev 2 - LTJ-22)
 */
public class UavOfflineSyncManager {

    public static final String TOPIC_HANDSHAKE = "iot/ltj/sync/handshake/request";
    public static final String TOPIC_BULK = "iot/ltj/sync/bulk";
    public static final String TOPIC_COMPLETE = "iot/ltj/sync/handshake/complete";

    // Cấu trúc các gói JSON (Gson tự chuyển record -> JSON)
    record SyncRequest(String action, String uavId, int pendingRecords, long requestTime) {}
    record BulkPayload(String syncSessionId, String uavId, int totalRecords, List<SensorData> records) {}
    record SyncComplete(String action, String uavId, String syncSessionId, int syncedRecords, String status) {}

    private static final Gson GSON = new Gson();

    private final String uavId;
    private final OfflineStorageManager storage;

    public UavOfflineSyncManager(String uavId, OfflineStorageManager storage) {
        this.uavId = uavId;
        this.storage = storage;
    }

    /**
     * Gửi 1 bản tin: có mạng thì gửi MQTT, mất mạng (hoặc gửi lỗi) thì lưu SQLite.
     *
     * @return độ trễ gửi (ms), hoặc -1 nếu đã lưu offline
     */
    public double sendOrStore(MqttPublisher publisher, String topic, SensorData data) throws Exception {
        if (publisher.isConnected()) {
            try {
                return publisher.publishWithLatency(topic, data.toCompactJson());
            } catch (Exception e) {
                // Rớt mạng đúng lúc đang gửi -> chuyển sang lưu offline bên dưới
            }
        }
        storage.save(data);
        return -1;
    }

    /**
     * Gọi ở mỗi chu kỳ: nếu đã có mạng lại và SQLite còn dữ liệu tồn thì tự đồng bộ.
     * Nếu rớt mạng giữa chừng, phần chưa gửi vẫn nằm trong SQLite và sẽ gửi ở chu kỳ sau.
     */
    public void syncIfOnline(MqttPublisher publisher, int batchSize) {
        try {
            if (publisher.isConnected() && storage.countPending() > 0) {
                System.out.println(">> Co mang tro lai -> tu dong dong bo du lieu offline:");
                sync(publisher, batchSize);
            }
        } catch (Exception e) {
            System.err.println("!! Dong bo bi gian doan: " + e.getMessage() + " -> se thu lai chu ky sau.");
        }
    }

    /**
     * Đẩy toàn bộ dữ liệu chưa đồng bộ lên MQTT.
     * Chỉ đánh dấu is_synced = 1 SAU KHI publish thành công -> nếu rớt mạng giữa chừng thì không mất dữ liệu.
     *
     * @return số bản ghi đã đồng bộ
     */
    public int sync(MqttPublisher publisher, int batchSize) throws Exception {
        int pending = storage.countPending();
        if (pending == 0) {
            return 0;
        }

        long now = Instant.now().getEpochSecond();
        String sessionId = "SYNC-" + uavId + "-" + now;

        // Bước 1: Handshake
        publisher.publish(TOPIC_HANDSHAKE, GSON.toJson(new SyncRequest("SYNC_REQUEST", uavId, pending, now)));
        System.out.println("  [1] Handshake: " + pending + " ban ghi cho dong bo, session = " + sessionId);

        // Bước 2: Gửi từng lô
        int synced = 0;
        Map<Long, String> batch;
        while (!(batch = storage.getPending(batchSize)).isEmpty()) {
            List<SensorData> records = new ArrayList<>();
            for (String json : batch.values()) {
                records.add(GSON.fromJson(json, SensorData.class));
            }
            publisher.publish(TOPIC_BULK, GSON.toJson(new BulkPayload(sessionId, uavId, records.size(), records)));
            storage.markSynced(batch.keySet());
            synced += records.size();
            System.out.println("  [2] Da gui lo " + records.size() + " ban ghi (" + synced + "/" + pending + ")");
        }

        // Bước 3: Báo cáo kết thúc phiên
        publisher.publish(TOPIC_COMPLETE, GSON.toJson(new SyncComplete("SYNC_COMPLETED", uavId, sessionId, synced, "SUCCESS")));
        System.out.println("  [3] Hoan tat phien dong bo.");
        return synced;
    }
}
