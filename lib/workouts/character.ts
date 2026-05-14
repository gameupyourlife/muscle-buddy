export const MAX_BUDDY_LEVEL = 5;

export const CHARACTER_MODELS = {
  male: {
    id: 'male',
    label: 'Male',
  },
  female: {
    id: 'female',
    label: 'Female',
  },
} as const;

export type CharacterId = keyof typeof CHARACTER_MODELS;
export type BuddyLevel = 1 | 2 | 3 | 4 | 5;

export const CHARACTER_ITEM_SLOTS = [
  {
    id: 'head',
    label: 'Headwear',
    defaultItemId: 'headband',
  },
  {
    id: 'top',
    label: 'Top',
    defaultItemId: 'standard',
  },
  {
    id: 'pants',
    label: 'Pants',
    defaultItemId: 'standard',
  },
  {
    id: 'shoes',
    label: 'Shoes',
    defaultItemId: 'standard',
  },
] as const;

export type CharacterSlotId = (typeof CHARACTER_ITEM_SLOTS)[number]['id'];
export type CharacterEquipment = Record<CharacterSlotId, string>;
export type CharacterPreviewAssetId = 'headband_red';
export type CharacterModelAssetId = `${CharacterId}_lvl${BuddyLevel}_red_headband`;

export type CharacterItemOption = {
  id: string;
  label: string;
  description: string;
  modelVariant?: string;
  previewAssetId?: CharacterPreviewAssetId;
};

export type CharacterSelection = {
  characterId: CharacterId;
  equipment: CharacterEquipment;
};

export type CharacterSelectionRecord = {
  characterGender?: unknown;
  equippedHeadItem?: unknown;
  equippedTopItem?: unknown;
  equippedPantsItem?: unknown;
  equippedShoesItem?: unknown;
};

export const CHARACTER_ITEM_OPTIONS = {
  head: [
    {
      id: 'headband',
      label: 'Red Headband',
      description: 'Current headwear option.',
      modelVariant: 'red_headband',
      previewAssetId: 'headband_red',
    },
  ],
  top: [
    {
      id: 'standard',
      label: 'Standard Top',
      description: 'Default character top.',
    },
  ],
  pants: [
    {
      id: 'standard',
      label: 'Standard Pants',
      description: 'Default character pants.',
    },
  ],
  shoes: [
    {
      id: 'standard',
      label: 'Standard Shoes',
      description: 'Default character shoes.',
    },
  ],
} as const satisfies Record<CharacterSlotId, readonly CharacterItemOption[]>;

export const DEFAULT_CHARACTER_EQUIPMENT = CHARACTER_ITEM_SLOTS.reduce((equipment, slot) => {
  equipment[slot.id] = slot.defaultItemId;
  return equipment;
}, {} as CharacterEquipment);

export const DEFAULT_CHARACTER_SELECTION: CharacterSelection = {
  characterId: 'male',
  equipment: DEFAULT_CHARACTER_EQUIPMENT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getBuddyLevel(level: number): BuddyLevel {
  if (!Number.isFinite(level)) {
    return 1;
  }

  const normalizedLevel = Math.trunc(level);

  if (normalizedLevel <= 1) {
    return 1;
  }

  if (normalizedLevel >= MAX_BUDDY_LEVEL) {
    return MAX_BUDDY_LEVEL;
  }

  return normalizedLevel as BuddyLevel;
}

export function getCharacterOptions() {
  return Object.values(CHARACTER_MODELS).map((character) => ({
    value: character.id,
    label: character.label,
  }));
}

export function getCharacterItemOptions(slotId: CharacterSlotId) {
  return CHARACTER_ITEM_OPTIONS[slotId];
}

export function normalizeCharacterId(value: unknown): CharacterId {
  if (typeof value === 'string' && value in CHARACTER_MODELS) {
    return value as CharacterId;
  }

  return DEFAULT_CHARACTER_SELECTION.characterId;
}

export function normalizeCharacterEquipment(value: unknown): CharacterEquipment {
  const source = isRecord(value) ? value : {};
  const equipment = {} as CharacterEquipment;

  for (const slot of CHARACTER_ITEM_SLOTS) {
    const optionId = source[slot.id];
    const options = getCharacterItemOptions(slot.id);
    const hasOption = typeof optionId === 'string' && options.some((option) => option.id === optionId);

    equipment[slot.id] = hasOption ? optionId : slot.defaultItemId;
  }

  return equipment;
}

export function normalizeCharacterSelection(value: unknown): CharacterSelection {
  if (!isRecord(value)) {
    return {
      characterId: DEFAULT_CHARACTER_SELECTION.characterId,
      equipment: { ...DEFAULT_CHARACTER_SELECTION.equipment },
    };
  }

  return {
    characterId: normalizeCharacterId(value.characterId),
    equipment: normalizeCharacterEquipment(value.equipment),
  };
}

export function getCharacterSelectionFromGamification(
  gamification: CharacterSelectionRecord | null | undefined
): CharacterSelection {
  return normalizeCharacterSelection({
    characterId: gamification?.characterGender,
    equipment: {
      head: gamification?.equippedHeadItem,
      top: gamification?.equippedTopItem,
      pants: gamification?.equippedPantsItem,
      shoes: gamification?.equippedShoesItem,
    },
  });
}

export function toCharacterSelectionRecord(selection: unknown) {
  const normalized = normalizeCharacterSelection(selection);

  return {
    characterGender: normalized.characterId,
    equippedHeadItem: normalized.equipment.head,
    equippedTopItem: normalized.equipment.top,
    equippedPantsItem: normalized.equipment.pants,
    equippedShoesItem: normalized.equipment.shoes,
  };
}

export function resolveCharacterModel(selection: unknown, level: number) {
  const normalizedSelection = normalizeCharacterSelection(selection);
  const buddyLevel = getBuddyLevel(level);
  const headOptions = CHARACTER_ITEM_OPTIONS.head;
  const headItem =
    headOptions.find((option) => option.id === normalizedSelection.equipment.head) ??
    headOptions[0];
  const modelVariant = headItem.modelVariant ?? 'red_headband';

  return {
    assetId: `${normalizedSelection.characterId}_lvl${buddyLevel}_${modelVariant}` as CharacterModelAssetId,
    characterLabel: CHARACTER_MODELS[normalizedSelection.characterId].label,
    itemLabel: headItem.label,
    level: buddyLevel,
    selection: normalizedSelection,
  };
}
