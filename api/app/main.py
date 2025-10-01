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
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

# CORS
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
                "price": 1, "quantity": 1, "image_url": 1, "category": 1,
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
            "role": "CUSTOMER",
            "registerDate": datetime.utcnow()
        }
        
        result = await db.User.insert_one(user_doc)
        
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
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@app.post("/auth/login", response_model=AuthResponse)
async def login(login_data: UserLogin, db: AsyncIOMotorDatabase = Depends(get_db)):
    try:
        # Query using indexed field
        user = await db.User.find_one({"username": login_data.username})
        
        if not user or not verify_password(login_data.password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password"
            )
        
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
                registerDate=user["registerDate"],
                avatar=user.get("avatar")
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


@app.get("/users/me", response_model=UserResponse)
async def get_my_profile(current_user=Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        registerDate=current_user["registerDate"],
        avatar=current_user.get("avatar")
    )


# Add remaining endpoints following the same optimization patterns:
# - Use indexed fields in queries
# - Add projections to limit returned fields
# - Use .to_list(limit) instead of .to_list(None)
# - Add try-except with logging
# - Simplify aggregation pipelines