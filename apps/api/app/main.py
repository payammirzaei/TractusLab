from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .auth import create_auth_session, get_current_user
from .config import settings
from .db import Base, engine, get_db
from .models import BossScore, ScenarioProgress, User
from .schemas import (
    BossScoreResponse,
    BossScoreUpdate,
    GuestSessionRequest,
    ProgressResponse,
    ProgressUpdate,
    SessionResponse,
    StateResponse,
    UserResponse,
    UserUpdate,
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, display_name=user.display_name)


def progress_response(row: ScenarioProgress) -> ProgressResponse:
    return ProgressResponse(
        scenario_id=row.scenario_id,
        max_step=row.max_step,
        completed=row.completed,
        solved_challenges=list(row.solved_challenges or []),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/session/guest", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_guest_session(payload: GuestSessionRequest, db: Session = Depends(get_db)) -> SessionResponse:
    display_name = payload.display_name.strip() if payload.display_name else None
    display_name = display_name or None
    user = User(display_name=display_name)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_auth_session(db, user)
    return SessionResponse(access_token=token, user=user_response(user))


@app.get("/v1/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return user_response(user)


@app.patch("/v1/me", response_model=UserResponse)
def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    if "display_name" in payload.model_fields_set:
        value = payload.display_name.strip() if payload.display_name else None
        user.display_name = value or None
        db.add(user)
        db.commit()
        db.refresh(user)
    return user_response(user)


@app.get("/v1/state", response_model=StateResponse)
def state(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StateResponse:
    progress_rows = db.scalars(select(ScenarioProgress).where(ScenarioProgress.user_id == user.id)).all()
    score_rows = db.scalars(select(BossScore).where(BossScore.user_id == user.id)).all()
    return StateResponse(
        user=user_response(user),
        progress={row.scenario_id: progress_response(row) for row in progress_rows},
        boss_scores={row.scenario_id: row.score for row in score_rows},
    )


@app.put("/v1/progress/{scenario_id}", response_model=ProgressResponse)
def save_progress(
    scenario_id: str,
    payload: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProgressResponse:
    row = db.scalar(
        select(ScenarioProgress).where(
            ScenarioProgress.user_id == user.id,
            ScenarioProgress.scenario_id == scenario_id,
        )
    )
    incoming_challenges = {item.strip() for item in payload.solved_challenges if item.strip()}
    if row is None:
        row = ScenarioProgress(
            user_id=user.id,
            scenario_id=scenario_id,
            max_step=payload.max_step,
            completed=payload.completed,
            solved_challenges=sorted(incoming_challenges),
        )
        db.add(row)
    else:
        row.max_step = max(row.max_step, payload.max_step)
        row.completed = row.completed or payload.completed
        row.solved_challenges = sorted(set(row.solved_challenges or []) | incoming_challenges)
    db.commit()
    db.refresh(row)
    return progress_response(row)


@app.delete("/v1/progress", status_code=status.HTTP_204_NO_CONTENT)
def clear_progress(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    db.execute(delete(ScenarioProgress).where(ScenarioProgress.user_id == user.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.put("/v1/boss-scores/{scenario_id}", response_model=BossScoreResponse)
def save_boss_score(
    scenario_id: str,
    payload: BossScoreUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> BossScoreResponse:
    row = db.scalar(
        select(BossScore).where(BossScore.user_id == user.id, BossScore.scenario_id == scenario_id)
    )
    if row is None:
        row = BossScore(user_id=user.id, scenario_id=scenario_id, score=payload.score)
        db.add(row)
    else:
        row.score = max(row.score, payload.score)
    db.commit()
    db.refresh(row)
    return BossScoreResponse(scenario_id=row.scenario_id, score=row.score)


@app.delete("/v1/boss-scores", status_code=status.HTTP_204_NO_CONTENT)
def clear_boss_scores(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    db.execute(delete(BossScore).where(BossScore.user_id == user.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
