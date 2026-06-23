-- 007_revenue_share_referral.sql
-- 수수료 쉐어(Revenue Share) 레퍼럴 시스템
-- 추천인(크리에이터)이 피추천인(다른 크리에이터)의 수수료 수익 일부를 평생 받는 구조

-- ============================================
-- 1. creators 테이블에 revenue share 설정 추가
-- ============================================
alter table creators
  -- 크리에이터 간 레퍼럴: 이 크리에이터를 추천한 크리에이터 ID
  add column if not exists referred_by_creator_id uuid references creators(id) on delete set null,
  -- 크리에이터가 revenue share 레퍼럴 프로그램에 참여하는지
  add column if not exists revenue_share_enabled boolean not null default true,
  -- 추천인에게 줄 수수료 쉐어 비율 (기본 20%)
  add column if not exists revenue_share_pct integer not null default 20 check (revenue_share_pct >= 0 and revenue_share_pct <= 50),
  -- 누적 revenue share 지급 총액 (TON)
  add column if not exists total_revenue_share_paid_ton numeric(18,9) not null default 0,
  -- 미지급 revenue share 잔액 (TON) - 출금 전 적립액
  add column if not exists pending_revenue_share_ton numeric(18,9) not null default 0;

-- ============================================
-- 2. revenue_share_earnings 테이블
-- 추천인의 수익 적립 내역을 기록
-- ============================================
create table if not exists revenue_share_earnings (
  id uuid primary key default uuid_generate_v4(),
  -- 수익을 받는 추천인 크리에이터
  earner_creator_id uuid references creators(id) on delete cascade not null,
  -- 수익을 발생시킨 피추천 크리에이터
  source_creator_id uuid references creators(id) on delete cascade not null,
  -- 수익의 원천이 된 결제
  payment_id uuid references payments(id) on delete cascade not null,
  -- 피추천 크리에이터가 번 수수료 (fee_ton)
  source_fee_ton numeric(18,9) not null,
  -- 추천인에게 지급되는 쉐어 금액 (TON)
  share_ton numeric(18,9) not null,
  -- 쉐어 비율 (%)
  share_pct integer not null,
  -- 지급 상태
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'cancelled')),
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- ============================================
-- 3. creator_referral_links 테이블
-- 크리에이터가 다른 크리에이터를 초대할 때 사용하는 링크
-- ============================================
create table if not exists creator_referral_links (
  id uuid primary key default uuid_generate_v4(),
  -- 초대하는 크리에이터 (추천인)
  referrer_creator_id uuid references creators(id) on delete cascade not null,
  -- 초대 코드 (고유)
  invite_code text unique not null,
  -- 이 링크를 통해 가입한 크리에이터 수
  signup_count integer not null default 0,
  -- 이 링크로 발생한 누적 수익 (TON)
  total_earned_ton numeric(18,9) not null default 0,
  created_at timestamptz default now()
);

-- ============================================
-- 4. 인덱스
-- ============================================
create index if not exists idx_revenue_share_earnings_earner on revenue_share_earnings(earner_creator_id);
create index if not exists idx_revenue_share_earnings_source on revenue_share_earnings(source_creator_id);
create index if not exists idx_revenue_share_earnings_payment on revenue_share_earnings(payment_id);
create index if not exists idx_revenue_share_earnings_status on revenue_share_earnings(status);
create index if not exists idx_creator_referral_links_code on creator_referral_links(invite_code);
create index if not exists idx_creator_referral_links_referrer on creator_referral_links(referrer_creator_id);
create index if not exists idx_creators_referred_by on creators(referred_by_creator_id);

-- ============================================
-- 5. RLS 정책
-- ============================================
alter table revenue_share_earnings enable row level security;
alter table creator_referral_links enable row level security;

create policy "Service role full access on revenue_share_earnings"
  on revenue_share_earnings for all using (true) with check (true);

create policy "Service role full access on creator_referral_links"
  on creator_referral_links for all using (true) with check (true);

-- ============================================
-- 6. revenue share 적립 함수
-- 결제 승인 시 호출: 추천인에게 수수료 쉐어 적립
-- ============================================
create or replace function process_revenue_share(p_payment_id uuid)
returns void as $$
declare
  v_payment payments%rowtype;
  v_source_creator creators%rowtype;
  v_earner_creator creators%rowtype;
  v_share_ton numeric(18,9);
begin
  -- 결제 정보 조회
  select * into v_payment from payments where id = p_payment_id;
  if not found then return; end if;

  -- 피추천 크리에이터 조회
  select * into v_source_creator from creators where id = v_payment.creator_id;
  if not found then return; end if;

  -- 추천인이 없으면 종료
  if v_source_creator.referred_by_creator_id is null then return; end if;

  -- 추천인 크리에이터 조회
  select * into v_earner_creator from creators where id = v_source_creator.referred_by_creator_id;
  if not found then return; end if;

  -- revenue share가 비활성화된 경우 종료
  if not v_earner_creator.revenue_share_enabled then return; end if;

  -- 쉐어 금액 계산 (수수료의 revenue_share_pct%)
  v_share_ton := v_payment.fee_ton * v_earner_creator.revenue_share_pct / 100.0;
  if v_share_ton <= 0 then return; end if;

  -- 중복 적립 방지 (같은 payment에 대해 이미 적립된 경우)
  if exists (
    select 1 from revenue_share_earnings
    where payment_id = p_payment_id
      and earner_creator_id = v_earner_creator.id
  ) then return; end if;

  -- 수익 적립 기록 삽입
  insert into revenue_share_earnings (
    earner_creator_id,
    source_creator_id,
    payment_id,
    source_fee_ton,
    share_ton,
    share_pct,
    status
  ) values (
    v_earner_creator.id,
    v_source_creator.id,
    p_payment_id,
    v_payment.fee_ton,
    v_share_ton,
    v_earner_creator.revenue_share_pct,
    'pending'
  );

  -- 추천인의 미지급 잔액 업데이트
  update creators
  set pending_revenue_share_ton = pending_revenue_share_ton + v_share_ton
  where id = v_earner_creator.id;

  -- 초대 링크의 누적 수익 업데이트
  update creator_referral_links
  set total_earned_ton = total_earned_ton + v_share_ton
  where referrer_creator_id = v_earner_creator.id;

end;
$$ language plpgsql security definer;

-- ============================================
-- 7. 추천인 통계 뷰
-- ============================================
create or replace view creator_revenue_share_stats as
select
  c.id as earner_creator_id,
  c.telegram_id,
  -- 추천한 크리에이터 수
  (select count(*) from creators where referred_by_creator_id = c.id) as referred_creators_count,
  -- 활성 피추천 크리에이터 수
  (select count(*) from creators where referred_by_creator_id = c.id and is_active = true) as active_referred_count,
  -- 누적 적립액
  coalesce(sum(e.share_ton), 0) as total_earned_ton,
  -- 미지급 잔액
  c.pending_revenue_share_ton,
  -- 누적 지급액
  c.total_revenue_share_paid_ton,
  -- 이번 달 수익
  coalesce(sum(case when e.created_at >= date_trunc('month', now()) then e.share_ton else 0 end), 0) as this_month_earned_ton,
  -- 이번 달 발생 건수
  count(case when e.created_at >= date_trunc('month', now()) then 1 end) as this_month_count
from creators c
left join revenue_share_earnings e on e.earner_creator_id = c.id
group by c.id, c.telegram_id, c.pending_revenue_share_ton, c.total_revenue_share_paid_ton;
