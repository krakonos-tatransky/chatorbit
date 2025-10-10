import importlib
import sys
from pathlib import Path
from typing import Generator

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture
def client(tmp_path, monkeypatch) -> Generator[TestClient, None, None]:
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("CHAT_DATABASE_URL", f"sqlite:///{db_path}")

    from app import config, database, models, main  # noqa: WPS433

    importlib.reload(config)
    importlib.reload(database)
    importlib.reload(models)
    importlib.reload(main)

    database.Base.metadata.create_all(database.engine)

    with TestClient(main.app) as test_client:
        yield test_client

    database.Base.metadata.drop_all(database.engine)


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


def test_join_session_flow(client: TestClient) -> None:
    token_response = client.post("/api/tokens", json=_token_payload()).json()
    token = token_response["token"]

    first_join = client.post(
        "/api/sessions/join",
        json={"token": token},
        headers={"X-Forwarded-For": "10.0.0.1"},
    )
    assert first_join.status_code == 200
    host_data = first_join.json()
    assert host_data["role"] == "host"
    assert host_data["session_active"] is False

    second_join = client.post(
        "/api/sessions/join",
        json={"token": token},
        headers={"X-Forwarded-For": "10.0.0.2"},
    )
    assert second_join.status_code == 200
    guest_data = second_join.json()
    assert guest_data["role"] == "guest"
    assert guest_data["session_active"] is True
    assert guest_data["session_started_at"] is not None
    assert guest_data["session_expires_at"] is not None

    third_join = client.post(
        "/api/sessions/join",
        json={"token": token},
        headers={"X-Forwarded-For": "10.0.0.3"},
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
