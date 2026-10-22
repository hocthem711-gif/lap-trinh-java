
import { useState, type FormEvent } from 'react'
import { Plane, LockKeyhole, User, Eye, EyeOff } from 'lucide-react'
import { login } from '../services/authService'
import './Login.css'

type LoginProps = {
  onLogin: (username: string) => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.')
      return
    }

    setError('')
    setIsLoading(true)

    try {
      const user = await login(username.trim(), password)
      onLogin(user.fullName || user.username)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Đăng nhập thất bại. Vui lòng thử lại.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <Plane size={30} />
        </div>

        <h1>UAV Control</h1>
        <p className="login-subtitle">
          Đăng nhập hệ thống quản lý UAV
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Tài khoản</label>
          <div className="login-input">
            <User size={18} />
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Nhập tài khoản hoặc email"
              autoComplete="username"
              disabled={isLoading}
            />
          </div>

          <label htmlFor="password">Mật khẩu</label>
          <div className="login-input">
            <LockKeyhole size={18} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              disabled={isLoading}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <p className="login-error">{error}</p>}

          <button
            type="submit"
            className="login-submit"
            disabled={isLoading}
          >
            {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="login-note">UAV Monitoring Platform</p>
      </section>
    </main>
  )
}
