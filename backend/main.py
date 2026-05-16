from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
import io
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
from sqlalchemy import or_

import ssl
ssl._create_default_https_context = ssl._create_unverified_context

# Setup AI
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise RuntimeError("GEMINI_API_KEY not found in .env file!")

client = genai.Client(api_key=api_key)

# Setup Database
# Creates the tables in receipts.db if they don't exist yet
models.Base.metadata.create_all(bind=engine)

# Dependency to get the DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Pydantic Schemas (For validating API Input/Output)
class ReceiptItemSchema(BaseModel):
    name: str
    price: float

    class Config:
        from_attributes = True # Allows reading from SQLAlchemy

class ReceiptSchema(BaseModel):
    store_name: str
    date: Optional[str] = None
    items: List[ReceiptItemSchema]
    subtotal: float
    tax_amount: float
    discount_amount: Optional[float] = 0.0
    total_amount: float

    # Validators to clean up AI output before saving to DB
    @field_validator('store_name', mode='before')
    @classmethod
    def clean_store_name(cls, value: str) -> str:
        if not value:
            return "Unknown Store"
            
        # 1. Split by dash and take the first part ("Target - Location" -> "Target ")
        clean_name = value.split('-')[0]
        # 2. Remove common store number formats like "#1234"
        clean_name = clean_name.split('#')[0]
        # 3. Strip trailing whitespace and convert to Title Case ("TARGET " -> "Target")
        return clean_name.strip().title()

    @field_validator('date', mode='before')
    @classmethod
    def clean_date(cls, value: str) -> Optional[str]:
        if not value or value.strip() == "":
            return None
            
        value = value.strip()
        
        # Unify the separators (turn slashes into dashes)
        if "/" in value:
            value = value.replace("/", "-")
            
        parts = value.split("-")
        
        if len(parts) == 3:
            try:
                # Check if the AI gave us YYYY first
                if len(parts[0]) == 4:
                    year, month, day = parts
                else:
                    # Otherwise, assume it gave us MM-DD-YYYY or MM-DD-YY
                    month, day, year = parts
                    
                # Fix 2-digit years (e.g., '26' becomes '2026')
                if len(year) == 2:
                    year = f"20{year}"
                    
                # Force the final output strictly to MM-DD-YYYY with zero-padding
                return f"{month.zfill(2)}-{day.zfill(2)}-{year}"
            except Exception:
                pass # If parsing fails, fall back to whatever the AI gave us
                
        return value

class ReceiptResponse(ReceiptSchema):
    id: int

    class Config:
        from_attributes = True

# FastAPI Setup
app = FastAPI(title="Smart Receipt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get all receipts with optional search
@app.get("/api/receipts", response_model=List[ReceiptResponse])
def get_all_receipts(search: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetches receipts, optionally filtering by store, date, or item name."""
    query = db.query(models.ReceiptDB)
    
    if search:
        search_term = f"%{search}%"
        # Join the Items table so we can search deep inside the receipt
        query = query.join(models.ItemDB).filter(
            or_(
                models.ReceiptDB.store_name.ilike(search_term),
                models.ReceiptDB.date.ilike(search_term),
                models.ItemDB.name.ilike(search_term)
            )
        ).distinct() # Use distinct so a receipt isn't returned twice if two items match
        
    return query.order_by(models.ReceiptDB.id.desc()).all()


# Analytics endpoint
@app.get("/api/analytics")
def get_analytics(db: Session = Depends(get_db)):
    """Crunches the math for the frontend dashboard."""
    receipts = db.query(models.ReceiptDB).all()
    
    total_spent = sum(r.total_amount for r in receipts if r.total_amount)
    
    spend_by_store = {}
    spend_by_date = {}
    
    for r in receipts:
        store = r.store_name or "Unknown"
        date = r.date or "Unknown"
        amt = r.total_amount or 0
        
        spend_by_store[store] = spend_by_store.get(store, 0) + amt
        spend_by_date[date] = spend_by_date.get(date, 0) + amt
        
    # Format the dictionaries into the exact array structure Recharts needs
    store_data = [{"name": k, "amount": v} for k, v in sorted(spend_by_store.items(), key=lambda item: item[1], reverse=True)]
    date_data = [{"name": k, "amount": v} for k, v in sorted(spend_by_date.items())]
    
    return {
        "totalSpent": total_spent,
        "spendByStore": store_data,
        "spendByDate": date_data
    }

# Extract receipt endpoint
@app.post("/api/extract", response_model=ReceiptResponse)
async def extract_receipt(file: UploadFile = File(...), db: Session = Depends(get_db)):
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

        # Create the main receipt record
        db_receipt = models.ReceiptDB(
            store_name=receipt_data["store_name"],
            date=receipt_data.get("date"),
            subtotal=receipt_data["subtotal"],
            tax_amount=receipt_data["tax_amount"],
            discount_amount=receipt_data.get("discount_amount", 0.0),
            total_amount=receipt_data["total_amount"]
        )
        # Add the receipt to the session and commit to get an ID for database relationships
        db.add(db_receipt)
        db.commit()
        db.refresh(db_receipt) # Get the new ID

        # Create the item records and link them to the receipt
        for item in receipt_data["items"]:
            db_item = models.ItemDB(
                receipt_id=db_receipt.id,
                name=item["name"],
                price=item["price"]
            )
            db.add(db_item)
        
        db.commit()
        db.refresh(db_receipt) # Refresh to get the linked items

        return db_receipt


    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")
    
@app.put("/api/receipts/{receipt_id}", response_model=ReceiptResponse)
def update_receipt(receipt_id: int, updated_data: ReceiptSchema, db: Session = Depends(get_db)):
    """Updates an existing receipt and its items in the database."""
    
    # Find the existing receipt
    db_receipt = db.query(models.ReceiptDB).filter(models.ReceiptDB.id == receipt_id).first()
    if not db_receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")

    # Update the main receipt fields
    db_receipt.store_name = updated_data.store_name
    db_receipt.date = updated_data.date
    db_receipt.subtotal = updated_data.subtotal
    db_receipt.tax_amount = updated_data.tax_amount
    db_receipt.discount_amount = updated_data.discount_amount
    db_receipt.total_amount = updated_data.total_amount

    # Update the items 
    # (The safest way is to delete the old items and insert the newly edited ones)
    db.query(models.ItemDB).filter(models.ItemDB.receipt_id == receipt_id).delete()
    
    for item in updated_data.items:
        db_item = models.ItemDB(receipt_id=receipt_id, name=item.name, price=item.price)
        db.add(db_item)

    # Save everything
    db.commit()
    db.refresh(db_receipt)
    
    return db_receipt

# Delete receipt endpoint
@app.delete("/api/receipts/{receipt_id}")
def delete_receipt(receipt_id: int, db: Session = Depends(get_db)):
    """Deletes a receipt and all its line items."""
    db_receipt = db.query(models.ReceiptDB).filter(models.ReceiptDB.id == receipt_id).first()
    
    if not db_receipt:
        from fastapi import HTTPException # Just in case it's not imported at the top!
        raise HTTPException(status_code=404, detail="Receipt not found")

    # 1. Delete all the line items first to prevent orphaned data
    db.query(models.ItemDB).filter(models.ItemDB.receipt_id == receipt_id).delete()
    
    # 2. Delete the receipt itself
    db.delete(db_receipt)
    db.commit()
    
    return {"message": "Receipt successfully deleted"}