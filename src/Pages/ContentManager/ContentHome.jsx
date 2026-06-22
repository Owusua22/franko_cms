import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Layout, Menu, Button, Typography, Modal, Avatar, Dropdown, Tooltip } from 'antd';
import { Link, useLocation } from 'react-router-dom';
// ⚠️ Adjust this import path based on where this component is located relative to your Redux folder
import { logoutUser } from '../../Redux/Slice/userSlice'; 
import {
  ShoppingCartOutlined,
  AppstoreAddOutlined,
  ClusterOutlined,
  HomeOutlined,
  MenuFoldOutlined,
  FileImageOutlined,
  MenuUnfoldOutlined,
  DashboardOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  SearchOutlined,
  BellOutlined,
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const ContentHome = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const dispatch = useDispatch();
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
  const userposition = user?.position || user?.role || 'Admin';

  const toggleSidebar = () => setCollapsed(!collapsed);
  const handleLogout = () => setShowModal(true);
  const cancelLogout = () => setShowModal(false);

  const userMenu = {
    items: [
      { key: 'profile', icon: <UserOutlined />, label: 'Profile Settings' },
      { key: 'preferences', icon: <SettingOutlined />, label: 'Preferences' },
      { type: 'divider' },
      { 
        key: 'logout', 
        icon: <LogoutOutlined />,  
        label: 'Logout', 
        danger: true, 
        onClick: handleLogout 
      },
    ],
  };

  const menuItems = [
    { key: '/content/dashboard', icon: <DashboardOutlined />, label: 'Dashboard', path: '/content/dashboard' },
    { key: '/content/products', icon: <ShoppingCartOutlined />, label: 'Products', path: '/content/products' },
    { key: '/content/brands', icon: <AppstoreAddOutlined />, label: 'Brands', path: '/content/brands' },
    { key: '/content/category', icon: <ClusterOutlined />, label: 'Category', path: '/content/category' },
    { key: '/content/showroom', icon: <HomeOutlined />, label: 'Showroom', path: '/content/showroom' },
   
    { key: '/content/banner', icon: <FileImageOutlined />, label: 'Banners', path: '/content/banner' },
    { key: '/content/ctp001-products', icon: <ClusterOutlined />, label: 'Sales Mate Products', path: '/content/ctp001-products' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={toggleSidebar}
        breakpoint="lg"
        trigger={null}
        width={260}
        style={{
          position: 'fixed', height: '100vh',
          background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)', zIndex: 1000,
        }}
      >
        <div style={{ 
          padding: '20px 16px', textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.15)', 
          background: 'rgba(255,255,255,0.15)'
        }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.25)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: '18px', fontWeight: 'bold', color: 'white'
          }}>
            {collapsed ? 'CM' : '🔴'}
          </div>
          {!collapsed && (
            <Title level={5} style={{ color: 'white', margin: 0, fontSize: '16px' }}>
              Content Manager
            </Title>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          style={{ marginTop: 16, background: 'transparent', border: 'none' }}
        >
          {menuItems.map(item => (
            <Menu.Item
              key={item.key}
              icon={item.icon}
              style={{
                margin: '4px 12px', borderRadius: '8px',
                background: location.pathname === item.key 
                  ? 'rgba(255,255,255,0.25)' 
                  : 'transparent',
                color: 'white', height: 44, lineHeight: '44px', 
                transition: 'all 0.3s ease',
              }}
            >
              <Link to={item.path} style={{ color: 'inherit', textDecoration: 'none' }}>
                {item.label}
              </Link>
            </Menu.Item>
          ))}
        </Menu>

        {!collapsed && (
          <div style={{ 
            position: 'absolute', bottom: 20, left: 16, right: 16,
            padding: 12, background: 'rgba(255,255,255,0.15)', 
            borderRadius: 8, textAlign: 'center'
          }}>
            <Avatar size={32} icon={<UserOutlined />} style={{ marginBottom: 8, backgroundColor: '#dc2626' }} />
            <div style={{ color: 'white', fontSize: 12 }}>
              <div style={{ fontWeight: 'bold' }}>{fullName}</div>
              <div style={{ opacity: 0.8 }}>{userposition}</div>
            </div>
          </div>
        )}
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin 0.3s' }}>
        <Header style={{ 
          padding: '0 24px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', background: 'white', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          position: 'sticky', top: 0, zIndex: 999, height: 64
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button 
              type="text" 
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar} 
              style={{ marginRight: 16, fontSize: 16, width: 40, height: 40, borderRadius: 6 }} 
            />
            <Title level={4} style={{ margin: 0, color: '#dc2626' }}>
              Content Management
            </Title>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tooltip title="Search">
              <Button type="text" icon={<SearchOutlined />} style={{ fontSize: 16, width: 40, height: 40, borderRadius: 6 }} />
            </Tooltip>
            <Tooltip title="Notifications">
              <Button type="text" icon={<BellOutlined />} style={{ fontSize: 16, width: 40, height: 40, borderRadius: 6 }} />
            </Tooltip>

            <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8 }}>
                <Avatar size={32} icon={<UserOutlined />} style={{ backgroundColor: '#dc2626' }} />
                <span style={{ fontSize: 14, fontWeight: 500, color: '#dc2626' }}>{fullName}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{ padding: 2, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ 
            background: 'white', borderRadius: 12, padding: 24, 
            minHeight: '100%', boxShadow: '0 1px 3px rgba(220,38,38,0.1)'
          }}>
            {children}
          </div>
        </Content>
      </Layout>

      {/* Logout Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <LogoutOutlined style={{ color: '#ef4444' }} />
            <span>Confirm Logout</span>
          </div>
        }
        open={showModal}
        onOk={() => {
          return new Promise((resolve) => {
            // 1. Dispatch the Redux action. 
            // This sets currentUser to null, isAuthenticated to false, and calls clearStorage()
            dispatch(logoutUser());
            
            // 2. Close the modal
            setShowModal(false);
            
            // 3. Force a full page reload to the login route.
            // This guarantees any Protected Route wrappers or lingering Context states are destroyed.
            window.location.href = '/admin/login';
            
            resolve();
          });
        }}
        onCancel={cancelLogout}
        okText="Yes, Logout"
        cancelText="Cancel"
        okButtonProps={{ 
          danger: true, 
          style: { backgroundColor: '#dc2626', borderColor: '#dc2626' } 
        }}
        centered
      >
        <p style={{ margin: '16px 0' }}>Are you sure you want to logout?</p>
      </Modal>
    </Layout>
  );
};

export default ContentHome;