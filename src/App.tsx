import { useState } from 'react';
import {
  LayoutDashboard, Plane, Radio, Map, ClipboardList,
  Settings, Bell, Search, Cpu, Wifi, Activity, MapPin
} from 'lucide-react';
import DeviceManagement from './components/DeviceManagement';
import SensorAssignment from './components/SensorAssignment';
import SensorRealtimeTable from './components/SensorRealtimeTable';
import SensorMapPopup from './components/SensorMapPopup';
import './App.css';

/**
 * SmartFarm Dashboard — Main Application
 * Task: LTJ-9 (Sprint 2), LTJ-14 (Sprint 3)
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

type PageId = 'dashboard' | 'devices' | 'sensors' | 'sensorRealtime' | 'sensorMap' | 'stations' | 'map' | 'missions' | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const NAV_ITEMS: { section: string; items: NavItem[] }[] = [
  {
    section: 'Tổng quan',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    section: 'Quản lý thiết bị',
    items: [
      { id: 'devices', label: 'UAV & Gateway', icon: Plane, badge: '13' },
      { id: 'sensors', label: 'Cảm biến & Zone', icon: Cpu, badge: '10' },
    ],
  },
  {
    section: 'Giám sát Realtime',
    items: [
      { id: 'sensorRealtime', label: 'Cảm biến Realtime', icon: Activity, badge: 'LIVE' },
      { id: 'sensorMap', label: 'Bản đồ & Popup', icon: MapPin },
    ],
  },
  {
    section: 'Vận hành',
    items: [
      { id: 'stations', label: 'Trạm điều khiển', icon: Radio },
      { id: 'map', label: 'Bản đồ & Vị trí', icon: Map },
      { id: 'missions', label: 'Nhiệm vụ bay', icon: ClipboardList },
    ],
  },
  {
    section: 'Hệ thống',
    items: [
      { id: 'settings', label: 'Cài đặt', icon: Settings },
    ],
  },
];

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Tổng quan hệ thống giám sát nông trại' },
  devices: { title: 'Quản lý UAV & Gateway', subtitle: 'Danh sách và trạng thái thiết bị điều khiển' },
  sensors: { title: 'Cảm biến & Gán Zone', subtitle: 'Quản lý nút cảm biến IoT theo vùng canh tác' },
  sensorRealtime: { title: 'Cảm biến Realtime', subtitle: 'Giám sát chỉ số cảm biến thời gian thực' },
  sensorMap: { title: 'Bản đồ & Popup', subtitle: 'Vị trí cảm biến trên bản đồ — Click Marker xem chi tiết' },
  stations: { title: 'Trạm điều khiển', subtitle: 'Giám sát trạng thái trạm thu phát' },
  map: { title: 'Bản đồ & Vị trí', subtitle: 'Vị trí thiết bị trên bản đồ trang trại' },
  missions: { title: 'Nhiệm vụ bay', subtitle: 'Lập kế hoạch và theo dõi nhiệm vụ UAV' },
  settings: { title: 'Cài đặt hệ thống', subtitle: 'Tùy chỉnh cấu hình và thông số' },
};

function App() {
  const [activePage, setActivePage] = useState<PageId>('sensorRealtime');
  const pageInfo = PAGE_TITLES[activePage];

  /** Các trang đã được triển khai component thực */
  const implementedPages: PageId[] = ['devices', 'sensors', 'sensorRealtime', 'sensorMap'];

  return (
    <div className="dashboard-layout">
      {/* ===== Sidebar ===== */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Wifi size={20} color="#fff" />
            </div>
            <div className="brand-text">
              <h1>SmartFarm</h1>
              <span>IoT Platform v2.0</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                    onClick={() => setActivePage(item.id)}
                  >
                    <Icon size={18} />
                    {item.label}
                    {item.badge && <span className={`nav-badge ${item.badge === 'LIVE' ? 'nav-badge-live' : ''}`}>{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-avatar">NA</div>
            <div className="user-info">
              <strong>Nguyễn Trường An</strong>
              <span>Dev 4 · FE Web 2</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <div className="main-content">
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h2>{pageInfo.title}</h2>
            <span>{pageInfo.subtitle}</span>
          </div>
          <div className="header-right">
            <div className="sprint-tag">
              <span className="sprint-dot" />
              Sprint 3
            </div>
            <button className="header-icon-btn" title="Tìm kiếm">
              <Search size={18} />
            </button>
            <button className="header-icon-btn" title="Thông báo">
              <Bell size={18} />
              <span className="notification-dot" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {activePage === 'devices' && <DeviceManagement />}
          {activePage === 'sensors' && <SensorAssignment />}
          {activePage === 'sensorRealtime' && <SensorRealtimeTable />}
          {activePage === 'sensorMap' && <SensorMapPopup />}

          {/* Placeholder pages cho các trang chưa triển khai */}
          {!implementedPages.includes(activePage) && (
            <div className="placeholder-page">
              <div className="placeholder-icon">
                {activePage === 'dashboard' && <LayoutDashboard size={36} />}
                {activePage === 'stations' && <Radio size={36} />}
                {activePage === 'map' && <Map size={36} />}
                {activePage === 'missions' && <ClipboardList size={36} />}
                {activePage === 'settings' && <Settings size={36} />}
              </div>
              <h3>{pageInfo.title}</h3>
              <p>Trang này sẽ được triển khai trong các Sprint tiếp theo. Hiện tại bạn có thể trải nghiệm tính năng <strong>Cảm biến Realtime</strong>, <strong>Bản đồ & Popup</strong>, <strong>Quản lý UAV/Gateway</strong> và <strong>Gán cảm biến vào Zone</strong>.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
