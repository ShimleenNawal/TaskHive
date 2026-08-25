import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { projectSchema, inviteSchema } from "@/schemas/projectSchema";
import { useAuth } from "@/hooks/useAuth";
import client from "@/api/client";
import ErrorBanner from "@/components/ErrorBanner";
import {
  datetimeLocalToIso,
  formatDateShort,
  getApiError,
  toDatetimeLocalValue,
} from "@/lib/utils";
import { authQueryKey, queryKeys } from "@/api/queryKeys";
import { fetchProject, fetchUsers } from "@/api/queries";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const {
    data: project,
    isLoading,
    error: projectError,
  } = useQuery({
    queryKey: authQueryKey(queryKeys.projects.detail(id), user?.id),
    queryFn: () => fetchProject(id),
    enabled: Boolean(user?.id),
  });

  const isOwner = user?.id === project?.owner_id;

  const {
    data: users = [],
    isLoading: loadingUsers,
  } = useQuery({
    queryKey: authQueryKey(queryKeys.users.all, user?.id),
    queryFn: fetchUsers,
    enabled: Boolean(isOwner && user?.id),
  });

  const {
    register: registerProject,
    handleSubmit: handleProjectSubmit,
    reset: resetProject,
    formState: { errors: projectErrors },
  } = useForm({
    resolver: zodResolver(projectSchema),
  });

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    reset: resetInvite,
    formState: { errors: inviteErrors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
  });

  useEffect(() => {
    if (!project) return;
    resetProject({
      name: project.name || "",
      description: project.description || "",
      deadline: toDatetimeLocalValue(project.deadline),
    });
  }, [project, resetProject]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await client.patch(`/projects/${id}`, {
        name: data.name,
        description: data.description || null,
        deadline: datetimeLocalToIso(data.deadline),
      });
      return response.data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(
        authQueryKey(queryKeys.projects.detail(id), user?.id),
        (current) => ({
        ...current,
        ...updated,
      }));
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      setEditing(false);
    },
    onError: (err) => setError(getApiError(err, "Failed to update project")),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await client.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      navigate("/projects");
    },
    onError: (err) => setError(getApiError(err, "Failed to delete project")),
  });

  const inviteMutation = useMutation({
    mutationFn: async (data) => {
      await client.post(`/projects/${id}/members`, { email: data.email });
      return fetchProject(id);
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(
        authQueryKey(queryKeys.projects.detail(id), user?.id),
        fresh,
      );
      resetInvite();
    },
    onError: (err) => setError(getApiError(err, "Failed to invite member")),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId) => {
      await client.delete(`/projects/${id}/members/${userId}`);
      return userId;
    },
    onSuccess: (userId) => {
      queryClient.setQueryData(
        authQueryKey(queryKeys.projects.detail(id), user?.id),
        (current) => ({
        ...current,
        members: current.members.filter((member) => member.user_id !== userId),
      }));
    },
    onError: (err) => setError(getApiError(err, "Failed to remove member")),
  });

  const deleteProject = () => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    setError("");
    deleteMutation.mutate();
  };

  const removeMember = (userId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    setError("");
    removeMemberMutation.mutate(userId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-8 text-black dark:bg-gray-950 dark:text-white">
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white p-8 text-black dark:bg-gray-950 dark:text-white">
        <ErrorBanner
          message={
            getApiError(projectError, "Failed to load project") ||
            "Project not found"
          }
        />
        <Button className="mt-4" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
          >
            ← Projects
          </Button>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${id}/labels`)}
            >
              Labels
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/projects/${id}/tasks`)}
            >
              Tasks
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <ErrorBanner message={error} />

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {!editing ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                  {project.description && (
                    <p className="mt-3 text-gray-600 dark:text-gray-400">
                      {project.description}
                    </p>
                  )}
                </div>

                {isOwner && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditing(true)}
                    >
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={deleteProject}
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending ? "Deleting..." : "Delete"}
                    </Button>
                  </div>
                )}
              </div>

              {project.deadline && (
                <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                  Deadline: {new Date(project.deadline).toLocaleString()}
                </p>
              )}

              {project.created_at && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Created: {formatDateShort(project.created_at)}
                </p>
              )}
            </>
          ) : (
            <form
              onSubmit={handleProjectSubmit((data) => {
                setError("");
                updateMutation.mutate(data);
              })}
              className="space-y-5"
            >
              <h2 className="text-2xl font-bold">Edit Project</h2>

              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
                  Project Name
                </label>
                <input
                  id="name"
                  {...registerProject("name")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
                {projectErrors.name && (
                  <p className="mt-1 text-sm text-red-600">
                    {projectErrors.name.message}
                  </p>
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
                  {...registerProject("description")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
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
                  {...registerProject("deadline")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
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

        <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-2xl font-bold">Members</h2>

          <div className="mt-6 space-y-3">
            {project.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.email}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={
                      member.role === "OWNER"
                        ? "text-sm font-medium text-blue-600"
                        : "text-sm text-gray-500 dark:text-gray-400"
                    }
                  >
                    {member.role}
                  </span>

                  {isOwner && member.role !== "OWNER" && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => removeMember(member.user_id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {!project.members?.length && (
              <p className="text-gray-500 dark:text-gray-400">No members yet.</p>
            )}
          </div>
        </section>

        {isOwner && (
          <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h2 className="text-2xl font-bold">Invite Member</h2>

            <form
              onSubmit={handleInviteSubmit((data) => {
                setError("");
                inviteMutation.mutate(data);
              })}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <select
                  {...registerInvite("email")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  disabled={loadingUsers || inviteMutation.isPending}
                >
                  <option value="">
                    {loadingUsers ? "Loading users..." : "Select a member"}
                  </option>

                  {users
                    .filter(
                      (availableUser) =>
                        !project.members?.some(
                          (member) => member.user_id === availableUser.id,
                        ),
                    )
                    .map((availableUser) => (
                      <option
                        key={availableUser.id}
                        value={availableUser.email}
                      >
                        {availableUser.name} — {availableUser.email}
                      </option>
                    ))}
                </select>

                {inviteErrors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {inviteErrors.email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={inviteMutation.isPending || loadingUsers}
              >
                {inviteMutation.isPending ? "Inviting..." : "Invite Member"}
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
