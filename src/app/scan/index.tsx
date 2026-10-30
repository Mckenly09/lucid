import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, View } from 'react-native';

import { Banner } from '@/components/banner';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { SafeAreaView } from '@/components/screen';
import { Text } from '@/components/text';
import { useColor } from '@/hooks/use-color';
import { cleanScan } from '@/features/scan/clean';
import { ScanFrame } from '@/features/scan/components/scan-frame';
import { boxToPhoto, readPhoto, type Rect } from '@/features/scan/ocr';
import { useScan } from '@/features/scan/store';

const NOT_FOUND = "Couldn't find any text. Try more light and hold the phone still.";

export default function ScanCamera() {
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [view, setView] = useState<{ width: number; height: number } | null>(null);
  const [box, setBox] = useState<Rect | null>(null);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spinner = useColor('ink');

  // The camera (and flash) runs only while this screen is on top, not under the result screen.
  const focused = useIsFocused();
  // Set the moment a photo starts, so a double tap can't take two (state would only update after a render).
  const working = useRef(false);
  const requested = useRef(false);
  const [asked, setAsked] = useState(false);

  // Asked once, when the student first taps the camera button, never at app start (v2.md §1).
  // Android still allows asking after the first "Deny", so without the ref the dialog would pop up again at once.
  useEffect(() => {
    if (requested.current || !permission || permission.granted || !permission.canAskAgain) return;
    requested.current = true;
    void requestPermission().finally(() => setAsked(true));
  }, [permission, requestPermission]);

  type Photo = { uri: string; width: number; height: number; crop?: Rect };
  const read = async (take: () => Promise<Photo | null | undefined>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError(null);
    try {
      const photo = await take();
      if (!photo) return;
      const { text, preview } = await readPhoto(photo.uri, photo, photo.crop);
      const cleaned = cleanScan(text);
      if (cleaned.text.length < 4) return setError(NOT_FOUND);
      useScan.getState().set({ ...cleaned, preview });
      setTorch(false);
      router.push({
        pathname: '/scan/result',
        params: chatId ? { chatId } : {},
      });
    } catch {
      setError(NOT_FOUND);
    } finally {
      working.current = false;
      setBusy(false);
    }
  };

  const shoot = () =>
    read(async () => {
      if (!camera.current || !view || !box) return null;
      const photo = await camera.current.takePictureAsync({ quality: 0.9 });
      return photo && { ...photo, crop: boxToPhoto(box, view, photo) };
    });

  // The system photo picker needs no permission; its native crop lets the student pick one question.
  const pick = () =>
    read(async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        quality: 0.9,
      });
      return picked.canceled ? null : picked.assets[0];
    });

  const denied = permission && !permission.granted && (asked || !permission.canAskAgain);

  return (
    <SafeAreaView className="flex-1 bg-paper">
      <View className="h-14 flex-row items-center justify-between px-1">
        <IconButton accessibilityLabel="Close" onPress={() => router.back()} icon={<Icon name="X" size={24} />} />
        {permission?.granted && (
          <IconButton
            accessibilityLabel={torch ? 'Turn flash off' : 'Turn flash on'}
            onPress={() => setTorch((t) => !t)}
            icon={<Icon name="Zap" size={24} fill={torch} />}
          />
        )}
      </View>
      <Text className="mb-6 mt-2 text-center font-medium">Fit one question inside the box</Text>

      <View
        className="flex-1 overflow-hidden"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setView({ width, height });
          // Start as a wide strip a little above the middle, like the design.
          setBox(
            (b) =>
              b ?? {
                originX: 40,
                originY: height * 0.3,
                width: width - 80,
                height: Math.max(120, height * 0.2),
              },
          );
        }}>
        {permission?.granted ? (
          <>
            {focused && (
              <CameraView ref={camera} style={{ flex: 1 }} facing="back" enableTorch={torch} animateShutter={false} />
            )}
            {view && box && <ScanFrame box={box} onChange={setBox} bounds={view} />}
          </>
        ) : (
          denied && (
            <View className="flex-1 justify-center gap-3 px-4">
              <Banner
                status="warning"
                title="Camera is off for Lucid"
                message="Allow the camera, or choose a photo instead."
              />
              {permission.canAskAgain ? (
                <Button label="Allow camera" variant="outline" onPress={() => void requestPermission()} />
              ) : (
                <Button label="Open settings" variant="outline" onPress={() => void Linking.openSettings()} />
              )}
            </View>
          )
        )}
        {busy && (
          <View className="absolute inset-0 items-center justify-center gap-3 bg-paper/80">
            <ActivityIndicator color={spinner} />
            <Text>Reading the question…</Text>
          </View>
        )}
      </View>

      <View className="gap-4 px-4 pb-4 pt-6">
        {error ? (
          <Banner status="danger" message={error} icon={<Icon name="CircleAlert" size={18} tone="danger" />} />
        ) : (
          <Text variant="small" tone="muted" className="text-center">
            Printed text works best · Reads on your phone
          </Text>
        )}
        <View className="flex-row items-center justify-between">
          <IconButton
            accessibilityLabel="Choose a photo"
            onPress={() => void pick()}
            disabled={busy}
            className="h-12 w-12 rounded-md border border-ink/20 bg-ink/5"
            icon={<Icon name="Image" size={24} />}
          />
          <Pressable
            onPress={() => void shoot()}
            disabled={busy || !permission?.granted}
            accessibilityRole="button"
            accessibilityLabel={error ? 'Retake photo' : 'Take photo'}
            className={`h-20 w-20 items-center justify-center rounded-full border-4 border-ink active:opacity-80 ${busy || !permission?.granted ? 'opacity-40' : ''}`}>
            <View className="h-16 w-16 rounded-full bg-ink" />
          </Pressable>
          {/* Keeps the shutter centred. */}
          <View className="h-12 w-12" />
        </View>
      </View>
    </SafeAreaView>
  );
}
