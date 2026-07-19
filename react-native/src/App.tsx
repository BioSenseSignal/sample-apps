import { SafeAreaProvider } from "react-native-safe-area-context";
import MeasurementScreen from "./MeasurementScreen";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


export default function App() {
    const Stack = createNativeStackNavigator();
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Stack.Navigator>
                    <Stack.Screen name="MeasurementScreen" options={{ headerShown: false }} component={MeasurementScreen} />
                </Stack.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
};