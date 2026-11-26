from dataclasses import dataclass
import math
import random
from typing import Any, Sequence

from app.models.models import Activity

SCORING = {
    "mood": 3,
    "interest": 2,
    "tag": 1,
    "time_fit": 1,
    "time_fit_window_minutes": 30,
    "candidate_limit": 10,
}


@dataclass(frozen=True)
class Candidate:
    activity: Activity
    id: str
    category: str
    locations: tuple[str, ...]
    duration_minutes: int | None
    estimated_cost_per_person: int
    min_participants: int
    max_participants: int
    is_active: bool = True
    moods: tuple[str, ...] = ()
    tags: tuple[str, ...] = ()


def adapt_activity(activity: Activity) -> Candidate:
    return Candidate(
        activity=activity,
        id=str(activity.id),
        category=str(activity.category_id),
        locations=("outdoors",) if activity.is_outdoor else ("home",),
        duration_minutes=activity.duration_min,
        estimated_cost_per_person=activity.budget_level,
        min_participants=1,
        max_participants=10,
    )


def validate_filters(filters: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    participants = filters.get("participants")
    available_minutes = filters.get("available_minutes")
    budget_per_person = filters.get("budget_per_person")
    location = filters.get("location", "any")
    mood = filters.get("mood", "any")

    if participants is not None and (
        isinstance(participants, bool)
        or not isinstance(participants, int)
        or participants < 1
        or participants > 10
    ):
        errors.append("Количество участников должно быть целым числом от 1 до 10")

    if available_minutes is not None and (
        isinstance(available_minutes, bool)
        or not isinstance(available_minutes, (int, float))
        or not math.isfinite(available_minutes)
        or available_minutes <= 0
    ):
        errors.append("Время должно быть конечным числом больше 0")

    if budget_per_person is not None and (
        isinstance(budget_per_person, bool)
        or not isinstance(budget_per_person, (int, float))
        or not math.isfinite(budget_per_person)
        or budget_per_person < 0
    ):
        errors.append("Бюджет должен быть конечным числом не меньше 0")

    if location not in ("any", "home", "outdoors", "venue"):
        errors.append("Указано неизвестное место")

    if mood not in ("any", "calm", "active", "social", "creative"):
        errors.append("Указано неизвестное настроение")

    return errors


def filter_activities(
    activities: Sequence[Candidate],
    filters: dict[str, Any],
) -> list[Candidate]:
    if validate_filters(filters):
        return []

    participants = filters.get("participants")
    available_minutes = filters.get("available_minutes")
    budget_per_person = filters.get("budget_per_person")
    location = filters.get("location", "any")

    return [
        activity
        for activity in activities
        if activity.is_active
        and (
            participants is None
            or activity.min_participants <= participants <= activity.max_participants
        )
        and (
            available_minutes is None
            or activity.duration_minutes is None
            or activity.duration_minutes <= available_minutes
        )
        and (
            budget_per_person is None
            or activity.estimated_cost_per_person <= budget_per_person
        )
        and (location == "any" or location in activity.locations)
    ]


def rank_activities(
    activities: Sequence[Candidate],
    filters: dict[str, Any],
    interests: Sequence[str],
    preferred_tags: Sequence[str] = (),
) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for activity in activities:
        score = 0
        reasons: list[str] = []
        mood = filters.get("mood", "any")
        available_minutes = filters.get("available_minutes")

        if mood != "any" and mood in activity.moods:
            score += SCORING["mood"]
            reasons.append("Подходит по настроению")

        if activity.category in interests:
            score += SCORING["interest"]
            reasons.append("Совпадает с интересами")

        if any(tag in preferred_tags for tag in activity.tags):
            score += SCORING["tag"]
            reasons.append("Есть предпочтительный тег")

        if (
            available_minutes is not None
            and activity.duration_minutes is not None
            and activity.duration_minutes <= available_minutes
            and available_minutes - activity.duration_minutes
            <= SCORING["time_fit_window_minutes"]
        ):
            score += SCORING["time_fit"]
            reasons.append("Укладывается в доступное время с небольшим запасом")

        if not reasons:
            reasons.append("Новая идея для компании")

        ranked.append({"activity": activity, "score": score, "reasons": reasons})

    return sorted(ranked, key=lambda item: (-item["score"], item["activity"].id))


def recommend(
    activities: Sequence[Activity],
    filters: dict[str, Any],
    interests: Sequence[str],
    shown_ids: Sequence[int | str] = (),
    preferred_tags: Sequence[str] = (),
) -> dict[str, Any]:
    errors = validate_filters(filters)
    if errors:
        return {"kind": "invalid", "errors": errors}

    candidates = [adapt_activity(activity) for activity in activities]
    eligible = filter_activities(candidates, filters)
    if not eligible:
        return {"kind": "empty", "eligible_count": 0}

    shown = {str(activity_id) for activity_id in shown_ids}
    remaining = [activity for activity in eligible if activity.id not in shown]
    if not remaining:
        return {"kind": "exhausted", "eligible_count": len(eligible)}

    ranked = rank_activities(remaining, filters, interests, preferred_tags)
    has_no_constraints = (
        filters.get("participants") is None
        and filters.get("available_minutes") is None
        and filters.get("budget_per_person") is None
        and filters.get("location", "any") == "any"
        and filters.get("mood", "any") == "any"
    )
    has_no_preferences = not interests and not preferred_tags
    choices = ranked if has_no_constraints and has_no_preferences else ranked[:SCORING["candidate_limit"]]
    random_value = random.random()
    index = min(len(choices) - 1, max(0, math.floor(random_value * len(choices))))

    return {
        "kind": "success",
        "recommendation": choices[index],
        "eligible_count": len(eligible),
        "remaining_count": len(remaining) - 1,
    }
