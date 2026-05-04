from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.config.db import users_collection
from app.models.user import UserCreate, UserLogin
from app.utils.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])


# 📝 REGISTER
@router.post("/register")
def register(user: UserCreate):

    try:
        existing_user = users_collection.find_one({"email": user.email})
        if existing_user:
            return JSONResponse(
                status_code=400,
                content={"message": "Email already registered"}
            )

        hashed_password = hash_password(user.password)

        user_data = {
            "name": user.name,
            "email": user.email,
            "password": hashed_password
        }

        users_collection.insert_one(user_data)

        return {"message": "User registered successfully"}

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Registration error: {str(e)}"}
        )


# 🔐 LOGIN
@router.post("/login")
def login(user: UserLogin):

    try:
        db_user = users_collection.find_one({"email": user.email})

        if not db_user:
            return JSONResponse(
                status_code=400,
                content={"message": "Invalid email or password"}
            )

        if not verify_password(user.password, db_user["password"]):
            return JSONResponse(
                status_code=400,
                content={"message": "Invalid email or password"}
            )

        # SAFETY CHECK
        user_id = str(db_user.get("_id"))

        token = create_access_token({"sub": user_id})

        return {
            "token": token,
            "token_type": "bearer",
            "user": {
                "id": user_id,
                "name": db_user.get("name", "User"),
                "email": db_user.get("email")
            }
        }

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"message": f"Login error: {str(e)}"}
        )