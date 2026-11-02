/**
 * Audio plumbing for the Live API: the server wants 16 kHz 16-bit PCM in and sends 24 kHz PCM out.
 * We do this ourselves instead of using the SDK's startAudioConversation(), because that helper
 * consumes the session's message stream and we need it for transcripts.
 */

const WORKLET = `
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super()
    this.ratio = sampleRate / 16000
    this.acc = 0
    this.sum = 0
    this.count = 0
    this.out = new Int16Array(1600) // 100 ms at 16 kHz
    this.n = 0
    this.sq = 0
  }
  process(inputs) {
    const ch = inputs[0] && inputs[0][0]
    if (!ch) return true
    for (let i = 0; i < ch.length; i++) {
      // Box-filter downsample to 16 kHz.
      this.sum += ch[i]
      this.count++
      this.acc += 1
      if (this.acc >= this.ratio) {
        this.acc -= this.ratio
        const v = Math.max(-1, Math.min(1, this.sum / this.count))
        this.sum = 0
        this.count = 0
        this.sq += v * v
        this.out[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff
        if (this.n === this.out.length) {
          const rms = Math.sqrt(this.sq / this.n)
          this.port.postMessage({ pcm: this.out.buffer, rms }, [this.out.buffer])
          this.out = new Int16Array(1600)
          this.n = 0
          this.sq = 0
        }
      }
    }
    return true
  }
}
registerProcessor('pcm-capture', PcmCapture)
`

export interface MicChunk {
  /** base64 PCM16 LE, 16 kHz mono */
  base64: string
  rms: number
}

export class MicCapture {
  private ctx?: AudioContext
  private stream?: MediaStream
  private node?: AudioWorkletNode

  async start(onChunk: (chunk: MicChunk) => void) {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
    })
    this.ctx = new AudioContext()
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
    try {
      await this.ctx.audioWorklet.addModule(url)
    } finally {
      URL.revokeObjectURL(url)
    }
    const source = this.ctx.createMediaStreamSource(this.stream)
    this.node = new AudioWorkletNode(this.ctx, 'pcm-capture')
    this.node.port.onmessage = (e: MessageEvent<{ pcm: ArrayBuffer; rms: number }>) => {
      onChunk({ base64: toBase64(e.data.pcm), rms: e.data.rms })
    }
    source.connect(this.node)
    await this.ctx.resume()
  }

  async stop() {
    this.node?.port.close()
    this.node?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    await this.ctx?.close().catch(() => {})
    this.ctx = this.stream = this.node = undefined
  }
}

/** 100 ms of 16 kHz silence: sent while muted so the server's turn detection still sees time pass. */
export const SILENCE_CHUNK = toBase64(new Int16Array(1600).buffer)

export class PcmPlayer {
  private ctx: AudioContext
  private gain: GainNode
  private nextTime = 0
  private sources = new Set<AudioBufferSourceNode>()
  onPlayingChange?: (playing: boolean) => void

  constructor() {
    this.ctx = new AudioContext({ sampleRate: 24000 })
    this.gain = this.ctx.createGain()
    this.gain.connect(this.ctx.destination)
  }

  /** Must run inside a user gesture on iOS/Safari. */
  async unlock() {
    await this.ctx.resume()
  }

  get playing() {
    return this.sources.size > 0
  }

  setVolume(v: number) {
    this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05)
  }

  enqueue(base64: string, mimeType = 'audio/pcm;rate=24000') {
    const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000)
    const bytes = fromBase64(base64)
    const pcm = new Int16Array(bytes, 0, bytes.byteLength >> 1)
    if (pcm.length === 0) return
    const buffer = this.ctx.createBuffer(1, pcm.length, rate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < pcm.length; i++) data[i] = pcm[i] / 0x8000

    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    src.connect(this.gain)
    const startAt = Math.max(this.ctx.currentTime + 0.02, this.nextTime)
    src.start(startAt)
    this.nextTime = startAt + buffer.duration

    const wasPlaying = this.playing
    this.sources.add(src)
    if (!wasPlaying) this.onPlayingChange?.(true)
    src.onended = () => {
      this.sources.delete(src)
      if (!this.playing) this.onPlayingChange?.(false)
    }
  }

  /** Barge-in: the learner started talking, drop whatever the tutor hadn't said yet. */
  flush() {
    for (const s of this.sources) {
      s.onended = null
      try {
        s.stop()
      } catch {
        /* already stopped */
      }
    }
    const was = this.playing
    this.sources.clear()
    this.nextTime = 0
    if (was) this.onPlayingChange?.(false)
  }

  async close() {
    this.flush()
    await this.ctx.close().catch(() => {})
  }
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(s)
}

function fromBase64(b64: string): ArrayBuffer {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes.buffer
}
