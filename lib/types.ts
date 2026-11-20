export type Property = {
  property_id: string;
  address: string;
  postcode: string;
  city: string;
  building_year: number | null;
  heating: "central" | "per_flat" | null;
  fuel: "gas" | "oil" | "district" | "heat_pump" | null;
  energy_certificate: { class: string; valid_until: string } | null;
  maintenance_partner_id: string | null;
};

export type Unit = {
  unit_id: string;
  property_id: string;
  floor: number | null;
  size_sqm: number | null;
  rooms: number | null;
  access_notes: string | null;
};

export type Contact = {
  contact_id: string;
  name: string;
  role: "owner" | "tenant" | "caretaker";
  email: string | null;
  phone: string | null;
  language: string | null;
  unit_id: string | null;
  move_in: string | null;
};

export type Partner = {
  partner_id: string;
  name: string;
  category: string;
  trades: string[];
  fuels: string[];
  postcodes: string[];
  response_time_h: number | null;
  rating: number | null;
  callout_fee_eur: number | null;
  hourly_rate_eur: number | null;
  job_channel: string | null;
  offer_channel: string | null;
  phone: string | null;
  email: string | null;
};

export type Slot = {
  slot_id: string;
  partner_id: string;
  slot_start: string;
  slot_end: string;
  booked: boolean;
};

export type CaseRow = {
  case_id: string;
  property_id: string;
  unit_id: string | null;
  contact_id: string | null;
  scope: "unit" | "building";
  category: string;
  urgency: "low" | "normal" | "high" | "emergency";
  status: string;
  symptoms: string | null;
  summary: string | null;
  safety_flags: string[];
  availability_note: string | null;
  reporters: string[];
  partner_id: string | null;
  pick_reasons: string[];
  estimated_cost_eur: number | null;
  approval: string | null;
  slot_id: string | null;
  appointment_start: string | null;
  appointment_end: string | null;
  job_token: string | null;
  job_card: JobCard | null;
  result: Record<string, unknown> | null;
  created_at: string;
  closed_at: string | null;
};

export type JobCard = {
  headline: string;
  problem_summary: string;
  urgency_reason: string;
  checklist: string[];
};

export type EventRow = {
  event_id: number;
  case_id: string | null;
  unit_id: string | null;
  type: string;
  actor: string;
  channel: string | null;
  text: string | null;
  occurred_at: string;
};
