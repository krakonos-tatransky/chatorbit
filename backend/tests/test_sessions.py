import importlib
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@contextmanager
def _test_client(tmp_path, monkeypatch, **env) -> Generator[TestClient, None, None]:
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("CHAT_DATABASE_URL", f"sqlite:///{db_path}")
    for key, value in env.items():
        monkeypatch.setenv(key, value)

    from app import config, database, models, main  # noqa: WPS433

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(main)

    database.Base.metadata.create_all(database.engine)

    try:
        with TestClient(main.app) as test_client:
            yield test_client
    finally:
        database.Base.metadata.drop_all(database.engine)

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
    assert response.json() == {"status": "ok"}


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

    messages_response = client.get(f"/api/sessions/{token}/messages")
    assert messages_response.status_code == 200
    assert messages_response.json()["items"] == []


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
