from fastapi_mail import ConnectionConfig, FastMail, MessageSchema
from app.core.config import settings


conf = ConnectionConfig(
    MAIL_USERNAME="",
    MAIL_PASSWORD="",
    MAIL_FROM="no-reply@taskhive.com",
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_STARTTLS=False,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=False,
)


async def _send_plain(email: str, subject: str, body: str) -> None:
    message = MessageSchema(
        subject=subject,
        recipients=[email],
        body=body,
        subtype="plain",
    )
    fm = FastMail(conf)
    await fm.send_message(message)


async def send_verification_email(email: str, token: str) -> None:
    verification_link = f"{settings.FRONTEND_URL.rstrip('/')}/verify?token={token}"
    hours = settings.VERIFICATION_TOKEN_EXPIRE_HOURS

    body = f"""Welcome to TaskHive!

Thank you for creating an account. Please verify your email address so we can
secure your workspace and finish setting things up.

Verify your account:
{verification_link}

This link expires in {hours} hours. If you did not sign up for TaskHive, you can
safely ignore this message.

— The TaskHive team
"""
    await _send_plain(email, "Verify your TaskHive account", body)


async def send_magic_login_email(email: str, token: str) -> None:
    login_link = f"{settings.FRONTEND_URL.rstrip('/')}/email-login?token={token}"
    minutes = settings.LOGIN_LINK_EXPIRE_MINUTES

    body = f"""Sign in to TaskHive.

You requested a secure sign-in link for your TaskHive account. Click on the one-time link below to
open your dashboard — no password needed for this visit.

Sign in securely:
{login_link}

This one-time link expires in {minutes} minutes. Your password was not changed.
If you did not request it, you can safely ignore this email.

— The TaskHive team
"""
    await _send_plain(email, "Your TaskHive sign-in link", body)
