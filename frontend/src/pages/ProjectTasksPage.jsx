import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import client from "@/api/client";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/TaskBadges";
import { taskSchema } from "@/schemas/taskSchema";
import { formatDateShort, getApiError } from "@/lib/utils";

export default function ProjectTasksPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [labels, setLabels] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee_id: "",
    reporter_id: "",
    label_id: "",
    sort: "",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      due_date: "",
      assignee_id: "",
    },
  });

  const loadData = async () => {
    try {
      setError("");
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.assignee_id) params.assignee_id = filters.assignee_id;
      if (filters.reporter_id) params.reporter_id = filters.reporter_id;
      if (filters.label_id) params.label_id = filters.label_id;
      if (filters.sort) params.sort = filters.sort;

      const [projectRes, tasksRes, labelsRes] = await Promise.all([
        client.get(`/projects/${projectId}`),
        client.get(`/projects/${projectId}/tasks`, { params }),
        client.get(`/projects/${projectId}/labels`),
      ]);

      setProject(projectRes.data);
      setTasks(tasksRes.data);
      setLabels(labelsRes.data);
    } catch (err) {
      setError(getApiError(err, "Failed to load tasks"));
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchTasks() {
      try {
        setRefreshing(true);
        setError("");
        const params = {};
        if (filters.status) params.status = filters.status;
        if (filters.priority) params.priority = filters.priority;
        if (filters.assignee_id) params.assignee_id = filters.assignee_id;
        if (filters.reporter_id) params.reporter_id = filters.reporter_id;
        if (filters.label_id) params.label_id = filters.label_id;
        if (filters.sort) params.sort = filters.sort;

        const [projectRes, tasksRes, labelsRes] = await Promise.all([
          client.get(`/projects/${projectId}`),
          client.get(`/projects/${projectId}/tasks`, { params }),
          client.get(`/projects/${projectId}/labels`),
        ]);

        if (!cancelled) {
          setProject(projectRes.data);
          setTasks(tasksRes.data);
          setLabels(labelsRes.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err, "Failed to load tasks"));
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    }

    fetchTasks();
    return () => {
      cancelled = true;
    };
  }, [projectId, filters]);

  const onCreateTask = async (data) => {
    try {
      setError("");
      await client.post(`/projects/${projectId}/tasks`, {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        assignee_id: data.assignee_id ? Number(data.assignee_id) : null,
      });
      reset();
      setShowCreate(false);
      await loadData();
    } catch (err) {
      setError(getApiError(err, "Failed to create task"));
    }
  };

  const onDeleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    try {
      setError("");
      await client.delete(`/projects/${projectId}/tasks/${taskId}`);
      await loadData();
    } catch (err) {
      setError(getApiError(err, "Failed to delete task"));
    }
  };

  if (initialLoading && !project) {
    return (
      <div className="min-h-screen bg-white p-8 dark:bg-gray-950 dark:text-white">
        <p>Loading tasks...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              ← Project
            </Button>
            <h1 className="mt-3 text-3xl font-bold">
              {project?.name ? `${project.name} — Tasks` : "Tasks"}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/labels`)}
            >
              Labels
            </Button>
            <Button type="button" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Cancel" : "+ New Task"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <ErrorBanner message={error} />

        {showCreate && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-semibold">Create Task</h2>
            <form onSubmit={handleSubmit(onCreateTask)} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Title</label>
                <input
                  {...register("title")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  rows={3}
                  {...register("description")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Status
                  </label>
                  <select
                    {...register("status")}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Priority
                  </label>
                  <select
                    {...register("priority")}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Due date
                  </label>
                  <input
                    type="datetime-local"
                    {...register("due_date")}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Assignee
                  </label>
                  <select
                    {...register("assignee_id")}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="">Unassigned</option>
                    {project?.members?.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Task"}
              </Button>
            </form>
          </section>
        )}

        <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Filters
          </h2>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="DONE">DONE</option>
            </select>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priority: e.target.value }))
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
            </select>
            <select
              value={filters.assignee_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, assignee_id: e.target.value }))
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All assignees</option>
              {project?.members?.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              value={filters.reporter_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, reporter_id: e.target.value }))
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All reporters</option>
              {project?.members?.map((member) => (
                <option key={`r-${member.user_id}`} value={member.user_id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              value={filters.label_id}
              onChange={(e) =>
                setFilters((f) => ({ ...f, label_id: e.target.value }))
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">All labels</option>
              {labels.map((label) => (
                <option key={label.id} value={label.id}>
                  {label.name}
                </option>
              ))}
            </select>
            <select
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sort: e.target.value }))
              }
              className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value="">Sort: newest</option>
              <option value="due_date">Due date</option>
              <option value="created_at">Created</option>
              <option value="priority">Priority</option>
              <option value="status">Status</option>
              <option value="title">Title</option>
            </select>
          </div>
        </section>

        {refreshing ? (
          <p className="text-gray-600 dark:text-gray-400">
            Refreshing tasks...
          </p>
        ) : tasks.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900">
            <p className="text-gray-600 dark:text-gray-400">
              No tasks match your filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div
                  className="min-w-0 flex-1 cursor-pointer"
                  onClick={() =>
                    navigate(`/projects/${projectId}/tasks/${task.id}`)
                  }
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <TaskStatusBadge status={task.status} />
                    <TaskPriorityBadge priority={task.priority} />
                  </div>
                  {task.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {task.due_date && (
                      <span>Due: {formatDateShort(task.due_date)}</span>
                    )}
                    {task.assignee_id && (
                      <span>
                        Assignee:{" "}
                        {project?.members?.find(
                          (m) => m.user_id === task.assignee_id,
                        )?.name || `#${task.assignee_id}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      navigate(`/projects/${projectId}/tasks/${task.id}`)
                    }
                  >
                    Open
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
