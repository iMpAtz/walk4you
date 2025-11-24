from fastapi import FastAPI, Depends, HTTPException, status, Request, Header, UploadFile, File
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
import logging
import httpx
from ultralytics import YOLO
from PIL import Image
import io
import cloudinary
import cloudinary.uploader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Walk4You API", version="0.1.0")

# ===== YOLOv8 Configuration =====
YOLO_MODEL_PATH = os.getenv("YOLO_MODEL_PATH", "models/best.pt")
YOLO_CONFIDENCE_THRESHOLD = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.6"))
YOLO_ENABLED = os.getenv("YOLO_ENABLED", "true").lower() == "true"

# ===== CORS Configuration =====
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Load YOLOv8 model
yolo_model = None
if YOLO_ENABLED and os.path.exists(YOLO_MODEL_PATH):
    try:
        yolo_model = YOLO(YOLO_MODEL_PATH)
        logger.info(f"YOLOv8 model loaded successfully from {YOLO_MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load YOLOv8 model: {e}")
        yolo_model = None
else:
    logger.warning(f"YOLOv8 model not found at {YOLO_MODEL_PATH} or YOLO detection is disabled")

load_dotenv()

app = FastAPI(title="Walk4You API", version="0.1.0")

# ===== MongoDB (Motor) setup with connection pooling =====
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
    # Initialize with connection pooling
    mongo_client = AsyncIOMotorClient(
        MONGODB_URI,
        maxPoolSize=50,
        minPoolSize=10,
        maxIdleTimeMS=30000,
        connectTimeoutMS=5000,
        serverSelectionTimeoutMS=5000
    )
    
    db = mongo_client[MONGODB_DB]
    
    # Create indexes for better performance
    try:
        # Product indexes
        await db.Product.create_index([("status", 1)])
        await db.Product.create_index([("storeId", 1), ("status", 1)])
        await db.Product.create_index([("name", "text"), ("description", "text"), ("category", "text")])
        await db.Product.create_index([("category", 1), ("status", 1)])
        await db.Product.create_index([("createdAt", -1)])
        
        # Store indexes
        await db.Store.create_index([("ownerId", 1)])
        await db.Store.create_index([("status", 1)])
        
        # User indexes
        await db.User.create_index([("username", 1)], unique=True)
        await db.User.create_index([("email", 1)], unique=True)
        
        logger.info("Database indexes created successfully")
    except Exception as e:
        logger.error(f"Error creating indexes: {e}")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    global mongo_client
    if mongo_client is not None:
        mongo_client.close()

# CORS - Allow LAN access
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
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


# ===== Models =====
class ProductResponse(BaseModel):
    id: str
    storeId: str
    name: str
    description: str
    price: float
    quantity: int
    image_url: Optional[str] = None
    category: Optional[str] = None
    shippingCost: Optional[float] = None
    createdAt: datetime
    updatedAt: datetime
    status: str


@app.get("/products/featured", response_model=list[ProductResponse])
async def get_featured_products(
    limit: int = 8,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get featured products - OPTIMIZED"""
    try:
        # Simplified pipeline with limit
        pipeline = [
            {"$match": {"status": "ACTIVE"}},
            {"$sample": {"size": limit}},
            {"$lookup": {
                "from": "Store",
                "localField": "storeId",
                "foreignField": "_id",
                "as": "store"
            }},
            {"$unwind": "$store"},
            {"$match": {"store.status": "ACTIVE"}},
            {"$project": {
                "_id": 1,
                "storeId": 1,
                "name": 1,
                "description": 1,
                "price": 1,
                "quantity": 1,
                "image_url": 1,
                "category": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "status": 1
            }}
        ]

        

        products = await db.Product.aggregate(pipeline).to_list(limit)

        

        return [
            ProductResponse(
                id=str(product["_id"]),
                storeId=str(product["storeId"]),
                name=product["name"],
                description=product["description"],
                price=product["price"],
                quantity=product["quantity"],
                image_url=product.get("image_url"),
                category=product.get("category"),
                createdAt=product["createdAt"],
                updatedAt=product["updatedAt"],
                status=product["status"]
            )
            for product in products
        ]
    except Exception as e:
        logger.error(f"Error getting featured products: {e}")
        return []


@app.get("/public/products/{product_id}", response_model=ProductResponse)
async def get_public_product(product_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get product by ID - OPTIMIZED"""
    try:
        product = await db.Product.find_one(
            {"_id": ObjectId(product_id), "status": "ACTIVE"},
            projection={
                "_id": 1, "storeId": 1, "name": 1, "description": 1,
                "price": 1, "quantity": 1, "image_url": 1, "category": 1, "shippingCost": 1,
                "createdAt": 1, "updatedAt": 1, "status": 1
            }
        )
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        return ProductResponse(
            id=str(product["_id"]),
            storeId=str(product["storeId"]),
            name=product["name"],
            description=product["description"],
            price=product["price"],
            quantity=product["quantity"],
            image_url=product.get("image_url"),
            category=product.get("category"),
            shippingCost=product.get("shippingCost"),
            createdAt=product["createdAt"],
            updatedAt=product["updatedAt"],
            status=product["status"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/products/search", response_model=list[ProductResponse])
async def search_products(
    q: str,
    limit: int = 20,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Search products - HEAVILY OPTIMIZED using text index"""
    try:
        if len(q.strip()) < 2:
            return []
        
        # Use MongoDB text search (requires text index)
        pipeline = [
            {
                "$match": {
                    "$text": {"$search": q},
                    "status": "ACTIVE"
                }
            },
            {
                "$addFields": {
                    "score": {"$meta": "textScore"}
                }
            },
            {
                "$lookup": {
                    "from": "Store",
                    "localField": "storeId",
                    "foreignField": "_id",
                    "as": "store"
                }
            },
            {"$unwind": "$store"},
            {"$match": {"store.status": "ACTIVE"}},
            {"$sort": {"score": -1}},
            {"$limit": limit},
            {
                "$project": {
                    "_id": 1, "storeId": 1, "name": 1, "description": 1,
                    "price": 1, "quantity": 1, "image_url": 1, "category": 1,
                    "createdAt": 1, "updatedAt": 1, "status": 1
                }
            }
        ]

        

        products = await db.Product.aggregate(pipeline).to_list(limit)

        

        return [
            ProductResponse(
                id=str(p["_id"]),
                storeId=str(p["storeId"]),
                name=p["name"],
                description=p["description"],
                price=p["price"],
                quantity=p["quantity"],
                image_url=p.get("image_url"),
                category=p.get("category"),
                createdAt=p["createdAt"],
                updatedAt=p["updatedAt"],
                status=p["status"]
            )
            for p in products
        ]
    except Exception as e:
        logger.error(f"Error searching products: {e}")
        # Fallback to regex search if text index fails
        try:
            pipeline = [
                {
                    "$match": {
                        "status": "ACTIVE",
                        "$or": [
                            {"name": {"$regex": q, "$options": "i"}},
                            {"description": {"$regex": q, "$options": "i"}},
                            {"category": {"$regex": q, "$options": "i"}}
                        ]
                    }
                },
                {
                    "$lookup": {
                        "from": "Store",
                        "localField": "storeId",
                        "foreignField": "_id",
                        "as": "store"
                    }
                },
                {"$unwind": "$store"},
                {"$match": {"store.status": "ACTIVE"}},
                {"$limit": limit}
            ]

            

            products = await db.Product.aggregate(pipeline).to_list(limit)

            

            return [
                ProductResponse(
                    id=str(p["_id"]),
                    storeId=str(p["storeId"]),
                    name=p["name"],
                    description=p["description"],
                    price=p["price"],
                    quantity=p["quantity"],
                    image_url=p.get("image_url"),
                    category=p.get("category"),
                    createdAt=p["createdAt"],
                    updatedAt=p["updatedAt"],
                    status=p["status"]
                )
                for p in products
            ]
        except Exception as fallback_error:
            logger.error(f"Fallback search also failed: {fallback_error}")
            return []


@app.get("/products/search/suggestions")
async def get_search_suggestions(
    q: str,
    limit: int = 5,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get search suggestions - OPTIMIZED"""
    try:
        if len(q.strip()) < 2:
            return []
        
        # Simplified query with limit
        pipeline = [
            {
                "$match": {
                "status": "ACTIVE",
                "$or": [
                        {"name": {"$regex": f"^{q}", "$options": "i"}},
                        {"category": {"$regex": f"^{q}", "$options": "i"}}
                    ]
                }
            },
            {
                "$group": {
                "_id": "$name",
                "category": {"$first": "$category"}
                }
            },
            {"$limit": limit}
        ]
        
        suggestions = await db.Product.aggregate(pipeline).to_list(limit)
        
        return [
            {
                "text": s["_id"],
                "type": "product",
                "category": s.get("category")
            }
            for s in suggestions
        ]
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {e}")
        return []


@app.get("/products/category-counts")
async def get_category_counts(db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get product counts by category - OPTIMIZED"""
    try:
        # Aggregate pipeline to count products by category
        pipeline = [
            {"$match": {"status": "ACTIVE"}},
            {
                "$group": {
                    "_id": "$category",
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"count": -1}}
        ]
        
        results = await db.Product.aggregate(pipeline).to_list(None)
        
        return [
            {
                "category": result["_id"] or "uncategorized",
                "count": result["count"]
            }
            for result in results
        ]
        
    except Exception as e:
        logger.error(f"Error getting category counts: {e}")
        return []


# ===== Auth helpers =====
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    return f"{salt}:{hashlib.sha256((salt + password).encode()).hexdigest()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        salt, hash_value = hashed.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == hash_value
    except:
        return False


def create_access_token(data: dict) -> str:
    exp_dt = datetime.utcnow() + timedelta(hours=24)
    payload = {
        "sub": data.get("user_id"),
        "username": data.get("username"),
        "exp": int(exp_dt.timestamp()),
    }
    token = base64.b64encode(json.dumps(payload).encode()).decode()
    return token


def create_refresh_token(data: dict) -> str:
    """Create refresh token with 7 days expiration"""
    exp_dt = datetime.utcnow() + timedelta(days=7)
    payload = {
        "sub": data.get("user_id"),
        "username": data.get("username"),
        "exp": int(exp_dt.timestamp()),
        "type": "refresh"
    }
    token = base64.b64encode(json.dumps(payload).encode()).decode()
    return token


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


# ===== Auth Models =====
class UserRegister(BaseModel):
    username: str
    password: str
    email: EmailStr
    phone: Optional[str] = None
    fullName: Optional[str] = None
    gender: Optional[str] = None
    birthDay: Optional[str] = None


class UserLogin(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    registerDate: datetime
    status: Optional[str] = "ACTIVE"
    statusReason: Optional[str] = None
    avatar: Optional[dict] = None
    address: Optional[str] = None


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str
    expires_in: Optional[int] = None
    user: UserResponse


@app.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserRegister, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # Check if user exists (using indexed fields)
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
        
        hashed_password = hash_password(user_data.password)
        user_doc = {
            "username": user_data.username,
            "password": hashed_password,
            "email": user_data.email,
            "phone": user_data.phone,
            "fullName": user_data.fullName,
            "gender": user_data.gender,
            "birthDay": user_data.birthDay,
            "role": "CUSTOMER",
            "registerDate": datetime.utcnow()
        }
        
        result = await db.User.insert_one(user_doc)
        
        token_data = {
            "user_id": str(result.inserted_id),
            "username": user_data.username
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=86400,  # 24 hours
            user=UserResponse(
                id=str(result.inserted_id),
                username=user_data.username,
                email=user_data.email,
                role="CUSTOMER",
                registerDate=user_doc["registerDate"],
                status="ACTIVE",
                statusReason=None
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@app.post("/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # Query using email or username
        query = {}
        if login_data.email:
            query = {"email": login_data.email}
        elif login_data.username:
            query = {"username": login_data.username}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username is required"
            )
        
        user = await db.User.find_one(query)
        
        if not user or not verify_password(login_data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        token_data = {
            "user_id": str(user["_id"]),
            "username": user["username"]
        }
        access_token = create_access_token(token_data)
        refresh_token = create_refresh_token(token_data)
        
        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=86400,  # 24 hours
            user=UserResponse(
                id=str(user["_id"]),
                username=user["username"],
                email=user["email"],
                role=user["role"],
                registerDate=user["registerDate"],
                avatar=user.get("avatar"),
                status=user.get("status", "ACTIVE"),
                statusReason=user.get("statusReason")
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )


@app.post("/auth/refresh")
async def refresh_token(request: Request, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Refresh access token using refresh token"""
    try:
        # Get refresh token from request body
        body = await request.json()
        refresh_token = body.get("refresh_token")
        
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token required"
            )
        
        # Decode and verify refresh token
        try:
            payload_raw = base64.b64decode(refresh_token).decode()
            payload = json.loads(payload_raw)
            exp = int(payload.get("exp", 0))
            
            # Check if refresh token is expired
            if int(datetime.utcnow().timestamp()) >= exp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token expired"
                )
            
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )
            
            # Verify user still exists
            user = await db.User.find_one({"_id": ObjectId(user_id)})
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            
            # Create new access token
            new_access_token = create_access_token({
                "user_id": str(user["_id"]),
                "username": user["username"]
            })
            
            # Return new access token (and optionally new refresh token)
            return {
                "access_token": new_access_token,
                "token_type": "bearer",
                "expires_in": 86400  # 24 hours in seconds
            }
            
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token format"
            )
        except Exception as decode_error:
            logger.error(f"Token decode error: {decode_error}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Refresh token error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )


@app.get("/users/me", response_model=UserResponse)
async def get_my_profile(current_user=Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        registerDate=current_user["registerDate"],
        status=current_user.get("status", "ACTIVE"),
        statusReason=current_user.get("statusReason"),
        avatar=current_user.get("avatar"),
        address=current_user.get("address")
    )


# ===== Change Password Endpoint =====
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.put("/users/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Change user password"""
    try:
        # Verify current password
        current_password_hash = hashlib.sha256(password_data.current_password.encode()).hexdigest()
        
        if current_user["password"] != current_password_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="รหัสผ่านปัจจุบันไม่ถูกต้อง"
            )
        
        # Hash new password
        new_password_hash = hashlib.sha256(password_data.new_password.encode()).hexdigest()
        
        # Update password
        result = await db.User.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"password": new_password_hash}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ไม่สามารถเปลี่ยนรหัสผ่านได้"
            )
        
        return {"message": "เปลี่ยนรหัสผ่านสำเร็จ"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน"
        )


# ===== Address Management Endpoint =====
class AddressUpdate(BaseModel):
    address: str


@app.put("/users/address")
async def update_address(
    address_data: AddressUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update user address"""
    try:
        result = await db.User.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"address": address_data.address}}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ไม่พบผู้ใช้"
            )
        
        return {"message": "บันทึกที่อยู่สำเร็จ", "address": address_data.address}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating address: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในการบันทึกที่อยู่"
        )


# ===== Avatar Upload Endpoint =====
class AvatarUpdate(BaseModel):
    secure_url: str
    public_id: str
    folder: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    bytes: Optional[int] = None
    format: Optional[str] = None


@app.post("/users/me/avatar")
async def update_avatar(
    avatar_data: AvatarUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Update user avatar"""
    try:
        avatar_dict = {
            "secure_url": avatar_data.secure_url,
            "public_id": avatar_data.public_id,
        }
        
        # Add optional fields if provided
        if avatar_data.folder:
            avatar_dict["folder"] = avatar_data.folder
        if avatar_data.width:
            avatar_dict["width"] = avatar_data.width
        if avatar_data.height:
            avatar_dict["height"] = avatar_data.height
        if avatar_data.bytes:
            avatar_dict["bytes"] = avatar_data.bytes
        if avatar_data.format:
            avatar_dict["format"] = avatar_data.format
        
        result = await db.User.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"avatar": avatar_dict}}
        )
        
        if result.modified_count == 0 and result.matched_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="ไม่พบผู้ใช้"
            )
        
        return {"message": "อัปโหลดรูปโปรไฟล์สำเร็จ", "avatar": avatar_dict}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating avatar: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="เกิดข้อผิดพลาดในการอัปโหลดรูปโปรไฟล์"
        )


# Add remaining endpoints following the same optimization patterns:
# - Use indexed fields in queries
# - Add projections to limit returned fields
# - Use .to_list(limit) instead of .to_list(None)
# - Add try-except with logging
# - Simplify aggregation pipelines

# ===== Store Endpoints =====
class StoreCreate(BaseModel):
    storeName: str
    storeDescription: Optional[str] = None
    phoneNumber: Optional[str] = None
    buMail: Optional[str] = None


class StoreResponse(BaseModel):
    id: str
    ownerId: Optional[str] = None
    storeName: str
    storeDescription: Optional[str]
    phoneNumber: Optional[str] = None
    buMail: Optional[str]
    qrUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    registerDate: datetime
    status: str
    statusReason: Optional[str] = None


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
        qrUrl=store.get("qrUrl"),
        logoUrl=store.get("logoUrl"),
        registerDate=store["registerDate"],
        status=store["status"],
        statusReason=store.get("statusReason")
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
        "buMail": store_data.buMail,  # Use buMail from form data
        "registerDate": datetime.utcnow(),
        "status": "ACTIVE",
        "statusReason": None
    }
    
    result = await db.Store.insert_one(store_doc)
    store_doc["_id"] = result.inserted_id
    
    # Update user role to SELLER
    await db.User.update_one(
        {"_id": user_id},
        {"$set": {"role": "SELLER"}}
    )
    
    return StoreResponse(
        id=str(store_doc["_id"]),
        ownerId=str(store_doc["ownerId"]),
        storeName=store_doc["storeName"],
        storeDescription=store_doc["storeDescription"],
        phoneNumber=store_doc["phoneNumber"],
        buMail=store_doc["buMail"],
        qrUrl=store_doc.get("qrUrl"),
        registerDate=store_doc["registerDate"],
        status=store_doc["status"],
        statusReason=store_doc.get("statusReason")
    )


@app.get("/users/me/has-store")
async def check_has_store(db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    """Check if user has a store"""
    user_id = current_user["_id"]
    store = await db.Store.find_one({"ownerId": user_id})
    
    return {"hasStore": store is not None}


# ===== OTP Endpoints =====
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

class OTPRequest(BaseModel):
    email: str

class OTPVerify(BaseModel):
    email: str
    otp: str

# Store OTP in memory (in production, use Redis or database)
otp_storage = {}

def generate_otp():
    """Generate 6-digit OTP"""
    return str(random.randint(100000, 999999))

def send_email_otp(email: str, otp: str):
    """Send OTP via email"""
    try:
        # Email configuration (you should use environment variables)
        smtp_server = os.getenv("SMTP_SERVER")
        smtp_port = int(os.getenv("SMTP_PORT"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        
        if not smtp_username or not smtp_password:
            print("SMTP credentials not configured, using mock email")
            return True
        
        # Create message
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = "Walk4You - Store Registration OTP"
        
        # Email body
        body = f"""
        <html>
        <body>
            <h2>Walk4You Store Registration</h2>
            <p>Your OTP code is: <strong>{otp}</strong></p>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <br>
            <p>Best regards,<br>Walk4You Team</p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()
        
        return True
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False

@app.post("/auth/send-otp")
async def send_otp(request: OTPRequest):
    """Send OTP to email"""
    email = request.email
    
    # Validate BU Mail format
    if not email.endswith("@bumail.net"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only BU Mail addresses are allowed"
        )
    
    # Generate OTP
    otp = generate_otp()
    
    # Store OTP with expiration (10 minutes)
    import time
    otp_storage[email] = {
        "otp": otp,
        "expires_at": time.time() + 600,  # 10 minutes
        "attempts": 0
    }
    
    # Send email
    email_sent = send_email_otp(email, otp)
    
    if email_sent:
        return {
            "success": True,
            "message": "OTP sent to your email",
            "email": email
        }
    else:
        # For development, return OTP in response
        return {
            "success": True,
            "message": "OTP sent to your email (development mode)",
            "email": email,
            "otp": otp  # Only for development
        }

@app.post("/auth/verify-otp")
async def verify_otp(request: OTPVerify):
    """Verify OTP"""
    email = request.email
    otp = request.otp
    
    # Check if OTP exists
    if email not in otp_storage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP not found or expired"
        )
    
    stored_data = otp_storage[email]
    
    # Check expiration
    import time
    if time.time() > stored_data["expires_at"]:
        del otp_storage[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP expired"
        )
    
    # Check attempts
    if stored_data["attempts"] >= 3:
        del otp_storage[email]
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many attempts"
        )
    
    # Verify OTP
    if stored_data["otp"] != otp:
        stored_data["attempts"] += 1
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP"
        )
    
    # OTP verified successfully
    del otp_storage[email]
    
    return {
        "success": True,
        "message": "OTP verified successfully"
    }


# ===== Store Management Models =====
class StoreUpdate(BaseModel):
    storeName: str
    storeDescription: Optional[str] = None


class StoreResponse(BaseModel):
    id: str
    storeName: str
    storeDescription: Optional[str] = None
    buMail: Optional[str] = None
    qrUrl: Optional[str] = None
    logoUrl: Optional[str] = None
    registerDate: datetime
    status: str
    statusReason: Optional[str] = None


# ===== Product Models =====
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    quantity: int
    image_url: Optional[str] = None
    category: Optional[str] = None
    shippingCost: Optional[float] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    shippingCost: Optional[float] = None


# ===== Store Management Endpoints =====
@app.get("/stores/my-store", response_model=StoreResponse)
async def get_my_store(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get current user's store"""
    user_id = current_user["id"]
    
    # Find store by owner
    store = await db.stores.find_one({"ownerId": ObjectId(user_id)})
    
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    return StoreResponse(
        id=str(store["_id"]),
        storeName=store["storeName"],
        storeDescription=store.get("storeDescription"),
        buMail=store.get("buMail"),
        qrUrl=store.get("qrUrl"),
        registerDate=store["registerDate"],
        status=store["status"],
        statusReason=store.get("statusReason")
    )


@app.put("/stores/my-store", response_model=StoreResponse)
async def update_my_store(
    store_data: StoreUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update current user's store"""
    user_id = current_user["_id"]
    
    # Check if store exists
    existing_store = await db.stores.find_one({"ownerId": ObjectId(user_id)})
    
    if not existing_store:
        # Create new store if doesn't exist
        store_doc = {
            "ownerId": ObjectId(user_id),
            "storeName": store_data.storeName,
            "storeDescription": store_data.storeDescription,
            "buMail": current_user["email"],  # Use user's email as buMail
            "registerDate": datetime.now(),
            "status": "ACTIVE",
            "statusReason": None
        }
        result = await db.stores.insert_one(store_doc)
        store_doc["_id"] = result.inserted_id
    else:
        # Update existing store
        update_data = {
            "storeName": store_data.storeName,
            "storeDescription": store_data.storeDescription
        }
        
        await db.stores.update_one(
            {"ownerId": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # Get updated store
        store_doc = await db.stores.find_one({"ownerId": ObjectId(user_id)})
    
    return StoreResponse(
        id=str(store_doc["_id"]),
        storeName=store_doc["storeName"],
        storeDescription=store_doc.get("storeDescription"),
        buMail=store_doc.get("buMail"),
        qrUrl=store_doc.get("qrUrl"),
        registerDate=store_doc["registerDate"],
        status=store_doc["status"],
        statusReason=store_doc.get("statusReason")
    )


@app.post("/stores/my-store", response_model=StoreResponse)
async def create_my_store(
    store_data: StoreUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new store for current user"""
    user_id = current_user["id"]
    
    # Check if store already exists
    existing_store = await db.stores.find_one({"ownerId": ObjectId(user_id)})
    
    if existing_store:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store already exists for this user"
        )
    
    # Create new store
    store_doc = {
        "ownerId": ObjectId(user_id),
        "storeName": store_data.storeName,
        "storeDescription": store_data.storeDescription,
        "buMail": current_user["email"],  # Use user's email as buMail
        "registerDate": datetime.now(),
        "status": "ACTIVE",
        "statusReason": None
    }
    
    result = await db.Store.insert_one(store_doc)
    store_doc["_id"] = result.inserted_id
    
    return StoreResponse(
        id=str(store_doc["_id"]),
        storeName=store_doc["storeName"],
        storeDescription=store_doc.get("storeDescription"),
        buMail=store_doc.get("buMail"),
        qrUrl=store_doc.get("qrUrl"),
        registerDate=store_doc["registerDate"],
        status=store_doc["status"],
        statusReason=store_doc.get("statusReason")
    )


# Sales Dashboard Endpoint
class DashboardStats(BaseModel):
    totalRevenue: float
    totalOrders: int
    pendingOrders: int
    completedOrders: int
    topProducts: list[dict]
    recentOrders: list[dict]
    dailySales: list[dict]
    monthlySales: list[dict]

@app.get("/stores/my/dashboard")
async def get_store_dashboard(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get sales dashboard statistics for store owner"""
    try:
        user_id = current_user["_id"]
        
        # Find store
        store = await db.Store.find_one({"ownerId": user_id})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        store_id = store["_id"]
        
        # Get all products from this store
        products = await db.Product.find({"storeId": store_id}).to_list(None)
        product_ids = [p["_id"] for p in products]
        product_ids_str = [str(pid) for pid in product_ids]
        
        # Get all orders containing products from this store (try both ObjectId and string)
        orders = await db.Order.find({
            "$or": [
                {"items.productId": {"$in": product_ids}},
                {"items.productId": {"$in": product_ids_str}}
            ]
        }).to_list(None)
        
        logger.info(f"Store {store_id} - Found {len(orders)} orders")
        logger.info(f"Product IDs: {product_ids_str}")
        
        # Calculate statistics (only COMPLETED orders)
        total_revenue = 0
        total_orders = 0
        pending_orders = 0
        completed_orders = 0
        product_sales = {}
        daily_sales = {}
        monthly_sales = {}
        
        for order in orders:
            order_status = order.get("status", "PENDING")
            order_date = order.get("updatedAt") or order.get("orderDate", datetime.utcnow())
            day_key = order_date.strftime("%Y-%m-%d")
            month_key = order_date.strftime("%Y-%m")
            
            # Filter items from this store (check both ObjectId and string)
            store_items = []
            for item in order.get("items", []):
                item_product_id = item.get("productId")
                # Convert to string for comparison
                if isinstance(item_product_id, ObjectId):
                    item_product_id_str = str(item_product_id)
                else:
                    item_product_id_str = item_product_id
                
                if item_product_id in product_ids or item_product_id_str in product_ids_str:
                    store_items.append(item)
            
            # Count orders that have at least one item from this store
            if store_items:
                total_orders += 1
                
                # Count order status
                if order_status in ["PENDING", "PROCESSING"]:
                    pending_orders += 1
                elif order_status == "COMPLETED":
                    completed_orders += 1
            
            # Only calculate revenue for COMPLETED orders
            if order_status == "COMPLETED":
                for item in store_items:
                    item_total = item.get("price", 0) * item.get("quantity", 0)
                    total_revenue += item_total
                    
                    # Track product sales
                    product_id = str(item.get("productId"))
                    if product_id not in product_sales:
                        product_sales[product_id] = {
                            "productId": product_id,
                            "quantity": 0,
                            "revenue": 0
                        }
                    product_sales[product_id]["quantity"] += item.get("quantity", 0)
                    product_sales[product_id]["revenue"] += item_total
                    
                    # Track daily sales
                    if day_key not in daily_sales:
                        daily_sales[day_key] = 0
                    daily_sales[day_key] += item_total
                    
                    # Track monthly sales
                    if month_key not in monthly_sales:
                        monthly_sales[month_key] = 0
                    monthly_sales[month_key] += item_total
        
        # Get top 5 products by revenue
        top_products_list = sorted(product_sales.values(), key=lambda x: x["revenue"], reverse=True)[:5]
        
        # Enrich with product details
        for item in top_products_list:
            product = await db.Product.find_one({"_id": ObjectId(item["productId"])})
            if product:
                item["name"] = product.get("name", "Unknown")
                item["price"] = product.get("price", 0)
        
        # Get recent 10 orders (all statuses)
        recent_orders_list = []
        
        # Helper function to check if productId matches
        def is_product_in_store(item_product_id, product_ids, product_ids_str):
            if isinstance(item_product_id, ObjectId):
                return item_product_id in product_ids or str(item_product_id) in product_ids_str
            else:
                return item_product_id in product_ids_str or (ObjectId(item_product_id) if ObjectId.is_valid(item_product_id) else None) in product_ids
        
        orders_with_store_items = []
        for order in orders:
            has_store_item = False
            for item in order.get("items", []):
                if is_product_in_store(item.get("productId"), product_ids, product_ids_str):
                    has_store_item = True
                    break
            if has_store_item:
                orders_with_store_items.append(order)
        
        logger.info(f"Store {store_id} - Found {len(orders_with_store_items)} orders with store items")
        
        for order in sorted(orders_with_store_items, key=lambda x: x.get("updatedAt") or x.get("orderDate", datetime.min), reverse=True)[:20]:
            store_items = []
            for item in order.get("items", []):
                if is_product_in_store(item.get("productId"), product_ids, product_ids_str):
                    store_items.append(item)
            
            if store_items:
                order_total = sum(item.get("price", 0) * item.get("quantity", 0) for item in store_items)
                
                # Get product names
                product_names = []
                for item in store_items:
                    product_id = item.get("productId")
                    if isinstance(product_id, ObjectId):
                        product_id = product_id
                    else:
                        product_id = ObjectId(product_id) if ObjectId.is_valid(str(product_id)) else None
                    
                    if product_id:
                        product = await db.Product.find_one({"_id": product_id})
                        if product:
                            qty = item.get("quantity", 1)
                            product_name = product.get("name", "สินค้า")
                            if qty > 1:
                                product_names.append(f"{product_name} x{qty}")
                            else:
                                product_names.append(product_name)
                
                recent_orders_list.append({
                    "orderId": str(order["_id"]),
                    "orderDate": (order.get("updatedAt") or order.get("orderDate", datetime.utcnow())).isoformat(),
                    "status": order.get("status", "PENDING"),
                    "total": order_total,
                    "itemCount": sum(item.get("quantity", 0) for item in store_items),
                    "productNames": ", ".join(product_names) if product_names else "สินค้า"
                })
        
        # Format daily sales (last 30 days)
        daily_sales_list = [
            {"date": date, "revenue": revenue}
            for date, revenue in sorted(daily_sales.items(), reverse=True)[:30]
        ]
        daily_sales_list.reverse()  # Show oldest to newest
        
        # Format monthly sales (last 12 months)
        monthly_sales_list = [
            {"month": month, "revenue": revenue}
            for month, revenue in sorted(monthly_sales.items(), reverse=True)[:12]
        ]
        monthly_sales_list.reverse()
        
        return {
            "totalRevenue": round(total_revenue, 2),
            "totalOrders": total_orders,
            "pendingOrders": pending_orders,
            "completedOrders": completed_orders,
            "topProducts": top_products_list,
            "recentOrders": recent_orders_list,
            "dailySales": daily_sales_list,
            "monthlySales": monthly_sales_list
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store dashboard: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Illegal Product Detection with YOLOv8 =====
async def check_illegal_product_yolo(image_url: str) -> dict:
    """
    Check if product image contains illegal items using YOLOv8 model
    Returns: {
        "is_illegal": bool,
        "detected_items": list,
        "confidence": float
    }
    """
    try:
        if not image_url:
            return {"is_illegal": False, "detected_items": [], "confidence": 0.0}
        
        # Check if YOLO is enabled
        if not YOLO_ENABLED:
            logger.info("YOLO detection is disabled. Skipping check.")
            return {"is_illegal": False, "detected_items": [], "confidence": 0.0}
        
        if yolo_model is None:
            logger.warning("YOLO model not loaded, skipping illegal product check")
            return {"is_illegal": False, "detected_items": [], "confidence": 0.0}
        
        # Download image from URL
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                image_response = await client.get(image_url)
                if image_response.status_code != 200:
                    logger.error(f"Failed to download image: {image_response.status_code}")
                    return {"is_illegal": False, "detected_items": [], "confidence": 0.0}
                
                # Open image with PIL
                image = Image.open(io.BytesIO(image_response.content))
        except Exception as e:
            logger.error(f"Error downloading/opening image: {e}")
            return {"is_illegal": False, "detected_items": [], "confidence": 0.0}
        
        # Run YOLO inference
        results = yolo_model(image, conf=YOLO_CONFIDENCE_THRESHOLD)
        
        # Parse results
        detected_items = []
        max_confidence = 0.0
        
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Get class name and confidence
                class_id = int(box.cls[0])
                confidence = float(box.conf[0])
                class_name = result.names[class_id]
                
                detected_items.append({
                    "class": class_name,
                    "confidence": confidence
                })
                
                if confidence > max_confidence:
                    max_confidence = confidence
        
        # Product is illegal if any item is detected above threshold
        is_illegal = len(detected_items) > 0
        
        logger.info(f"YOLO detection - Detected: {len(detected_items)} items, Max confidence: {max_confidence}, Is illegal: {is_illegal}")
        
        return {
            "is_illegal": is_illegal,
            "detected_items": detected_items,
            "confidence": max_confidence
        }
        
    except Exception as e:
        logger.warning(f"Error checking illegal product with YOLO: {e}. Allowing product to be listed.")
        return {"is_illegal": False, "detected_items": [], "confidence": 0.0}


# ===== Test Endpoint for Illegal Product Detection =====
class ImageCheckRequest(BaseModel):
    image_url: str

@app.post("/products/check-illegal")
async def check_illegal_product_endpoint(
    request: ImageCheckRequest,
    current_user: dict = Depends(get_current_user)
):
    """Test endpoint to check if an image contains illegal products"""
    result = await check_illegal_product_yolo(request.image_url)
    return {
        "is_illegal": result["is_illegal"],
        "detected_items": result["detected_items"],
        "max_confidence": result["confidence"],
        "message": "สินค้าผิดกฎหมาย ไม่สามารถวางขายได้" if result["is_illegal"] else "สินค้าปกติ สามารถวางขายได้"
    }


# ===== Product Endpoints =====
@app.get("/products/my-products", response_model=list[ProductResponse])
async def get_my_products(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all products for current user's store"""
    user_id = current_user["_id"]
    
    # Find user's store
    store = await db.Store.find_one({"ownerId": user_id})
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Get products for this store
    products = await db.Product.find({"storeId": store["_id"], "status": "ACTIVE"}).to_list(None)
    
    return [
        ProductResponse(
            id=str(product["_id"]),
            storeId=str(product["storeId"]),
            name=product["name"],
            description=product["description"],
            price=product["price"],
            quantity=product["quantity"],
            image_url=product.get("image_url"),
            category=product.get("category"),
            createdAt=product["createdAt"],
            updatedAt=product["updatedAt"],
            status=product["status"]
        )
        for product in products
    ]


# ===== PRODUCTS =====
@app.post("/products", response_model=ProductResponse)
async def create_product(
    product_data: ProductCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new product for current user's store"""
    user_id = current_user["_id"]
    
    # Find user's store
    store = await db.Store.find_one({"ownerId": user_id})
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Check for illegal products if image is provided
    if product_data.image_url:
        illegal_check = await check_illegal_product_yolo(product_data.image_url)
        
        if illegal_check["is_illegal"]:
            detected_items_str = ", ".join([
                f"{item['class']} ({item['confidence']:.2%})" 
                for item in illegal_check["detected_items"]
            ])
            
            logger.warning(f"Illegal product detected for user {user_id}: {detected_items_str}")
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ไม่สามารถวางขายสินค้านี้ได้ เนื่องจากระบบตรวจพบสินค้าที่ผิดกฎหมาย: {detected_items_str}"
            )
    
    # Create new product
    product_doc = {
        "storeId": store["_id"],
        "name": product_data.name,
        "description": product_data.description,
        "price": product_data.price,
        "quantity": product_data.quantity,
        "image_url": product_data.image_url,
        "category": product_data.category,
        "shippingCost": product_data.shippingCost,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow(),
        "status": "ACTIVE"
    }
    
    result = await db.Product.insert_one(product_doc)
    product_doc["_id"] = result.inserted_id
    
    return ProductResponse(
        id=str(product_doc["_id"]),
        storeId=str(product_doc["storeId"]),
        name=product_doc["name"],
        description=product_doc["description"],
        price=product_doc["price"],
        quantity=product_doc["quantity"],
        image_url=product_doc.get("image_url"),
        category=product_doc.get("category"),
        shippingCost=product_doc.get("shippingCost"),
        createdAt=product_doc["createdAt"],
        updatedAt=product_doc["updatedAt"],
        status=product_doc["status"]
    )


@app.get("/products/{product_id}", response_model=ProductResponse)
async def get_product_public(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific product by ID - Public endpoint"""
    try:
        # Find product (public access)
        product = await db.Product.find_one({
            "_id": ObjectId(product_id),
            "status": "ACTIVE"
        })
        
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Product not found"
            )
        
        return ProductResponse(
            id=str(product["_id"]),
            storeId=str(product["storeId"]),
            name=product["name"],
            description=product["description"],
            price=product["price"],
            quantity=product["quantity"],
            image_url=product.get("image_url"),
            category=product.get("category"),
            createdAt=product["createdAt"],
            updatedAt=product["updatedAt"],
            status=product["status"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )


@app.get("/products/my/{product_id}", response_model=ProductResponse)
async def get_my_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific product by ID for store owner"""
    user_id = current_user["_id"]
    
    # Find user's store
    store = await db.Store.find_one({"ownerId": user_id})
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Find product
    product = await db.Product.find_one({
        "_id": ObjectId(product_id),
        "storeId": store["_id"]
    })
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return ProductResponse(
        id=str(product["_id"]),
        storeId=str(product["storeId"]),
        name=product["name"],
        description=product["description"],
        price=product["price"],
        quantity=product["quantity"],
        image_url=product.get("image_url"),
        category=product.get("category"),
        shippingCost=product.get("shippingCost"),
        createdAt=product["createdAt"],
        updatedAt=product["updatedAt"],
        status=product["status"]
    )


@app.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    product_data: ProductUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a specific product by ID"""
    user_id = current_user["_id"]
    
    # Find user's store
    store = await db.Store.find_one({"ownerId": user_id})
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Find product
    product = await db.Product.find_one({
        "_id": ObjectId(product_id),
        "storeId": store["_id"]
    })
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check for illegal products if image is being updated
    if product_data.image_url is not None and product_data.image_url != product.get("image_url"):
        illegal_check = await check_illegal_product_yolo(product_data.image_url)
        
        if illegal_check["is_illegal"]:
            detected_items_str = ", ".join([
                f"{item['class']} ({item['confidence']:.2%})" 
                for item in illegal_check["detected_items"]
            ])
            
            logger.warning(f"Illegal product detected in update for user {user_id}: {detected_items_str}")
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"ไม่สามารถอัปเดตสินค้านี้ได้ เนื่องจากระบบตรวจพบสินค้าที่ผิดกฎหมาย: {detected_items_str}"
            )
    
    # Update product
    update_data = {
        "updatedAt": datetime.utcnow()
    }
    
    if product_data.name is not None:
        update_data["name"] = product_data.name
    if product_data.description is not None:
        update_data["description"] = product_data.description
    if product_data.price is not None:
        update_data["price"] = product_data.price
    if product_data.quantity is not None:
        update_data["quantity"] = product_data.quantity
    if product_data.image_url is not None:
        update_data["image_url"] = product_data.image_url
    if product_data.category is not None:
        update_data["category"] = product_data.category
    if product_data.shippingCost is not None:
        update_data["shippingCost"] = product_data.shippingCost
    
    await db.Product.update_one(
        {"_id": ObjectId(product_id)},
        {"$set": update_data}
    )
    
    # Get updated product
    updated_product = await db.Product.find_one({"_id": ObjectId(product_id)})
    
    return ProductResponse(
        id=str(updated_product["_id"]),
        storeId=str(updated_product["storeId"]),
        name=updated_product["name"],
        description=updated_product["description"],
        price=updated_product["price"],
        quantity=updated_product["quantity"],
        image_url=updated_product.get("image_url"),
        category=updated_product.get("category"),
        shippingCost=updated_product.get("shippingCost"),
        createdAt=updated_product["createdAt"],
        updatedAt=updated_product["updatedAt"],
        status=updated_product["status"]
    )


@app.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a specific product by ID (permanent delete)"""
    user_id = current_user["_id"]
    
    # Find user's store
    store = await db.Store.find_one({"ownerId": user_id})
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )
    
    # Find product
    product = await db.Product.find_one({
        "_id": ObjectId(product_id),
        "storeId": store["_id"]
    })
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Permanent delete (remove from database)
    await db.Product.delete_one({"_id": ObjectId(product_id)})
    
    return {"message": "Product deleted successfully"}


# ===== Review Models =====
class ReviewCreate(BaseModel):
    rating: int
    comment: str


class ReviewResponse(BaseModel):
    id: str
    productId: str
    userId: str
    username: str
    rating: int
    comment: str
    createdAt: datetime
    updatedAt: datetime


# ===== Review Endpoints =====
@app.get("/products/{product_id}/reviews", response_model=list[ReviewResponse])
async def get_product_reviews(
    product_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all reviews for a product"""
    try:
        # Verify product exists
        product = await db.Product.find_one({"_id": ObjectId(product_id), "status": "ACTIVE"})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Get reviews with user information
        pipeline = [
            {"$match": {"productId": ObjectId(product_id)}},
            {
                "$lookup": {
                    "from": "User",
                    "localField": "userId",
                    "foreignField": "_id",
                    "as": "user"
                }
            },
            {"$unwind": "$user"},
            {
                "$project": {
                    "_id": 1,
                    "productId": 1,
                    "userId": 1,
                    "username": "$user.username",
                    "rating": 1,
                    "comment": 1,
                    "createdAt": 1,
                    "updatedAt": 1
                }
            },
            {"$sort": {"createdAt": -1}}
        ]
        
        reviews = await db.Review.aggregate(pipeline).to_list(None)
        
        return [
            ReviewResponse(
                id=str(review["_id"]),
                productId=str(review["productId"]),
                userId=str(review["userId"]),
                username=review["username"],
                rating=review["rating"],
                comment=review["comment"],
                createdAt=review["createdAt"],
                updatedAt=review["updatedAt"]
            )
            for review in reviews
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting product reviews: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/products/{product_id}/reviews", response_model=ReviewResponse)
async def create_product_review(
    product_id: str,
    review_data: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new review for a product"""
    try:
        # Verify product exists
        product = await db.Product.find_one({"_id": ObjectId(product_id), "status": "ACTIVE"})
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check if user already reviewed this product
        existing_review = await db.Review.find_one({
            "productId": ObjectId(product_id),
            "userId": current_user["_id"]
        })
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this product"
            )
        
        # Validate rating
        if review_data.rating < 1 or review_data.rating > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be between 1 and 5"
            )
        
        # Create review
        review_doc = {
            "productId": ObjectId(product_id),
            "userId": current_user["_id"],
            "rating": review_data.rating,
            "comment": review_data.comment,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.Review.insert_one(review_doc)
        review_doc["_id"] = result.inserted_id
        
        # Create notification for store owner
        store = await db.Store.find_one({"_id": product["storeId"]})
        if store:
            await create_notification(
                db=db,
                user_id=store["ownerId"],
                notification_type="review",
                title="มีรีวิวใหม่",
                message=f"มีรีวิวใหม่สำหรับสินค้า {product['name']} จาก {current_user['username']}",
                data={"productId": product_id, "reviewId": str(review_doc["_id"])}
            )
        
        return ReviewResponse(
            id=str(review_doc["_id"]),
            productId=str(review_doc["productId"]),
            userId=str(review_doc["userId"]),
            username=current_user["username"],
            rating=review_doc["rating"],
            comment=review_doc["comment"],
            createdAt=review_doc["createdAt"],
            updatedAt=review_doc["updatedAt"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating review: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Notification Models =====
class NotificationCreate(BaseModel):
    type: str  # "review", "order", "message"
    title: str
    message: str
    data: Optional[dict] = None


class NotificationResponse(BaseModel):
    id: str
    userId: str
    type: str
    title: str
    message: str
    data: Optional[dict] = None
    isRead: bool
    createdAt: datetime


# ===== Order Models =====
class OrderItem(BaseModel):
    productId: str
    quantity: int
    price: float


class OrderCreate(BaseModel):
    items: list[OrderItem]
    shippingAddress: str
    phoneNumber: str
    notes: Optional[str] = None
    paymentProofUrl: Optional[str] = None
    selection: Optional[dict] = None  # Contains selectedShipping, selectedPayment info from checkout


class OrderResponse(BaseModel):
    id: str
    userId: str
    storeId: str
    items: list[dict]
    totalAmount: float
    status: str
    shippingAddress: str
    phoneNumber: str
    notes: Optional[str] = None
    paymentProofUrl: Optional[str] = None
    shippingMethod: Optional[str] = None
    shippingCarrier: Optional[str] = None
    shippingId: Optional[str] = None
    createdAt: datetime
    updatedAt: datetime


class OrderStatusUpdate(BaseModel):
    status: str


class ShippingInfoUpdate(BaseModel):
    shippingMethod: Optional[str] = None
    shippingCarrier: Optional[str] = None
    shippingId: Optional[str] = None


# ===== Notification Endpoints =====
@app.get("/notifications", response_model=list[NotificationResponse])
async def get_user_notifications(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all notifications for current user"""
    try:
        notifications = await db.Notification.find(
            {"userId": current_user["_id"]}
        ).sort("createdAt", -1).to_list(None)
        
        return [
            NotificationResponse(
                id=str(notification["_id"]),
                userId=str(notification["userId"]),
                type=notification["type"],
                title=notification["title"],
                message=notification["message"],
                data=notification.get("data"),
                isRead=notification["isRead"],
                createdAt=notification["createdAt"]
            )
            for notification in notifications
        ]
    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark notification as read"""
    try:
        result = await db.Notification.update_one(
            {"_id": ObjectId(notification_id), "userId": current_user["_id"]},
            {"$set": {"isRead": True}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
        
        return {"message": "Notification marked as read"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/notifications/unread-count")
async def get_unread_count(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get count of unread notifications"""
    try:
        count = await db.Notification.count_documents({
            "userId": current_user["_id"],
            "isRead": False
        })
        
        return {"unreadCount": count}
    except Exception as e:
        logger.error(f"Error getting unread count: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Order Endpoints =====
@app.post("/orders", response_model=OrderResponse)
async def create_order(
    order_data: OrderCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new order"""
    try:
        # Validate products and calculate total
        total_amount = 0
        total_shipping = 0
        validated_items = []
        
        for item in order_data.items:
            product = await db.Product.find_one({
                "_id": ObjectId(item.productId),
                "status": "ACTIVE"
            })
            
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {item.productId} not found"
                )
            
            if product["quantity"] < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient quantity for product {product['name']}"
                )
            
            item_total = product["price"] * item.quantity
            total_amount += item_total
            
            validated_items.append({
                "productId": item.productId,
                "productName": product["name"],
                "quantity": item.quantity,
                "price": product["price"],
                "total": item_total,
                "shippingCost": product.get("shippingCost")
            })
        
        # Get store ID from first product
        first_product = await db.Product.find_one({"_id": ObjectId(order_data.items[0].productId)})
        store_id = first_product["storeId"]
        
        # Calculate shipping cost if postal shipping selected
        if order_data.selection and order_data.selection.get("selectedShipping", {}).get(str(store_id)) == "post":
            for item in validated_items:
                shipping_cost = item.get("shippingCost", 0) or 0
                total_shipping += shipping_cost
        
        # Add shipping to total
        total_amount += total_shipping
        
        # Create order
        # Store selection data in notes for store owner to see customer's delivery choice
        notes_data = {
            "selection": order_data.selection,
            "notes": order_data.notes
        }
        notes_json = json.dumps(notes_data)
        
        order_doc = {
            "userId": current_user["_id"],
            "username": current_user["username"],
            "storeId": store_id,
            "items": validated_items,
            "totalAmount": total_amount,
            "totalShipping": total_shipping,
            "status": "PENDING",
            "shippingAddress": order_data.shippingAddress,
            "phoneNumber": order_data.phoneNumber,
            "notes": notes_json,
            "paymentProofUrl": getattr(order_data, 'paymentProofUrl', None),
            "selection": order_data.selection,
            "shippingMethod": None,
            "shippingCarrier": None,
            "shippingId": None,
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow()
        }
        
        result = await db.Order.insert_one(order_doc)
        order_doc["_id"] = result.inserted_id
        
        # Create notification for store owner
        store = await db.Store.find_one({"_id": store_id})
        if store:
            await create_notification(
                db=db,
                user_id=store["ownerId"],
                notification_type="order",
                title="มีคำสั่งซื้อใหม่",
                message=f"มีคำสั่งซื้อใหม่จาก {current_user['username']} มูลค่า {total_amount:,.2f} บาท",
                data={"orderId": str(order_doc["_id"])}
            )
        
        return OrderResponse(
            id=str(order_doc["_id"]),
            userId=str(order_doc["userId"]),
            storeId=str(order_doc["storeId"]),
            items=order_doc["items"],
            totalAmount=order_doc["totalAmount"],
            status=order_doc["status"],
            shippingAddress=order_doc["shippingAddress"],
            phoneNumber=order_doc["phoneNumber"],
            notes=order_doc["notes"],
            paymentProofUrl=order_doc.get("paymentProofUrl"),
            shippingMethod=order_doc.get("shippingMethod"),
            shippingCarrier=order_doc.get("shippingCarrier"),
            shippingId=order_doc.get("shippingId"),
            createdAt=order_doc["createdAt"],
            updatedAt=order_doc["updatedAt"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating order: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/orders/my-store")
async def get_orders_for_store(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get orders for the current user's store (owner)"""
    try:
        # Find user's store
        # current_user is the user document returned by get_current_user; its "_id" is already an ObjectId
        store = await db.Store.find_one({"ownerId": current_user["_id"]})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")

        orders = await db.Order.find({"storeId": store["_id"]}).sort("createdAt", -1).to_list(None)

        return [
            {
                "id": str(o["_id"]),
                "username": o.get("username"),
                "userId": str(o["userId"]),
                "storeId": str(o["storeId"]),
                "items": o["items"],
                "totalAmount": o["totalAmount"],
                "status": o.get("status"),
                "shippingAddress": o.get("shippingAddress"),
                "phoneNumber": o.get("phoneNumber"),
                "notes": o.get("notes"),
                "selection": o.get("selection"),
                "paymentProofUrl": o.get("paymentProofUrl"),
                "shippingMethod": o.get("shippingMethod"),
                "shippingCarrier": o.get("shippingCarrier"),
                "shippingId": o.get("shippingId"),
                "createdAt": o.get("createdAt"),
                "updatedAt": o.get("updatedAt")
            }
            for o in orders
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching orders for store: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_update: OrderStatusUpdate, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Update order status (store owner only)"""
    try:
        # Find store owned by current user
        # Use the user's _id field (already an ObjectId) provided by get_current_user
        store = await db.Store.find_one({"ownerId": current_user["_id"]})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")

        # Verify order belongs to this store
        order = await db.Order.find_one({"_id": ObjectId(order_id), "storeId": store["_id"]})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found for this store")

        # Allowed statuses (you can expand as needed)
        allowed = ["PENDING", "APPROVED", "REJECTED", "SHIPPED", "CANCELLED"]
        new_status = status_update.status.upper()
        if new_status not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid status. Allowed: {allowed}")

        # Get current status before updating
        old_status = order.get("status", "PENDING")
        
        # If status is changing to APPROVED and wasn't APPROVED before, deduct stock
        if new_status == "APPROVED" and old_status != "APPROVED":
            # Validate and deduct stock for each item
            items = order.get("items", [])
            for item in items:
                product_id = item.get("productId")
                quantity = item.get("quantity", 0)
                
                # Check current stock
                product = await db.Product.find_one({"_id": ObjectId(product_id)})
                if not product:
                    raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
                
                current_stock = product.get("quantity", 0)
                if current_stock < quantity:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Insufficient stock for product {product.get('name', product_id)}. Available: {current_stock}, Required: {quantity}"
                    )
                
                # Deduct stock
                result = await db.Product.update_one(
                    {"_id": ObjectId(product_id)},
                    {"$inc": {"quantity": -quantity}}
                )
                
                if result.modified_count == 0:
                    raise HTTPException(status_code=500, detail=f"Failed to update stock for product {product_id}")
        
        # If status is changing from APPROVED to REJECTED or CANCELLED, restore stock
        elif old_status == "APPROVED" and new_status in ["REJECTED", "CANCELLED"]:
            items = order.get("items", [])
            for item in items:
                product_id = item.get("productId")
                quantity = item.get("quantity", 0)
                
                # Restore stock
                await db.Product.update_one(
                    {"_id": ObjectId(product_id)},
                    {"$inc": {"quantity": quantity}}
                )

        await db.Order.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": new_status, "updatedAt": datetime.utcnow()}})

        # Notify user
        try:
            order_id_str = str(order["_id"])
            await create_notification(
                db=db,
                user_id=order["userId"],
                notification_type="order",
                title="สถานะคำสั่งซื้อเปลี่ยนแปลง",
                message=f"คำสั่งซื้อของคุณ (ID: {order_id_str}) ถูกเปลี่ยนสถานะเป็น {new_status}",
                data={"orderId": order_id_str}
            )
        except Exception:
            pass

        return {"message": "Order status updated", "status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/orders/{order_id}/complete")
async def confirm_order_received(order_id: str, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Buyer confirms receipt; mark order as COMPLETED"""
    try:
        order = await db.Order.find_one({"_id": ObjectId(order_id), "userId": current_user["_id"]})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        # Only allow confirming if order is at least shipped/approved
        current_status = order.get("status", "PENDING")
        if current_status in ["COMPLETED", "CANCELLED"]:
            return {"message": "No change", "status": current_status}

        await db.Order.update_one({"_id": ObjectId(order_id)}, {"$set": {"status": "COMPLETED", "updatedAt": datetime.utcnow()}})

        # Notify store owner
        try:
            store = await db.Store.find_one({"_id": order["storeId"]})
            if store:
                await create_notification(
                    db=db,
                    user_id=store["ownerId"],
                    notification_type="order",
                    title="ลูกค้ายืนยันได้รับสินค้า",
                    message=f"คำสั่งซื้อ {str(order['_id'])} ถูกยืนยันว่าได้รับสินค้าแล้ว",
                    data={"orderId": str(order["_id"]) }
                )
        except Exception:
            pass

        return {"message": "Order marked as COMPLETED", "status": "COMPLETED"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming order received: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/orders/{order_id}/shipping")
async def update_order_shipping(order_id: str, shipping_update: ShippingInfoUpdate, current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Update shipping info for an order (store owner only)"""
    try:
        store = await db.Store.find_one({"ownerId": current_user["_id"]})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")

        order = await db.Order.find_one({"_id": ObjectId(order_id), "storeId": store["_id"]})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found for this store")

        update_fields = {k: v for k, v in {
            "shippingMethod": shipping_update.shippingMethod,
            "shippingCarrier": shipping_update.shippingCarrier,
            "shippingId": shipping_update.shippingId,
            "updatedAt": datetime.utcnow()
        }.items() if v is not None}

        if not update_fields:
            raise HTTPException(status_code=400, detail="No shipping fields provided")

        await db.Order.update_one({"_id": ObjectId(order_id)}, {"$set": update_fields})

        # Notify buyer that shipping info updated
        try:
            await create_notification(
                db=db,
                user_id=order["userId"],
                notification_type="order",
                title="อัปเดตข้อมูลการจัดส่ง",
                message=f"คำสั่งซื้อของคุณ (ID: {str(order['_id'])}) มีการอัปเดตข้อมูลการจัดส่ง",
                data={"orderId": str(order["_id"]) }
            )
        except Exception:
            pass

        return {"message": "Shipping info updated"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating order shipping: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/orders/my")
async def get_my_orders(current_user: dict = Depends(get_current_user), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Get orders placed by the current user"""
    try:
        orders = await db.Order.find({"userId": current_user["_id"]}).sort("createdAt", -1).to_list(None)
        return [
            {
                "id": str(o["_id"]),
                "userId": str(o["userId"]),
                "storeId": str(o["storeId"]),
                "items": o["items"],
                "totalAmount": o["totalAmount"],
                "status": o.get("status"),
                "shippingAddress": o.get("shippingAddress"),
                "phoneNumber": o.get("phoneNumber"),
                "notes": o.get("notes"),
                "paymentProofUrl": o.get("paymentProofUrl"),
                "shippingMethod": o.get("shippingMethod"),
                "shippingCarrier": o.get("shippingCarrier"),
                "shippingId": o.get("shippingId"),
                "createdAt": o.get("createdAt"),
                "updatedAt": o.get("updatedAt")
            }
            for o in orders
        ]
    except Exception as e:
        logger.error(f"Error fetching my orders: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Helper Functions =====
async def create_notification(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[dict] = None
):
    """Helper function to create notification"""
    try:
        notification_doc = {
            "userId": user_id,
            "type": notification_type,
            "title": title,
            "message": message,
            "data": data,
            "isRead": False,
            "createdAt": datetime.utcnow()
        }
        
        await db.Notification.insert_one(notification_doc)
    except Exception as e:
        logger.error(f"Error creating notification: {e}")


# ===== Cart Models =====
class CartItemCreate(BaseModel):
    productId: str
    quantity: int


class CartItemUpdate(BaseModel):
    quantity: int


class CartItemResponse(BaseModel):
    id: str
    productId: str
    productName: str
    productPrice: float
    productImage: Optional[str] = None
    quantity: int
    totalPrice: float
    storeId: str
    storeName: str
    shippingCost: Optional[float] = None
    createdAt: datetime
    updatedAt: datetime


class CartResponse(BaseModel):
    id: str
    userId: str
    items: list[CartItemResponse]
    totalItems: int
    totalAmount: float
    createdAt: datetime
    updatedAt: datetime


# ===== Cart Endpoints =====
@app.get("/cart", response_model=CartResponse)
async def get_cart(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get user's cart"""
    try:
        # Find user's cart
        cart = await db.Cart.find_one({"userId": current_user["_id"]})
        
        if not cart:
            # Create empty cart if doesn't exist
            cart_doc = {
                "userId": current_user["_id"],
                "items": [],
                "totalItems": 0,
                "totalAmount": 0.0,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            result = await db.Cart.insert_one(cart_doc)
            cart_doc["_id"] = result.inserted_id
            cart = cart_doc
        
        # Get product details for each cart item
        cart_items = []
        for item in cart["items"]:
            product = await db.Product.find_one({"_id": ObjectId(item["productId"])})
            if product:
                # Get store information
                store = await db.Store.find_one({"_id": product["storeId"]})
                store_name = store["storeName"] if store else "Unknown Store"
                
                cart_items.append(CartItemResponse(
                    id=str(item["_id"]),
                    productId=str(item["productId"]),
                    productName=product["name"],
                    productPrice=product["price"],
                    productImage=product.get("image_url"),
                    quantity=item["quantity"],
                    totalPrice=product["price"] * item["quantity"],
                    storeId=str(product["storeId"]),
                    storeName=store_name,
                    shippingCost=product.get("shippingCost"),
                    createdAt=item["createdAt"],
                    updatedAt=item["updatedAt"]
                ))
        
        return CartResponse(
            id=str(cart["_id"]),
            userId=str(cart["userId"]),
            items=cart_items,
            totalItems=cart["totalItems"],
            totalAmount=cart["totalAmount"],
            createdAt=cart["createdAt"],
            updatedAt=cart["updatedAt"]
        )
        
    except Exception as e:
        logger.error(f"Error getting cart: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/cart/items", response_model=CartItemResponse)
async def add_to_cart(
    item_data: CartItemCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Add item to cart"""
    try:
        # Verify product exists and is active
        product = await db.Product.find_one({
            "_id": ObjectId(item_data.productId),
            "status": "ACTIVE"
        })
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check if product has enough quantity
        if product["quantity"] < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient quantity. Available: {product['quantity']}"
            )
        
        # Find user's cart
        cart = await db.Cart.find_one({"userId": current_user["_id"]})
        
        if not cart:
            # Create new cart
            cart_doc = {
                "userId": current_user["_id"],
                "items": [],
                "totalItems": 0,
                "totalAmount": 0.0,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            result = await db.Cart.insert_one(cart_doc)
            cart_doc["_id"] = result.inserted_id
            cart = cart_doc
        
        # Check if item already exists in cart
        existing_item = None
        for item in cart["items"]:
            if str(item["productId"]) == item_data.productId:
                existing_item = item
                break
        
        if existing_item:
            # Update existing item quantity
            existing_item["quantity"] += item_data.quantity
            existing_item["updatedAt"] = datetime.utcnow()
        else:
            # Add new item to cart
            new_item = {
                "_id": ObjectId(),
                "productId": ObjectId(item_data.productId),
                "quantity": item_data.quantity,
                "createdAt": datetime.utcnow(),
                "updatedAt": datetime.utcnow()
            }
            cart["items"].append(new_item)
        
        # Recalculate totals
        total_items = sum(item["quantity"] for item in cart["items"])
        total_amount = 0.0
        
        for item in cart["items"]:
            product = await db.Product.find_one({"_id": item["productId"]})
            if product:
                total_amount += product["price"] * item["quantity"]
        
        # Update cart
        await db.Cart.update_one(
            {"_id": cart["_id"]},
            {
                "$set": {
                    "items": cart["items"],
                    "totalItems": total_items,
                    "totalAmount": total_amount,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        # Return the added/updated item
        target_item = existing_item if existing_item else cart["items"][-1]
        
        # Get store information
        store = await db.Store.find_one({"_id": product["storeId"]})
        store_name = store["storeName"] if store else "Unknown Store"
        
        return CartItemResponse(
            id=str(target_item["_id"]),
            productId=str(target_item["productId"]),
            productName=product["name"],
            productPrice=product["price"],
            productImage=product.get("image_url"),
            quantity=target_item["quantity"],
            totalPrice=product["price"] * target_item["quantity"],
            storeId=str(product["storeId"]),
            storeName=store_name,
            createdAt=target_item["createdAt"],
            updatedAt=target_item["updatedAt"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding to cart: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/cart/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: str,
    item_data: CartItemUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update cart item quantity"""
    try:
        # Find user's cart
        cart = await db.Cart.find_one({"userId": current_user["_id"]})
        
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Find the item in cart
        item_found = None
        for item in cart["items"]:
            if str(item["_id"]) == item_id:
                item_found = item
                break
        
        if not item_found:
            raise HTTPException(status_code=404, detail="Cart item not found")
        
        # Verify product still exists and has enough quantity
        product = await db.Product.find_one({
            "_id": item_found["productId"],
            "status": "ACTIVE"
        })
        
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        if product["quantity"] < item_data.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient quantity. Available: {product['quantity']}"
            )
        
        # Update item quantity
        item_found["quantity"] = item_data.quantity
        item_found["updatedAt"] = datetime.utcnow()
        
        # Recalculate totals
        total_items = sum(item["quantity"] for item in cart["items"])
        total_amount = 0.0
        
        for item in cart["items"]:
            product = await db.Product.find_one({"_id": item["productId"]})
            if product:
                total_amount += product["price"] * item["quantity"]
        
        # Update cart
        await db.Cart.update_one(
            {"_id": cart["_id"]},
            {
                "$set": {
                    "items": cart["items"],
                    "totalItems": total_items,
                    "totalAmount": total_amount,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        # Get store information
        store = await db.Store.find_one({"_id": product["storeId"]})
        store_name = store["storeName"] if store else "Unknown Store"
        
        return CartItemResponse(
            id=str(item_found["_id"]),
            productId=str(item_found["productId"]),
            productName=product["name"],
            productPrice=product["price"],
            productImage=product.get("image_url"),
            quantity=item_found["quantity"],
            totalPrice=product["price"] * item_found["quantity"],
            storeId=str(product["storeId"]),
            storeName=store_name,
            createdAt=item_found["createdAt"],
            updatedAt=item_found["updatedAt"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating cart item: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/cart/items/{item_id}")
async def remove_from_cart(
    item_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove item from cart"""
    try:
        # Find user's cart
        cart = await db.Cart.find_one({"userId": current_user["_id"]})
        
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Remove item from cart
        cart["items"] = [item for item in cart["items"] if str(item["_id"]) != item_id]
        
        # Recalculate totals
        total_items = sum(item["quantity"] for item in cart["items"])
        total_amount = 0.0
        
        for item in cart["items"]:
            product = await db.Product.find_one({"_id": item["productId"]})
            if product:
                total_amount += product["price"] * item["quantity"]
        
        # Update cart
        await db.Cart.update_one(
            {"_id": cart["_id"]},
            {
                "$set": {
                    "items": cart["items"],
                    "totalItems": total_items,
                    "totalAmount": total_amount,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Item removed from cart"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing from cart: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.delete("/cart")
async def clear_cart(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Clear entire cart"""
    try:
        # Find user's cart
        cart = await db.Cart.find_one({"userId": current_user["_id"]})
        
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found")
        
        # Clear cart items
        await db.Cart.update_one(
            {"_id": cart["_id"]},
            {
                "$set": {
                    "items": [],
                    "totalItems": 0,
                    "totalAmount": 0.0,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        return {"message": "Cart cleared"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clearing cart: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Public Store Endpoints =====
@app.get("/stores/{store_id}")
async def get_public_store(
    store_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get public store information by ID"""
    try:
        # Try to convert store_id to ObjectId
        try:
            store_obj_id = ObjectId(store_id)
        except Exception:
            raise HTTPException(status_code=404, detail="Invalid store ID format")
        
        # First try to find active store
        store = await db.Store.find_one({
            "_id": store_obj_id,
            "status": "ACTIVE"
        })
        
        # If not active, check if store exists but is inactive
        if not store:
            store = await db.Store.find_one({"_id": store_obj_id})
            if store:
                logger.warning(f"Store {store_id} exists but status is {store.get('status')}, not ACTIVE")
                raise HTTPException(status_code=404, detail="Store not found or inactive")
            else:
                raise HTTPException(status_code=404, detail="Store not found")
        
        return {
            "id": str(store["_id"]),
            "storeName": store["storeName"],
            "storeDescription": store.get("storeDescription"),
            "phoneNumber": store.get("phoneNumber"),
            "buMail": store.get("buMail"),
            "qrUrl": store.get("qrUrl"),
            "logoUrl": store.get("logoUrl"),
            "registerDate": store["registerDate"],
            "status": store["status"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
# ===== Store QR Upload Endpoint =====
class StoreQRUpdate(BaseModel):
    qrUrl: str

@app.get("/stores/{store_id}/products", response_model=list[ProductResponse])
async def get_store_products(
    store_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all products from a specific store (public)"""
    try:
        # Verify store exists and is active
        store = await db.Store.find_one({
            "_id": ObjectId(store_id),
            "status": "ACTIVE"
        })
        
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        # Get all active products from this store
        products = await db.Product.find({
            "storeId": ObjectId(store_id),
            "status": "ACTIVE"
        }).sort("createdAt", -1).to_list(None)
        
        return [
            ProductResponse(
                id=str(product["_id"]),
                storeId=str(product["storeId"]),
                name=product["name"],
                description=product["description"],
                price=product["price"],
                quantity=product["quantity"],
                image_url=product.get("image_url"),
                category=product.get("category"),
                createdAt=product["createdAt"],
                updatedAt=product["updatedAt"],
                status=product["status"]
            )
            for product in products
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store products: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/stores/{store_id}/qr")
async def get_store_qr(store_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
    """Return QR URL for a store (public)"""
    try:
        store = await db.Store.find_one({"_id": ObjectId(store_id)})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        return {"qrUrl": store.get("qrUrl")}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store QR: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/stores/{store_id}/qr")
async def update_store_qr(store_id: str, data: StoreQRUpdate, db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    """Update QR URL for a store (owner only)"""
    # Find store by ID and owner
    store = await db.Store.find_one({"_id": ObjectId(store_id), "ownerId": current_user["_id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found or permission denied")
    # Update QR URL
    result = await db.Store.update_one({"_id": ObjectId(store_id)}, {"$set": {"qrUrl": data.qrUrl}})
    if result.modified_count == 1:
        return {"message": "QR URL updated"}
    raise HTTPException(status_code=500, detail="Failed to update QR URL")


class StoreLogoUpdate(BaseModel):
    logoUrl: str


@app.put("/stores/{store_id}/logo")
async def update_store_logo(store_id: str, data: StoreLogoUpdate, db: AsyncIOMotorDatabase = Depends(get_db), current_user=Depends(get_current_user)):
    """Update logo URL for a store (owner only)"""
    # Find store by ID and owner
    store = await db.Store.find_one({"_id": ObjectId(store_id), "ownerId": current_user["_id"]})
    if not store:
        raise HTTPException(status_code=404, detail="Store not found or permission denied")
    # Update logo URL
    result = await db.Store.update_one({"_id": ObjectId(store_id)}, {"$set": {"logoUrl": data.logoUrl}})
    if result.modified_count == 1:
        return {"message": "Logo URL updated"}
    raise HTTPException(status_code=500, detail="Failed to update logo URL")


# ===== Report Models =====
class ReportCreate(BaseModel):
    targetStoreId: str
    reportType: str
    description: Optional[str] = None


class ReportStatusUpdate(BaseModel):
    status: str


class ReportResponse(BaseModel):
    id: str
    userId: str
    targetStoreId: Optional[str] = None
    storeName: Optional[str] = None
    reportType: str
    description: Optional[str] = None
    submittedAt: datetime
    status: str


# ===== Report Endpoints =====
@app.post("/reports", response_model=ReportResponse)
async def create_report(
    report_data: ReportCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new report for a store"""
    try:
        # Verify store exists
        store = await db.Store.find_one({"_id": ObjectId(report_data.targetStoreId)})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        # Create report
        report_doc = {
            "userId": current_user["_id"],
            "targetStoreId": ObjectId(report_data.targetStoreId),
            "reportType": report_data.reportType,
            "description": report_data.description,
            "submittedAt": datetime.utcnow(),
            "status": "OPEN"
        }
        
        result = await db.Report.insert_one(report_doc)
        report_doc["_id"] = result.inserted_id
        
        return ReportResponse(
            id=str(report_doc["_id"]),
            userId=str(report_doc["userId"]),
            targetStoreId=str(report_doc["targetStoreId"]),
            storeName=store["storeName"],
            reportType=report_doc["reportType"],
            description=report_doc["description"],
            submittedAt=report_doc["submittedAt"],
            status=report_doc["status"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/reports/my", response_model=list[ReportResponse])
async def get_my_reports(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all reports submitted by current user"""
    try:
        # Get reports with store information
        pipeline = [
            {"$match": {"userId": current_user["_id"]}},
            {
                "$lookup": {
                    "from": "Store",
                    "localField": "targetStoreId",
                    "foreignField": "_id",
                    "as": "store"
                }
            },
            {"$unwind": {"path": "$store", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 1,
                    "userId": 1,
                    "targetStoreId": 1,
                    "storeName": "$store.storeName",
                    "reportType": 1,
                    "description": 1,
                    "submittedAt": 1,
                    "status": 1
                }
            },
            {"$sort": {"submittedAt": -1}}
        ]
        
        reports = await db.Report.aggregate(pipeline).to_list(None)
        
        return [
            ReportResponse(
                id=str(report["_id"]),
                userId=str(report["userId"]),
                targetStoreId=str(report["targetStoreId"]) if report.get("targetStoreId") else None,
                storeName=report.get("storeName"),
                reportType=report["reportType"],
                description=report.get("description"),
                submittedAt=report["submittedAt"],
                status=report["status"]
            )
            for report in reports
        ]
        
    except Exception as e:
        logger.error(f"Error getting user reports: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/reports", response_model=list[ReportResponse])
async def get_all_reports(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all reports (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all reports with store and user information
        pipeline = [
            {
                "$lookup": {
                    "from": "Store",
                    "localField": "targetStoreId",
                    "foreignField": "_id",
                    "as": "store"
                }
            },
            {"$unwind": {"path": "$store", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 1,
                    "userId": 1,
                    "targetStoreId": 1,
                    "storeName": "$store.storeName",
                    "reportType": 1,
                    "description": 1,
                    "submittedAt": 1,
                    "status": 1
                }
            },
            {"$sort": {"submittedAt": -1}}
        ]
        
        reports = await db.Report.aggregate(pipeline).to_list(None)
        
        return [
            ReportResponse(
                id=str(report["_id"]),
                userId=str(report["userId"]),
                targetStoreId=str(report["targetStoreId"]) if report.get("targetStoreId") else None,
                storeName=report.get("storeName"),
                reportType=report["reportType"],
                description=report.get("description"),
                submittedAt=report["submittedAt"],
                status=report["status"]
            )
            for report in reports
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all reports: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/reports/{report_id}/status", response_model=ReportResponse)
async def update_report_status(
    report_id: str,
    status_update: ReportStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update report status (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate status
        allowed_statuses = ["OPEN", "REVIEWING", "RESOLVED", "REJECTED"]
        new_status = status_update.status.upper()
        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {allowed_statuses}"
            )
        
        # Find report
        report = await db.Report.find_one({"_id": ObjectId(report_id)})
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        # Update status
        await db.Report.update_one(
            {"_id": ObjectId(report_id)},
            {"$set": {"status": new_status}}
        )
        
        # Get updated report with store information
        pipeline = [
            {"$match": {"_id": ObjectId(report_id)}},
            {
                "$lookup": {
                    "from": "Store",
                    "localField": "targetStoreId",
                    "foreignField": "_id",
                    "as": "store"
                }
            },
            {"$unwind": {"path": "$store", "preserveNullAndEmptyArrays": True}},
            {
                "$project": {
                    "_id": 1,
                    "userId": 1,
                    "targetStoreId": 1,
                    "storeName": "$store.storeName",
                    "reportType": 1,
                    "description": 1,
                    "submittedAt": 1,
                    "status": 1
                }
            }
        ]
        
        updated_reports = await db.Report.aggregate(pipeline).to_list(1)
        if not updated_reports:
            raise HTTPException(status_code=404, detail="Report not found after update")
        
        updated_report = updated_reports[0]
        
        return ReportResponse(
            id=str(updated_report["_id"]),
            userId=str(updated_report["userId"]),
            targetStoreId=str(updated_report["targetStoreId"]) if updated_report.get("targetStoreId") else None,
            storeName=updated_report.get("storeName"),
            reportType=updated_report["reportType"],
            description=updated_report.get("description"),
            submittedAt=updated_report["submittedAt"],
            status=updated_report["status"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating report status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Admin Models =====
class UserListResponse(BaseModel):
    id: str
    username: str
    email: str
    phone: Optional[str] = None
    role: str
    registerDate: datetime
    storeCount: int = 0
    storeStatus: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    statusReason: Optional[str] = None


class StoreListResponse(BaseModel):
    id: str
    ownerId: str
    ownerUsername: str
    storeName: str
    storeDescription: Optional[str] = None
    buMail: Optional[str] = None
    registerDate: datetime
    status: str
    statusReason: Optional[str] = None


class StoreStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


# ===== Admin Endpoints =====
@app.get("/admin/users", response_model=list[UserListResponse])
async def get_all_users(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all users with their store information
        pipeline = [
            {
                "$lookup": {
                    "from": "Store",
                    "localField": "_id",
                    "foreignField": "ownerId",
                    "as": "stores"
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "username": 1,
                    "email": 1,
                    "phone": 1,
                    "role": 1,
                    "registerDate": 1,
                    "status": 1,
                    "statusReason": 1,
                    "storeCount": {"$size": "$stores"},
                    "storeStatus": {"$arrayElemAt": ["$stores.status", 0]}
                }
            },
            {"$sort": {"registerDate": -1}}
        ]
        
        users = await db.User.aggregate(pipeline).to_list(None)
        
        return [
            UserListResponse(
                id=str(user["_id"]),
                username=user["username"],
                email=user["email"],
                phone=user.get("phone"),
                role=user["role"],
                registerDate=user["registerDate"],
                storeCount=user.get("storeCount", 0),
                storeStatus=user.get("storeStatus"),
                status=user.get("status", "ACTIVE"),
                statusReason=user.get("statusReason")
            )
            for user in users
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all users: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.get("/admin/stores", response_model=list[StoreListResponse])
async def get_all_stores(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all stores (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Get all stores with owner information
        pipeline = [
            {
                "$lookup": {
                    "from": "User",
                    "localField": "ownerId",
                    "foreignField": "_id",
                    "as": "owner"
                }
            },
            {"$unwind": "$owner"},
            {
                "$project": {
                    "_id": 1,
                    "ownerId": 1,
                    "ownerUsername": "$owner.username",
                    "storeName": 1,
                    "storeDescription": 1,
                    "buMail": 1,
                    "registerDate": 1,
                    "status": 1,
                    "statusReason": 1
                }
            },
            {"$sort": {"registerDate": -1}}
        ]
        
        stores = await db.Store.aggregate(pipeline).to_list(None)
        
        return [
            StoreListResponse(
                id=str(store["_id"]),
                ownerId=str(store["ownerId"]),
                ownerUsername=store["ownerUsername"],
                storeName=store["storeName"],
                storeDescription=store.get("storeDescription"),
                buMail=store.get("buMail"),
                registerDate=store["registerDate"],
                status=store["status"],
                statusReason=store.get("statusReason")
            )
            for store in stores
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all stores: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@app.put("/admin/stores/{store_id}/status")
async def update_store_status(
    store_id: str,
    status_update: StoreStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update store status (admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate status
        allowed_statuses = ["ACTIVE", "INACTIVE", "BLOCKED"]
        new_status = status_update.status.upper()
        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {allowed_statuses}"
            )
        
        status_reason = status_update.reason.strip() if status_update.reason else None
        if new_status in ["INACTIVE", "BLOCKED"] and not status_reason:
            raise HTTPException(status_code=400, detail="Reason is required for this status")
        if new_status == "ACTIVE":
            status_reason = None
        
        # Find store
        store = await db.Store.find_one({"_id": ObjectId(store_id)})
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        # Update status
        await db.Store.update_one(
            {"_id": ObjectId(store_id)},
            {
                "$set": {
                    "status": new_status,
                    "statusReason": status_reason,
                    "statusUpdatedAt": datetime.utcnow()
                }
            }
        )
        
        # Create admin action log
        try:
            await db.AdminAction.insert_one({
                "adminId": current_user["_id"],
                "actionType": "UPDATE_STORE_STATUS",
                "targetStoreId": ObjectId(store_id),
                "timestamp": datetime.utcnow(),
                "description": f"Changed store status to {new_status}"
            })
        except Exception:
            pass  # Don't fail if logging fails
        
        # Notify store owner
        try:
            await create_notification(
                db=db,
                user_id=store["ownerId"],
                notification_type="store",
                title="สถานะร้านค้าถูกเปลี่ยน",
                message=f"ร้าน {store['storeName']} ถูกตั้งสถานะเป็น {new_status}",
                data={
                    "storeId": store_id,
                    "status": new_status,
                    "reason": status_reason
                }
            )
        except Exception as notify_err:
            logger.warning(f"Failed to notify store owner: {notify_err}")
        
        return {
            "message": "Store status updated",
            "status": new_status,
            "reason": status_reason
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating store status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


class UserStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


@app.put("/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update user status (admin only) - Ban/Unban user"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Validate status
        allowed_statuses = ["ACTIVE", "BANNED"]
        new_status = status_update.status.upper()
        if new_status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status. Allowed: {allowed_statuses}"
            )
        
        ban_reason = status_update.reason.strip() if status_update.reason else None
        if new_status == "BANNED" and not ban_reason:
            raise HTTPException(status_code=400, detail="Ban reason is required")
        if new_status != "BANNED":
            ban_reason = None
        
        # Find user
        user = await db.User.find_one({"_id": ObjectId(user_id)})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent admin from banning themselves
        if str(user["_id"]) == str(current_user["_id"]):
            raise HTTPException(status_code=400, detail="Cannot ban yourself")
        
        # Prevent banning other admins
        if user.get("role") == "ADMIN":
            raise HTTPException(status_code=400, detail="Cannot ban other admins")
        
        # Update status
        await db.User.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "status": new_status,
                    "statusReason": ban_reason,
                    "updatedAt": datetime.utcnow()
                }
            }
        )
        
        # Create admin action log
        try:
            await db.AdminAction.insert_one({
                "adminId": current_user["_id"],
                "actionType": "UPDATE_USER_STATUS",
                "targetUserId": ObjectId(user_id),
                "timestamp": datetime.utcnow(),
                "description": f"Changed user status to {new_status}" + (f" (Reason: {ban_reason})" if ban_reason else "")
            })
        except Exception:
            pass
        
        return {"message": "User status updated", "status": new_status}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

# Update User Info by Admin
class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

@app.put("/admin/users/{user_id}")
async def update_user_info(
    user_id: str,
    user_update: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    try:
        # Verify admin role
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        admin_id = str(current_user["_id"])
        
        # Find target user
        target_user = await db.User.find_one({"_id": ObjectId(user_id)})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent changing admin's own role
        if admin_id == user_id and user_update.role and user_update.role != target_user.get("role"):
            raise HTTPException(status_code=400, detail="Cannot change your own role")
        
        # Validate role if provided
        if user_update.role and user_update.role not in ["CUSTOMER", "SELLER", "ADMIN"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        
        # Check username uniqueness if changed
        if user_update.username and user_update.username != target_user.get("username"):
            existing = await db.User.find_one({"username": user_update.username})
            if existing:
                raise HTTPException(status_code=400, detail="Username already exists")
        
        # Check email uniqueness if changed
        if user_update.email and user_update.email != target_user.get("email"):
            existing = await db.User.find_one({"email": user_update.email})
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
        
        # Build update document
        update_doc = {}
        if user_update.username:
            update_doc["username"] = user_update.username
        if user_update.email:
            update_doc["email"] = user_update.email
        if user_update.phone:
            update_doc["phone"] = user_update.phone
        if user_update.role:
            update_doc["role"] = user_update.role
        
        if not update_doc:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Update user
        await db.User.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_doc}
        )
        
        # Log admin action
        await db.AdminAction.insert_one({
            "adminId": admin_id,
            "action": "UPDATE_USER",
            "targetUserId": user_id,
            "changes": update_doc,
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "User updated successfully", "updated": update_doc}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== BANNER MANAGEMENT =====
class BannerCreate(BaseModel):
    title: str
    subtitle: str
    image_url: str
    order: int = 0
    is_active: bool = True

class BannerUpdate(BaseModel):
    title: Optional[str] = None
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None

class BannerResponse(BaseModel):
    id: str
    title: str
    subtitle: str
    image_url: str
    order: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

@app.get("/banners", response_model=list[BannerResponse])
async def get_banners(
    active_only: bool = True,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all banners (public endpoint)"""
    try:
        query = {"is_active": True} if active_only else {}
        banners = await db.Banner.find(query).sort("order", 1).to_list(None)
        
        return [
            BannerResponse(
                id=str(banner["_id"]),
                title=banner["title"],
                subtitle=banner["subtitle"],
                image_url=banner["image_url"],
                order=banner.get("order", 0),
                is_active=banner.get("is_active", True),
                created_at=banner.get("created_at", datetime.utcnow()),
                updated_at=banner.get("updated_at", datetime.utcnow())
            )
            for banner in banners
        ]
    except Exception as e:
        logger.error(f"Error getting banners: {e}")
        return []

@app.post("/admin/banners", response_model=BannerResponse)
async def create_banner(
    banner_data: BannerCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a new banner (Admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        banner_doc = {
            "title": banner_data.title,
            "subtitle": banner_data.subtitle,
            "image_url": banner_data.image_url,
            "order": banner_data.order,
            "is_active": banner_data.is_active,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await db.Banner.insert_one(banner_doc)
        banner_doc["_id"] = result.inserted_id
        
        # Log admin action
        await db.AdminAction.insert_one({
            "adminId": current_user["_id"],
            "action": "CREATE_BANNER",
            "targetId": str(result.inserted_id),
            "timestamp": datetime.utcnow()
        })
        
        return BannerResponse(
            id=str(banner_doc["_id"]),
            title=banner_doc["title"],
            subtitle=banner_doc["subtitle"],
            image_url=banner_doc["image_url"],
            order=banner_doc["order"],
            is_active=banner_doc["is_active"],
            created_at=banner_doc["created_at"],
            updated_at=banner_doc["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating banner: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.put("/admin/banners/{banner_id}", response_model=BannerResponse)
async def update_banner(
    banner_id: str,
    banner_data: BannerUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update a banner (Admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find banner
        banner = await db.Banner.find_one({"_id": ObjectId(banner_id)})
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        # Build update document
        update_doc = {"updated_at": datetime.utcnow()}
        if banner_data.title is not None:
            update_doc["title"] = banner_data.title
        if banner_data.subtitle is not None:
            update_doc["subtitle"] = banner_data.subtitle
        if banner_data.image_url is not None:
            update_doc["image_url"] = banner_data.image_url
        if banner_data.order is not None:
            update_doc["order"] = banner_data.order
        if banner_data.is_active is not None:
            update_doc["is_active"] = banner_data.is_active
        
        # Update banner
        await db.Banner.update_one(
            {"_id": ObjectId(banner_id)},
            {"$set": update_doc}
        )
        
        # Get updated banner
        updated_banner = await db.Banner.find_one({"_id": ObjectId(banner_id)})
        
        # Log admin action
        await db.AdminAction.insert_one({
            "adminId": current_user["_id"],
            "action": "UPDATE_BANNER",
            "targetId": banner_id,
            "changes": update_doc,
            "timestamp": datetime.utcnow()
        })
        
        return BannerResponse(
            id=str(updated_banner["_id"]),
            title=updated_banner["title"],
            subtitle=updated_banner["subtitle"],
            image_url=updated_banner["image_url"],
            order=updated_banner["order"],
            is_active=updated_banner["is_active"],
            created_at=updated_banner.get("created_at", datetime.utcnow()),
            updated_at=updated_banner["updated_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating banner: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/admin/banners/{banner_id}")
async def delete_banner(
    banner_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete a banner (Admin only)"""
    try:
        # Check if user is admin
        if current_user.get("role") != "ADMIN":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Find banner
        banner = await db.Banner.find_one({"_id": ObjectId(banner_id)})
        if not banner:
            raise HTTPException(status_code=404, detail="Banner not found")
        
        # Delete banner
        await db.Banner.delete_one({"_id": ObjectId(banner_id)})
        
        # Log admin action
        await db.AdminAction.insert_one({
            "adminId": current_user["_id"],
            "action": "DELETE_BANNER",
            "targetId": banner_id,
            "timestamp": datetime.utcnow()
        })
        
        return {"message": "Banner deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting banner: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


# ===== Order Payment Slip Upload =====
@app.post("/orders/upload-slip")
async def upload_payment_slip(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Upload payment slip to Cloudinary and return URL
    Frontend will then save this URL to the order/order item
    """
    try:
        # Validate file
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file
        file_content = await file.read()
        if len(file_content) > 5 * 1024 * 1024:  # 5MB limit
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")
        
        # Upload to Cloudinary
        cloudinary_config = {
            'cloud_name': os.getenv('CLOUDINARY_CLOUD_NAME'),
            'api_key': os.getenv('CLOUDINARY_API_KEY'),
            'api_secret': os.getenv('CLOUDINARY_API_SECRET'),
        }
        
        if not all(cloudinary_config.values()):
            logger.error("Cloudinary credentials not configured")
            raise HTTPException(status_code=500, detail="Upload service not configured")
        
        cloudinary.config(**cloudinary_config)
        
        # Upload with folder structure
        upload_result = cloudinary.uploader.upload(
            file_content,
            folder="walk4you/payment-slips",
            resource_type="auto",
            public_id=f"slip_{current_user['_id']}_{int(datetime.utcnow().timestamp())}",
            overwrite=True
        )
        
        slip_url = upload_result.get('secure_url')
        if not slip_url:
            raise HTTPException(status_code=500, detail="Upload to Cloudinary failed")
        
        logger.info(f"Payment slip uploaded for user {current_user['_id']}: {slip_url}")
        
        return {
            "url": slip_url,
            "message": "Payment slip uploaded successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading payment slip: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")