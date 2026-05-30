// PepTalk — Syringe Calculator (presented as a modal from Stack quick actions).
// Light-theme redesign matching design inspo/claudeDesignCode/syringe-app.jsx.
//
// Calculation math is unchanged from the original (it was correct); this is a
// presentation rewrite. Insulin syringes are 100 units / mL.

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../components/Icon';
import Badge from '../components/Badge';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, RADII, SPACING, FONT_SIZES, SHADOWS } from '../theme/tokens';

const SYRINGE_OPTIONS = [
  { label: '0.3 mL', totalUnits: 30, mlCapacity: 0.3 },
  { label: '0.5 mL', totalUnits: 50, mlCapacity: 0.5 },
  { label: '1 mL', totalUnits: 100, mlCapacity: 1.0 },
];

const UNITS_PER_ML = 100;

export default function SyringeCalculatorScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [syringeIndex, setSyringeIndex] = useState(1); // default 0.5 mL
  const [peptideMg, setPeptideMg] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [targetMcg, setTargetMcg] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const syringe = SYRINGE_OPTIONS[syringeIndex];

  const peptideNum = parseFloat(peptideMg);
  const waterNum = parseFloat(waterMl);
  const targetNum = parseFloat(targetMcg);
  const canCalculate = peptideNum > 0 && waterNum > 0 && targetNum > 0;

  let units = 0;
  let volumeMl = 0;
  let concentration = 0;
  let mcgPerUnit = 0;
  let state = 'empty';

  if (canCalculate) {
    concentration = peptideNum / waterNum; // mg/mL
    mcgPerUnit = (concentration * 1000) / UNITS_PER_ML; // mcg per 1 unit
    units = targetNum / mcgPerUnit;
    volumeMl = units / UNITS_PER_ML;
    state = units > syringe.totalUnits ? 'warning' : 'valid';
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + SPACING.s }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Icon name="back" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={styles.toolPill}>
            <Icon name="syringe" size={12} color={COLORS.bluePrimary} />
            <Text style={styles.toolPillText}>Tool</Text>
          </View>
        </View>
        <Text style={styles.title}>Syringe Calculator</Text>
        <Text style={styles.subtitle}>
          Calculate how many units to draw for your target dose.
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Syringe size segmented control */}
          <View>
            <Text style={styles.fieldLabel}>SYRINGE SIZE</Text>
            <View style={styles.segmented}>
              {SYRINGE_OPTIONS.map((opt, i) => {
                const active = i === syringeIndex;
                return (
                  <TouchableOpacity
                    key={opt.label}
                    activeOpacity={0.8}
                    onPress={() => setSyringeIndex(i)}
                    style={[styles.segment, active && styles.segmentActive]}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <InputField
            label="PEPTIDE AMOUNT"
            hint="Total mg in your vial"
            suffix="mg"
            value={peptideMg}
            onChangeText={setPeptideMg}
            focused={focusedField === 'peptide'}
            onFocus={() => setFocusedField('peptide')}
            onBlur={() => setFocusedField(null)}
          />
          <InputField
            label="BACTERIOSTATIC WATER"
            hint="How much BAC water you reconstituted with"
            suffix="mL"
            value={waterMl}
            onChangeText={setWaterMl}
            focused={focusedField === 'water'}
            onFocus={() => setFocusedField('water')}
            onBlur={() => setFocusedField(null)}
          />
          <InputField
            label="TARGET DOSE"
            hint="Your desired dose per injection"
            suffix="mcg"
            value={targetMcg}
            onChangeText={setTargetMcg}
            focused={focusedField === 'target'}
            onFocus={() => setFocusedField('target')}
            onBlur={() => setFocusedField(null)}
          />

          <ResultCard
            state={state}
            units={units}
            volumeMl={volumeMl}
            syringeLabel={syringe.label}
          />

          <ReconInfo
            concentration={concentration}
            mcgPerUnit={mcgPerUnit}
            hasInputs={canCalculate}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fixed Done button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + SPACING.m }]}>
        <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// InputField — labeled numeric input with focus-border + suffix
// ─────────────────────────────────────────────────────────────
function InputField({ label, hint, suffix, value, onChangeText, focused, onFocus, onBlur }) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType="decimal-pad"
          placeholder="—"
          placeholderTextColor={COLORS.textTertiary}
        />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ResultCard — empty / valid / warning
// ─────────────────────────────────────────────────────────────
function ResultCard({ state, units, volumeMl, syringeLabel }) {
  if (state === 'empty') {
    return (
      <View style={styles.resultEmpty}>
        <View style={styles.resultEmptyIcon}>
          <Icon name="info" size={18} color={COLORS.textSecondary} />
        </View>
        <Text style={styles.resultEmptyText}>Fill in all fields to see your result.</Text>
      </View>
    );
  }

  const warn = state === 'warning';
  const accent = warn ? COLORS.amber : COLORS.bluePrimary;
  const unitsText = units.toFixed(units >= 10 ? 1 : 2);

  return (
    <View style={[styles.resultCard, warn ? styles.resultCardWarn : SHADOWS.elevated]}>
      {warn && (
        <View style={styles.overBadge}>
          <Icon name="alert" size={11} color={COLORS.amberDeep} strokeWidth={2.5} />
          <Text style={styles.overBadgeText}>OVER CAPACITY</Text>
        </View>
      )}
      <View style={styles.resultNumberRow}>
        <Text style={[styles.resultNumber, { color: accent }]}>{unitsText}</Text>
        <Text style={styles.resultUnits}>units</Text>
      </View>
      <Text style={styles.resultDetail}>
        ({volumeMl.toFixed(3)} mL on a {syringeLabel} syringe)
      </Text>
      {warn && (
        <View style={styles.warnBox}>
          <Icon name="alert" size={14} color={COLORS.amberDeep} strokeWidth={2} />
          <Text style={styles.warnText}>
            Exceeds {syringeLabel} syringe capacity — use a larger syringe or split the draw.
          </Text>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// ReconInfo — concentration + mcg-per-unit panel
// ─────────────────────────────────────────────────────────────
function ReconInfo({ concentration, mcgPerUnit, hasInputs }) {
  return (
    <View style={styles.reconCard}>
      <Text style={styles.reconTitle}>RECONSTITUTION INFO</Text>
      <ReconRow label="Concentration" value={hasInputs ? `${concentration.toFixed(2)} mg/mL` : '—'} />
      <ReconRow label="Each unit" value={hasInputs ? `${mcgPerUnit.toFixed(1)} mcg` : '—'} />
    </View>
  );
}

function ReconRow({ label, value }) {
  return (
    <View style={styles.reconRow}>
      <Text style={styles.reconLabel}>{label}</Text>
      <Text style={styles.reconValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.ms,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.hairline,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  backBtn: {
    width: 30,
    height: 30,
    borderRadius: RADII.iconSquare,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xxs,
    backgroundColor: COLORS.blueTint,
    borderRadius: RADII.full,
  },
  toolPillText: {
    color: COLORS.bluePrimary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT_SIZES.sectionTitle,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    marginTop: SPACING.xxs,
    lineHeight: 19,
  },
  scroll: {
    padding: SPACING.l,
    paddingBottom: SPACING.xxl,
    gap: SPACING.l,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: SPACING.s,
  },

  // Segmented control
  segmented: {
    flexDirection: 'row',
    gap: SPACING.xxs,
    padding: SPACING.xxs,
    backgroundColor: COLORS.panel,
    borderRadius: RADII.input,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 9,
  },
  segmentActive: {
    backgroundColor: COLORS.bluePrimary,
    ...SHADOWS.cta,
  },
  segmentText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },

  // Input field
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADII.input,
    paddingHorizontal: SPACING.ms,
    paddingVertical: SPACING.m,
  },
  inputWrapFocused: {
    borderColor: COLORS.bluePrimary,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: -0.2,
    padding: 0,
  },
  suffix: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textTertiary,
  },
  hint: {
    fontSize: 11.5,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },

  // Result — empty
  resultEmpty: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.hairline,
    borderStyle: 'dashed',
    borderRadius: RADII.answer,
    paddingVertical: 26,
    paddingHorizontal: SPACING.l,
    alignItems: 'center',
    gap: SPACING.s,
  },
  resultEmptyIcon: {
    width: 36,
    height: 36,
    borderRadius: RADII.panel,
    backgroundColor: COLORS.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultEmptyText: {
    fontSize: 13.5,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 19,
  },

  // Result — valid/warning
  resultCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.hairline,
    borderRadius: RADII.answer,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.l,
    paddingBottom: SPACING.l,
  },
  resultCardWarn: {
    backgroundColor: COLORS.amberTint,
    borderColor: COLORS.amber,
  },
  overBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: SPACING.xxs,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.amber,
    borderRadius: RADII.full,
    marginBottom: SPACING.sm,
  },
  overBadgeText: {
    color: COLORS.amberDeep,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  resultNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  resultNumber: {
    fontSize: FONT_SIZES.display,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  resultUnits: {
    fontSize: FONT_SIZES.navTitle,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  resultDetail: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    fontVariant: ['tabular-nums'],
  },
  warnBox: {
    flexDirection: 'row',
    gap: SPACING.s,
    alignItems: 'flex-start',
    marginTop: SPACING.m,
    padding: SPACING.m,
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.panel,
    borderWidth: 1,
    borderColor: COLORS.amberTint,
  },
  warnText: {
    flex: 1,
    fontSize: 12.5,
    color: COLORS.amberDeep,
    lineHeight: 18,
    fontWeight: '500',
  },

  // Recon info
  reconCard: {
    backgroundColor: COLORS.panel,
    borderRadius: RADII.card,
    paddingVertical: SPACING.ms,
    paddingHorizontal: SPACING.md,
    gap: SPACING.s,
  },
  reconTitle: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: SPACING.xs,
  },
  reconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  reconLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  reconValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },

  // Footer
  footer: {
    paddingHorizontal: SPACING.l,
    paddingTop: SPACING.m,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.hairline,
  },
});
