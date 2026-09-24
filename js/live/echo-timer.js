(function (global) {
  "use strict";

  function rmsOf(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  function EchoTimer(options) {
    this.speed = Number(options && options.speed) || 340;
    this.pingHz = Number(options && options.pingHz) || 2000;
    this.onUpdate = (options && options.onUpdate) || function () {};
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this.source = null;
    this.timeBuf = null;
    this.raf = 0;
    this.phase = "idle";
    this.noiseFloor = 0.01;
    this.pingTime = 0;
    this.echoTime = null;
    this.listenStart = 0;
    this.blindSec = 0.11;
    this.maxWait = 3.2;
  }

  EchoTimer.prototype.setSpeed = function setSpeed(v) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) this.speed = n;
  };

  EchoTimer.prototype._emit = function _emit(patch) {
    const deltaT = this.echoTime != null && this.pingTime > 0 ? this.echoTime - this.pingTime : null;
    const distance = deltaT != null && deltaT > 0 ? (this.speed * deltaT) / 2 : null;
    this.onUpdate(
      Object.assign(
        {
          phase: this.phase,
          noiseFloor: this.noiseFloor,
          pingTime: this.pingTime,
          echoTime: this.echoTime,
          deltaT,
          distance,
          speed: this.speed,
          pingHz: this.pingHz
        },
        patch || {}
      )
    );
  };

  EchoTimer.prototype._cleanupAudio = function _cleanupAudio() {
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
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  };

  EchoTimer.prototype._playPing = function _playPing() {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = this.pingHz;
    const t0 = ctx.currentTime + 0.04;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.1, t0 + 0.006);
    gain.gain.setValueAtTime(0.1, t0 + 0.055);
    gain.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.085);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.09);
    this.pingTime = t0;
    return t0;
  };

  EchoTimer.prototype._tick = function _tick() {
    if (!this.ctx || !this.analyser) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    this.analyser.getFloatTimeDomainData(this.timeBuf);
    const rms = rmsOf(this.timeBuf);

    if (this.phase === "calibrating") {
      this.noiseFloor = this.noiseFloor * 0.9 + rms * 0.1;
      if (now >= this.listenStart + 0.35) {
        this.phase = "pinging";
        this._playPing();
        this._emit({ message: "喇叭已發出短音「嗶—」，等待回聲…" });
      }
    } else if (this.phase === "pinging" || this.phase === "listening") {
      this.phase = "listening";
      const sincePing = now - this.pingTime;
      const threshold = Math.max(0.008, this.noiseFloor * 5.5);

      if (sincePing >= this.blindSec && this.echoTime == null && rms > threshold) {
        this.echoTime = now;
        this.phase = "done";
        this.stop(false);
        this._emit({ message: "已偵測到回聲" });
        return;
      }

      if (sincePing > this.maxWait) {
        this.phase = "timeout";
        this.stop(false);
        this._emit({
          message: "逾時：請讓喇叭朝向牆壁、調大音量或靠近反射面後重試"
        });
        return;
      }
    }

    this._emit();
    this.raf = requestAnimationFrame(() => this._tick());
  };

  EchoTimer.prototype.start = async function start() {
    this.stop(false);
    const AC = global.AudioContext || global.webkitAudioContext;
    if (!AC) throw new Error("此瀏覽器不支援 Web Audio");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("此裝置無法使用麥克風");
    }

    this.ctx = new AC();
    await this.ctx.resume();

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    });

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.35;
    this.source.connect(this.analyser);
    this.timeBuf = new Float32Array(this.analyser.fftSize);

    this.phase = "calibrating";
    this.echoTime = null;
    this.pingTime = 0;
    this.noiseFloor = 0.008;
    this.listenStart = this.ctx.currentTime;
    this._emit({ message: "校準雜訊中…請保持安靜（約 0.4 秒）" });
    this.raf = requestAnimationFrame(() => this._tick());
  };

  EchoTimer.prototype.stop = function stop(resetPhase) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this._cleanupAudio();
    if (resetPhase !== false && this.phase !== "done") this.phase = "idle";
    this._emit();
  };

  EchoTimer.prototype.reset = function reset() {
    this.stop();
    this.echoTime = null;
    this.pingTime = 0;
    this._emit({ message: "已重設" });
  };

  global.JPWNEchoTimer = EchoTimer;
})(typeof window !== "undefined" ? window : self);
