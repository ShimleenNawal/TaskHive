import { useEffect, useState } from "react";
import "./App.css";
import client from "./api/client";
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

export default function App() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    client
      .get("/")
      .then((r) => console.log("Backend response:", r.data))
      .catch((e) => console.log("Error:", e.response?.status));
  }, []);

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
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}
