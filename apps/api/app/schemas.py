from pydantic import BaseModel, Field


class GuestSessionRequest(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)


class UserResponse(BaseModel):
    id: str
    display_name: str | None


class SessionResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


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
