/**
 * Deterministic Rules-Based Fallback Engine
 * Activated automatically if AI/ML Microservice is unreachable or degraded.
 * Follows Manchester Triage System (MTS) and Emergency Severity Index (ESI) protocols.
 */

export class FallbackRulesEngine {
  static calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  static classifyTriage(request) {
    const text = `${request.chiefComplaint || ''} ${(request.symptoms || []).join(' ')}`.toLowerCase();
    const isUnconscious = request.conscious === false;
    const isNotBreathing = request.breathing === false;
    const hasSevereBleed = request.severeBleeding === true;

    let esi = 4;
    let color = 'Green';
    let category = 'Less Urgent';
    let score = 30.0;
    let specialties = [];
    let equipment = ['Oxygen_Supply', 'First_Aid_Kit'];
    let minSkill = 'Basic';
    let firstAidKey = 'general_comfort';
    const reasons = [];

    // Life threat check
    if (isUnconscious || isNotBreathing || text.includes('cardiac arrest') || text.includes('no pulse')) {
      esi = 1;
      color = 'Red';
      category = 'Resuscitation (Immediate Life Threat)';
      score = 95.0;
      specialties = ['Cardiology', 'Cath_Lab', 'Critical_Care'];
      equipment = ['Ventilator', 'Defibrillator', '12-Lead ECG', 'Suction'];
      minSkill = 'Critical_Care';
      firstAidKey = 'cpr_cardiac';
      reasons.push('Unconscious / respiratory or cardiac arrest protocol');
    } else if (
      text.includes('chest pain') ||
      text.includes('heart attack') ||
      text.includes('stroke') ||
      text.includes('paralysis') ||
      hasSevereBleed
    ) {
      esi = 2;
      color = 'Orange';
      category = 'Emergent (High Risk / Potential Threat)';
      score = 75.0;
      minSkill = 'Advanced';

      if (text.includes('stroke') || text.includes('face droop')) {
        specialties = ['Neurology', 'Stroke_Unit'];
        equipment = ['12-Lead ECG', 'Oxygen_Supply'];
        firstAidKey = 'stroke_fast';
        reasons.push('Suspected acute stroke symptoms');
      } else if (text.includes('chest pain')) {
        specialties = ['Cardiology', 'Cath_Lab'];
        equipment = ['12-Lead ECG', 'Defibrillator', 'Oxygen_Supply'];
        firstAidKey = 'chest_pain';
        reasons.push('Suspected acute coronary syndrome');
      } else if (hasSevereBleed) {
        specialties = ['Trauma_Surgery'];
        equipment = ['Trauma_Pack', 'Immobilization_Kit', 'IV_Infusion'];
        firstAidKey = 'severe_bleeding';
        reasons.push('Uncontrolled arterial/severe hemorrhage');
      }
    } else if (text.includes('fracture') || text.includes('asthma') || text.includes('severe pain')) {
      esi = 3;
      color = 'Yellow';
      category = 'Urgent';
      score = 50.0;
      minSkill = 'Advanced';
      equipment = ['Immobilization_Kit', 'Oxygen_Supply'];
      reasons.push('Urgent symptoms requiring multi-resource emergency evaluation');
    }

    // Check age
    if (request.patientAge && request.patientAge < 12) {
      specialties.push('Pediatrics');
      equipment.push('Pediatric_Kit');
    }

    return {
      esi_level: esi,
      triage_color: color,
      category_name: category,
      severity_score: score,
      recommended_specialties: [...new Set(specialties)],
      required_equipment: [...new Set(equipment)],
      min_paramedic_skill: minSkill,
      first_aid_guidance_key: firstAidKey,
      clinical_flags: reasons,
      confidence: 0.88,
      explanation: `[Rules Fallback] Triaged to ESI ${esi} (${category}) based on deterministic clinical guidelines: ${reasons.join('; ')}.`,
      engine: 'rules_fallback',
    };
  }

  static allocateAmbulance(triage, incidentLoc, ambulances) {
    const scored = ambulances.map((amb) => {
      const dist = this.calculateHaversineDistanceKm(
        amb.location?.latitude || amb.latitude,
        amb.location?.longitude || amb.longitude,
        incidentLoc.latitude,
        incidentLoc.longitude
      );

      const speed = (amb.location?.speedKmH || amb.speedKmH || 45) / (amb.trafficDelayFactor || 1.0);
      const eta = Math.max(1.0, (dist / speed) * 60);

      const ambEquipment = amb.equipment || [];
      const required = triage.required_equipment || [];
      const missing = required.filter((eq) => !ambEquipment.includes(eq));

      // Proximity is paramount: nearest ambulance in local sector is always prioritized
      let score = 100 - (dist * 4.5) - (eta * 2.0);
      if (dist > 30) {
        score -= 500; // Strongly disfavor cross-sector/distant units
      }
      if (missing.length > 0) {
        score -= missing.length * 15;
      }
      if (triage.esi_level <= 2 && amb.ambulanceType === 'BLS') {
        score -= 25; // BLS penalty for critical cases
      }

      return {
        id: amb._id ? amb._id.toString() : amb.id,
        call_sign: amb.callSign || amb.call_sign,
        composite_score: Math.round(Math.max(5, score) * 10) / 10,
        eta_minutes: Math.round(eta * 10) / 10,
        distance_km: Math.round(dist * 10) / 10,
        missing_equipment: missing,
        selection_rationale: `Rules Fallback: ETA ${eta.toFixed(1)}m, ${missing.length ? 'Missing ' + missing.join(', ') : 'Fully equipped'}`,
      };
    });

    scored.sort((a, b) => b.composite_score - a.composite_score);
    scored.forEach((s, idx) => (s.rank = idx + 1));

    const selected = scored[0];
    return {
      selected_ambulance: selected,
      ranked_candidates: scored,
      explanation: `[Rules Fallback Engine] Selected ${selected.call_sign} based on deterministic ETA, required life-support equipment match, and traffic weighting.`,
      engine: 'rules_fallback',
    };
  }

  static recommendHospital(triage, incidentLoc, hospitals) {
    const scored = hospitals.map((hosp) => {
      const dist = this.calculateHaversineDistanceKm(
        hosp.location?.latitude || hosp.latitude,
        hosp.location?.longitude || hosp.longitude,
        incidentLoc.latitude,
        incidentLoc.longitude
      );

      const eta = Math.max(2.0, (dist / 40) * 60);
      const specs = hosp.specialtiesAvailable || hosp.specialties_available || [];
      const requiredSpecs = triage.recommended_specialties || [];
      const matched = requiredSpecs.filter((s) => specs.includes(s));

      const erAvailable = hosp.erBedsAvailable ?? hosp.er_beds_available ?? 5;
      const icuAvailable = hosp.icuBedsAvailable ?? hosp.icu_beds_available ?? 2;
      const isDiverted = hosp.diversionStatus || hosp.diversion_status || (erAvailable === 0);

      let score = Math.max(10, 100 - eta * 2.5);
      score += matched.length * 15;
      if (triage.esi_level <= 2 && icuAvailable === 0) {
        score -= 40;
      }
      if (isDiverted) {
        score -= 50;
      }

      return {
        id: hosp._id ? hosp._id.toString() : hosp.id,
        name: hosp.name,
        composite_score: Math.round(Math.max(5, score) * 10) / 10,
        eta_minutes: Math.round(eta * 10) / 10,
        distance_km: Math.round(dist * 10) / 10,
        is_diversion_recommended: isDiverted,
        matched_specialties: matched,
        selection_rationale: `Rules Fallback: Beds ER ${erAvailable}/ICU ${icuAvailable}, ETA ${eta.toFixed(1)}m`,
      };
    });

    scored.sort((a, b) => b.composite_score - a.composite_score);
    scored.forEach((s, idx) => (s.rank = idx + 1));

    const selected = scored[0];
    return {
      recommended_hospital: selected,
      ranked_hospitals: scored,
      diversion_warnings: scored.filter((h) => h.is_diversion_recommended).map((h) => `${h.name} on diversion`),
      explanation: `[Rules Fallback Engine] Recommended ${selected.name} based on emergency capacity and clinical specialties.`,
      engine: 'rules_fallback',
    };
  }
}
