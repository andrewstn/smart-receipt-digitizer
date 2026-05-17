import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

# Ensure the directory exists before SQLAlchemy tries to write to it
os.makedirs("./data", exist_ok=True)

# Point the engine to the Docker-protected volume
SQLALCHEMY_DATABASE_URL = "sqlite:///./data/receipts.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()