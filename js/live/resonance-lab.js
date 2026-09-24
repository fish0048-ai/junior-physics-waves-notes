(function (global) {
  "use strict";

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function ResonanceLab(options) {
    this.onUpdate = (options && options.onUpdate) || function () {};
    this.analyzer = null;
    this.profile = [];
    this.peakHz = null;
    this.peakRms = 0;
    this.runningTone = null;
    this.sweeping = false;
  }

  ResonanceLab.prototype._emit = function _emit(patch) {
    this.onUpdate(
      Object.assign(
        {
          profile: this.profile.slice(),
          peakHz: this.peakHz,
          peakRms: this.peakRms,
          sweeping: this.sweeping
        },
        patch || {}
      )
    );
  };

  ResonanceLab.prototype.start = async function start() {
    if (!global.JPWNLiveAudio) throw new Error("缺少 JPWNLiveAudio 模組");
    if (this.analyzer) this.destroy();
    this.analyzer = global.JPWNLiveAudio.create({ fftSize: 4096, smoothing: 0.45 });
    await this.analyzer.start();
    this.profile = [];
    this.peakHz = null;
    this.peakRms = 0;
    this._emit({ message: "已開始；請把空瓶口朝向喇叭，再按「自動掃頻」" });
  };

  ResonanceLab.prototype._stopTone = function _stopTone() {
    const t = this.runningTone;
    this.runningTone = null;
    if (!t || !t.ctx) return;
    try {
      t.osc.stop();
      t.osc.disconnect();
      t.gain.disconnect();
    } catch (err) {
      /* ignore */
    }
  };

  ResonanceLab.prototype._startTone = function _startTone(hz, volume) {
    this._stopTone();
    const ctx = this.analyzer.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = hz;
    gain.gain.value = Math.min(0.14, Math.max(0.03, volume || 0.07));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.runningTone = { osc, gain, ctx, hz };
    return this.runningTone;
  };

  ResonanceLab.prototype.sampleRms = async function sampleRms(ms, skip) {
    if (skip) await sleep(skip);
    const samples = [];
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      if (!this.analyzer || !this.analyzer.running) break;
      samples.push(this.analyzer.read().rms);
      await sleep(45);
    }
    return avg(samples);
  };

  ResonanceLab.prototype._findPeak = function _findPeak() {
    if (!this.profile.length) {
      this.peakHz = null;
      this.peakRms = 0;
      return;
    }
    let best = this.profile[0];
    for (let i = 1; i < this.profile.length; i++) {
      if (this.profile[i].rms > best.rms) best = this.profile[i];
    }
    this.peakHz = best.hz;
    this.peakRms = best.rms;
  };

  ResonanceLab.prototype.sweep = async function sweep(opts) {
    if (!this.analyzer || !this.analyzer.running) throw new Error("請先開始收音");
    if (this.sweeping) return;
    const minHz = (opts && opts.minHz) || 280;
    const maxHz = (opts && opts.maxHz) || 1400;
    const step = (opts && opts.step) || 25;
    const holdMs = (opts && opts.holdMs) || 180;

    this.sweeping = true;
    this.profile = [];
    this._stopTone();
    this._emit({ message: "自動掃頻中…請保持瓶口位置不動", phase: "sweep" });

    for (let hz = minHz; hz <= maxHz; hz += step) {
      if (!this.sweeping) break;
      this._startTone(hz);
      const rms = await this.sampleRms(holdMs, 60);
      this._stopTone();
      this.profile.push({ hz, rms });
      this._emit({ message: `掃頻 ${hz} Hz…`, currentHz: hz, currentRms: rms });
      await sleep(30);
    }

    this._stopTone();
    this.sweeping = false;
    this._findPeak();
    this._emit({
      phase: "done",
      message:
        this.peakHz != null
          ? `掃頻完成：響應峰值約在 ${Math.round(this.peakHz)} Hz（估計固有頻率）`
          : "掃頻完成，但未找到明顯峰值；請確認空瓶靠近喇叭並提高音量"
    });
  };

  ResonanceLab.prototype.cancelSweep = function cancelSweep() {
    this.sweeping = false;
    this._stopTone();
    this._emit({ message: "已停止掃頻" });
  };

  ResonanceLab.prototype.playAt = async function playAt(hz) {
    if (!this.analyzer || !this.analyzer.running) throw new Error("請先開始收音");
    const f = Number(hz) || 440;
    this._startTone(f);
    await sleep(80);
    const rms = await this.sampleRms(120, 0);
    const near =
      this.peakHz != null && this.peakRms > 0
        ? Math.abs(f - this.peakHz) / this.peakHz <= 0.07 && rms >= this.peakRms * 0.55
        : false;
    this._emit({
      phase: "manual",
      driveHz: f,
      responseRms: rms,
      nearResonance: near,
      message: near
        ? `驅動 ${Math.round(f)} Hz ≈ 固有頻率，響應明顯變大（共振）`
        : `驅動 ${Math.round(f)} Hz，響應 ${(rms * 100).toFixed(1)}（${this.peakHz != null ? "峰值約 " + Math.round(this.peakHz) + " Hz" : "可先掃頻找峰值"}）`
    });
  };

  ResonanceLab.prototype.stopTone = function stopTone() {
    this._stopTone();
    this._emit({ message: "已停止試聽" });
  };

  ResonanceLab.prototype.destroy = function destroy() {
    this.sweeping = false;
    this._stopTone();
    if (this.analyzer) {
      this.analyzer.destroy();
      this.analyzer = null;
    }
    this._emit({ message: "已停止" });
  };

  global.JPWNResonanceLab = ResonanceLab;
})(typeof window !== "undefined" ? window : self);
