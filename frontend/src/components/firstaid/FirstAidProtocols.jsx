import React from 'react';
import { ShieldCheck, AlertOctagon, CheckCircle2, XCircle } from 'lucide-react';

export const PROTOCOLS = {
  severe_bleeding: {
    title: 'Severe Bleeding & Hemorrhage Control',
    summary: 'Apply direct hard pressure to prevent hemorrhagic shock until ambulance arrives.',
    color: 'from-rose-900/60 to-slate-900 border-rose-500/40',
    dos: [
      'Apply firm, continuous direct pressure with a clean cloth or gauze directly over wound.',
      'If bleeding does not stop and is spurting from a limb, apply a commercial tourniquet 2-3 inches above wound.',
      'Keep patient warm with a jacket/blanket to prevent hypothermia-induced coagulopathy.',
      'Elevate the injured limb above heart level if no fracture is suspected.',
    ],
    donts: [
      'Do NOT remove gauze if it becomes blood-soaked; add more layers on top and press harder.',
      'Do NOT remove an embedded knife, glass, or object — stabilize it with rolled towels.',
      'Do NOT release a tourniquet once tightened until surgeons take over.',
    ],
  },
  chest_pain: {
    title: 'Acute Chest Pain / Suspected Heart Attack',
    summary: 'Minimize heart oxygen demand while ALS ambulance is en route.',
    color: 'from-amber-900/60 to-slate-900 border-amber-500/40',
    dos: [
      'Have patient sit comfortably upright with knees bent (W-position) to reduce strain on heart.',
      'Loosen tight collars, ties, belts, and tight clothing around chest.',
      'Ask if patient is prescribed Nitroglycerin spray/tablets; assist them in taking it.',
      'Chew 325mg soluble Aspirin if conscious and not allergic, and if authorized by emergency dispatcher.',
    ],
    donts: [
      'Do NOT allow patient to walk or exert themselves physically.',
      'Do NOT give food, water, or caffeinated beverages.',
      'Do NOT leave patient unattended; be prepared to initiate CPR if they become unresponsive.',
    ],
  },
  stroke_fast: {
    title: 'Suspected Stroke / CVA Window Protocol',
    summary: 'Every minute saves 2 million brain cells. Record exact symptom onset time.',
    color: 'from-purple-900/60 to-slate-900 border-purple-500/40',
    dos: [
      'F.A.S.T Check: Face droop, Arm weakness, Slurred speech, Time to call.',
      'Note exact time symptoms started — critical for tPA clot-busting eligibility at hospital.',
      'Keep patient resting flat with head elevated 15-30 degrees.',
      'If vomiting or breathing irregularly, place them into Recovery Position on their side.',
    ],
    donts: [
      'Do NOT give aspirin (could be hemorrhagic stroke and worsen bleeding).',
      'Do NOT give liquids or pills — swallowing reflexes are often paralyzed.',
      'Do NOT let them sleep or delay transport hoping symptoms resolve.',
    ],
  },
  choking_heimlich: {
    title: 'Severe Airway Obstruction / Choking',
    summary: 'Act immediately if patient cannot cough, speak, or breathe.',
    color: 'from-orange-900/60 to-slate-900 border-orange-500/40',
    dos: [
      'Lean patient forward and deliver 5 firm back blows between shoulder blades with heel of hand.',
      'If obstruction remains, perform 5 abdominal thrusts (Heimlich): fist above navel, pull inward and upward.',
      'Repeat cycles of 5 back blows and 5 abdominal thrusts.',
      'If patient becomes unresponsive, lower them gently to floor and begin chest compressions (CPR).',
    ],
    donts: [
      'Do NOT perform blind finger sweeps — it can push the object deeper into the larynx.',
      'Do NOT give water to drink.',
    ],
  },
  burn_treatment: {
    title: 'Major Thermal / Chemical Burn Care',
    summary: 'Cool the burn and protect against infection.',
    color: 'from-red-900/60 to-slate-900 border-red-500/40',
    dos: [
      'Cool the burn immediately with cool clean running water for 20 minutes.',
      'Carefully remove rings, watches, and tight clothing before swelling begins.',
      'Cover burn loosely with clean plastic cling wrap or sterile non-adherent dressing.',
      'Keep patient warm to prevent hypothermia.',
    ],
    donts: [
      'Do NOT apply ice, iced water, butter, oils, or toothpaste to burn tissue.',
      'Do NOT burst or prick any blisters.',
      'Do NOT peel away clothing stuck to charred skin.',
    ],
  },
  general_comfort: {
    title: 'Emergency Scene Stabilization',
    summary: 'Keep patient calm and maintain open airway until sirens arrive.',
    color: 'from-blue-900/60 to-slate-900 border-blue-500/40',
    dos: [
      'Check breathing continuously. If breathing stops, start chest compressions immediately.',
      'Reassure patient calmly that emergency services have been dispatched and are arriving shortly.',
      'Keep patient still and warm.',
      'Clear scene access: unlock front door, turn on porch lights, guide paramedics upon arrival.',
    ],
    donts: [
      'Do NOT move an injured victim unless there is imminent danger of fire or explosion.',
      'Do NOT give medications without dispatcher instructions.',
    ],
  },
};

export const FirstAidProtocols = ({ guidanceKey = 'general_comfort' }) => {
  const protocol = PROTOCOLS[guidanceKey] || PROTOCOLS.general_comfort;

  return (
    <div className={`bg-gradient-to-b ${protocol.color} border rounded-2xl p-5 shadow-xl`}>
      <div className="flex items-center space-x-2.5 mb-2">
        <ShieldCheck className="w-6 h-6 text-cyan-400" />
        <h3 className="text-base font-black text-white">{protocol.title}</h3>
      </div>
      <p className="text-xs text-slate-300 mb-4">{protocol.summary}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* DO LIST */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>DO THIS NOW:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-200">
            {protocol.dos.map((item, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* DONT LIST */}
        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs">
            <XCircle className="w-4 h-4" />
            <span>DO NOT DO THIS:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-200">
            {protocol.donts.map((item, i) => (
              <li key={i} className="flex items-start space-x-2">
                <span className="text-rose-400 font-bold">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
