'use client';
import React from 'react';
import { useDoc, mutate } from '@/lib/store';
import { ANIMS } from '@/lib/engine/presets';
import { SHAPE_NAMES } from '@/lib/engine/glyphs';
import { MODES } from '@/lib/engine/math';
import { compiled } from '@/lib/engine/expr';
import { Section, Slider, Colors, Select, Toggle } from './controls';
import GlyphEditor from './GlyphEditor';

function AsciiInspector() {
  const d = useDoc();
  const A = d.ascii;
  return (
    <>
      <Section title="Motion" note={ANIMS.find((a) => a[0] === A.anim)?.[1]}>
        <Slider path="ascii.amp" label="Amplitude" min={0} max={1} step={0.01} />
        <Slider path="ascii.freq" label="Frequency" min={0.5} max={8} step={0.1} />
        <Slider path="ascii.speed" label="Cycles per loop" min={1} max={4} step={1} />
      </Section>
      <Section title="Camera" note="pan & zoom the source">
        <Slider path="ascii.zoom" label="Zoom" min={0.3} max={4} step={0.01} />
        <Slider path="ascii.panX" label="Pan X" min={-1.5} max={1.5} step={0.01} />
        <Slider path="ascii.panY" label="Pan Y" min={-1.5} max={1.5} step={0.01} />
      </Section>
      <GlyphEditor />
      <Section title="Grid">
        <Slider path="ascii.cols" label="Columns" min={12} max={240} step={1} />
        <Slider path="ascii.ca" label="Cell aspect (h ÷ w)" min={0.6} max={2.2} step={0.05} />
        <Slider path="ascii.fill" label="Glyph scale" min={0.3} max={1.6} step={0.01} />
        <Slider path="ascii.sizeBy" label="Size by brightness" min={0} max={1} step={0.01} />
        <Select path="ascii.dither" label="Dithering" options={[['none', 'None'], ['bayer', 'Ordered (Bayer 4×4)'], ['floyd', 'Error diffusion (Floyd–Steinberg)']]} />
        <Select path="ascii.wt" label="Character weight" numeric options={[[400, 'Regular'], [700, 'Bold']]} />
        <Select path="ascii.fit" label="Image fit" options={[['cover', 'Fill frame'], ['contain', 'Fit inside']]} />
        <Toggle path="ascii.inv" label="Invert brightness" />
      </Section>
      <Section title="Tone">
        <Slider path="ascii.bright" label="Brightness" min={-0.6} max={0.6} step={0.01} />
        <Slider path="ascii.contrast" label="Contrast" min={0.2} max={3} step={0.01} />
        <Slider path="ascii.gamma" label="Gamma" min={0.3} max={3} step={0.01} />
      </Section>
      <Section title="Colour">
        <Select path="ascii.cm" label="Colour mode" options={[['mono', 'Single ink'], ['duo', 'Tonal (ink by brightness)'], ['grad', 'Gradient map'], ['image', 'Original image colour']]} />
        <Colors items={[['ascii.bg', 'Ground'], ['ascii.fg', 'Ink'], ['ascii.acc', 'Accent']]} />
        <Colors items={[['ascii.gr.0', 'Grad dark'], ['ascii.gr.1', 'Grad mid'], ['ascii.gr.2', 'Grad bright']]} />
        <Slider path="ascii.accAmt" label="Accent sprinkle" min={0} max={0.3} step={0.005} />
      </Section>
    </>
  );
}

function IconInspector() {
  return (
    <>
      <Section title="Transform">
        <Slider path="icon.scale" label="Icon size" min={0.1} max={1.2} step={0.01} />
        <Slider path="icon.offX" label="Position X" min={-1} max={1} step={0.01} />
        <Slider path="icon.offY" label="Position Y" min={-1} max={1} step={0.01} />
        <Slider path="icon.rot" label="Rotation °" min={-360} max={360} step={1} />
        <Slider path="icon.pad" label="Inner padding" min={0} max={0.3} step={0.01} />
      </Section>
      <Section title="Stroke">
        <Slider path="icon.stroke" label="Stroke weight" min={0.2} max={4} step={0.05} />
        <Select path="icon.cap" label="Line caps" options={[['square', 'Square'], ['round', 'Round'], ['butt', 'Flat']]} />
        <Select path="icon.join" label="Corners" options={[['miter', 'Sharp'], ['round', 'Round'], ['bevel', 'Bevel']]} />
        <Slider path="icon.cutSeg" label="Cut segment (0 = solid)" min={0} max={12} step={0.1} />
        <Slider path="icon.cutGap" label="Cut gap" min={0.2} max={6} step={0.1} />
      </Section>
      <Section title="Colour">
        <Select path="icon.tone" label="Two-tone pattern" options={[['duo', 'Duotone by part'], ['swap', 'Duotone swapped'], ['alt', 'Alternate parts'], ['mono', 'Single colour']]} />
        <Colors items={[['icon.p', 'Primary'], ['icon.s', 'Secondary'], ['icon.canvas', 'Canvas']]} />
        <Slider path="icon.fillA" label="Fill opacity" min={0} max={1} step={0.01} />
        <Slider path="icon.glow" label="Glow" min={0} max={40} step={0.5} />
        <Slider path="icon.echo" label="Offset echo" min={0} max={2.5} step={0.05} />
      </Section>
      <Section title="Container">
        <Select path="icon.bgShape" label="Shape" options={[['none', 'None'], ['circle', 'Circle'], ['squircle', 'Squircle'], ['square', 'Square']]} />
        <Colors items={[['icon.bgc', 'Container']]} />
      </Section>
      <Section title="Dot-matrix render">
        <Select path="icon.pixel" label="Mode" options={[['off', 'Vector strokes'], ['on', 'Pixel grid']]} />
        <Slider path="icon.res" label="Grid resolution" min={12} max={96} step={1} />
        <Select path="icon.pshape" label="Pixel shape" options={SHAPE_NAMES.filter((n) => n !== 'blank').map((n) => [n, n] as [string, string])} />
        <Slider path="icon.ghost" label="Unlit pixel glow" min={0} max={0.4} step={0.01} />
      </Section>
    </>
  );
}

function MathInspector() {
  const d = useDoc();
  const M = d.math, md = MODES[M.mode];
  const ex = compiled(M.xe).err || compiled(M.ye).err;
  return (
    <>
      <Section title="Variables" note={md.n}>
        {'abcd'.split('').map((k, i) => <Slider key={M.mode + k} path={`math.v.${k}`} label={md.v[i][0]} min={md.v[i][1]} max={md.v[i][2]} step={md.v[i][3]} lfo={k} />)}
      </Section>
      {M.mode === 'custom' && (
        <Section title="Equation" note="t runs 0 → 2π·turns">
          <label className="note" htmlFor="xe">x(t) =</label>
          <textarea id="xe" className="in" spellCheck={false} value={M.xe} onChange={(e) => mutate((x) => { x.math.xe = e.target.value; })} />
          <label className="note" htmlFor="ye">y(t) =</label>
          <textarea id="ye" className="in" spellCheck={false} value={M.ye} onChange={(e) => mutate((x) => { x.math.ye = e.target.value; })} />
          <div className="err">{ex}</div>
          <Slider path="math.turns" label="Turns" min={1} max={20} step={1} />
          <p className="note">Use t, a, b, c, d, T (loop time 0→1), pi and sin cos tan abs sqrt exp log pow min max atan2 fract mod floor.</p>
        </Section>
      )}
      <Section title="Repetition">
        <Slider path="math.copies" label="Echo copies" min={1} max={24} step={1} />
        <Slider path="math.copyPhase" label="Phase offset per copy" min={0} max={0.2} step={0.001} lfo="copyPhase" />
        <Slider path="math.copyScale" label="Scale per copy" min={0.7} max={1.1} step={0.005} />
        <Slider path="math.copyRot" label="Rotate per copy °" min={-30} max={30} step={0.5} />
        <Slider path="math.sym" label="Radial symmetry" min={1} max={16} step={1} />
        <Toggle path="math.mirror" label="Mirror" />
      </Section>
      <Section title="Transform & time">
        <Slider path="math.zoom" label="Zoom" min={0.2} max={3} step={0.01} lfo="zoom" />
        <Slider path="math.rot" label="Rotation °" min={-180} max={180} step={1} lfo="rot" />
        <Slider path="math.panX" label="Pan X" min={-1} max={1} step={0.01} />
        <Slider path="math.panY" label="Pan Y" min={-1} max={1} step={0.01} />
        <Slider path="math.spin" label="Spins per loop" min={-3} max={3} step={1} />
        <Slider path="math.cyc" label="Time cycles per loop" min={0} max={4} step={1} />
      </Section>
      <Section title="Render">
        <Select path="math.style" label="Draw as" options={[['line', 'Lines'], ['dots', 'Dots'], ['both', 'Lines + dots']]} />
        <Slider path="math.density" label="Density" min={0.2} max={4} step={0.05} />
        <Slider path="math.stroke" label="Stroke" min={0.2} max={6} step={0.05} />
        <Slider path="math.dot" label="Dot size" min={0.3} max={20} step={0.1} />
        <Slider path="math.alpha" label="Opacity" min={0.05} max={1} step={0.01} />
        <Slider path="math.glow" label="Glow" min={0} max={30} step={0.5} />
        <Toggle path="math.blend" label="Additive light blending" />
      </Section>
      <Section title="Colour">
        <Select path="math.cm" label="Colour mode" options={[['solid', 'Solid'], ['copies', 'Blend across copies'], ['path', 'Gradient along path'], ['hue', 'Spectrum cycle']]} />
        <Colors items={[['math.c1', 'Colour A'], ['math.c2', 'Colour B'], ['math.bg', 'Ground']]} />
      </Section>
    </>
  );
}

export default function Inspector() {
  const d = useDoc();
  return d.mode === 'ascii' ? <AsciiInspector /> : d.mode === 'icon' ? <IconInspector /> : <MathInspector />;
}
