import { useState } from 'react'
import Login from './components/Login'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import {
  LayoutDashboard, Plane, Radio, Map, ClipboardList,
  Settings, Bell, Search, Cpu, Wifi
} from 'lucide-react';
import DeviceManagement from './components/DeviceManagement';
import SensorAssignment from './components/SensorAssignment';
import './App.css';

/**
 * SmartFarm Dashboard — Main Application
 * Task: LTJ-9 - Sprint 2
 * Author: Quatrungvoon (Nguyễn Trường An)
 */

type PageId = 'dashboard' | 'devices' | 'sensors' | 'stations' | 'map' | 'missions' | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
}

const NAV_ITEMS: { section: string; items: NavItem[] }[] = [
  {
    label: 'Tổng số UAV',
    value: '24',
    note: 'Thiết bị trong hệ thống',
    icon: Plane,
  },
  {
    label: 'Đang hoạt động',
    value: '18',
    note: '75% tổng số thiết bị',
    icon: Activity,
  },
  {
    section: 'Quản lý thiết bị',
    items: [
      { id: 'devices', label: 'UAV & Gateway', icon: Plane, badge: '13' },
      { id: 'sensors', label: 'Cảm biến & Zone', icon: Cpu, badge: '10' },
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
  stations: { title: 'Trạm điều khiển', subtitle: 'Giám sát trạng thái trạm thu phát' },
  map: { title: 'Bản đồ & Vị trí', subtitle: 'Vị trí thiết bị trên bản đồ trang trại' },
  missions: { title: 'Nhiệm vụ bay', subtitle: 'Lập kế hoạch và theo dõi nhiệm vụ UAV' },
  settings: { title: 'Cài đặt hệ thống', subtitle: 'Tùy chỉnh cấu hình và thông số' },
};

function App() {
  const [activePage, setActivePage] = useState<PageId>('devices');
  const pageInfo = PAGE_TITLES[activePage];

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Plane size={23} />
          </div>
          <div>
            <h2>UAV Control</h2>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </div>

                <p className="menu-heading">MENU CHÍNH</p>

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
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-dot" />
          <div>
            <strong>Hệ thống trực tuyến</strong>
            <span>Tất cả dịch vụ sẵn sàng</span>
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
              Sprint 2
            </div>
          </div>

                    <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input type="search" placeholder="Tìm kiếm..." />
            </label>

            <button
              type="button"
              className="icon-button"
              aria-label="Thông báo"
            >
              <Bell size={20} />
              <span className="notification-dot" />
            </button>

            <div className="user-profile">
              <div className="avatar">
                {(username || 'AD').slice(0, 2).toUpperCase()}
              </div>
              <div className="user-info">
                <strong>{username || 'Administrator'}</strong>
                <span>Quản trị viên</span>
              </div>
            </div>

            <button
              type="button"
              className="logout-button"
              onClick={() => {
                setIsLoggedIn(false)
                setUsername('')
                setActivePage('Tổng quan')
                setUavSearch('')
              }}
            >
              Đăng xuất
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="page-content">
          {activePage === 'devices' && <DeviceManagement />}
          {activePage === 'sensors' && <SensorAssignment />}

          {/* Placeholder pages cho các trang chưa triển khai */}
          {!['devices', 'sensors'].includes(activePage) && (
            <div className="placeholder-page">
              <div className="placeholder-icon">
                {activePage === 'dashboard' && <LayoutDashboard size={36} />}
                {activePage === 'stations' && <Radio size={36} />}
                {activePage === 'map' && <Map size={36} />}
                {activePage === 'missions' && <ClipboardList size={36} />}
                {activePage === 'settings' && <Settings size={36} />}
              </div>
              <h3>{pageInfo.title}</h3>
              <p>Trang này sẽ được triển khai trong các Sprint tiếp theo. Hiện tại bạn có thể trải nghiệm tính năng <strong>Quản lý UAV/Gateway</strong> và <strong>Gán cảm biến vào Zone</strong>.</p>
            </div>
                   ) : activePage === 'Quản lý người dùng' ? (
  <div className="uav-page">
    <div className="section-title">
      <div>
        <h2>Danh sách người dùng</h2>
        <p>Quản lý tài khoản và quyền truy cập hệ thống</p>
      </div>
      <span className="date-label">
        {users.length} người dùng
      </span>
    </div>

    <div className="panel uav-table-panel">
      <div className="uav-toolbar">
        <h3>Tài khoản hệ thống</h3>
        <input
          type="search"
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
          placeholder="Tìm theo tên, email hoặc vai trò..."
          aria-label="Tìm kiếm người dùng"
        />
      </div>

      <div className="uav-table-scroll">
        <table className="uav-table">
          <thead>
            <tr>
              <th>Họ và tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td><strong>{user.name}</strong></td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span
                    className={
                      user.status === 'Hoạt động'
                        ? 'uav-status status-active'
                        : 'uav-status status-warning'
                    }
                  >
                    {user.status}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="logout-button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Bạn có chắc muốn xóa ${user.name}?`,
                        )
                      ) {
                        setUsers((current) =>
                          current.filter((item) => item.id !== user.id),
                        )
                      }
                    }}
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <p className="uav-empty">
            Không tìm thấy người dùng phù hợp.
          </p>
        )}
      </div>
    </div>
  </div>
) : (
  <div className="panel page-placeholder">
    <div className="stat-icon">
      {activePage === 'Trạm điều khiển' ? (
        <Radio size={24} />
      ) : activePage === 'Bản đồ & vị trí' ? (
        <Map size={24} />
      ) : activePage === 'Nhiệm vụ' ? (
        <ClipboardList size={24} />
      ) : (
        <Settings size={24} />
      )}
    </div>

    <h2>{activePage}</h2>
    <p>
      Đây là khu vực {activePage.toLowerCase()}.
      Nội dung chi tiết sẽ được xây dựng ở bước tiếp theo.
    </p>

    <button
      type="button"
      className="back-button"
      onClick={() => setActivePage('Tổng quan')}
    >
      Quay lại Tổng quan
    </button>
  </div>
)}

        </section>

        {/* Footer */}
        <footer className="dashboard-footer">
          UAV Control System <span>•</span> Admin &amp; Operator Dashboard
        </footer>
      </main>
    </div>
  )
}

export default App