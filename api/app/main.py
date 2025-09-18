from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pydantic import BaseModel
import os
from dotenv import load_dotenv


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

