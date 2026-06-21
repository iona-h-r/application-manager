import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Apply from './pages/Apply'
import Admin from './pages/Admin'
import Home from './pages/Home'
import ApplicationDetail from './pages/ApplicationDetail'
import AdminJobCreate from './pages/AdminJobCreate'
import AdminJobList from './pages/AdminJobList'
import './index.css'






ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />}  />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin/applications/:applicationId"
          element={
            <ProtectedRoute requiredRole="admin">
              <ApplicationDetail />
            </ProtectedRoute>
          }
        />

        {/* 応募フォーム: ログイン済みユーザー */}
        <Route
          path="/apply"
          element={
            <ProtectedRoute requiredRole="user">
              <Apply />
            </ProtectedRoute>
          }
        />

        {/* 管理者画面: Admin グループのみ */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/jobs/new"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminJobCreate />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/jobs"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminJobList />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
)
