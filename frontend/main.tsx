import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AuthLayout from './src/views/AuthLayout'
import Index from './src/views/index'
import Login from './src/views/login'
import Register from './src/views/register'
import ForgotPassword from './src/views/forgot-password'
import ResetPassword from './src/views/reset-password'
import VerifyEmail from './src/views/verify-email'
import Dashboard from './src/views/dashboard'
import Admin from './src/views/admin'
import Portal from './src/views/portal'
import CompleteProfile from './src/views/complete-profile'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Auth pages share the cinematic background layout */}
        <Route element={<AuthLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
        </Route>

        {/* App pages — no background animation */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
