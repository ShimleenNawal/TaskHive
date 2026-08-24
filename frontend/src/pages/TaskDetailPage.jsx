import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import client from "@/api/client";
import { Button } from "@/components/ui/button";
import ErrorBanner from "@/components/ErrorBanner";
import LabelChip from "@/components/LabelChip";
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/TaskBadges";
import { taskSchema } from "@/schemas/taskSchema";
import { commentSchema } from "@/schemas/commentSchema";
import { formatDate, getApiError } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export default function TaskDetailPage() {
  const { id: projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [labels, setLabels] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [selectedLabelId, setSelectedLabelId] = useState("");
  const [editingCommentId, setEditingCommentId] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(taskSchema),
  });

  const {
    register: registerComment,
    handleSubmit: handleCommentSubmit,
    reset: resetComment,
    formState: { errors: commentErrors, isSubmitting: postingComment },
  } = useForm({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: "" },
  });

  const {
    register: registerEditComment,
    handleSubmit: handleEditCommentSubmit,
    reset: resetEditComment,
    formState: { errors: editCommentErrors, isSubmitting: savingComment },
  } = useForm({
    resolver: zodResolver(commentSchema),
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchTask() {
      try {
        setError("");
        const [taskRes, projectRes, labelsRes, commentsRes] = await Promise.all(
          [
            client.get(`/projects/${projectId}/tasks/${taskId}`),
            client.get(`/projects/${projectId}`),
            client.get(`/projects/${projectId}/labels`),
            client.get(`/projects/${projectId}/tasks/${taskId}/comments`),
          ],
        );

        if (cancelled) return;

        setTask(taskRes.data);
        setProject(projectRes.data);
        setLabels(labelsRes.data);
        setComments(commentsRes.data);
        reset({
          title: taskRes.data.title,
          description: taskRes.data.description || "",
          status: taskRes.data.status,
          priority: taskRes.data.priority,
          due_date: taskRes.data.due_date
            ? new Date(taskRes.data.due_date).toISOString().slice(0, 16)
            : "",
          assignee_id: taskRes.data.assignee_id
            ? String(taskRes.data.assignee_id)
            : "",
        });
      } catch (err) {
        if (!cancelled) {
          setError(getApiError(err, "Failed to load task"));
          setTask(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTask();
    return () => {
      cancelled = true;
    };
  }, [projectId, taskId, reset]);

  const onUpdateTask = async (data) => {
    try {
      setError("");
      const res = await client.put(`/projects/${projectId}/tasks/${taskId}`, {
        title: data.title,
        description: data.description || null,
        status: data.status,
        priority: data.priority,
        due_date: data.due_date ? new Date(data.due_date).toISOString() : null,
        assignee_id: data.assignee_id ? Number(data.assignee_id) : null,
      });
      setTask((current) => ({
        ...current,
        ...res.data,
        labels: current?.labels || [],
      }));
      setEditing(false);
    } catch (err) {
      setError(getApiError(err, "Failed to update task"));
    }
  };

  const onDeleteTask = async () => {
    if (!window.confirm("Delete this task permanently?")) return;
    try {
      await client.delete(`/projects/${projectId}/tasks/${taskId}`);
      navigate(`/projects/${projectId}/tasks`);
    } catch (err) {
      setError(getApiError(err, "Failed to delete task"));
    }
  };

  const onTagLabel = async () => {
    if (!selectedLabelId) return;
    try {
      setTagging(true);
      setError("");
      const res = await client.post(
        `/projects/${projectId}/tasks/${taskId}/labels`,
        { label_id: Number(selectedLabelId) },
      );
      setTask(res.data);
      setSelectedLabelId("");
    } catch (err) {
      setError(getApiError(err, "Failed to tag label"));
    } finally {
      setTagging(false);
    }
  };

  const onUntagLabel = async (labelId) => {
    try {
      setError("");
      const res = await client.delete(
        `/projects/${projectId}/tasks/${taskId}/labels/${labelId}`,
      );
      setTask(res.data);
    } catch (err) {
      setError(getApiError(err, "Failed to remove label"));
    }
  };

  const onAddComment = async (data) => {
    try {
      setError("");
      await client.post(`/projects/${projectId}/tasks/${taskId}/comments`, {
        body: data.body,
      });
      resetComment({ body: "" });
      const commentsRes = await client.get(
        `/projects/${projectId}/tasks/${taskId}/comments`,
      );
      setComments(commentsRes.data);
    } catch (err) {
      setError(getApiError(err, "Failed to post comment"));
    }
  };

  const onSaveComment = async (commentId, data) => {
    try {
      setError("");
      await client.patch(
        `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
        { body: data.body },
      );
      setEditingCommentId(null);
      const commentsRes = await client.get(
        `/projects/${projectId}/tasks/${taskId}/comments`,
      );
      setComments(commentsRes.data);
    } catch (err) {
      setError(getApiError(err, "Failed to update comment"));
    }
  };

  const onDeleteComment = async (commentId) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      setError("");
      await client.delete(
        `/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      );
      setComments((current) => current.filter((c) => c.id !== commentId));
    } catch (err) {
      setError(getApiError(err, "Failed to delete comment"));
    }
  };

  const isOwner = user?.id === project?.owner_id;
  const untaggedLabels = labels.filter(
    (label) => !task?.labels?.some((t) => t.id === label.id),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 dark:bg-gray-950 dark:text-white">
        <p>Loading task...</p>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-white p-8 dark:bg-gray-950 dark:text-white">
        <ErrorBanner message={error || "Task not found"} />
        <Button onClick={() => navigate(`/projects/${projectId}/tasks`)}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}/tasks`)}
          >
            ← Tasks
          </Button>
          <div className="flex gap-2">
            {!editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
            <Button type="button" variant="destructive" onClick={onDeleteTask}>
              Delete
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <ErrorBanner message={error} />

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          {!editing ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">{task.title}</h1>
                <TaskStatusBadge status={task.status} />
                <TaskPriorityBadge priority={task.priority} />
              </div>
              {task.description && (
                <p className="mt-4 whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                  {task.description}
                </p>
              )}
              <div className="mt-4 space-y-1 text-sm text-gray-500 dark:text-gray-400">
                {task.due_date && <p>Due: {formatDate(task.due_date)}</p>}
                {task.assignee_id && (
                  <p>
                    Assignee:{" "}
                    {project?.members?.find(
                      (m) => m.user_id === task.assignee_id,
                    )?.name || `#${task.assignee_id}`}
                  </p>
                )}
                <p>
                  Reporter:{" "}
                  {project?.members?.find((m) => m.user_id === task.reporter_id)
                    ?.name || `#${task.reporter_id}`}
                </p>
                <p>Created: {formatDate(task.created_at)}</p>
                {task.updated_at && (
                  <p>Updated: {formatDate(task.updated_at)}</p>
                )}
              </div>
            </>
          ) : (
            <form onSubmit={handleSubmit(onUpdateTask)} className="space-y-4">
              <h2 className="text-xl font-semibold">Edit Task</h2>
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
                  rows={4}
                  {...register("description")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <select
                  {...register("status")}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="TODO">TODO</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="DONE">DONE</option>
                </select>
                <select
                  {...register("priority")}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                </select>
                <input
                  type="datetime-local"
                  {...register("due_date")}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
                <select
                  {...register("assignee_id")}
                  className="rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                >
                  <option value="">Unassigned</option>
                  {project?.members?.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold">Labels</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {task.labels?.length ? (
              task.labels.map((label) => (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => onUntagLabel(label.id)}
                  className="group"
                  title="Click to remove"
                >
                  <LabelChip name={`${label.name} ×`} color={label.color} />
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No labels attached.
              </p>
            )}
          </div>
          {untaggedLabels.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                value={selectedLabelId}
                onChange={(e) => setSelectedLabelId(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <option value="">Add label...</option>
                {untaggedLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedLabelId || tagging}
                onClick={onTagLabel}
              >
                {tagging ? "Adding..." : "Tag"}
              </Button>
            </div>
          )}
          {labels.length === 0 && (
            <p className="mt-2 text-sm text-gray-500">
              <button
                type="button"
                className="text-blue-600 underline"
                onClick={() => navigate(`/projects/${projectId}/labels`)}
              >
                Create project labels
              </button>{" "}
              to tag this task.
            </p>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-xl font-semibold">Comments</h2>
          <form
            onSubmit={handleCommentSubmit(onAddComment)}
            className="mt-4 space-y-2"
          >
            <textarea
              rows={3}
              placeholder="Write a comment..."
              {...registerComment("body")}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
            />
            {commentErrors.body && (
              <p className="text-sm text-red-600">
                {commentErrors.body.message}
              </p>
            )}
            <Button type="submit" disabled={postingComment}>
              {postingComment ? "Posting..." : "Post Comment"}
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            {comments.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No comments yet.
              </p>
            ) : (
              comments.map((comment) => {
                const canEdit = comment.author_id === user?.id;
                const canDelete = canEdit || isOwner;
                const isEditingThis = editingCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{comment.author_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(comment.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {canEdit && !isEditingThis && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              resetEditComment({ body: comment.body });
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => onDeleteComment(comment.id)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                    {isEditingThis ? (
                      <form
                        onSubmit={handleEditCommentSubmit((data) =>
                          onSaveComment(comment.id, data),
                        )}
                        className="mt-3 space-y-2"
                      >
                        <textarea
                          rows={3}
                          {...registerEditComment("body")}
                          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                        />
                        {editCommentErrors.body && (
                          <p className="text-sm text-red-600">
                            {editCommentErrors.body.message}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            disabled={savingComment}
                          >
                            Save
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCommentId(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm">
                        {comment.body}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
