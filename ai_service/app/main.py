from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.schemas import (
    TriageRequest, TriageResult,
    AmbulanceAllocationRequest, AmbulanceAllocationResponse,
    HospitalRecommendationRequest, HospitalRecommendationResponse,
    FullOptimizationRequest, FullOptimizationResponse
)
from app.models.triage_classifier import TriageClassifier
from app.models.ambulance_allocator import AmbulanceAllocator
from app.models.hospital_recommender import HospitalRecommender
from app.models.xai_explainer import XAIExplainer

app = FastAPI(
    title="Smart Ambulance AI Microservice",
    description="Real-time triage, multi-criteria ambulance allocation, bed-aware hospital routing, and Explainable AI.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

triage_classifier = TriageClassifier()
ambulance_allocator = AmbulanceAllocator()
hospital_recommender = HospitalRecommender()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Smart Ambulance AI Engine",
        "version": "1.0.0",
        "capabilities": [
            "NLP Emergency Triage",
            "Multi-Criteria Allocation Optimization",
            "Hospital Bed/Diversion Recommender",
            "Explainable AI (XAI)"
        ]
    }

@app.post("/api/triage", response_model=TriageResult)
def classify_triage(request: TriageRequest):
    try:
        return triage_classifier.classify(request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Triage error: {str(e)}")

@app.post("/api/allocate", response_model=AmbulanceAllocationResponse)
def allocate_ambulance(request: AmbulanceAllocationRequest):
    try:
        return ambulance_allocator.allocate(
            triage=request.triage,
            ambulances=request.ambulances,
            custom_weights=request.weights
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Allocation error: {str(e)}")

@app.post("/api/recommend-hospital", response_model=HospitalRecommendationResponse)
def recommend_hospital(request: HospitalRecommendationRequest):
    try:
        return hospital_recommender.recommend(
            triage=request.triage,
            hospitals=request.hospitals
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hospital recommendation error: {str(e)}")

@app.post("/api/full-optimization")
def full_dispatch_optimization(request: FullOptimizationRequest):
    try:
        # Step 1: Run AI triage
        triage_res = triage_classifier.classify(request.triage_request)

        # Step 2: Allocate optimal ambulance
        alloc_res = ambulance_allocator.allocate(
            triage=triage_res,
            ambulances=request.ambulances
        )

        # Step 3: Recommend optimal hospital
        hosp_res = hospital_recommender.recommend(
            triage=triage_res,
            hospitals=request.hospitals
        )

        # Step 4: Generate Explainable AI breakdown
        xai_summary = XAIExplainer.generate_dispatch_xai_summary(
            triage=triage_res,
            selected_amb=alloc_res.selected_ambulance,
            selected_hosp=hosp_res.recommended_hospital,
            all_ambs=alloc_res.ranked_candidates,
            all_hosps=hosp_res.ranked_hospitals
        )

        return {
            "triage": triage_res,
            "ambulance_allocation": alloc_res,
            "hospital_recommendation": hosp_res,
            "xai_explanation": xai_summary,
            "system_engine": "ai_optimized"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization pipeline error: {str(e)}")
