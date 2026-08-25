const STATUS_STYLES = {
  TODO: "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DONE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

const PRIORITY_STYLES = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-600",
  HIGH: "text-red-600",
};

export function TaskStatusBadge({ status }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] || STATUS_STYLES.TODO}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export function TaskPriorityBadge({ priority }) {
  return (
    <span className={`text-xs font-semibold ${PRIORITY_STYLES[priority] || ""}`}>
      {priority}
    </span>
  );
}
