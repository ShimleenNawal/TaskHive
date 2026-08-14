import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectsPage from "./pages/ProjectsPage";

export default function App() {
  return (
    <AuthProvider>
      <div>
        <Router>
          <Routes>
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/signup" />} />
            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}
