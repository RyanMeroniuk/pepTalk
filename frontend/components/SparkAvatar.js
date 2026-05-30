// 22x22 gradient square with the spark icon in white. The brand mark.
// Appears in:
// - Chat header (next to "PepTalk")
// - Chat answer card header
// - Streaming card header
// - Review AI analysis card header
//
// Default gradient is brand blue (bluePrimary → blueDeep). Pass `indigo` for
// the AI deep-dive accent.

import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from './Icon';
import { COLORS, RADII } from '../theme/tokens';

export default function SparkAvatar({ size = 22, variant = 'blue' }) {
  const colors =
    variant === 'indigo'
      ? [COLORS.indigo, COLORS.indigoDeep]
      : [COLORS.bluePrimary, COLORS.blueDeep];
  const iconSize = Math.round(size * 0.55);
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.box, { width: size, height: size, borderRadius: RADII.chip }]}
    >
      <Icon name="spark" size={iconSize} color="#fff" strokeWidth={2.25} />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
