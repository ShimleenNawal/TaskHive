from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project import ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut 

router = APIRouter()

@router.post("/projects", response_model = ProjectOut)
def create_project(project: ProjectCreate, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    new_project = Project(
        name = project.name,
        description = project.description,
        deadline = project.deadline,
        owner_id = current_user.id,
    )

    db.add(new_project)
    db.commit()
    db.refresh(new_project)

    # Add project creator as OWNER
    membership = ProjectMember(
        project_id = new_project.id,
        user_id = current_user.id,
        role = "OWNER",
    )

    db.add(membership)
    db.commit()

    return new_project

@router.get("/projects", response_model=list[ProjectOut])
def list_projects(current_user: User = Depends(get_current_user), db = Depends(get_db)):
    projects = (
        db.query(Project)
        .join(ProjectMember, ProjectMember.project_id == Project.id)
        .filter(ProjectMember.user_id == current_user.id)
        .all()
    )

    return projects

@router.patch("/projects/{project_id}", response_model = ProjectOut)
def update_project(project_id: int, project_data: ProjectUpdate, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    existing_project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if not existing_project:
        raise HTTPException(status_code = 404, detail = "Project not found or you are not the owner")

    update_data = project_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(existing_project, field, value)

    db.commit()
    db.refresh(existing_project)

    return existing_project

@router.delete("/projects/{project_id}")
def delete_project(project_id: int, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    existing_project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.owner_id == current_user.id,
        )
        .first()
    )

    if not existing_project:
        raise HTTPException(status_code = 404, detail = "Project not found or you are not the owner")

    db.delete(existing_project)
    db.commit()

    return {"message": "Project deleted successfully."}