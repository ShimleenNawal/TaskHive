import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { projectSchema, inviteSchema } from "@/schemas/projectSchema";
import { useAuth } from "../context/AuthContext";

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

  const token = localStorage.getItem("access_token");
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

  // GET /api/projects/{project_id}
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `http://localhost:8000/api/projects/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          },
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load project");
        }

        setProject(data);

        resetProject({
          name: data.name || "",
          description: data.description || "",
          deadline: data.deadline
            ? new Date(data.deadline).toISOString().slice(0, 16)
            : "",
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, token, resetProject]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);

        const response = await fetch("http://localhost:8000/api/users/", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load users");
        }

        setUsers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isOwner) {
      fetchUsers();
    }
  }, [token, isOwner]);

  // PATCH /api/projects/{project_id}
  const updateProject = async (data) => {
    try {
      setError("");

      const response = await fetch(`http://localhost:8000/api/projects/${id}`, {
        method: "PATCH",
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
        throw new Error(result.detail || "Failed to update project");
      }

      setProject((current) => ({
        ...current,
        ...result,
      }));

      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  };

  // DELETE /api/projects/{project_id}
  const deleteProject = async () => {
    if (!window.confirm("Are you sure you want to delete this project?")) {
      return;
    }

    try {
      setDeleting(true);
      setError("");

      const response = await fetch(`http://localhost:8000/api/projects/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to delete project");
      }

      navigate("/projects");
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  // POST /api/projects/{project_id}/members
  const inviteMember = async (data) => {
    try {
      setInviting(true);
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/projects/${id}/members`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email: data.email,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to invite member");
      }

      // Refresh project to get the updated members list
      const projectResponse = await fetch(
        `http://localhost:8000/api/projects/${id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      const updatedProject = await projectResponse.json();

      if (!projectResponse.ok) {
        throw new Error(updatedProject.detail || "Failed to refresh project");
      }

      setProject(updatedProject);
      resetInvite();
    } catch (err) {
      setError(err.message);
    } finally {
      setInviting(false);
    }
  };

  // DELETE /api/projects/{project_id}/members/{user_id}
  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member from the project?")) {
      return;
    }

    try {
      setError("");

      const response = await fetch(
        `http://localhost:8000/api/projects/${id}/members/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Failed to remove member");
      }

      setProject((current) => ({
        ...current,
        members: current.members.filter((member) => member.user_id !== userId),
      }));
    } catch (err) {
      setError(err.message);
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
        <p className="text-red-600">{error || "Project not found"}</p>

        <Button className="mt-4" onClick={() => navigate("/projects")}>
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-gray-950 dark:text-white">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/projects")}
          >
            ← Projects
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/projects/${id}/tasks`)}
          >
            → Tasks
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Project details */}
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
                  Created: {new Date(project.created_at).toLocaleDateString()}
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
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium"
                >
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

                {projectErrors.description && (
                  <p className="mt-1 text-sm text-red-600">
                    {projectErrors.description.message}
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
                  onClick={() => {
                    setEditing(false);
                    resetProject({
                      name: project.name || "",
                      description: project.description || "",
                      deadline: project.deadline
                        ? new Date(project.deadline).toISOString().slice(0, 16)
                        : "",
                    });
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </section>

        {/* Members */}
        <section className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-2xl font-bold">Members</h2>

          <div className="mt-6 space-y-3">
            {project.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-gray-700/50"
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
              <p className="text-gray-500 dark:text-gray-400">
                No members yet.
              </p>
            )}
          </div>
        </section>

        {/* Invite */}
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
