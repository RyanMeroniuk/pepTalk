// Raised circular "+" button that sits in the middle of the bottom tab bar,
// between the Protocol and AI tabs. It isn't a real tab — pressing it opens the
// Add-to-Stack modal (a RootStack screen; navigate() bubbles up from the tab
// navigator). Rendered via a middle tab's `tabBarButton`.

import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from './Icon';
import { COLORS } from '../theme/tokens';

// Big, prominent FAB. Sized well above the tab-bar icons so it's the obvious
// primary action; raised so most of it floats above the bar.
const SIZE = 84;

export default function CenterTabButton() {
  const navigation = useNavigation();
  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddItem')}
        style={styles.button}
        accessibilityLabel="Add to stack"
      >
        <Icon name="plus" size={40} color="#fff" strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: COLORS.bluePrimary,
    alignItems: 'center',
    justifyContent: 'center',
    // Raise it well above the tab bar so it reads as a floating action button.
    marginBottom: 30,
    borderWidth: 5,
    borderColor: COLORS.surface,
    // Stronger, wider shadow so the large button clearly floats.
    shadowColor: COLORS.bluePrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 10,
  },
});
