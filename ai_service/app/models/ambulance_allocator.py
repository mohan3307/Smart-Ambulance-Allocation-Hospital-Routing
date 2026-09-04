from typing import List, Dict, Any, Tuple
from app.schemas.schemas import AmbulanceCandidate, TriageResult, ScoredAmbulance, AmbulanceAllocationResponse

class AmbulanceAllocator:
    """
    Multi-Criteria Optimization Engine for Ambulance Allocation.
    Balances Time-to-Care with Clinical Capability:
    Score = w_eta * S_eta + w_equip * S_equip + w_skill * S_skill + w_type * S_type - TrafficPenalty
    """

    SKILL_RANKS = {
        "Basic": 1,
        "Intermediate": 2,
        "Advanced": 3,
        "Critical_Care": 4,
        "Doctor": 5
    }

    TYPE_SUITABILITY = {
        # ESI 1
        1: {"MICU": 100, "ALS": 90, "PALS": 85, "BLS": 20, "Transport": 5},
        # ESI 2
        2: {"MICU": 95, "ALS": 100, "PALS": 85, "BLS": 40, "Transport": 10},
        # ESI 3
        3: {"ALS": 95, "BLS": 85, "MICU": 80, "PALS": 80, "Transport": 30},
        # ESI 4 & 5
        4: {"BLS": 100, "ALS": 80, "Transport": 75, "MICU": 60, "PALS": 70},
        5: {"Transport": 100, "BLS": 95, "ALS": 70, "MICU": 50, "PALS": 60}
    }

    def allocate(
        self,
        triage: TriageResult,
        ambulances: List[AmbulanceCandidate],
        custom_weights: Dict[str, float] = None
    ) -> AmbulanceAllocationResponse:
        if not ambulances:
            raise ValueError("No ambulances provided for allocation")

        # Dynamic weights adapted to ESI severity
        if triage.esi_level == 1:
            weights = {"eta": 0.35, "equip": 0.35, "skill": 0.20, "type": 0.10}
        elif triage.esi_level == 2:
            weights = {"eta": 0.40, "equip": 0.30, "skill": 0.20, "type": 0.10}
        elif triage.esi_level == 3:
            weights = {"eta": 0.50, "equip": 0.25, "skill": 0.15, "type": 0.10}
        else:
            weights = {"eta": 0.65, "equip": 0.15, "skill": 0.10, "type": 0.10}

        if custom_weights:
            weights.update(custom_weights)

        # Normalize ETAs across candidates
        etas = [a.eta_minutes for a in ambulances]
        min_eta = min(etas) if etas else 1.0
        max_eta = max(etas) if etas else 20.0

        required_eq = set(triage.required_equipment)
        min_skill_level = self.SKILL_RANKS.get(triage.min_paramedic_skill, 1)

        scored_list: List[ScoredAmbulance] = []

        for amb in ambulances:
            # 1. ETA Score: exponential decay with respect to golden hour minutes
            # 0 to 100 points
            if max_eta == min_eta:
                eta_score = 90.0
            else:
                eta_score = max(0.0, 100.0 - ((amb.eta_minutes - min_eta) / (max_eta - min_eta + 0.001)) * 60.0)

            # 2. Equipment Match Score:
            amb_eq = set(amb.equipment)
            missing = list(required_eq - amb_eq)
            if required_eq:
                match_ratio = len(required_eq - set(missing)) / len(required_eq)
                equip_score = match_ratio * 100.0
                # Critical penalties if missing life-support items during ESI 1
                if triage.esi_level <= 2 and ("Ventilator" in missing or "Defibrillator" in missing):
                    equip_score *= 0.35 # Heavy penalization
            else:
                equip_score = 95.0

            # 3. Paramedic Skill Score:
            amb_skill_rank = self.SKILL_RANKS.get(amb.paramedic_level, 1)
            if amb_skill_rank >= min_skill_level:
                skill_score = 100.0
            else:
                deficit = min_skill_level - amb_skill_rank
                skill_score = max(10.0, 100.0 - (deficit * 40.0))

            # 4. Vehicle Type Score:
            type_map = self.TYPE_SUITABILITY.get(triage.esi_level, self.TYPE_SUITABILITY[3])
            type_score = float(type_map.get(amb.ambulance_type, 60))

            # 5. Traffic Delay Penalty:
            # Traffic factor > 1.0 reduces score
            traffic_penalty = max(0.0, (amb.traffic_delay_factor - 1.0) * 25.0)

            # Composite weighted utility:
            composite = (
                weights["eta"] * eta_score +
                weights["equip"] * equip_score +
                weights["skill"] * skill_score +
                weights["type"] * type_score
            ) - traffic_penalty

            composite = round(max(0.0, min(100.0, composite)), 2)

            # Explainable rationale for individual candidate
            rationale_parts = []
            if missing:
                rationale_parts.append(f"Missing required equipment ({', '.join(missing)})")
            else:
                rationale_parts.append("Fully equipped for case")

            if amb_skill_rank >= min_skill_level:
                rationale_parts.append(f"Crew certified ({amb.paramedic_level})")
            else:
                rationale_parts.append(f"Crew below recommended tier ({amb.paramedic_level} vs {triage.min_paramedic_skill})")

            rationale_parts.append(f"ETA {amb.eta_minutes:.1f}m ({amb.distance_km:.1f}km)")

            scored = ScoredAmbulance(
                id=amb.id,
                call_sign=amb.call_sign,
                rank=0,
                composite_score=composite,
                eta_minutes=amb.eta_minutes,
                distance_km=amb.distance_km,
                equipment_match_score=round(equip_score, 1),
                skill_match_score=round(skill_score, 1),
                vehicle_type_score=round(type_score, 1),
                traffic_penalty=round(traffic_penalty, 1),
                missing_equipment=missing,
                selection_rationale="; ".join(rationale_parts)
            )
            scored_list.append(scored)

        # Sort descending by composite score
        scored_list.sort(key=lambda s: s.composite_score, reverse=True)

        for i, s in enumerate(scored_list):
            s.rank = i + 1

        selected = scored_list[0]

        # Generate comparative explanation vs 2nd candidate if available
        if len(scored_list) > 1:
            runner_up = scored_list[1]
            diff = selected.composite_score - runner_up.composite_score
            closest_amb = min(ambulances, key=lambda a: a.distance_km)
            
            if closest_amb.id != selected.id:
                closest_scored = next(s for s in scored_list if s.id == closest_amb.id)
                explanation = (
                    f"Selected {selected.call_sign} (Score {selected.composite_score}) over nearest unit "
                    f"{closest_scored.call_sign} ({closest_scored.distance_km:.1f} km vs {selected.distance_km:.1f} km). "
                    f"Reason: {selected.call_sign} provides superior clinical fit (Equipment match {selected.equipment_match_score}%, "
                    f"Crew skill {selected.skill_match_score}%) required for {triage.category_name}, whereas "
                    f"{closest_scored.call_sign} is missing critical items ({', '.join(closest_scored.missing_equipment) or 'lower skill tier'})."
                )
            else:
                explanation = (
                    f"Selected {selected.call_sign} as optimal unit (Score {selected.composite_score}) combining fastest ETA "
                    f"({selected.eta_minutes:.1f}m) with complete equipment & crew capability match."
                )
        else:
            explanation = f"Selected {selected.call_sign} as optimal emergency response unit."

        return AmbulanceAllocationResponse(
            selected_ambulance=selected,
            ranked_candidates=scored_list,
            explanation=explanation,
            audit_factors={
                "weights_applied": weights,
                "triage_esi": triage.esi_level,
                "required_equipment": list(required_eq),
                "min_paramedic_skill": triage.min_paramedic_skill
            }
        )
