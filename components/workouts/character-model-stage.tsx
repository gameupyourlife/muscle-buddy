import { Text } from '@/components/ui/text';
import CharacterViewerCanvas from '@/components/workouts/character-viewer-canvas';
import { loadCharacterModelUri } from '@/lib/workouts/character-assets';
import type { CharacterModelAssetId } from '@/lib/workouts/character';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';

type CharacterModelStageProps = {
  assetId: CharacterModelAssetId;
  modelLabel: string;
  appearance?: 'light' | 'dark';
  className?: string;
  height?: number;
};

export function CharacterModelStage({
  assetId,
  modelLabel,
  appearance: appearanceOverride,
  className,
  height = 320,
}: CharacterModelStageProps) {
  const [modelUri, setModelUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const appearance = appearanceOverride ?? (colorScheme === 'dark' ? 'dark' : 'light');

  useEffect(() => {
    let isMounted = true;

    setErrorMessage(null);

    loadCharacterModelUri(assetId)
      .then((uri) => {
        if (isMounted) {
          setModelUri(uri);
        }
      })
      .catch((error) => {
        console.error('Could not prepare character model asset:', assetId, error);
        if (isMounted) {
          setErrorMessage('The 3D model could not be prepared.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [assetId]);

  return (
    <View
      className={
        className ?? 'h-[320px] overflow-hidden rounded-xl border border-border/70 bg-card'
      }
      style={{ borderCurve: 'continuous' }}>
      {modelUri ? (
        <CharacterViewerCanvas
          modelUri={modelUri}
          modelLabel={modelLabel}
          appearance={appearance}
          dom={{
            scrollEnabled: false,
            useExpoDOMWebView: true,
            originWhitelist: ['*'],
            allowFileAccess: true,
            allowUniversalAccessFromFileURLs: true,
            style: {
              width: '100%',
              height,
              backgroundColor: 'transparent',
            },
          }}
        />
      ) : (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          {errorMessage ? null : <ActivityIndicator />}
          <Text className="text-center text-sm text-muted-foreground">
            {errorMessage ?? 'Loading 3D model...'}
          </Text>
        </View>
      )}
    </View>
  );
}
