import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import client from "@/api/client";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/TaskBadges";
import TaskKanbanBoard from "@/components/TaskKanbanBoard";
import { taskSchema } from "@/schemas/taskSchema";
import {
  datetimeLocalToIso,
  formatDateShort,
  getApiError,
} from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { authQueryKey, queryKeys } from "@/api/queryKeys";
import {
  buildTaskListParams,
  fetchLabels,
  fetchProject,
  fetchTasks,
} from "@/api/queries";

export default function ProjectTasksPage() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [view, setView] = useState("board");
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    assignee_id: "",
    reporter_id: "",
    label_id: "",
    sort: "",
  });

  const taskParams = useMemo(
    () => buildTaskListParams({ view, filters }),
    [view, filters],
  );
  const tasksQueryKey = authQueryKey(
    queryKeys.tasks.list(projectId, taskParams),
    user?.id,
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
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

  const projectQuery = useQuery({
    queryKey: authQueryKey(queryKeys.projects.detail(projectId), user?.id),
    queryFn: () => fetchProject(projectId),
    enabled: Boolean(user?.id),
  });

  const tasksQuery = useQuery({
    queryKey: tasksQueryKey,
    queryFn: () => fetchTasks(projectId, taskParams),
    enabled: Boolean(user?.id),
  });

  const labelsQuery = useQuery({
    queryKey: authQueryKey(queryKeys.labels.list(projectId), user?.id),
    queryFn: () => fetchLabels(projectId),
    enabled: Boolean(user?.id),
  });

  const project = projectQuery.data;
  const tasks = tasksQuery.data || [];
  const labels = labelsQuery.data || [];
  const initialLoading =
    projectQuery.isLoading || tasksQuery.isLoading || labelsQuery.isLoading;
  const refreshing =
    tasksQuery.isFetching && !tasksQuery.isLoading;

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await client.post(`/projects/${projectId}/tasks`, {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        due_date: datetimeLocalToIso(data.due_date),
        assignee_id: data.assignee_id ? Number(data.assignee_id) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", String(projectId), "tasks"],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      reset();
      setShowCreate(false);
    },
    onError: (err) => setError(getApiError(err, "Failed to create task")),
  });

  const deleteMutation = useMutation({
    mutationFn: async (taskId) => {
      await client.delete(`/projects/${projectId}/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["projects", String(projectId), "tasks"],
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
    onError: (err) => setError(getApiError(err, "Failed to delete task")),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      const res = await client.put(`/projects/${projectId}/tasks/${taskId}`, {
        status,
      });
      return res.data;
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: tasksQueryKey });
      const previous = queryClient.getQueryData(tasksQueryKey);
      queryClient.setQueryData(tasksQueryKey, (current = []) =>
        current.map((item) =>
          item.id === taskId ? { ...item, status } : item,
        ),
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(tasksQueryKey, context.previous);
      }
      setError(getApiError(err, "Failed to update task status"));
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(tasksQueryKey, (current = []) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
    },
  });

  const onDeleteTask = (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    deleteMutation.mutate(taskId);
  };

  const onStatusChange = async (task, nextStatus) => {
    setError("");
    statusMutation.mutate({ taskId: task.id, status: nextStatus });
  };

  const loadError =
    projectQuery.error || tasksQuery.error || labelsQuery.error;

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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4">
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
              variant={view === "board" ? "default" : "outline"}
              onClick={() => setView("board")}
            >
              Task Board
            </Button>
            <Button
              type="button"
              variant={view === "list" ? "default" : "outline"}
              onClick={() => setView("list")}
            >
              Task List
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/labels`)}
            >
              Task Labels
            </Button>
            <Button type="button" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Cancel" : "+ New Task"}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <ErrorBanner
          message={
            error ||
            (loadError ? getApiError(loadError, "Failed to load tasks") : "")
          }
        />

        {showCreate && (
          <section className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-4 text-xl font-semibold">Create Task</h2>
            <form
              onSubmit={handleSubmit((data) => {
                setError("");
                createMutation.mutate(data);
              })}
              className="space-y-4"
            >
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </form>
          </section>
        )}

        <section className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Filters
          </h2>
          <div
            className={`grid gap-3 md:grid-cols-3 ${view === "board" ? "lg:grid-cols-5" : "lg:grid-cols-6"}`}
          >
            {view === "list" && (
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
            )}
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
        ) : view === "board" ? (
          tasks.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center dark:border-gray-800 dark:bg-gray-900">
              <p className="text-gray-600 dark:text-gray-400">
                No tasks match your filters.
              </p>
            </div>
          ) : (
            <TaskKanbanBoard
              tasks={tasks}
              members={project?.members || []}
              updatingTaskId={
                statusMutation.isPending
                  ? statusMutation.variables?.taskId
                  : null
              }
              onStatusChange={onStatusChange}
              onOpenTask={(taskId) =>
                navigate(`/projects/${projectId}/tasks/${taskId}`)
              }
            />
          )
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
                    disabled={deleteMutation.isPending}
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
