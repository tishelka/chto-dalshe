from typing import List,Optional
from fastapi import APIRouter,Depends,Header,HTTPException,status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session,joinedload
from app.core.database import get_db
from app.models.models import Activity,Category,Favorite,RecommendationHistory,User
from app.schemas.user import (
    FavoriteCreate,
    FavoriteResponse,
    HistoryCreate,
    HistoryResponse,
    SearchParamsSchema,
    UserInterestsResponse,
    UserInterestsUpdate,
)
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.recommendation_engine import recommend

router=APIRouter(prefix="/users/me",tags=["users"])

def get_current_user(
    x_device_id:str=Header(...,alias="X-Device-ID",min_length=1),
    db:Session=Depends(get_db),
)->User:
    user=db.query(User).filter(User.device_id==x_device_id).first()
    if not user:
        user=User(device_id=x_device_id)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

@router.get("/interests",response_model=UserInterestsResponse)
def get_user_interests(current_user:User=Depends(get_current_user)):
    return UserInterestsResponse(interests=current_user.interests)

@router.put("/interests",response_model=UserInterestsResponse)
def update_user_interests(
    payload:UserInterestsUpdate,
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    unique_ids=list(dict.fromkeys(payload.category_ids))
    if not unique_ids:
        current_user.interests=[]
        db.commit()
        db.refresh(current_user)
        return UserInterestsResponse(interests=[])

    categories=db.query(Category).filter(Category.id.in_(unique_ids)).all()
    if len(categories)!=len(unique_ids):
        found_ids={c.id for c in categories}
        missing_ids=[cid for cid in unique_ids if cid not in found_ids]
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Categories not found: {missing_ids}",
        )

    current_user.interests=categories
    db.commit()
    db.refresh(current_user)
    return UserInterestsResponse(interests=current_user.interests)

@router.get("/search-params",response_model=Optional[SearchParamsSchema])
def get_last_search_params(current_user:User=Depends(get_current_user)):
    if not current_user.last_search_params:
        return None
    return SearchParamsSchema(**current_user.last_search_params)

@router.put("/search-params",response_model=SearchParamsSchema)
def save_last_search_params(
    payload:SearchParamsSchema,
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    current_user.last_search_params=payload.model_dump()
    db.commit()
    db.refresh(current_user)
    return SearchParamsSchema(**current_user.last_search_params)

@router.post("/recommendations",response_model=RecommendationResponse)
def get_recommendation(
    payload:RecommendationRequest,
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    search_params=current_user.last_search_params if payload.use_saved_params else None
    search_params=search_params or {}
    filters={
        "participants":None,
        "available_minutes":search_params.get("duration_min"),
        "budget_per_person":search_params.get("budget_level"),
        "location":"any" if search_params.get("is_outdoor") is None else "outdoors" if search_params["is_outdoor"] else "home",
        "mood":"any",
    }
    interest_ids={str(category.id) for category in current_user.interests}
    interest_ids.update(str(category_id) for category_id in search_params.get("category_ids") or [])
    activities=db.query(Activity).options(joinedload(Activity.category)).all()
    result=recommend(
        activities=activities,
        filters=filters,
        interests=sorted(interest_ids),
        shown_ids=payload.shown_ids,
    )
    if result["kind"]=="success":
        recommendation=result["recommendation"]
        return {
            "kind":"success",
            "recommendation":{
                "activity":recommendation["activity"].activity,
                "score":recommendation["score"],
                "reasons":recommendation["reasons"],
            },
            "eligible_count":result["eligible_count"],
            "remaining_count":result["remaining_count"],
        }
    return result

@router.get("/favorites",response_model=List[FavoriteResponse])
def get_favorites(
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    return (
        db.query(Favorite)
        .options(joinedload(Favorite.activity).joinedload(Activity.category))
        .filter(Favorite.user_id==current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )

@router.post("/favorites",response_model=FavoriteResponse,status_code=status.HTTP_201_CREATED)
def add_favorite(
    payload:FavoriteCreate,
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    activity=(
        db.query(Activity)
        .options(joinedload(Activity.category))
        .filter(Activity.id==payload.activity_id)
        .first()
    )
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {payload.activity_id} not found",
        )

    existing=(
        db.query(Favorite)
        .options(joinedload(Favorite.activity).joinedload(Activity.category))
        .filter(
            Favorite.user_id==current_user.id,
            Favorite.activity_id==payload.activity_id,
        )
        .first()
    )
    if existing:
        return existing

    favorite=Favorite(user_id=current_user.id,activity_id=payload.activity_id)
    db.add(favorite)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        existing=(
            db.query(Favorite)
            .options(joinedload(Favorite.activity).joinedload(Activity.category))
            .filter(
                Favorite.user_id==current_user.id,
                Favorite.activity_id==payload.activity_id,
            )
            .first()
        )
        if existing:
            return existing
        raise

    db.refresh(favorite)
    return (
        db.query(Favorite)
        .options(joinedload(Favorite.activity).joinedload(Activity.category))
        .filter(Favorite.id==favorite.id)
        .first()
    )

@router.delete("/favorites/{activity_id}",status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    activity_id:int,
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    favorite=(
        db.query(Favorite)
        .filter(
            Favorite.user_id==current_user.id,
            Favorite.activity_id==activity_id,
        )
        .first()
    )
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Favorite activity with id {activity_id} not found",
        )

    db.delete(favorite)
    db.commit()
    return None

@router.get("/history",response_model=List[HistoryResponse])
def get_recommendation_history(
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    return (
        db.query(RecommendationHistory)
        .options(joinedload(RecommendationHistory.activity).joinedload(Activity.category))
        .filter(RecommendationHistory.user_id==current_user.id)
        .order_by(RecommendationHistory.created_at.desc())
        .limit(100)
        .all()
    )

@router.post("/history",response_model=HistoryResponse,status_code=status.HTTP_201_CREATED)
def add_recommendation_history(
    payload:HistoryCreate,
    current_user:User=Depends(get_current_user),
    db:Session=Depends(get_db),
):
    activity=(
        db.query(Activity)
        .options(joinedload(Activity.category))
        .filter(Activity.id==payload.activity_id)
        .first()
    )
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {payload.activity_id} not found",
        )

    history=RecommendationHistory(
        user_id=current_user.id,
        activity_id=payload.activity_id,
        action=payload.action,
    )
    db.add(history)
    db.commit()
    db.refresh(history)
    return (
        db.query(RecommendationHistory)
        .options(joinedload(RecommendationHistory.activity).joinedload(Activity.category))
        .filter(RecommendationHistory.id==history.id)
        .first()
    )
