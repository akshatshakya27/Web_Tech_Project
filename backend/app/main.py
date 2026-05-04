from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.db import db
from app.routes import auth, test, emission

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(test.router)
app.include_router(emission.router)


@app.get("/")
def root():
    return {"message": "EcoTrack FastAPI Backend Running"}


@app.get("/test-db")
def test_db():
    return {"collections": db.list_collection_names()}