import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from './BrandMark';

export function BrandHeader() {
  return (
    <View style={styles.brand}>
      <BrandMark size={38} />
      <Text style={styles.brandName}>ЧтоДальше</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginHorizontal: 12,
  },
  brandName: {
    color: '#39396E',
    fontFamily: 'BulbasaurSP',
    fontSize: 21,
  },
});
