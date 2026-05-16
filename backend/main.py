from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
import io
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv
from PIL import Image

# AI Imports
from google import genai
from google.genai import types
from pydantic import BaseModel, field_validator
from typing import List, Optional
import json

# Database Imports
import models
from database import engine, SessionLocal
from sqlalchemy import Column, Integer, String, Float, ForeignKey, or_, func

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

# Setup AI
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in .env file!")

client = genai.Client(api_key=api_key)

# Setup Database
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

#JWT Authentication Setup
SECRET_KEY = "my_super_secret_portfolio_key" # Just for demo purposes
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    """Protects routes from unauthenticated requests."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
        return username
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

# Pydantic Schemas
class ReceiptItemSchema(BaseModel):
    name: str
    price: float

    class Config:
        from_attributes = True

class ReceiptSchema(BaseModel):
    store_name: str
    date: Optional[str] = None
    items: List[ReceiptItemSchema]
    subtotal: float
    tax_amount: float
    discount_amount: Optional[float] = 0.0
    total_amount: float

    @field_validator('store_name', mode='before')
    @classmethod
    def clean_store_name(cls, value: str) -> str:
        if not value:
            return "Unknown Store"
            
        clean_name = value.split('-')[0]
        clean_name = clean_name.split('#')[0]
        return clean_name.strip().title()

    @field_validator('date', mode='before')
    @classmethod
    def clean_date(cls, value: str) -> Optional[str]:
        if not value or value.strip() == "":
            return None
            
        value = value.strip()
        if "/" in value:
            value = value.replace("/", "-")
            
        parts = value.split("-")
        
        if len(parts) == 3:
            try:
                if len(parts[0]) == 4:
                    year, month, day = parts
                else:
                    month, day, year = parts
                    
                if len(year) == 2:
                    year = f"20{year}"
                    
                return f"{month.zfill(2)}-{day.zfill(2)}-{year}"
            except Exception:
                pass
                
        return value

class ReceiptResponse(ReceiptSchema):
    id: int

    class Config:
        from_attributes = True

# FastAPI App Initialization
app = FastAPI(title="Smart Receipt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Login endpoint
@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    # Hardcoded demo user for our portfolio piece
    if form_data.username != "demo" or form_data.password != "password":
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": form_data.username})
    return {"access_token": access_token, "token_type": "bearer"}


# GET all receipts (Protected)
@app.get("/api/receipts", response_model=List[ReceiptResponse])
def get_all_receipts(
    search: Optional[str] = None, 
    skip: int = 0,     
    limit: int = 10,   
    db: Session = Depends(get_db),
    user: str = Depends(get_current_user) # <-- Protected
):
    """Fetches receipts with search filtering and pagination."""
    query = db.query(models.ReceiptDB)
    
    if search:
        search_term = f"%{search}%"
        query = query.join(models.ItemDB).filter(
            or_(
                models.ReceiptDB.store_name.ilike(search_term),
                models.ReceiptDB.date.ilike(search_term),
                models.ItemDB.name.ilike(search_term)
            )
        ).distinct()
    
    return query.order_by(models.ReceiptDB.id.desc()).offset(skip).limit(limit).all()


# Analytics endpoint (Protected)
@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    """Calculates lifetime analytics directly in the SQLite engine for maximum performance."""
    
    total_spent = db.query(func.sum(models.ReceiptDB.total_amount)).scalar() or 0.0
    
    store_results = db.query(
        models.ReceiptDB.store_name, 
        func.sum(models.ReceiptDB.total_amount).label('amount')
    ).group_by(models.ReceiptDB.store_name).all()
    
    spend_by_store = [
        {"name": row[0] or "Unknown", "amount": float(row[1] or 0)} 
        for row in store_results
    ]
    spend_by_store.sort(key=lambda x: x["amount"], reverse=True) 
    
    date_results = db.query(
        models.ReceiptDB.date, 
        func.sum(models.ReceiptDB.total_amount).label('amount')
    ).group_by(models.ReceiptDB.date).all()
    
    spend_by_date = [
        {"name": row[0] or "Unknown", "amount": float(row[1] or 0)} 
        for row in date_results
    ]
    spend_by_date.sort(key=lambda x: x["name"]) 
    
    return {
        "totalSpent": float(total_spent),
        "spendByStore": spend_by_store,
        "spendByDate": spend_by_date
    }

# Extract receipt endpoint (Protected)
@app.post("/api/extract", response_model=ReceiptResponse)
async def extract_receipt(file: UploadFile = File(...), db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        prompt = "Extract the receipt data from this image." \
        "CRITICAL FORMATTING RULES: " \
        "1. Clean store names: Remove location identifiers, store numbers, or city names (e.g., convert 'Target - Location' or 'TARGET #1234' to simply 'Target'). Format in Title Case. " \
        "2. Clean dates: Always return the date in the exact format MM-DD-YYYY. If no date is found, return null. "
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[image, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ReceiptSchema,
            ),
        )
        
        receipt_data = json.loads(response.text)

        db_receipt = models.ReceiptDB(
            store_name=receipt_data["store_name"],
            date=receipt_data.get("date"),
            subtotal=receipt_data["subtotal"],
            tax_amount=receipt_data["tax_amount"],
            discount_amount=receipt_data.get("discount_amount", 0.0),
            total_amount=receipt_data["total_amount"]
        )
        db.add(db_receipt)
        db.commit()
        db.refresh(db_receipt)

        for item in receipt_data["items"]:
            db_item = models.ItemDB(
                receipt_id=db_receipt.id,
                name=item["name"],
                price=item["price"]
            )
            db.add(db_item)
        
        db.commit()
        db.refresh(db_receipt)

        return db_receipt

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
@app.put("/api/receipts/{receipt_id}", response_model=ReceiptResponse)
def update_receipt(receipt_id: int, updated_data: ReceiptSchema, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    """Updates an existing receipt and its items in the database."""
    db_receipt = db.query(models.ReceiptDB).filter(models.ReceiptDB.id == receipt_id).first()
    if not db_receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    db_receipt.store_name = updated_data.store_name
    db_receipt.date = updated_data.date
    db_receipt.subtotal = updated_data.subtotal
    db_receipt.tax_amount = updated_data.tax_amount
    db_receipt.discount_amount = updated_data.discount_amount
    db_receipt.total_amount = updated_data.total_amount

    db.query(models.ItemDB).filter(models.ItemDB.receipt_id == receipt_id).delete()
    
    for item in updated_data.items:
        db_item = models.ItemDB(receipt_id=receipt_id, name=item.name, price=item.price)
        db.add(db_item)

    db.commit()
    db.refresh(db_receipt)
    
    return db_receipt


@app.delete("/api/receipts/{receipt_id}")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db), user: str = Depends(get_current_user)):
    """Deletes a receipt and all its line items."""
    db_receipt = db.query(models.ReceiptDB).filter(models.ReceiptDB.id == receipt_id).first()
    
    if not db_receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    db.query(models.ItemDB).filter(models.ItemDB.receipt_id == receipt_id).delete()
    
    db.delete(db_receipt)
    db.commit()
    
    return {"message": "Receipt successfully deleted"}