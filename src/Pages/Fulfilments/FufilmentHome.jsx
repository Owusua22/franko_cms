import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Layout,
  Menu,
  Button,
  Typography,
  Modal,
  Avatar,
  Dropdown,
  Space,
} from 'antd';
import { Link, useNavigate, useLocation } from 'react-router-dom';
// ⚠️ Adjust this import path based on where this component is located relative to your Redux folder
import { logoutUser } from '../../Redux/Slice/userSlice'; 
import {
  HomeOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  LogoutOutlined,
  SettingOutlined,
  BellOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const FulfilmentHome = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Grab user directly from Redux store (which is hydrated from localStorage)
  const currentUser = useSelector((state) => state.user?.currentUser);
  
  // Fallback to localStorage just in case Redux hasn't hydrated yet
  const storedUser = localStorage.getItem('user');
  let localUser = null;
  try {
    localUser = storedUser ? JSON.parse(storedUser) : null;
  } catch (e) {
    localUser = null;
  }

  const user = currentUser || localUser;
  const fullName = user?.fullName || user?.FullName || 'Guest';

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const showLogoutModal = () => {
    setIsLogoutModalVisible(true);
  };

  const handleCancelLogout = () => {
    setIsLogoutModalVisible(false);
  };

  // ✅ FIXED: Dispatch Redux logout and force hard reload
  const handleLogout = () => {
    return new Promise((resolve) => {
      // 1. Dispatch the Redux action (clears state & localStorage)
      dispatch(logoutUser());
      
      // 2. Close modal
      setIsLogoutModalVisible(false);
      
      // 3. Force full page reload to clear all memory/contexts
      window.location.href = '/admin/login';
      
      resolve();
    });
  };

  // User dropdown menu
  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        onClick: () => navigate('/admin/profile'),
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        danger: true,
        onClick: showLogoutModal,
      },
    ],
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={toggleSidebar}
        breakpoint="lg"
        trigger={null}
        width={260}
        style={{
          position: 'fixed',
          height: '100vh',
          background:
            'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #991B1B 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          zIndex: 1000,
        }}
      >
        <div className="logo text-center" style={{ padding: '20px 16px' }}>
          <div
            style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              backdropFilter: 'blur(10px)',
              marginBottom: '8px',
            }}
          >
            <Title
              level={collapsed ? 3 : 4}
              style={{
                color: 'white',
                margin: 0,
                fontWeight: 'bold',
              }}
            >
              {collapsed ? 'FM' : 'Fulfillment Manager'}
            </Title>
          </div>

          {!collapsed && (
            <Text
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '12px',
              }}
            >
              Management System
            </Text>
          )}
        </div>

        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          style={{
            marginTop: 10,
            background: 'transparent',
            border: 'none',
          }}
        >
          <Menu.Item
            key="/fulfillment/dashboard"
            icon={<HomeOutlined />}
            style={{
              margin: '4px 12px',
              borderRadius: '8px',
            }}
          >
            <Link
              to="/fulfillment/dashboard"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Dashboard
            </Link>
          </Menu.Item>

          <Menu.Item
            key="/fulfillment/orders"
            icon={<ShoppingCartOutlined />}
            style={{
              margin: '4px 12px',
              borderRadius: '8px',
            }}
          >
            <Link
              to="/fulfillment/orders"
              style={{ color: 'white', textDecoration: 'none' }}
            >
              Orders
            </Link>
          </Menu.Item>
        </Menu>
      </Sider>

      {/* Main Layout */}
      <Layout
        style={{
          marginLeft: collapsed ? 80 : 260,
          transition: 'margin 0.3s ease',
          background: '#f8fafc',
        }}
      >
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
            height: '70px',
            position: 'sticky',
            top: 0,
            zIndex: 999,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
              style={{
                marginRight: 16,
                width: 40,
                height: 40,
              }}
            />

            <Title level={4} style={{ margin: 0 }}>
              Fulfillment Manager
            </Title>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Notification */}
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{
                width: 40,
                height: 40,
              }}
            />

            {/* User Dropdown */}
            <Dropdown
              menu={userMenu}
              trigger={['click']}
              placement="bottomRight"
            >
              <Space
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  background: 'white',
                }}
              >
                <Avatar
                  style={{
                    backgroundColor: '#DC2626',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                  size="small"
                >
                  {fullName.charAt(0).toUpperCase()}
                </Avatar>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <Text
                    style={{
                      color: '#1e293b',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    {fullName}
                  </Text>

                  <Text
                    style={{
                      color: '#64748b',
                      fontSize: '12px',
                    }}
                  >
                    Fulfillment Manager
                  </Text>
                </div>
              </Space>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          style={{
            padding: '12px',
            minHeight: 'calc(100vh - 70px)',
            background: '#f8fafc',
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '12px',
              padding: '24px',
              minHeight: 'calc(100vh - 140px)',
            }}
          >
            {children}
          </div>
        </Content>
      </Layout>

      {/* Logout Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LogoutOutlined style={{ color: '#DC2626' }} />
            <span>Confirm Logout</span>
          </div>
        }
        open={isLogoutModalVisible}
        onOk={handleLogout}
        onCancel={handleCancelLogout}
        okText="Logout"
        cancelText="Cancel"
        centered
        okButtonProps={{
          danger: true,
          style: {
            background: '#DC2626',
            borderColor: '#DC2626',
          },
        }}
      >
        <Text>
          Are you sure you want to logout from your account?
        </Text>
      </Modal>
    </Layout>
  );
};

export default FulfilmentHome;