import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StackProvider } from './context/StackContext';
import StackScreen from './screens/StackScreen';
import ChatScreen from './screens/ChatScreen';
import SyringeCalculatorScreen from './screens/SyringeCalculatorScreen';
import ReviewScreen from './screens/ReviewScreen';
import { COLORS } from './theme/tokens';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

// React Navigation theme override — keeps screen backgrounds light so navigating
// between tabs doesn't briefly flash the default dark fallback.
// Spread DefaultTheme so required keys (notably `fonts`, read by the native-stack
// header) are present — building the object from scratch crashes the header.
const navTheme = {
  ...DefaultTheme,
  dark: false,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.bluePrimary,
    background: COLORS.background,
    card: COLORS.surface,
    text: COLORS.textPrimary,
    border: COLORS.hairline,
    notification: COLORS.bluePrimary,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: COLORS.surface,
          borderBottomColor: COLORS.hairline,
          borderBottomWidth: 1,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          color: COLORS.textPrimary,
          fontWeight: '700',
          fontSize: 18,
          letterSpacing: -0.2,
        },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.hairline,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: COLORS.bluePrimary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
        },
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Protocol: 'today-outline',
            AI: 'chatbubble-outline',
          };
          return <Ionicons name={icons[route.name]} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Protocol"
        component={StackScreen}
        options={{ tabBarLabel: 'Protocol', headerShown: false }}
      />
      <Tab.Screen
        name="AI"
        component={ChatScreen}
        options={{ tabBarLabel: 'AI', headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StackProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="dark" />
          <RootStack.Navigator screenOptions={{ headerShown: false }}>
            <RootStack.Screen name="MainTabs" component={MainTabs} />
            <RootStack.Screen
              name="SyringeCalculator"
              component={SyringeCalculatorScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Review"
              component={ReviewScreen}
              options={{ presentation: 'modal' }}
            />
          </RootStack.Navigator>
        </NavigationContainer>
      </StackProvider>
    </SafeAreaProvider>
  );
}
