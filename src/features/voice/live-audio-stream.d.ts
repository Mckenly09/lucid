// The package ships types under another module name ("react-native-live-audio-stream"), so TypeScript can't find them.
declare module '@fugood/react-native-audio-pcm-stream' {
  type Options = {
    sampleRate: number;
    channels: number;
    bitsPerSample: number;
    audioSource?: number;
    wavFile: string;
    bufferSize?: number;
  };
  const LiveAudioStream: {
    init: (options: Options) => void;
    start: () => void;
    // Android's native stop() is void (iOS returns a promise), so callers can't rely on a promise.
    stop: () => void;
    on: (event: 'data', callback: (base64: string) => void) => { remove: () => void };
  };
  export default LiveAudioStream;
}
