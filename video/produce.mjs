/*
 * Produces the explainer video end to end:
 *   1. narration: one edge-tts clip per sentence (Syrian Arabic voice), cached;
 *   2. recording: the real site inside stage.html, captured with the Chrome
 *      DevTools screencast while scripted actions run in step with the narration;
 *   3. editing (ffmpeg): per-scene clips, cross-fades, narration placed at the
 *      measured sentence times, a quiet music bed ducked under the voice,
 *      loudness normalisation, H.264 1080p30 MP4 and an .srt subtitle file.
 *
 * Usage:  node produce.mjs full|short
 * Needs:  python3 -m pip install edge-tts · ffmpeg · a local server for the site:
 *         python3 -m http.server 8811   (run from the repository root)
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

import { FULL, SHORT } from './scenes.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CUT = process.argv[2] === 'short' ? 'short' : 'full';
const SCENES = CUT === 'short' ? SHORT : FULL;
const ORIGIN = process.env.SITE_ORIGIN ?? 'http://localhost:8811';
const VOICE = process.env.VOICE ?? 'ar-SY-LaithNeural';
const OUT = join(HERE, 'out');
const WORK = join(OUT, CUT);
const FADE = 0.5;   // cross-fade between scenes (s)
const LEAD = 0.9;   // silence before the first sentence of a scene (s)
const GAP = 0.4;    // pause between sentences (s)
const FPS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const run = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const duration = (file) => Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));

/* ------------------------------------------------------------------ 1. narration */

function narrate() {
  const dir = join(OUT, 'tts');
  mkdirSync(dir, { recursive: true });
  for (const scene of SCENES) {
    for (const s of scene.sentences) {
      const key = createHash('sha1').update(VOICE + '|' + s.say).digest('hex').slice(0, 16);
      s.audio = join(dir, key + '.mp3');
      if (!existsSync(s.audio)) {
        execFileSync('python3', [join(HERE, 'tts.py'), VOICE, s.say, s.audio], { stdio: 'inherit' });
      }
      s.dur = duration(s.audio);
    }
  }
}

/* Long subtitles are shown in two parts, split at the punctuation nearest the middle. */
function subtitleParts(text) {
  if (text.length <= 95) return [text];
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) {
    if ('،؛:'.includes(text[i]) && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  if (best < 20 || best > text.length - 20) return [text];
  return [text.slice(0, best + 1).trim(), text.slice(best + 1).trim()];
}

/* ------------------------------------------------------------------ 2. recording */

function controls(page) {
  const st = (fn, ...args) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, args]);
  const site = () => page.frame({ name: 'site' });
  const phoneFrame = () => page.frame({ name: 'phoneSite' });
  let siteLoaded = false;

  const boxOf = async (frame, sel) => {
    const loc = frame.locator(sel).first();
    await loc.waitFor({ state: 'visible', timeout: 8000 });
    const b = await loc.boundingBox();
    if (!b) throw new Error('no box for ' + sel);
    return b;
  };
  const cursorAt = async (b) => { await st('cursor', b.x + b.width / 2, b.y + b.height / 2, true); await sleep(950); };
  const tap = async (b) => { await st('click', b.x + b.width / 2, b.y + b.height / 2); };

  const c = {
    wait: (ms) => sleep(ms),
    card: (html, cls) => st('card', html, cls ?? ''),
    hl: (i) => st('hl', i),
    clearCard: async () => { await st('card', null); await sleep(600); await st('clearCard'); },
    chapter: (n, text) => st('chapter', n ?? '', text ?? ''),
    showWin: async (on) => { await st('showWin', on); await sleep(on ? 800 : 500); },
    async site(hash) {
      if (!siteLoaded) {
        await st('siteUrl', ORIGIN + '/index.html' + hash);
        await sleep(300);
        await site().waitForLoadState('load');
        siteLoaded = true;
      } else {
        await site().evaluate((h) => { location.hash = h; }, hash);
      }
      await sleep(900);
    },
    async point(sel, text, place) {
      const b = await boxOf(site(), sel);
      const r = { x: b.x, y: b.y, w: b.width, h: b.height };
      await st('ring', r, 10);
      const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      const x = place === 'left' ? r.x - 10 : place === 'right' ? r.x + r.w + 10 : cx;
      const y = place === 'below' ? r.y + r.h + 10 : place === 'above' ? r.y - 10 : cy;
      await st('callout', text, x, y, place);
      await sleep(500);
    },
    unpoint: async () => { await st('ring', null); await st('callout', null); await sleep(300); },
    cursorTo: async (sel) => cursorAt(await boxOf(site(), sel)),
    async scrollTo(sel, offset) {
      await site().evaluate(([s, o]) => {
        const el = document.querySelector(s);
        if (el) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - o), behavior: 'smooth' });
      }, [sel, offset ?? 100]);
      await sleep(1000);
    },
    async typeIn(sel, text) {
      const b = await boxOf(site(), sel);
      await cursorAt(b); await tap(b);
      const loc = site().locator(sel).first();
      await loc.click(); await loc.pressSequentially(text, { delay: 140 });
      await sleep(300);
    },
    press: async (key) => { await page.keyboard.press(key); await sleep(900); },
    async clickSel(sel) {
      const b = await boxOf(site(), sel);
      await cursorAt(b); await tap(b);
      await site().locator(sel).first().click(); await sleep(500);
    },
    async clickText(sel, text) {
      const loc = site().locator(sel).filter({ hasText: text }).first();
      const b = await loc.boundingBox();
      await cursorAt(b); await tap(b); await loc.click(); await sleep(700);
    },
    async clickNth(sel, i) {
      const loc = site().locator(sel).nth(i);
      await loc.scrollIntoViewIfNeeded();
      const b = await loc.boundingBox();
      await cursorAt(b); await tap(b); await loc.click(); await sleep(200);
    },
    async fillNum(sel, value) {
      const b = await boxOf(site(), sel);
      await cursorAt(b); await tap(b);
      const loc = site().locator(sel).first();
      await loc.click(); await loc.fill(''); await loc.pressSequentially(value, { delay: 160 });
      await sleep(300);
    },
    async selectOpt(sel, value) {
      const b = await boxOf(site(), sel);
      await cursorAt(b); await tap(b);
      await site().locator(sel).first().selectOption(value); await sleep(600);
    },
    async zoomOn(sel, s) {
      const b = await boxOf(site(), sel);
      await st('cursor', 0, 0, false);
      await st('zoom', b.x - 160 + b.width / 2, b.y - 158 + b.height / 2, s);
      await sleep(1400);
    },
    zoom: async () => { await st('zoom', 0, 0, 1); await sleep(900); },
    async phone(hash, html) {
      await st('cursor', 0, 0, false);
      await st('phoneUrl', ORIGIN + '/index.html' + hash);
      await sleep(300);
      await phoneFrame().waitForLoadState('load');
      await sleep(500);
      await st('showPhone', true, html);
      await sleep(1000);
    },
    async phoneScroll(y) {
      await phoneFrame().evaluate((top) => window.scrollTo({ top, behavior: 'smooth' }), y);
      await sleep(1200);
    },
    async phoneDark() {
      const f = phoneFrame();
      for (const sel of ['#menuToggle', '#themeToggle', '#menuClose']) {
        const b = await boxOf(f, sel);
        await cursorAt(b); await tap(b); await f.locator(sel).click(); await sleep(650);
      }
      await st('cursor', 0, 0, false);
    },
    phoneOff: async () => { await st('showPhone', false); await sleep(500); },
  };
  return { c, st };
}

async function record() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, colorScheme: 'light', locale: 'ar-SY' });
  // Fresh viewer: no remembered theme or ticks from earlier runs (enc_ keys only).
  await context.addInitScript(() => { try { Object.keys(localStorage).filter((k) => k.startsWith('enc_')).forEach((k) => localStorage.removeItem(k)); } catch (e) {} });
  const page = await context.newPage();
  await page.goto(ORIGIN + '/video/stage.html', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const { c, st } = controls(page);
  const cdp = await context.newCDPSession(page);

  // Load the site before the first take so no clip opens on an empty window.
  await c.site('#/');

  const timeline = [];
  for (const [index, scene] of SCENES.entries()) {
    const dir = join(WORK, 'frames', String(index).padStart(2, '0'));
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    // Untaken: clear overlays so each clip opens on a clean stage.
    await st('sub', null); await st('ring', null); await st('callout', null); await st('clearCard'); await st('cursor', 0, 0, false);
    await st('progress', index / SCENES.length);
    await sleep(400);

    const frames = [];
    let n = 0;
    const onFrame = async ({ data, metadata, sessionId }) => {
      const file = join(dir, String(n++).padStart(6, '0') + '.jpg');
      writeFileSync(file, Buffer.from(data, 'base64'));
      frames.push({ t: metadata.timestamp, file });
      cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
    };
    cdp.on('Page.screencastFrame', onFrame);
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 94, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
    const t0 = Date.now() / 1000;
    const now = () => Date.now() / 1000 - t0;

    if (scene.chapter) await c.chapter(...scene.chapter);
    if (scene.enter) await scene.enter(c);
    if (now() < LEAD) await sleep((LEAD - now()) * 1000);

    const placed = [];
    for (const s of scene.sentences) {
      const start = now();
      const parts = subtitleParts(s.show ?? s.say);
      const subs = (async () => {
        let used = 0;
        const total = parts.reduce((a, p) => a + p.length, 0);
        for (const p of parts) {
          await st('sub', p);
          const share = s.dur * (p.length / total);
          await sleep(share * 1000); used += share;
        }
      })();
      const action = s.act ? s.act(c) : Promise.resolve();
      await Promise.all([subs, action]);
      placed.push({ audio: s.audio, start, dur: s.dur, text: s.show ?? s.say });
      await st('sub', null);
      await sleep(GAP * 1000);
    }
    await sleep((scene.tail ?? 1.0) * 1000);
    const length = now();
    await cdp.send('Page.stopScreencast');
    cdp.off('Page.screencastFrame', onFrame);
    await sleep(200);
    timeline.push({ id: scene.id, dir, t0, length, frames: frames.slice(), sentences: placed });
    console.log(`recorded ${scene.id}: ${length.toFixed(1)}s, ${frames.length} frames`);
  }
  await browser.close();
  return timeline;
}

/* ------------------------------------------------------------------ 3. editing */

function sceneClip(scene, i) {
  const list = join(WORK, `scene${i}.txt`);
  const out = join(WORK, `scene${i}.mp4`);
  const fr = scene.frames.filter((f) => f.t - scene.t0 < scene.length);
  let txt = '';
  for (let k = 0; k < fr.length; k++) {
    const startT = k === 0 ? 0 : fr[k].t - scene.t0;
    const endT = k + 1 < fr.length ? fr[k + 1].t - scene.t0 : scene.length;
    txt += `file '${fr[k].file}'\nduration ${Math.max(0.001, endT - startT).toFixed(4)}\n`;
  }
  txt += `file '${fr[fr.length - 1].file}'\n`;
  writeFileSync(list, txt);
  run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list,
    '-vf', `fps=${FPS},scale=1920:1080:flags=lanczos,format=yuv420p`, '-t', scene.length.toFixed(3),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-r', String(FPS), out]);

  // Narration for the scene: each sentence at its measured start time.
  const wav = join(WORK, `scene${i}.wav`);
  const args = ['-y', '-v', 'error', '-f', 'lavfi', '-t', scene.length.toFixed(3), '-i', 'anullsrc=r=48000:cl=stereo'];
  let filter = '';
  const mix = ['[0:a]'];
  scene.sentences.forEach((s, k) => {
    args.push('-i', s.audio);
    const ms = Math.round(s.start * 1000);
    filter += `[${k + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[s${k}];`;
    mix.push(`[s${k}]`);
  });
  filter += `${mix.join('')}amix=inputs=${mix.length}:normalize=0:duration=first[a]`;
  run('ffmpeg', [...args, '-filter_complex', filter, '-map', '[a]', '-t', scene.length.toFixed(3), wav]);
  return { video: out, audio: wav, length: scene.length };
}

function music(seconds, file) {
  execFileSync('python3', [join(HERE, 'music.py'), String(Math.ceil(seconds) + 2), file], { stdio: 'inherit' });
}

function srtTime(t) {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`;
}

function edit(timeline) {
  const clips = timeline.map(sceneClip);
  const offsets = [];
  let acc = 0;
  clips.forEach((cl, i) => { offsets.push(acc); acc += cl.length - (i < clips.length - 1 ? FADE : 0); });
  const total = acc;

  // Subtitles (same text as on screen).
  let srt = '', n = 1;
  timeline.forEach((sc, i) => sc.sentences.forEach((s) => {
    srt += `${n++}\n${srtTime(offsets[i] + s.start)} --> ${srtTime(offsets[i] + s.start + s.dur)}\n${s.text}\n\n`;
  }));
  const base = join(OUT, CUT === 'short' ? 'bar-encyclopedia-teaser' : 'bar-encyclopedia-explainer');
  writeFileSync(base + '.srt', srt);

  const bed = join(WORK, 'music.wav');
  music(total, bed);

  const args = ['-y', '-v', 'error'];
  clips.forEach((cl) => args.push('-i', cl.video));
  clips.forEach((cl) => args.push('-i', cl.audio));
  args.push('-i', bed);
  const N = clips.length;
  let f = '';
  let v = '[0:v]', a = `[${N}:a]`, len = clips[0].length;
  for (let i = 1; i < N; i++) {
    const off = (len - FADE).toFixed(3);
    f += `${v}[${i}:v]xfade=transition=fade:duration=${FADE}:offset=${off}[v${i}];`;
    f += `${a}[${N + i}:a]acrossfade=d=${FADE}:c1=tri:c2=tri[a${i}];`;
    v = `[v${i}]`; a = `[a${i}]`;
    len = len + clips[i].length - FADE;
  }
  // Music: fade in/out, ducked under the narration.
  f += `[${2 * N}:a]atrim=0:${total.toFixed(3)},afade=t=in:d=2,afade=t=out:st=${(total - 3).toFixed(3)}:d=3,volume=0.32[bed];`;
  f += `${a}asplit=2[voice][key];[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[duck];`;
  f += `[voice][duck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]`;
  const outFile = base + '.mp4';
  run('ffmpeg', [...args, '-filter_complex', f, '-map', N > 1 ? v : '[0:v]', '-map', '[aout]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', outFile]);
  console.log(`wrote ${outFile} (${total.toFixed(1)}s) and ${base}.srt`);
}

mkdirSync(WORK, { recursive: true });
narrate();
const timeline = await record();
writeFileSync(join(WORK, 'timeline.json'), JSON.stringify(timeline.map(({ frames, ...t }) => ({ ...t, frames: frames.length })), null, 2));
edit(timeline);
for (const d of readdirSync(join(WORK, 'frames'))) rmSync(join(WORK, 'frames', d), { recursive: true, force: true });
