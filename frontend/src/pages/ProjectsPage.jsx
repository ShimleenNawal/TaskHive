import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function ProjectsPage() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("access_token");

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/projects", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load projects");
        }

        setProjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [token]);

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-3xl font-bold">Projects</h1>

          <Button type="button" onClick={() => navigate("/projects/new")}>
            + New Project
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <p className="text-gray-600 dark:text-gray-400">
            Loading projects...
          </p>
        )}

        {/* Empty State */}
        {!loading && projects.length === 0 && !error && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold">No projects yet</h2>

            <p className="mt-2 text-gray-600 dark:text-gray-400">
              To create your first project and get started
            </p>

            <Button
              type="button"
              className="mt-4"
              onClick={() => navigate("/projects/new")}
            >
              Click Here
            </Button>
          </div>
        )}

        {/* Projects */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => navigate(`/projects/${project.id}`)}
                className="cursor-pointer rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:shadow-gray-700/50"
              >
                <h2 className="text-xl font-semibold">{project.name}</h2>

                {project.description && (
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {project.description}
                  </p>
                )}

                {project.deadline && (
                  <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Deadline: {new Date(project.deadline).toLocaleDateString()}
                  </p>
                )}

                {project.created_at && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Created: {new Date(project.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
