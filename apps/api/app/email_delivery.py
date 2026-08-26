import smtplib
from email.message import EmailMessage
from urllib.parse import quote

from .config import settings


def _send(to_email: str, subject: str, body: str) -> bool:
    if settings.email_delivery_mode.lower() != "smtp" or not settings.smtp_host:
        return False

    message = EmailMessage()
    message["From"] = settings.smtp_from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as smtp:
        if settings.smtp_use_tls:
            smtp.starttls()
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password or "")
        smtp.send_message(message)
    return True


def send_password_reset_email(to_email: str, token: str) -> bool:
    link = f"{settings.frontend_origin.rstrip('/')}/account/reset?token={quote(token)}"
    return _send(
        to_email,
        "Reset your TractusLab password",
        f"Use this link to reset your TractusLab password:\n\n{link}\n\nIf you did not request this, you can ignore this email.",
    )


def send_verification_email(to_email: str, token: str) -> bool:
    link = f"{settings.frontend_origin.rstrip('/')}/account/verify?token={quote(token)}"
    return _send(
        to_email,
        "Verify your TractusLab email",
        f"Use this link to verify your TractusLab email address:\n\n{link}\n\nIf you did not create this account, you can ignore this email.",
    )
