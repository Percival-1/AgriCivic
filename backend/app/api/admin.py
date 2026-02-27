"""
Admin API endpoints for user management and system administration.
"""

from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.auth import get_current_admin_user
from app.database import get_db
from app.models.user import User
from app.models.session import Session

settings = get_settings()
router = APIRouter()


# Response Models
class UserListItem(BaseModel):
    """User list item for admin user management."""

    id: str
    phone_number: str
    name: Optional[str]
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str]
    location_address: Optional[str]
    crops: Optional[List[str]]
    land_size: Optional[float]

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM object to response model."""
        # Get last login from sessions
        last_login = None
        if hasattr(obj, "last_login_time"):
            last_login = obj.last_login_time

        return cls(
            id=str(obj.id),
            phone_number=obj.phone_number,
            name=obj.name,
            role=obj.role,
            is_active=obj.is_active,
            created_at=obj.created_at.isoformat() if obj.created_at else None,
            last_login=last_login.isoformat() if last_login else None,
            location_address=obj.location_address,
            crops=obj.crops if obj.crops else [],
            land_size=float(obj.land_size) if obj.land_size else None,
        )


class UserListResponse(BaseModel):
    """Response for user list endpoint."""

    users: List[UserListItem]
    total: int
    page: int
    limit: int
    total_pages: int


class UserStatsResponse(BaseModel):
    """Response for user statistics endpoint."""

    total_users: int
    active_users: int
    inactive_users: int
    admin_users: int
    new_users_today: int
    new_users_week: int
    new_users_month: int


class UserDetailResponse(BaseModel):
    """Detailed user information for admin."""

    id: str
    phone_number: str
    name: Optional[str]
    role: str
    is_active: bool
    preferred_language: str
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_address: Optional[str]
    district: Optional[str]
    state: Optional[str]
    crops: Optional[List[str]]
    land_size: Optional[float]
    created_at: str
    updated_at: Optional[str]
    last_login: Optional[str]
    total_sessions: int
    active_sessions: int

    class Config:
        from_attributes = True


class SystemStatsResponse(BaseModel):
    """System statistics for admin dashboard."""

    totalUsers: int
    activeUsers: int
    activeSessions: int
    newUsersToday: int
    systemHealth: str
    uptime: str
    activeAlerts: int
    criticalAlerts: int


class ActivityLogItem(BaseModel):
    """Activity log item."""

    action: str
    description: str
    user: str
    timestamp: str


@router.get("/stats", response_model=SystemStatsResponse)
async def get_system_stats(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get system statistics for admin dashboard."""
    # Get total users
    total_users_result = await db.execute(select(func.count(User.id)))
    total_users = total_users_result.scalar() or 0

    # Get active users
    active_users_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_users_result.scalar() or 0

    # Get active sessions
    active_sessions_result = await db.execute(
        select(func.count(Session.id)).where(Session.is_active == True)
    )
    active_sessions = active_sessions_result.scalar() or 0

    # Get new users today
    today = datetime.utcnow().date()
    new_users_today_result = await db.execute(
        select(func.count(User.id)).where(func.date(User.created_at) == today)
    )
    new_users_today = new_users_today_result.scalar() or 0

    return SystemStatsResponse(
        totalUsers=total_users,
        activeUsers=active_users,
        activeSessions=active_sessions,
        newUsersToday=new_users_today,
        systemHealth="Good",
        uptime="99.9%",
        activeAlerts=0,
        criticalAlerts=0,
    )


@router.get("/activity")
async def get_recent_activity(
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get recent activity logs."""
    # For now, return empty list
    # TODO: Implement activity logging
    return []


@router.get("/users/stats", response_model=UserStatsResponse)
async def get_user_stats(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get user statistics."""
    from datetime import timedelta

    # Total users
    total_result = await db.execute(select(func.count(User.id)))
    total_users = total_result.scalar() or 0

    # Active users
    active_result = await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )
    active_users = active_result.scalar() or 0

    # Inactive users
    inactive_users = total_users - active_users

    # Admin users
    admin_result = await db.execute(
        select(func.count(User.id)).where(User.role == "admin")
    )
    admin_users = admin_result.scalar() or 0

    # New users today
    today = datetime.utcnow().date()
    today_result = await db.execute(
        select(func.count(User.id)).where(func.date(User.created_at) == today)
    )
    new_users_today = today_result.scalar() or 0

    # New users this week
    week_ago = datetime.utcnow() - timedelta(days=7)
    week_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= week_ago)
    )
    new_users_week = week_result.scalar() or 0

    # New users this month
    month_ago = datetime.utcnow() - timedelta(days=30)
    month_result = await db.execute(
        select(func.count(User.id)).where(User.created_at >= month_ago)
    )
    new_users_month = month_result.scalar() or 0

    return UserStatsResponse(
        total_users=total_users,
        active_users=active_users,
        inactive_users=inactive_users,
        admin_users=admin_users,
        new_users_today=new_users_today,
        new_users_week=new_users_week,
        new_users_month=new_users_month,
    )


@router.get("/users", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    role: str = Query("", max_length=50),
    status: str = Query("", max_length=20),
    profileComplete: str = Query("", alias="profileComplete"),
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get paginated list of users with filters."""
    # Build query
    query = select(User)
    conditions = []

    # Search filter
    if search:
        search_pattern = f"%{search}%"
        conditions.append(
            or_(
                User.name.ilike(search_pattern),
                User.phone_number.ilike(search_pattern),
            )
        )

    # Role filter
    if role:
        conditions.append(User.role == role)

    # Status filter
    if status:
        is_active = status.lower() == "active"
        conditions.append(User.is_active == is_active)

    # Profile complete filter
    if profileComplete:
        if profileComplete.lower() == "complete":
            conditions.append(
                and_(
                    User.name.isnot(None),
                    User.location_address.isnot(None),
                    User.crops.isnot(None),
                )
            )
        elif profileComplete.lower() == "incomplete":
            conditions.append(
                or_(
                    User.name.is_(None),
                    User.location_address.is_(None),
                    User.crops.is_(None),
                )
            )

    # Apply conditions
    if conditions:
        query = query.where(and_(*conditions))

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Calculate pagination
    total_pages = (total + limit - 1) // limit if total > 0 else 1
    offset = (page - 1) * limit

    # Get paginated results
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    # Convert to response models
    user_items = [UserListItem.from_orm(user) for user in users]

    return UserListResponse(
        users=user_items,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_details(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get detailed information about a specific user."""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Get session statistics
    total_sessions_result = await db.execute(
        select(func.count(Session.id)).where(Session.user_id == user_id)
    )
    total_sessions = total_sessions_result.scalar() or 0

    active_sessions_result = await db.execute(
        select(func.count(Session.id)).where(
            and_(Session.user_id == user_id, Session.is_active == True)
        )
    )
    active_sessions = active_sessions_result.scalar() or 0

    # Get last login (most recent session)
    last_session_result = await db.execute(
        select(Session.created_at)
        .where(Session.user_id == user_id)
        .order_by(Session.created_at.desc())
        .limit(1)
    )
    last_session = last_session_result.scalar_one_or_none()

    return UserDetailResponse(
        id=str(user.id),
        phone_number=user.phone_number,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        preferred_language=user.preferred_language,
        location_lat=float(user.location_lat) if user.location_lat else None,
        location_lng=float(user.location_lng) if user.location_lng else None,
        location_address=user.location_address,
        district=user.district,
        state=user.state,
        crops=user.crops if user.crops else [],
        land_size=float(user.land_size) if user.land_size else None,
        created_at=user.created_at.isoformat() if user.created_at else None,
        updated_at=user.updated_at.isoformat() if user.updated_at else None,
        last_login=last_session.isoformat() if last_session else None,
        total_sessions=total_sessions,
        active_sessions=active_sessions,
    )


@router.get("/users/{user_id}/activity")
async def get_user_activity_logs(
    user_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Get activity logs for a specific user."""
    # Verify user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # For now, return empty list
    # TODO: Implement activity logging
    return {
        "activities": [],
        "total": 0,
        "page": page,
        "limit": limit,
        "total_pages": 0,
    }


@router.post("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Activate a user account."""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Activate user
    user.is_active = True
    await db.commit()

    return {"message": "User activated successfully", "user_id": user_id}


@router.post("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Deactivate a user account."""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prevent deactivating yourself
    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account",
        )

    # Deactivate user
    user.is_active = False
    await db.commit()

    return {"message": "User deactivated successfully", "user_id": user_id}


@router.get("/users/{user_id}/export")
async def export_user_data(
    user_id: str,
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Export user data in JSON or CSV format."""
    from fastapi.responses import JSONResponse
    import json

    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Prepare user data
    user_data = {
        "id": str(user.id),
        "phone_number": user.phone_number,
        "name": user.name,
        "role": user.role,
        "is_active": user.is_active,
        "preferred_language": user.preferred_language,
        "location_lat": float(user.location_lat) if user.location_lat else None,
        "location_lng": float(user.location_lng) if user.location_lng else None,
        "location_address": user.location_address,
        "district": user.district,
        "state": user.state,
        "crops": user.crops if user.crops else [],
        "land_size": float(user.land_size) if user.land_size else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "updated_at": user.updated_at.isoformat() if user.updated_at else None,
    }

    if format == "json":
        return JSONResponse(
            content=user_data,
            headers={
                "Content-Disposition": f"attachment; filename=user-{user_id}-data.json"
            },
        )
    else:
        # CSV format
        import csv
        from io import StringIO
        from fastapi.responses import StreamingResponse

        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=user_data.keys())
        writer.writeheader()
        writer.writerow(user_data)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=user-{user_id}-data.csv"
            },
        )
