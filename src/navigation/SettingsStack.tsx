import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Profile from '../screens/main/Profile';
import Settings from '../screens/main/Settings';
import PersonalInfo from '../screens/main/settings/PersonalInfo';
import PasswordSecurity from '../screens/main/settings/PasswordSecurity';
import EmailPrefs from '../screens/main/settings/EmailPrefs';
import Language from '../screens/main/settings/Language';
import Notifications from '../screens/main/settings/Notifications';
import Theme from '../screens/main/settings/Theme';
import FontSize from '../screens/main/settings/FontSize';
import HelpSupport from '../screens/main/settings/HelpSupport';
import Terms from '../screens/main/settings/Terms';
import Privacy from '../screens/main/settings/Privacy';
import VisitInfo from '../screens/main/settings/VisitInfo';
import SavedArtifacts from '../screens/main/SavedArtifacts';
import CollectionPage from '../screens/main/CollectionPage';
import VisitHistory from '../screens/main/VisitHistory';

const Stack = createNativeStackNavigator();

export default function SettingsStack({ setNavbarVisible }: { setNavbarVisible?: (v: boolean) => void }) {
  return (
    <Stack.Navigator
      id="settings-stack"
      screenOptions={{ headerShown: false }}
      initialRouteName="ProfileRoot"
    >
      <Stack.Screen name="ProfileRoot">
        {(props) => <Profile {...props} setNavbarVisible={setNavbarVisible} />}
      </Stack.Screen>

      <Stack.Screen
        name="SettingsRoot"
        component={Settings}
      />

      <Stack.Screen name="PersonalInfo" component={PersonalInfo} />
      <Stack.Screen name="PasswordSecurity" component={PasswordSecurity} />
      <Stack.Screen name="EmailPrefs" component={EmailPrefs} />

      <Stack.Screen name="Language" component={Language} />
      <Stack.Screen name="Notifications" component={Notifications} />
      <Stack.Screen name="Theme" component={Theme} />
      <Stack.Screen name="FontSize" component={FontSize} />

      <Stack.Screen name="HelpSupport" component={HelpSupport} />
      <Stack.Screen name="Terms" component={Terms} />
      <Stack.Screen name="Privacy" component={Privacy} />
      <Stack.Screen name="VisitInfo" component={VisitInfo} />

      <Stack.Screen name="VisitHistory" component={VisitHistory} />

      <Stack.Screen
        name="SavedArtifacts"
        children={(props) => (
          <SavedArtifacts
            {...props}
            onBack={() => props.navigation.goBack()}
          />
        )}
      />

      <Stack.Screen
        name="CollectionPage"
        children={(props) => (
          <CollectionPage
            {...props}
            onBack={() => props.navigation.goBack()}
          />
        )}
      />
    </Stack.Navigator>
  );
}