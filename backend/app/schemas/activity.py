from datetime import datetime
from typing import Optional
from pydantic import BaseModel,ConfigDict

class CategoryResponse(BaseModel):
    model_config=ConfigDict(from_attributes=True)
    id:int
    name:str
    description:Optional[str]=None

class ActivityBase(BaseModel):
    title:str
    description:str
    category_id:int
    duration_min:Optional[int]=None
    budget_level:int=0
    is_outdoor:bool=False

class ActivityCreate(ActivityBase):
    pass

class ActivityResponse(ActivityBase):
    model_config=ConfigDict(from_attributes=True)
    id:int
    created_at:datetime
    category:Optional[CategoryResponse]=None
