/* Append the current user id so cached data cannot leak across sessions. */
export function authQueryKey(baseKey, userId) {
  return userId != null ? [...baseKey, userId] : baseKey;
}

export const queryKeys = {
  dashboard: {
    stats: ["dashboard", "stats"],
  },
  users: {
    all: ["users"],
  },
  projects: {
    all: ["projects"],
    detail: (id) => ["projects", String(id)],
  },
  tasks: {
    list: (projectId, filters = {}) => [
      "projects",
      String(projectId),
      "tasks",
      filters,
    ],
    detail: (projectId, taskId) => [
      "projects",
      String(projectId),
      "tasks",
      String(taskId),
    ],
  },
  labels: {
    list: (projectId) => ["projects", String(projectId), "labels"],
  },
  comments: {
    list: (projectId, taskId) => [
      "projects",
      String(projectId),
      "tasks",
      String(taskId),
      "comments",
    ],
  },
};
