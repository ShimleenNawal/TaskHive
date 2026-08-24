import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import { formatDateShort, getApiError } from "@/lib/utils";
import { queryKeys } from "@/api/queryKeys";
import { fetchProjects } from "@/api/queries";

export default function ProjectsPage() {
  const navigate = useNavigate();

  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.projects.all,
    queryFn: fetchProjects,
  });

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-3xl font-bold">Projects</h1>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </Button>
            <Button type="button" onClick={() => navigate("/projects/new")}>
              + New Project
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <ErrorBanner
          message={error ? getApiError(error, "Failed to load projects") : ""}
        />

        {isLoading && (
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        )}

        {!isLoading && projects.length === 0 && !error && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Create your first project to get started
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

        {!isLoading && projects.length > 0 && (
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
                    Deadline: {formatDateShort(project.deadline)}
                  </p>
                )}

                {project.created_at && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Created: {formatDateShort(project.created_at)}
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
