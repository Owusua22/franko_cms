
import { useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import { selectIsAuthenticated } from "../Redux/Slice/authSelectors";

export default function AuthGuard({ children }) {
  const isAuthed = useSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthed) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}