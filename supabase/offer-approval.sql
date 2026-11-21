begin;

alter table public.cases
  add column if not exists offer_document_id text,
  add column if not exists offer_approval_limit_eur numeric,
  add column if not exists owner_token text,
  add column if not exists offer_resume_status text;

create unique index if not exists cases_owner_token_idx
  on public.cases (owner_token) where owner_token is not null;

create or replace function public.save_repair_document(
  p_case_id text, p_status text, p_previous_offer text, p_type text,
  p_file_url text, p_number text, p_amount numeric,
  p_offer_limit numeric default null, p_owner_token text default null
) returns setof public.documents
language plpgsql security invoker set search_path = ''
as $$
declare
  current_case public.cases;
  saved public.documents;
begin
  select * into current_case from public.cases where case_id = p_case_id for update;
  if not found or current_case.status is distinct from p_status
    or current_case.offer_document_id is distinct from p_previous_offer then
    return;
  end if;

  if p_type = 'offer' and p_status = 'scheduled' then
    insert into public.documents (case_id, type, file_url, number, amount_eur)
      values (p_case_id, p_type, p_file_url, p_number, p_amount) returning * into saved;
    update public.cases set
      offer_document_id = saved.document_id,
      offer_approval_limit_eur = p_offer_limit,
      owner_token = p_owner_token,
      offer_resume_status = case when p_owner_token is not null then p_status end,
      status = case when p_owner_token is not null then 'awaiting_approval' else p_status end,
      approval = case
        when p_owner_token is not null then 'pending'
        when current_case.approval = 'owner' then 'auto'
        else current_case.approval
      end
      where case_id = p_case_id;
  elsif p_type = 'invoice' and p_status in ('scheduled', 'dispatched') then
    insert into public.documents (case_id, type, file_url, number, amount_eur, billed_to)
      values (p_case_id, p_type, p_file_url, p_number, p_amount,
        case when current_case.approval = 'owner' then 'owner' else 'reltix' end)
      returning * into saved;
    update public.cases set status = 'completed' where case_id = p_case_id;
  else
    return;
  end if;
  return next saved;
end;
$$;

revoke all on function public.save_repair_document(text, text, text, text, text, text, numeric, numeric, text)
  from public, anon, authenticated;
grant execute on function public.save_repair_document(text, text, text, text, text, text, numeric, numeric, text)
  to service_role;

commit;
