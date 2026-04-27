import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { SparklesIcon } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

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
  {
    label: 'Shred Lord',
    subtitle: 'Your buddy is getting seriously jacked.',
    pepTalk: 'Control the reps, own the grind.',
  },
  {
    label: 'Legendary Bro',
    subtitle: 'Peak buff mode unlocked.',
    pepTalk: 'You are the spotter now.',
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getStageIndex(level: number) {
  const normalizedLevel = Math.max(1, level);
  if (normalizedLevel <= 3) {
    return 0;
  }

  if (normalizedLevel <= 6) {
    return 1;
  }

  if (normalizedLevel <= 10) {
    return 2;
  }

  if (normalizedLevel <= 15) {
    return 3;
  }

  return 4;
}

function BuddyIllustration({ level }: { level: number }) {
  const stageIndex = getStageIndex(level);
  const muscleScale = clamp(0.82 + level * 0.022, 0.82, 1.35);
  const shoulderRx = 16 * muscleScale;
  const torsoWidth = 32 * muscleScale;
  const armRadius = 8 * muscleScale;
  const legWidth = 8 * muscleScale;
  const hasAbs = stageIndex >= 2;
  const hasSparkles = stageIndex >= 3;
  const hasAura = stageIndex >= 4;
  const eyeOffset = stageIndex >= 3 ? 0 : 1;

  return (
    <Svg width={220} height={240} viewBox="0 0 220 240" fill="none">
      <Ellipse cx={110} cy={218} rx={56} ry={12} fill="hsl(214 24% 82%)" opacity={0.65} />

      <Circle cx={110} cy={48} r={24} fill="hsl(34 80% 74%)" />
      <Circle cx={100} cy={46 + eyeOffset} r={2.5} fill="hsl(220 35% 16%)" />
      <Circle cx={120} cy={46 + eyeOffset} r={2.5} fill="hsl(220 35% 16%)" />
      <Path
        d={
          stageIndex >= 2
            ? 'M100 58 C105 64, 115 64, 120 58'
            : 'M101 60 C106 56, 114 56, 119 60'
        }
        stroke="hsl(220 35% 16%)"
        strokeWidth={2.2}
        strokeLinecap="round"
      />

      <G>
        <Ellipse cx={110} cy={82} rx={shoulderRx} ry={11} fill="hsl(16 77% 53%)" />
        <Rect
          x={110 - torsoWidth / 2}
          y={84}
          width={torsoWidth}
          height={58}
          rx={16}
          fill="hsl(16 80% 56%)"
        />

        <Circle cx={74} cy={106} r={armRadius} fill="hsl(16 77% 53%)" />
        <Circle cx={146} cy={106} r={armRadius} fill="hsl(16 77% 53%)" />

        <Rect x={82} y={95} width={10} height={42} rx={6} fill="hsl(16 75% 50%)" />
        <Rect x={128} y={95} width={10} height={42} rx={6} fill="hsl(16 75% 50%)" />

        {hasAbs ? (
          <G opacity={0.75}>
            <Line x1={110} y1={96} x2={110} y2={136} stroke="hsl(0 0% 100%)" strokeWidth={1.8} />
            <Line x1={98} y1={106} x2={122} y2={106} stroke="hsl(0 0% 100%)" strokeWidth={1.5} />
            <Line x1={98} y1={118} x2={122} y2={118} stroke="hsl(0 0% 100%)" strokeWidth={1.5} />
            <Line x1={98} y1={130} x2={122} y2={130} stroke="hsl(0 0% 100%)" strokeWidth={1.5} />
          </G>
        ) : null}
      </G>

      <Rect x={96} y={142} width={28} height={17} rx={6} fill="hsl(214 24% 30%)" />
      <Rect x={90} y={157} width={legWidth} height={42} rx={5} fill="hsl(215 82% 43%)" />
      <Rect x={220 - 90 - legWidth} y={157} width={legWidth} height={42} rx={5} fill="hsl(215 82% 43%)" />
      <Rect x={86} y={195} width={16} height={8} rx={3} fill="hsl(220 35% 14%)" />
      <Rect x={118} y={195} width={16} height={8} rx={3} fill="hsl(220 35% 14%)" />

      {hasSparkles ? (
        <G>
          <Path d="M42 62 L46 72 L56 76 L46 80 L42 90 L38 80 L28 76 L38 72 Z" fill="hsl(36 92% 56%)" opacity={0.9} />
          <Path d="M176 82 L179 90 L188 93 L179 96 L176 104 L173 96 L164 93 L173 90 Z" fill="hsl(36 92% 56%)" opacity={0.9} />
        </G>
      ) : null}

      {hasAura ? (
        <Circle cx={110} cy={112} r={88} stroke="hsl(36 92% 56%)" strokeWidth={3} opacity={0.35} />
      ) : null}
    </Svg>
  );
}

export function VirtualMuscleBuddy({
  level,
  totalXp,
  currentStreak,
  progressToNextLevel,
  xpToNextLevel,
}: VirtualMuscleBuddyProps) {
  const stage = STAGES[getStageIndex(level)];
  const idleLift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(idleLift, {
          toValue: -7,
          duration: 1300,
          useNativeDriver: true,
        }),
        Animated.timing(idleLift, {
          toValue: 0,
          duration: 1300,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [idleLift]);

  const nextLevelSummary = useMemo(() => {
    if (xpToNextLevel === null) {
      return 'Max level reached. Keep stacking workout XP.';
    }

    return `${xpToNextLevel} XP to level up`;
  }, [xpToNextLevel]);

  return (
    <Card className="overflow-hidden border-primary/35 bg-card">
      <View className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-primary/10" />
      <View className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-accent/35" />

      <CardHeader className="gap-2 pb-3">
        <CardTitle className="text-2xl">Your Virtual Muscle Buddy</CardTitle>
        <CardDescription>Train together. Feed it XP. Watch it evolve.</CardDescription>
      </CardHeader>

      <CardContent className="gap-4 pb-6">
        <View className="items-center justify-center rounded-2xl border border-border/70 bg-muted/45 py-4">
          <Animated.View style={{ transform: [{ translateY: idleLift }] }}>
            <BuddyIllustration level={level} />
          </Animated.View>
        </View>

        <View className="flex-row flex-wrap items-center gap-2">
          <Badge>
            <Icon as={SparklesIcon} size={12} className="text-primary-foreground" />
            <Text>{stage.label}</Text>
          </Badge>
          <Badge variant="secondary">
            <Text>Level {level}</Text>
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
      </CardContent>
    </Card>
  );
}
