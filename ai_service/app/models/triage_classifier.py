import re
from typing import Dict, Any, List
from app.schemas.schemas import TriageRequest, TriageResult, VitalsInput

class TriageClassifier:
    """
    Emergency Severity Index (ESI) and Clinical Specialty classifier.
    Combines NLP clinical keyword detection, vital signs risk scoring,
    and clinical triage decision trees.
    """

    CRITICAL_KEYWORDS = {
        "cardiac_arrest": ["cardiac arrest", "no pulse", "unresponsive", "stopped breathing", "defibrillator", "cpr needed", "heart stopped"],
        "respiratory_failure": ["cannot breathe", "choking", "stridor", "blue lips", "cyanosis", "severe asthma attack", "anaphylaxis", "gasping"],
        "severe_trauma": ["massive bleeding", "head injury unconscious", "penetrating wound", "gunshot", "stab wound", "amputation", "crush injury", "ejected from car"],
        "stroke": ["face droop", "arm weakness", "slurred speech", "sudden paralysis", "stroke", "hemiplegia", "cva", "sudden loss of vision"],
        "stemi_cardiac": ["crushing chest pain", "substernal", "radiating to left arm", "radiating to jaw", "heart attack", "myocardial infarction", "cold sweat chest pain"],
        "burns": ["third degree burn", "explosion burn", "smoke inhalation", "facial burn", "airway burn"],
        "pediatric_critical": ["infant not breathing", "baby limp", "child seizure", "pediatric trauma", "baby choking"],
        "sepsis": ["septic shock", "severe shivers high fever confused", "hypotension fever", "rigors"]
    }

    EMERGENT_KEYWORDS = [
        "severe chest pain", "fracture bone visible", "open fracture", "heavy bleeding", 
        "confusion", "high fever seizure", "intoxication unresponsive", "dislocated shoulder severe pain",
        "deep laceration", "allergic reaction swollen lips", "suicidal ideation", "severe abdominal pain"
    ]

    URGENT_KEYWORDS = [
        "moderate pain", "closed fracture", "vomiting blood", "asthma wheezing", 
        "kidney stone pain", "migraine severe", "laceration bleeding controlled", "fall elderly pain hip"
    ]

    def classify(self, request: TriageRequest) -> TriageResult:
        chief = (request.chief_complaint or "").lower()
        symptom_text = " ".join([s.lower() for s in (request.symptoms or [])])
        combined_text = f"{chief} {symptom_text}"

        clinical_flags: List[str] = []
        specialties: List[str] = []
        equipment: List[str] = []
        min_paramedic_skill = "Basic"
        first_aid_key = "general_comfort"

        # Check immediate life threats (ESI 1 criteria)
        is_esi_1 = False
        esi_1_reasons = []

        if request.conscious is False and request.breathing is False:
            is_esi_1 = True
            esi_1_reasons.append("Unconscious and not breathing (Cardiac Arrest protocol)")
            first_aid_key = "cpr_cardiac"
        elif request.breathing is False:
            is_esi_1 = True
            esi_1_reasons.append("Apnea / Complete respiratory cessation")
            first_aid_key = "cpr_cardiac"
        elif request.conscious is False:
            esi_1_reasons.append("Profound unconsciousness / Unresponsive (GCS <= 8)")

        if request.severe_bleeding:
            clinical_flags.append("Active Severe Hemorrhage")
            if first_aid_key == "general_comfort":
                first_aid_key = "severe_bleeding"

        # Check critical keyword categories
        matched_categories = []
        for cat, keywords in self.CRITICAL_KEYWORDS.items():
            for kw in keywords:
                if re.search(r'\b' + re.escape(kw) + r'\b', combined_text):
                    matched_categories.append(cat)
                    break

        if "cardiac_arrest" in matched_categories:
            is_esi_1 = True
            esi_1_reasons.append("Signs consistent with cardiac arrest")
            first_aid_key = "cpr_cardiac"
            specialties.extend(["Cardiology", "Cath_Lab", "Critical_Care"])
            equipment.extend(["Defibrillator", "Ventilator", "12-Lead ECG", "Suction"])
            min_paramedic_skill = "Critical_Care"

        if "respiratory_failure" in matched_categories:
            is_esi_1 = True
            esi_1_reasons.append("Acute life-threatening respiratory compromise")
            first_aid_key = "choking_heimlich" if "chok" in combined_text else "respiratory_distress"
            specialties.extend(["Pulmonology", "Critical_Care"])
            equipment.extend(["Ventilator", "Suction", "Oxygen_Supply"])
            min_paramedic_skill = "Critical_Care"

        if "stemi_cardiac" in matched_categories:
            clinical_flags.append("Suspected Acute Coronary Syndrome / STEMI")
            specialties.extend(["Cardiology", "Cath_Lab"])
            equipment.extend(["12-Lead ECG", "Defibrillator", "Oxygen_Supply"])
            min_paramedic_skill = "Advanced"
            first_aid_key = "chest_pain"

        if "stroke" in matched_categories:
            clinical_flags.append("Suspected Acute Ischemic Stroke / CVA Window")
            specialties.extend(["Neurology", "Stroke_Unit", "Interventional_Neuroradiology"])
            equipment.extend(["12-Lead ECG", "Glucometer", "Oxygen_Supply"])
            min_paramedic_skill = "Advanced"
            first_aid_key = "stroke_fast"

        if "severe_trauma" in matched_categories:
            clinical_flags.append("Major Polytrauma / Surgical Emergency")
            specialties.extend(["Trauma_Surgery", "Orthopedics", "Critical_Care"])
            equipment.extend(["Immobilization_Kit", "Trauma_Pack", "Suction", "IV_Infusion"])
            min_paramedic_skill = "Advanced"
            if request.severe_bleeding or "bleed" in combined_text:
                first_aid_key = "severe_bleeding"

        if "burns" in matched_categories:
            clinical_flags.append("Major Burn / Inhalation Hazard")
            specialties.extend(["Burn_Unit", "Trauma_Surgery", "Critical_Care"])
            equipment.extend(["Burn_Kit", "Oxygen_Supply", "IV_Infusion"])
            min_paramedic_skill = "Advanced"
            first_aid_key = "burn_treatment"

        if request.patient_age is not None and request.patient_age < 14:
            specialties.append("Pediatrics")
            equipment.append("Pediatric_Kit")

        # Evaluate Vitals if provided
        v = request.vitals or VitalsInput()
        vitals_points = 0
        vitals_reasons = []

        if v.heart_rate is not None:
            if v.heart_rate > 140 or v.heart_rate < 40:
                vitals_points += 30
                vitals_reasons.append(f"Extreme heart rate: {v.heart_rate} bpm")
                is_esi_1 = True
            elif v.heart_rate > 115 or v.heart_rate < 50:
                vitals_points += 15
                vitals_reasons.append(f"Abnormal heart rate: {v.heart_rate} bpm")

        if v.spo2 is not None:
            if v.spo2 < 88:
                vitals_points += 35
                vitals_reasons.append(f"Critical hypoxia: SpO2 {v.spo2}%")
                is_esi_1 = True
                equipment.append("Ventilator")
            elif v.spo2 < 92:
                vitals_points += 20
                vitals_reasons.append(f"Hypoxia: SpO2 {v.spo2}%")
                equipment.append("Oxygen_Supply")

        if v.systolic_bp is not None:
            if v.systolic_bp < 80:
                vitals_points += 30
                vitals_reasons.append(f"Severe hypotension / Shock: {v.systolic_bp} mmHg")
                clinical_flags.append("Hemodynamic Instability")
            elif v.systolic_bp > 200:
                vitals_points += 20
                vitals_reasons.append(f"Hypertensive crisis: {v.systolic_bp} mmHg")

        if v.gcs is not None:
            if v.gcs <= 8:
                vitals_points += 40
                vitals_reasons.append(f"Comatose GCS: {v.gcs}/15")
                is_esi_1 = True
                min_paramedic_skill = "Critical_Care"
            elif v.gcs <= 12:
                vitals_points += 25
                vitals_reasons.append(f"Impaired consciousness GCS: {v.gcs}/15")

        if v.respiratory_rate is not None:
            if v.respiratory_rate > 34 or v.respiratory_rate < 8:
                vitals_points += 25
                vitals_reasons.append(f"Critical respiratory rate: {v.respiratory_rate}/min")

        # Determine Final ESI and Severity Score
        if is_esi_1 or vitals_points >= 60:
            esi_level = 1
            triage_color = "Red"
            category_name = "Resuscitation (Immediate Life Threat)"
            base_score = 90.0 + min(10.0, vitals_points * 0.1)
            min_paramedic_skill = "Critical_Care"
        elif any(re.search(r'\b' + re.escape(w) + r'\b', combined_text) for w in self.EMERGENT_KEYWORDS) or vitals_points >= 30:
            esi_level = 2
            triage_color = "Orange"
            category_name = "Emergent (High Risk / Potential Threat)"
            base_score = 70.0 + min(18.0, vitals_points * 0.3)
            if min_paramedic_skill == "Basic":
                min_paramedic_skill = "Advanced"
        elif any(re.search(r'\b' + re.escape(w) + r'\b', combined_text) for w in self.URGENT_KEYWORDS) or vitals_points >= 15:
            esi_level = 3
            triage_color = "Yellow"
            category_name = "Urgent (Multiple Resources Needed)"
            base_score = 45.0 + min(20.0, vitals_points * 0.4)
            if min_paramedic_skill == "Critical_Care":
                min_paramedic_skill = "Advanced"
        elif "mild" in combined_text or "scrape" in combined_text or "minor" in combined_text or "bandage" in combined_text:
            esi_level = 5
            triage_color = "Blue"
            category_name = "Non-Urgent"
            base_score = 15.0
            min_paramedic_skill = "Basic"
        else:
            esi_level = 4
            triage_color = "Green"
            category_name = "Less Urgent (Single Resource)"
            base_score = 30.0
            min_paramedic_skill = "Basic"

        # Guarantee defaults
        if not equipment:
            equipment = ["Oxygen_Supply", "First_Aid_Kit"]
        equipment = list(dict.fromkeys(equipment))
        specialties = list(dict.fromkeys(specialties))

        # Build Explanation
        reasons = []
        if esi_1_reasons:
            reasons.extend(esi_1_reasons)
        if matched_categories:
            reasons.append(f"Matched critical patterns: {', '.join(matched_categories)}")
        if vitals_reasons:
            reasons.append(f"Abnormal vitals: {', '.join(vitals_reasons)}")
        if not reasons:
            reasons.append(f"Symptom profile matches standard ESI Level {esi_level} clinical triage criteria")

        explanation = f"Patient classified as ESI {esi_level} ({category_name}). Key factors: " + "; ".join(reasons) + "."

        return TriageResult(
            esi_level=esi_level,
            triage_color=triage_color,
            category_name=category_name,
            severity_score=round(min(100.0, max(0.0, base_score)), 1),
            recommended_specialties=specialties,
            required_equipment=equipment,
            min_paramedic_skill=min_paramedic_skill,
            first_aid_guidance_key=first_aid_key,
            clinical_flags=clinical_flags,
            confidence=0.94 if matched_categories or vitals_reasons else 0.86,
            explanation=explanation
        )
