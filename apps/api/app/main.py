from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .auth import create_auth_session, get_current_session, get_current_user, hash_password, verify_password
from .config import settings
from .db import get_db
from .models import AuthSession, BossScore, ScenarioProgress, User
from .schemas import (
    BossScoreResponse,
    BossScoreUpdate,
    GuestSessionRequest,
    LoginRequest,
    ProgressResponse,
    ProgressUpdate,
    RegisterRequest,
    SessionResponse,
    StateResponse,
    UserResponse,
    UserUpdate,
)

app = FastAPI(title=settings.app_name, version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def normalize_email(value: str) -> str:
    return value.strip().lower()


def user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, display_name=user.display_name, is_guest=user.is_guest)


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
    user = User(display_name=display_name or None)
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_auth_session(db, user)
    return SessionResponse(access_token=token, user=user_response(user))


@app.post("/v1/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_account(
    payload: RegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    if not user.is_guest:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Current user already has an account")

    email = normalize_email(str(payload.email))
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user.email = email
    user.password_hash = hash_password(payload.password)
    if payload.display_name is not None:
        display_name = payload.display_name.strip()
        user.display_name = display_name or None
    db.add(user)
    db.commit()
    db.refresh(user)
    return user_response(user)


@app.post("/v1/auth/login", response_model=SessionResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> SessionResponse:
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))
    password_hash = user.password_hash if user is not None else None
    if not verify_password(payload.password, password_hash) or user is None or user.is_guest:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    token = create_auth_session(db, user)
    return SessionResponse(access_token=token, user=user_response(user))


@app.post("/v1/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    auth_session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> Response:
    db.delete(auth_session)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/v1/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)) -> UserResponse:
    return user_response(user)


@app.patch("/v1/me", response_model=UserResponse)
def update_me(payload: UserUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserResponse:
    if "display_name" in payload.model_fields_set:
        value = payload.display_name.strip() if payload.display_name else None
        user.display_name = value or None
        db.add(user)
        db.commit()
        db.refresh(user)
    return user_response(user)


@app.get("/v1/state", response_model=StateResponse)
def state(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> StateResponse:
    progress_rows = db.scalars(select(ScenarioProgress).where(ScenarioProgress.user_id == user.id)).all()
    score_rows = db.scalars(select(BossScore).where(BossScore.user_id == user.id)).all()
    return StateResponse(
        user=user_response(user),
        progress={row.scenario_id: progress_response(row) for row in progress_rows},
        boss_scores={row.scenario_id: row.score for row in score_rows},
    )


@app.put("/v1/progress/{scenario_id}", response_model=ProgressResponse)
def save_progress(scenario_id: str, payload: ProgressUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> ProgressResponse:
    row = db.scalar(select(ScenarioProgress).where(ScenarioProgress.user_id == user.id, ScenarioProgress.scenario_id == scenario_id))
    incoming_challenges = {item.strip() for item in payload.solved_challenges if item.strip()}
    if row is None:
        row = ScenarioProgress(user_id=user.id, scenario_id=scenario_id, max_step=payload.max_step, completed=payload.completed, solved_challenges=sorted(incoming_challenges))
        db.add(row)
    else:
        row.max_step = max(row.max_step, payload.max_step)
        row.completed = row.completed or payload.completed
        row.solved_challenges = sorted(set(row.solved_challenges or []) | incoming_challenges)
    db.commit()
    db.refresh(row)
    return progress_response(row)


@app.delete("/v1/progress", status_code=status.HTTP_204_NO_CONTENT)
def clear_progress(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    db.execute(delete(ScenarioProgress).where(ScenarioProgress.user_id == user.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.put("/v1/boss-scores/{scenario_id}", response_model=BossScoreResponse)
def save_boss_score(scenario_id: str, payload: BossScoreUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BossScoreResponse:
    row = db.scalar(select(BossScore).where(BossScore.user_id == user.id, BossScore.scenario_id == scenario_id))
    if row is None:
        row = BossScore(user_id=user.id, scenario_id=scenario_id, score=payload.score)
        db.add(row)
    else:
        row.score = max(row.score, payload.score)
    db.commit()
    db.refresh(row)
    return BossScoreResponse(scenario_id=row.scenario_id, score=row.score)


@app.delete("/v1/boss-scores", status_code=status.HTTP_204_NO_CONTENT)
def clear_boss_scores(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Response:
    db.execute(delete(BossScore).where(BossScore.user_id == user.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
