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
from pydantic import BaseModel
from typing import List, Optional
import json

# Database Imports
import models
from database import engine, SessionLocal

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

class ReceiptSchema(BaseModel):
    store_name: str
    date: Optional[str] = None
    items: List[ReceiptItemSchema]
    subtotal: float
    tax_amount: float
    discount_amount: Optional[float] = 0.0
    total_amount: float

# Schema for outputting DB records (includes the auto-generated ID)
class ReceiptResponse(ReceiptSchema):
    id: int
    class Config:
        orm_mode = True

# FastAPI Setup
app = FastAPI(title="Smart Receipt API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get all receipts endpoint
@app.get("/api/receipts")
def get_all_receipts(db: Session = Depends(get_db)):
    """Fetches all saved receipts from the database."""
    receipts = db.query(models.ReceiptDB).order_by(models.ReceiptDB.id.desc()).all()
    return receipts

# Extract receipt data from uploaded image and save to database
@app.post("/api/extract")
async def extract_receipt(file: UploadFile = File(...), db: Session = Depends(get_db)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        prompt = "Extract the receipt data from this image."
        
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