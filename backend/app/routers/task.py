from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, nulls_last
from app.core.database import get_db
from app.core.security import get_current_user
from app.deps import require_project_member, get_task_in_project
from app.models.user import User
from app.models.project import ProjectMember
from app.models.task import Task
from app.models.label import Label, TaskLabel
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskOut,
    TaskDetailOut,
    TaskStatus,
    TaskPriority,
    TaskSort,
)
from app.schemas.label import LabelSummary

router = APIRouter(tags=["tasks"])

# Rank enums by workflow meaning, not alphabetical string order.
PRIORITY_ORDER = case(
    (Task.priority == "HIGH", 1),
    (Task.priority == "MEDIUM", 2),
    (Task.priority == "LOW", 3),
    else_=4,
)

STATUS_ORDER = case(
    (Task.status == "TODO", 1),
    (Task.status == "IN_PROGRESS", 2),
    (Task.status == "DONE", 3),
    else_=4,
)

SORT_FIELDS = {
    "due_date": Task.due_date,
    "created_at": Task.created_at,
    "title": Task.title,
}


def require_assignee_is_member(project_id: int, assignee_id: int | None, db):
    if assignee_id is None:
        return

    assignee_membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == assignee_id,
        )
        .first()
    )

    if not assignee_membership:
        raise HTTPException(
            status_code=400,
            detail="Assignee must be a member of this project",
        )


def get_task_labels(task_id: int, db) -> list[LabelSummary]:
    labels = (
        db.query(Label)
        .join(TaskLabel, TaskLabel.label_id == Label.id)
        .filter(TaskLabel.task_id == task_id)
        .order_by(Label.name.asc())
        .all()
    )
    return [LabelSummary.model_validate(label) for label in labels]


def to_task_detail(task: Task, db) -> TaskDetailOut:
    return TaskDetailOut(
        id=task.id,
        project_id=task.project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        assignee_id=task.assignee_id,
        reporter_id=task.reporter_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
        labels=get_task_labels(task.id, db),
    )


@router.post("/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    require_assignee_is_member(project_id, task.assignee_id, db)

    new_task = Task(
        project_id=project_id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        assignee_id=task.assignee_id,
        reporter_id=current_user.id,
    )

    db.add(new_task)
    db.commit()
    db.refresh(new_task)

    return new_task


@router.get("/projects/{project_id}/tasks", response_model=list[TaskOut])
def list_tasks(
    project_id: int,
    status: TaskStatus | None = None,
    priority: TaskPriority | None = None,
    sort: TaskSort | None = None,
    assignee_id: int | None = None,
    reporter_id: int | None = None,
    label_id: int | None = None,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)

    query = db.query(Task).filter(Task.project_id == project_id)

    if status:
        query = query.filter(Task.status == status)

    if priority:
        query = query.filter(Task.priority == priority)

    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)

    if reporter_id is not None:
        query = query.filter(Task.reporter_id == reporter_id)

    if label_id is not None:
        query = query.join(TaskLabel, TaskLabel.task_id == Task.id).filter(
            TaskLabel.label_id == label_id
        )

    if sort == "due_date":
        query = query.order_by(nulls_last(Task.due_date.asc()))
    elif sort == "priority":
        query = query.order_by(PRIORITY_ORDER.asc())
    elif sort == "status":
        query = query.order_by(STATUS_ORDER.asc())
    elif sort:
        query = query.order_by(SORT_FIELDS[sort].asc())
    else:
        query = query.order_by(Task.created_at.desc())

    return query.limit(limit).offset(offset).all()


@router.get(
    "/projects/{project_id}/tasks/{task_id}",
    response_model=TaskDetailOut,
)
def get_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    task = get_task_in_project(project_id, task_id, db)
    return to_task_detail(task, db)


@router.patch("/projects/{project_id}/tasks/{task_id}", response_model=TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    existing_task = get_task_in_project(project_id, task_id, db)

    update_data = task_data.model_dump(exclude_unset=True)

    if "assignee_id" in update_data:
        require_assignee_is_member(project_id, update_data["assignee_id"], db)

    for field, value in update_data.items():
        setattr(existing_task, field, value)

    db.commit()
    db.refresh(existing_task)

    return existing_task


@router.delete("/projects/{project_id}/tasks/{task_id}")
def delete_task(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    existing_task = get_task_in_project(project_id, task_id, db)

    db.delete(existing_task)
    db.commit()

    return {"message": "Task deleted successfully."}
