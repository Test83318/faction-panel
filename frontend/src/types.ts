export interface Role {
  id: number;
  name: string;
  weight: number;
  color: string;
  type: 'primary' | 'secondary';
  faction_id: number;
  permissions?: any[];
}

export interface Member {
  id: string;
  rank: string;
  name: string;
  position: string;
  callsign: string;
  isAlt?: boolean;
  isNpc?: boolean;
  isActing?: boolean;
  rankColor?: string;
}

export interface Unit {
  id: string;
  name: string;
  members: Member[];
}

export interface Bureau {
  id: string;
  name: string;
  color: string;
  leadership: Member[];
  units: Unit[];
}

export interface Division {
  id: string;
  name: string;
  color: string;
  leadership: Member[];
  bureaus: Bureau[];
}

export interface RosterContent {
  id: number;
  section_id: number;
  roster_id?: number;
  order: number;
  type: 'predefined' | 'defined' | 'spacer';
  color?: string | null;
  content: any;
  updated_at?: string;
  editing_by?: number | null;
  editing_at?: string | null;
  editing_col?: string | null;
  editor?: {
    id: number;
    username: string;
  };
}

export interface RosterColumn {
  id: string;
  name: string;
  type: string;
  options?: any[];
  checkboxes?: any[];
  tags?: any[];
  flags?: number[];
  flag_settings?: any;
  dataset_id?: number | null;
  source_column_id?: string | null;
  linked_database_id?: number | null;
  data_field_id?: string | null;
  database_field_id?: string | null;
}

export interface RosterSection {
  id: number;
  roster_id: number;
  name: string;
  image_url?: string | null;
  shortname: string;
  color?: string;
  type: 'master' | 'section' | 'subsection' | 'content';
  order: number;
  parent_id?: number | null;
  section_options?: any;
  columns?: RosterColumn[] | null;
  use_roster_columns?: boolean;
  layout_settings?: any;
  subsections_per_row?: number;
  content_html?: string | null;
  children?: RosterSection[];
  contents?: RosterContent[];
}

export interface Roster {
  id: number;
  faction_id: number;
  name: string;
  shortname: string;
  color: string;
  order: number;
  roster_options: any;
  columns?: RosterColumn[] | null;
  layout_settings?: any;
  default_sections_per_row?: number;
  root_sections?: RosterSection[];
}

export interface Group {
  id: number;
  faction_id: number;
  name: string;
  color: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  members?: any[];
  leaders?: any[];
}

export interface RosterPermission {
  id: number;
  roster_id: number;
  group_id: number | null;
  role_id: number | null;
  permissions: string[];
  group?: Group;
  role?: Role;
}

export interface FactionRecordDatabase {
  id: number;
  faction_id: number;
  name: string;
  description: string | null;
  allow_details_view: boolean;
  data_overview_display: string;
  data_entry_display: string;
  record_shortcode: string | null;
  database_structure: any[];
  permissions: any;
  is_api_database: boolean;
  is_published: boolean;
  created_by: number;
  creator?: {
    id: number;
    username: string;
  };
}

export interface RosterDatasetOption {
    id?: number;
    value: string;
    color: string | null;
    is_bold: boolean;
    order: number;
}

export interface RosterDataset {
    id: number;
    name: string;
    record_database_id: number | null;
    record_database?: FactionRecordDatabase;
    options: RosterDatasetOption[];
}

export interface FactionRecordPermission {
  id: number;
  database_id: number;
  group_id: number | null;
  role_id: number | null;
  permissions: string[];
  group?: Group;
  role?: Role;
}

export interface MembershipTier {
  id: number;
  name: string;
  max_factions: number;
  allow_custom_branding: boolean;
  users_count?: number;
}

export interface User {
  id: number;
  username: string;
  gtaw_id: number | null;
  gtaw_username: string | null;
  is_superadmin: boolean;
  membership_tier_id: number | null;
  membership_tier?: MembershipTier;
  max_factions: number;
  allow_custom_branding: boolean;
  factions_count?: number;
  roles?: Role[];
}

export interface HelpCategory {
  id: number;
  name: string;
  icon: string | null;
  order: number;
  articles_count?: number;
  articles?: HelpArticle[];
}

export interface HelpArticle {
  id: number;
  category_id: number;
  title: string;
  slug: string;
  content: string;
  order: number;
  is_published: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  category?: HelpCategory;
}

export interface StatisticsModel {
  id: number;
  faction_id: number;
  name: string;
  description: string | null;
  created_by: number;
  widgets_count?: number;
  widgets?: StatisticsWidget[];
  creator?: {
    id: number;
    username: string;
  };
  user_permissions?: {
    view_statistics: boolean;
    modify_statistics: boolean;
    delete_statistics: boolean;
  };
}

export interface StatisticsWidget {
  id: number;
  statistics_model_id: number;
  name: string;
  type: 'pie' | 'bar' | 'line' | 'table';
  configuration: any;
  cache_result: any;
  last_calculated_at: string | null;
  is_intensive: boolean;
  order: number;
  width: number;
}

export interface StatisticsPermission {
  id: number;
  statistics_model_id: number;
  group_id: number | null;
  role_id: number | null;
  permissions: string[];
  group?: Group;
  role?: Role;
}

export interface Faction {
  id: number;
  name: string;
  shortname: string;
  color: string;
  image_url: string | null;
  header_image: string | null;
  favicon: string | null;
  visibility: 'public' | 'hidden' | 'private';
  access: 'joinable' | 'invite-only' | 'private';
  gtaw_faction_id: number | null;
  faction_leader: number;
  allow_branding: boolean;
  quick_search_enabled: boolean;
  quick_search_settings?: {
    database_id: number | null;
    column_id: string | null;
    exact_match_only: boolean;
  };
  roster_template?: any;
  leader?: User;
  users_count?: number;
}
