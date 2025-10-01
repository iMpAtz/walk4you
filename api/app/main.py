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
        "buMail": store_data.buMail,  # Use buMail from form data
        "registerDate": datetime.utcnow(),
        "status": "ACTIVE"
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
        registerDate=store_doc["registerDate"],
        status=store_doc["status"]
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
    registerDate: datetime
    status: str


# ===== Product Models =====
class ProductCreate(BaseModel):
    name: str
    description: str
    price: float
    quantity: int
    image_url: Optional[str] = None
    category: Optional[str] = None


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    image_url: Optional[str] = None
    category: Optional[str] = None


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
        registerDate=store["registerDate"],
        status=store["status"]
    )


@app.put("/stores/my-store", response_model=StoreResponse)
async def update_my_store(
    store_data: StoreUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update current user's store"""
    user_id = current_user["id"]
    
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
            "status": "ACTIVE"
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
        registerDate=store_doc["registerDate"],
        status=store_doc["status"]
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
        "status": "ACTIVE"
    }
    
    result = await db.stores.insert_one(store_doc)
    store_doc["_id"] = result.inserted_id
    
    return StoreResponse(
        id=str(store_doc["_id"]),
        storeName=store_doc["storeName"],
        storeDescription=store_doc.get("storeDescription"),
        buMail=store_doc.get("buMail"),
        registerDate=store_doc["registerDate"],
        status=store_doc["status"]
    )


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
    
    # Create new product
    product_doc = {
        "storeId": store["_id"],
        "name": product_data.name,
        "description": product_data.description,
        "price": product_data.price,
        "quantity": product_data.quantity,
        "image_url": product_data.image_url,
        "category": product_data.category,
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
    createdAt: datetime
    updatedAt: datetime


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
                "total": item_total
            })
        
        # Get store ID from first product
        first_product = await db.Product.find_one({"_id": ObjectId(order_data.items[0].productId)})
        store_id = first_product["storeId"]
        
        # Create order
        order_doc = {
            "userId": current_user["_id"],
            "storeId": store_id,
            "items": validated_items,
            "totalAmount": total_amount,
            "status": "PENDING",
            "shippingAddress": order_data.shippingAddress,
            "phoneNumber": order_data.phoneNumber,
            "notes": order_data.notes,
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
            createdAt=order_doc["createdAt"],
            updatedAt=order_doc["updatedAt"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating order: {e}")
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
                cart_items.append(CartItemResponse(
                    id=str(item["_id"]),
                    productId=str(item["productId"]),
                    productName=product["name"],
                    productPrice=product["price"],
                    productImage=product.get("image_url"),
                    quantity=item["quantity"],
                    totalPrice=product["price"] * item["quantity"],
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
        return CartItemResponse(
            id=str(target_item["_id"]),
            productId=str(target_item["productId"]),
            productName=product["name"],
            productPrice=product["price"],
            productImage=product.get("image_url"),
            quantity=target_item["quantity"],
            totalPrice=product["price"] * target_item["quantity"],
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
        
        return CartItemResponse(
            id=str(item_found["_id"]),
            productId=str(item_found["productId"]),
            productName=product["name"],
            productPrice=product["price"],
            productImage=product.get("image_url"),
            quantity=item_found["quantity"],
            totalPrice=product["price"] * item_found["quantity"],
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
        store = await db.Store.find_one({
            "_id": ObjectId(store_id),
            "status": "ACTIVE"
        })
        
        if not store:
            raise HTTPException(status_code=404, detail="Store not found")
        
        return {
            "id": str(store["_id"]),
            "storeName": store["storeName"],
            "storeDescription": store.get("storeDescription"),
            "phoneNumber": store.get("phoneNumber"),
            "buMail": store.get("buMail"),
            "registerDate": store["registerDate"],
            "status": store["status"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting store: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
