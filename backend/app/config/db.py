from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get MongoDB URI from .env
MONGO_URI = os.getenv("MONGO_URI")

# Create MongoDB client with timeout (important)
client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000  # fail fast if connection issue
)

# Test connection (for debugging)
try:
    client.server_info()
    print("✅ MongoDB connected successfully")
except Exception as e:
    print("❌ MongoDB connection failed:", e)

# Select database
db = client["ecotrack"]

# Collections
users_collection = db["users"]
emissions_collection = db["emissions"]