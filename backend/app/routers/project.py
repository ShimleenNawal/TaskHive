from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.project import ProjectMember
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectOut, MemberInvite 

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
    db.flush()

    # Add project creator as OWNER
    membership = ProjectMember(
        project_id = new_project.id,
        user_id = current_user.id,
        role = "OWNER",
    )

    db.add(membership)
    db.commit()
    db.refresh(new_project)

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

@router.post("/projects/{project_id}/members")
def invite_member(project_id: int, member_data: MemberInvite, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    # Find the project
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code = 404, detail = "Project not found")

    # Only project owner can invite members
    if project.owner_id != current_user.id:
        raise HTTPException(status_code = 403, detail = "Only the project owner can add members")

    # Find the user being invited
    user = db.query(User).filter(User.email == member_data.email).first()

    if not user:
        raise HTTPException(status_code = 404, detail = "User not found")

    if user.id == project.owner_id:
        raise HTTPException(status_code = 409, detail = "You are already the project owner")

    # Check whether they're already a member
    existing_member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user.id,
    ).first()

    if existing_member:
        raise HTTPException(status_code = 409, detail = "User is already a member")

    # Add member
    member = ProjectMember(
        project_id = project_id,
        user_id = user.id,
        role = "MEMBER",
    )

    db.add(member)
    db.commit()
    db.refresh(member)

    return {
        "message": "Member added successfully.",
        "user_id": user.id,
        "project_id": project_id,
        "role": member.role,
    }

@router.delete("/projects/{project_id}/members/{user_id}")
def remove_member(project_id: int, user_id: int, current_user: User = Depends(get_current_user), db = Depends(get_db)):
    # Find the project
    project = db.query(Project).filter(Project.id == project_id).first()

    if not project:
        raise HTTPException(status_code = 404, detail = "Project not found")

    # Only project owner can remove members
    if project.owner_id != current_user.id:
        raise HTTPException(status_code = 403, detail = "Only the project owner can remove members")

    # Find membership
    member = db.query(ProjectMember).filter(
        ProjectMember.project_id == project_id,
        ProjectMember.user_id == user_id,
    ).first()

    if not member:
        raise HTTPException(status_code = 404, detail = "User is not a member of this project")

    # Cannot allow removing the owner
    if member.role == "OWNER":
        raise HTTPException(status_code = 400, detail = "Project owner cannot be removed")

    db.delete(member)
    db.commit()

    return {
        "message": "Member removed successfully."
    }