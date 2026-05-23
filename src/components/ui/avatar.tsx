import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

interface Props {
  name: string;
  url?: string;
  size?: number;
}

export const Avatar: React.FC<Props> = ({ name, url, size = 48 }) => {
  const initial = name.trim().charAt(0).toUpperCase();

  return (
    <View 
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: '#3c87f7' }
      ]}
    >
      {url ? (
        <Image 
          source={{ uri: url }} 
          style={{ width: size, height: size }}
        />
      ) : (
        <Text 
          style={[styles.initial, { fontSize: size * 0.4 }]}
        >
          {initial}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initial: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
