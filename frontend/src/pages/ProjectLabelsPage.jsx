import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import client from "@/api/client";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import LabelChip from "@/components/LabelChip";
import { labelSchema } from "@/schemas/labelSchema";
import { getApiError } from "@/lib/utils";

export default function ProjectLabelsPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(labelSchema),
    defaultValues: { name: "", color: "#6B7280" },
  });

  const loadData = async () => {
    try {
      setError("");
      const [projectRes, labelsRes] = await Promise.all([
        client.get(`/projects/${projectId}`),
        client.get(`/projects/${projectId}/labels`),
      ]);
      setProject(projectRes.data);
      setLabels(labelsRes.data);
    } catch (err) {
      setError(getApiError(err, "Failed to load labels"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchLabels() {
      try {
        setError("");
        const [projectRes, labelsRes] = await Promise.all([
          client.get(`/projects/${projectId}`),
          client.get(`/projects/${projectId}/labels`),
        ]);
        if (!cancelled) {
          setProject(projectRes.data);
          setLabels(labelsRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err, "Failed to load labels"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchLabels();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const onCreate = async (data) => {
    try {
      setError("");
      await client.post(`/projects/${projectId}/labels`, {
        name: data.name,
        color: data.color || undefined,
      });
      reset({ name: "", color: "#6B7280" });
      await loadData();
    } catch (err) {
      setError(getApiError(err, "Failed to create label"));
    }
  };

  const onDelete = async (labelId) => {
    if (
      !window.confirm("Delete this label? It will be removed from all tasks.")
    )
      return;
    try {
      setError("");
      await client.delete(`/projects/${projectId}/labels/${labelId}`);
      await loadData();
    } catch (err) {
      setError(getApiError(err, "Failed to delete label"));
    }
  };

  const startEdit = (label) => {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
  };

  const onSaveEdit = async (labelId) => {
    try {
      setError("");
      await client.patch(`/projects/${projectId}/labels/${labelId}`, {
        name: editName,
        color: editColor,
      });
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(getApiError(err, "Failed to update label"));
    }
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
        <ErrorBanner message={error} />

        <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-xl font-semibold">Create Label</h2>
          <form
            onSubmit={handleSubmit(onCreate)}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Add Label"}
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
                    <Button type="button" onClick={() => onSaveEdit(label.id)}>
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
