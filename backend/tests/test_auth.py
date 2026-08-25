from datetime import datetime, timedelta, timezone
from app.models.user import User
from app.services.auth_service import hash_password
from app.core.config import settings


def test_signup_success(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "Test User"
    assert data["email"] == "test@example.com"
    assert data["is_verified"] is False
    assert "id" in data
    assert "hashed_password" not in data


def test_signup_duplicate_email(client):
    payload = {
        "name": "Test User",
        "email": "test@example.com",
        "password": "TestPassword123!",
    }

    first_response = client.post(
        "/api/auth/signup",
        json=payload,
    )

    assert first_response.status_code == 200

    second_response = client.post(
        "/api/auth/signup",
        json=payload,
    )

    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "Email already exists"


def test_signup_validates_email(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "not-an-email",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 422


def test_signup_requires_name(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 422


def test_signup_requires_password(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "test@example.com",
        },
    )

    assert response.status_code == 422


def test_signup_rejects_short_password(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "short@example.com",
            "password": "Abc123",
        },
    )

    assert response.status_code == 422


def test_signup_rejects_password_without_letter(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "nletter@example.com",
            "password": "12345678",
        },
    )

    assert response.status_code == 422


def test_signup_rejects_password_without_digit(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "Test User",
            "email": "nodigit@example.com",
            "password": "abcdefgh",
        },
    )

    assert response.status_code == 422


def test_signup_rejects_empty_name(client):
    response = client.post(
        "/api/auth/signup",
        json={
            "name": "",
            "email": "emptyname@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 422


def test_verify_email_success(client, db):
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=False,
        verification_token="valid-token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.get(
        "/api/auth/verify",
        params={"token": "valid-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "verified"}

    db.refresh(user)

    assert user.is_verified is True
    assert user.verification_token is None
    assert user.token_expires_at is None


def test_verify_email_invalid_token(client):
    response = client.get(
        "/api/auth/verify",
        params={"token": "does-not-exist"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Token not found"


def test_verify_email_expired_token(client, db):
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=False,
        verification_token="expired-token",
        token_expires_at=datetime.now(timezone.utc) - timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS),
    )

    db.add(user)
    db.commit()

    response = client.get(
        "/api/auth/verify",
        params={"token": "expired-token"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Token expired"


def test_resend_verification_success(client, db):
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=False,
        verification_token="old-token",
        token_expires_at=datetime.now(timezone.utc) - timedelta(hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    response = client.post(
        "/api/auth/resend-verification",
        json={"email": "test@example.com"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "new token sent"}

    db.refresh(user)

    assert user.verification_token is not None
    assert user.verification_token != "old-token"
    assert user.token_expires_at is not None
    assert user.token_expires_at > datetime.now(timezone.utc)


def test_resend_verification_user_not_found(client):
    response = client.post(
        "/api/auth/resend-verification",
        json={"email": "missing@example.com"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "User not found"


def test_resend_verification_already_verified(client, db):
    user = User(
        name="Verified User",
        email="verified@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=True,
        verification_token=None,
        token_expires_at=None,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/auth/resend-verification",
        json={"email": "verified@example.com"},
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "User already verified"


def test_resend_verification_validates_email(client):
    response = client.post(
        "/api/auth/resend-verification",
        json={"email": "not-an-email"},
    )

    assert response.status_code == 422


def test_login_success(client, db):
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=True,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert isinstance(data["access_token"], str)
    assert len(data["access_token"]) > 0


def test_login_invalid_password(client, db):
    user = User(
        name="Test User",
        email="test@example.com",
        hashed_password=hash_password("CorrectPassword123!"),
        is_verified=True,
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_login_unknown_user(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "missing@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_unverified_user_cannot_login(client, db):
    user = User(
        name="Unverified User",
        email="unverified@example.com",
        hashed_password=hash_password("TestPassword123!"),
        is_verified=False,
        verification_token="token",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )

    db.add(user)
    db.commit()

    response = client.post(
        "/api/auth/login",
        json={
            "email": "unverified@example.com",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Please verify your email first"


def test_login_validates_email(client):
    response = client.post(
        "/api/auth/login",
        json={
            "email": "not-an-email",
            "password": "TestPassword123!",
        },
    )

    assert response.status_code == 422