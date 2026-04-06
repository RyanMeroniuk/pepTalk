import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StackProvider } from './context/StackContext';
import StackScreen from './screens/StackScreen';
import ChatScreen from './screens/ChatScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <StackProvider>
      <NavigationContainer>
        <StatusBar style="light" />
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
                MyStack: 'list-outline',
                AI: 'chatbubble-outline',
              };
              return <Ionicons name={icons[route.name]} size={size} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="MyStack"
            component={StackScreen}
            options={{ title: 'My Stack', tabBarLabel: 'My Stack' }}
          />
          <Tab.Screen
            name="AI"
            component={ChatScreen}
            options={{ title: 'PepTalk', tabBarLabel: 'AI' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </StackProvider>
  );
}
