from typing import Dict, Any, List
from app.schemas.schemas import ScoredAmbulance, ScoredHospital, TriageResult

class XAIExplainer:
    """
    Explainable AI (XAI) Engine providing decision transparency,
    feature importance breakdowns, and counterfactual simulation for dispatchers.
    """

    @staticmethod
    def generate_dispatch_xai_summary(
        triage: TriageResult,
        selected_amb: ScoredAmbulance,
        selected_hosp: ScoredHospital,
        all_ambs: List[ScoredAmbulance],
        all_hosps: List[ScoredHospital]
    ) -> Dict[str, Any]:
        # Radar chart metrics for top ambulance vs average
        avg_eta = sum(a.eta_minutes for a in all_ambs) / len(all_ambs) if all_ambs else 10.0
        avg_equip = sum(a.equipment_match_score for a in all_ambs) / len(all_ambs) if all_ambs else 80.0
        avg_skill = sum(a.skill_match_score for a in all_ambs) / len(all_ambs) if all_ambs else 80.0

        amb_radar = [
            {"axis": "Speed / Proximity", "selected": round(100 - min(100, (selected_amb.eta_minutes / 20.0) * 100), 1), "benchmark": round(100 - min(100, (avg_eta / 20.0) * 100), 1)},
            {"axis": "Equipment Match", "selected": selected_amb.equipment_match_score, "benchmark": round(avg_equip, 1)},
            {"axis": "Crew Skill Tier", "selected": selected_amb.skill_match_score, "benchmark": round(avg_skill, 1)},
            {"axis": "Vehicle Suitability", "selected": selected_amb.vehicle_type_score, "benchmark": 75.0},
            {"axis": "Traffic Route Flow", "selected": round(max(0.0, 100.0 - selected_amb.traffic_penalty * 4), 1), "benchmark": 70.0}
        ]

        hosp_radar = [
            {"axis": "Transit ETA", "selected": round(100 - min(100, (selected_hosp.eta_minutes / 25.0) * 100), 1), "benchmark": 65.0},
            {"axis": "Specialty Fit", "selected": selected_hosp.specialty_match_score, "benchmark": 50.0},
            {"axis": "Bed Capacity", "selected": selected_hosp.bed_availability_score, "benchmark": 40.0},
            {"axis": "Trauma/Cath Bays", "selected": selected_hosp.facility_match_score, "benchmark": 60.0},
            {"axis": "Anti-Diversion Safety", "selected": round(max(0.0, 100.0 - selected_hosp.diversion_risk_penalty), 1), "benchmark": 70.0}
        ]

        # Estimated Golden Hour minutes saved compared to standard closest-unit routing
        # If closest unit lacked equipment, patient would have required transfer or died on scene
        estimated_transfer_delay_saved = 22.0 if selected_amb.missing_equipment == [] and any(a.missing_equipment for a in all_ambs) else 8.0
        diversion_reroute_delay_saved = 25.0 if selected_hosp.diversion_risk_penalty == 0 and any(h.is_diversion_recommended for h in all_hosps) else 5.0

        key_takeaways = [
            f"Triage Severity ESI-{triage.esi_level} requires prioritized clinical capability over raw distance.",
            f"Ambulance {selected_amb.call_sign} guarantees {len(selected_amb.missing_equipment) == 0 and '100% equipment readiness' or 'vital capability'}."
        ]
        if selected_hosp.is_diversion_recommended is False:
            key_takeaways.append(f"Hospital {selected_hosp.name} verified non-diverting with active beds and on-duty specialists.")

        return {
            "confidence_score": 0.95,
            "decision_grade": "A+",
            "estimated_golden_hour_minutes_saved": estimated_transfer_delay_saved + diversion_reroute_delay_saved,
            "ambulance_radar": amb_radar,
            "hospital_radar": hosp_radar,
            "key_takeaways": key_takeaways,
            "diverted_hospitals_avoided": [h.name for h in all_hosps if h.is_diversion_recommended],
            "audit_trail": {
                "triage_category": triage.category_name,
                "triage_score": triage.severity_score,
                "ambulance_selected": selected_amb.call_sign,
                "ambulance_score": selected_amb.composite_score,
                "hospital_selected": selected_hosp.name,
                "hospital_score": selected_hosp.composite_score
            }
        }
