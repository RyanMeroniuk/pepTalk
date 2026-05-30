/* PepTalk — My Stack / daily protocol screen
   Renders inside an IOSDevice. Three demo states via `scenario` prop. */

const STACK_COLORS = {
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
  green: '#10B981',
  greenDeep: '#059669',
  greenTint: '#ECFDF5',
};

// ──────────────────────────────────────────────────────────────────
// Tiny icons (line, currentColor)
// ──────────────────────────────────────────────────────────────────
function SIcon({ name, size = 18, color = 'currentColor', strokeWidth = 1.75, fill = 'none' }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill, stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'plus':     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'syringe':  return <svg {...p}><path d="M18 2l4 4"/><path d="M16 4l4 4-10 10H6v-4l10-10z"/><path d="M8 14l2 2"/></svg>;
    case 'spark':    return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'sun':      return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/></svg>;
    case 'moon':     return <svg {...p}><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/></svg>;
    case 'check':    return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7"/></svg>;
    case 'more':     return <svg {...p}><circle cx="5" cy="12" r="1.4" fill={color}/><circle cx="12" cy="12" r="1.4" fill={color}/><circle cx="19" cy="12" r="1.4" fill={color}/></svg>;
    case 'calendar': return <svg {...p}><rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>;
    case 'shield':   return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'flask':    return <svg {...p}><path d="M9 3h6M10 3v6L4.5 19.5A1.5 1.5 0 0 0 5.8 22h12.4a1.5 1.5 0 0 0 1.3-2.5L14 9V3"/><path d="M7 15h10"/></svg>;
    case 'leaf':     return <svg {...p}><path d="M5 21c0-9 6-15 16-16-.5 10-6 16-16 16z"/><path d="M5 21c4-7 9-12 16-16"/></svg>;
    default: return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// Sample data
// ──────────────────────────────────────────────────────────────────
const SAMPLE_STACK_PARTIAL = [
  { id: 1, slot: 'morning', name: 'Retatrutide',   dose: '4 mg',   route: 'SUBQ',       category: 'peptide',    schedule: 'Mon, Wed, Fri', checked: true  },
  { id: 2, slot: 'morning', name: 'BPC-157',       dose: '500 mcg', route: 'SUBQ',      category: 'peptide',    schedule: null,            checked: true  },
  { id: 3, slot: 'morning', name: 'Creatine',      dose: '5 g',     route: 'ORAL',      category: 'supplement', schedule: null,            checked: false },
  { id: 4, slot: 'morning', name: 'Vitamin D3 + K2', dose: '5000 IU', route: 'ORAL',    category: 'supplement', schedule: null,            checked: false },
  { id: 5, slot: 'night',   name: 'CJC-1295 / Ipamorelin', dose: '300 mcg', route: 'SUBQ', category: 'peptide', schedule: null,           checked: false },
  { id: 6, slot: 'night',   name: 'Magnesium Glycinate',   dose: '400 mg',  route: 'ORAL', category: 'supplement', schedule: null,        checked: false },
  { id: 7, slot: 'night',   name: 'Glycine',       dose: '3 g',     route: 'ORAL',      category: 'supplement', schedule: null,            checked: false },
];

const SAMPLE_STACK_COMPLETE = SAMPLE_STACK_PARTIAL.map(i => ({ ...i, checked: true }));

// ──────────────────────────────────────────────────────────────────
// Date strip — horizontal scrollable days
// ──────────────────────────────────────────────────────────────────
function DateStrip({ accent, selectedIdx = 3, onSelect }) {
  // 7 days centered on today (idx 3)
  const days = [
    { dow: 'Thu', d: 22 },
    { dow: 'Fri', d: 23 },
    { dow: 'Sat', d: 24 },
    { dow: 'Sun', d: 25 },
    { dow: 'Mon', d: 26 },
    { dow: 'Tue', d: 27 },
    { dow: 'Wed', d: 28 },
  ];
  return (
    <div style={{
      display: 'flex', gap: 6, padding: '4px 14px 14px',
      overflowX: 'auto',
      scrollbarWidth: 'none',
    }}>
      {days.map((d, i) => {
        const active = i === selectedIdx;
        return (
          <div key={i}
            onClick={() => onSelect && onSelect(i)}
            style={{
              flex: '0 0 auto',
              minWidth: 44,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              padding: '8px 4px 10px',
              borderRadius: 12,
              background: active ? accent : 'transparent',
              color: active ? '#fff' : STACK_COLORS.textSecondary,
              cursor: 'pointer',
              transition: 'background 120ms',
            }}>
            <span style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: active ? 0.85 : 1 }}>
              {d.dow}
            </span>
            <span style={{ fontSize: 17, fontWeight: 600, color: active ? '#fff' : STACK_COLORS.textPrimary }}>
              {d.d}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Header — title, "Today / Mon May 27", "Go to today" link
// ──────────────────────────────────────────────────────────────────
function StackHeader({ accent, isToday, onGoToday }) {
  return (
    <div style={{
      padding: '60px 18px 6px',
      background: STACK_COLORS.background,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: STACK_COLORS.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            My Stack
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: STACK_COLORS.textPrimary, letterSpacing: '-0.02em', marginTop: 2 }}>
            {isToday ? 'Today' : 'Mon, May 27'}
          </div>
        </div>
        {!isToday && (
          <button onClick={onGoToday} style={{
            background: 'transparent', border: 'none', color: accent,
            fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 4,
          }}>
            Go to Today
          </button>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Quick actions — three icon+label cards
// ──────────────────────────────────────────────────────────────────
function QuickActions({ accent, onAdd }) {
  const actions = [
    { name: 'plus',    label: 'Add item',     sub: 'Peptide or supp', onClick: onAdd, color: accent, bg: STACK_COLORS.blueTint },
    { name: 'syringe', label: 'Syringe calc', sub: 'Dose by mg/mL', color: accent, bg: STACK_COLORS.blueTint },
    { name: 'shield',  label: 'AI Review',    sub: 'Check conflicts', color: accent, bg: STACK_COLORS.blueTint },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, padding: '0 14px 14px' }}>
      {actions.map((a, i) => (
        <div key={i}
          onClick={a.onClick}
          style={{
            background: STACK_COLORS.surface,
            border: `1px solid ${STACK_COLORS.hairline}`,
            borderRadius: 14,
            padding: '12px 10px',
            display: 'flex', flexDirection: 'column', gap: 8,
            cursor: 'pointer',
          }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: a.bg, color: a.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SIcon name={a.name} size={16} strokeWidth={2}/>
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: STACK_COLORS.textPrimary, letterSpacing: '-0.005em' }}>{a.label}</div>
            <div style={{ fontSize: 10.5, color: STACK_COLORS.textSecondary, marginTop: 1 }}>{a.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Adherence summary — slim bar + count
// ──────────────────────────────────────────────────────────────────
function AdherenceBar({ accent, taken, total }) {
  const pct = total === 0 ? 0 : Math.round((taken / total) * 100);
  const complete = taken === total && total > 0;
  return (
    <div style={{
      margin: '0 14px 18px',
      padding: '12px 14px',
      background: STACK_COLORS.surface,
      border: `1px solid ${STACK_COLORS.hairline}`,
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {complete && (
            <div style={{
              width: 18, height: 18, borderRadius: 999,
              background: STACK_COLORS.green, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SIcon name="check" size={12} strokeWidth={3}/>
            </div>
          )}
          <div style={{ fontSize: 13, fontWeight: 600, color: STACK_COLORS.textPrimary }}>
            {complete ? 'All doses logged' : `${taken} of ${total} doses taken`}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: complete ? STACK_COLORS.greenDeep : STACK_COLORS.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {pct}%
        </div>
      </div>
      <div style={{
        height: 4, borderRadius: 999, background: STACK_COLORS.panel, overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: complete ? STACK_COLORS.green : accent,
          borderRadius: 999,
          transition: 'width 400ms',
        }}/>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Section header — sun/moon + label
// ──────────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '4px 18px 8px',
    }}>
      <SIcon name={icon} size={13} color={STACK_COLORS.textSecondary}/>
      <span style={{ fontSize: 11, fontWeight: 700, color: STACK_COLORS.textSecondary, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, color: STACK_COLORS.textTertiary, fontWeight: 500 }}>{count}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Dose checkbox — circular, fills on check
// ──────────────────────────────────────────────────────────────────
function DoseCheckbox({ checked, onToggle, accent }) {
  return (
    <div
      onClick={onToggle}
      style={{
        width: 26, height: 26, borderRadius: 999,
        border: `1.5px solid ${checked ? accent : STACK_COLORS.hairline}`,
        background: checked ? accent : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flex: '0 0 26px',
        transition: 'background 140ms, border-color 140ms',
      }}
    >
      {checked && <SIcon name="check" size={14} color="#fff" strokeWidth={3}/>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Dose card — the core element
// ──────────────────────────────────────────────────────────────────
function DoseCard({ item, accent, onToggle }) {
  const isPep = item.category === 'peptide';
  const dim = item.checked;
  return (
    <div style={{
      margin: '0 14px 8px',
      padding: '12px 12px 12px 14px',
      background: STACK_COLORS.surface,
      border: `1px solid ${STACK_COLORS.hairline}`,
      borderRadius: 14,
      display: 'flex', alignItems: 'flex-start', gap: 12,
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
      opacity: dim ? 0.62 : 1,
      transition: 'opacity 200ms',
    }}>
      <div style={{ marginTop: 1 }}>
        <DoseCheckbox checked={item.checked} onToggle={onToggle} accent={accent}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 15, fontWeight: 600, color: STACK_COLORS.textPrimary, letterSpacing: '-0.005em',
            textDecoration: dim ? 'line-through' : 'none',
            textDecorationColor: STACK_COLORS.textTertiary,
          }}>{item.name}</span>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 5,
            background: isPep ? STACK_COLORS.blueTint : STACK_COLORS.greenTint,
            color: isPep ? STACK_COLORS.blueDeep : STACK_COLORS.greenDeep,
          }}>{isPep ? 'Peptide' : 'Supplement'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 13, color: STACK_COLORS.textSecondary, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{item.dose}</span>
          {item.route && (
            <span style={{
              fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase',
              padding: '2px 6px', borderRadius: 5,
              background: STACK_COLORS.panel,
              color: STACK_COLORS.textSecondary,
            }}>{item.route}</span>
          )}
          {item.schedule && (
            <span style={{ fontSize: 11.5, color: STACK_COLORS.textTertiary }}>· {item.schedule}</span>
          )}
        </div>
      </div>
      <button style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        color: STACK_COLORS.textTertiary, padding: 4, marginTop: 1,
      }}>
        <SIcon name="more" size={16}/>
      </button>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────
function StackEmpty({ accent }) {
  return (
    <div style={{
      margin: '24px 14px', padding: '40px 22px',
      background: STACK_COLORS.surface,
      border: `1px dashed ${STACK_COLORS.hairline}`,
      borderRadius: 18,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: STACK_COLORS.panel, color: STACK_COLORS.textSecondary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SIcon name="calendar" size={26} strokeWidth={1.5}/>
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: STACK_COLORS.textPrimary, letterSpacing: '-0.01em' }}>
          Nothing scheduled
        </div>
        <div style={{ fontSize: 13, color: STACK_COLORS.textSecondary, marginTop: 4, lineHeight: 1.5, maxWidth: 260 }}>
          Tap the <strong style={{ color: STACK_COLORS.textPrimary }}>+ Add item</strong> button above to add a peptide or supplement to your daily protocol.
        </div>
      </div>
      <div style={{
        display: 'flex', gap: 8, marginTop: 4,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 999,
          background: STACK_COLORS.blueTint, color: STACK_COLORS.blueDeep,
          fontSize: 11.5, fontWeight: 600,
        }}>
          <SIcon name="flask" size={12}/> Peptides
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 999,
          background: STACK_COLORS.greenTint, color: STACK_COLORS.greenDeep,
          fontSize: 11.5, fontWeight: 600,
        }}>
          <SIcon name="leaf" size={12}/> Supplements
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main stack screen
// ──────────────────────────────────────────────────────────────────
function StackScreen({ scenario = 'partial', accent = '#2563EB' }) {
  const initial = scenario === 'empty' ? [] : scenario === 'complete' ? SAMPLE_STACK_COMPLETE : SAMPLE_STACK_PARTIAL;
  const [items, setItems] = React.useState(initial);
  const [dateIdx, setDateIdx] = React.useState(scenario === 'partial' ? 5 : 5); // today

  React.useEffect(() => {
    setItems(scenario === 'empty' ? [] : scenario === 'complete' ? SAMPLE_STACK_COMPLETE : SAMPLE_STACK_PARTIAL);
  }, [scenario]);

  const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));

  const morning = items.filter(i => i.slot === 'morning');
  const night   = items.filter(i => i.slot === 'night');
  const taken = items.filter(i => i.checked).length;
  const isToday = dateIdx === 5;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: STACK_COLORS.background,
      fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
      color: STACK_COLORS.textPrimary,
    }}>
      <StackHeader accent={accent} isToday={isToday} onGoToday={() => setDateIdx(5)}/>
      <DateStrip accent={accent} selectedIdx={dateIdx} onSelect={setDateIdx}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 32 }}>
        <QuickActions accent={accent}/>
        {items.length > 0 && (
          <AdherenceBar accent={accent} taken={taken} total={items.length}/>
        )}
        {items.length === 0 ? (
          <StackEmpty accent={accent}/>
        ) : (
          <>
            {morning.length > 0 && (
              <>
                <SectionHeader icon="sun" label="Morning" count={morning.length}/>
                {morning.map(i => <DoseCard key={i.id} item={i} accent={accent} onToggle={() => toggle(i.id)}/>)}
              </>
            )}
            {night.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <SectionHeader icon="moon" label="Night" count={night.length}/>
                {night.map(i => <DoseCard key={i.id} item={i} accent={accent} onToggle={() => toggle(i.id)}/>)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

window.PepTalkStackScreen = StackScreen;
