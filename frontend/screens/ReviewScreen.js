// PepTalk — AI Stack Review (presented as a modal screen from Stack quick actions).
// Light-theme redesign matching design inspo/claudeDesignCode/review-app.jsx.
// Replaces the old components/StackReviewModal.js.
//
// Two data sources, both preserved from the old modal:
//   /stack-review        — graph-based conflicts / timing / synergies (JSON)
//   /chat/stack-review   — AI deep-dive (SSE streaming, markdown)
//
// Graph response shape:
//   conflicts:        [{ items:[a,b], severity, relationship, mechanism, management }]
//   timing_conflicts: [{ items:[a,b], rule, mechanism }]
//   synergies:        [{ items:[a,b], mechanism }]

import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStack } from '../context/StackContext';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import Spinner from '../components/Spinner';
import SparkAvatar from '../components/SparkAvatar';
import PrimaryButton from '../components/PrimaryButton';
import MarkdownBubble from '../components/MarkdownBubble';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';
import { API_URL } from '../config';

export default function ReviewScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { stack } = useStack();

  const [graphData, setGraphData] = useState(null);
  const [graphError, setGraphError] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(true);

  const [aiState, setAiState] = useState('idle'); // idle | loading | done
  const [aiReview, setAiReview] = useState(null);

  const stackPayload = useCallback(
    () => stack.map((s) => ({ item: s.item, category: s.category, dose: s.dose, slug: s.slug })),
    [stack]
  );

  // Fetch graph review on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGraph(true);
      setGraphError(null);
      try {
        const res = await fetch(`${API_URL}/stack-review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stack: stackPayload() }),
        });
        const data = await res.json();
        if (!cancelled) setGraphData(data);
      } catch (err) {
        if (!cancelled) setGraphError(err.message);
      } finally {
        if (!cancelled) setLoadingGraph(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stackPayload]);

  const fetchAIReview = async () => {
    setAiState('loading');
    try {
      const res = await fetch(`${API_URL}/chat/stack-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stack: stackPayload() }),
      });
      const rawText = await res.text();
      let fullReply = '';
      for (const line of rawText.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const event = JSON.parse(jsonStr);
          if (event.type === 'token') fullReply += event.content;
          else if (event.type === 'error') throw new Error(event.content);
        } catch {
          // skip malformed line
        }
      }
      fullReply = fullReply.replace(/\n{1,3}---\n*Sources?:.*$/s, '').trim();
      setAiReview(fullReply || 'No response.');
      setAiState('done');
    } catch (err) {
      setAiReview(`Error: ${err.message}`);
      setAiState('done');
    }
  };

  const conflicts = graphData?.conflicts || [];
  const timing = graphData?.timing_conflicts || [];
  const synergies = graphData?.synergies || [];
  const hasIssues = conflicts.length + timing.length + synergies.length > 0;

  return (
    <View style={styles.container}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.s }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={8}>
          <Icon name="x" size={15} color={COLORS.textSecondary} strokeWidth={2.25} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Stack Review</Text>
          {!loadingGraph && (
            <Text style={styles.headerSub}>Analyzing {stack.length} items</Text>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.done}>Done</Text>
        </TouchableOpacity>
      </View>

      {loadingGraph ? (
        <View style={styles.loadingWrap}>
          <Spinner size={30} thickness={3} />
          <Text style={styles.loadingTitle}>Analyzing your stack…</Text>
          <Text style={styles.loadingSub}>
            Cross-referencing {stack.length} items against the interaction graph
          </Text>
        </View>
      ) : graphError ? (
        <View style={styles.loadingWrap}>
          <Text style={styles.errorText}>Couldn't load review: {graphError}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {!hasIssues ? (
            <NoIssues />
          ) : (
            <>
              {conflicts.length > 0 && (
                <View style={styles.section}>
                  <SecHead
                    icon="alert"
                    label="Conflicts"
                    count={conflicts.length}
                    color={COLORS.danger}
                    tint={COLORS.dangerTint}
                  />
                  {conflicts.map((c, i) => (
                    <IssueCard
                      key={i}
                      pair={(c.items || []).join(' + ')}
                      severity={c.severity}
                      type={c.relationship}
                      mechanism={c.mechanism}
                      management={c.management}
                      accent={COLORS.danger}
                    />
                  ))}
                </View>
              )}

              {timing.length > 0 && (
                <View style={styles.section}>
                  <SecHead
                    icon="clock"
                    label="Timing issues"
                    count={timing.length}
                    color={COLORS.amberDeep}
                    tint={COLORS.amberTint}
                  />
                  {timing.map((t, i) => (
                    <IssueCard
                      key={i}
                      pair={(t.items || []).join(' + ')}
                      type={t.rule}
                      mechanism={t.mechanism}
                      accent={COLORS.amber}
                    />
                  ))}
                </View>
              )}

              {synergies.length > 0 && (
                <View style={styles.section}>
                  <SecHead
                    icon="checkCircle"
                    label="Synergies"
                    count={synergies.length}
                    color={COLORS.greenDeep}
                    tint={COLORS.greenTint}
                  />
                  {synergies.map((s, i) => (
                    <IssueCard
                      key={i}
                      pair={(s.items || []).join(' + ')}
                      mechanism={s.mechanism}
                      accent={COLORS.green}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          {/* AI deep-dive */}
          <View style={[styles.section, { paddingTop: SPACING.xxs }]}>
            <View style={styles.aiHead}>
              <View style={styles.aiHeadIcon}>
                <Icon name="sparkSolid" size={14} color={COLORS.indigo} strokeWidth={2} />
              </View>
              <Text style={styles.aiHeadLabel}>AI deep-dive</Text>
            </View>

            {aiState === 'idle' && (
              <View style={{ paddingHorizontal: SPACING.l }}>
                <PrimaryButton
                  label="Get AI Analysis"
                  gradient="indigo"
                  onPress={fetchAIReview}
                  icon={<Icon name="sparkSolid" size={16} color="#fff" strokeWidth={2} />}
                />
                <Text style={styles.aiHint}>
                  Deeper personalized review using your full library
                </Text>
              </View>
            )}

            {aiState === 'loading' && (
              <View style={styles.aiLoading}>
                <Spinner size={18} color={COLORS.indigo} />
                <Text style={styles.aiLoadingText}>AI is reviewing your stack…</Text>
              </View>
            )}

            {aiState === 'done' && (
              <View style={styles.aiCard}>
                <View style={styles.aiCardHead}>
                  <SparkAvatar size={22} variant="indigo" />
                  <Text style={styles.aiCardTitle}>AI Analysis</Text>
                  <View style={{ flex: 1 }} />
                  <Badge variant="neutral" style={styles.aiGenBadge}>AI-generated</Badge>
                </View>
                <MarkdownBubble>{aiReview}</MarkdownBubble>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Section heading — colored icon square + label + count pill
// ─────────────────────────────────────────────────────────────
function SecHead({ icon, label, count, color, tint }) {
  return (
    <View style={sh.row}>
      <View style={[sh.iconSquare, { backgroundColor: tint }]}>
        <Icon name={icon} size={14} color={color} strokeWidth={2} />
      </View>
      <Text style={sh.label}>{label}</Text>
      <View style={[sh.countPill, { backgroundColor: tint }]}>
        <Text style={[sh.countText, { color }]}>{count}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Issue card — colored left border + pair + severity + mechanism
// ─────────────────────────────────────────────────────────────
function IssueCard({ pair, severity, type, mechanism, management, accent }) {
  const sevVariant = severity ? severity.toLowerCase() : null;
  const sevKnown = ['high', 'moderate', 'low'].includes(sevVariant);
  return (
    <View style={[ic.card, { borderLeftColor: accent }, SHADOWS.card]}>
      <View style={ic.titleRow}>
        <Text style={ic.pair}>{pair}</Text>
        {severity ? (
          <Badge variant={sevKnown ? sevVariant : 'neutral'}>{severity}</Badge>
        ) : null}
      </View>
      {type ? <Text style={[ic.type, { color: accent }]}>{type}</Text> : null}
      {mechanism ? <Text style={ic.mechanism}>{mechanism}</Text> : null}
      {management ? (
        <View style={ic.mgmtWrap}>
          <Text style={ic.mgmt}>
            <Text style={ic.mgmtLabel}>Management: </Text>
            {management}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// No issues card
// ─────────────────────────────────────────────────────────────
function NoIssues() {
  return (
    <View style={ni.card}>
      <View style={ni.checkCircle}>
        <Icon name="check" size={20} color="#fff" strokeWidth={3} />
      </View>
      <View style={{ alignItems: 'center' }}>
        <Text style={ni.title}>No known issues</Text>
        <Text style={ni.subtitle}>
          No known conflicts or synergies found between your stack items.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.m,
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.ms,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: RADII.full,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11.5,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  done: {
    color: COLORS.bluePrimary,
    fontSize: 14,
    fontWeight: '600',
    padding: 4,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.ms,
    padding: SPACING.xl,
  },
  loadingTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  loadingSub: {
    fontSize: 12.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'center',
  },
  scroll: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  section: {
    gap: 0,
  },

  // AI deep-dive
  aiHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.m,
  },
  aiHeadIcon: {
    width: 26,
    height: 26,
    borderRadius: RADII.iconSquare,
    backgroundColor: COLORS.indigoTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiHeadLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  aiHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.s,
    lineHeight: 16,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.l,
    paddingVertical: SPACING.ms,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.indigoTint,
    borderRadius: RADII.input,
  },
  aiLoadingText: {
    fontSize: 13.5,
    fontWeight: '500',
    color: COLORS.indigoDeep,
  },
  aiCard: {
    marginHorizontal: SPACING.l,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.indigo,
    borderRadius: RADII.input,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  aiCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.m,
  },
  aiCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  aiGenBadge: {
    backgroundColor: COLORS.indigoTint,
  },
});

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.l,
    marginBottom: SPACING.sm,
  },
  iconSquare: {
    width: 26,
    height: 26,
    borderRadius: RADII.iconSquare,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
  },
  countPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADII.full,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});

const ic = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.l,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderLeftWidth: 3,
    borderRadius: RADII.input,
    paddingVertical: SPACING.ms,
    paddingHorizontal: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
    marginBottom: SPACING.s,
    flexWrap: 'wrap',
  },
  pair: {
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.1,
    flexShrink: 1,
  },
  type: {
    fontSize: 12.5,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    letterSpacing: -0.1,
  },
  mechanism: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  mgmtWrap: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
    borderStyle: 'dashed',
  },
  mgmt: {
    fontSize: 12.5,
    color: COLORS.textPrimary,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  mgmtLabel: {
    fontWeight: '600',
    fontStyle: 'normal',
    color: COLORS.textPrimary,
  },
});

const ni = StyleSheet.create({
  card: {
    marginHorizontal: SPACING.l,
    backgroundColor: COLORS.greenTint,
    borderWidth: 1,
    borderColor: COLORS.greenTint,
    borderRadius: RADII.card,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.l,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  checkCircle: {
    width: 40,
    height: 40,
    borderRadius: RADII.full,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.greenDeep,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 260,
  },
});
