from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import User, Category
from pydantic import BaseModel

router = APIRouter(prefix="/categories", tags=["categories"])


# ==================== Request/Response Schemas ====================

class CategoryCreate(BaseModel):
    name: str
    description: str | None = None
    parent_category_id: UUID | None = None


class CategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    parent_category_id: UUID | None = None


class CategoryResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    parent_category_id: UUID | None

    class Config:
        from_attributes = True


# ==================== Endpoints ====================

@router.post("/", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new product category.
    For MVP, any authenticated user can create categories.
    In production, this should be restricted to Platform Admins.
    """
    # If parent category specified, verify it exists
    if data.parent_category_id:
        parent = db.query(Category).filter(
            Category.id == data.parent_category_id
        ).first()
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent category not found"
            )

    category = Category(
        name=data.name,
        description=data.description,
        parent_category_id=data.parent_category_id
    )
    db.add(category)
    db.commit()
    db.refresh(category)

    return CategoryResponse.model_validate(category)


@router.get("/", response_model=List[CategoryResponse])
def list_categories(
    parent_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all categories or subcategories of a parent.
    All authenticated users can view categories.
    """
    query = db.query(Category)

    if parent_id:
        query = query.filter(Category.parent_category_id == parent_id)

    categories = query.all()

    return [CategoryResponse.model_validate(c) for c in categories]


@router.get("/{category_id}", response_model=CategoryResponse)
def get_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific category by ID.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    return CategoryResponse.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: UUID,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a category.
    For MVP, any authenticated user can update.
    In production, restrict to Platform Admins.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)

    db.commit()
    db.refresh(category)

    return CategoryResponse.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a category.
    For MVP, any authenticated user can delete.
    In production, restrict to Platform Admins.
    Cannot delete if products are assigned to it.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    # Check if any products use this category
    from app.models.user import Product
    products_count = db.query(Product).filter(
        Product.category_id == category_id
    ).count()

    if products_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete category with {products_count} products assigned. Reassign products first."
        )

    db.delete(category)
    db.commit()

    return None
