from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.database import get_db
from app.core.security import get_current_user
from app.deps import require_project_member, get_task_in_project
from app.models.user import User
from app.models.label import Label, TaskLabel
from app.schemas.label import LabelCreate, LabelUpdate, LabelOut, TaskLabelCreate
from app.schemas.task import TaskDetailOut
from app.routers.task import to_task_detail

router = APIRouter(tags=["labels"])

DEFAULT_LABEL_COLOR = "#6B7280"


def get_label_in_project(project_id: int, label_id: int, db):
    label = (
        db.query(Label)
        .filter(
            Label.id == label_id,
            Label.project_id == project_id,
        )
        .first()
    )

    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    return label


@router.post(
    "/projects/{project_id}/labels",
    response_model=LabelOut,
    status_code=status.HTTP_201_CREATED,
)
def create_label(
    project_id: int,
    label_data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)

    existing = (
        db.query(Label)
        .filter(
            Label.project_id == project_id,
            Label.name == label_data.name,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Label name already exists")

    label = Label(
        project_id=project_id,
        name=label_data.name,
        color=label_data.color or DEFAULT_LABEL_COLOR,
        created_by=current_user.id,
    )

    db.add(label)
    db.commit()
    db.refresh(label)

    return label


@router.get("/projects/{project_id}/labels", response_model=list[LabelOut])
def list_labels(
    project_id: int,
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)

    return (
        db.query(Label)
        .filter(Label.project_id == project_id)
        .order_by(Label.name.asc())
        .limit(limit)
        .offset(offset)
        .all()
    )


@router.patch(
    "/projects/{project_id}/labels/{label_id}",
    response_model=LabelOut,
)
def update_label(
    project_id: int,
    label_id: int,
    label_data: LabelUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    label = get_label_in_project(project_id, label_id, db)

    update_data = label_data.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=422, detail="No fields to update")

    if "name" in update_data:
        clash = (
            db.query(Label)
            .filter(
                Label.project_id == project_id,
                Label.name == update_data["name"],
                Label.id != label_id,
            )
            .first()
        )
        if clash:
            raise HTTPException(status_code=409, detail="Label name already exists")

    for field, value in update_data.items():
        setattr(label, field, value)

    db.commit()
    db.refresh(label)

    return label


@router.delete("/projects/{project_id}/labels/{label_id}")
def delete_label(
    project_id: int,
    label_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    label = get_label_in_project(project_id, label_id, db)

    db.delete(label)
    db.commit()

    return {"message": "Label deleted successfully."}


@router.post(
    "/projects/{project_id}/tasks/{task_id}/labels",
    response_model=TaskDetailOut,
    status_code=status.HTTP_201_CREATED,
)
def tag_task(
    project_id: int,
    task_id: int,
    tag_data: TaskLabelCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    task = get_task_in_project(project_id, task_id, db)

    label = db.query(Label).filter(Label.id == tag_data.label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    if label.project_id != project_id:
        raise HTTPException(
            status_code=400,
            detail="Label must belong to the same project as the task",
        )

    existing = (
        db.query(TaskLabel)
        .filter(
            TaskLabel.task_id == task_id,
            TaskLabel.label_id == tag_data.label_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Label is already attached to this task",
        )

    db.add(
        TaskLabel(
            task_id=task_id,
            label_id=tag_data.label_id,
            tagged_by=current_user.id,
        )
    )
    db.commit()

    return to_task_detail(task, db)


@router.delete(
    "/projects/{project_id}/tasks/{task_id}/labels/{label_id}",
    response_model=TaskDetailOut,
)
def untag_task(
    project_id: int,
    task_id: int,
    label_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    task = get_task_in_project(project_id, task_id, db)

    tagged = (
        db.query(TaskLabel)
        .filter(
            TaskLabel.task_id == task_id,
            TaskLabel.label_id == label_id,
        )
        .first()
    )
    if not tagged:
        raise HTTPException(
            status_code=404,
            detail="Label is not attached to this task",
        )

    db.delete(tagged)
    db.commit()

    return to_task_detail(task, db)
