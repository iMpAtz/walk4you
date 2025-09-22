from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import secrets
import base64
import json
from bson import ObjectId


load_dotenv()

app = FastAPI(title="Walk4You API", version="0.1.0")

# ===== MongoDB (Motor) setup =====
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "walk4you")

mongo_client: AsyncIOMotorClient | None = None


async def get_db() -> AsyncIOMotorDatabase:
    if mongo_client is None:
        raise RuntimeError("Mongo client is not initialized")
    return mongo_client[MONGODB_DB]


@app.on_event("startup")
async def startup_event() -> None:
    global mongo_client
    mongo_client = AsyncIOMotorClient(MONGODB_URI)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global mongo_client
    if mongo_client is not None:
        mongo_client.close()

# CORS: ปรับ origins ตามโดเมน Frontend ของคุณ
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"status": "ok", "service": "walk4you-api"}


@app.get("/health")
async def health_check():
    return {"ok": True}


# ===== Sample endpoint using MongoDB =====
class PingDoc(BaseModel):
    message: str


# ===== Auth Models =====
class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr
    fullName: Optional[str] = None
    phone: Optional[str] = None
    gender: Optional[str] = "Male"
    birthDay: Optional[str] = None  # YYYY-MM-DD format


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    registerDate: datetime
    avatar: Optional[dict] = None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


@app.get("/db/ping")
async def db_ping(db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # simple server ping first
        await db.client.admin.command("ping")
        # quick roundtrip: insert + find + delete (collection: _ping)
        coll = db["_ping"]
        result = await coll.insert_one({"message": "pong"})
        found = await coll.find_one({"_id": result.inserted_id})
        await coll.delete_one({"_id": result.inserted_id})
        return {"ok": True, "doc": {"message": (found or {}).get("message")}}
    except Exception as e:
        return {"ok": False, "error": str(e)}


@app.get("/db/status")
async def db_status():
    try:
        if mongo_client is None:
            return {"ok": False, "error": "client not initialized"}
        await mongo_client.admin.command("ping")
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ===== Auth Endpoints =====
def hash_password(password: str) -> str:
    """Hash password using SHA-256 with salt"""
    salt = secrets.token_hex(16)
    return f"{salt}:{hashlib.sha256((salt + password).encode()).hexdigest()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify password against hash"""
    try:
        salt, hash_value = hashed.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == hash_value
    except:
        return False


def create_access_token(data: dict) -> str:
    """Create simple JWT-like token (for demo)"""
    exp_dt = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "sub": data.get("user_id"),
        "username": data.get("username"),
        # use unix timestamp to avoid datetime JSON serialization issue
        "exp": int(exp_dt.timestamp()),
    }
    token = base64.b64encode(json.dumps(payload).encode()).decode()
    return token


@app.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # Check if user already exists
        existing_user = await db.User.find_one({
            "$or": [
                {"username": user_data.username},
                {"email": user_data.email}
            ]
        })
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already exists"
            )
        
        # Create new user
        hashed_password = hash_password(user_data.password)
        user_doc = {
            "username": user_data.username,
            "password": hashed_password,
            "email": user_data.email,
            "phone": user_data.phone,
            "role": "CUSTOMER",
            "registerDate": datetime.utcnow()
        }
        
        result = await db.User.insert_one(user_doc)
        
        # Create access token
        access_token = create_access_token({
            "user_id": str(result.inserted_id),
            "username": user_data.username
        })
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=str(result.inserted_id),
                username=user_data.username,
                email=user_data.email,
                role="CUSTOMER",
                registerDate=user_doc["registerDate"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@app.post("/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # Find user by username
        user = await db.User.find_one({"username": login_data.username})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
        # Create access token
        access_token = create_access_token({
            "user_id": str(user["_id"]),
            "username": user["username"]
        })
        
        return AuthResponse(
            access_token=access_token,
            token_type="bearer",
            user=UserResponse(
                id=str(user["_id"]),
                username=user["username"],
                email=user["email"],
                role=user["role"],
                registerDate=user["registerDate"]
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


# ===== Avatar (User Profile Image) =====
class AvatarUpdate(BaseModel):
    secure_url: str
    public_id: str
    folder: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    bytes: Optional[int] = None
    format: Optional[str] = None


async def get_current_user(request: Request, db: AsyncIOMotorDatabase = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    token = auth_header.split(" ", 1)[1]
    try:
        payload_raw = base64.b64decode(token).decode()
        payload = json.loads(payload_raw)
        exp = int(payload.get("exp", 0))
        if int(datetime.utcnow().timestamp()) >= exp:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user = await db.User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


@app.post("/users/me/avatar")
async def set_my_avatar(data: AvatarUpdate, db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    avatar_doc = {
        "url": data.secure_url,
        "publicId": data.public_id,
        "folder": data.folder,
        "width": data.width,
        "height": data.height,
        "bytes": data.bytes,
        "format": data.format,
        "updatedAt": datetime.utcnow(),
    }
    await db.User.update_one({"_id": user_id}, {"$set": {"avatar": avatar_doc, "updatedAt": datetime.utcnow()}})
    return {"ok": True, "avatar": avatar_doc}


@app.delete("/users/me/avatar")
async def delete_my_avatar(db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    user_id = current_user["_id"]
    await db.User.update_one({"_id": user_id}, {"$unset": {"avatar": ""}, "$set": {"updatedAt": datetime.utcnow()}})
    return {"ok": True}


@app.get("/users/me", response_model=UserResponse)
async def get_my_profile(db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        registerDate=current_user["registerDate"],
        avatar=current_user.get("avatar")
    )


# ===== Store Endpoints =====
class StoreCreate(BaseModel):
    storeName: str
    storeDescription: Optional[str] = None
    phoneNumber: Optional[str] = None
    buMail: Optional[str] = None


class StoreResponse(BaseModel):
    id: str
    ownerId: str
    storeName: str
    storeDescription: Optional[str]
    phoneNumber: Optional[str]
    buMail: Optional[str]
    registerDate: datetime
    status: str


@app.get("/users/me/store")
async def get_my_store(db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    """Get user's store if exists"""
    user_id = current_user["_id"]
    store = await db.Store.find_one({"ownerId": user_id})
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    return StoreResponse(
        id=str(store["_id"]),
        ownerId=str(store["ownerId"]),
        storeName=store["storeName"],
        storeDescription=store.get("storeDescription"),
        phoneNumber=store.get("phoneNumber"),
        buMail=store.get("buMail"),
        registerDate=store["registerDate"],
        status=store["status"]
    )


@app.post("/users/me/store", response_model=StoreResponse)
async def create_my_store(store_data: StoreCreate, db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    """Create a new store for the current user"""
    user_id = current_user["_id"]
    
    # Check if user already has a store
    existing_store = await db.Store.find_one({"ownerId": user_id})
    if existing_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a store"
        )
    
    # Create new store
    store_doc = {
        "ownerId": user_id,
        "storeName": store_data.storeName,
        "storeDescription": store_data.storeDescription,
        "phoneNumber": store_data.phoneNumber,
        "buMail": store_data.buMail,
        "registerDate": datetime.utcnow(),
        "status": "ACTIVE"
    }
    
    result = await db.Store.insert_one(store_doc)
    
    # Update user role to SELLER
    await db.User.update_one(
        {"_id": user_id},
        {"$set": {"role": "SELLER"}}
    )
    
    return StoreResponse(
        id=str(result.inserted_id),
        ownerId=str(store_doc["ownerId"]),
        storeName=store_doc["storeName"],
        storeDescription=store_doc["storeDescription"],
        phoneNumber=store_doc["phoneNumber"],
        buMail=store_doc["buMail"],
        registerDate=store_doc["registerDate"],
        status=store_doc["status"]
    )


@app.get("/users/me/has-store")
async def check_has_store(db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    """Check if user has a store"""
    user_id = current_user["_id"]
    store = await db.Store.find_one({"ownerId": user_id})
    
    return {"hasStore": store is not None}

