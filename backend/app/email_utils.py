from __future__ import annotations

import logging
from email.message import EmailMessage
import smtplib
import ssl
from typing import Sequence

from .config import get_settings

logger = logging.getLogger(__name__)


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

    logger.info(
        "SMTP: sending email to=%s from=%s subject=%r via %s:%s (ssl=%s tls=%s auth=%s)",
        message["To"], message["From"], message["Subject"],
        host, port, settings.smtp_use_ssl, settings.smtp_use_tls,
        bool(username and password),
    )

    try:
        context = ssl.create_default_context()

        if settings.smtp_use_ssl:
            with smtplib.SMTP_SSL(host, port, context=context) as server:
                if username and password:
                    server.login(username, password)
                server.send_message(message)
            logger.info("SMTP: email sent successfully (SSL) to=%s", message["To"])
            return

        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            if settings.smtp_use_tls:
                server.starttls(context=context)
                server.ehlo()
            if username and password:
                server.login(username, password)
            server.send_message(message)
        logger.info("SMTP: email sent successfully to=%s", message["To"])

    except smtplib.SMTPAuthenticationError as exc:
        logger.error("SMTP: authentication failed for user=%r — %s", username, exc)
    except smtplib.SMTPRecipientsRefused as exc:
        logger.error("SMTP: recipients refused to=%s — %s", message["To"], exc)
    except smtplib.SMTPException as exc:
        logger.error("SMTP: failed to send email to=%s — %s: %s", message["To"], type(exc).__name__, exc)
    except OSError as exc:
        logger.error("SMTP: connection error to %s:%s — %s: %s", host, port, type(exc).__name__, exc)
