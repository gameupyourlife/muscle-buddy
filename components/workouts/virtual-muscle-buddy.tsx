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
import {
  CheckCircle2Icon,
  DumbbellIcon,
  FlameIcon,
  MedalIcon,
  ShirtIcon,
  SlidersHorizontalIcon,
  SparklesIcon,
  TrophyIcon,
  ZapIcon,
} from 'lucide-react-native';
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

function BuddyMetric({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: typeof SparklesIcon;
  tone?: 'default' | 'primary' | 'accent';
}) {
  const toneClass = {
    default: 'bg-muted/60 border-border/70',
    primary: 'bg-primary/10 border-primary/20',
    accent: 'bg-foreground/[0.04] border-border/70',
  }[tone];

  const iconClass = tone === 'primary' ? 'text-primary' : 'text-muted-foreground';

  return (
    <View
      className={`min-w-[96px] flex-1 gap-2 rounded-xl border px-3 py-3 ${toneClass}`}
      style={{ borderCurve: 'continuous' }}>
      <View className="flex-row items-center gap-2">
        <Icon as={icon} size={14} className={iconClass} />
        <Text className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </Text>
      </View>
      <Text className="text-lg font-bold text-foreground" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Text>
    </View>
  );
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
  const model = useMemo(
    () => resolveCharacterModel(characterSelection, level),
    [characterSelection, level]
  );
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
      <View
        className="overflow-hidden rounded-2xl border border-border/70 bg-card"
        style={{
          borderCurve: 'continuous',
          boxShadow: '0 18px 44px rgba(15, 23, 42, 0.13)',
        }}>
        <View className="gap-4 p-4 pb-3">
          <View className="flex-row items-start justify-between gap-3">
            <View className="min-w-0 flex-1 gap-1">
              <View className="flex-row items-center gap-2">
                <View className="bg-primary/12 h-8 w-8 items-center justify-center rounded-full">
                  <Icon as={DumbbellIcon} size={16} className="text-primary" />
                </View>
                <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  MuscleBuddy
                </Text>
              </View>
              <Text className="text-3xl font-bold leading-tight text-foreground">
                Your Virtual Muscle Buddy
              </Text>
              <Text className="text-sm leading-5 text-muted-foreground">
                Train together, stack XP, and keep your buddy evolving.
              </Text>
            </View>

            <Badge className="mt-1">
              <Icon as={SparklesIcon} size={12} className="text-primary-foreground" />
              <Text>{stage.label}</Text>
            </Badge>
          </View>
        </View>

        <View className="relative">
          <CharacterModelStage
            assetId={model.assetId}
            modelLabel={modelLabel}
            level={model.level}
            height={360}
            className="h-[360px] overflow-hidden border-y border-border/60 bg-background"
          />

          <View className="absolute left-3 right-3 top-3 flex-row flex-wrap items-center gap-2">
            <Badge variant="secondary" className="bg-background/85">
              <Icon as={TrophyIcon} size={12} className="text-foreground" />
              <Text>Level {model.level}</Text>
            </Badge>
            <Badge variant="outline" className="border-border/70 bg-background/85">
              <Icon as={ShirtIcon} size={12} className="text-muted-foreground" />
              <Text>{model.characterLabel}</Text>
            </Badge>
          </View>

          <View
            className="absolute bottom-3 left-3 right-3 gap-2 rounded-xl border border-border/70 bg-background/90 p-3"
            style={{ borderCurve: 'continuous' }}>
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Equipped
                </Text>
                <Text className="text-sm font-semibold text-foreground">{model.itemLabel}</Text>
              </View>
              <Badge variant="outline">
                <Text>{currentStreak} week streak</Text>
              </Badge>
            </View>
          </View>
        </View>

        <View className="gap-4 p-4 pt-3">
          <View className="flex-row flex-wrap gap-2">
            <BuddyMetric label="Level" value={`${model.level}`} icon={MedalIcon} tone="primary" />
            <BuddyMetric label="Total XP" value={`${totalXp}`} icon={ZapIcon} />
            <BuddyMetric
              label="Streak"
              value={`${currentStreak}w`}
              icon={FlameIcon}
              tone="accent"
            />
          </View>

          <View
            className="gap-3 rounded-xl border border-border/70 bg-background/70 p-3"
            style={{ borderCurve: 'continuous' }}>
            <View className="flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-sm font-semibold text-foreground">Next evolution</Text>
                <Text className="text-xs text-muted-foreground">{nextLevelSummary}</Text>
              </View>
              <Text
                className="text-sm font-bold text-primary"
                style={{ fontVariant: ['tabular-nums'] }}>
                {Math.round(progressToNextLevel)}%
              </Text>
            </View>
            <Progress value={progressToNextLevel} className="h-3" />
          </View>

          <View className="rounded-xl bg-primary/10 px-3 py-3">
            <Text className="text-sm font-semibold text-foreground">{stage.pepTalk}</Text>
            <Text className="mt-1 text-xs leading-5 text-muted-foreground">{stage.subtitle}</Text>
          </View>
        </View>
      </View>

      <Collapsible open={isCustomizeOpen} onOpenChange={setIsCustomizeOpen}>
        <CollapsibleTrigger asChild>
          <Button variant={isCustomizeOpen ? 'secondary' : 'outline'} className="w-full">
            <Icon as={SlidersHorizontalIcon} size={16} className="text-foreground" />
            <Text>{isCustomizeOpen ? 'Close Customize Menu' : 'Customize Character'}</Text>
            {isSavingCharacterSelection ? <ActivityIndicator size="small" /> : null}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <View
            className="mt-3 gap-4 rounded-2xl border border-border/70 bg-card p-4"
            style={{ borderCurve: 'continuous' }}>
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
