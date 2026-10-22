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
  LayoutDashboard,
  Plane,
  Radio,
  Map,
  ClipboardList,
  Users,
  Settings,
  Bell,
  Search,
  Menu,
  Activity,
  Battery,
  Signal,
  Cpu,
  MapPin,
} from 'lucide-react'
import DeviceManagement from './components/DeviceManagement'
import SensorAssignment from './components/SensorAssignment'
import SensorRealtimeTable from './components/SensorRealtimeTable'
import SensorMapPopup from './components/SensorMapPopup'
import './App.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
)

const menuItems = [
  { label: 'Tổng quan', icon: LayoutDashboard },
  { label: 'Quản lý UAV', icon: Plane },
  { label: 'UAV & Gateway', icon: Plane },
  { label: 'Cảm biến & Zone', icon: Cpu },
  { label: 'Cảm biến Realtime', icon: Activity },
  { label: 'Bản đồ & Popup', icon: MapPin },
  { label: 'Trạm điều khiển', icon: Radio },
  { label: 'Bản đồ & vị trí', icon: Map },
  { label: 'Nhiệm vụ', icon: ClipboardList },
  { label: 'Quản lý người dùng', icon: Users },
  { label: 'Cài đặt', icon: Settings },
]

const stats = [
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
    label: 'Mức pin trung bình',
    value: '82%',
    note: 'Trạng thái pin tốt',
    icon: Battery,
  },
  {
    label: 'Kết nối trực tuyến',
    value: '21',
    note: 'Thiết bị có tín hiệu',
    icon: Signal,
  },
]

const uavList = [
  {
    id: 'UAV-001',
    name: 'UAV Trinh sát 01',
    model: 'DJI Matrice 300',
    battery: 92,
    signal: 98,
    status: 'Đang hoạt động',
    location: 'Khu vực A',
  },
  {
    id: 'UAV-002',
    name: 'UAV Giám sát 02',
    model: 'DJI Matrice 30',
    battery: 67,
    signal: 85,
    status: 'Chờ nhiệm vụ',
    location: 'Khu vực B',
  },
  {
    id: 'UAV-003',
    name: 'UAV Tuần tra 03',
    model: 'Autel EVO II',
    battery: 24,
    signal: 42,
    status: 'Pin thấp',
    location: 'Khu vực C',
  },
  {
    id: 'UAV-004',
    name: 'UAV Trinh sát 04',
    model: 'DJI Matrice 300',
    battery: 81,
    signal: 93,
    status: 'Đang hoạt động',
    location: 'Khu vực D',
  },
]

type UserItem = {
  id: number
  name: string
  email: string
  role: string
  status: string
}

const initialUsers: UserItem[] = [
  {
    id: 1,
    name: 'Long Hồ',
    email: 'nguyenho26062006@gmail.com',
    role: 'Quản trị viên',
    status: 'Hoạt động',
  },
  {
    id: 2,
    name: 'Đình Hiệu',
    email: 'hieuclet@gmail.com',
    role: 'Người vận hành',
    status: 'Hoạt động',
  },
  {
    id: 3,
    name: 'Thiện Hiếu',
    email: 'thienhieu@gmail.com',
    role: 'Người vận hành',
    status: 'Tạm khóa',
  },
]

const activityChartData = {
  labels: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'],
  datasets: [
    {
      label: 'UAV đang hoạt động',
      data: [8, 12, 10, 15, 13, 18, 16],
      fill: true,
      backgroundColor: 'rgba(59, 130, 246, 0.12)',
      borderColor: '#3b82f6',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
    },
  ],
}

const activityChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        precision: 0,
      },
    },
  },
}


function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [username, setUsername] = useState('')

  const [activePage, setActivePage] = useState('Tổng quan')
  const [uavSearch, setUavSearch] = useState('')
  const [users, setUsers] = useState<UserItem[]>(initialUsers)
  const [userSearch, setUserSearch] = useState('')

  const filteredUsers = users.filter((user) =>
    `${user.name} ${user.email} ${user.role}`
      .toLowerCase()
      .includes(userSearch.trim().toLowerCase()),
)

  const filteredUavs = uavList.filter((uav) =>
    `${uav.id} ${uav.name}`
      .toLowerCase()
      .includes(uavSearch.trim().toLowerCase()),
  )
  const [showAddUserForm, setShowAddUserForm] = useState(false)

  const [newUser, setNewUser] = useState({
         name: '',
         email: '',
         role: 'Operator',
})

  if (!isLoggedIn) {
    return (
      <Login
        onLogin={(name) => {
          setUsername(name)
          setIsLoggedIn(true)
        }}
      />
    )
  }

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
          {menuItems.map((item) => {
            const Icon = item.icon

            return (
              <button
                type="button"
                key={item.label}
                className={
                  activePage === item.label
                    ? 'nav-item active'
                    : 'nav-item'
                }
                onClick={() => setActivePage(item.label)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="connection-dot" />
          <div>
            <strong>Hệ thống trực tuyến</strong>
            <span>Tất cả dịch vụ sẵn sàng</span>
          </div>
        </div>
      </aside>

      {/* Nội dung chính */}
      <main className="main-area">
        {/* Header */}
        <header className="topbar">
          <div className="page-heading">
            <button
              type="button"
              className="mobile-menu"
              aria-label="Mở menu"
              onClick={() => setActivePage('Tổng quan')}
            >
              <Menu size={21} />
            </button>

            <div>
              <h1>
                {activePage === 'Tổng quan'
                  ? 'Tổng quan hệ thống'
                  : activePage}
              </h1>
              <p>
                {activePage === 'Tổng quan'
                  ? 'Xin chào! Đây là tình trạng hệ thống UAV hôm nay.'
                  : `Quản lý và theo dõi ${activePage.toLowerCase()}.`}
              </p>
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

        {/* Nội dung các trang */}
        <section className="dashboard-content">
          {activePage === 'Tổng quan' ? (
            <>
              {/* Banner */}
              <div className="welcome-banner">
                <div>
                  <span className="eyebrow">
                    UAV MONITORING PLATFORM
                  </span>
                  <h2>Trung tâm giám sát UAV</h2>
                  <p>
                    Theo dõi thiết bị, kết nối và tình trạng nhiệm vụ
                    tại một nơi.
                  </p>
                </div>
                <div className="banner-icon">
                  <Radio size={58} strokeWidth={1.3} />
                </div>
              </div>

              {/* Thống kê */}
              <div className="section-title">
                <div>
                  <h2>Tổng quan hoạt động</h2>
                  <p>Thống kê thiết bị và kết nối hệ thống</p>
                </div>
                <span className="date-label">Dữ liệu minh họa</span>
              </div>

              <div className="stats-grid">
                {stats.map((stat) => {
                  const Icon = stat.icon

                  return (
                    <article className="stat-card" key={stat.label}>
                      <div className="stat-card-top">
                        <span>{stat.label}</span>
                        <div className="stat-icon">
                          <Icon size={21} />
                        </div>
                      </div>
                      <strong className="stat-value">
                        {stat.value}
                      </strong>
                      <p>{stat.note}</p>
                    </article>
                  )
                })}
              </div>

              {/* Biểu đồ và trạng thái kết nối */}
              <div className="content-grid">
                <section className="panel activity-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Hoạt động hệ thống</h2>
                      <p>Tình trạng vận hành hiện tại</p>
                    </div>
                    <span className="status-pill">
                      <span />
                      Đang giám sát
                    </span>
                  </div>

                  <div className="activity-placeholder">
                    <div className="chart-summary">
                      <div>
                        <span>UAV đang hoạt động</span>
                        <strong>16 thiết bị</strong>
                      </div>
                      <span className="chart-live-label">
                        Dữ liệu minh họa
                      </span>
                    </div>

                                        <div className="activity-chart">
                      <Line
                        data={activityChartData}
                        options={activityChartOptions}
                      />
                    </div>
                  </div>
                </section>

                <section className="panel quick-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Trạng thái kết nối</h2>
                      <p>Tổng quan thiết bị</p>
                    </div>
                  </div>

                  <div className="connection-row">
                    <div className="connection-symbol">
                      <Radio size={19} />
                    </div>
                    <div className="connection-text">
                      <strong>Thiết bị trực tuyến</strong>
                      <span>Kết nối bình thường</span>
                    </div>
                    <strong className="connection-number">21</strong>
                  </div>

                  <div className="connection-row">
                    <div className="connection-symbol purple">
                      <Plane size={19} />
                    </div>
                    <div className="connection-text">
                      <strong>UAV đang bay</strong>
                      <span>Đang thực hiện nhiệm vụ</span>
                    </div>
                    <strong className="connection-number">8</strong>
                  </div>

                  <div className="connection-row">
                    <div className="connection-symbol orange">
                      <Battery size={19} />
                    </div>
                    <div className="connection-text">
                      <strong>Cần kiểm tra pin</strong>
                      <span>Thiết bị pin thấp</span>
                    </div>
                    <strong className="connection-number">2</strong>
                  </div>
                </section>
              </div>
            </>
                      ) : activePage === 'Quản lý UAV' ? (
            /* Trang quản lý UAV */
            <div className="uav-page">
              <div className="section-title">
                <div>
                  <h2>Danh sách UAV</h2>
                  <p>
                    Quản lý và theo dõi trạng thái các thiết bị
                  </p>
                </div>
                <span className="date-label">
                  {uavList.length} thiết bị
                </span>
              </div>

              <div className="panel uav-table-panel">
                <div className="uav-toolbar">
                  <h3>Thiết bị UAV</h3>
                  <input
                    type="search"
                    value={uavSearch}
                    onChange={(event) =>
                      setUavSearch(event.target.value)
                    }
                    placeholder="Tìm theo tên hoặc mã UAV..."
                    aria-label="Tìm theo tên hoặc mã UAV"
                  />
                </div>

                <div className="uav-table-scroll">
                  <table className="uav-table">
                    <thead>
                      <tr>
                        <th>Mã UAV</th>
                        <th>Tên thiết bị</th>
                        <th>Pin</th>
                        <th>Tín hiệu</th>
                        <th>Trạng thái</th>
                        <th>Vị trí</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUavs.map((uav) => (
                        <tr key={uav.id}>
                          <td>
                            <strong>{uav.id}</strong>
                          </td>
                          <td>
                            <div className="uav-name">{uav.name}</div>
                            <span className="uav-model">
                              {uav.model}
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                uav.battery <= 25
                                  ? 'battery-low'
                                  : 'battery-value'
                              }
                            >
                              <Battery size={16} />
                              {uav.battery}%
                            </span>
                          </td>
                          <td>
                            <span className="signal-value">
                              <Signal size={16} />
                              {uav.signal}%
                            </span>
                          </td>
                          <td>
                            <span
                              className={
                                uav.status === 'Đang hoạt động'
                                  ? 'uav-status status-active'
                                  : uav.status === 'Pin thấp'
                                    ? 'uav-status status-warning'
                                    : 'uav-status status-idle'
                              }
                            >
                              {uav.status}
                            </span>
                          </td>
                          <td>{uav.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                               {filteredUavs.length === 0 && (
                    <p className="uav-empty">
                      Không tìm thấy UAV phù hợp.
                    </p>
                  )}
                </div>
              </div>
            </div>
                   ) : activePage === 'UAV & Gateway' ? (
            <DeviceManagement />
          ) : activePage === 'Cảm biến & Zone' ? (
            <SensorAssignment />
          ) : activePage === 'Cảm biến Realtime' ? (
            <SensorRealtimeTable />
          ) : activePage === 'Bản đồ & Popup' ? (
            <SensorMapPopup />
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
    <button
      type="button"
      className="back-button"
      onClick={() => {
        setNewUser({ name: '', email: '', role: 'Operator' })
        setShowAddUserForm(true)
      }}
    >
      + Thêm người dùng
    </button>

{showAddUserForm && (
  <div className="panel add-user-panel">
    <div className="add-user-heading">
      <div>
        <h3>Thêm người dùng mới</h3>
        <p>Nhập thông tin tài khoản cần thêm vào hệ thống.</p>
      </div>

      <button
        type="button"
        className="back-button"
        onClick={() => setShowAddUserForm(false)}
      >
        Đóng
      </button>
    </div>

    <form
      className="add-user-form"
      onSubmit={(event) => {
        event.preventDefault()

        const name = newUser.name.trim()
        const email = newUser.email.trim()

        if (!name || !email) {
          window.alert('Vui lòng nhập đầy đủ họ tên và email.')
          return
        }

        const emailExists = users.some(
          (user) => user.email.toLowerCase() === email.toLowerCase(),
        )

        if (emailExists) {
          window.alert('Email này đã tồn tại.')
          return
        }

        setUsers((current) => [
          ...current,
          {
            id: Date.now(),
            name,
            email,
            role: newUser.role,
            status: 'Hoạt động',
          },
        ])

        setUserSearch('')
        setNewUser({
          name: '',
          email: '',
          role: 'Operator',
        })
        setShowAddUserForm(false)
      }}
    >
      <div className="form-field">
        <label htmlFor="new-user-name">Họ và tên</label>
        <input
          id="new-user-name"
          type="text"
          value={newUser.name}
          onChange={(event) =>
            setNewUser((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          placeholder="Nhập họ và tên"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="new-user-email">Email</label>
        <input
          id="new-user-email"
          type="email"
          value={newUser.email}
          onChange={(event) =>
            setNewUser((current) => ({
              ...current,
              email: event.target.value,
            }))
          }
          placeholder="example@email.com"
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="new-user-role">Vai trò</label>
        <select
          id="new-user-role"
          value={newUser.role}
          onChange={(event) =>
            setNewUser((current) => ({
              ...current,
              role: event.target.value,
            }))
          }
        >
          <option value="Admin">Admin</option>
          <option value="Operator">Operator</option>
        </select>
      </div>

      <div className="add-user-actions">
        <button
          type="button"
          className="back-button"
          onClick={() => setShowAddUserForm(false)}
        >
          Hủy
        </button>

        <button type="submit" className="save-user-button">
          Lưu người dùng
        </button>
      </div>
    </form>
  </div>
)}
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
      ) : activePage === 'Bản đồ & vị trí' || activePage === 'Bản đồ & Popup' ? (
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