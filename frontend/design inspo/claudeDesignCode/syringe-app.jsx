/* PepTalk — Syringe Calculator
   Live calculator. Three demo states via `scenario`. */

const SYR_COLORS = {
  surface: '#FFFFFF',
  background: '#F7F9FC',
  panel: '#EEF2F7',
  hairline: '#E2E8F0',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  bluePrimary: '#2563EB',
  blueDeep: '#1D4ED8',
  blueTint: '#EFF6FF',
  amber: '#F59E0B',
  amberDeep: '#B45309',
  amberTint: '#FFFBEB',
};

const SYRINGE_OPTIONS = [
  { ml: 0.3, units: 30, label: '0.3 mL' },
  { ml: 0.5, units: 50, label: '0.5 mL' },
  { ml: 1.0, units: 100, label: '1 mL'   },
];

function YIcon({ name, size = 18, color = 'currentColor', strokeWidth = 1.75 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'alert':   return <svg {...p}><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></svg>;
    case 'check':   return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7"/></svg>;
    case 'info':    return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>;
    case 'back':    return <svg {...p}><path d="M15 6l-6 6 6 6"/></svg>;
    case 'syringe': return <svg {...p}><path d="M18 2l4 4"/><path d="M16 4l4 4-10 10H6v-4l10-10z"/><path d="M8 14l2 2"/></svg>;
    default: return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// Header
// ──────────────────────────────────────────────────────────────────
function SyrHeader({ accent }) {
  return (
    <div style={{
      padding: '54px 18px 14px',
      background: SYR_COLORS.background,
      borderBottom: `1px solid ${SYR_COLORS.hairline}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: SYR_COLORS.panel, color: SYR_COLORS.textSecondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <YIcon name="back" size={16}/>
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: accent, fontSize: 11.5, fontWeight: 600, padding: '4px 10px',
          background: SYR_COLORS.blueTint, borderRadius: 999,
        }}>
          <YIcon name="syringe" size={12}/>
          <span>Tool</span>
        </div>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, color: SYR_COLORS.textPrimary, letterSpacing: '-0.02em' }}>
        Syringe Calculator
      </div>
      <div style={{ fontSize: 13.5, color: SYR_COLORS.textSecondary, marginTop: 4, lineHeight: 1.45 }}>
        Calculate how many units to draw for your target dose.
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Segmented control for syringe size
// ──────────────────────────────────────────────────────────────────
function SegSyringe({ value, onChange, accent }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, color: SYR_COLORS.textSecondary,
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8,
      }}>Syringe size</div>
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4,
        padding: 4, background: SYR_COLORS.panel, borderRadius: 12,
      }}>
        {SYRINGE_OPTIONS.map(o => {
          const active = o.ml === value;
          return (
            <button key={o.ml}
              onClick={() => onChange(o.ml)}
              style={{
                appearance: 'none', border: 'none', cursor: 'pointer',
                background: active ? accent : 'transparent',
                color: active ? '#fff' : SYR_COLORS.textPrimary,
                fontSize: 13.5, fontWeight: 600,
                padding: '9px 8px', borderRadius: 9,
                fontFamily: 'inherit',
                transition: 'background 140ms',
                fontVariantNumeric: 'tabular-nums',
                boxShadow: active ? `0 2px 6px -2px ${accent}80` : 'none',
              }}
            >{o.label}</button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Numeric input row
// ──────────────────────────────────────────────────────────────────
function InputField({ label, hint, suffix, value, onChange, accent }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 11, fontWeight: 600, color: SYR_COLORS.textSecondary,
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8,
      }}>{label}</label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: SYR_COLORS.surface,
        border: `1.5px solid ${focused ? accent : SYR_COLORS.hairline}`,
        borderRadius: 12,
        padding: '12px 14px',
        transition: 'border-color 140ms',
      }}>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="—"
          style={{
            flex: 1, border: 'none', outline: 'none',
            background: 'transparent',
            fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em',
            color: SYR_COLORS.textPrimary,
            fontFamily: 'inherit',
            fontVariantNumeric: 'tabular-nums',
            padding: 0, minWidth: 0,
          }}
        />
        <span style={{
          fontSize: 14, fontWeight: 600, color: SYR_COLORS.textTertiary,
          letterSpacing: '0.02em',
        }}>{suffix}</span>
      </div>
      <div style={{ fontSize: 11.5, color: SYR_COLORS.textTertiary, marginTop: 6, lineHeight: 1.4 }}>
        {hint}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Result card — three variants: empty, valid, warning
// ──────────────────────────────────────────────────────────────────
function ResultCard({ state, units, mL, syringeMl, accent }) {
  if (state === 'empty') {
    return (
      <div style={{
        background: SYR_COLORS.surface,
        border: `1px dashed ${SYR_COLORS.hairline}`,
        borderRadius: 16,
        padding: '26px 18px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: SYR_COLORS.panel, color: SYR_COLORS.textSecondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <YIcon name="info" size={18}/>
        </div>
        <div style={{
          fontSize: 13.5, color: SYR_COLORS.textSecondary, lineHeight: 1.45, maxWidth: 240,
        }}>Fill in all fields to see your result.</div>
      </div>
    );
  }

  const warn = state === 'warning';
  const stroke = warn ? SYR_COLORS.amber : accent;
  const tint   = warn ? SYR_COLORS.amberTint : SYR_COLORS.blueTint;
  const deep   = warn ? SYR_COLORS.amberDeep : SYR_COLORS.blueDeep;

  return (
    <div style={{
      background: warn ? SYR_COLORS.amberTint : SYR_COLORS.surface,
      border: `1.5px solid ${warn ? SYR_COLORS.amber : SYR_COLORS.hairline}`,
      borderRadius: 16,
      padding: '20px 18px 18px',
      boxShadow: warn ? 'none' : '0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px -16px rgba(15, 23, 42, 0.12)',
    }}>
      {warn && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 9px', borderRadius: 999,
          background: '#fff', border: `1px solid ${SYR_COLORS.amber}`,
          color: SYR_COLORS.amberDeep,
          fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          <YIcon name="alert" size={11} strokeWidth={2.5}/>
          <span>Over capacity</span>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{
          fontSize: 64, fontWeight: 700, lineHeight: 1,
          color: stroke, letterSpacing: '-0.04em',
          fontFamily: '-apple-system, "SF Pro Display", "Inter"',
          fontVariantNumeric: 'tabular-nums',
        }}>{units.toFixed(units >= 10 ? 1 : 2)}</span>
        <span style={{
          fontSize: 16, fontWeight: 600, color: SYR_COLORS.textSecondary,
          letterSpacing: '0.01em',
        }}>units</span>
      </div>
      <div style={{
        fontSize: 13, color: SYR_COLORS.textSecondary, marginTop: 6,
        fontVariantNumeric: 'tabular-nums',
      }}>
        ({mL.toFixed(3)} mL on a {syringeMl} mL syringe)
      </div>
      {warn && (
        <div style={{
          marginTop: 12, padding: '10px 12px',
          background: '#fff', borderRadius: 10,
          border: `1px solid ${SYR_COLORS.amber}40`,
          display: 'flex', gap: 8, alignItems: 'flex-start',
        }}>
          <YIcon name="alert" size={14} color={SYR_COLORS.amberDeep} strokeWidth={2}/>
          <div style={{ fontSize: 12.5, color: SYR_COLORS.amberDeep, lineHeight: 1.45, fontWeight: 500 }}>
            Exceeds {syringeMl} mL syringe capacity — use a larger syringe or split the draw.
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Reconstitution info card
// ──────────────────────────────────────────────────────────────────
function ReconInfo({ concentration, mcgPerUnit, hasInputs }) {
  return (
    <div style={{
      background: SYR_COLORS.panel,
      borderRadius: 14, padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: SYR_COLORS.textSecondary,
        letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 10,
      }}>Reconstitution info</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Concentration" value={hasInputs ? `${concentration.toFixed(2)} mg/mL` : '—'} />
        <Row label="Each unit"     value={hasInputs ? `${mcgPerUnit.toFixed(1)} mcg` : '—'} />
      </div>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span style={{ fontSize: 13, color: SYR_COLORS.textSecondary }}>{label}</span>
      <span style={{
        fontSize: 14, fontWeight: 600, color: SYR_COLORS.textPrimary,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.005em',
      }}>{value}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Done button
// ──────────────────────────────────────────────────────────────────
function DoneButton({ accent }) {
  return (
    <div style={{
      padding: '12px 18px 28px',
      background: SYR_COLORS.background,
      borderTop: `1px solid ${SYR_COLORS.hairline}`,
    }}>
      <button style={{
        width: '100%', appearance: 'none', border: 'none', cursor: 'pointer',
        background: accent, color: '#fff',
        fontSize: 16, fontWeight: 600, letterSpacing: '-0.005em',
        padding: '14px', borderRadius: 14,
        fontFamily: 'inherit',
        boxShadow: `0 6px 16px -8px ${accent}80`,
      }}>Done</button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────────────────────────
const SCENARIOS = {
  valid:   { syringe: 0.5, peptide: '10',  bac: '2', target: '625' },
  warning: { syringe: 0.5, peptide: '5',   bac: '5', target: '750' },
  empty:   { syringe: 0.5, peptide: '',    bac: '',  target: ''    },
};

function SyringeScreen({ scenario = 'valid', accent = '#2563EB' }) {
  const init = SCENARIOS[scenario] || SCENARIOS.empty;
  const [syringe, setSyringe] = React.useState(init.syringe);
  const [peptide, setPeptide] = React.useState(init.peptide);
  const [bac,     setBac]     = React.useState(init.bac);
  const [target,  setTarget]  = React.useState(init.target);

  React.useEffect(() => {
    const s = SCENARIOS[scenario] || SCENARIOS.empty;
    setSyringe(s.syringe); setPeptide(s.peptide); setBac(s.bac); setTarget(s.target);
  }, [scenario]);

  const pNum = parseFloat(peptide);
  const bNum = parseFloat(bac);
  const tNum = parseFloat(target);
  const hasAll = !isNaN(pNum) && pNum > 0 && !isNaN(bNum) && bNum > 0 && !isNaN(tNum) && tNum > 0;

  let units = 0, mL = 0, concentration = 0, mcgPerUnit = 0, state = 'empty';
  if (hasAll) {
    concentration = pNum / bNum;          // mg/mL
    mcgPerUnit    = (concentration * 1000) / 100; // mcg per 1 unit (1 mL = 100 units)
    units         = tNum / mcgPerUnit;
    mL            = units / 100;
    const capUnits = SYRINGE_OPTIONS.find(o => o.ml === syringe).units;
    state = units > capUnits ? 'warning' : 'valid';
  }

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: SYR_COLORS.background,
      fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
      color: SYR_COLORS.textPrimary,
    }}>
      <SyrHeader accent={accent}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 18px 4px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SegSyringe value={syringe} onChange={setSyringe} accent={accent}/>
          <InputField
            label="Peptide amount"
            hint="Total mg in your vial"
            suffix="mg"
            value={peptide} onChange={setPeptide} accent={accent}
          />
          <InputField
            label="Bacteriostatic water"
            hint="How much BAC water you reconstituted with"
            suffix="mL"
            value={bac} onChange={setBac} accent={accent}
          />
          <InputField
            label="Target dose"
            hint="Your desired dose per injection"
            suffix="mcg"
            value={target} onChange={setTarget} accent={accent}
          />

          <div style={{ marginTop: 4 }}>
            <ResultCard state={state} units={units} mL={mL} syringeMl={syringe} accent={accent}/>
          </div>

          <ReconInfo concentration={concentration} mcgPerUnit={mcgPerUnit} hasInputs={hasAll}/>
          <div style={{ height: 8 }}/>
        </div>
      </div>
      <DoneButton accent={accent}/>
    </div>
  );
}

window.PepTalkSyringeScreen = SyringeScreen;
