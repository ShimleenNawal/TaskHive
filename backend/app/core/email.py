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


async def send_verification_email(email: str, token: str):
    verification_link = (
        f"http://localhost:5174/verify?token={token}"
    )

    message = MessageSchema(
        subject="Verify your TaskHive account",
        recipients=[email],
        body=f"""
Welcome to TaskHive!

Please verify your email address by clicking the link below:

{verification_link}

This link expires in {settings.VERIFICATION_TOKEN_EXPIRE_HOURS} hours.
""",
        subtype="plain",
    )

    fm = FastMail(conf)
    await fm.send_message(message)