from datetime import timedelta

from fastapi import BackgroundTasks, Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .admin_api import router as admin_router
from .auth import (
    RESET_PASSWORD_PURPOSE,
    VERIFY_EMAIL_PURPOSE,
    create_account_token,
    create_auth_session,
    get_current_session,
    get_current_user,
    get_valid_account_token,
    hash_password,
    utcnow,
    verify_password,
)
from .config import settings
from .content_api import router as content_router
from .db import get_db
from .email_delivery import send_password_reset_email, send_verification_email
from .models import AccountToken, AuthSession, BossScore, ScenarioProgress, User
from .rbac import apply_bootstrap_role
from .schemas import (
    BossScoreResponse,
    BossScoreUpdate,
    ChangePasswordRequest,
    EmailActionResponse,
    EmailVerificationConfirmRequest,
    GuestSessionRequest,
    LoginRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    ProgressResponse,
    ProgressUpdate,
    RegisterRequest,
    SessionInfo,
    SessionResponse,
    SessionsResponse,
    StateResponse,
    UserResponse,
    UserUpdate,
)

app = FastAPI(title=settings.app_name, version="0.4.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(content_router)
app.include_router(admin_router)


def normalize_email(value: str) -> str:
    return value.strip().lower()


def user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_guest=user.is_guest,
        email_verified=user.email_verified_at is not None,
        role=user.role,
    )


def progress_response(row: ScenarioProgress) -> ProgressResponse:
    return ProgressResponse(
        scenario_id=row.scenario_id,
        max_step=row.max_step,
        completed=row.completed,
        solved_challenges=list(row.solved_challenges or []),
    )


def action_response(message: str, raw_token: str | None = None) -> EmailActionResponse:
    return EmailActionResponse(
        message=message,
        debug_token=raw_token if settings.expose_dev_tokens else None,
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


@app.post("/v1/auth/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register_account(
    payload: RegisterRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    if not user.is_guest:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Current user already has an account")

    email = normalize_email(str(payload.email))
    if db.scalar(select(User).where(User.email == email)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists")

    user.email = email
    user.password_hash = hash_password(payload.password)
    apply_bootstrap_role(user)
    if payload.display_name is not None:
        display_name = payload.display_name.strip()
        user.display_name = display_name or None
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists") from exc
    db.refresh(user)

    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.commit()
    token = create_auth_session(db, user)
    return SessionResponse(access_token=token, user=user_response(user))


@app.post("/v1/auth/login", response_model=SessionResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> SessionResponse:
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))
    password_hash = user.password_hash if user is not None else None
    if not verify_password(payload.password, password_hash) or user is None or user.is_guest:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if apply_bootstrap_role(user):
        db.add(user)
        db.commit()
        db.refresh(user)
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


@app.post("/v1/auth/change-password", response_model=SessionResponse)
def change_password(
    payload: ChangePasswordRequest,
    auth_session: AuthSession = Depends(get_current_session),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SessionResponse:
    if user.is_guest or not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    if verify_password(payload.new_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="New password must be different")

    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    db.execute(delete(AuthSession).where(AuthSession.user_id == auth_session.user_id))
    db.commit()
    token = create_auth_session(db, user)
    return SessionResponse(access_token=token, user=user_response(user))


@app.post("/v1/auth/password-reset/request", response_model=EmailActionResponse, status_code=status.HTTP_202_ACCEPTED)
def request_password_reset(
    payload: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
) -> EmailActionResponse:
    message = "If an account exists for that email, a password reset link has been prepared."
    email = normalize_email(str(payload.email))
    user = db.scalar(select(User).where(User.email == email))
    if user is None or user.is_guest:
        return action_response(message)

    raw_token = create_account_token(
        db,
        user,
        RESET_PASSWORD_PURPOSE,
        timedelta(minutes=settings.password_reset_ttl_minutes),
    )
    background_tasks.add_task(send_password_reset_email, email, raw_token)
    return action_response(message, raw_token)


@app.post("/v1/auth/password-reset/confirm", response_model=SessionResponse)
def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: Session = Depends(get_db),
) -> SessionResponse:
    token_row = get_valid_account_token(db, payload.token, RESET_PASSWORD_PURPOSE)
    if token_row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or expired")

    user = db.get(User, token_row.user_id)
    if user is None or user.is_guest:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token is invalid or expired")

    user.password_hash = hash_password(payload.new_password)
    token_row.used_at = utcnow()
    db.add(user)
    db.add(token_row)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id))
    db.execute(
        delete(AccountToken).where(
            AccountToken.user_id == user.id,
            AccountToken.purpose == RESET_PASSWORD_PURPOSE,
            AccountToken.id != token_row.id,
        )
    )
    db.commit()
    token = create_auth_session(db, user)
    return SessionResponse(access_token=token, user=user_response(user))


@app.post("/v1/auth/email-verification/request", response_model=EmailActionResponse, status_code=status.HTTP_202_ACCEPTED)
def request_email_verification(
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> EmailActionResponse:
    if user.is_guest or not user.email:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Create an account before verifying email")
    if user.email_verified_at is not None:
        return action_response("Email is already verified.")

    raw_token = create_account_token(
        db,
        user,
        VERIFY_EMAIL_PURPOSE,
        timedelta(hours=settings.email_verification_ttl_hours),
    )
    background_tasks.add_task(send_verification_email, user.email, raw_token)
    return action_response("Verification link prepared.", raw_token)


@app.post("/v1/auth/email-verification/confirm", response_model=UserResponse)
def confirm_email_verification(
    payload: EmailVerificationConfirmRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    token_row = get_valid_account_token(db, payload.token, VERIFY_EMAIL_PURPOSE)
    if token_row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token is invalid or expired")

    user = db.get(User, token_row.user_id)
    if user is None or user.is_guest:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token is invalid or expired")

    user.email_verified_at = utcnow()
    token_row.used_at = utcnow()
    db.add(user)
    db.add(token_row)
    db.execute(
        delete(AccountToken).where(
            AccountToken.user_id == user.id,
            AccountToken.purpose == VERIFY_EMAIL_PURPOSE,
            AccountToken.id != token_row.id,
        )
    )
    db.commit()
    db.refresh(user)
    return user_response(user)


@app.get("/v1/auth/sessions", response_model=SessionsResponse)
def list_sessions(
    auth_session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> SessionsResponse:
    rows = db.scalars(
        select(AuthSession)
        .where(AuthSession.user_id == auth_session.user_id, AuthSession.expires_at > utcnow())
        .order_by(AuthSession.created_at.desc())
    ).all()
    return SessionsResponse(
        sessions=[
            SessionInfo(
                id=row.id,
                current=row.id == auth_session.id,
                created_at=row.created_at,
                expires_at=row.expires_at,
            )
            for row in rows
        ]
    )


@app.delete("/v1/auth/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: str,
    auth_session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> Response:
    row = db.get(AuthSession, session_id)
    if row is None or row.user_id != auth_session.user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/v1/auth/sessions/revoke-others", status_code=status.HTTP_204_NO_CONTENT)
def revoke_other_sessions(
    auth_session: AuthSession = Depends(get_current_session),
    db: Session = Depends(get_db),
) -> Response:
    db.execute(
        delete(AuthSession).where(
            AuthSession.user_id == auth_session.user_id,
            AuthSession.id != auth_session.id,
        )
    )
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
