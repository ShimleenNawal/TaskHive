import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const toggleDarkMode = () => {
    setIsDark((current) => !current);
  };

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold">TaskHive</h1>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </Button>

            <Button type="button" variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white shadow">
          <h2 className="text-2xl font-bold">
            Welcome{user?.name ? `, ${user.name}` : ""}!
          </h2>

          <p className="mt-2 text-blue-100">
            Manage your tasks and projects efficiently.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-8">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold">Total Tasks</h3>

            <p className="mt-2 text-3xl font-bold text-blue-600">0</p>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Create your first task
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold">In Progress</h3>

            <p className="mt-2 text-3xl font-bold text-yellow-600">0</p>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Tasks being worked on
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold">Completed</h3>

            <p className="mt-2 text-3xl font-bold text-green-600">0</p>

            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Finished tasks
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>

          <div className="flex flex-wrap gap-3">
            <Button type="button" className="bg-blue-600 hover:bg-blue-700">
              + New Project
            </Button>

            <Button type="button" variant="outline">
              + New Task
            </Button>

            <Button type="button" variant="outline">
              View Projects
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
