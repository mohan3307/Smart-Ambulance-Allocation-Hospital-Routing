from typing import List, Dict, Any
from app.schemas.schemas import HospitalCandidate, TriageResult, ScoredHospital, HospitalRecommendationResponse

class HospitalRecommender:
    """
    Hospital Recommendation & Diversion Avoidance Engine.
    Matches patient condition to specialized facilities and live bed capacity:
    Score = w_eta * S_eta + w_spec * S_spec + w_bed * S_bed + w_fac * S_fac - DiversionPenalty
    """

    def recommend(
        self,
        triage: TriageResult,
        hospitals: List[HospitalCandidate]
    ) -> HospitalRecommendationResponse:
        if not hospitals:
            raise ValueError("No hospitals provided for recommendation")

        required_specialties = set(triage.recommended_specialties)
        needs_icu = triage.esi_level <= 2 or "Critical_Care" in required_specialties

        # Dynamic weights based on triage urgency
        if triage.esi_level == 1:
            weights = {"eta": 0.30, "specialty": 0.35, "beds": 0.20, "facility": 0.15}
        elif triage.esi_level == 2:
            weights = {"eta": 0.35, "specialty": 0.30, "beds": 0.20, "facility": 0.15}
        else:
            weights = {"eta": 0.50, "specialty": 0.25, "beds": 0.15, "facility": 0.10}

        etas = [h.eta_minutes for h in hospitals]
        min_eta = min(etas) if etas else 1.0
        max_eta = max(etas) if etas else 30.0

        diversion_warnings: List[str] = []
        scored_list: List[ScoredHospital] = []

        for hosp in hospitals:
            # 1. ETA Score:
            if max_eta == min_eta:
                eta_score = 90.0
            else:
                eta_score = max(0.0, 100.0 - ((hosp.eta_minutes - min_eta) / (max_eta - min_eta + 0.001)) * 55.0)

            # 2. Specialty Match Score:
            hosp_specs = set(hosp.specialties_available)
            matched_specs = list(required_specialties.intersection(hosp_specs))
            missing_specs = list(required_specialties - hosp_specs)

            if required_specialties:
                spec_ratio = len(matched_specs) / len(required_specialties)
                specialty_score = spec_ratio * 100.0
            else:
                specialty_score = 90.0

            # 3. Bed Availability Score:
            # ER availability ratio
            er_ratio = (hosp.er_beds_available / hosp.er_beds_total) if hosp.er_beds_total > 0 else 0.0
            icu_ratio = (hosp.icu_beds_available / hosp.icu_beds_total) if hosp.icu_beds_total > 0 else 0.0

            if needs_icu:
                bed_score = (icu_ratio * 70.0) + (er_ratio * 30.0)
            else:
                bed_score = (er_ratio * 80.0) + (icu_ratio * 20.0)

            bed_score = max(0.0, min(100.0, bed_score))

            # 4. Facility Capabilities (Trauma Bays, Cath Lab, CT, etc.)
            fac_score = min(100.0, len(hosp.active_facilities) * 20.0)

            # 5. Diversion & Saturation Penalty:
            diversion_penalty = 0.0
            is_divert = hosp.diversion_status

            # If ER is over 90% capacity
            if hosp.er_beds_available <= 1:
                diversion_penalty += 35.0
                diversion_warnings.append(f"{hosp.name}: ER near total saturation ({hosp.er_beds_available} beds free)")

            # If patient needs ICU but hospital has 0 ICU beds
            if needs_icu and hosp.icu_beds_available == 0:
                diversion_penalty += 55.0
                is_divert = True
                diversion_warnings.append(f"{hosp.name}: 0 ICU beds available for critical ESI-{triage.esi_level} patient")

            if hosp.diversion_status:
                diversion_penalty += 60.0
                diversion_warnings.append(f"{hosp.name}: Officially on ER diversion status")

            composite = (
                weights["eta"] * eta_score +
                weights["specialty"] * specialty_score +
                weights["beds"] * bed_score +
                weights["facility"] * fac_score
            ) - diversion_penalty

            composite = round(max(0.0, min(100.0, composite)), 2)

            # Rationale building
            rationale_parts = []
            if is_divert:
                rationale_parts.append("DIVERSION WARNING (Critical bed shortage)")
            if matched_specs:
                rationale_parts.append(f"Matched: {', '.join(matched_specs)}")
            if missing_specs:
                rationale_parts.append(f"Lacks: {', '.join(missing_specs)}")
            rationale_parts.append(f"Beds: {hosp.er_beds_available} ER / {hosp.icu_beds_available} ICU")
            rationale_parts.append(f"ETA: {hosp.eta_minutes:.1f}m")

            scored = ScoredHospital(
                id=hosp.id,
                name=hosp.name,
                rank=0,
                composite_score=composite,
                eta_minutes=hosp.eta_minutes,
                distance_km=hosp.distance_km,
                specialty_match_score=round(specialty_score, 1),
                bed_availability_score=round(bed_score, 1),
                facility_match_score=round(fac_score, 1),
                diversion_risk_penalty=round(diversion_penalty, 1),
                is_diversion_recommended=is_divert,
                selection_rationale="; ".join(rationale_parts),
                matched_specialties=matched_specs,
                missing_specialties=missing_specs
            )
            scored_list.append(scored)

        scored_list.sort(key=lambda s: s.composite_score, reverse=True)
        for i, s in enumerate(scored_list):
            s.rank = i + 1

        selected = scored_list[0]

        # Detailed XAI comparative rationale
        closest_hosp = min(hospitals, key=lambda h: h.distance_km)
        if closest_hosp.id != selected.id:
            closest_scored = next(s for s in scored_list if s.id == closest_hosp.id)
            explanation = (
                f"Recommended {selected.name} (Score {selected.composite_score}) rather than closest hospital "
                f"{closest_scored.name} ({closest_scored.distance_km:.1f} km). "
                f"Reason: {selected.name} possesses ready clinical capabilities ({', '.join(selected.matched_specialties) or 'emergency beds'}) "
                f"and available ICU/ER beds, preventing dangerous diversion delays."
            )
            if closest_scored.is_diversion_recommended:
                explanation += f" ({closest_scored.name} is penalized due to high saturation / zero ICU availability)."
        else:
            explanation = (
                f"Recommended {selected.name} as best-fit destination combining fast transit "
                f"({selected.eta_minutes:.1f}m) with matching medical resources and verified bed availability."
            )

        return HospitalRecommendationResponse(
            recommended_hospital=selected,
            ranked_hospitals=scored_list,
            diversion_warnings=list(dict.fromkeys(diversion_warnings)),
            explanation=explanation
        )
