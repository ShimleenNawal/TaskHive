import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { projectSchema } from "@/schemas/projectSchema";
import client from "@/api/client";
import ErrorBanner from "@/components/ErrorBanner";
import { datetimeLocalToIso, getApiError } from "@/lib/utils";
import { queryKeys } from "@/api/queryKeys";

export default function CreateProjectPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
      deadline: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await client.post("/projects", {
        name: data.name,
        description: data.description || null,
        deadline: datetimeLocalToIso(data.deadline),
      });
      return response.data;
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      navigate(`/projects/${project.id}`);
    },
    onError: (err) => {
      setError(getApiError(err, "Failed to create project"));
    },
  });

  const onSubmit = (data) => {
    setError("");
    createMutation.mutate(data);
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
        <ErrorBanner message={error} />

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="space-y-6">
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
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

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

            <div className="flex gap-3">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Project"}
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
