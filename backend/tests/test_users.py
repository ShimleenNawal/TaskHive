from datetime import datetime, timedelta, timezone
from app.models.user import User
from app.core.security import create_access_token
from app.services.auth_service import hash_password
from app.core.config import settings
from jose import jwt


def create_user(db, email="test@example.com"):
    user = User(
        name="Test User",
        email=email,
        hashed_password=hash_password("TestPassword123!"),
        is_verified=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


def test_get_current_user(client, db):
    user = create_user(db)

    token = create_access_token({"sub": str(user.id)})

    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == user.id
    assert data["name"] == "Test User"
    assert data["email"] == "test@example.com"
    assert data["is_verified"] is True


def test_get_current_user_requires_authentication(client):
    response = client.get("/api/users/me")

    assert response.status_code == 401


def test_get_current_user_rejects_invalid_token(client):
    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": "Bearer completely-invalid-token",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


def test_get_current_user_rejects_expired_token(client):
    token = jwt.encode(
        {
            "sub": "1",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),
        },
        settings.SECRET_KEY.get_secret_value(),
        algorithm=settings.ALGORITHM,
    )

    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid or expired token"


def test_get_current_user_rejects_non_numeric_sub(client):
    token = create_access_token({"sub": "not-a-number"})

    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_get_current_user_rejects_missing_sub(client):
    token = create_access_token({})

    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid token"


def test_get_current_user_rejects_nonexistent_user(client):
    token = create_access_token({"sub": "999999"})

    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


def test_get_current_user_rejects_invalid_scheme(client, db):
    user = create_user(db)

    token = create_access_token({"sub": str(user.id)})

    response = client.get(
        "/api/users/me",
        headers={
            "Authorization": f"Basic {token}",
        },
    )

    assert response.status_code == 401


def test_list_users_excludes_self_and_unverified(client, db):
    current_user = create_user(db, "current@example.com")

    verified_user = create_user(db, "verified@example.com")

    unverified_user = User(
        name="Unverified User",
        email="unverified@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=False,
    )
    db.add(unverified_user)
    db.commit()

    token = create_access_token({"sub": str(current_user.id)})

    response = client.get(
        "/api/users/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200

    data = response.json()

    emails = [user["email"] for user in data]

    assert "verified@example.com" in emails
    assert "current@example.com" not in emails
    assert "unverified@example.com" not in emails


def test_list_users_requires_authentication(client):
    response = client.get("/api/users/")

    assert response.status_code == 401