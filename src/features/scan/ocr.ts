import { recognizeText } from '@infinitered/react-native-mlkit-text-recognition';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** ML Kit reads small print best around this size; bigger only costs time and memory. */
const LONG_SIDE = 1600;

export type Rect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

/**
 * Crops and shrinks the photo, reads its text on the phone, then deletes every image file, the original too.
 * The preview comes back as an in-memory data URI so the result screen can show it without a file.
 */
export async function readPhoto(uri: string, size: { width: number; height: number }, crop?: Rect) {
  let saved: string | undefined;
  try {
    const { width, height } = crop ?? size;
    const ctx = ImageManipulator.manipulate(uri);
    if (crop) ctx.crop(crop);
    if (Math.max(width, height) > LONG_SIDE) ctx.resize(width >= height ? { width: LONG_SIDE } : { height: LONG_SIDE });
    const image = await ctx.renderAsync();
    const result = await image.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.8,
      base64: true,
    });
    saved = result.uri;
    const { text } = await recognizeText(result.uri);
    return { text, preview: `data:image/jpeg;base64,${result.base64}` };
  } finally {
    for (const u of [uri, saved]) {
      try {
        if (u) new File(u).delete();
      } catch {
        // Already gone; nothing left to delete.
      }
    }
  }
}

/**
 * Maps the on-screen box to photo pixels. The preview fills the view like `cover`: scaled up and centred, with the
 * overflow cut off, so the box is shifted by half the overflow and divided by the scale.
 * `pad` (screen px) widens it on every side: words touching the box edge were cut in half and OCR dropped them.
 */
export function boxToPhoto(
  box: Rect,
  view: { width: number; height: number },
  photo: { width: number; height: number },
  pad = 24,
): Rect {
  const scale = Math.max(view.width / photo.width, view.height / photo.height);
  const dx = (photo.width * scale - view.width) / 2;
  const dy = (photo.height * scale - view.height) / 2;
  const left = Math.max(0, Math.round((box.originX - pad + dx) / scale));
  const top = Math.max(0, Math.round((box.originY - pad + dy) / scale));
  const right = Math.min(photo.width, Math.round((box.originX + box.width + pad + dx) / scale));
  const bottom = Math.min(photo.height, Math.round((box.originY + box.height + pad + dy) / scale));
  return { originX: left, originY: top, width: right - left, height: bottom - top };
}
