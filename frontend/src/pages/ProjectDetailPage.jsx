import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { projectSchema, inviteSchema } from "@/schemas/projectSchema";
import { useAuth } from "@/hooks/useAuth";
import client from "@/api/client";
import ErrorBanner from "@/components/ErrorBanner";
import { formatDateShort, getApiError } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const { user } = useAuth();
  const isOwner = user?.id === project?.owner_id;

  const {
    register: registerProject,
    handleSubmit: handleProjectSubmit,
    reset: resetProject,
    formState: { errors: projectErrors, isSubmitting: updating },
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
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await client.get(`/projects/${id}`);
        setProject(response.data);
        resetProject({
          name: response.data.name || "",
          description: response.data.description || "",
          deadline: response.data.deadline
            ? new Date(response.data.deadline).toISOString().slice(0, 16)
            : "",
        });
      } catch (err) {
        setError(getApiError(err, "Failed to load project"));
        setProject(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, resetProject]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await client.get("/users/");
        setUsers(response.data);
      } catch (err) {
        setError(getApiError(err, "Failed to load users"));
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOwner) {
      fetchUsers();
    }
  }, [isOwner]);

  const updateProject = async (data) => {
    try {
      setError("");
      const response = await client.patch(`/projects/${id}`, {
        name: data.name,
        description: data.description || null,
        deadline: data.deadline ? new Date(data.deadline).toISOString() : null,
      });
      setProject((current) => ({ ...current, ...response.data }));
      setEditing(false);
    } catch (err) {
      setError(getApiError(err, "Failed to update project"));
    }
  };

  const deleteProject = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      setDeleting(true);
      setError("");
      await client.delete(`/projects/${id}`);
      navigate("/projects");
    } catch (err) {
      setError(getApiError(err, "Failed to delete project"));
      setDeleting(false);
    }
  };

  const inviteMember = async (data) => {
    try {
      setInviting(true);
      setError("");
      await client.post(`/projects/${id}/members`, { email: data.email });
      const projectResponse = await client.get(`/projects/${id}`);
      setProject(projectResponse.data);
      resetInvite();
    } catch (err) {
      setError(getApiError(err, "Failed to invite member"));
    } finally {
      setInviting(false);
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member from the project?")) {
      return;
    }

    try {
      setError("");
      await client.delete(`/projects/${id}/members/${userId}`);
      setProject((current) => ({
        ...current,
        members: current.members.filter((member) => member.user_id !== userId),
      }));
    } catch (err) {
      setError(getApiError(err, "Failed to remove member"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 text-black dark:bg-gray-950 dark:text-white">
        <p>Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-white p-8 text-black dark:bg-gray-950 dark:text-white">
        <ErrorBanner message={error || "Project not found"} />
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
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete"}
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
              onSubmit={handleProjectSubmit(updateProject)}
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
                <Button type="submit" disabled={updating}>
                  {updating ? "Saving..." : "Save Changes"}
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
              onSubmit={handleInviteSubmit(inviteMember)}
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <div className="flex-1">
                <select
                  {...registerInvite("email")}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                  disabled={loadingUsers || inviting}
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

              <Button type="submit" disabled={inviting || loadingUsers}>
                {inviting ? "Inviting..." : "Invite Member"}
              </Button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
