import { requireNativeModule } from 'expo-modules-core';

export type WidgetStoragePreparationResult = {
  databaseDirectory?: string;
};

type DoneYetWidgetNativeModule = {
  prepareWidgetStorage: () => Promise<WidgetStoragePreparationResult>;
  writeWidgetSnapshot: (snapshotJson: string) => Promise<void>;
  reloadWidgets: () => Promise<void>;
};

let nativeModule: DoneYetWidgetNativeModule | null | undefined;

function getNativeModule(): DoneYetWidgetNativeModule | null {
  if (nativeModule !== undefined) {
    return nativeModule;
  }

  try {
    nativeModule = requireNativeModule<DoneYetWidgetNativeModule>('DoneYetWidget');
  } catch {
    nativeModule = null;
  }

  return nativeModule;
}

export async function prepareWidgetStorage(): Promise<WidgetStoragePreparationResult> {
  return (await getNativeModule()?.prepareWidgetStorage()) ?? {};
}

export async function writeWidgetSnapshot(snapshotJson: string): Promise<void> {
  await getNativeModule()?.writeWidgetSnapshot(snapshotJson);
}

export async function reloadWidgets(): Promise<void> {
  await getNativeModule()?.reloadWidgets();
}
