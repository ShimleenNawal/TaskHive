import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const projectSchema = z.object({
  name: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name must be 255 characters or less"),

  description: z
    .string()
    .max(255, "Description must be 255 characters or less")
    .optional()
    .or(z.literal("")),

  deadline: z.string().optional(),
});

export default function CreateProjectPage() {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      deadline: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      const token = localStorage.getItem("access_token");

      const response = await fetch("http://localhost:8000/api/projects", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          deadline: data.deadline
            ? new Date(data.deadline).toISOString()
            : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to create project");
      }

      // Go to the newly created project's detail page
      navigate(`/projects/${result.id}`);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <h1 className="text-3xl font-bold">Create Project</h1>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard")}
          >
            Back
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-medium">
                Project Name
              </label>

              <input
                id="name"
                type="text"
                {...register("name")}
                placeholder="Enter project name"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              />

              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium"
              >
                Description
              </label>

              <textarea
                id="description"
                rows={4}
                {...register("description")}
                placeholder="Enter project description"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              />

              {errors.description && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Deadline */}
            <div>
              <label
                htmlFor="deadline"
                className="mb-2 block text-sm font-medium"
              >
                Deadline
              </label>

              <input
                id="deadline"
                type="datetime-local"
                {...register("deadline")}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              />

              {errors.deadline && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.deadline.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/projects")}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
