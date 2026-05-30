// Full-width accent CTA. Default is the brand blue used by:
// - Syringe "Done" button
// - Composer send button (compact variant)
// - Stack quick actions accent
//
// Supports an indigo→blue gradient variant for the Review "Get AI" CTA
// via the `gradient` prop. Pass `loading` to disable + replace label.

import { Text, TouchableOpacity, View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADII, SHADOWS, FONT_SIZES, SPACING } from '../theme/tokens';

export default function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  gradient = null, // null | 'indigo'
  icon = null,
  style,
}) {
  const isDisabled = disabled || loading;

  const inner = (
    <View style={styles.inner}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          {icon}
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </View>
  );

  if (gradient === 'indigo') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.shadow, isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={[COLORS.indigo, COLORS.bluePrimary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {inner}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        styles.shadow,
        { backgroundColor: COLORS.bluePrimary },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {inner}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: RADII.input,
    paddingVertical: SPACING.ms,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadow: SHADOWS.cta,
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.s,
  },
  label: {
    color: '#fff',
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  disabled: {
    opacity: 0.5,
  },
});
