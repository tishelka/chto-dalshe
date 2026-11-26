import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { demoActivity } from '../../shared/data/demoActivity';
import { BrandHeader } from '../../shared/ui/BrandHeader';
import { BottomNavigationIcon } from '../../shared/ui/BottomNavigationIcon';
import { EmptyCollectionState } from '../../shared/ui/EmptyCollectionState';
import { SavedActivityCard } from '../../shared/ui/SavedActivityCard';

const historyActivities = [
  {
    ...demoActivity,
    date: '18 октября 2026',
  },
];

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const contentWidth = Math.min(width - 32, 430);
  const hasHistory = historyActivities.length > 0;

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            width: contentWidth,
            paddingTop: Math.max(28, insets.top + 28),
            paddingBottom: 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <BrandHeader />

        {hasHistory ? (
          <View style={styles.historyContent}>
            <Text accessibilityRole="header" style={styles.title}>ИСТОРИЯ АКТИВНОСТЕЙ</Text>
            <View style={styles.list}>
              {historyActivities.map(({ date, ...activity }) => (
                <View key={`${activity.id}-${date}`} style={styles.entry}>
                  <Text style={styles.date}>{date}</Text>
                  <SavedActivityCard {...activity} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <EmptyCollectionState
            icon={(
              <View style={styles.clockIcon}>
                <BottomNavigationIcon name="history" focused={false} />
              </View>
            )}
            title="Первая идея ещё впереди"
            description="Здесь появятся твои рекомендации и выбранные занятия"
            actionTitle="НАЙТИ СВОЮ ИДЕЮ"
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#C4C8E1',
  },
  scroll: {
    flex: 1,
    width: '100%',
  },
  content: {
    alignSelf: 'center',
    flexGrow: 1,
  },
  historyContent: {
    marginTop: 27,
  },
  title: {
    color: '#FFFFFF',
    fontFamily: 'BulbasaurSP',
    fontSize: 17,
    textAlign: 'center',
  },
  list: {
    gap: 14,
    marginTop: 12,
  },
  entry: {
    gap: 4,
  },
  date: {
    marginLeft: 14,
    color: '#39396E',
    fontFamily: 'EtudeNoireBold',
    fontSize: 10,
  },
  clockIcon: {
    transform: [{ scale: 1.2 }],
  },
});
