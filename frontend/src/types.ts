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

export interface RosterSection {
  id: number;
  roster_id: number;
  name: string;
  shortname: string;
  color: string | null;
  type: 'master' | 'section' | 'subsection';
  order: number;
  parent_id: number | null;
  section_options: any;
  children?: RosterSection[];
}

export interface Roster {
  id: number;
  faction_id: number;
  name: string;
  shortname: string;
  color: string;
  order: number;
  roster_options: any;
  root_sections?: RosterSection[];
}

export interface Faction {
  id: string;
  name: string;
  divisions: Division[];
}
