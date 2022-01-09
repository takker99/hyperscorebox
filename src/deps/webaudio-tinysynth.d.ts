/// <reference no-default-lib="true" />
/// <reference lib="esnext" />
/// <reference lib="dom" />

export class WebAudioTinySynth {
  constructor(options?: Options);
  public getAudioContext(): AudioContext;
  public setAudioContext(
    audioContext: AudioContext,
    destinationNode?: AudioDestinationNode,
  ): void;
  public getTimbreName(m: 0 | 1, n: number): void;
  public setQuality(q: 0 | 1): void;
  public setMasterVol(lev: number): void;
  public setReverbLev(lev: number): void;
  public loadMIDI(mididata: ArrayBuffer): void;
  public playMIDI(): void;
  public stopMIDI(): void;
}

export interface Options {
  useReverb?: 0 | 1;
  quality?: 0 | 1;
  voices?: number;
}
