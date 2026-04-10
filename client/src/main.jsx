import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router-dom";

import App from './App.jsx'
import Home from './pages/home.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import EventDetails from './pages/EventDetails.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminRegistrants from './pages/AdminRegistrants.jsx'
import Archive from './pages/Archive.jsx'
import Profile from './pages/Profile.jsx'
import SuperAdminDashboard from './pages/SuperAdminDashboard.jsx'
import SuperAdminEvents from './pages/SuperAdminEvents.jsx'
import SuperRegister from './pages/SuperRegister.jsx'
import OrganizerFinancials from './pages/OrganizerFinancials.jsx'
import SuperAdminPayments from './pages/SuperAdminPayments.jsx'
import EventCheckIn from './pages/EventCheckIn.jsx'
import EventScanner from './pages/EventScanner.jsx'
import EventAttendance from './pages/EventAttendance.jsx'

import './css/global.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="event/:id" element={<EventDetails />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="archive" element={<Archive />} />
          <Route path="profile" element={<Profile />} />
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/financials" element={<OrganizerFinancials />} />
          <Route path="admin/events/:id/registrants" element={<AdminRegistrants />} />
          <Route path="admin/events/:id/check-in" element={<EventCheckIn />} />
          <Route path="admin/events/:id/attendance" element={<EventAttendance />} />
          <Route path="super-admin" element={<SuperAdminDashboard />} />
          <Route path="super-admin/payments" element={<SuperAdminPayments />} />
          <Route path="super-admin/events" element={<SuperAdminEvents />} />
          <Route path="super-register" element={<SuperRegister />} />
          <Route path="scanner" element={<EventScanner />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)