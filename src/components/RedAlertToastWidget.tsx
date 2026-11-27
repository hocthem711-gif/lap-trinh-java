// Dev 3 - Sprint 6 - Task LTJ-28: Widget Cảnh báo Đỏ & Toast Notification

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AlertTriangle, Bell, CheckCircle, Flame, X } from 'lucide-react';
import type { AppDispatch } from '../store';
import {
  initThresholdAlertModule,
  selectAlertSummaryStats,
  selectFilteredAlerts,
  triggerExtremeTelemetryBurst,
  acknowledgeAlertById,
} from '../store/slices/alertSlice';
import { telemetrySocketClient } from '../services/telemetrySocketClient';
import './RedAlertToastWidget.css';

interface Props {
  onNavigateAlertsPage?: () => void;
}

export default function RedAlertToastWidget({ onNavigateAlertsPage }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const stats = useSelector(selectAlertSummaryStats);
  const alerts = useSelector(selectFilteredAlerts);

  // Danh sách ID các thẻ Toast đã bị người dùng đóng thủ công
  const [closedToastIds, setClosedToastIds] = useState<number[]>([]);

  // 1. Tải dữ liệu cảnh báo khi mở Dashboard & tự động bắt sóng SSE khi IoT Simulator bắn cảnh báo cực đoan
  useEffect(() => {
    dispatch(initThresholdAlertModule());
    telemetrySocketClient.connect();
    const unsub = telemetrySocketClient.subscribeAlerts(() => {
      dispatch(initThresholdAlertModule());
    });
    return () => unsub();
  }, [dispatch]);

  // 2. Lấy tối đa 3 cảnh báo đang mở (OPEN) mới nhất chưa bị đóng thủ công
  const toasts = alerts
    .filter((a) => a.status === 'OPEN' && !closedToastIds.includes(a.id))
    .slice(0, 3);

  // Đóng 1 thẻ Toast trên màn hình
  const handleCloseToast = (id: number) => {
    setClosedToastIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // Xác nhận đã đọc cảnh báo
  const handleAcknowledge = (id: number) => {
    dispatch(acknowledgeAlertById(id));
    handleCloseToast(id);
  };

  // Lấy cảnh báo nguy hiểm nhất đang mở để hiện lên thanh Widget Đỏ
  const topAlert = alerts.find((a) => a.status === 'OPEN');

  return (
    <>
      {/* 1. THANH WIDGET CẢNH BÁO ĐỎ TRÊN ĐẦU DASHBOARD */}
      <div
        className={`red-alert-bar ${
          stats.criticalOpenCount > 0
            ? 'critical'
            : stats.openCount > 0
              ? 'warning'
              : 'normal'
        }`}
      >
        <div className="red-alert-info">
          <AlertTriangle size={20} />
          <div>
            <strong>
              {stats.criticalOpenCount > 0
                ? `CẢNH BÁO ĐỎ KHẨN CẤP (${stats.criticalOpenCount} CRITICAL)`
                : stats.openCount > 0
                  ? `CẢNH BÁO VƯỢT NGƯỠNG (${stats.openCount} ĐANG MỞ)`
                  : 'HỆ THỐNG AN TOÀN'}
            </strong>
            <p>
              {topAlert
                ? `[${topAlert.sensorCode} - ${topAlert.zoneName}] ${topAlert.message}`
                : 'Tất cả chỉ số cảm biến và pin UAV đều trong ngưỡng bình thường.'}
            </p>
          </div>
        </div>

        <div className="red-alert-buttons">
          <button
            type="button"
            className="btn-test-alert"
            onClick={() => dispatch(triggerExtremeTelemetryBurst())}
          >
            <Flame size={15} />
            Test Cảnh báo Đỏ (60°C)
          </button>

          {onNavigateAlertsPage && (
            <button
              type="button"
              className="btn-goto-alert"
              onClick={onNavigateAlertsPage}
            >
              Xem chi tiết ({stats.openCount})
            </button>
          )}
        </div>
      </div>

      {/* 2. TOAST NOTIFICATION NỔI Ở GÓC PHẢI MÀN HÌNH */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast-box ${
                toast.alertLevel === 'CRITICAL' ? 'toast-red' : 'toast-orange'
              }`}
            >
              <div className="toast-header">
                <span>
                  <Bell size={14} />{' '}
                  {toast.alertLevel === 'CRITICAL'
                    ? 'CẢNH BÁO ĐỎ (CRITICAL)'
                    : 'CẢNH BÁO (WARNING)'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCloseToast(toast.id)}
                >
                  <X size={14} />
                </button>
              </div>

              <p className="toast-msg">
                <b>{toast.sensorCode}</b> ({toast.zoneName}): {toast.message}
              </p>

              <div className="toast-actions">
                <button
                  type="button"
                  onClick={() => handleAcknowledge(toast.id)}
                >
                  <CheckCircle size={13} /> Tiếp nhận
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
