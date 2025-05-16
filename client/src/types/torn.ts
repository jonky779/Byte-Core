// Torn API related interfaces

export interface TornApiKey {
  key: string;
  userId: number;
  name: string;
}

export interface TornApiError {
  code: number;
  error: string;
}

// Player Stats
export interface PlayerStats {
  player_id: number;
  name: string;
  level: number;
  status: string;
  job?: {
    position: string;
    company_id: number;
    company_name: string;
  };
  faction?: {
    position: string;
    faction_id: number;
    faction_name: string;
    days_in_faction: number;
  };
  profile_image?: string;
  last_action: {
    status: string;
    timestamp: number;
    relative: string;
  };
  life: {
    current: number;
    maximum: number;
  };
  energy: {
    current: number;
    maximum: number;
  };
  nerve: {
    current: number;
    maximum: number;
  };
  happy: {
    current: number;
    maximum: number;
  };
  stats: {
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    total: number;
  };
  rank: string;
  money: {
    current: number;
    bank: number;
    points: number;
  };
  travel: {
    status: string;
    destination?: string;
    return_time?: string;
  };
}

// Company related interfaces
export interface CompanyEmployee {
  id: number;
  name: string;
  position: string;
  status: "Online" | "Offline" | "Idle" | "Hospital";
  last_action: string;
  days_in_company: number;
  effectiveness: number;
  wage: number;
  nerve: {
    current: number;
    maximum: number;
  };
  energy: {
    current: number;
    maximum: number;
  };
  activity: {
    working: boolean;
    training: boolean;
    traveling: boolean;
  };
}

export interface CompanyPosition {
  id: number;
  name: string;
  description: string;
  required_stats: {
    intelligence: number;
    endurance: number;
    manual_labor: number;
  };
  employees_count: number;
  max_employees: number;
}

export interface CompanyStats {
  popularity: number;
  efficiency: number;
  environment: number;
  profitability: number;
  days_old: number;
  daily_revenue: number;
  weekly_profit: number;
  production_rate: number;
}

export interface CompanyData {
  id: number;
  name: string;
  type: string;
  rating: number;
  employees: {
    current: number;
    max: number;
    list: CompanyEmployee[];
  };
  positions: CompanyPosition[];
  stats: CompanyStats;
}

// Faction related interfaces
export interface FactionMember {
  id: number;
  name: string;
  level: number;
  status: "Online" | "Offline" | "Idle" | "Hospital";
  last_action: string;
  position: string;
  days_in_faction: number;
  xanax_addiction: number;
  energy: {
    current: number;
    maximum: number;
  };
  nerve: {
    current: number;
    maximum: number;
  };
  stats: {
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    total: number;
  };
}

export interface FactionTerritory {
  id: string;
  name: string;
  value: number;
  controlled_since: string;
}

export interface FactionWar {
  faction_id: number;
  faction_name: string;
  start_time: string;
  score: {
    us: number;
    them: number;
  };
  members_attacked: number;
  territories_gained: number;
  territories_lost: number;
}

export interface FactionStats {
  respect: number;
  territories: number;
  members_count: number;
  max_members: number;
  best_chain: number;
  attacks_won: number;
  attacks_lost: number;
  money_balance: number;
  points_balance: number;
}

export interface FactionData {
  id: number;
  name: string;
  tag: string;
  age_days: number;
  leader: {
    id: number;
    name: string;
  };
  co_leaders: {
    id: number;
    name: string;
  }[];
  members: FactionMember[];
  territories: FactionTerritory[];
  wars: {
    active: FactionWar[];
    past: FactionWar[];
  };
  stats: FactionStats;
}

// Bazaar related interfaces
export interface BazaarItem {
  id: number;
  name: string;
  type: string;
  category: string;
  sub_category: string;
  price: number;
  market_price: number;
  quantity: number;
  percentage_below_market: number;
  seller: {
    id: number;
    name: string;
  };
  image_url?: string;
}

export interface BazaarResponse {
  items: BazaarItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    categories: string[];
    types: string[];
    sub_categories: Record<string, string[]>;
  };
}

// Search related interfaces
export interface EmployeeCandidate {
  id: number;
  name: string;
  level: number;
  status: "Online" | "Offline" | "Idle" | "Hospital";
  last_action: string;
  current_company?: {
    id: number;
    name: string;
    position: string;
  };
  stats: {
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    intelligence: number;
    endurance: number;
    manual_labor: number;
    total: number;
  };
  work_stats: {
    intelligence: number;
    endurance: number;
    manual_labor: number;
  };
  suitability_scores: Record<string, number>;
}

export interface FactionCandidate {
  id: number;
  name: string;
  level: number;
  status: "Online" | "Offline" | "Idle" | "Hospital";
  last_action: string;
  current_faction?: {
    id: number;
    name: string;
    position: string;
  };
  days_since_last_faction: number | null;
  stats: {
    strength: number;
    defense: number;
    speed: number;
    dexterity: number;
    total: number;
  };
  travel_state: {
    status: string;
    destination?: string;
    return_time?: string;
  };
  activity: {
    attacks_made: number;
    defends_made: number;
    active_last_week: boolean;
  };
}

// System status interfaces
export interface CrawlerStatus {
  status: string;
  indexed_players: number;
  total_players: number;
  crawl_speed: number;
  next_scan: string;
}

export interface DatabaseStatus {
  status: string;
  player_count: number;
  item_count: number;
  data_size: string;
  queries_today: number;
}

export interface ApiStatus {
  status: string;
  avg_response_time: number;
  uptime_percentage: number;
  calls_per_hour: number;
  rate_limit_available: number;
  last_error_time: string;
}

export interface SystemStatusData {
  crawler: CrawlerStatus;
  database: DatabaseStatus;
  api: ApiStatus;
  last_updated: string;
}

// Item database interfaces
export interface TornItem {
  id: number;
  name: string;
  description: string;
  type: string;
  category: string;
  market_value: number;
  circulation: number;
  image_url?: string;
  stats?: Record<string, any>;
  requirements?: Record<string, any>;
}
