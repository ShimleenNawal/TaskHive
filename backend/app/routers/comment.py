from fastapi import APIRouter, Depends, HTTPException, status
from app.core.database import get_db
from app.core.security import get_current_user
from app.deps import require_project_member, get_task_in_project, get_project_or_404
from app.models.user import User
from app.models.comment import Comment
from app.schemas.comment import CommentCreate, CommentUpdate, CommentOut

router = APIRouter(tags=["comments"])


def get_comment_in_task(task_id: int, comment_id: int, db):
    comment = (
        db.query(Comment)
        .filter(
            Comment.id == comment_id,
            Comment.task_id == task_id,
        )
        .first()
    )

    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    return comment


def to_comment_out(comment: Comment, author_name: str) -> CommentOut:
    return CommentOut(
        id=comment.id,
        task_id=comment.task_id,
        author_id=comment.author_id,
        author_name=author_name,
        body=comment.body,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
    )


@router.get(
    "/projects/{project_id}/tasks/{task_id}/comments",
    response_model=list[CommentOut],
)
def list_comments(
    project_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    get_task_in_project(project_id, task_id, db)

    rows = (
        db.query(Comment, User)
        .join(User, User.id == Comment.author_id)
        .filter(Comment.task_id == task_id)
        .order_by(Comment.created_at.asc())
        .all()
    )

    return [to_comment_out(comment, author.name) for comment, author in rows]


@router.post(
    "/projects/{project_id}/tasks/{task_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    project_id: int,
    task_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    get_task_in_project(project_id, task_id, db)

    comment = Comment(
        task_id=task_id,
        author_id=current_user.id,
        body=comment_data.body,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return to_comment_out(comment, current_user.name)


@router.patch(
    "/projects/{project_id}/tasks/{task_id}/comments/{comment_id}",
    response_model=CommentOut,
)
def update_comment(
    project_id: int,
    task_id: int,
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    get_task_in_project(project_id, task_id, db)
    comment = get_comment_in_task(task_id, comment_id, db)

    if comment.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the comment author can edit this comment",
        )

    comment.body = comment_data.body
    db.commit()
    db.refresh(comment)

    author = db.query(User).filter(User.id == comment.author_id).first()
    return to_comment_out(comment, author.name if author else current_user.name)


@router.delete("/projects/{project_id}/tasks/{task_id}/comments/{comment_id}")
def delete_comment(
    project_id: int,
    task_id: int,
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(get_db),
):
    require_project_member(project_id, current_user.id, db)
    get_task_in_project(project_id, task_id, db)
    comment = get_comment_in_task(task_id, comment_id, db)
    project = get_project_or_404(project_id, db)

    is_author = comment.author_id == current_user.id
    is_owner = project.owner_id == current_user.id

    if not is_author and not is_owner:
        raise HTTPException(
            status_code=403,
            detail="You are not allowed to delete this comment.",
        )

    db.delete(comment)
    db.commit()

    return {"message": "Comment deleted successfully."}
