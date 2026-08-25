import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import client from "@/api/client";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import LabelChip from "@/components/LabelChip";
import { labelSchema } from "@/schemas/labelSchema";
import { useAuth } from "@/hooks/useAuth";
import { getApiError } from "@/lib/utils";
import { authQueryKey, queryKeys } from "@/api/queryKeys";
import { fetchLabels, fetchProject } from "@/api/queries";

export default function ProjectLabelsPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(labelSchema),
    defaultValues: { name: "", color: "#6B7280" },
  });

  const labelsKey = authQueryKey(queryKeys.labels.list(projectId), user?.id);

  const projectQuery = useQuery({
    queryKey: authQueryKey(queryKeys.projects.detail(projectId), user?.id),
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(user?.id),
  });

  const labelsQuery = useQuery({
    queryKey: labelsKey,
    queryFn: () => fetchLabels(projectId),
    enabled: Boolean(user?.id),
  });

  const project = projectQuery.data;
  const labels = labelsQuery.data || [];
  const loading = projectQuery.isLoading || labelsQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await client.post(`/projects/${projectId}/labels`, {
        name: data.name,
        color: data.color || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsKey });
      reset({ name: "", color: "#6B7280" });
    },
    onError: (err) => setError(getApiError(err, "Failed to create label")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (labelId) => {
      await client.delete(`/projects/${projectId}/labels/${labelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsKey });
      queryClient.invalidateQueries({
        queryKey: ["projects", String(projectId), "tasks"],
      });
    },
    onError: (err) => setError(getApiError(err, "Failed to delete label")),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ labelId, name, color }) => {
      await client.patch(`/projects/${projectId}/labels/${labelId}`, {
        name,
        color,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labelsKey });
      setEditingId(null);
    },
    onError: (err) => setError(getApiError(err, "Failed to update label")),
  });

  const onDelete = (labelId) => {
    if (
      !window.confirm("Delete this label? It will be removed from all tasks.")
    )
      return;
    setError("");
    deleteMutation.mutate(labelId);
  };

  const startEdit = (label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 dark:bg-gray-950 dark:text-white">
        <p>Loading labels...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/tasks`)}
            >
              ← Tasks
            </Button>
            <h1 className="mt-3 text-3xl font-bold">
              {project?.name ? `${project.name} — Labels` : "Labels"}
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <ErrorBanner
          message={
            error ||
            (projectQuery.error || labelsQuery.error
              ? getApiError(
                  projectQuery.error || labelsQuery.error,
                  "Failed to load labels",
                )
              : "")
          }
        />

        <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-semibold">Create Label</h2>
          <form
            onSubmit={handleSubmit((data) => {
              setError("");
              createMutation.mutate(data);
            })}
            className="flex flex-wrap gap-3"
          >
            <div className="min-w-[200px] flex-1">
              <input
                placeholder="Label name"
                {...register("name")}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <input
                type="color"
                {...register("color")}
                className="h-10 w-14 cursor-pointer rounded border border-gray-300 dark:border-gray-700"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Add Label"}
            </Button>
          </form>
        </section>

        <section className="space-y-3">
          {labels.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No labels yet.</p>
          ) : (
            labels.map((label) => (
              <div
                key={label.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900"
              >
                {editingId === label.id ? (
                  <div className="flex flex-1 flex-wrap gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                    />
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded border"
                    />
                    <Button
                      type="button"
                      disabled={updateMutation.isPending}
                      onClick={() => {
                        setError("");
                        updateMutation.mutate({
                          labelId: label.id,
                          name: editName,
                          color: editColor,
                        });
                      }}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <>
                    <LabelChip name={label.name} color={label.color} />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startEdit(label)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => onDelete(label.id)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}
