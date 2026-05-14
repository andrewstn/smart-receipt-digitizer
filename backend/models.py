from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class ReceiptDB(Base):
    __tablename__ = "receipts"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String, index=True)
    date = Column(String, nullable=True)
    subtotal = Column(Float)
    tax_amount = Column(Float)
    discount_amount = Column(Float, default=0.0)
    total_amount = Column(Float)

    # Establish a relationship to the items table
    items = relationship("ItemDB", back_populates="receipt", cascade="all, delete-orphan")

class ItemDB(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    receipt_id = Column(Integer, ForeignKey("receipts.id"))
    name = Column(String, index=True)
    price = Column(Float)

    # Establish the link back to the parent receipt
    receipt = relationship("ReceiptDB", back_populates="items")