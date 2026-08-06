import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  return (
    <div>
      <h2>Welcome, {user?.name}!</h2>
      <p>Email: {user?.email}</p>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}
