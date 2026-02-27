"""
Authentication API endpoints.
"""

from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.auth import get_current_user, get_current_admin_user
from app.core.security import input_validator, data_encryption
from app.database import get_db
from app.models.user import User
from app.models.api_key import APIKey
from app.services.auth_service import auth_service

settings = get_settings()
router = APIRouter()


# Request/Response models
class UserRegister(BaseModel):
    """User registration request."""

    phone_number: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)
    preferred_language: str = Field(default="en", max_length=10)
    name: Optional[str] = Field(None, max_length=100)
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    location_address: Optional[str] = Field(None, max_length=500)
    district: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)

    @validator("phone_number")
    def validate_phone(cls, v):
        """Validate phone number format."""
        try:
            return input_validator.validate_phone_number(v)
        except ValueError as e:
            raise ValueError(str(e))

    @validator("preferred_language")
    def validate_language(cls, v):
        """Validate language code."""
        try:
            return input_validator.validate_language_code(v)
        except ValueError as e:
            raise ValueError(str(e))

    @validator("name")
    def validate_name(cls, v):
        """Validate and sanitize name."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v

    @validator("location_address")
    def validate_location_address(cls, v):
        """Validate and sanitize location address."""
        if v:
            return input_validator.sanitize_string(v, max_length=500)
        return v

    @validator("district")
    def validate_district(cls, v):
        """Validate and sanitize district."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v

    @validator("state")
    def validate_state(cls, v):
        """Validate and sanitize state."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v


class UserLogin(BaseModel):
    """User login request."""

    phone_number: str = Field(..., min_length=10, max_length=15)
    password: str = Field(..., min_length=8)

    @validator("phone_number")
    def validate_phone(cls, v):
        """Validate phone number format."""
        try:
            return input_validator.validate_phone_number(v)
        except ValueError as e:
            raise ValueError(str(e))


class Token(BaseModel):
    """Token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """User response."""

    id: str
    phone_number: str
    preferred_language: str
    name: Optional[str]
    role: str
    is_active: bool
    location_lat: Optional[float]
    location_lng: Optional[float]
    location_address: Optional[str]
    district: Optional[str]
    state: Optional[str]
    crops: Optional[list[str]]
    land_size: Optional[float]
    language: Optional[str]  # Alias for preferred_language
    location: Optional[str]  # Alias for location_address

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM object to response model."""
        return cls(
            id=str(obj.id),
            phone_number=obj.phone_number,
            preferred_language=obj.preferred_language,
            name=obj.name,
            role=obj.role,
            is_active=obj.is_active,
            location_lat=float(obj.location_lat) if obj.location_lat else None,
            location_lng=float(obj.location_lng) if obj.location_lng else None,
            location_address=obj.location_address,
            district=obj.district,
            state=obj.state,
            crops=obj.crops if obj.crops else [],
            land_size=float(obj.land_size) if obj.land_size else None,
            language=obj.preferred_language,  # Alias
            location=obj.location_address,  # Alias
        )


class APIKeyCreate(BaseModel):
    """API key creation request."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    expires_in_days: Optional[int] = Field(None, gt=0)

    @validator("name")
    def validate_name(cls, v):
        """Validate and sanitize name."""
        return input_validator.sanitize_string(v, max_length=100)

    @validator("description")
    def validate_description(cls, v):
        """Validate and sanitize description."""
        if v:
            return input_validator.sanitize_string(v, max_length=500)
        return v


class APIKeyResponse(BaseModel):
    """API key response."""

    id: str
    key: str
    name: str
    description: Optional[str]
    is_active: bool
    expires_at: Optional[str]
    created_at: str

    class Config:
        from_attributes = True

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM object to response model."""
        return cls(
            id=str(obj.id),
            key=obj.key,
            name=obj.name,
            description=obj.description,
            is_active=obj.is_active,
            expires_at=obj.expires_at.isoformat() if obj.expires_at else None,
            created_at=obj.created_at.isoformat(),
        )


@router.post(
    "/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED
)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user."""
    # Check if user already exists
    result = await db.execute(
        select(User).where(User.phone_number == user_data.phone_number)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered",
        )

    # Create new user
    hashed_password = auth_service.get_password_hash(user_data.password)
    new_user = User(
        phone_number=user_data.phone_number,
        hashed_password=hashed_password,
        preferred_language=user_data.preferred_language,
        name=user_data.name,
        location_lat=user_data.location_lat,
        location_lng=user_data.location_lng,
        location_address=user_data.location_address,
        district=user_data.district,
        state=user_data.state,
        role="user",
        is_active=True,
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserResponse.from_orm(new_user)


@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Login and get access token."""
    # Find user
    result = await db.execute(
        select(User).where(User.phone_number == credentials.phone_number)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
        )

    # Verify password
    if not user.hashed_password or not auth_service.verify_password(
        credentials.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect phone number or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    # Create access token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth_service.create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=access_token_expires,
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return UserResponse.from_orm(current_user)


class UserUpdate(BaseModel):
    """User profile update request."""

    name: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    crops: Optional[list[str]] = Field(None)
    land_size: Optional[float] = Field(None, gt=0, le=10000)
    language: Optional[str] = Field(None, max_length=10)
    phone_number: Optional[str] = Field(None, min_length=10, max_length=15)
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    location_address: Optional[str] = Field(None, max_length=500)
    district: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)

    @validator("name")
    def validate_name(cls, v):
        """Validate and sanitize name."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v

    @validator("location")
    def validate_location(cls, v):
        """Validate and sanitize location."""
        if v:
            return input_validator.sanitize_string(v, max_length=200)
        return v

    @validator("language")
    def validate_language(cls, v):
        """Validate language code."""
        if v:
            try:
                return input_validator.validate_language_code(v)
            except ValueError as e:
                raise ValueError(str(e))
        return v

    @validator("phone_number")
    def validate_phone(cls, v):
        """Validate phone number format."""
        if v:
            try:
                return input_validator.validate_phone_number(v)
            except ValueError as e:
                raise ValueError(str(e))
        return v

    @validator("location_address")
    def validate_location_address(cls, v):
        """Validate and sanitize location address."""
        if v:
            return input_validator.sanitize_string(v, max_length=500)
        return v

    @validator("district")
    def validate_district(cls, v):
        """Validate and sanitize district."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v

    @validator("state")
    def validate_state(cls, v):
        """Validate and sanitize state."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    # Update only provided fields
    update_data = user_update.dict(exclude_unset=True)

    for field, value in update_data.items():
        # Map frontend field names to backend field names
        if field == "language":
            setattr(current_user, "preferred_language", value)
        elif field == "location":
            setattr(current_user, "location_address", value)
        else:
            setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return UserResponse.from_orm(current_user)


class UserUpdate(BaseModel):
    """User profile update request."""

    name: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    crops: Optional[list[str]] = Field(None)
    land_size: Optional[float] = Field(None, gt=0, le=10000)
    language: Optional[str] = Field(None, max_length=10)
    phone_number: Optional[str] = Field(None, min_length=10, max_length=15)
    location_lat: Optional[float] = Field(None, ge=-90, le=90)
    location_lng: Optional[float] = Field(None, ge=-180, le=180)
    location_address: Optional[str] = Field(None, max_length=500)
    district: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)

    @validator("name")
    def validate_name(cls, v):
        """Validate and sanitize name."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v

    @validator("location")
    def validate_location(cls, v):
        """Validate and sanitize location."""
        if v:
            return input_validator.sanitize_string(v, max_length=200)
        return v

    @validator("language")
    def validate_language(cls, v):
        """Validate language code."""
        if v:
            try:
                return input_validator.validate_language_code(v)
            except ValueError as e:
                raise ValueError(str(e))
        return v

    @validator("phone_number")
    def validate_phone(cls, v):
        """Validate phone number format."""
        if v:
            try:
                return input_validator.validate_phone_number(v)
            except ValueError as e:
                raise ValueError(str(e))
        return v

    @validator("location_address")
    def validate_location_address(cls, v):
        """Validate and sanitize location address."""
        if v:
            return input_validator.sanitize_string(v, max_length=500)
        return v

    @validator("district")
    def validate_district(cls, v):
        """Validate and sanitize district."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v

    @validator("state")
    def validate_state(cls, v):
        """Validate and sanitize state."""
        if v:
            return input_validator.sanitize_string(v, max_length=100)
        return v


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return UserResponse.from_orm(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile."""
    # Update only provided fields
    update_data = user_update.dict(exclude_unset=True)

    for field, value in update_data.items():
        # Map frontend field names to backend field names
        if field == "language":
            setattr(current_user, "preferred_language", value)
        elif field == "location":
            setattr(current_user, "location_address", value)
        else:
            setattr(current_user, field, value)

    await db.commit()
    await db.refresh(current_user)

    return UserResponse.from_orm(current_user)


@router.post(
    "/api-keys", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED
)
async def create_api_key(
    api_key_data: APIKeyCreate,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new API key (admin only)."""
    from datetime import datetime

    # Generate API key
    key = auth_service.generate_api_key()

    # Calculate expiration
    expires_at = None
    if api_key_data.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=api_key_data.expires_in_days)

    # Create API key
    new_api_key = APIKey(
        key=key,
        name=api_key_data.name,
        description=api_key_data.description,
        is_active=True,
        expires_at=expires_at,
    )

    db.add(new_api_key)
    await db.commit()
    await db.refresh(new_api_key)

    return APIKeyResponse.from_orm(new_api_key)


@router.get("/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """List all API keys (admin only)."""
    result = await db.execute(select(APIKey))
    api_keys = result.scalars().all()
    return [APIKeyResponse.from_orm(key) for key in api_keys]


@router.delete("/api-keys/{api_key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    api_key_id: str,
    current_user: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete an API key (admin only)."""
    result = await db.execute(select(APIKey).where(APIKey.id == api_key_id))
    api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    await db.delete(api_key)
    await db.commit()

    return None
