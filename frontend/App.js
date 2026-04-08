import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StackProvider } from './context/StackContext';
import StackScreen from './screens/StackScreen';
import ChatScreen from './screens/ChatScreen';
import SyringeCalculatorScreen from './screens/SyringeCalculatorScreen';

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: '#111',
          borderBottomColor: '#222',
          borderBottomWidth: 1,
          shadowOpacity: 0,
          elevation: 0,
        },
        headerTitleStyle: {
          color: '#fff',
          fontWeight: '700',
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: '#111',
          borderTopColor: '#222',
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#888',
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
        options={{ title: 'Protocol', tabBarLabel: 'Protocol' }}
      />
      <Tab.Screen
        name="AI"
        component={ChatScreen}
        options={{ title: 'PepTalk', tabBarLabel: 'AI' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <StackProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="MainTabs" component={MainTabs} />
          <RootStack.Screen
            name="SyringeCalculator"
            component={SyringeCalculatorScreen}
            options={{ presentation: 'modal' }}
          />
        </RootStack.Navigator>
      </NavigationContainer>
    </StackProvider>
  );
}
