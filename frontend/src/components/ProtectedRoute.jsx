import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  const rehydrated = useSelector((state) => state.auth._persist?.rehydrated);

  // Wait for Redux Persist so a refresh does not flash the login page
  if (!rehydrated) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}
