from __future__ import annotations

from email.message import EmailMessage
import smtplib
import ssl
from typing import Sequence

from .config import get_settings


def _ensure_iterable(recipients: str | Sequence[str]) -> Sequence[str]:
    if isinstance(recipients, str):
        return [recipients]
    return list(recipients)


def create_email_message(
    *,
    subject: str,
    body: str,
    recipients: str | Sequence[str],
    sender: str,
) -> EmailMessage:
    """Construct a plain-text email message."""

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    to_recipients = _ensure_iterable(recipients)
    if not to_recipients:
        raise ValueError("At least one recipient is required to send an email message.")
    message["To"] = ", ".join(to_recipients)
    message.set_content(body)
    return message


def send_email(message: EmailMessage) -> None:
    """Send an email message using the configured SMTP transport."""

    settings = get_settings()

    if not settings.smtp_host:
        raise RuntimeError("SMTP host is not configured.")

    host = settings.smtp_host
    port = settings.smtp_port
    username = settings.smtp_username
    password = settings.smtp_password
    context = ssl.create_default_context()

    if settings.smtp_use_ssl:
        with smtplib.SMTP_SSL(host, port, context=context) as server:
            if username and password:
                server.login(username, password)
            server.send_message(message)
        return

    with smtplib.SMTP(host, port) as server:
        server.ehlo()
        if settings.smtp_use_tls:
            server.starttls(context=context)
            server.ehlo()
        if username and password:
            server.login(username, password)
        server.send_message(message)
