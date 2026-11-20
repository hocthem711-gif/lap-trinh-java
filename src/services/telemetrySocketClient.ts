// Dev 3 - Sprint 7 - Task LTJ-33: WebSocket / SSE Client nhận Telemetry UAV thời gian thực

export interface LiveUavTelemetryEvent {
  uavId: string;
  latitude: number;
  longitude: number;
  altitudeM: number;
  speedMs: number;
  batteryPercent: number;
  headingDeg: number;
  progressPercent?: number;
}

type TelemetryCallback = (data: LiveUavTelemetryEvent) => void;

const SSE_URL = 'http://localhost:8080/api/v1/realtime/stream';

class TelemetrySocketClient {
  private eventSource: EventSource | null = null;
  private listeners: TelemetryCallback[] = [];

  // Mở kết nối SSE / WebSocket tới Backend (LTJ-31 & LTJ-32)
  connect() {
    if (this.eventSource) return;

    try {
      this.eventSource = new EventSource(SSE_URL);

      this.eventSource.addEventListener('telemetry', (event: MessageEvent) => {
        try {
          const raw = JSON.parse(event.data);
          if (typeof raw.latitude === 'number' && typeof raw.longitude === 'number') {
            const payload: LiveUavTelemetryEvent = {
              uavId: raw.uavId || 'UAV-001',
              latitude: raw.latitude,
              longitude: raw.longitude,
              altitudeM: raw.altitudeM ?? raw.altitude ?? 48,
              speedMs: raw.speedMs ?? raw.speed ?? 8.5,
              batteryPercent: raw.batteryPercent ?? raw.battery ?? 85,
              headingDeg: raw.headingDeg ?? 58,
              progressPercent: raw.progressPercent,
            };
            this.listeners.forEach((cb) => cb(payload));
          }
        } catch {
          // Bỏ qua nếu gói tin không đúng định dạng JSON
        }
      });

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;
      };
    } catch {
      // Nếu Backend chưa bật thì dùng dữ liệu mô phỏng trên Redux
    }
  }

  // Đăng ký hàm lắng nghe tọa độ UAV mới
  subscribeTelemetry(callback: TelemetryCallback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }
}

export const telemetrySocketClient = new TelemetrySocketClient();
