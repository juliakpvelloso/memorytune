import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';

type PlaybackMediumProps = {
  isPlaying: boolean;
  onPress: () => void;
  albumCoverUri?: string;
  size?: number; // Overall medium size
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function PlaybackNote({
  isPlaying,
  delayMs,
  left,
  top,
  driftX,
}: {
  isPlaying: boolean;
  delayMs: number;
  left: string;
  top: string;
  driftX: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isPlaying) {
      anim.stopAnimation();
      anim.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delayMs),
        Animated.timing(anim, {
          toValue: 1,
          duration: 5000,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [delayMs, isPlaying, anim]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -54],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, driftX],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 0.7, 1],
    outputRange: [0, 1, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.note,
        { left, top, opacity, transform: [{ translateX }, { translateY }] },
      ]}
    >
      <Text style={styles.noteText}>♪</Text>
    </Animated.View>
  );
}

function PlaybackNotes({ isPlaying }: { isPlaying: boolean }) {
  return (
    <View pointerEvents="none" style={styles.notesLayer}>
      <PlaybackNote isPlaying={isPlaying} delayMs={0} left="56%" top="44%" driftX={26} />
      <PlaybackNote isPlaying={isPlaying} delayMs={180} left="58%" top="50%" driftX={18} />
      <PlaybackNote isPlaying={isPlaying} delayMs={360} left="62%" top="46%" driftX={30} />
    </View>
  );
}

export default function PlaybackMedium({
  isPlaying,
  onPress,
  albumCoverUri,
  size = 96,
}: PlaybackMediumProps) {
  const spin = useRef(new Animated.Value(0)).current;
  const spinLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const cdPlayerImage = require('../assets/cd player.png');

  useEffect(() => {
    spin.setValue(0);
    spinLoopRef.current?.stop();

    if (!isPlaying) return;

    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 5000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    spinLoopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [isPlaying, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const discSize = Math.round(size * 0.85); // Takes up 85% of the player area
  const discBorderSize = discSize; // Border is same size as disc to create a ring effect

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.root, { width: size, height: size }, pressed && styles.pressed]}>
      <View style={styles.base}>
        {/* Static player base (includes empty disc area). */}
        <Image source={cdPlayerImage} style={styles.cdPlayerImage} resizeMode="contain" />

        {/* Disc appears only while playing */}
        {isPlaying ? (
          <Animated.View
            style={[
              styles.discWrapper,
              {
                width: discBorderSize,
                height: discBorderSize,
                transform: [{ rotate }],
              },
            ]}
          >
            <View style={[styles.disc, { width: discSize, height: discSize }]}>
              <View style={styles.discCoverFallback}>
                {albumCoverUri ? (
                  <Image
                    source={{ uri: albumCoverUri }}
                    style={styles.albumCoverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Text style={styles.albumCoverPlaceholderText}>Album</Text>
                )}
              </View>
              <View style={styles.discCenter} />
            </View>
          </Animated.View>
        ) : null}

        {/* Animated notes appear only while playing */}
        {isPlaying ? <PlaybackNotes isPlaying={isPlaying} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  base: {
    width: '100%',
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cdPlayerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  discWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disc: {
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discCoverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumCoverImage: {
    ...StyleSheet.absoluteFillObject,
  },
  discCenter: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#111827',
    opacity: 0.7,
  },
  notesLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  note: {
    position: 'absolute',
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
    opacity: 0.8,
  },
  notePosition: {
    position: 'absolute',
  },
  notePositionA: {
    left: '56%',
    top: '44%',
  },
  notePositionB: {
    left: '58%',
    top: '50%',
  },
  notePositionC: {
    left: '62%',
    top: '46%',
  },
  albumCoverPlaceholderText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
});

