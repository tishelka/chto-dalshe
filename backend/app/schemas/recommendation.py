from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.activity import ActivityResponse


class RecommendationRequest(BaseModel):
    shown_ids: List[int] = Field(default_factory=list)
    use_saved_params: bool = False


class RankedRecommendationResponse(BaseModel):
    activity: ActivityResponse
    score: int
    reasons: List[str]


class RecommendationResponse(BaseModel):
    kind: Literal["success", "empty", "exhausted", "invalid"]
    recommendation: Optional[RankedRecommendationResponse] = None
    eligible_count: Optional[int] = None
    remaining_count: Optional[int] = None
    errors: List[str] = Field(default_factory=list)
