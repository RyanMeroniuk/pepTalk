/* PepTalk — Stack Review modal (full-height page sheet) */

const REVIEW_COLORS = {
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
  indigo: '#4F46E5',
  indigoDeep: '#3730A3',
  indigoTint: '#EEF2FF',
  danger: '#DC2626',
  dangerTint: '#FEF2F2',
  amber: '#D97706',
  amberAccent: '#F59E0B',
  amberTint: '#FFFBEB',
  green: '#10B981',
  greenDeep: '#047857',
  greenTint: '#ECFDF5',
};

function RIcon({ name, size = 18, color = 'currentColor', strokeWidth = 1.75 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'alert':    return <svg {...p}><path d="M12 2L1 21h22L12 2z"/><path d="M12 9v5M12 17h.01"/></svg>;
    case 'clock':    return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'check':    return <svg {...p}><path d="M5 12.5l4.5 4.5L19 7"/></svg>;
    case 'checkCircle': return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>;
    case 'spark':    return <svg {...p}><path d="M12 3l1.8 5.5L19 10l-5.2 1.5L12 17l-1.8-5.5L5 10l5.2-1.5z"/><path d="M19 4v3M21 5h-4"/></svg>;
    case 'x':        return <svg {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'shield':   return <svg {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6l8-3z"/></svg>;
    default: return null;
  }
}

// ──────────────────────────────────────────────────────────────────
// Sample data
// ──────────────────────────────────────────────────────────────────
const SAMPLE_REVIEW = {
  stackCount: 7,
  conflicts: [
    {
      pair: 'Tirzepatide + Insulin Glargine',
      severity: 'HIGH',
      type: 'Additive hypoglycemic effect',
      mechanism: 'Both lower blood glucose; combined use significantly raises risk of severe hypoglycemia, especially during dose titration or caloric deficit.',
      management: 'Reduce basal insulin by 20–30% when initiating tirzepatide; monitor CGM closely for the first 4 weeks.',
    },
    {
      pair: 'BPC-157 + Aspirin (daily)',
      severity: 'MODERATE',
      type: 'Mechanism overlap',
      mechanism: 'BPC-157 may potentiate antiplatelet effects via NO pathway modulation; clinical data limited.',
      management: 'Avoid concurrent NSAIDs during BPC-157 cycles unless cleared by a clinician.',
    },
  ],
  timing: [
    {
      pair: 'Magnesium Glycinate + Thyroid (T3/T4)',
      rule: 'Separate by ≥ 4 hours',
      mechanism: 'Divalent cations bind levothyroxine in the gut and reduce absorption by up to 30%.',
    },
  ],
  synergies: [
    {
      pair: 'Creatine + Resistance Training',
      mechanism: 'Creatine monohydrate (3–5g/day) preserves lean mass and strength output during caloric deficit driven by GLP-1 agonists.',
    },
    {
      pair: 'Vitamin D3 + K2 (MK-7)',
      mechanism: 'K2 directs calcium mobilized by D3 toward bone rather than soft tissue; co-administration is standard practice.',
    },
  ],
  ai: {
    available: true,
    body: [
      { type: 'h', text: 'Overall assessment' },
      { type: 'p', text: 'Your stack is internally coherent for a body-recomposition phase, with one high-priority interaction to manage and a couple of timing adjustments that will improve absorption.' },
      { type: 'h', text: 'Recommended adjustments' },
      { type: 'li', text: 'Titrate the basal insulin downward as tirzepatide ramps; share a CGM trace with your prescriber after week 2.' },
      { type: 'li', text: 'Move magnesium to bedtime — it will also support sleep, separating it cleanly from morning thyroid.' },
      { type: 'li', text: 'Continue creatine through the deficit — it’s the highest-evidence intervention in your stack for retaining strength.' },
      { type: 'h', text: 'Watch for' },
      { type: 'p', text: 'GI symptoms in the first 4 weeks of tirzepatide titration. If they persist past 6 weeks, revisit dose pacing before adding additional peptides.' },
    ],
  },
};

// ──────────────────────────────────────────────────────────────────
// Modal header
// ──────────────────────────────────────────────────────────────────
function ReviewHeader({ stackCount }) {
  return (
    <div style={{
      padding: '54px 18px 14px',
      background: REVIEW_COLORS.surface,
      borderBottom: `1px solid ${REVIEW_COLORS.hairline}`,
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: REVIEW_COLORS.panel, color: REVIEW_COLORS.textSecondary,
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
        }}>
          <RIcon name="x" size={15} strokeWidth={2.25}/>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: REVIEW_COLORS.textPrimary, letterSpacing: '-0.01em' }}>
            Stack Review
          </div>
          {stackCount != null && (
            <div style={{ fontSize: 11.5, color: REVIEW_COLORS.textSecondary, marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>
              Analyzing {stackCount} items
            </div>
          )}
        </div>
        <button style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: REVIEW_COLORS.bluePrimary, fontSize: 14, fontWeight: 600,
          padding: 4, fontFamily: 'inherit',
        }}>Done</button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Section heading
// ──────────────────────────────────────────────────────────────────
function SecHead({ icon, label, count, color, tint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', marginBottom: 10 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 8,
        background: tint, color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <RIcon name={icon} size={14} strokeWidth={2}/>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: REVIEW_COLORS.textPrimary, letterSpacing: '-0.01em' }}>
        {label}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: color,
        background: tint, padding: '2px 7px', borderRadius: 999,
        fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
      }}>{count}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Severity badge
// ──────────────────────────────────────────────────────────────────
function SeverityBadge({ level }) {
  const map = {
    HIGH:     { bg: REVIEW_COLORS.dangerTint, fg: REVIEW_COLORS.danger     },
    MODERATE: { bg: REVIEW_COLORS.amberTint,  fg: REVIEW_COLORS.amber      },
    LOW:      { bg: REVIEW_COLORS.greenTint,  fg: REVIEW_COLORS.greenDeep  },
  };
  const c = map[level] || map.LOW;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: 5,
      background: c.bg, color: c.fg,
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{level}</span>
  );
}

// ──────────────────────────────────────────────────────────────────
// Issue card (with colored left border)
// ──────────────────────────────────────────────────────────────────
function IssueCard({ pair, badge, type, mechanism, management, accentColor }) {
  return (
    <div style={{
      margin: '0 18px 10px',
      background: REVIEW_COLORS.surface,
      border: `1px solid ${REVIEW_COLORS.hairline}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: 12,
      padding: '14px 16px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: REVIEW_COLORS.textPrimary, letterSpacing: '-0.005em' }}>
          {pair}
        </span>
        {badge}
      </div>
      {type && (
        <div style={{ fontSize: 12.5, fontWeight: 600, color: accentColor, marginBottom: 6, letterSpacing: '-0.005em' }}>
          {type}
        </div>
      )}
      <div style={{ fontSize: 13, color: REVIEW_COLORS.textSecondary, lineHeight: 1.5 }}>
        {mechanism}
      </div>
      {management && (
        <div style={{
          marginTop: 10, paddingTop: 10,
          borderTop: `1px dashed ${REVIEW_COLORS.hairline}`,
          fontSize: 12.5, color: REVIEW_COLORS.textPrimary, lineHeight: 1.5,
          fontStyle: 'italic',
        }}>
          <strong style={{ fontStyle: 'normal', color: REVIEW_COLORS.textPrimary, fontWeight: 600 }}>Management: </strong>
          {management}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// AI Analysis card
// ──────────────────────────────────────────────────────────────────
function AIAnalysisCard({ body }) {
  return (
    <div style={{
      margin: '0 18px',
      background: REVIEW_COLORS.surface,
      border: `1px solid ${REVIEW_COLORS.hairline}`,
      borderLeft: `3px solid ${REVIEW_COLORS.indigo}`,
      borderRadius: 12,
      padding: '16px 18px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: `linear-gradient(135deg, ${REVIEW_COLORS.indigo}, ${REVIEW_COLORS.indigoDeep})`,
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RIcon name="spark" size={12} strokeWidth={2}/>
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: REVIEW_COLORS.textPrimary, letterSpacing: '-0.005em' }}>
          AI Analysis
        </div>
        <div style={{ flex: 1 }}/>
        <div style={{
          fontSize: 10, fontWeight: 700, color: REVIEW_COLORS.indigoDeep,
          background: REVIEW_COLORS.indigoTint,
          padding: '2px 7px', borderRadius: 5,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>AI-generated</div>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.55, color: REVIEW_COLORS.textPrimary, letterSpacing: '-0.003em' }}>
        {body.map((b, i) => {
          if (b.type === 'h') return (
            <div key={i} style={{ fontSize: 13.5, fontWeight: 700, color: REVIEW_COLORS.textPrimary, marginTop: i === 0 ? 0 : 14, marginBottom: 4 }}>
              {b.text}
            </div>
          );
          if (b.type === 'li') return (
            <div key={i} style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              <span style={{ flex: '0 0 4px', width: 4, height: 4, borderRadius: 4, background: REVIEW_COLORS.textTertiary, marginTop: 9 }}/>
              <div style={{ flex: 1, fontSize: 13.5, color: REVIEW_COLORS.textSecondary, lineHeight: 1.55 }}>{b.text}</div>
            </div>
          );
          return <p key={i} style={{ margin: '6px 0 0', fontSize: 13.5, color: REVIEW_COLORS.textSecondary, lineHeight: 1.55 }}>{b.text}</p>;
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// AI loading row
// ──────────────────────────────────────────────────────────────────
function AILoading() {
  return (
    <div style={{
      margin: '0 18px',
      background: REVIEW_COLORS.indigoTint,
      border: `1px solid ${REVIEW_COLORS.indigo}33`,
      borderRadius: 12, padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div className="rev-spin" style={{
        width: 18, height: 18, borderRadius: 999,
        border: `2px solid ${REVIEW_COLORS.indigo}33`,
        borderTopColor: REVIEW_COLORS.indigo,
      }}/>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: REVIEW_COLORS.indigoDeep }}>
        AI is reviewing your stack…
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Get AI Analysis button
// ──────────────────────────────────────────────────────────────────
function GetAIButton({ onClick }) {
  return (
    <div style={{ padding: '0 18px' }}>
      <button onClick={onClick} style={{
        width: '100%', appearance: 'none', border: 'none', cursor: 'pointer',
        background: `linear-gradient(135deg, ${REVIEW_COLORS.indigo}, ${REVIEW_COLORS.bluePrimary})`,
        color: '#fff',
        fontSize: 15, fontWeight: 600,
        padding: '14px', borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        fontFamily: 'inherit',
        boxShadow: `0 8px 20px -10px ${REVIEW_COLORS.indigo}80`,
      }}>
        <RIcon name="spark" size={16} color="#fff" strokeWidth={2}/>
        <span>Get AI Analysis</span>
      </button>
      <div style={{ fontSize: 11, color: REVIEW_COLORS.textTertiary, textAlign: 'center', marginTop: 8, lineHeight: 1.4 }}>
        Deeper personalized review using your full library
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Loading state
// ──────────────────────────────────────────────────────────────────
function ReviewLoading() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 14,
      padding: 24,
    }}>
      <div className="rev-spin" style={{
        width: 30, height: 30, borderRadius: 999,
        border: `3px solid ${REVIEW_COLORS.bluePrimary}22`,
        borderTopColor: REVIEW_COLORS.bluePrimary,
      }}/>
      <div style={{ fontSize: 15, fontWeight: 500, color: REVIEW_COLORS.textPrimary }}>
        Analyzing your stack…
      </div>
      <div style={{ fontSize: 12.5, color: REVIEW_COLORS.textSecondary, textAlign: 'center', maxWidth: 240, lineHeight: 1.5 }}>
        Cross-referencing 7 items against the interaction graph
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// No issues
// ──────────────────────────────────────────────────────────────────
function NoIssues() {
  return (
    <div style={{
      margin: '0 18px',
      background: REVIEW_COLORS.greenTint,
      border: `1px solid ${REVIEW_COLORS.green}44`,
      borderRadius: 14, padding: '22px 18px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 999,
        background: REVIEW_COLORS.green, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <RIcon name="check" size={20} strokeWidth={3}/>
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: REVIEW_COLORS.greenDeep, letterSpacing: '-0.005em' }}>
          No known issues
        </div>
        <div style={{ fontSize: 13, color: REVIEW_COLORS.textSecondary, marginTop: 4, lineHeight: 1.5, maxWidth: 260 }}>
          No known conflicts or synergies found between your stack items.
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Main screen
// ──────────────────────────────────────────────────────────────────
function ReviewScreen({ scenario = 'populated' }) {
  const [aiState, setAiState] = React.useState(scenario === 'populated' ? 'done' : 'idle');

  React.useEffect(() => { setAiState(scenario === 'populated' ? 'done' : 'idle'); }, [scenario]);

  const data = SAMPLE_REVIEW;
  const hasIssues = data.conflicts.length + data.timing.length + data.synergies.length > 0;

  if (scenario === 'loading') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        background: REVIEW_COLORS.background,
        fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
        color: REVIEW_COLORS.textPrimary,
      }}>
        <ReviewHeader stackCount={null}/>
        <ReviewLoading/>
      </div>
    );
  }

  const startAI = () => {
    setAiState('loading');
    setTimeout(() => setAiState('done'), 1400);
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: REVIEW_COLORS.background,
      fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif',
      color: REVIEW_COLORS.textPrimary,
    }}>
      <ReviewHeader stackCount={data.stackCount}/>
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 0 32px' }}>
        {scenario === 'empty' ? (
          <NoIssues/>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            {/* Conflicts */}
            <div>
              <SecHead icon="alert" label="Conflicts" count={data.conflicts.length} color={REVIEW_COLORS.danger} tint={REVIEW_COLORS.dangerTint}/>
              {data.conflicts.map((c, i) => (
                <IssueCard key={i}
                  pair={c.pair}
                  badge={<SeverityBadge level={c.severity}/>}
                  type={c.type}
                  mechanism={c.mechanism}
                  management={c.management}
                  accentColor={REVIEW_COLORS.danger}
                />
              ))}
            </div>

            {/* Timing */}
            <div>
              <SecHead icon="clock" label="Timing issues" count={data.timing.length} color={REVIEW_COLORS.amber} tint={REVIEW_COLORS.amberTint}/>
              {data.timing.map((t, i) => (
                <IssueCard key={i}
                  pair={t.pair}
                  type={t.rule}
                  mechanism={t.mechanism}
                  accentColor={REVIEW_COLORS.amberAccent}
                />
              ))}
            </div>

            {/* Synergies */}
            <div>
              <SecHead icon="check" label="Synergies" count={data.synergies.length} color={REVIEW_COLORS.greenDeep} tint={REVIEW_COLORS.greenTint}/>
              {data.synergies.map((s, i) => (
                <IssueCard key={i}
                  pair={s.pair}
                  mechanism={s.mechanism}
                  accentColor={REVIEW_COLORS.green}
                />
              ))}
            </div>

            {/* AI deep-dive */}
            <div style={{ paddingTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', marginBottom: 12 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 8,
                  background: REVIEW_COLORS.indigoTint, color: REVIEW_COLORS.indigo,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <RIcon name="spark" size={14} strokeWidth={2}/>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: REVIEW_COLORS.textPrimary, letterSpacing: '-0.01em' }}>
                  AI deep-dive
                </div>
              </div>

              {aiState === 'idle'    && <GetAIButton onClick={startAI}/>}
              {aiState === 'loading' && <AILoading/>}
              {aiState === 'done'    && <AIAnalysisCard body={data.ai.body}/>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.PepTalkReviewScreen = ReviewScreen;
