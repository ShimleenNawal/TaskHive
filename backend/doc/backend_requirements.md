# TaskHive backend requirements (current implementation)

This document is the **backend source of truth** for what the API actually does today.

It is derived from [`docs/PROJECT_REQUIREMENTS.md`](../../docs/PROJECT_REQUIREMENTS.md) (product + frontend contract). Where that file still labels endpoints as “Planned” or “documented only,” **this file is authoritative**: those in-scope APIs are implemented.

**Verdict:** There is **no remaining in-scope backend gap**. Auth, users, projects, members, tasks (including get-one and extra filters), labels, tagging, comments, and dashboard stats are implemented and mounted under `/api`. Items listed as out of scope in the product doc remain out of scope.

---

## Relationship to `docs/PROJECT_REQUIREMENTS.md`

| Topic | Product doc | Backend today |
|---|---|---|
| Part 1 (auth, users, projects, members, task CRUD) | Implemented | Implemented |
| Get one task + list filters `assignee_id`, `reporter_id`, `label_id` | Marked planned / “not yet” | **Implemented** |
| Labels, task-label tagging, comments, dashboard | Marked planned / “do not build” | **Implemented** |
| Nested replies, attachments, activity log, notifications, soft deletes, password reset | Out of scope | **Not implemented (by design)** |

Routers: [`app/routers/routes.py`](../app/routers/routes.py) includes `auth`, `user`, `project`, `task`, `label`, `comment`, `dashboard`.

---

## Shared conventions (as implemented)

| Convention | Behavior |
|---|---|
| Base URL | Application routes under `/api`. Health is `GET /health` (no `/api` prefix). |
| Auth | JWT in `Authorization: Bearer <access_token>` on protected routes via HTTPBearer. |
| Missing / malformed Bearer | **401** `{ "detail": "Not authenticated" }` |
| Invalid / expired JWT | **401** `{ "detail": "Invalid or expired token" }` |
| Bad `sub` / missing user | **401** `{ "detail": "Invalid token" }` or `{ "detail": "User not found" }` |
| Unverified login | Login blocked with **403**. Other JWT routes do **not** re-check `is_verified`. |
| Hidden resources | Non-members get **404** `"Project not found"` for project/task/label/comment member routes. |
| Project owner edit/delete | **404** `"Project not found or you are not the owner"` (does not reveal 403). |
| Member invite/remove | Non-owner gets **403** (project existence is revealed if the project id exists). |
| Unique conflicts | **409** |
| Validation | **422** (Pydantic / FastAPI). `detail` is an array of error objects. |
| Creates | FastAPI default **200**, except comment create **201**. |
| Collections | JSON arrays. Tasks, labels, and comments list endpoints support `limit` (default 50, max 200) and `offset` (default 0). |
| Dates | ISO 8601 timezone-aware datetimes. |
| Passwords | Argon2 (`app/services/auth_service.py`). |
| CORS | `BACKEND_CORS_ORIGINS` from env; methods GET/POST/PUT/PATCH/DELETE/OPTIONS; headers Authorization, Content-Type. |

Application error body:

```json
{ "detail": "Human-readable error message" }
```

---

## Endpoint inventory

All rows below are **implemented** unless marked otherwise.

| Status | Method | Path |
|---|---|---|
| Implemented | GET | `/health` |
| Implemented | POST | `/api/auth/signup` |
| Implemented | GET | `/api/auth/verify` |
| Implemented | POST | `/api/auth/resend-verification` |
| Implemented | POST | `/api/auth/login` |
| Implemented | GET | `/api/users/me` |
| Implemented | GET | `/api/users/` |
| Implemented | POST | `/api/projects` |
| Implemented | GET | `/api/projects` |
| Implemented | GET | `/api/projects/{project_id}` |
| Implemented | PATCH | `/api/projects/{project_id}` |
| Implemented | DELETE | `/api/projects/{project_id}` |
| Implemented | POST | `/api/projects/{project_id}/members` |
| Implemented | DELETE | `/api/projects/{project_id}/members/{user_id}` |
| Implemented | POST | `/api/projects/{project_id}/tasks` |
| Implemented | GET | `/api/projects/{project_id}/tasks` |
| Implemented | GET | `/api/projects/{project_id}/tasks/{task_id}` |
| Implemented | PUT | `/api/projects/{project_id}/tasks/{task_id}` |
| Implemented | DELETE | `/api/projects/{project_id}/tasks/{task_id}` |
| Implemented | POST | `/api/projects/{project_id}/labels` |
| Implemented | GET | `/api/projects/{project_id}/labels` |
| Implemented | PATCH | `/api/projects/{project_id}/labels/{label_id}` |
| Implemented | DELETE | `/api/projects/{project_id}/labels/{label_id}` |
| Implemented | POST | `/api/projects/{project_id}/tasks/{task_id}/labels` |
| Implemented | DELETE | `/api/projects/{project_id}/tasks/{task_id}/labels/{label_id}` |
| Implemented | GET | `/api/projects/{project_id}/tasks/{task_id}/comments` |
| Implemented | POST | `/api/projects/{project_id}/tasks/{task_id}/comments` |
| Implemented | PATCH | `/api/projects/{project_id}/tasks/{task_id}/comments/{comment_id}` |
| Implemented | DELETE | `/api/projects/{project_id}/tasks/{task_id}/comments/{comment_id}` |
| Implemented | GET | `/api/dashboard/stats` |
| Out of scope | — | Nested comments, attachments, activity, notifications, soft delete, password reset |

There is no logout/revoke endpoint (logout is client-side). There is no separate list-members endpoint; use project detail `members`.

---

## Data model (implemented)

SQLAlchemy models: `User`, `Project`, `ProjectMember`, `Task`, `Label`, `TaskLabel`, `Comment`.

Migration `a1b2c3d4e5f6` adds `projects.updated_at`, `project_members.created_at`, task `reporter_id` / `updated_at` / `description` as Text, plus `labels`, `task_labels`, `comments`.

| Table | Key fields |
|---|---|
| `users` | `id`, `name`, `email` (unique), `hashed_password`, `is_verified`, `verification_token`, `token_expires_at`, `created_at` |
| `projects` | `id`, `name`, `description`, `owner_id`, `deadline`, `created_at`, `updated_at` |
| `project_members` | `id`, `project_id` CASCADE, `user_id`, `role` (`OWNER` \| `MEMBER`), `created_at`; unique `(project_id, user_id)` |
| `tasks` | `id`, `project_id` CASCADE, `title`, `description` (Text), `due_date`, `status`, `priority`, `assignee_id` SET NULL, `reporter_id` RESTRICT NOT NULL, `created_at`, `updated_at` |
| `labels` | `id`, `project_id` CASCADE, `name`, `color` default `#6B7280`, `created_by` RESTRICT, `created_at`; unique `(project_id, name)` |
| `task_labels` | `id`, `task_id` CASCADE, `label_id` CASCADE, `tagged_by` RESTRICT, `created_at`; unique `(task_id, label_id)` |
| `comments` | `id`, `task_id` CASCADE, `author_id` RESTRICT, `body` Text, `created_at`, `updated_at` |

Same-project rule for tagging is enforced in the API (not a DB check).

---

## Shared response objects

### `UserOut`

```json
{
  "id": 7,
  "name": "Ayesha Rahman",
  "email": "ayesha@example.com",
  "is_verified": true
}
```

### `UserListOut`

```json
{
  "id": 8,
  "name": "Nabil Hasan",
  "email": "nabil@example.com"
}
```

### `ProjectOut`

```json
{
  "id": 12,
  "name": "Website Redesign",
  "description": "Rebuild the marketing website",
  "owner_id": 7,
  "deadline": "2026-09-30T18:00:00Z",
  "created_at": "2026-08-20T09:30:00Z",
  "updated_at": "2026-08-21T08:15:00Z"
}
```

`updated_at` may be `null` if the DB column is null.

### `ProjectDetailOut`

`ProjectOut` plus:

```json
"members": [
  {
    "id": 21,
    "user_id": 7,
    "name": "Ayesha Rahman",
    "email": "ayesha@example.com",
    "role": "OWNER",
    "created_at": "2026-08-20T09:30:00Z"
  }
]
```

### `TaskOut` (create, list, update)

Does **not** include nested labels.

```json
{
  "id": 35,
  "project_id": 12,
  "title": "Implement responsive header",
  "description": "Match the approved designs.",
  "status": "IN_PROGRESS",
  "priority": "HIGH",
  "due_date": "2026-08-25T18:00:00Z",
  "assignee_id": 8,
  "reporter_id": 7,
  "created_at": "2026-08-20T10:00:00Z",
  "updated_at": "2026-08-21T08:15:00Z"
}
```

### `TaskDetailOut` (get one, tag, untag)

`TaskOut` plus `labels: [{ "id", "name", "color" }]`. Empty list is `[]`.

### `LabelOut`

```json
{
  "id": 5,
  "project_id": 12,
  "name": "Frontend",
  "color": "#3B82F6",
  "created_by": 7,
  "created_at": "2026-08-20T10:10:00Z"
}
```

### `CommentOut`

```json
{
  "id": 18,
  "task_id": 35,
  "author_id": 8,
  "author_name": "Nabil Hasan",
  "body": "The desktop version is ready for review.",
  "created_at": "2026-08-21T09:00:00Z",
  "updated_at": "2026-08-21T09:00:00Z"
}
```

### `DashboardStatsOut`

```json
{
  "total": 24,
  "in_progress": 7,
  "completed": 11
}
```

---

## Module APIs

### Health

#### `GET /health`

No auth. Body: none.

**200:** `{ "status": "ok" }`

---

### Authentication

#### `POST /api/auth/signup`

Auth: none.

**Body:** `{ "name", "email", "password" }` — name 1–255; valid email; password 8–128 with ≥1 letter and ≥1 digit.

**200:** `UserOut` with `is_verified: false`. Sends verification email.

**Errors:** **409** `"Email already exists"` · **422**

#### `GET /api/auth/verify?token=`

Auth: none.

**200:** `{ "status": "verified" }`

**Errors:** **404** `"Token not found"` · **400** `"Token expired"` · **422** missing token

#### `POST /api/auth/resend-verification`

**Body:** `{ "email" }`

**200:** `{ "status": "new token sent" }`

**Errors:** **404** `"User not found"` · **409** `"User already verified"` · **422**

#### `POST /api/auth/login`

**Body:** `{ "email", "password" }`

**200:** `{ "access_token": "<jwt>", "token_type": "bearer" }`

**Errors:** **401** `"Invalid credentials"` · **403** `"Please verify your email first"` · **422**

No server-side logout.

---

### Users

#### `GET /api/users/me`

Auth: Bearer.

**200:** `UserOut`

#### `GET /api/users/`

Trailing slash is the registered path. Other **verified** users only (excludes caller).

**200:** `[UserListOut, ...]` or `[]`

---

### Projects

Creator is stored as `owner_id` and as `project_members` role `OWNER`.

#### `POST /api/projects`

**Body:** `{ "name", "description"?, "deadline"? }` — name 1–255; description max 255.

**200:** `ProjectOut`

#### `GET /api/projects`

**200:** `[ProjectOut, ...]` — membership only. Empty `[]`.

#### `GET /api/projects/{project_id}`

**200:** `ProjectDetailOut`

**Errors:** **404** `"Project not found"` if missing or not a member

#### `PATCH /api/projects/{project_id}`

Owner only. Partial body: `name?`, `description?`, `deadline?`.

**200:** `ProjectOut`

**Errors:** **404** `"Project not found or you are not the owner"`

#### `DELETE /api/projects/{project_id}`

Owner only.

**200:** `{ "message": "Project deleted successfully." }`

Cascades members, tasks, labels, comments, task_labels via FKs.

---

### Project members

#### `POST /api/projects/{project_id}/members`

Owner only. **Body:** `{ "email" }`

Invitee must exist, be verified, not already a member, not the owner.

**200:**

```json
{
  "message": "Member added successfully.",
  "user_id": 8,
  "project_id": 12,
  "role": "MEMBER"
}
```

**Errors:**

- **403** `"Only the project owner can add members"`
- **403** `"User must verify their email before being added to a project"`
- **404** `"Project not found"` / `"User not found"`
- **409** `"You are already the project owner"` / `"User is already a member"`

#### `DELETE /api/projects/{project_id}/members/{user_id}`

Owner only.

**200:** `{ "message": "Member removed successfully." }`

**Errors:** **400** `"Project owner cannot be removed"` · **403** `"Only the project owner can remove members"` · **404** `"Project not found"` / `"User is not a member of this project"`

---

### Tasks

Status: `TODO` | `IN_PROGRESS` | `DONE` (default `TODO`). Priority: `LOW` | `MEDIUM` | `HIGH` (default `MEDIUM`).

`reporter_id` is always the authenticated creator; client cannot set or change it.

Title max 255. Description is optional long text (no 255-char request cap).

#### `POST /api/projects/{project_id}/tasks`

Member. **Body:** `{ "title", "description"?, "status"?, "priority"?, "due_date"?, "assignee_id"? }`

**200:** `TaskOut` with `reporter_id = current_user.id`

**Errors:** **404** `"Project not found"` · **400** `"Assignee must be a member of this project"` · **422**

#### `GET /api/projects/{project_id}/tasks`

Member. Query (all optional): `status`, `priority`, `sort` (`due_date` | `created_at` | `priority` | `status` | `title`), `assignee_id`, `reporter_id`, `label_id`, `limit` (default 50, max 200), `offset` (default 0).

Default sort: `created_at` desc. `sort=due_date`: asc, nulls last. `sort=priority`: HIGH → MEDIUM → LOW. `sort=status`: TODO → IN_PROGRESS → DONE. Other sorts: asc.

**200:** `[TaskOut, ...]` — no nested `labels`. Filter by `label_id` for tagged tasks.

#### `GET /api/projects/{project_id}/tasks/{task_id}`

Member.

**200:** `TaskDetailOut` (includes `labels`)

**Errors:** **404** `"Project not found"` / `"Task not found"`

#### `PUT /api/projects/{project_id}/tasks/{task_id}`

Member. Partial update despite PUT (`exclude_unset`). Fields: `title`, `description`, `status`, `priority`, `due_date`, `assignee_id` (not reporter).

**200:** `TaskOut`

#### `DELETE /api/projects/{project_id}/tasks/{task_id}`

**200:** `{ "message": "Task deleted successfully." }`

Cascades comments and `task_labels`.

---

### Labels (project catalog)

Any project member. Name trimmed, 1–50 chars, unique per project. Color optional hex `^#[0-9A-Fa-f]{6}$`, default `#6B7280`. `created_by` is the current user.

#### `POST /api/projects/{project_id}/labels`

**Body:** `{ "name", "color"? }`

**200:** `LabelOut`

**Errors:** **404** `"Project not found"` · **409** `"Label name already exists"` · **422**

#### `GET /api/projects/{project_id}/labels`

Query: `limit` (default 50, max 200), `offset` (default 0).

**200:** `[LabelOut, ...]` ordered by name. Empty `[]`.

#### `PATCH /api/projects/{project_id}/labels/{label_id}`

**Body:** at least one of `{ "name"?, "color"? }`

**200:** `LabelOut`

**Errors:** **404** `"Project not found"` / `"Label not found"` · **409** `"Label name already exists"` · **422** `"No fields to update"` or invalid fields

#### `DELETE /api/projects/{project_id}/labels/{label_id}`

**200:** `{ "message": "Label deleted successfully." }`

Cascades `task_labels` only (tasks remain).

---

### Task-label tagging

Label and task must share `project_id`. Duplicate tag is **409**. Untag does not delete the catalog row.

#### `POST /api/projects/{project_id}/tasks/{task_id}/labels`

**Body:** `{ "label_id": int }`

**200:** `TaskDetailOut`

**Errors:** **400** `"Label must belong to the same project as the task"` · **404** project / task / `"Label not found"` · **409** `"Label is already attached to this task"`

#### `DELETE /api/projects/{project_id}/tasks/{task_id}/labels/{label_id}`

**200:** `TaskDetailOut`

**Errors:** **404** `"Label is not attached to this task"` (plus project/task 404)

---

### Comments (flat)

Body required, trimmed, non-empty. `author_id` is the current user. Ordered by `created_at` asc.

#### `GET /api/projects/{project_id}/tasks/{task_id}/comments`

Query: `limit` (default 50, max 200), `offset` (default 0).

**200:** `[CommentOut, ...]` or `[]`

#### `POST /api/projects/{project_id}/tasks/{task_id}/comments`

**Body:** `{ "body": string }`

**201:** `CommentOut`

#### `PATCH /api/projects/{project_id}/tasks/{task_id}/comments/{comment_id}`

Author only. **Body:** `{ "body": string }`

**200:** `CommentOut`

**Errors:** **403** `"Only the comment author can edit this comment"` · **404** `"Comment not found"`

#### `DELETE /api/projects/{project_id}/tasks/{task_id}/comments/{comment_id}`

Author **or** project owner.

**200:** `{ "message": "Comment deleted successfully." }`

**Errors:** **403** `"You are not allowed to delete this comment."` · **404** `"Comment not found"`

---

### Dashboard

#### `GET /api/dashboard/stats`

Auth: Bearer. Counts tasks in projects where the caller is a member.

- `total` — all statuses
- `in_progress` — `IN_PROGRESS`
- `completed` — `DONE`

**200:** `DashboardStatsOut`

---

## Gap analysis

| Product requirement | Backend status |
|---|---|
| Signup / verify / resend / login JWT | Implemented |
| Profile + verified user list | Implemented |
| Project CRUD + owner membership | Implemented |
| Invite/remove members | Implemented |
| Task CRUD + reporter auto-set | Implemented |
| Get one task with labels | Implemented |
| List filters assignee / reporter / label | Implemented |
| Long task description | Implemented (Text; request schema has no 255 cap) |
| Label catalog CRUD | Implemented |
| Tag / untag | Implemented |
| Flat comments + owner moderate delete | Implemented |
| Dashboard counts | Implemented |
| Nested replies, files, activity, notifications, soft delete, password reset | Out of scope — **not** a gap |

**Contract notes (not missing features):**

- Task **list** returns `TaskOut` without `labels[]`. Use get-one or `label_id` filter.
- Comment delete **403** detail string is `"You are not allowed to delete this comment."` (product doc used a longer sentence). Behavior matches the spec (author or owner).
- `docs/PROJECT_REQUIREMENTS.md` still says several endpoints are Planned; **ignore that for backend work** — use this file.

**In-scope remaining backend work:** none.
