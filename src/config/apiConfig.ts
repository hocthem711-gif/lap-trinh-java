/**
 * Cấu hình địa chỉ REST API Backend tập trung — SmartFarm Frontend
 * Author: Quatrungvoon (Nguyễn Trường An - Dev 4)
 *
 * - Đọc biến môi trường VITE_API_BASE_URL (khai báo trong file .env / .env.local khi deploy).
 * - Nếu không khai báo, tự động dùng mặc định http://localhost:8080/api/v1
 *   => Chạy local / demo KHÔNG cần tạo thêm file cấu hình nào.
 *
 * Ví dụ khi deploy:  VITE_API_BASE_URL=http://192.168.1.10:8080/api/v1
 */

export const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';

/** Chuẩn hóa base URL: bỏ khoảng trắng và dấu "/" thừa ở cuối, rỗng thì dùng mặc định */
export function normalizeApiBaseUrl(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_API_BASE_URL;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : DEFAULT_API_BASE_URL;
}

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
