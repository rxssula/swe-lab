from pydantic import BaseModel


class UserBase(BaseModel):
    name: str
    email: str
    class Config:
        from_attributes = True


class UserCreate(UserBase):
    password: str
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str
    class Config:
        from_attributes = True

