-- Seed for the demo. Built on Reltix's sample payload (unit_4b, Musterstraße 12, Aachen)
-- plus what Reltix confirmed on site (approval limit, WhatsApp, gas/oil, invoices) and our own synthetic data.
-- Safe to run twice. Free slots are created relative to "now" (re-create them anytime via /api/admin/reset).

-- Reltix's craftsmen list (synthetic firms)
insert into partners (partner_id, name, category, trades, fuels, postcodes, response_time_h, rating, callout_fee_eur, hourly_rate_eur, job_channel, offer_channel, phone, email) values
  ('p_schmidt', 'Heizung Schmidt GmbH', 'heating',  '{heating,plumbing}', '{gas}', '{52062,52064,52066}', 4, 4.6, 59, 78, 'whatsapp', 'email', '+49 151 00000101', 'auftrag@heizung-schmidt.example'),
  ('p_klein',   'Klein Haustechnik',    'heating',  '{heating}',          '{gas}', '{52062,52068,52070}', 2, 4.3, 69, 82, 'whatsapp', 'email', '+49 151 00000102', 'info@klein-haustechnik.example'),
  ('p_meyer',   'Ölheizung Meyer',      'heating',  '{heating}',          '{oil}', '{52062,52064}',       6, 4.5, 65, 80, 'whatsapp', 'email', '+49 151 00000103', 'service@oel-meyer.example'),
  ('p_fibre',   'Example Fibre GmbH',   'internet', '{internet}',         '{}',    '{52062}',             null, null, null, null, 'api', 'email', null, 'orders@examplefibre.example')
on conflict (partner_id) do nothing;

-- Reltix's sample building
insert into properties (property_id, address, postcode, city, building_year, heating, fuel, energy_certificate, maintenance_partner_id) values
  ('prop_musterstr12', 'Musterstraße 12', '52062', 'Aachen', 1972, 'central', 'gas', '{"class": "E", "valid_until": "2029-03-31"}', 'p_schmidt')
on conflict (property_id) do nothing;

insert into units (unit_id, property_id, floor, size_sqm, rooms, meters, access_notes) values
  ('unit_1a', 'prop_musterstr12', 0, 54, 2, '[]', 'Ground floor left. Key safe by the cellar door, code 4711.'),
  ('unit_1b', 'prop_musterstr12', 0, 61, 2, '[]', 'Ground floor right. Tenant usually home after 16:00.'),
  ('unit_2a', 'prop_musterstr12', 1, 72, 3, '[]', '1st floor left. Key safe by the cellar door, code 4711. Boiler room key: caretaker Herr Brandt, +49 151 00000301.'),
  ('unit_2b', 'prop_musterstr12', 1, 58, 2, '[]', '1st floor right.'),
  ('unit_4a', 'prop_musterstr12', 2, 75, 3, '[]', '2nd floor left.'),
  ('unit_4b', 'prop_musterstr12', 2, 68, 3, '[{"type": "electricity", "number": "1ESY1160123456"}]', '2nd floor right.')
on conflict (unit_id) do nothing;

insert into contacts (contact_id, name, role, email, phone, language, unit_id, move_in) values
  ('c_101', 'Maria Becker',   'owner',     'maria.becker@example.com',   '+49 151 00000001', 'de', null,      null),
  ('c_202', 'Lena Hoffmann',  'tenant',    'lena@example.com',           '+49 151 00000000', 'de', 'unit_4b', '2026-12-01'),
  ('c_203', 'Jonas Weber',    'tenant',    'jonas.weber@example.com',    '+49 151 00000203', 'de', 'unit_2a', '2021-04-01'),
  ('c_204', 'Aylin Demir',    'tenant',    'aylin.demir@example.com',    '+49 151 00000204', 'en', 'unit_1a', '2023-09-01'),
  ('c_205', 'Piotr Nowak',    'tenant',    'piotr.nowak@example.com',    '+49 151 00000205', 'en', 'unit_1b', '2022-02-01'),
  ('c_206', 'Sophie Laurent', 'tenant',    'sophie.laurent@example.com', '+49 151 00000206', 'de', 'unit_2b', '2024-06-01'),
  ('c_207', 'Thomas Wagner',  'tenant',    'thomas.wagner@example.com',  '+49 151 00000207', 'de', 'unit_4a', '2019-11-01'),
  ('c_301', 'Herr Brandt',    'caretaker', 'brandt@example.com',         '+49 151 00000301', 'de', null,      null)
on conflict (contact_id) do nothing;

insert into contracts (contract_id, type, property_id, unit_id, contact_id, partner_id, rent_cold_eur, approval_limit_eur, start_date, terms) values
  ('lease_4b',      'lease',      'prop_musterstr12', 'unit_4b', 'c_202', null,        780,  null, '2026-12-01', '{}'),
  ('lease_2a',      'lease',      'prop_musterstr12', 'unit_2a', 'c_203', null,        840,  null, '2021-04-01', '{}'),
  ('lease_1a',      'lease',      'prop_musterstr12', 'unit_1a', 'c_204', null,        610,  null, '2023-09-01', '{}'),
  ('lease_1b',      'lease',      'prop_musterstr12', 'unit_1b', 'c_205', null,        660,  null, '2022-02-01', '{}'),
  ('lease_2b',      'lease',      'prop_musterstr12', 'unit_2b', 'c_206', null,        640,  null, '2024-06-01', '{}'),
  ('lease_4a',      'lease',      'prop_musterstr12', 'unit_4a', 'c_207', null,        820,  null, '2019-11-01', '{}'),
  -- Reltix confirmed: managers decide alone up to a limit agreed per owner (most often €3–4k). €3,500 is our synthetic pick.
  ('mgmt_becker',   'management', 'prop_musterstr12', null,      'c_101', null,        null, 3500, '2024-01-01', '{"owner_approval_above_limit": true}'),
  ('svc_schmidt',   'service',    'prop_musterstr12', null,      null,    'p_schmidt', null, null, '2024-01-01', '{"scope": "annual boiler maintenance"}'),
  ('fw_schmidt',    'framework',  null,               null,      null,    'p_schmidt', null, null, '2024-01-01', '{"callout_fee_eur": 59, "hourly_rate_eur": 78}'),
  ('fw_klein',      'framework',  null,               null,      null,    'p_klein',   null, null, '2025-03-01', '{"callout_fee_eur": 69, "hourly_rate_eur": 82}'),
  ('fw_meyer',      'framework',  null,               null,      null,    'p_meyer',   null, null, '2024-06-01', '{"callout_fee_eur": 65, "hourly_rate_eur": 80}')
on conflict (contract_id) do nothing;

-- Two closed heating cases, so history and ratings aren't empty
insert into cases (case_id, property_id, unit_id, contact_id, scope, category, urgency, status, symptoms, summary, partner_id, approval, estimated_cost_eur, appointment_start, appointment_end, created_at, closed_at) values
  ('hist_2025_01', 'prop_musterstr12', 'unit_1b', 'c_205', 'building', 'heating', 'high',   'closed', 'No heating in the whole building', 'Burner fault, ignition electrode replaced', 'p_schmidt', 'auto', 400, '2025-01-14 10:00+01', '2025-01-14 12:00+01', '2025-01-14 07:30+01', '2025-01-14 12:10+01'),
  ('hist_2025_12', 'prop_musterstr12', 'unit_4a', 'c_207', 'unit',     'heating', 'normal', 'closed', 'Radiators lukewarm in the living room', 'Air in the radiators, system bled and pressure topped up', 'p_schmidt', 'auto', 250, '2025-12-03 14:00+01', '2025-12-03 15:00+01', '2025-12-02 18:05+01', '2025-12-03 15:20+01')
on conflict (case_id) do nothing;

insert into documents (document_id, case_id, type, number, amount_eur, billed_to) values
  ('doc_hist_1', 'hist_2025_01', 'invoice', 'R-2025-0114', 286.40, 'reltix'),
  ('doc_hist_2', 'hist_2025_12', 'invoice', 'R-2025-1203', 131.90, 'reltix')
on conflict (document_id) do nothing;

-- Free slots for the next days (Berlin time). Day 0 = today if it's before 10:00, otherwise tomorrow.
insert into availability (slot_id, partner_id, slot_start, slot_end)
select v.slot_id, v.partner_id,
       (d.day0 + v.s) at time zone 'Europe/Berlin',
       (d.day0 + v.e) at time zone 'Europe/Berlin'
from (
  select date_trunc('day', now() at time zone 'Europe/Berlin')
         + case when extract(hour from now() at time zone 'Europe/Berlin') < 10 then interval '0 days' else interval '1 day' end as day0
) d,
(values
  ('s_schmidt_1', 'p_schmidt', interval '12 hours',        interval '14 hours'),
  ('s_schmidt_2', 'p_schmidt', interval '16 hours',        interval '18 hours'),
  ('s_schmidt_3', 'p_schmidt', interval '1 day 10 hours',  interval '1 day 12 hours'),
  ('s_klein_1',   'p_klein',   interval '10 hours',        interval '12 hours'),
  ('s_klein_2',   'p_klein',   interval '14 hours',        interval '16 hours'),
  ('s_meyer_1',   'p_meyer',   interval '9 hours',         interval '11 hours')
) as v(slot_id, partner_id, s, e)
on conflict (slot_id) do nothing;
