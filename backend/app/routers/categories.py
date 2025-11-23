from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import User, Category
from pydantic import BaseModel

router = APIRouter(prefix="/categories", tags=["categories"])



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


class CategoryTreeResponse(BaseModel):
    """Category with nested children for hierarchical display"""
    id: UUID
    name: str
    description: str | None
    parent_category_id: UUID | None
    children: List['CategoryTreeResponse'] = []
    product_count: int = 0  # Total products in this category (including subcategories)

    class Config:
        from_attributes = True



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

    Parameters:
    - parent_id: Optional. If provided, returns only direct children of this category.
                 If omitted, returns all categories (flat list).
    """
    query = db.query(Category)

    if parent_id:
        query = query.filter(Category.parent_category_id == parent_id)

    categories = query.all()

    return [CategoryResponse.model_validate(c) for c in categories]


@router.get("/tree", response_model=List[CategoryTreeResponse])
def get_category_tree(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get hierarchical category tree structure.
    Returns root categories with nested children.

    Example response:
    [
      {
        "id": "...",
        "name": "Food Products",
        "description": "All food items",
        "parent_category_id": null,
        "product_count": 450,
        "children": [
          {
            "id": "...",
            "name": "Dairy",
            "parent_category_id": "...",
            "product_count": 120,
            "children": [
              {
                "id": "...",
                "name": "Cheese",
                "product_count": 45,
                "children": []
              }
            ]
          }
        ]
      }
    ]
    """
    from app.models.user import Product

    # Get all categories
    all_categories = db.query(Category).all()

    # Get product counts per category
    product_counts = {}
    for cat in all_categories:
        count = db.query(Product).filter(
            Product.category_id == cat.id,
            Product.is_active == True
        ).count()
        product_counts[cat.id] = count

    # Build category map
    category_map = {}
    for cat in all_categories:
        category_map[cat.id] = CategoryTreeResponse(
            id=cat.id,
            name=cat.name,
            description=cat.description,
            parent_category_id=cat.parent_category_id,
            children=[],
            product_count=product_counts.get(cat.id, 0)
        )

    # Build tree structure
    root_categories = []
    for cat in all_categories:
        cat_node = category_map[cat.id]
        if cat.parent_category_id is None:
            # Root category
            root_categories.append(cat_node)
        else:
            # Child category - add to parent
            if cat.parent_category_id in category_map:
                category_map[cat.parent_category_id].children.append(cat_node)

    return root_categories


@router.get("/roots", response_model=List[CategoryResponse])
def get_root_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get only root (top-level) categories.
    These are categories with no parent.
    """
    categories = db.query(Category).filter(
        Category.parent_category_id.is_(None)
    ).all()

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
