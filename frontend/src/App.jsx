import "./App.css";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";

import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ProjectsPage from "./pages/ProjectsPage";
import CreateProjectPage from "./pages/CreateProjectPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProjectTasksPage from "./pages/ProjectTasksPage";
import TaskDetailPage from "./pages/TaskDetailPage";
import ProjectLabelsPage from "./pages/ProjectLabelsPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import EmailLoginPage from "./pages/EmailLoginPage";
import AuthSessionBootstrap from "./components/AuthSessionBootstrap";

function TaskDetailRoute() {
  const { taskId } = useParams();
  return <TaskDetailPage key={taskId} />;
}

export default function App() {
  return (
    <Router>
      <AuthSessionBootstrap />
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/verify" element={<VerifyEmailPage />} />
        <Route path="/email-login" element={<EmailLoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/projects/:id/tasks" element={<ProjectTasksPage />} />
          <Route
            path="/projects/:id/tasks/:taskId"
            element={<TaskDetailRoute />}
          />
          <Route path="/projects/:id/labels" element={<ProjectLabelsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
