from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime, timedelta
import uuid
from pymongo import MongoClient
from bson import ObjectId
import json

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = MongoClient(MONGO_URL)
db = client.review_app

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class ReviewSubmission(BaseModel):
    support_rating: int
    quality_rating: int
    features_rating: int
    value_rating: int
    comment: Optional[str] = ""
    
class ReviewResponse(BaseModel):
    id: str
    support_rating: int
    quality_rating: int
    features_rating: int
    value_rating: int
    comment: str
    timestamp: datetime
    status: str  # "pending", "approved", "rejected"

class ReviewStats(BaseModel):
    total_reviews: int
    avg_support: float
    avg_quality: float
    avg_features: float
    avg_value: float
    avg_overall: float

# Helper functions
def serialize_review(review):
    """Convert MongoDB document to serializable format"""
    return {
        "id": str(review["_id"]),
        "support_rating": review["support_rating"],
        "quality_rating": review["quality_rating"],
        "features_rating": review["features_rating"],
        "value_rating": review["value_rating"],
        "comment": review["comment"],
        "timestamp": review["timestamp"],
        "status": review["status"]
    }

def calculate_stats(reviews):
    """Calculate statistics from reviews list"""
    if not reviews:
        return {
            "total_reviews": 0,
            "avg_support": 0,
            "avg_quality": 0,
            "avg_features": 0,
            "avg_value": 0,
            "avg_overall": 0
        }
    
    total = len(reviews)
    avg_support = sum(r["support_rating"] for r in reviews) / total
    avg_quality = sum(r["quality_rating"] for r in reviews) / total
    avg_features = sum(r["features_rating"] for r in reviews) / total
    avg_value = sum(r["value_rating"] for r in reviews) / total
    avg_overall = (avg_support + avg_quality + avg_features + avg_value) / 4
    
    return {
        "total_reviews": total,
        "avg_support": round(avg_support, 2),
        "avg_quality": round(avg_quality, 2), 
        "avg_features": round(avg_features, 2),
        "avg_value": round(avg_value, 2),
        "avg_overall": round(avg_overall, 2)
    }

# API Routes
@app.get("/api/")
async def root():
    return {"message": "Review Management API"}

@app.post("/api/reviews")
async def submit_review(review: ReviewSubmission):
    """Submit a new review"""
    try:
        review_doc = {
            "_id": str(uuid.uuid4()),
            "support_rating": review.support_rating,
            "quality_rating": review.quality_rating,
            "features_rating": review.features_rating,
            "value_rating": review.value_rating,
            "comment": review.comment or "",
            "timestamp": datetime.utcnow(),
            "status": "pending"  # All reviews start as pending
        }
        
        result = db.reviews.insert_one(review_doc)
        return {"message": "Avis soumis avec succès", "id": review_doc["_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la soumission: {str(e)}")

@app.get("/api/reviews")
async def get_reviews(status: Optional[str] = None, limit: Optional[int] = 100):
    """Get reviews with optional status filter"""
    try:
        query = {}
        if status:
            query["status"] = status
            
        reviews = list(db.reviews.find(query).sort("timestamp", -1).limit(limit))
        return [serialize_review(review) for review in reviews]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la récupération: {str(e)}")

@app.get("/api/stats")
async def get_stats():
    """Get overall statistics"""
    try:
        # Get approved reviews only for public stats
        approved_reviews = list(db.reviews.find({"status": "approved"}))
        return calculate_stats(approved_reviews)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors du calcul des statistiques: {str(e)}")

@app.get("/api/stats/weekly")
async def get_weekly_stats():
    """Get weekly statistics"""
    try:
        # Get reviews from last 4 weeks
        four_weeks_ago = datetime.utcnow() - timedelta(weeks=4)
        reviews = list(db.reviews.find({
            "status": "approved",
            "timestamp": {"$gte": four_weeks_ago}
        }))
        
        # Group by week
        weekly_stats = {}
        for review in reviews:
            week_start = review["timestamp"] - timedelta(days=review["timestamp"].weekday())
            week_key = week_start.strftime("%Y-%m-%d")
            
            if week_key not in weekly_stats:
                weekly_stats[week_key] = []
            weekly_stats[week_key].append(review)
        
        # Calculate stats for each week
        result = {}
        for week, week_reviews in weekly_stats.items():
            result[week] = calculate_stats(week_reviews)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur statistiques hebdomadaires: {str(e)}")

@app.get("/api/stats/monthly")
async def get_monthly_stats():
    """Get monthly statistics"""
    try:
        # Get reviews from last 6 months
        six_months_ago = datetime.utcnow() - timedelta(days=180)
        reviews = list(db.reviews.find({
            "status": "approved",
            "timestamp": {"$gte": six_months_ago}
        }))
        
        # Group by month
        monthly_stats = {}
        for review in reviews:
            month_key = review["timestamp"].strftime("%Y-%m")
            
            if month_key not in monthly_stats:
                monthly_stats[month_key] = []
            monthly_stats[month_key].append(review)
        
        # Calculate stats for each month
        result = {}
        for month, month_reviews in monthly_stats.items():
            result[month] = calculate_stats(month_reviews)
            
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur statistiques mensuelles: {str(e)}")

@app.put("/api/reviews/{review_id}/status")
async def update_review_status(review_id: str, status: str):
    """Update review status for moderation"""
    try:
        if status not in ["approved", "rejected", "pending"]:
            raise HTTPException(status_code=400, detail="Statut invalide")
            
        result = db.reviews.update_one(
            {"_id": review_id},
            {"$set": {"status": status}}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Avis introuvable")
            
        return {"message": f"Statut mis à jour: {status}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour: {str(e)}")

@app.get("/api/export")
async def export_reviews():
    """Export reviews as CSV data"""
    try:
        reviews = list(db.reviews.find({"status": "approved"}).sort("timestamp", -1))
        
        csv_data = "Date,Support,Qualité,Fonctionnalités,Rapport qualité/prix,Commentaire\n"
        for review in reviews:
            date = review["timestamp"].strftime("%Y-%m-%d %H:%M")
            comment = review["comment"].replace('"', '""').replace('\n', ' ') if review["comment"] else ""
            csv_data += f'"{date}",{review["support_rating"]},{review["quality_rating"]},{review["features_rating"]},{review["value_rating"]},"{comment}"\n'
        
        return {"csv_data": csv_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'export: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)