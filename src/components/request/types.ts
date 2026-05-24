export type Lead = {
  id: string;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string;
  city_slug: string;
  township_slug?: string | null;
  address: string | null;
  service_type_id: string;
  urgency: string;
  preferred_date: string | null;
  preferred_time: string | null;
  short_description: string;
  full_description: string | null;
  status: string;
  created_at: string;
  budget_min: number | null;
  budget_max: number | null;
};

export type Quote = {
  id: string;
  lead_id: string;
  provider_id: string;
  amount: number;
  notes: string | null;
  eta_text: string | null;
  status: string;
  created_at: string;
  provider?: { business_name: string | null; rating_avg: number | null } | null;
};

export type Booking = {
  id: string;
  lead_id: string;
  quote_id: string | null;
  provider_id: string;
  customer_id: string;
  amount: number | null;
  scheduled_at: string | null;
  status: string;
  time_confirmed_by_customer?: boolean | null;
  time_confirmed_by_provider?: boolean | null;
  customer_confirmed_at?: string | null;
  provider_confirmed_at?: string | null;
};

export type Msg = {
  id: string;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string;
};

export type T = (en: string, my: string) => string;