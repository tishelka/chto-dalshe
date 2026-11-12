from typing import List,Optional
from fastapi import APIRouter,Depends,HTTPException,status,Query
from sqlalchemy.orm import Session,joinedload
from app.core.database import get_db
from app.models.models import Activity
from app.schemas.activity import ActivityResponse

router=APIRouter(prefix="/activities",tags=["activities"])

@router.get("",response_model=List[ActivityResponse])
def get_activities(
    skip:int=Query(0,ge=0),
    limit:int=Query(100,ge=1,le=100),
    category_id:Optional[int]=None,
    db:Session=Depends(get_db)
):
    query=db.query(Activity).options(joinedload(Activity.category))
    if category_id is not None:
        query=query.filter(Activity.category_id==category_id)
    return query.offset(skip).limit(limit).all()

@router.get("/{id}",response_model=ActivityResponse)
def get_activity_by_id(id:int,db:Session=Depends(get_db)):
    activity=db.query(Activity).options(joinedload(Activity.category)).filter(Activity.id==id).first()
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Activity with id {id} not found"
        )
    return activity
