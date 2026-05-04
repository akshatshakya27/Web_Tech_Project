from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# 🔥 FORCE load .env from root directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_PATH = os.path.join(BASE_DIR, ".env")

load_dotenv(dotenv_path=ENV_PATH)

SECRET_KEY = os.getenv("JWT_SECRET")

if not SECRET_KEY:
    raise ValueError("JWT_SECRET is not set in environment variables")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

 # Use PBKDF2-SHA256 to avoid external bcrypt backend issues in some environments.
 # PBKDF2-SHA256 is secure and available via passlib without external C extensions.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None