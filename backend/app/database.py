from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, Iterator, Optional

from sqlalchemy import create_engine, func, inspect, select, text
from sqlalchemy.engine.url import make_url
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import get_settings

settings = get_settings()


def _resolve_sqlite_path(url: str) -> Optional[Path]:
    try:
        database_url = make_url(url)
    except Exception:
        return None

    if not database_url.drivername.startswith("sqlite"):
        return None

    database_path = database_url.database
    if not database_path or database_path == ":memory:":
        return None

    path = Path(database_path)
    if not path.is_absolute():
        path = Path.cwd() / path
    return path


def _prepare_sqlite_database(url: str) -> None:
    path = _resolve_sqlite_path(url)
    if not path:
        return

    path.parent.mkdir(parents=True, exist_ok=True)


_prepare_sqlite_database(settings.database_url)

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args, future=True, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
Base = declarative_base()


def init_db() -> None:
    from . import models  # noqa: WPS433

    Base.metadata.create_all(bind=engine)
    _apply_sqlite_schema_migrations()


def _apply_sqlite_schema_migrations() -> None:
    """Apply lightweight, idempotent schema updates for SQLite deployments."""

    if engine.dialect.name != "sqlite":
        return

    def _has_column(table: str, column: str) -> bool:
        try:
            inspector = inspect(engine)
            return any(col["name"] == column for col in inspector.get_columns(table))
        except Exception:  # pragma: no cover - defensive, shouldn't occur in tests
            return False

    with engine.begin() as connection:
        if not _has_column("tokenrequestlog", "client_identity"):
            connection.execute(text("ALTER TABLE tokenrequestlog ADD COLUMN client_identity VARCHAR(255)"))
        if not _has_column("sessionparticipant", "client_identity"):
            connection.execute(text("ALTER TABLE sessionparticipant ADD COLUMN client_identity VARCHAR(255)"))


def check_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except SQLAlchemyError:
        return False


@contextmanager
def session_scope() -> Iterator[SessionLocal]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_session() -> Iterator[SessionLocal]:
    with session_scope() as session:
        yield session


def get_database_statistics() -> Dict[str, Any]:
    from . import models  # noqa: WPS433

    statistics: Dict[str, Any] = {}

    size_bytes: Optional[int] = None
    sqlite_path = _resolve_sqlite_path(settings.database_url)
    if sqlite_path:
        try:
            size_bytes = sqlite_path.stat().st_size if sqlite_path.exists() else 0
        except OSError:
            size_bytes = None
    statistics["size_bytes"] = size_bytes

    table_counts: Dict[str, int] = {}
    total_records = 0

    with SessionLocal() as session:
        for model in (
            models.TokenSession,
            models.SessionParticipant,
            models.TokenRequestLog,
            models.AbuseReport,
        ):
            table_name = model.__tablename__
            count = session.execute(select(func.count()).select_from(model)).scalar() or 0
            table_counts[table_name] = int(count)
            total_records += int(count)

        rate_limit_threshold = settings.token_rate_limit_per_hour
        window_start = datetime.utcnow() - timedelta(hours=1)

        identity_counts = session.execute(
            select(models.TokenRequestLog.client_identity, func.count())
            .where(
                models.TokenRequestLog.client_identity.is_not(None),
                models.TokenRequestLog.created_at >= window_start,
            )
            .group_by(models.TokenRequestLog.client_identity)
        )
        identity_violations = sum(
            1 for _identity, count in identity_counts if (count or 0) >= rate_limit_threshold
        )

        ip_counts = session.execute(
            select(models.TokenRequestLog.ip_address, func.count())
            .where(
                models.TokenRequestLog.client_identity.is_(None),
                models.TokenRequestLog.created_at >= window_start,
            )
            .group_by(models.TokenRequestLog.ip_address)
        )
        ip_violations = sum(1 for _ip, count in ip_counts if (count or 0) >= rate_limit_threshold)

    statistics["tables"] = table_counts
    statistics["total_records"] = total_records
    statistics["rate_limit"] = {
        "window_seconds": int(timedelta(hours=1).total_seconds()),
        "limit_per_identifier": rate_limit_threshold,
        "identifiers_at_limit": identity_violations + ip_violations,
    }

    return statistics
