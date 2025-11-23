from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.auth.auth import get_current_user
from app.core.db import get_db
from app.models.user import (
    User, Consumer, Supplier, ConsumerStaff, SupplierStaff,
    ConsumerSupplierLink, Product, ProductImage, Category
)
from app.models.enums import LinkStatus, SupplierRole
from pydantic import BaseModel

router = APIRouter(prefix="/products", tags=["products"])



class ProductCreate(BaseModel):
    name: str
    description: str | None = None
    category_id: UUID
    unit: str
    price_per_unit: Decimal
    stock_level: int
    minimum_order_quantity: int = 1
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category_id: UUID | None = None
    unit: str | None = None
    price_per_unit: Decimal | None = None
    stock_level: int | None = None
    minimum_order_quantity: int | None = None
    is_active: bool | None = None


class ProductImageCreate(BaseModel):
    image_url: str
    is_primary: bool = False


class ProductImageResponse(BaseModel):
    id: UUID
    product_id: UUID
    image_url: str
    is_primary: bool

    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    id: UUID
    supplier_id: UUID
    category_id: UUID
    name: str
    description: str | None
    unit: str
    price_per_unit: Decimal
    stock_level: int
    minimum_order_quantity: int
    is_active: bool

    supplier_name: str | None = None
    category_name: str | None = None
    images: List[ProductImageResponse] = []

    class Config:
        from_attributes = True


class CatalogItem(BaseModel):
    """Consumer view of product with supplier info"""
    """Consumer view of product with supplier info"""
    id: UUID
    name: str
    description: str | None
    unit: str
    price_per_unit: Decimal
    stock_level: int
    minimum_order_quantity: int
    is_active: bool
    supplier_id: UUID
    supplier_name: str
    category_name: str | None
    images: List[ProductImageResponse] = []

    class Config:
        from_attributes = True



def get_supplier_for_user(db: Session, user: User) -> Supplier | None:
    """Get supplier entity for current user"""
    """Get supplier entity for current user"""
    supplier_staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id
    ).first()

    if not supplier_staff:
        return None

    return db.query(Supplier).filter(
        Supplier.id == supplier_staff.supplier_id
    ).first()


def get_consumer_for_user(db: Session, user: User) -> Consumer | None:
    """Get consumer entity for current user"""
    """Get consumer entity for current user"""
    consumer_staff = db.query(ConsumerStaff).filter(
        ConsumerStaff.user_id == user.id
    ).first()

    if not consumer_staff:
        return None

    return db.query(Consumer).filter(
        Consumer.id == consumer_staff.consumer_id
    ).first()


def has_supplier_permission(db: Session, user: User, supplier_id: UUID, allowed_roles: List[str]) -> bool:
    """Check if user has permission for supplier actions"""
    """Check if user has permission for supplier actions"""
    staff = db.query(SupplierStaff).filter(
        SupplierStaff.user_id == user.id,
        SupplierStaff.supplier_id == supplier_id
    ).first()

    if not staff:
        return False

    return staff.role in allowed_roles


def is_linked(db: Session, consumer_id: UUID, supplier_id: UUID) -> bool:
    """Check if consumer has accepted link with supplier"""
    """Check if consumer has accepted link with supplier"""
    link = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer_id,
        ConsumerSupplierLink.supplier_id == supplier_id,
        ConsumerSupplierLink.status == LinkStatus.ACCEPTED
    ).first()

    return link is not None


def enrich_product_response(db: Session, product: Product) -> ProductResponse:
    """Add supplier and category info to product"""
    """Add supplier and category info to product"""
    supplier = db.query(Supplier).filter(Supplier.id == product.supplier_id).first()
    category = db.query(Category).filter(Category.id == product.category_id).first()
    images = db.query(ProductImage).filter(ProductImage.product_id == product.id).all()

    return ProductResponse(
        id=product.id,
        supplier_id=product.supplier_id,
        category_id=product.category_id,
        name=product.name,
        description=product.description,
        unit=product.unit,
        price_per_unit=product.price_per_unit,
        stock_level=product.stock_level,
        minimum_order_quantity=product.minimum_order_quantity,
        is_active=product.is_active,
        supplier_name=supplier.business_name if supplier else None,
        category_name=category.name if category else None,
        images=[ProductImageResponse.model_validate(img) for img in images]
    )



@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new product in supplier's catalog.
    Only Owner and Manager can create products.
    """
    supplier = get_supplier_for_user(db, current_user)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can create products"
        )

    if not has_supplier_permission(
        db, current_user, supplier.id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can create products"
        )

    category = db.query(Category).filter(Category.id == data.category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Category not found"
        )

    product = Product(
        supplier_id=supplier.id,
        category_id=data.category_id,
        name=data.name,
        description=data.description,
        unit=data.unit,
        price_per_unit=data.price_per_unit,
        stock_level=data.stock_level,
        minimum_order_quantity=data.minimum_order_quantity,
        is_active=data.is_active
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    return enrich_product_response(db, product)


@router.get("/my-products", response_model=List[ProductResponse])
def get_my_products(
    active_only: bool = False,
    category_id: UUID | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all products for current supplier.
    All supplier roles can view products.
    """
    supplier = get_supplier_for_user(db, current_user)
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only supplier staff can view products"
        )

    query = db.query(Product).filter(Product.supplier_id == supplier.id)

    if active_only:
        query = query.filter(Product.is_active == True)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    products = query.all()

    return [enrich_product_response(db, p) for p in products]


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get product by ID.
    Suppliers can see their own products.
    Consumers can only see products from linked suppliers.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    supplier = get_supplier_for_user(db, current_user)
    consumer = get_consumer_for_user(db, current_user)

    if supplier:
        if product.supplier_id != supplier.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own products"
            )
    elif consumer:
        if not is_linked(db, consumer.id, product.supplier_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view products from linked suppliers"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return enrich_product_response(db, product)


@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: UUID,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update product details.
    Only Owner and Manager can update products.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if not has_supplier_permission(
        db, current_user, product.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can update products"
        )

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)

    return enrich_product_response(db, product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete (deactivate) a product.
    Only Owner and Manager can delete products.
    This actually sets is_active=False rather than deleting.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if not has_supplier_permission(
        db, current_user, product.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can delete products"
        )

    product.is_active = False
    db.commit()

    return None



@router.post("/{product_id}/images", response_model=ProductImageResponse, status_code=status.HTTP_201_CREATED)
def add_product_image(
    product_id: UUID,
    data: ProductImageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Add an image to a product.
    Only Owner and Manager can add images.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if not has_supplier_permission(
        db, current_user, product.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can add product images"
        )

    if data.is_primary:
        db.query(ProductImage).filter(
            ProductImage.product_id == product_id,
            ProductImage.is_primary == True
        ).update({"is_primary": False})

    image = ProductImage(
        product_id=product_id,
        image_url=data.image_url,
        is_primary=data.is_primary
    )
    db.add(image)
    db.commit()
    db.refresh(image)

    return ProductImageResponse.model_validate(image)


@router.delete("/{product_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product_image(
    product_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a product image.
    Only Owner and Manager can delete images.
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if not has_supplier_permission(
        db, current_user, product.supplier_id,
        [SupplierRole.OWNER.value, SupplierRole.MANAGER.value]
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Owner or Manager can delete product images"
        )

    image = db.query(ProductImage).filter(
        ProductImage.id == image_id,
        ProductImage.product_id == product_id
    ).first()

    if not image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    db.delete(image)
    db.commit()

    return None



@router.get("/catalog/browse", response_model=List[CatalogItem])
def browse_catalog(
    supplier_id: UUID | None = None,
    category_id: UUID | None = None,
    search: str | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Browse product catalog from linked suppliers.
    Only consumers can browse.
    Returns products only from suppliers they have accepted links with.
    """
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can browse catalog"
        )

    links = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer.id,
        ConsumerSupplierLink.status == LinkStatus.ACCEPTED
    ).all()

    linked_supplier_ids = [link.supplier_id for link in links]

    if not linked_supplier_ids:
        return []

    query = db.query(Product).filter(Product.supplier_id.in_(linked_supplier_ids))

    if supplier_id:
        if supplier_id not in linked_supplier_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not linked to this supplier"
            )
        query = query.filter(Product.supplier_id == supplier_id)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    if active_only:
        query = query.filter(Product.is_active == True)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_pattern),
                Product.description.ilike(search_pattern)
            )
        )

    if min_price:
        query = query.filter(Product.price_per_unit >= min_price)

    if max_price:
        query = query.filter(Product.price_per_unit <= max_price)

    products = query.all()

    result = []
    for product in products:
        supplier = db.query(Supplier).filter(Supplier.id == product.supplier_id).first()
        category = db.query(Category).filter(Category.id == product.category_id).first()
        images = db.query(ProductImage).filter(ProductImage.product_id == product.id).all()

        result.append(CatalogItem(
            id=product.id,
            name=product.name,
            description=product.description,
            unit=product.unit,
            price_per_unit=product.price_per_unit,
            stock_level=product.stock_level,
            minimum_order_quantity=product.minimum_order_quantity,
            is_active=product.is_active,
            supplier_id=product.supplier_id,
            supplier_name=supplier.business_name if supplier else "Unknown",
            category_name=category.name if category else None,
            images=[ProductImageResponse.model_validate(img) for img in images]
        ))

    return result


@router.get("/catalog/suppliers", response_model=List[dict])
def get_linked_suppliers_with_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get list of linked suppliers with their product counts.
    Only consumers can view this.
    """
    consumer = get_consumer_for_user(db, current_user)
    if not consumer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only consumers can view linked suppliers"
        )

    links = db.query(ConsumerSupplierLink).filter(
        ConsumerSupplierLink.consumer_id == consumer.id,
        ConsumerSupplierLink.status == LinkStatus.ACCEPTED
    ).all()

    result = []
    for link in links:
        supplier = db.query(Supplier).filter(Supplier.id == link.supplier_id).first()
        if not supplier:
            continue

        product_count = db.query(Product).filter(
            Product.supplier_id == supplier.id,
            Product.is_active == True
        ).count()

        result.append({
            "supplier_id": supplier.id,
            "supplier_name": supplier.business_name,
            "business_type": supplier.business_type,
            "city": supplier.city,
            "country": supplier.country,
            "product_count": product_count,
            "linked_at": link.responded_at
        })

    return result
