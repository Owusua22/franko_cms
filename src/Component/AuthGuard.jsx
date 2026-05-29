// src/Component/AuthGuard.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const AuthGuard = ({ children }) => {
  const { currentUser, isAuthenticated } = useSelector((state) => state.user);
  const location = useLocation();

  // Prevent checking on login page (avoid infinite loop)
  if (location.pathname === "/admin/login") {
    return children;
  }

  // Check authentication
  if (!currentUser || !isAuthenticated || !currentUser.accessToken) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default AuthGuard;