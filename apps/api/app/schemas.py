from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class GuestSessionRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    display_name: str | None = Field(default=None, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=10, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)
    new_password: str = Field(min_length=10, max_length=128)


class EmailVerificationConfirmRequest(BaseModel):
    token: str = Field(min_length=20, max_length=256)


class UserResponse(BaseModel):
    id: str
    email: str | None
    display_name: str | None
    is_guest: bool
    email_verified: bool
    role: str


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class EmailActionResponse(BaseModel):
    message: str
    debug_token: str | None = None


class SessionInfo(BaseModel):
    id: str
    current: bool
    created_at: datetime
    expires_at: datetime


class SessionsResponse(BaseModel):
    sessions: list[SessionInfo]


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)


class ProgressUpdate(BaseModel):
    max_step: int = Field(default=0, ge=0)
    completed: bool = False
    solved_challenges: list[str] = Field(default_factory=list)


class ProgressResponse(ProgressUpdate):
    scenario_id: str


class BossScoreUpdate(BaseModel):
    score: int = Field(ge=0, le=100)


class BossScoreResponse(BossScoreUpdate):
    scenario_id: str


class StateResponse(BaseModel):
    user: UserResponse
    progress: dict[str, ProgressResponse]
    boss_scores: dict[str, int]
