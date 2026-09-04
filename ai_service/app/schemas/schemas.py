from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class VitalsInput(BaseModel):
    heart_rate: Optional[int] = Field(None, description="Heart rate in bpm")
    spo2: Optional[int] = Field(None, description="Oxygen saturation in %")
    systolic_bp: Optional[int] = Field(None, description="Systolic blood pressure in mmHg")
    diastolic_bp: Optional[int] = Field(None, description="Diastolic blood pressure in mmHg")
    respiratory_rate: Optional[int] = Field(None, description="Breaths per minute")
    gcs: Optional[int] = Field(None, description="Glasgow Coma Scale (3-15)")
    temperature: Optional[float] = Field(None, description="Body temperature in Celsius")

class TriageRequest(BaseModel):
    chief_complaint: str = Field(..., description="Free text description or caller notes")
    symptoms: List[str] = Field(default_factory=list, description="Selected symptom list")
    conscious: Optional[bool] = Field(True, description="Whether patient is conscious")
    breathing: Optional[bool] = Field(True, description="Whether patient is breathing normally")
    severe_bleeding: Optional[bool] = Field(False, description="Presence of active severe bleeding")
    patient_age: Optional[int] = Field(None, description="Age in years")
    gender: Optional[str] = Field(None, description="Gender (male/female/other)")
    vitals: Optional[VitalsInput] = Field(default_factory=VitalsInput)

class TriageResult(BaseModel):
    esi_level: int = Field(..., description="Emergency Severity Index 1 (resuscitation) to 5 (non-urgent)")
    triage_color: str = Field(..., description="Red, Orange, Yellow, Green, Blue")
    category_name: str = Field(..., description="Clinical triage category name")
    severity_score: float = Field(..., description="Normalized 0-100 severity score")
    recommended_specialties: List[str] = Field(default_factory=list)
    required_equipment: List[str] = Field(default_factory=list)
    min_paramedic_skill: str = Field(..., description="BLS, ALS, Critical_Care")
    first_aid_guidance_key: str = Field(..., description="Identifier for first-aid instruction card")
    clinical_flags: List[str] = Field(default_factory=list)
    confidence: float = Field(..., description="Confidence score 0.0 - 1.0")
    explanation: str = Field(..., description="Clinical triage justification")

class AmbulanceCandidate(BaseModel):
    id: str
    call_sign: str
    ambulance_type: str = Field(..., description="ALS, BLS, MICU, PALS, Transport")
    status: str = Field(default="Available")
    latitude: float
    longitude: float
    eta_minutes: float
    distance_km: float
    equipment: List[str] = Field(default_factory=list)
    paramedic_level: str = Field(..., description="Doctor, Critical_Care, Advanced, Intermediate, Basic")
    crew_size: int = 2
    traffic_delay_factor: float = Field(1.0, description="1.0 = normal, >1.0 = traffic delay")

class AmbulanceAllocationRequest(BaseModel):
    triage: TriageResult
    patient_location: Dict[str, float] = Field(..., description="{'latitude': float, 'longitude': float}")
    ambulances: List[AmbulanceCandidate]
    weights: Optional[Dict[str, float]] = Field(None, description="Optional custom factor weights")

class ScoredAmbulance(BaseModel):
    id: str
    call_sign: str
    rank: int
    composite_score: float
    eta_minutes: float
    distance_km: float
    equipment_match_score: float
    skill_match_score: float
    vehicle_type_score: float
    traffic_penalty: float
    missing_equipment: List[str] = Field(default_factory=list)
    selection_rationale: str

class AmbulanceAllocationResponse(BaseModel):
    selected_ambulance: ScoredAmbulance
    ranked_candidates: List[ScoredAmbulance]
    explanation: str
    audit_factors: Dict[str, Any]

class HospitalCandidate(BaseModel):
    id: str
    name: str
    type: str = Field(..., description="Level 1 Trauma, Multi-Specialty, Community, Pediatric")
    latitude: float
    longitude: float
    eta_minutes: float
    distance_km: float
    er_beds_total: int
    er_beds_available: int
    icu_beds_total: int
    icu_beds_available: int
    specialties_available: List[str] = Field(default_factory=list)
    active_facilities: List[str] = Field(default_factory=list) # e.g. ["Cath_Lab", "CT_Scan", "Trauma_Bay"]
    diversion_status: bool = False
    average_wait_time_minutes: int = 15

class HospitalRecommendationRequest(BaseModel):
    triage: TriageResult
    incident_location: Dict[str, float]
    hospitals: List[HospitalCandidate]

class ScoredHospital(BaseModel):
    id: str
    name: str
    rank: int
    composite_score: float
    eta_minutes: float
    distance_km: float
    specialty_match_score: float
    bed_availability_score: float
    facility_match_score: float
    diversion_risk_penalty: float
    is_diversion_recommended: bool
    selection_rationale: str
    matched_specialties: List[str] = Field(default_factory=list)
    missing_specialties: List[str] = Field(default_factory=list)

class HospitalRecommendationResponse(BaseModel):
    recommended_hospital: ScoredHospital
    ranked_hospitals: List[ScoredHospital]
    diversion_warnings: List[str] = Field(default_factory=list)
    explanation: str

class FullOptimizationRequest(BaseModel):
    incident_id: Optional[str] = None
    triage_request: TriageRequest
    incident_location: Dict[str, float]
    ambulances: List[AmbulanceCandidate]
    hospitals: List[HospitalCandidate]

class FullOptimizationResponse(BaseModel):
    triage: TriageResult
    ambulance_allocation: AmbulanceAllocationResponse
    hospital_recommendation: HospitalRecommendationResponse
    system_engine: str = "ai_optimized"
