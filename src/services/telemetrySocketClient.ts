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
  currentWaypointOrder?: number;
  completedWaypoints?: number;
  totalWaypoints?: number;
  status?: string;
}

type TelemetryCallback = (data: LiveUavTelemetryEvent) => void;
type AlertSignalCallback = () => void;

const SSE_URL = 'http://localhost:8080/api/v1/realtime/stream';

function resolveFrontendUavId(rawUavId?: string, missionName?: string): string {
  const id = (rawUavId || '').trim().toUpperCase();
  if (id === 'UAV-002' || (missionName && missionName.toUpperCase().includes('UAV-002'))) {
    return 'UAV-002';
  }
  if (id === 'UAV-003' || (missionName && missionName.toUpperCase().includes('UAV-003'))) {
    return 'UAV-003';
  }
  if (!id || id === 'UAV-ALPHA-01' || id === 'UAV-001') {
    return 'UAV-001';
  }
  return rawUavId!;
}

class TelemetrySocketClient {
  private eventSource: EventSource | null = null;
  private listeners: TelemetryCallback[] = [];
  private alertListeners: AlertSignalCallback[] = [];

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
              uavId: resolveFrontendUavId(raw.uavId || raw.uavCode, raw.missionName),
              latitude: raw.latitude,
              longitude: raw.longitude,
              altitudeM: raw.altitudeM ?? raw.altitude ?? 48,
              speedMs: raw.speedMs ?? raw.speed ?? 8.5,
              batteryPercent: raw.batteryPercent ?? raw.battery ?? 85,
              headingDeg: raw.headingDeg ?? 58,
              progressPercent: raw.progressPercent,
              currentWaypointOrder: raw.currentWaypointOrder ?? raw.waypointIndex,
              completedWaypoints: raw.completedWaypoints,
              totalWaypoints: raw.totalWaypoints,
              status: raw.status ?? raw.flightStatus,
            };
            this.listeners.forEach((cb) => cb(payload));
          }
        } catch {
          // Bỏ qua nếu gói tin không đúng định dạng JSON
        }
      });

      this.eventSource.addEventListener('alert', () => {
        this.alertListeners.forEach((cb) => cb());
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

  // Đăng ký lắng nghe tín hiệu Cảnh báo Đỏ mới từ Backend
  subscribeAlerts(callback: AlertSignalCallback) {
    this.alertListeners.push(callback);
    return () => {
      this.alertListeners = this.alertListeners.filter((cb) => cb !== callback);
    };
  }
}

export const telemetrySocketClient = new TelemetrySocketClient();
