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
    """Get featured products (random selection from active products) - No authentication required"""
    try:
        # Get random active products
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
            {"$match": {"store.status": "ACTIVE"}}
        ]
        
        products = await db.Product.aggregate(pipeline).to_list(None)
        
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
        print(f"Error getting featured products: {e}")
        return []


@app.get("/products/search", response_model=list[ProductResponse])
async def search_products(
    q: str,
    limit: int = 20,
    fuzzy: bool = True,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Search products by name or description with fuzzy matching - No authentication required"""
    try:
        # Clean and prepare search query
        search_terms = q.strip().split()
        
        if fuzzy:
            # Create fuzzy search query using multiple strategies
            search_conditions = []
            
            # 1. Exact matches (highest priority)
            exact_query = {
                "$and": [
                    {"status": "ACTIVE"},
                    {
                        "$or": [
                            {"name": {"$regex": q, "$options": "i"}},
                            {"description": {"$regex": q, "$options": "i"}},
                            {"category": {"$regex": q, "$options": "i"}}
                        ]
                    }
                ]
            }
            
            # 2. Individual word matches
            word_matches = []
            for term in search_terms:
                if len(term) > 2:  # Only search for terms longer than 2 characters
                    word_matches.extend([
                        {"name": {"$regex": term, "$options": "i"}},
                        {"description": {"$regex": term, "$options": "i"}},
                        {"category": {"$regex": term, "$options": "i"}}
                    ])
            
            # 3. Partial word matches (for typos and similar words)
            partial_matches = []
            for term in search_terms:
                if len(term) > 3:  # Only for longer terms
                    # Create regex patterns for common typos and variations
                    patterns = [
                        term,  # Original term
                        term[:-1] if len(term) > 3 else term,  # Missing last character
                        term + ".*",  # Starts with term
                        ".*" + term,  # Ends with term
                    ]
                    
                    for pattern in patterns:
                        partial_matches.extend([
                            {"name": {"$regex": pattern, "$options": "i"}},
                            {"description": {"$regex": pattern, "$options": "i"}},
                            {"category": {"$regex": pattern, "$options": "i"}}
                        ])
            
            # Combine all search conditions
            all_conditions = []
            if word_matches:
                all_conditions.append({"$or": word_matches})
            if partial_matches:
                all_conditions.append({"$or": partial_matches})
            
            if all_conditions:
                search_query = {
                    "$and": [
                        {"status": "ACTIVE"},
                        {"$or": all_conditions}
                    ]
                }
            else:
                search_query = exact_query
        else:
            # Original exact search
            search_query = {
                "$and": [
                    {"status": "ACTIVE"},
                    {
                        "$or": [
                            {"name": {"$regex": q, "$options": "i"}},
                            {"description": {"$regex": q, "$options": "i"}},
                            {"category": {"$regex": q, "$options": "i"}}
                        ]
                    }
                ]
            }
        
        # Get products with store information and add scoring
        pipeline = [
            {"$match": search_query},
            {"$lookup": {
                "from": "Store",
                "localField": "storeId",
                "foreignField": "_id",
                "as": "store"
            }},
            {"$unwind": "$store"},
            {"$match": {"store.status": "ACTIVE"}},
            {"$addFields": {
                "score": {
                    "$add": [
                        # Exact name match gets highest score
                        {"$cond": [
                            {"$regexMatch": {"input": "$name", "regex": q, "options": "i"}},
                            10, 0
                        ]},
                        # Exact description match
                        {"$cond": [
                            {"$regexMatch": {"input": "$description", "regex": q, "options": "i"}},
                            5, 0
                        ]},
                        # Exact category match
                        {"$cond": [
                            {"$regexMatch": {"input": "$category", "regex": q, "options": "i"}},
                            3, 0
                        ]},
                        # Word matches in name
                        {"$cond": [
                            {"$gt": [{"$size": {"$filter": {
                                "input": search_terms,
                                "cond": {"$regexMatch": {"input": "$name", "regex": "$$this", "options": "i"}}
                            }}}, 0]},
                            2, 0
                        ]},
                        # Word matches in description
                        {"$cond": [
                            {"$gt": [{"$size": {"$filter": {
                                "input": search_terms,
                                "cond": {"$regexMatch": {"input": "$description", "regex": "$$this", "options": "i"}}
                            }}}, 0]},
                            1, 0
                        ]}
                    ]
                }
            }},
            {"$sort": {"score": -1, "createdAt": -1}},  # Sort by score, then by newest
            {"$limit": limit}
        ]
        
        products = await db.Product.aggregate(pipeline).to_list(None)
        
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
        print(f"Error searching products: {e}")
        return []


@app.get("/products/search/suggestions")
async def get_search_suggestions(
    q: str,
    limit: int = 5,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get search suggestions based on product names and categories - No authentication required"""
    try:
        if len(q.strip()) < 2:
            return []
        
        # Get suggestions from product names and categories
        pipeline = [
            {"$match": {
                "status": "ACTIVE",
                "$or": [
                    {"name": {"$regex": q, "$options": "i"}},
                    {"category": {"$regex": q, "$options": "i"}}
                ]
            }},
            {"$lookup": {
                "from": "Store",
                "localField": "storeId",
                "foreignField": "_id",
                "as": "store"
            }},
            {"$unwind": "$store"},
            {"$match": {"store.status": "ACTIVE"}},
            {"$group": {
                "_id": "$name",
                "count": {"$sum": 1},
                "category": {"$first": "$category"}
            }},
            {"$sort": {"count": -1}},
            {"$limit": limit}
        ]
        
        name_suggestions = await db.Product.aggregate(pipeline).to_list(None)
        
        # Get category suggestions
        category_pipeline = [
            {"$match": {
                "status": "ACTIVE",
                "category": {"$regex": q, "$options": "i"}
            }},
            {"$lookup": {
                "from": "Store",
                "localField": "storeId",
                "foreignField": "_id",
                "as": "store"
            }},
            {"$unwind": "$store"},
            {"$match": {"store.status": "ACTIVE"}},
            {"$group": {
                "_id": "$category",
                "count": {"$sum": 1}
            }},
            {"$sort": {"count": -1}},
            {"$limit": 3}
        ]
        
        category_suggestions = await db.Product.aggregate(category_pipeline).to_list(None)
        
        # Combine suggestions
        suggestions = []
        
        # Add name suggestions
        for suggestion in name_suggestions:
            suggestions.append({
                "text": suggestion["_id"],
                "type": "product",
                "count": suggestion["count"]
            })
        
        # Add category suggestions
        for suggestion in category_suggestions:
            suggestions.append({
                "text": suggestion["_id"],
                "type": "category", 
                "count": suggestion["count"]
            })
        
        return suggestions[:limit]
        
    except Exception as e:
        print(f"Error getting search suggestions: {e}")
        return []


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
async def get_product(
    product_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a specific product by ID"""
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

