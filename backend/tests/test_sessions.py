import importlib
import sqlite3
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

import bcrypt
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


ADMIN_PASSWORD = "super-secret-password"


@contextmanager
def _test_client(tmp_path, monkeypatch, **env) -> Generator[TestClient, None, None]:
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("CHAT_DATABASE_URL", f"sqlite:///{db_path}")
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    monkeypatch.setenv("CHAT_SMTP_HOST", "localhost")
    monkeypatch.setenv("CHAT_SMTP_PORT", "2525")
    monkeypatch.setenv("CHAT_SMTP_SENDER", "noreply@example.com")
    monkeypatch.setenv("CHAT_ABUSE_NOTIFICATIONS_EMAIL", "abuse@example.com")
    monkeypatch.setenv("CHAT_ADMIN_USERNAME", "admin")
    password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    monkeypatch.setenv("CHAT_ADMIN_PASSWORD_HASH", password_hash)
    monkeypatch.setenv("CHAT_ADMIN_TOKEN_SECRET_KEY", "test-secret")

    from app import config, database, models, main  # noqa: WPS433

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(main)

    from app import email_utils, main  # noqa: WPS433

    monkeypatch.setattr(email_utils, "send_email", lambda message: None)
    monkeypatch.setattr(main, "send_email", lambda message: None)

    database.Base.metadata.create_all(database.engine)

    try:
        with TestClient(main.app) as test_client:
            yield test_client
    finally:
        database.Base.metadata.drop_all(database.engine)


def test_init_db_backfills_client_identity_columns(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "legacy.db"
    monkeypatch.setenv("CHAT_DATABASE_URL", f"sqlite:///{db_path}")

    from app import config, database  # noqa: WPS433

    importlib.reload(config)
    importlib.reload(database)

    with sqlite3.connect(db_path) as connection:
        connection.execute(
            "CREATE TABLE tokensession (id INTEGER PRIMARY KEY AUTOINCREMENT)"
        )
        connection.execute(
            "CREATE TABLE tokenrequestlog ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "session_id INTEGER NOT NULL,"
            "ip_address VARCHAR(64) NOT NULL,"
            "internal_ip_address VARCHAR(64),"
            "created_at DATETIME NOT NULL"
            ")"
        )
        connection.execute(
            "CREATE TABLE sessionparticipant ("
            "id TEXT PRIMARY KEY,"
            "session_id INTEGER NOT NULL,"
            "role VARCHAR(16) NOT NULL,"
            "ip_address VARCHAR(64) NOT NULL,"
            "internal_ip_address VARCHAR(64),"
            "joined_at DATETIME NOT NULL"
            ")"
        )

    database.init_db()

    with sqlite3.connect(db_path) as connection:
        token_columns = {row[1] for row in connection.execute("PRAGMA table_info(tokenrequestlog)")}
        participant_columns = {
            row[1] for row in connection.execute("PRAGMA table_info(sessionparticipant)")
        }

    assert {"client_identity", "internal_ip_address"}.issubset(token_columns)
    assert {"client_identity", "internal_ip_address"}.issubset(participant_columns)

@pytest.fixture
def client(tmp_path, monkeypatch) -> Generator[TestClient, None, None]:
    with _test_client(tmp_path, monkeypatch) as test_client:
        yield test_client


def _token_payload(**overrides):
    payload = {
        "validity_period": "1_day",
        "session_ttl_minutes": 30,
        "message_char_limit": 2000,
    }
    payload.update(overrides)
    return payload


def test_issue_token_and_rate_limit(client: TestClient) -> None:
    for _ in range(10):
        response = client.post("/api/tokens", json=_token_payload())
        assert response.status_code == 200

    response = client.post("/api/tokens", json=_token_payload())
    assert response.status_code == 429


def test_database_healthcheck(client: TestClient) -> None:
    response = client.get("/api/health/database")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    statistics = payload["statistics"]
    assert "size_bytes" in statistics
    assert statistics["size_bytes"] is None or statistics["size_bytes"] >= 0
    assert statistics["total_records"] >= 0
    assert set(statistics["tables"].keys()) == {
        "tokensession",
        "sessionparticipant",
        "tokenrequestlog",
        "abusereport",
    }
    rate_limit_stats = statistics["rate_limit"]
    assert rate_limit_stats["window_seconds"] == 60 * 60
    assert rate_limit_stats["limit_per_identifier"] >= 1
    assert rate_limit_stats["identifiers_at_limit"] >= 0


def test_join_session_flow(client: TestClient) -> None:
    token_response = client.post("/api/tokens", json=_token_payload()).json()
    token = token_response["token"]

    first_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert first_join.status_code == 200
    host_data = first_join.json()
    assert host_data["role"] == "host"
    assert host_data["session_active"] is False

    host_rejoin = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host-identity"},
        headers={"X-Forwarded-For": "10.0.0.55"},
    )
    assert host_rejoin.status_code == 200
    assert host_rejoin.json()["participant_id"] == host_data["participant_id"]

    second_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "guest-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert second_join.status_code == 200
    guest_data = second_join.json()
    assert guest_data["role"] == "guest"
    assert guest_data["session_active"] is True
    assert guest_data["session_started_at"] is not None
    assert guest_data["session_expires_at"] is not None

    third_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "third-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert third_join.status_code == 409

    status_response = client.get(f"/api/sessions/{token}/status")
    assert status_response.status_code == 200
    status_data = status_response.json()
    assert status_data["status"] == "active"
    assert status_data["remaining_seconds"] is not None
    assert len(status_data["participants"]) == 2


def test_delete_session_marks_status_and_blocks_rejoin(client: TestClient) -> None:
    token_response = client.post("/api/tokens", json=_token_payload()).json()
    token = token_response["token"]

    host_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert host_join.status_code == 200

    delete_response = client.delete(f"/api/sessions/{token}")
    assert delete_response.status_code == 200
    payload = delete_response.json()
    assert payload["status"] == "deleted"
    assert payload["session_expires_at"] is not None

    status_response = client.get(f"/api/sessions/{token}/status")
    assert status_response.status_code == 200
    status_payload = status_response.json()
    assert status_payload["status"] == "deleted"

    rejoin_attempt = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert rejoin_attempt.status_code == 410
    assert rejoin_attempt.json()["detail"] == "Session has been deleted."

def test_rejoin_session_with_participant_id(client: TestClient) -> None:
    token_response = client.post("/api/tokens", json=_token_payload()).json()
    token = token_response["token"]

    host_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert host_join.status_code == 200
    host_data = host_join.json()

    guest_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "guest-identity"},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert guest_join.status_code == 200

    rejoin = client.post(
        "/api/sessions/join",
        json={
            "token": token,
            "participant_id": host_data["participant_id"],
            "client_identity": "host-identity-new",
        },
        headers={"X-Forwarded-For": "10.0.0.99"},
    )

    assert rejoin.status_code == 200
    payload = rejoin.json()
    assert payload["participant_id"] == host_data["participant_id"]
    assert payload["role"] == "host"

    lookup = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host-identity-new"},
        headers={"X-Forwarded-For": "10.0.0.77"},
    )
    assert lookup.status_code == 200
    assert lookup.json()["participant_id"] == host_data["participant_id"]


def test_not_found_responses_include_msg_app_header(client: TestClient) -> None:
    missing_session = client.get("/api/sessions/does-not-exist/status")
    assert missing_session.status_code == 404
    assert missing_session.headers.get("msg-app") == "Token not found in database."

    token_response = client.post("/api/tokens", json=_token_payload()).json()
    token = token_response["token"]

    missing_participant = client.post(
        "/api/sessions/join",
        json={"token": token, "participant_id": "unknown"},
        headers={"X-Forwarded-For": "203.0.113.1"},
    )
    assert missing_participant.status_code == 404
    assert (
        missing_participant.headers.get("msg-app")
        == "Participant record not found for this session."
    )


def test_unknown_route_returns_empty_404_response(client: TestClient) -> None:
    response = client.get("/api/not-a-real-route")
    assert response.status_code == 404
    assert response.text == ""
    # Starlette omits the content-type header for an empty plain response.
    assert response.headers.get("content-type") is None
def test_cors_wildcard_origin_does_not_expose_credentials(client: TestClient) -> None:
    response = client.options(
        "/api/tokens",
        headers={
            "Origin": "http://example.com",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "*"
    assert "access-control-allow-credentials" not in {
        key.lower(): value for key, value in response.headers.items()
    }


def test_cors_specific_origin_allows_credentials(tmp_path, monkeypatch) -> None:
    allowed_origins = "[\"http://example.com\"]"
    with _test_client(
        tmp_path,
        monkeypatch,
        CHAT_CORS_ALLOWED_ORIGINS=allowed_origins,
        CHAT_CORS_ALLOW_CREDENTIALS="true",
    ) as test_client:
        response = test_client.options(
            "/api/tokens",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "POST",
            },
        )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://example.com"
    assert (
        {
            key.lower(): value for key, value in response.headers.items()
        }.get("access-control-allow-credentials")
        == "true"
    )


def test_cors_simple_string_env_format(tmp_path, monkeypatch) -> None:
    with _test_client(
        tmp_path,
        monkeypatch,
        CHAT_CORS_ALLOWED_ORIGINS="http://example.com",
    ) as test_client:
        response = test_client.options(
            "/api/tokens",
            headers={
                "Origin": "http://example.com",
                "Access-Control-Request-Method": "POST",
            },
        )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://example.com"
    assert (
        {
            key.lower(): value for key, value in response.headers.items()
        }.get("access-control-allow-credentials")
        == "true"
    )


def test_cors_comma_separated_env_format(tmp_path, monkeypatch) -> None:
    with _test_client(
        tmp_path,
        monkeypatch,
        CHAT_CORS_ALLOWED_ORIGINS="http://example.com, https://example.org",
    ) as test_client:
        response = test_client.options(
            "/api/tokens",
            headers={
                "Origin": "https://example.org",
                "Access-Control-Request-Method": "POST",
            },
        )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "https://example.org"
    assert (
        {
            key.lower(): value for key, value in response.headers.items()
        }.get("access-control-allow-credentials")
        == "true"
    )


def test_report_abuse_and_admin_views(client: TestClient) -> None:
    token_response = client.post("/api/tokens", json=_token_payload()).json()
    token = token_response["token"]

    host_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "host"},
        headers={"X-Forwarded-For": "198.51.100.10"},
    )
    assert host_join.status_code == 200
    host_data = host_join.json()

    guest_join = client.post(
        "/api/sessions/join",
        json={"token": token, "client_identity": "guest"},
        headers={"X-Forwarded-For": "198.51.100.11"},
    )
    assert guest_join.status_code == 200

    report_payload = {
        "participant_id": host_data["participant_id"],
        "reporter_email": "reporter@example.com",
        "summary": "Serious misconduct observed during the call.",
        "questionnaire": {
            "immediate_threat": False,
            "involves_criminal_activity": True,
            "requires_follow_up": True,
            "additional_details": "Peer made explicit threats.",
        },
    }

    report_response = client.post(
        f"/api/sessions/{token}/report-abuse",
        json=report_payload,
        headers={"X-Forwarded-For": "198.51.100.10"},
    )
    assert report_response.status_code == 200
    report_data = report_response.json()
    assert report_data["status"] == "open"
    assert report_data["session_status"] == "deleted"

    status_response = client.get(f"/api/sessions/{token}/status")
    assert status_response.status_code == 200
    assert status_response.json()["status"] == "deleted"

    auth_response = client.post(
        "/api/admin/token",
        data={"username": "admin", "password": ADMIN_PASSWORD},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )
    assert auth_response.status_code == 200
    access_token = auth_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    sessions_response = client.get("/api/admin/sessions", headers=headers)
    assert sessions_response.status_code == 200
    sessions = sessions_response.json()["sessions"]
    target_session = next((session for session in sessions if session["token"] == token), None)
    assert target_session is not None
    assert any(participant["internal_ip_address"] == "testclient" for participant in target_session["participants"])

    reports_response = client.get("/api/admin/reports", headers=headers)
    assert reports_response.status_code == 200
    reports = reports_response.json()["reports"]
    assert any(report["id"] == report_data["report_id"] for report in reports)

    target_report = next(report for report in reports if report["id"] == report_data["report_id"])
    assert target_report["status"] == "open"
    assert target_report["reporter_ip"] == "198.51.100.10"
    assert target_report["participant_id"] == host_data["participant_id"]
    assert target_report["remote_participants"]
    participant_snapshot = target_report["remote_participants"][0]
    assert participant_snapshot["ip_address"] == "198.51.100.11"
    assert participant_snapshot["internal_ip_address"] == "testclient"
    assert participant_snapshot["participant_id"] != host_data["participant_id"]

    update_response = client.patch(
        f"/api/admin/reports/{report_data['report_id']}",
        json={
            "status": "acknowledged",
            "escalation_step": "Escalate to trust & safety supervisor",
            "admin_notes": "Initial triage complete.",
        },
        headers=headers,
    )
    assert update_response.status_code == 200
    updated_report = update_response.json()
    assert updated_report["status"] == "acknowledged"
    assert updated_report["escalation_step"] == "Escalate to trust & safety supervisor"
    assert updated_report["admin_notes"] == "Initial triage complete."

    no_field_response = client.patch(
        f"/api/admin/reports/{report_data['report_id']}",
        json={},
        headers=headers,
    )
    assert no_field_response.status_code == 400

    investigation_response = client.patch(
        f"/api/admin/reports/{report_data['report_id']}",
        json={
            "status": "investigating",
            "admin_notes": "Handed to investigator A.",
        },
        headers=headers,
    )
    assert investigation_response.status_code == 200
    assert investigation_response.json()["status"] == "investigating"

    filtered_response = client.get(
        "/api/admin/reports",
        params={"status_filter": "open"},
        headers=headers,
    )
    assert filtered_response.status_code == 200
    unresolved_response = client.get(
        "/api/admin/reports",
        params={"status_filter": "unresolved"},
        headers=headers,
    )
    assert unresolved_response.status_code == 200
    assert any(report["status"] == "investigating" for report in unresolved_response.json()["reports"])
