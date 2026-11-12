import json
import os
from app.core.database import SessionLocal
from app.models.models import Activity,Category

DATA_FILE=os.path.join(os.path.dirname(__file__),"data","initial_activities.json")

def seed_activities():
    if not os.path.exists(DATA_FILE):
        return
    with open(DATA_FILE,"r",encoding="utf-8") as f:
        items=json.load(f)
    db=SessionLocal()
    try:
        categories_cache={c.name:c for c in db.query(Category).all()}
        inserted=0
        for item in items:
            cat_name=item["category_name"]
            if cat_name not in categories_cache:
                category=Category(name=cat_name,description=item.get("category_description"))
                db.add(category)
                db.flush()
                categories_cache[cat_name]=category
            category=categories_cache[cat_name]
            exists=db.query(Activity).filter(
                Activity.title==item["title"],
                Activity.category_id==category.id
            ).first()
            if exists:
                continue
            act=Activity(
                title=item["title"],
                description=item["description"],
                category_id=category.id,
                duration_min=item.get("duration_min"),
                budget_level=item.get("budget_level",0),
                is_outdoor=item.get("is_outdoor",False)
            )
            db.add(act)
            inserted+=1
        db.commit()
        print(f"Seed finished. Added {inserted} new activities.")
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

if __name__=="__main__":
    seed_activities()
