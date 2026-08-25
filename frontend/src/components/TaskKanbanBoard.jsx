import { useState } from "react";
import { TaskPriorityBadge } from "@/components/TaskBadges";
import { formatDateShort } from "@/lib/utils";
import { cn } from "@/lib/utils";

const COLUMNS = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "In Progress" },
  { id: "DONE", label: "Done" },
];

function KanbanCard({
  task,
  members,
  onOpen,
  draggingTaskId,
  onDragStart,
  onDragEnd,
}) {
  const assigneeName = task.assignee_id
    ? members?.find((m) => m.user_id === task.assignee_id)?.name ||
      `#${task.assignee_id}`
    : null;

  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      className={cn(
        "cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing dark:border-gray-700 dark:bg-gray-800",
        draggingTaskId === task.id && "opacity-50",
      )}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onOpen(task.id)}
      >
        <h3 className="font-semibold leading-snug">{task.title}</h3>
        {task.description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
            {task.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <TaskPriorityBadge priority={task.priority} />
          {task.due_date && <span>Due {formatDateShort(task.due_date)}</span>}
          {assigneeName && <span>{assigneeName}</span>}
        </div>
      </button>
    </article>
  );
}

export default function TaskKanbanBoard({
  tasks,
  members = [],
  onStatusChange,
  onOpenTask,
  updatingTaskId = null,
}) {
  const [draggingTaskId, setDraggingTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

  const onDragStart = (event, task) => {
    event.dataTransfer.setData("text/plain", String(task.id));
    event.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(task.id);
  };

  const onDragEnd = () => {
    setDraggingTaskId(null);
    setDropTarget(null);
  };

  const onDragOver = (event, status) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(status);
  };

  const onDrop = async (event, status) => {
    event.preventDefault();
    const rawId = event.dataTransfer.getData("text/plain");
    const taskId = Number(rawId);
    setDropTarget(null);
    setDraggingTaskId(null);

    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === status) return;

    await onStatusChange(task, status);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {COLUMNS.map((column) => {
        const columnTasks = tasks.filter((task) => task.status === column.id);
        const isActive = dropTarget === column.id;

        return (
          <section
            key={column.id}
            onDragOver={(e) => onDragOver(e, column.id)}
            onDragLeave={() => {
              if (dropTarget === column.id) setDropTarget(null);
            }}
            onDrop={(e) => onDrop(e, column.id)}
            className={cn(
              "flex min-h-[28rem] flex-col rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900",
              isActive && "border-blue-400 bg-blue-50/60 dark:border-blue-600 dark:bg-blue-950/30",
            )}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                {column.label}
              </h2>
              <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {columnTasks.length}
              </span>
            </header>

            <div className="flex flex-1 flex-col gap-3">
              {columnTasks.length === 0 ? (
                <p className="px-1 text-sm text-gray-500 dark:text-gray-400">
                  Drop tasks here
                </p>
              ) : (
                columnTasks.map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      updatingTaskId === task.id && "pointer-events-none opacity-60",
                    )}
                  >
                    <KanbanCard
                      task={task}
                      members={members}
                      onOpen={onOpenTask}
                      draggingTaskId={draggingTaskId}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
