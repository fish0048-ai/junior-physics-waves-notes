(function (global) {
  "use strict";

  function rmsOf(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  /** 自相關估計基頻（Hz）；無穩定音調時回傳 null */
  function estimatePitchHz(timeBuf, sampleRate, minHz, maxHz) {
    const minF = minHz || 80;
    const maxF = maxHz || 4000;
    const size = timeBuf.length;
    const rms = rmsOf(timeBuf);
    if (rms < 0.008) return null;

    const minLag = Math.floor(sampleRate / maxF);
    const maxLag = Math.min(Math.floor(sampleRate / minF), Math.floor(size / 2));
    if (maxLag <= minLag) return null;

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
    if (bestLag <= 0 || bestCorr < rms * rms * 0.85) return null;
    const hz = sampleRate / bestLag;
    if (hz < minF || hz > maxF) return null;
    return hz;
  }

  function LiveAudioAnalyzer(options) {
    this.options = Object.assign(
      {
        fftSize: 2048,
        smoothing: 0.75,
        minHz: 80,
        maxHz: 4000
      },
      options || {}
    );
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
    this.running = false;
    this.timeBuf = null;
    this.freqBuf = null;
  }

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
    this.freqBuf = new Uint8Array(this.analyser.frequencyBinCount);
    this.running = true;
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
  };

  LiveAudioAnalyzer.prototype.read = function read() {
    if (!this.running || !this.analyser || !this.ctx) {
      return {
        running: false,
        rms: 0,
        peakHz: null,
        waveform: null,
        spectrum: null,
        sampleRate: 0
      };
    }

    this.analyser.getFloatTimeDomainData(this.timeBuf);
    this.analyser.getByteFrequencyData(this.freqBuf);

    const rms = rmsOf(this.timeBuf);
    const peakHz = estimatePitchHz(this.timeBuf, this.ctx.sampleRate, this.options.minHz, this.options.maxHz);

    return {
      running: true,
      rms,
      peakHz,
      waveform: this.timeBuf.slice(0),
      spectrum: this.freqBuf.slice(0),
      sampleRate: this.ctx.sampleRate
    };
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
    estimatePitchHz
  };
})(typeof window !== "undefined" ? window : self);
