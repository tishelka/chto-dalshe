import json
import os
from app.core.database import SessionLocal
from app.data.categories import CATEGORY_CATALOG
from app.models.models import Activity,Category

DATA_FILE=os.path.join(os.path.dirname(__file__),"data","initial_activities.json")
LEGACY_CATEGORY_NAMES={
    "Настолки":"Настольные игры",
    "Культура":"Музеи и выставки",
}

def seed_categories(db):
    categories={category.name:category for category in db.query(Category).all()}

    for old_name,new_name in LEGACY_CATEGORY_NAMES.items():
        old_category=categories.get(old_name)
        if old_category is None:
            continue

        new_category=categories.get(new_name)
        if new_category is None:
            old_category.name=new_name
            categories.pop(old_name)
            categories[new_name]=old_category
        else:
            db.query(Activity).filter(Activity.category_id==old_category.id).update(
                {Activity.category_id:new_category.id},
                synchronize_session=False,
            )
            for user in list(old_category.interested_users):
                if new_category.id not in {interest.id for interest in user.interests}:
                    user.interests.append(new_category)
                user.interests.remove(old_category)
            db.delete(old_category)
            categories.pop(old_name)

    for item in CATEGORY_CATALOG:
        category=categories.get(item["name"])
        if category is None:
            category=Category(name=item["name"],description=item["description"])
            db.add(category)
            categories[item["name"]]=category
        else:
            category.description=item["description"]

    db.flush()
    return categories

def seed_activities():
    if not os.path.exists(DATA_FILE):
        return
    with open(DATA_FILE,"r",encoding="utf-8") as f:
        items=json.load(f)
    db=SessionLocal()
    try:
        categories_cache=seed_categories(db)
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
