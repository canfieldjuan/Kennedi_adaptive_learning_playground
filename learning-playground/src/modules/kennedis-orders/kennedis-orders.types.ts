export type KennedisOrdersMode =
  | 'free_make'
  | 'single_attribute'
  | 'quantity'
  | 'two_part'
  | 'first_sound_sort'
  | 'fix_order';

export interface BearCafeCharacter {
  id: string;
  name: string;
  icon: string;
  callLine: string;
  happyLine: string;
}

export interface BearCafeFood {
  id: string;
  label: string;
  icon: string;
  first_sound?: string;
}

export interface BearCafeColor {
  id: string;
  label: string;
  value: string;
}

export interface BearCafeDecoration {
  id: string;
  label: string;
  icon: string;
}

export interface BearCafeRequiredOrder {
  food_id?: string;
  food_ids?: string[];
  color_id?: string;
  quantity?: number;
  decoration_id?: string;
}

export interface BearCafeStartingTray {
  foodCounts?: Record<string, number>;
  colorId?: string;
  decorationId?: string;
}

export interface BearCafeContent {
  game: 'kennedis-orders';
  mode: KennedisOrdersMode;
  character: BearCafeCharacter;
  prompt_audio: string;
  order_ticket: string;
  shift_label?: string;
  round_label?: string;
  round_index?: number;
  round_total?: number;
  foods: BearCafeFood[];
  colors?: BearCafeColor[];
  decorations?: BearCafeDecoration[];
  required_order?: BearCafeRequiredOrder;
  starting_tray?: BearCafeStartingTray;
  parent_evidence_summary?: string;
  next_activity_id?: string;
  next_label?: string;
  shift_restart_activity_id?: string;
}

