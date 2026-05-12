import { Asset } from 'expo-asset';
import type { CharacterModelAssetId, CharacterPreviewAssetId } from '@/lib/workouts/character';

const CHARACTER_MODEL_MODULES = {
  male_lvl1_red_headband: require('../../assets/characters/base/male/lvl1_red_headband.glb'),
  male_lvl2_red_headband: require('../../assets/characters/base/male/lvl2_red_headband.glb'),
  male_lvl3_red_headband: require('../../assets/characters/base/male/lvl3_red_headband.glb'),
  female_lvl1_red_headband: require('../../assets/characters/base/female/lvl1_red_headband.glb'),
  female_lvl2_red_headband: require('../../assets/characters/base/female/lvl2_red_headband.glb'),
  female_lvl3_red_headband: require('../../assets/characters/base/female/lvl3_red_headband.glb'),
} as const satisfies Record<CharacterModelAssetId, number>;

const CHARACTER_PREVIEW_MODULES = {
  headband_red: require('../../assets/characters/clothing/head/headband_red.glb'),
} as const satisfies Record<CharacterPreviewAssetId, number>;

async function loadAssetUri(moduleId: number) {
  const asset = Asset.fromModule(moduleId);

  // DOM components run in a WebView. GLTFLoader can fetch the Metro/asset URI,
  // while downloaded file:// cache paths are blocked by the WebView sandbox.
  return asset.uri;
}

export function getCharacterModelModule(assetId: CharacterModelAssetId) {
  return CHARACTER_MODEL_MODULES[assetId];
}

export function getCharacterPreviewModule(assetId: CharacterPreviewAssetId) {
  return CHARACTER_PREVIEW_MODULES[assetId];
}

export async function loadCharacterModelUri(assetId: CharacterModelAssetId) {
  return loadAssetUri(getCharacterModelModule(assetId));
}

export async function loadCharacterPreviewUri(assetId: CharacterPreviewAssetId) {
  return loadAssetUri(getCharacterPreviewModule(assetId));
}
