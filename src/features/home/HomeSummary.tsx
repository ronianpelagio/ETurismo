import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SummaryColors = {
  surface: string;
  border: string;
  gold: string;
  goldSoft: string;
  ink: string;
  inkDim: string;
};

type HomeSummaryProps = {
  artifactCount: number;
  savedCount: number;
  eventCount: number;
  colors: SummaryColors;
};

export default function HomeSummary({
  artifactCount,
  savedCount,
  eventCount,
  colors,
}: HomeSummaryProps) {
  const items = [
    { label: 'Artifacts', value: artifactCount, icon: 'library-outline' as const },
    { label: 'Saved', value: savedCount, icon: 'bookmark-outline' as const },
    { label: 'Events', value: eventCount, icon: 'calendar-outline' as const },
  ];

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${artifactCount} artifacts, ${savedCount} saved, ${eventCount} upcoming events`}
    >
      {items.map((item, index) => (
        <View key={item.label} style={styles.item}>
          {index > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <View style={[styles.icon, { backgroundColor: colors.goldSoft }]}>
            <Ionicons name={item.icon} size={15} color={colors.gold} />
          </View>
          <Text style={[styles.value, { color: colors.ink }]}>{item.value}</Text>
          <Text style={[styles.label, { color: colors.inkDim }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: -18,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 13,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 4,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  divider: {
    position: 'absolute',
    left: 0,
    width: 1,
    height: 32,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  value: { fontSize: 17, fontWeight: '800' },
  label: { marginTop: 1, fontSize: 9, fontWeight: '700', letterSpacing: 0.7, textTransform: 'uppercase' },
});
