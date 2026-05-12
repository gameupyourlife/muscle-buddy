import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Icon } from '@/components/ui/icon';
import { OptionChips } from '@/components/ui/option-chips';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { CharacterModelStage } from '@/components/workouts/character-model-stage';
import {
  CHARACTER_ITEM_SLOTS,
  type CharacterSelection,
  type CharacterSlotId,
  getCharacterItemOptions,
  getCharacterOptions,
  normalizeCharacterSelection,
  resolveCharacterModel,
} from '@/lib/workouts/character';
import { CheckCircle2Icon, DumbbellIcon, SlidersHorizontalIcon, SparklesIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

type BuddyStage = {
  label: string;
  subtitle: string;
  pepTalk: string;
};

export type VirtualMuscleBuddyProps = {
  level: number;
  totalXp: number;
  currentStreak: number;
  progressToNextLevel: number;
  xpToNextLevel: number | null;
  characterSelection: CharacterSelection;
  isSavingCharacterSelection?: boolean;
  onCharacterSelectionChange: (selection: CharacterSelection) => void;
};

const STAGES: BuddyStage[] = [
  {
    label: 'Rookie Bro',
    subtitle: 'Learning form and building consistency.',
    pepTalk: 'One more set. You got this.',
  },
  {
    label: 'Gym Rat',
    subtitle: 'Muscles are waking up and confidence is climbing.',
    pepTalk: 'Progress beats perfection.',
  },
  {
    label: 'Iron Beast',
    subtitle: 'Strength and habits are locked in.',
    pepTalk: 'Stay patient, stay strong.',
  },
];

function getStageIndex(level: number) {
  if (level <= 1) {
    return 0;
  }

  if (level <= 2) {
    return 1;
  }

  return 2;
}

function CharacterSlotPicker({
  slotId,
  value,
  onValueChange,
}: {
  slotId: CharacterSlotId;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const slot = CHARACTER_ITEM_SLOTS.find((entry) => entry.id === slotId);
  const options = getCharacterItemOptions(slotId).map((option) => ({
    value: option.id,
    label: option.label,
  }));

  if (!slot) {
    return null;
  }

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {slot.label}
      </Text>
      <OptionChips
        items={options}
        value={value}
        size="sm"
        layout="wrap"
        onValueChange={onValueChange}
      />
    </View>
  );
}

export function VirtualMuscleBuddy({
  level,
  totalXp,
  currentStreak,
  progressToNextLevel,
  xpToNextLevel,
  characterSelection,
  isSavingCharacterSelection = false,
  onCharacterSelectionChange,
}: VirtualMuscleBuddyProps) {
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const model = useMemo(() => resolveCharacterModel(characterSelection, level), [characterSelection, level]);
  const stage = STAGES[getStageIndex(model.level)];
  const modelLabel = `${model.characterLabel} - ${model.itemLabel}`;
  const characterOptions = useMemo(getCharacterOptions, []);
  const normalizedSelection = model.selection;

  const nextLevelSummary = useMemo(() => {
    if (xpToNextLevel === null) {
      return 'Max level reached. Keep stacking workout XP.';
    }

    return `${xpToNextLevel} XP to level up`;
  }, [xpToNextLevel]);

  const updateCharacter = (characterId: string) => {
    onCharacterSelectionChange(
      normalizeCharacterSelection({
        characterId,
        equipment: normalizedSelection.equipment,
      })
    );
  };

  const updateEquipment = (slotId: CharacterSlotId, itemId: string) => {
    onCharacterSelectionChange(
      normalizeCharacterSelection({
        characterId: normalizedSelection.characterId,
        equipment: {
          ...normalizedSelection.equipment,
          [slotId]: itemId,
        },
      })
    );
  };

  return (
    <View className="gap-4 p-4">
      <View className="gap-2">
        <Text className="text-2xl font-semibold text-foreground">Your Virtual Muscle Buddy</Text>
        <Text className="text-sm text-muted-foreground">
          Train together. Feed it XP. Watch it evolve.
        </Text>
      </View>

      <CharacterModelStage assetId={model.assetId} modelLabel={modelLabel} level={model.level} />

      <View className="flex-row flex-wrap items-center gap-2">
        <Badge>
          <Icon as={SparklesIcon} size={12} className="text-primary-foreground" />
          <Text>{stage.label}</Text>
        </Badge>
        <Badge variant="secondary">
          <Text>Level {model.level}</Text>
        </Badge>
        <Badge variant="outline">
          <Text>{model.characterLabel}</Text>
        </Badge>
        <Badge variant="outline">
          <Text>{currentStreak} week streak</Text>
        </Badge>
      </View>

      <View className="gap-1">
        <Text className="text-sm text-muted-foreground">{stage.subtitle}</Text>
        <Text className="text-sm font-semibold text-foreground">{stage.pepTalk}</Text>
      </View>

      <View className="gap-2 rounded-xl border border-border/70 bg-background/65 p-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-muted-foreground">Total XP</Text>
          <Text className="text-sm font-semibold">{totalXp}</Text>
        </View>
        <Progress value={progressToNextLevel} className="h-2.5" />
        <Text className="text-xs text-muted-foreground">{nextLevelSummary}</Text>
      </View>

      <Collapsible open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <Icon as={SlidersHorizontalIcon} size={16} className="text-foreground" />
            <Text>{isCustomizeOpen ? 'Close Customize Menu' : 'Customize Character'}</Text>
            {isSavingCharacterSelection ? <ActivityIndicator size="small" /> : null}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <View className="mt-3 gap-4 rounded-xl border border-border/70 bg-background/65 p-3">
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <Icon as={DumbbellIcon} size={14} className="text-muted-foreground" />
                <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Character
                </Text>
              </View>
              <OptionChips
                items={characterOptions}
                value={normalizedSelection.characterId}
                layout="wrap"
                size="sm"
                onValueChange={updateCharacter}
              />
            </View>

            {CHARACTER_ITEM_SLOTS.map((slot) => (
              <CharacterSlotPicker
                key={slot.id}
                slotId={slot.id}
                value={normalizedSelection.equipment[slot.id]}
                onValueChange={(itemId) => updateEquipment(slot.id, itemId)}
              />
            ))}

            <View className="flex-row items-center gap-2 rounded-lg bg-primary/10 px-3 py-2">
              <Icon as={CheckCircle2Icon} size={14} className="text-primary" />
              <Text className="text-xs text-primary">
                Equipped: {model.characterLabel}, {model.itemLabel}
              </Text>
            </View>
          </View>
        </CollapsibleContent>
      </Collapsible>
    </View>
  );
}
