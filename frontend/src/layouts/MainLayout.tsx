import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  GiftOutlined,
  LockOutlined,
  CheckSquareOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { useEffect, useState } from 'react';
import { statisticsApi } from '../api/statistics';
import { LockerWarning } from '../types';

const { Header, Sider, Content } = Layout;

function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [warning, setWarning] = useState<LockerWarning | null>(null);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '数据概览',
    },
    {
      key: '/tickets',
      icon: <GiftOutlined />,
      label: '票务管理',
    },
    {
      key: '/lockers',
      icon: <LockOutlined />,
      label: '储物柜管理',
    },
    {
      key: '/approvals',
      icon: <CheckSquareOutlined />,
      label: '审批管理',
    },
    {
      key: '/statistics',
      icon: <BarChartOutlined />,
      label: '数据统计',
    },
  ];

  const fetchWarning = async () => {
    try {
      const data = await statisticsApi.getLockerWarning();
      setWarning(data as any);
    } catch (error) {
      console.error('获取预警信息失败', error);
    }
  };

  useEffect(() => {
    fetchWarning();
    const interval = setInterval(fetchWarning, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userMenu = {
    items: [
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
  };

  const getRoleText = (role: string) => {
    const roleMap: Record<string, string> = {
      admin: '管理员',
      manager: '主管',
      finance: '财务',
      front_desk: '前台',
      customer: '游客',
    };
    return roleMap[role] || role;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1890ff',
            }}
          >
            🏊 游泳馆管理系统
          </div>
          {warning?.isWarning && (
            <div
              style={{
                background: '#faad14',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                animation: 'pulse 2s infinite',
              }}
            >
              <WarningOutlined />
              柜子使用率超过 {warning.warningThreshold}% 预警！
            </div>
          )}
        </div>
        <Space size="large">
          <Dropdown menu={userMenu}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span>
                {user?.name} ({getRoleText(user?.role || '')})
              </span>
            </Space>
          </Dropdown>
        </Space>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={menuItems}
            style={{ height: '100%', borderRight: 0 }}
            onClick={({ key }) => navigate(key)}
          />
        </Sider>
        <Layout style={{ padding: '24px', background: '#f0f2f5' }}>
          <Content
            style={{
              background: '#fff',
              padding: 24,
              margin: 0,
              minHeight: 280,
              borderRadius: '8px',
            }}
          >
            <Outlet />
          </Content>
        </Layout>
      </Layout>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </Layout>
  );
}

export default MainLayout;
