import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';

const SYRINGE_OPTIONS = [
  { label: '0.3 mL', totalUnits: 30, mlCapacity: 0.3 },
  { label: '0.5 mL', totalUnits: 50, mlCapacity: 0.5 },
  { label: '1 mL', totalUnits: 100, mlCapacity: 1.0 },
];

export default function SyringeCalculatorScreen({ navigation }) {
  const [syringeIndex, setSyringeIndex] = useState(0);
  const [peptideMg, setPeptideMg] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [targetMcg, setTargetMcg] = useState('');

  const syringe = SYRINGE_OPTIONS[syringeIndex];

  // All insulin syringes are 100 units/mL
  const UNITS_PER_ML = 100;

  const peptideNum = parseFloat(peptideMg);
  const waterNum = parseFloat(waterMl);
  const targetNum = parseFloat(targetMcg);

  const canCalculate = peptideNum > 0 && waterNum > 0 && targetNum > 0;

  let units = null;
  let volumeMl = null;
  let overCapacity = false;

  if (canCalculate) {
    const concentrationMgPerMl = peptideNum / waterNum;
    const doseMg = targetNum / 1000;
    volumeMl = doseMg / concentrationMgPerMl;
    units = volumeMl * UNITS_PER_ML;
    overCapacity = units > syringe.totalUnits;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Syringe Calculator</Text>
        <Text style={styles.subtitle}>
          Calculate how many units to draw for your target dose
        </Text>

        {/* Syringe Type */}
        <Text style={styles.label}>Syringe Type</Text>
        <View style={styles.segmented}>
          {SYRINGE_OPTIONS.map((opt, i) => (
            <TouchableOpacity
              key={opt.label}
              style={[styles.segment, i === syringeIndex && styles.segmentActive]}
              onPress={() => setSyringeIndex(i)}
            >
              <Text style={[styles.segmentText, i === syringeIndex && styles.segmentTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Peptide Amount */}
        <Text style={styles.label}>Peptide Amount (mg)</Text>
        <Text style={styles.hint}>Total mg in your vial (e.g. 10, 20)</Text>
        <TextInput
          style={styles.input}
          value={peptideMg}
          onChangeText={setPeptideMg}
          keyboardType="decimal-pad"
          placeholder="e.g. 10"
          placeholderTextColor="#555"
        />

        {/* BAC Water */}
        <Text style={styles.label}>Bacteriostatic Water (mL)</Text>
        <Text style={styles.hint}>How much BAC water you reconstituted with</Text>
        <TextInput
          style={styles.input}
          value={waterMl}
          onChangeText={setWaterMl}
          keyboardType="decimal-pad"
          placeholder="e.g. 2"
          placeholderTextColor="#555"
        />

        {/* Target Dose */}
        <Text style={styles.label}>Target Dose (mcg)</Text>
        <Text style={styles.hint}>Your desired dose per injection</Text>
        <TextInput
          style={styles.input}
          value={targetMcg}
          onChangeText={setTargetMcg}
          keyboardType="decimal-pad"
          placeholder="e.g. 250"
          placeholderTextColor="#555"
        />

        {/* Result */}
        {canCalculate && (
          <View style={[styles.resultCard, overCapacity && styles.resultCardWarning]}>
            <Text style={styles.resultNumber}>{units.toFixed(1)}</Text>
            <Text style={styles.resultLabel}>units</Text>
            <Text style={styles.resultDetail}>
              ({volumeMl.toFixed(3)} mL on a {syringe.label} syringe)
            </Text>
            {overCapacity && (
              <View style={styles.warningBadge}>
                <Text style={styles.warningText}>
                  Exceeds {syringe.label} syringe capacity ({syringe.totalUnits} units).
                  Use a larger syringe or split into multiple draws.
                </Text>
              </View>
            )}
          </View>
        )}

        {!canCalculate && (
          <View style={styles.resultCardEmpty}>
            <Text style={styles.resultEmptyText}>
              Fill in all fields above to see your result
            </Text>
          </View>
        )}

        {/* Concentration info */}
        {canCalculate && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Reconstitution Info</Text>
            <Text style={styles.infoText}>
              Concentration: {(peptideNum / waterNum).toFixed(2)} mg/mL
            </Text>
            <Text style={styles.infoText}>
              Each unit = {((peptideNum / waterNum) / UNITS_PER_ML * 1000).toFixed(1)} mcg
            </Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <Text style={styles.closeButtonText}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scroll: {
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 28,
  },
  label: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 20,
    marginBottom: 4,
  },
  hint: {
    color: '#666',
    fontSize: 12,
    marginBottom: 8,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    padding: 3,
    marginTop: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  segmentActive: {
    backgroundColor: '#2563eb',
  },
  segmentText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultCard: {
    backgroundColor: '#0a1a2e',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  resultCardWarning: {
    borderColor: '#f59e0b',
    backgroundColor: '#1a1500',
  },
  resultCardEmpty: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultNumber: {
    color: '#2563eb',
    fontSize: 56,
    fontWeight: '800',
  },
  resultLabel: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
    marginTop: -4,
  },
  resultDetail: {
    color: '#666',
    fontSize: 13,
    marginTop: 8,
  },
  resultEmptyText: {
    color: '#555',
    fontSize: 14,
  },
  warningBadge: {
    backgroundColor: '#332200',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  warningText: {
    color: '#f59e0b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 4,
  },
  closeButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
