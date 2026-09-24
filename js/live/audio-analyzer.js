(function (global) {
  "use strict";

  function rmsOf(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  function median(nums) {
    const arr = nums.filter((n) => Number.isFinite(n)).slice().sort((a, b) => a - b);
    if (!arr.length) return null;
    const mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }

  /** FFT 主頻 + 拋物線內插 */
  function estimatePitchFft(floatFreq, sampleRate, fftSize, minHz, maxHz) {
    const minBin = Math.max(2, Math.floor((minHz * fftSize) / sampleRate));
    const maxBin = Math.min(floatFreq.length - 2, Math.ceil((maxHz * fftSize) / sampleRate));
    let peak = -1;
    let peakVal = -Infinity;
    for (let i = minBin; i <= maxBin; i++) {
      if (floatFreq[i] > peakVal) {
        peakVal = floatFreq[i];
        peak = i;
      }
    }
    if (peak < 0 || peakVal < -78) return { hz: null, confidence: 0 };

    const y1 = floatFreq[peak - 1];
    const y2 = floatFreq[peak];
    const y3 = floatFreq[peak + 1];
    const denom = y1 - 2 * y2 + y3;
    const delta = Math.abs(denom) > 1e-6 ? 0.5 * (y1 - y3) / denom : 0;
    const refined = (peak + delta) * sampleRate / fftSize;
    const confidence = Math.min(1, Math.max(0, (peakVal + 90) / 35));
    return { hz: refined, confidence };
  }

  /** 自相關（備援） */
  function estimatePitchAuto(timeBuf, sampleRate, minHz, maxHz) {
    const size = timeBuf.length;
    const rms = rmsOf(timeBuf);
    if (rms < 0.006) return { hz: null, confidence: 0 };

    const minLag = Math.floor(sampleRate / maxHz);
    const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(size / 2));
    if (maxLag <= minLag) return { hz: null, confidence: 0 };

    let bestLag = -1;
    let bestCorr = 0;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let corr = 0;
      const n = size - lag;
      for (let i = 0; i < n; i++) corr += timeBuf[i] * timeBuf[i + lag];
      corr /= n;
      if (corr > bestCorr) {
        bestCorr = corr;
        bestLag = lag;
      }
    }
    if (bestLag <= 0 || bestCorr < rms * rms * 0.75) return { hz: null, confidence: 0 };
    return {
      hz: sampleRate / bestLag,
      confidence: Math.min(1, bestCorr / (rms * rms + 1e-6) * 0.45)
    };
  }

  function combinePitch(fftRes, autoRes) {
    if (fftRes.hz == null && autoRes.hz == null) return { hz: null, confidence: 0 };
    if (fftRes.hz != null && autoRes.hz != null) {
      const diff = Math.abs(fftRes.hz - autoRes.hz) / Math.max(fftRes.hz, autoRes.hz);
      if (diff < 0.06) {
        return {
          hz: fftRes.hz * 0.65 + autoRes.hz * 0.35,
          confidence: Math.min(1, (fftRes.confidence + autoRes.confidence) * 0.55)
        };
      }
      return fftRes.confidence >= autoRes.confidence ? fftRes : autoRes;
    }
    return fftRes.hz != null ? fftRes : autoRes;
  }

  function LiveAudioAnalyzer(options) {
    this.options = Object.assign(
      {
        fftSize: 4096,
        smoothing: 0.65,
        minHz: 80,
        maxHz: 2200,
        smoothWindow: 7
      },
      options || {}
    );
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
    this.running = false;
    this.timeBuf = null;
    this.freqByteBuf = null;
    this.freqFloatBuf = null;
    this.hzHistory = [];
    this.calScale = 1;
    this.calOffset = 0;
    this._loadCalibration();
  }

  LiveAudioAnalyzer.prototype._loadCalibration = function _loadCalibration() {
    try {
      const raw = sessionStorage.getItem("jpwn.audioCal");
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Number.isFinite(data.scale) && data.scale > 0.5 && data.scale < 1.5) {
        this.calScale = data.scale;
      }
      if (Number.isFinite(data.offset)) this.calOffset = data.offset;
    } catch (err) {
      /* ignore */
    }
  };

  LiveAudioAnalyzer.prototype.saveCalibration = function saveCalibration(scale, offset) {
    this.calScale = scale;
    this.calOffset = offset || 0;
    try {
      sessionStorage.setItem(
        "jpwn.audioCal",
        JSON.stringify({ scale: this.calScale, offset: this.calOffset, t: Date.now() })
      );
    } catch (err) {
      /* ignore */
    }
  };

  LiveAudioAnalyzer.prototype.getCalibration = function getCalibration() {
    return { scale: this.calScale, offset: this.calOffset };
  };

  LiveAudioAnalyzer.prototype.start = async function start() {
    if (this.running) return;
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) throw new Error("此瀏覽器不支援 Web Audio");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("此裝置無法使用麥克風");
    }

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    });

    this.ctx = this.ctx || new AC();
    await this.ctx.resume();

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = this.options.fftSize;
    this.analyser.smoothingTimeConstant = this.options.smoothing;
    this.source.connect(this.analyser);

    this.timeBuf = new Float32Array(this.analyser.fftSize);
    this.freqByteBuf = new Uint8Array(this.analyser.frequencyBinCount);
    this.freqFloatBuf = new Float32Array(this.analyser.frequencyBinCount);
    this.running = true;
  };

  LiveAudioAnalyzer.prototype.playTone = async function playTone(hz, seconds, volume) {
    if (!this.ctx) throw new Error("請先開始收音");
    await this.ctx.resume();
    const f = Number(hz) || 440;
    const dur = Math.min(4, Math.max(0.4, Number(seconds) || 2));
    const vol = Math.min(0.12, Math.max(0.02, Number(volume) || 0.07));
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    const t0 = this.ctx.currentTime + 0.03;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.setValueAtTime(vol, t0 + dur - 0.05);
    gain.gain.linearRampToValueAtTime(0, t0 + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
    return { start: t0, end: t0 + dur, hz: f };
  };

  LiveAudioAnalyzer.prototype.stop = function stop() {
    this.running = false;
    if (this.source) {
      try {
        this.source.disconnect();
      } catch (err) {
        /* ignore */
      }
      this.source = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    this.analyser = null;
    this.hzHistory = [];
  };

  LiveAudioAnalyzer.prototype.read = function read() {
    if (!this.running || !this.analyser || !this.ctx) {
      return {
        running: false,
        rms: 0,
        peakHz: null,
        peakHzRaw: null,
        confidence: 0,
        waveform: null,
        spectrum: null,
        sampleRate: 0,
        calScale: this.calScale
      };
    }

    this.analyser.getFloatTimeDomainData(this.timeBuf);
    this.analyser.getByteFrequencyData(this.freqByteBuf);
    this.analyser.getFloatFrequencyData(this.freqFloatBuf);

    const rms = rmsOf(this.timeBuf);
    const fftRes = estimatePitchFft(
      this.freqFloatBuf,
      this.ctx.sampleRate,
      this.analyser.fftSize,
      this.options.minHz,
      this.options.maxHz
    );
    const autoRes = estimatePitchAuto(
      this.timeBuf,
      this.ctx.sampleRate,
      this.options.minHz,
      this.options.maxHz
    );
    const combined = combinePitch(fftRes, autoRes);
    let peakHzRaw = combined.hz;
    let peakHz = null;

    if (peakHzRaw != null && combined.confidence > 0.12) {
      this.hzHistory.push(peakHzRaw);
      if (this.hzHistory.length > this.options.smoothWindow) this.hzHistory.shift();
      const smooth = median(this.hzHistory);
      peakHzRaw = smooth != null ? smooth : peakHzRaw;
      peakHz = peakHzRaw * this.calScale + this.calOffset;
    }

    return {
      running: true,
      rms,
      peakHz,
      peakHzRaw,
      confidence: combined.confidence,
      waveform: this.timeBuf.slice(0),
      spectrum: this.freqByteBuf.slice(0),
      sampleRate: this.ctx.sampleRate,
      calScale: this.calScale,
      calOffset: this.calOffset
    };
  };

  LiveAudioAnalyzer.prototype.calibrateWithReference = function calibrateWithReference(
    referenceHz,
    measuredSamples
  ) {
    const ref = Number(referenceHz) || 440;
    const med = median(measuredSamples);
    if (med == null || med < 50) return { ok: false, message: "量測不足，請靠近音源再試" };
    const scale = ref / med;
    if (scale < 0.75 || scale > 1.35) {
      return { ok: false, message: "偏差過大（" + Math.round(med) + " Hz），請確認校準音為 " + ref + " Hz" };
    }
    this.saveCalibration(scale, 0);
    return { ok: true, scale, measured: med, reference: ref };
  };

  LiveAudioAnalyzer.prototype.destroy = function destroy() {
    this.stop();
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  };

  global.JPWNLiveAudio = {
    create: (opts) => new LiveAudioAnalyzer(opts),
    estimatePitchHz: (timeBuf, sampleRate, minHz, maxHz) =>
      estimatePitchAuto(timeBuf, sampleRate, minHz, maxHz).hz
  };
})(typeof window !== "undefined" ? window : self);
