from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import nulls_last
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import ProjectMember
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate, TaskOut, TaskStatus, TaskPriority, TaskSort

router = APIRouter(tags=["tasks"])

SORT_FIELDS = {
    "due_date": Task.due_date,
    "created_at": Task.created_at,
    "priority": Task.priority,
    "status": Task.status,
    "title": Task.title,
}

def require_project_member(project_id: int, user_id: int, db):
    membership = (
        db.query(ProjectMember)
        .filter(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
        .first()
    )

    if not membership:
        raise HTTPException(status_code = 404, detail = "Project not found")

    return membership

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
        raise HTTPException(status_code = 400, detail = "Assignee must be a member of this project")

def get_task_in_project(project_id: int, task_id: int, db):
    task = (
        db.query(Task)
        .filter(
            Task.id == task_id,
            Task.project_id == project_id,
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code = 404, detail = "Task not found")

    return task


@router.post("/projects/{project_id}/tasks", response_model=TaskOut)
def create_task(
    project_id: int,
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)):
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
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)):
    require_project_member(project_id, current_user.id, db)

    query = db.query(Task).filter(Task.project_id == project_id)

    if status:
        query = query.filter(Task.status == status)

    if priority:
        query = query.filter(Task.priority == priority)

    if sort == "due_date":
        query = query.order_by(nulls_last(Task.due_date.asc()))
    elif sort:
        query = query.order_by(SORT_FIELDS[sort].asc())
    else:
        query = query.order_by(Task.created_at.desc())

    return query.all()

@router.put("/projects/{project_id}/tasks/{task_id}", response_model=TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db)):
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
    db=Depends(get_db)):
    require_project_member(project_id, current_user.id, db)
    existing_task = get_task_in_project(project_id, task_id, db)

    db.delete(existing_task)
    db.commit()

    return {"message": "Task deleted successfully."}
