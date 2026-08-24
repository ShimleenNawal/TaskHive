import client from "@/api/client";

export async function fetchDashboardStats() {
  const { data } = await client.get("/dashboard/stats");
  return data;
}

export async function fetchProjects() {
  const { data } = await client.get("/projects");
  return data;
}

export async function fetchProject(projectId) {
  const { data } = await client.get(`/projects/${projectId}`);
  return data;
}

export async function fetchUsers() {
  const { data } = await client.get("/users/");
  return data;
}

export async function fetchTasks(projectId, params = {}) {
  const { data } = await client.get(`/projects/${projectId}/tasks`, { params });
  return data;
}

export async function fetchTask(projectId, taskId) {
  const { data } = await client.get(`/projects/${projectId}/tasks/${taskId}`);
  return data;
}

export async function fetchLabels(projectId) {
  const { data } = await client.get(`/projects/${projectId}/labels`);
  return data;
}

export async function fetchComments(projectId, taskId) {
  const { data } = await client.get(
    `/projects/${projectId}/tasks/${taskId}/comments`,
  );
  return data;
}

export function buildTaskListParams({ view, filters }) {
  const params = {};
  if (view === "list" && filters.status) params.status = filters.status;
  if (filters.priority) params.priority = filters.priority;
  if (filters.assignee_id) params.assignee_id = filters.assignee_id;
  if (filters.reporter_id) params.reporter_id = filters.reporter_id;
  if (filters.label_id) params.label_id = filters.label_id;
  if (filters.sort) params.sort = filters.sort;
  return params;
}
