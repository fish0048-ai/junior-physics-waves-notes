(function (global) {
  "use strict";

  function rmsOf(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  function EchoTimer(options) {
    this.speed = Number(options && options.speed) || 340;
    this.onUpdate = (options && options.onUpdate) || function () {};
    this.analyzer = null;
    this.raf = 0;
    this.phase = "idle";
    this.noiseFloor = 0.01;
    this.peaks = [];
    this.calibrateUntil = 0;
    this.listenStart = 0;
    this.minGap = 0.06;
    this.maxWait = 3.5;
  }

  EchoTimer.prototype.setSpeed = function setSpeed(v) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) this.speed = n;
  };

  EchoTimer.prototype._emit = function _emit(patch) {
    const deltaT =
      this.peaks.length >= 2 ? this.peaks[1].t - this.peaks[0].t : null;
    const distance =
      deltaT != null && deltaT > 0 ? (this.speed * deltaT) / 2 : null;
    this.onUpdate(
      Object.assign(
        {
          phase: this.phase,
          noiseFloor: this.noiseFloor,
          peaks: this.peaks.slice(),
          deltaT,
          distance,
          speed: this.speed
        },
        patch || {}
      )
    );
  };

  EchoTimer.prototype._tick = function _tick() {
    if (!this.analyzer || !this.analyzer.running) return;
    const frame = this.analyzer.read();
    const now = performance.now() / 1000;
    const rms = frame.rms;

    if (this.phase === "calibrating") {
      this.noiseFloor = this.noiseFloor * 0.92 + rms * 0.08;
      if (now >= this.calibrateUntil) {
        this.phase = "armed";
        this.peaks = [];
        this._emit({ message: "請對牆壁拍手一次" });
      }
    } else if (this.phase === "armed" || this.phase === "waiting") {
      const threshold = Math.max(0.012, this.noiseFloor * 4.5);
      const last = this.peaks[this.peaks.length - 1];
      const sinceLast = last ? now - last.t : Infinity;
      if (rms > threshold && sinceLast > this.minGap) {
        this.peaks.push({ t: now, rms });
        if (this.peaks.length === 1) {
          this.phase = "waiting";
          this._emit({ message: "已偵測到聲音，等待回聲…" });
        } else if (this.peaks.length >= 2) {
          this.phase = "done";
          this.stop();
          this._emit({ message: "測量完成" });
          return;
        }
      }
      if (this.phase === "waiting" && now - this.listenStart > this.maxWait) {
        this.phase = "timeout";
        this.stop();
        this._emit({ message: "逾時：請靠近牆壁、再試一次" });
        return;
      }
    }

    this._emit();
    this.raf = requestAnimationFrame(() => this._tick());
  };

  EchoTimer.prototype.start = async function start() {
    this.stop(false);
    if (!global.JPWNLiveAudio) throw new Error("缺少 JPWNLiveAudio 模組");
    this.analyzer = global.JPWNLiveAudio.create({ fftSize: 2048, smoothing: 0.4 });
    await this.analyzer.start();

    this.phase = "calibrating";
    this.peaks = [];
    this.noiseFloor = 0.01;
    this.listenStart = performance.now() / 1000;
    this.calibrateUntil = this.listenStart + 0.45;
    this._emit({ message: "校準環境雜訊中…請保持安靜" });
    this.raf = requestAnimationFrame(() => this._tick());
  };

  EchoTimer.prototype.stop = function stop(resetPhase) {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    if (this.analyzer) {
      this.analyzer.destroy();
      this.analyzer = null;
    }
    if (resetPhase !== false && this.phase !== "done") this.phase = "idle";
    this._emit();
  };

  EchoTimer.prototype.reset = function reset() {
    this.stop();
    this.peaks = [];
    this._emit({ message: "已重設" });
  };

  global.JPWNEchoTimer = EchoTimer;
})(typeof window !== "undefined" ? window : self);
