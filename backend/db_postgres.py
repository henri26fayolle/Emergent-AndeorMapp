"""Postgres/Supabase-backed compatibility layer for the current Mongo-style API.

The game backend was built around Motor collection calls. This adapter supports
the subset of Mongo operations the app uses, so we can move the data store first
without rewriting every route in one pass.
"""
from __future__ import annotations

import copy
import json
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Optional
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


TIMESTAMP_FIELDS = {
    "created_at",
    "updated_at",
    "expires_at",
    "completed_at",
    "redeemed_at",
    "issued_at",
    "lore_updated_at",
    "ts",
}
DATE_FIELDS = {"date"}


COLLECTIONS: dict[str, dict[str, Any]] = {
    "users": {
        "table": "game_users",
        "id": "user_id",
        "fields": [
            "user_id",
            "andeor_user_id",
            "email",
            "password_hash",
            "name",
            "picture",
            "role",
            "auth_provider",
            "xp",
            "level",
            "avatar",
            "tutorial_completed",
            "regions_unlocked",
            "cards",
            "badges",
            "enrolled_main_quests",
            "focused_main_quest",
            "completed_main_quests",
            "titles_earned",
            "active_self_guided",
            "self_guided_progress",
            "rewards",
            "created_at",
            "updated_at",
        ],
        "json": {"self_guided_progress", "rewards"},
    },
    "user_sessions": {
        "table": "game_user_sessions",
        "id": "session_token",
        "fields": ["session_token", "user_id", "expires_at", "created_at"],
    },
    "regions": {
        "table": "game_regions",
        "id": "region_id",
        "fields": [
            "region_id",
            "name",
            "description",
            "unlock_xp",
            "icon",
            "lore_title",
            "lore_summary",
            "lore_text",
            "lore_updated_at",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "json": {"metadata"},
    },
    "tours": {
        "table": "game_tours",
        "id": "tour_id",
        "fields": [
            "tour_id",
            "name",
            "region",
            "subregion",
            "city_x",
            "city_y",
            "category",
            "description",
            "price",
            "currency",
            "duration",
            "xp_reward",
            "card_id",
            "badge_id",
            "guide_pin",
            "image",
            "lore_title",
            "lore_summary",
            "lore_text",
            "gpx_files",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "field_to_col": {"region": "region_id"},
        "col_to_field": {"region_id": "region"},
        "json": {"gpx_files", "metadata"},
    },
    "quests": {
        "table": "game_quests",
        "id": "quest_id",
        "fields": [
            "quest_id",
            "name",
            "description",
            "type",
            "target",
            "xp_reward",
            "icon",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "json": {"metadata"},
    },
    "reward_templates": {
        "table": "game_reward_templates",
        "id": "reward_id",
        "fields": [
            "reward_id",
            "type",
            "title",
            "description",
            "code_prefix",
            "min_xp",
            "partner",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "json": {"metadata"},
    },
    "bookings": {
        "table": "game_bookings",
        "id": "booking_id",
        "fields": [
            "booking_id",
            "user_id",
            "tour_id",
            "tour_name",
            "status",
            "date",
            "completed_at",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "json": {"metadata"},
    },
    "user_rewards": {
        "table": "game_user_rewards",
        "id": "user_reward_id",
        "fields": [
            "user_reward_id",
            "user_id",
            "template_id",
            "source_main_quest_id",
            "type",
            "title",
            "description",
            "partner",
            "code",
            "discount_pct",
            "redeemed",
            "redeemed_at",
            "issued_at",
            "created_at",
            "updated_at",
        ],
    },
    "chat_messages": {
        "table": "game_chat_messages",
        "id": None,
        "fields": ["session_id", "user_id", "role", "content", "ts"],
    },
    "main_quests": {
        "table": "game_main_quests",
        "id": "main_quest_id",
        "fields": [
            "main_quest_id",
            "title",
            "subtitle",
            "icon",
            "theme_color",
            "theme_hex",
            "tour_ids",
            "lore_intro",
            "epilogue",
            "seal_badge_id",
            "title_earned",
            "discount_pct",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "json": {"metadata"},
    },
    "self_guided": {
        "table": "game_self_guided_journeys",
        "id": "journey_id",
        "fields": [
            "journey_id",
            "subregion",
            "title",
            "subtitle",
            "theme_color",
            "theme_hex",
            "lore_intro",
            "xp_reward",
            "badge_id",
            "stops",
            "metadata",
            "created_at",
            "updated_at",
        ],
        "json": {"stops", "metadata"},
    },
}


@dataclass
class WriteResult:
    inserted_id: Optional[Any] = None
    matched_count: int = 0
    modified_count: int = 0
    upserted_id: Optional[Any] = None


def create_postgres_database(dsn: str) -> "PostgresDatabase":
    return PostgresDatabase(dsn)


class PostgresDatabase:
    def __init__(self, dsn: str):
        self.dsn = _with_sslmode(dsn)
        self.pool = None
        self._collections = {
            name: PostgresCollection(self, name, config)
            for name, config in COLLECTIONS.items()
        }

    async def connect(self) -> None:
        import asyncpg

        async def init(conn):
            await conn.set_type_codec(
                "jsonb",
                encoder=json.dumps,
                decoder=json.loads,
                schema="pg_catalog",
            )
            await conn.set_type_codec(
                "json",
                encoder=json.dumps,
                decoder=json.loads,
                schema="pg_catalog",
            )

        self.pool = await asyncpg.create_pool(
            self.dsn,
            min_size=1,
            max_size=5,
            init=init,
            # Supabase pooler/pgbouncer-style connections can reject cached
            # prepared statements, especially on transaction-pooler ports.
            statement_cache_size=0,
        )

    async def close(self) -> None:
        if self.pool:
            await self.pool.close()

    def __getattr__(self, name: str) -> "PostgresCollection":
        try:
            return self._collections[name]
        except KeyError as exc:
            raise AttributeError(name) from exc


def _with_sslmode(dsn: str) -> str:
    parts = urlsplit(dsn)
    if parts.scheme not in {"postgresql", "postgres"}:
        return dsn
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("sslmode", "require")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


class PostgresCursor:
    def __init__(self, collection: "PostgresCollection", filter_doc: dict, projection: Optional[dict]):
        self.collection = collection
        self.filter_doc = filter_doc or {}
        self.projection = projection
        self.sort_field: Optional[str] = None
        self.sort_dir = 1
        self.limit_count: Optional[int] = None
        self._iter = None

    def sort(self, field: str, direction: int) -> "PostgresCursor":
        self.sort_field = field
        self.sort_dir = direction
        return self

    def limit(self, count: int) -> "PostgresCursor":
        self.limit_count = count
        return self

    async def to_list(self, length: Optional[int]) -> list[dict]:
        limit = self.limit_count
        if length is not None:
            limit = length if limit is None else min(limit, length)
        return await self.collection._find_many(
            self.filter_doc,
            self.projection,
            sort_field=self.sort_field,
            sort_dir=self.sort_dir,
            limit=limit,
        )

    def __aiter__(self):
        self._iter = None
        return self

    async def __anext__(self):
        if self._iter is None:
            self._iter = iter(await self.to_list(self.limit_count))
        try:
            return next(self._iter)
        except StopIteration as exc:
            raise StopAsyncIteration from exc


class PostgresCollection:
    def __init__(self, database: PostgresDatabase, name: str, config: dict[str, Any]):
        self.database = database
        self.name = name
        self.config = config
        self.table = config["table"]
        self.id_field = config.get("id")
        self.fields = list(config["fields"])
        self.field_to_col = config.get("field_to_col", {})
        self.col_to_field = config.get("col_to_field", {})
        self.json_fields = set(config.get("json", set()))

    async def create_index(self, *args, **kwargs) -> None:
        return None

    async def count_documents(self, filter_doc: dict) -> int:
        where, params = self._where(filter_doc or {})
        sql = f"select count(*) from public.{self.table} where {where}"
        async with self.database.pool.acquire() as conn:
            return int(await conn.fetchval(sql, *params))

    async def insert_one(self, doc: dict) -> WriteResult:
        inserted_id = await self._insert(copy.deepcopy(doc), upsert=False)
        return WriteResult(inserted_id=inserted_id, matched_count=0, modified_count=1)

    async def insert_many(self, docs: list[dict]) -> WriteResult:
        inserted = []
        for doc in docs:
            inserted.append(await self._insert(copy.deepcopy(doc), upsert=False))
        return WriteResult(inserted_id=inserted[0] if inserted else None, modified_count=len(inserted))

    def find(self, filter_doc: Optional[dict] = None, projection: Optional[dict] = None) -> PostgresCursor:
        return PostgresCursor(self, filter_doc or {}, projection)

    async def find_one(self, filter_doc: dict, projection: Optional[dict] = None) -> Optional[dict]:
        rows = await self._find_many(filter_doc or {}, projection, limit=1)
        return rows[0] if rows else None

    async def update_one(self, filter_doc: dict, update_doc: dict, upsert: bool = False) -> WriteResult:
        current = await self.find_one(filter_doc or {})
        if current is None:
            if not upsert:
                return WriteResult(matched_count=0, modified_count=0)
            current = self._doc_from_filter(filter_doc or {})
            self._apply_update(current, update_doc or {})
            inserted_id = await self._insert(current, upsert=True)
            return WriteResult(inserted_id=inserted_id, upserted_id=inserted_id, matched_count=0, modified_count=1)

        self._apply_update(current, update_doc or {})
        await self._replace(current)
        return WriteResult(matched_count=1, modified_count=1)

    async def update_many(self, filter_doc: dict, update_doc: dict) -> WriteResult:
        rows = await self._find_many(filter_doc or {}, None, limit=None)
        modified = 0
        for row in rows:
            self._apply_update(row, update_doc or {})
            await self._replace(row)
            modified += 1
        return WriteResult(matched_count=len(rows), modified_count=modified)

    async def delete_one(self, filter_doc: dict) -> WriteResult:
        current = await self.find_one(filter_doc or {})
        if not current or not self.id_field:
            return WriteResult(matched_count=0, modified_count=0)
        id_value = current[self.id_field]
        id_col = self._col(self.id_field)
        async with self.database.pool.acquire() as conn:
            await conn.execute(f"delete from public.{self.table} where {id_col} = $1", id_value)
        return WriteResult(matched_count=1, modified_count=1)

    async def _find_many(
        self,
        filter_doc: dict,
        projection: Optional[dict],
        sort_field: Optional[str] = None,
        sort_dir: int = 1,
        limit: Optional[int] = None,
    ) -> list[dict]:
        where, params = self._where(filter_doc or {})
        sql = f"select * from public.{self.table} where {where}"
        if sort_field:
            sql += f" order by {self._col(sort_field)} {'desc' if sort_dir == -1 else 'asc'}"
        if limit is not None:
            params.append(limit)
            sql += f" limit ${len(params)}"
        async with self.database.pool.acquire() as conn:
            records = await conn.fetch(sql, *params)
        docs = [self._row_to_doc(dict(record)) for record in records]
        return [self._project(doc, projection) for doc in docs]

    async def _insert(self, doc: dict, upsert: bool) -> Optional[Any]:
        row = self._doc_to_row(doc)
        if not row:
            return None
        cols = list(row.keys())
        placeholders = [f"${i}" for i in range(1, len(cols) + 1)]
        values = [row[col] for col in cols]
        sql = f"insert into public.{self.table} ({', '.join(cols)}) values ({', '.join(placeholders)})"
        if upsert and self.id_field:
            id_col = self._col(self.id_field)
            update_cols = [col for col in cols if col != id_col]
            if update_cols:
                assignments = ", ".join(f"{col} = excluded.{col}" for col in update_cols)
                sql += f" on conflict ({id_col}) do update set {assignments}"
            else:
                sql += f" on conflict ({id_col}) do nothing"
        async with self.database.pool.acquire() as conn:
            await conn.execute(sql, *values)
        return doc.get(self.id_field) if self.id_field else None

    async def _replace(self, doc: dict) -> None:
        if not self.id_field:
            return
        row = self._doc_to_row(doc)
        id_col = self._col(self.id_field)
        id_value = row.pop(id_col, None)
        if id_value is None:
            return
        row.pop("updated_at", None)
        cols = list(row.keys())
        if not cols:
            return
        assignments = [f"{col} = ${i}" for i, col in enumerate(cols, start=1)]
        values = [row[col] for col in cols]
        values.append(id_value)
        sql = f"update public.{self.table} set {', '.join(assignments)} where {id_col} = ${len(values)}"
        async with self.database.pool.acquire() as conn:
            await conn.execute(sql, *values)

    def _where(self, filter_doc: dict) -> tuple[str, list[Any]]:
        if not filter_doc:
            return "true", []

        clauses = []
        params: list[Any] = []
        for field, value in filter_doc.items():
            col = self._col(field)
            if isinstance(value, dict):
                if "$in" in value:
                    params.append(value["$in"])
                    clauses.append(f"{col} = any(${len(params)}::text[])")
                elif "$ne" in value:
                    ne_value = value["$ne"]
                    if ne_value is None:
                        clauses.append(f"{col} is not null")
                    else:
                        params.append(self._to_db_value(field, ne_value))
                        clauses.append(f"{col} <> ${len(params)}")
                else:
                    raise ValueError(f"Unsupported filter operator for {field}: {value}")
            elif value is None:
                clauses.append(f"{col} is null")
            else:
                params.append(self._to_db_value(field, value))
                clauses.append(f"{col} = ${len(params)}")
        return " and ".join(clauses), params

    def _doc_to_row(self, doc: dict) -> dict[str, Any]:
        row = {}
        for field in self.fields:
            if field not in doc:
                continue
            col = self._col(field)
            row[col] = self._to_db_value(field, doc[field])
        return row

    def _row_to_doc(self, row: dict[str, Any]) -> dict:
        doc = {}
        for col, value in row.items():
            field = self.col_to_field.get(col, col)
            doc[field] = self._from_db_value(value)
        doc.pop("_id", None)
        return doc

    def _project(self, doc: dict, projection: Optional[dict]) -> dict:
        if not projection:
            return doc
        include = {k for k, v in projection.items() if v and k != "_id"}
        exclude = {k for k, v in projection.items() if not v and k != "_id"}
        if include:
            return {k: doc[k] for k in include if k in doc}
        projected = dict(doc)
        for key in exclude:
            projected.pop(key, None)
        return projected

    def _doc_from_filter(self, filter_doc: dict) -> dict:
        doc = {}
        for field, value in filter_doc.items():
            if isinstance(value, dict):
                continue
            doc[field] = value
        return doc

    def _apply_update(self, doc: dict, update_doc: dict) -> None:
        has_operator = any(key.startswith("$") for key in update_doc)
        if not has_operator:
            update_doc = {"$set": update_doc}

        for field, value in update_doc.get("$set", {}).items():
            self._set_path(doc, field, value)

        for field, value in update_doc.get("$push", {}).items():
            items = self._get_path(doc, field)
            if not isinstance(items, list):
                items = []
                self._set_path(doc, field, items)
            items.append(value)

        for field, value in update_doc.get("$addToSet", {}).items():
            items = self._get_path(doc, field)
            if not isinstance(items, list):
                items = []
                self._set_path(doc, field, items)
            if value not in items:
                items.append(value)

        for field, criteria in update_doc.get("$pull", {}).items():
            items = self._get_path(doc, field)
            if not isinstance(items, list):
                continue
            if isinstance(criteria, dict):
                doc[field] = [
                    item for item in items
                    if not (isinstance(item, dict) and all(item.get(k) == v for k, v in criteria.items()))
                ]
            else:
                doc[field] = [item for item in items if item != criteria]

    def _get_path(self, doc: dict, path: str) -> Any:
        current = doc
        for part in path.split("."):
            if not isinstance(current, dict):
                return None
            current = current.get(part)
        return current

    def _set_path(self, doc: dict, path: str, value: Any) -> None:
        parts = path.split(".")
        current = doc
        for part in parts[:-1]:
            nested = current.get(part)
            if not isinstance(nested, dict):
                nested = {}
                current[part] = nested
            current = nested
        current[parts[-1]] = value

    def _col(self, field: str) -> str:
        return self.field_to_col.get(field, field)

    def _to_db_value(self, field: str, value: Any) -> Any:
        if value is None:
            return None
        if field in TIMESTAMP_FIELDS and isinstance(value, str):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        if field in DATE_FIELDS and isinstance(value, str):
            return date.fromisoformat(value)
        return value

    def _from_db_value(self, value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, date):
            return value.isoformat()
        if isinstance(value, Decimal):
            as_float = float(value)
            return int(as_float) if as_float.is_integer() else as_float
        if isinstance(value, list):
            return [self._from_db_value(item) for item in value]
        if isinstance(value, dict):
            return {key: self._from_db_value(item) for key, item in value.items()}
        return value
