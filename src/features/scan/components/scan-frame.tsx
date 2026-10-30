import { useRef } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/text';

import type { Rect } from '../ocr';

const MIN_W = 120;
const MIN_H = 60;
/** Corner marks sit just outside the box, 4px away like the design's 4px stroke. */
const MARK = 32;
const GAP = 4;

type Corner = 'tl' | 'tr' | 'bl' | 'br';
const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br'];
const MARK_CLASS: Record<Corner, string> = {
  tl: 'border-l-4 border-t-4 rounded-tl-md',
  tr: 'border-r-4 border-t-4 rounded-tr-md',
  bl: 'border-b-4 border-l-4 rounded-bl-md',
  br: 'border-b-4 border-r-4 rounded-br-md',
};
const LABELS: Record<Corner, string> = {
  tl: 'Top left',
  tr: 'Top right',
  bl: 'Bottom left',
  br: 'Bottom right',
};

type Props = {
  box: Rect;
  onChange: (box: Rect) => void;
  /** The area the box can move in (the camera preview). */
  bounds: { width: number; height: number };
};

/** Dims everything outside the box; drag a corner to resize it (min 120×60). Positions are data, so they use `style`. */
export function ScanFrame({ box, onChange, bounds }: Props) {
  const right = box.originX + box.width;
  const bottom = box.originY + box.height;
  return (
    <View className="absolute inset-0" pointerEvents="box-none">
      <View
        pointerEvents="none"
        className="absolute left-0 right-0 top-0 bg-paper/55"
        style={{ height: box.originY }}
      />
      <View pointerEvents="none" className="absolute bottom-0 left-0 right-0 bg-paper/55" style={{ top: bottom }} />
      <View
        pointerEvents="none"
        className="absolute left-0 bg-paper/55"
        style={{ top: box.originY, height: box.height, width: box.originX }}
      />
      <View
        pointerEvents="none"
        className="absolute right-0 bg-paper/55"
        style={{ top: box.originY, height: box.height, left: right }}
      />
      {CORNERS.map((c) => (
        <Handle key={c} corner={c} box={box} onChange={onChange} bounds={bounds} />
      ))}
      <View pointerEvents="none" className="absolute left-0 right-0 items-center" style={{ top: bottom + MARK }}>
        <Text variant="small" className="rounded-full bg-paper/80 px-4 py-2 font-medium">
          Drag the corners to adjust
        </Text>
      </View>
    </View>
  );
}

function Handle({ corner, box, onChange, bounds }: Props & { corner: Corner }) {
  // Where the drag started: the box then, and the finger then.
  const start = useRef({ box, x: 0, y: 0 });
  const move = (dx: number, dy: number) => {
    const s = start.current.box;
    let left = s.originX;
    let top = s.originY;
    let r = s.originX + s.width;
    let btm = s.originY + s.height;
    if (corner[1] === 'l') left = clamp(left + dx, 0, r - MIN_W);
    else r = clamp(r + dx, left + MIN_W, bounds.width);
    if (corner[0] === 't') top = clamp(top + dy, 0, btm - MIN_H);
    else btm = clamp(btm + dy, top + MIN_H, bounds.height);
    onChange({ originX: left, originY: top, width: r - left, height: btm - top });
  };

  const x = corner[1] === 'l' ? box.originX - GAP - MARK : box.originX + box.width + GAP;
  const y = corner[0] === 't' ? box.originY - GAP - MARK : box.originY + box.height + GAP;
  return (
    // 44×44 touch target around the 32px mark.
    <View
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => {
        start.current = { box, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      }}
      onResponderMove={(e) => move(e.nativeEvent.pageX - start.current.x, e.nativeEvent.pageY - start.current.y)}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={`${LABELS[corner]} corner of the scan box`}
      hitSlop={6}
      className="absolute h-8 w-8"
      style={{ left: x, top: y }}>
      <View className={`h-8 w-8 border-ink ${MARK_CLASS[corner]}`} />
    </View>
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
