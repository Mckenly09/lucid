import { boxToPhoto } from './ocr';

jest.mock('@infinitered/react-native-mlkit-text-recognition', () => ({ recognizeText: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: {}, SaveFormat: {} }));
jest.mock('expo-file-system', () => ({ File: jest.fn() }));

const view = { width: 400, height: 800 };

describe('boxToPhoto', () => {
  it('scales up when the photo has the same shape as the view', () => {
    expect(
      boxToPhoto({ originX: 10, originY: 20, width: 100, height: 50 }, view, { width: 1200, height: 2400 }, 0),
    ).toEqual({ originX: 30, originY: 60, width: 300, height: 150 });
  });

  it('adds the cut-off sides when the photo is wider than the view', () => {
    // 3:4 photo in a 1:2 view: scaled by 800/1600 = 0.5 to 600×800, so 100px is cut off each side.
    expect(
      boxToPhoto({ originX: 0, originY: 0, width: 400, height: 100 }, view, { width: 1200, height: 1600 }, 0),
    ).toEqual({ originX: 200, originY: 0, width: 800, height: 200 });
  });

  it('stays inside the photo', () => {
    expect(
      boxToPhoto({ originX: -50, originY: 700, width: 500, height: 200 }, view, { width: 400, height: 800 }, 0),
    ).toEqual({ originX: 0, originY: 700, width: 400, height: 100 });
  });

  it('widens the box by the padding on every side, so edge words are not cut', () => {
    // Default 24px pad, at 3× scale = 72 photo px each side.
    expect(
      boxToPhoto({ originX: 40, originY: 240, width: 320, height: 160 }, view, { width: 1200, height: 2400 }),
    ).toEqual({ originX: 48, originY: 648, width: 1104, height: 624 });
  });

  it('trims the padding at the photo edge instead of shifting the crop', () => {
    expect(boxToPhoto({ originX: 0, originY: 0, width: 200, height: 100 }, view, { width: 400, height: 800 })).toEqual({
      originX: 0,
      originY: 0,
      width: 224,
      height: 124,
    });
  });
});
