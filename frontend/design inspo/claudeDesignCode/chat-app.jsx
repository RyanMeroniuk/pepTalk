/* PepTalk — Chat Tab Redesign
   Renders inside an IOSDevice. Owns the chat state, scenarios, streaming sim. */

const PEPTALK_COLORS = {
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
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#10B981',
};

// ──────────────────────────────────────────────────────────────────
// Mock data — a realistic Q&A turn with inline citations + sources
// ──────────────────────────────────────────────────────────────────
const SAMPLE_TURN = {
  question: 'Is it safe to stack tirzepatide with creatine while cutting?',
  answer: [
    { type: 'p', text: 'Yes — in most cases this combination is well-tolerated and frequently recommended for body-recomposition protocols. Tirzepatide drives appetite suppression and fat loss while creatine helps preserve lean mass and strength during a caloric deficit.', cites: [1, 2] },
    { type: 'h', text: 'Why it works' },
    { type: 'li', text: 'Tirzepatide reduces caloric intake by ~20–30% via GLP-1/GIP agonism, which can accelerate muscle catabolism if protein and resistance training aren’t prioritized.', cites: [1] },
    { type: 'li', text: 'Creatine monohydrate (3–5g/day) is one of the most studied compounds for retaining strength output and lean mass under a deficit.', cites: [3] },
    { type: 'h', text: 'Watch for' },
    { type: 'li', text: 'Hydration. Both compounds can mask thirst cues — aim for 3L+/day, more on training days.', cites: [2] },
    { type: 'li', text: 'GI side effects in the first 4 weeks; split creatine into two 2.5g doses if you experience bloating.', cites: [3] },
  ],
  sources: [
    { id: 1, breadcrumb: 'Tirzepatide › Mechanism & Dosing', kind: 'Peptide' },
    { id: 2, breadcrumb: 'GLP-1 Agonists › Body Composition', kind: 'Research' },
    { id: 3, breadcrumb: 'Creatine › Cutting Protocols', kind: 'Supplement' },
  ],
};

const STARTER_PROMPTS = [
  { icon: 'shield',  title: 'Review my stack for conflicts', sub: '5 items · checked against 1,837 files' },
  { icon: 'fork',    title: 'What should I eat on tirzepatide?', sub: 'Macros, timing, protein floor' },
  { icon: 'moon',    title: 'Best supplements for sleep', sub: 'Compare melatonin, glycine, magnesium' },
  { icon: 'flame',   title: 'Build a recomp protocol', sub: 'Personalized to your stack' },
];

// ──────────────────────────────────────────────────────────────────
// Tiny icon set — line icons, currentColor
// ──────────────────────────────────────────────────────────────────
function Icon({ name, size = 18, color = 'currentColor', strokeWidth = 1.75 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'shield':   return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>;
    case 'fork':     return <svg {...p}><path d="M7 3v8a2 2 0 0 0 2 2v8"/><path d="M11 3v8"/><path d="M15 3c0 6-2 8-2 8s2 0 2 4v6"/></svg>;
    case 'moon':     return <svg {...p}><path d="M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z"/></svg>;
    case 'flame':    return <svg {...p}><path d="M12 3c1 4 5 5 5 10a5 5 0 1 1-10 0c0-2 1-3 2-4-1 3 1 4 2 4-1-4 1-7 1-10z"/></svg>;
    case 'arrowUp':  return <svg {...p}><path d="M12 19V5"/><path d="M6 11l6-6 6 6"/></svg>;
    case 'plus':     return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case 'doc':      return <svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>;
    case 'check':    return <svg {...p}><path d="M5 12l4 4L19 6"/></svg>;
    case 'chevron':  return <svg {...p}><path d="M9 6l6 6-6 6"/></svg>;
    case 'stack':    return <svg {...p}><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/><path d="M3 18l9 5 9-5" opacity=".5"/></svg>;
    case 'spark':    return <svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></svg>;
    case 'info':     return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>;
    case 'mic':      return <svg {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    default: return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// Citation chip
// ──────────────────────────────────────────────────────────────────
function CitationChip({ n, onClick, accent }) {
  return (
    <span
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 20, height: 20, padding: '0 6px',
        marginLeft: 3, marginRight: 1,
        borderRadius: 6,
        background: PEPTALK_COLORS.blueTint,
        color: accent,
        fontSize: 11, fontWeight: 600,
        lineHeight: 1,
        verticalAlign: 'middle',
        cursor: 'pointer',
        userSelect: 'none',
        transform: 'translateY(-1px)',
      }}
    >{n}</span>
  );
}

// ──────────────────────────────────────────────────────────────────
// Answer body — renders the mixed paragraph/heading/li array
// ──────────────────────────────────────────────────────────────────
function AnswerBody({ blocks, accent, baseSize = 15 }) {
  return (
    <div style={{ color: PEPTALK_COLORS.textPrimary, fontSize: baseSize, lineHeight: 1.55, letterSpacing: '-0.005em' }}>
      {blocks.map((b, i) => {
        const cites = (b.cites || []).map(n => <CitationChip key={n} n={n} accent={accent} />);
        if (b.type === 'h') {
          return (
            <div key={i} style={{
              fontSize: baseSize + 2, fontWeight: 650, color: PEPTALK_COLORS.textPrimary,
              marginTop: 18, marginBottom: 6, letterSpacing: '-0.01em',
            }}>{b.text}</div>
          );
        }
        if (b.type === 'li') {
          return (
            <div key={i} style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <span style={{ flex: '0 0 4px', width: 4, height: 4, borderRadius: 4, background: PEPTALK_COLORS.textTertiary, marginTop: 9 }}/>
              <div style={{ flex: 1 }}>{b.text}{cites}</div>
            </div>
          );
        }
        return <p key={i} style={{ margin: i === 0 ? 0 : '10px 0 0' }}>{b.text}{cites}</p>;
      })}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Sources footer
// ──────────────────────────────────────────────────────────────────
function SourcesFooter({ sources, accent }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{
      marginTop: 18, paddingTop: 14,
      borderTop: `1px solid ${PEPTALK_COLORS.hairline}`,
    }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: PEPTALK_COLORS.textSecondary, fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          <Icon name="doc" size={13}/>
          <span>Sources · {sources.length}</span>
        </div>
        <div style={{ transform: open ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 160ms', color: PEPTALK_COLORS.textTertiary }}>
          <Icon name="chevron" size={14}/>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sources.map(s => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 0',
              borderBottom: `1px solid ${PEPTALK_COLORS.hairline}`,
              cursor: 'pointer',
            }}>
              <div style={{
                flex: '0 0 22px', width: 22, height: 22, borderRadius: 6,
                background: PEPTALK_COLORS.blueTint, color: accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
              }}>{s.id}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: PEPTALK_COLORS.textPrimary, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {s.breadcrumb}
                </div>
                <div style={{ fontSize: 11, color: PEPTALK_COLORS.textSecondary, marginTop: 1 }}>{s.kind}</div>
              </div>
              <Icon name="chevron" size={14} color={PEPTALK_COLORS.textTertiary}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Q&A turn (question label + answer card)
// ──────────────────────────────────────────────────────────────────
function Turn({ question, answer, sources, accent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        alignSelf: 'flex-end',
        maxWidth: '85%',
        background: PEPTALK_COLORS.panel,
        color: PEPTALK_COLORS.textPrimary,
        fontSize: 14,
        padding: '10px 14px',
        borderRadius: 14,
        borderTopRightRadius: 4,
        lineHeight: 1.4,
      }}>{question}</div>

      <div style={{
        background: PEPTALK_COLORS.surface,
        border: `1px solid ${PEPTALK_COLORS.hairline}`,
        borderRadius: 16,
        padding: '18px 18px 16px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px -16px rgba(15, 23, 42, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: `linear-gradient(135deg, ${accent}, ${PEPTALK_COLORS.blueDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon name="spark" size={12} strokeWidth={2.25}/>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: PEPTALK_COLORS.textSecondary, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Answer
          </div>
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: PEPTALK_COLORS.textTertiary }}>Grounded · 1,837 files</div>
        </div>
        <AnswerBody blocks={answer} accent={accent}/>
        <SourcesFooter sources={sources} accent={accent}/>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Streaming card — skeleton shimmer + soft cursor
// ──────────────────────────────────────────────────────────────────
function StreamingCard({ question, accent, partialText }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        alignSelf: 'flex-end', maxWidth: '85%',
        background: PEPTALK_COLORS.panel, color: PEPTALK_COLORS.textPrimary,
        fontSize: 14, padding: '10px 14px',
        borderRadius: 14, borderTopRightRadius: 4, lineHeight: 1.4,
      }}>{question}</div>
      <div style={{
        background: PEPTALK_COLORS.surface,
        border: `1px solid ${PEPTALK_COLORS.hairline}`,
        borderRadius: 16, padding: '18px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03), 0 8px 24px -16px rgba(15, 23, 42, 0.12)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: `linear-gradient(135deg, ${accent}, ${PEPTALK_COLORS.blueDeep})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}>
            <Icon name="spark" size={12} strokeWidth={2.25}/>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: accent, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Searching 1,837 files</span>
            <span className="pep-dots">
              <span/><span/><span/>
            </span>
          </div>
        </div>
        {partialText ? (
          <div style={{ fontSize: 15, lineHeight: 1.55, color: PEPTALK_COLORS.textPrimary, letterSpacing: '-0.005em' }}>
            {partialText}
            <span className="pep-cursor" style={{ background: accent }}/>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="pep-skel" style={{ height: 12, width: '92%' }}/>
            <div className="pep-skel" style={{ height: 12, width: '78%' }}/>
            <div className="pep-skel" style={{ height: 12, width: '85%' }}/>
            <div className="pep-skel" style={{ height: 12, width: '40%' }}/>
          </div>
        )}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Empty state — app intro + starter prompts
// ──────────────────────────────────────────────────────────────────
function EmptyState({ onPick, accent, stackSize }) {
  return (
    <div style={{ padding: '24px 18px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 14 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `linear-gradient(135deg, ${accent}, ${PEPTALK_COLORS.blueDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 8px 20px -8px ${accent}80`,
        }}>
          <Icon name="spark" size={22} color="#fff" strokeWidth={2}/>
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 700, color: PEPTALK_COLORS.textPrimary, letterSpacing: '-0.02em' }}>
            Ask PepTalk
          </div>
          <div style={{ fontSize: 15, color: PEPTALK_COLORS.textSecondary, marginTop: 4, lineHeight: 1.45, maxWidth: 320 }}>
            Evidence-based answers about peptides, supplements & protocols — grounded in your curated library.
          </div>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: PEPTALK_COLORS.blueTint, color: accent,
          padding: '6px 10px', borderRadius: 999,
          fontSize: 12, fontWeight: 600,
        }}>
          <Icon name="shield" size={13}/>
          <span>Grounded in 1,837 curated files</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: PEPTALK_COLORS.textSecondary, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Start here
        </div>
        {STARTER_PROMPTS.map((s, i) => (
          <div key={i}
            onClick={() => onPick(s.title)}
            style={{
              background: PEPTALK_COLORS.surface,
              border: `1px solid ${PEPTALK_COLORS.hairline}`,
              borderRadius: 14, padding: '13px 14px',
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              transition: 'transform 120ms, border-color 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = PEPTALK_COLORS.hairline; }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9, flex: '0 0 32px',
              background: PEPTALK_COLORS.blueTint, color: accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={s.icon} size={16} strokeWidth={2}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: PEPTALK_COLORS.textPrimary, letterSpacing: '-0.005em' }}>{s.title}</div>
              <div style={{ fontSize: 12, color: PEPTALK_COLORS.textSecondary, marginTop: 1 }}>{s.sub}</div>
            </div>
            <Icon name="chevron" size={16} color={PEPTALK_COLORS.textTertiary}/>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '10px 12px', marginTop: 4,
        background: PEPTALK_COLORS.panel,
        borderRadius: 10,
      }}>
        <Icon name="info" size={14} color={PEPTALK_COLORS.textSecondary}/>
        <div style={{ fontSize: 11.5, color: PEPTALK_COLORS.textSecondary, lineHeight: 1.45 }}>
          Educational information, not medical advice. Always consult a qualified clinician before changing your protocol.
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Header (in-app top bar above the iOS status bar's content area)
// ──────────────────────────────────────────────────────────────────
function ChatHeader({ accent }) {
  return (
    <div style={{
      padding: '60px 18px 14px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: PEPTALK_COLORS.background,
      borderBottom: `1px solid ${PEPTALK_COLORS.hairline}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 9,
          background: `linear-gradient(135deg, ${accent}, ${PEPTALK_COLORS.blueDeep})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon name="spark" size={15} color="#fff" strokeWidth={2.25}/>
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: PEPTALK_COLORS.textPrimary, letterSpacing: '-0.01em', lineHeight: 1.1 }}>PepTalk</div>
          <div style={{ fontSize: 11, color: PEPTALK_COLORS.textSecondary, marginTop: 1 }}>Answer engine · grounded</div>
        </div>
      </div>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: PEPTALK_COLORS.panel,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: PEPTALK_COLORS.textSecondary, cursor: 'pointer',
      }}>
        <Icon name="plus" size={18}/>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Composer
// ──────────────────────────────────────────────────────────────────
function Composer({ value, onChange, onSend, disabled, accent, showStackChip, stackSize }) {
  const canSend = value.trim().length > 0 && !disabled;
  return (
    <div style={{
      padding: '10px 14px 28px',
      background: PEPTALK_COLORS.background,
      borderTop: `1px solid ${PEPTALK_COLORS.hairline}`,
    }}>
      {showStackChip && (
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 10 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: PEPTALK_COLORS.surface,
            border: `1px solid ${PEPTALK_COLORS.hairline}`,
            color: PEPTALK_COLORS.textSecondary,
            padding: '5px 10px 5px 8px',
            borderRadius: 999, fontSize: 12, fontWeight: 500,
          }}>
            <Icon name="stack" size={13} color={accent}/>
            <span>Using your stack · <strong style={{ color: PEPTALK_COLORS.textPrimary, fontWeight: 600 }}>{stackSize} items</strong></span>
          </div>
        </div>
      )}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: PEPTALK_COLORS.surface,
        border: `1px solid ${PEPTALK_COLORS.hairline}`,
        borderRadius: 22,
        padding: '6px 6px 6px 14px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -16px rgba(15, 23, 42, 0.12)',
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: 999, marginBottom: 3,
          background: 'transparent', color: PEPTALK_COLORS.textSecondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          flex: '0 0 30px',
        }}>
          <Icon name="plus" size={18}/>
        </div>
        <textarea
          rows={1}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); } }}
          placeholder="Ask about your stack, dosing, interactions…"
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            background: 'transparent',
            fontSize: 15, lineHeight: 1.4,
            color: PEPTALK_COLORS.textPrimary,
            fontFamily: 'inherit',
            padding: '8px 0',
            maxHeight: 120,
          }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          style={{
            width: 34, height: 34, borderRadius: 999, border: 'none',
            background: canSend ? accent : PEPTALK_COLORS.panel,
            color: canSend ? '#fff' : PEPTALK_COLORS.textTertiary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canSend ? 'pointer' : 'default',
            transition: 'background 120ms',
            flex: '0 0 34px',
            boxShadow: canSend ? `0 4px 12px -4px ${accent}80` : 'none',
          }}
        >
          <Icon name="arrowUp" size={16} strokeWidth={2.5}/>
        </button>
      </div>
      <div style={{
        textAlign: 'center', fontSize: 10.5,
        color: PEPTALK_COLORS.textTertiary,
        marginTop: 8, letterSpacing: '0.01em',
      }}>
        Educational information · not medical advice
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main chat screen
// ──────────────────────────────────────────────────────────────────
function ChatScreen({ scenario, accent, showStackChip, stackSize, density, onScenarioChange }) {
  const [prompt, setPrompt] = React.useState('');
  const [turns, setTurns] = React.useState([]);
  const [streaming, setStreaming] = React.useState(null); // {question, partial}
  const scrollRef = React.useRef(null);

  // Reset turns when scenario changes
  React.useEffect(() => {
    if (scenario === 'empty') {
      setTurns([]); setStreaming(null); setPrompt('');
    } else if (scenario === 'streaming') {
      setTurns([]);
      setStreaming({ question: SAMPLE_TURN.question, partial: '' });
      // animate partial fill
      let i = 0;
      const txt = 'Yes — in most cases this combination is well-tolerated. Tirzepatide drives appetite suppression while creatine ';
      const id = setInterval(() => {
        i += 3;
        setStreaming(s => s ? { ...s, partial: txt.slice(0, i) } : s);
        if (i >= txt.length) clearInterval(id);
      }, 60);
      return () => clearInterval(id);
    } else if (scenario === 'conversation') {
      setTurns([SAMPLE_TURN]);
      setStreaming(null);
    }
  }, [scenario]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [turns, streaming]);

  const send = (textOverride) => {
    const text = (textOverride ?? prompt).trim();
    if (!text) return;
    setPrompt('');
    setStreaming({ question: text, partial: '' });
    onScenarioChange && onScenarioChange('conversation'); // exit empty
    // simulate streaming
    let i = 0;
    const reply = 'Yes — in most cases this combination is well-tolerated. ';
    const tick = () => {
      i += 4;
      setStreaming(s => s ? { ...s, partial: reply.slice(0, Math.min(i, reply.length)) } : s);
      if (i < reply.length + 30) {
        setTimeout(tick, 60);
      } else {
        // finalize: append a Turn with full sample answer
        setTurns(prev => [...prev, { ...SAMPLE_TURN, question: text }]);
        setStreaming(null);
      }
    };
    setTimeout(tick, 400);
  };

  const padBase = density === 'compact' ? 12 : density === 'comfy' ? 22 : 16;
  const isEmpty = turns.length === 0 && !streaming;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: PEPTALK_COLORS.background,
      fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
      color: PEPTALK_COLORS.textPrimary,
    }}>
      <ChatHeader accent={accent}/>
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
      >
        {isEmpty ? (
          <EmptyState onPick={(q) => send(q)} accent={accent} stackSize={stackSize}/>
        ) : (
          <div style={{ padding: `${padBase}px ${padBase}px ${padBase + 4}px`, display: 'flex', flexDirection: 'column', gap: 22 }}>
            {turns.map((t, i) => <Turn key={i} {...t} accent={accent}/>)}
            {streaming && <StreamingCard question={streaming.question} partialText={streaming.partial} accent={accent}/>}
          </div>
        )}
      </div>
      <Composer
        value={prompt}
        onChange={setPrompt}
        onSend={() => send()}
        disabled={!!streaming}
        accent={accent}
        showStackChip={showStackChip}
        stackSize={stackSize}
      />
    </div>
  );
}

window.PepTalkChatScreen = ChatScreen;
