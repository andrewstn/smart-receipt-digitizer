from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Creates a local file named 'receipts.db' in your backend folder
SQLALCHEMY_DATABASE_URL = "sqlite:///./receipts.db"

# Setting check_same_thread=False is required for SQLite in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()