from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.data.categories import CATEGORY_CATALOG
from app.models.models import Category
from app.schemas.activity import CategoryResponse

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    catalog_order = {
        category["name"]: index
        for index, category in enumerate(CATEGORY_CATALOG)
    }
    return sorted(
        categories,
        key=lambda category: catalog_order.get(category.name, len(catalog_order)),
    )
