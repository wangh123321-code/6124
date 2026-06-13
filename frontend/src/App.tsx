import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Spin } from 'antd';
import Login from './pages/Login';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import TicketManagement from './pages/TicketManagement';
import LockerManagement from './pages/LockerManagement';
import ApprovalManagement from './pages/ApprovalManagement';
import Statistics from './pages/Statistics';
import { useAuthStore } from './store/auth';

function App() {
  const { token, user, fetchUser } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token && !user) {
      fetchUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, user, fetchUser]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/dashboard" /> : <Login />} />
      <Route
        path="/*"
        element={token ? <MainLayout /> : <Navigate to="/login" replace />}
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tickets" element={<TicketManagement />} />
        <Route path="lockers" element={<LockerManagement />} />
        <Route path="approvals" element={<ApprovalManagement />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
