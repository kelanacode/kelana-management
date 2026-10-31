import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Notes } from './pages/Notes';
import { Board } from './pages/Board';
import { DatabasePage } from './pages/Database';
import { CalendarPage } from './pages/Calendar';
import { Team } from './pages/Team';
import { AttendancePage } from './pages/Attendance';
import { FinancePage } from './pages/Finance';
import { TasksPage } from './pages/Tasks';
import { Login } from './pages/Login';
import { ActivateAccount } from './pages/ActivateAccount';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes for Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/activate" element={<ActivateAccount />} />

        {/* Protected App Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/attendance" element={<AttendancePage />} />
                  <Route path="/finance" element={<FinancePage />} />
                  <Route path="/notes" element={<Notes />} />
                  <Route path="/board" element={<Board />} />
                  <Route path="/database" element={<DatabasePage />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/reminders" element={<Navigate to="/calendar" replace />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
