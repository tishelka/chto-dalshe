import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './ActionButton';

type Props = {
  icon: ReactNode;
  title: string;
  description: string;
  actionTitle: string;
};

export function EmptyCollectionState({ icon, title, description, actionTitle }: Props) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.icon}>{icon}</View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <ActionButton
        title={actionTitle}
        variant="indigo"
        style={styles.button}
        labelStyle={styles.buttonLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingTop: 74,
    paddingHorizontal: 20,
  },
  icon: {
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 5,
    color: '#48075B',
    fontFamily: 'BulbasaurSP',
    fontSize: 19,
    textAlign: 'center',
  },
  description: {
    maxWidth: 270,
    marginTop: 8,
    color: '#48075B',
    fontFamily: 'EtudeNoireBold',
    fontSize: 11,
    lineHeight: 13,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    minHeight: 42,
    marginTop: 14,
  },
  buttonLabel: {
    fontFamily: 'BulbasaurSP',
    fontSize: 12,
  },
});
