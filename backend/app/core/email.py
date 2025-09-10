from typing import Optional
import os
import smtplib
from email.message import EmailMessage


def send_email(to: str, subject: str, body: str) -> None:
    """Send an email.

    For development and tests this function will attempt to send via SMTP if
    SMTP settings are provided via environment variables. Otherwise it will
    simply print the email contents, acting as a stub.
    """
    host = os.getenv("SMTP_HOST")
    port = os.getenv("SMTP_PORT")
    user = os.getenv("SMTP_USER")
    password = os.getenv("SMTP_PASSWORD")

    if host and port and user and password:
        msg = EmailMessage()
        msg["From"] = user
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(body)
        with smtplib.SMTP(host, int(port)) as server:
            server.starttls()
            server.login(user, password)
            server.send_message(msg)
    else:
        print(f"Sending email to {to}: {subject}\n{body}")
