import { Platform, Text, View } from 'react-native';

export type AppIconName = string | Partial<Record<'ios' | 'android' | 'web', string>>;

const glyphByName: Record<string, string> = {
  'account_balance': '▦',
  'arrow.left': '‹',
  'arrow.left.arrow.right': '↔',
  'arrow.right': '›',
  'arrow.up.right.square': '↗',
  'arrow_back': '‹',
  'arrow_forward': '›',
  'assignment': '▤',
  'assignment_turned_in': '☑',
  'badge': '▣',
  'bar_chart': '▥',
  'building.columns': '▦',
  'chart.bar': '▥',
  'checkmark.seal': '✓',
  'creditcard': '▣',
  'description': '▤',
  'doc.text': '▤',
  'envelope': '✉',
  'eye': '◉',
  'eye.slash': '⊘',
  'group': '♟',
  'how_to_vote': '✓',
  'link': '↗',
  'location_on': '⌖',
  'lock': '▣',
  'lock.rotation': '▣',
  'lock.shield': '⬡',
  'mail': '✉',
  'map': '⌖',
  'mappin.and.ellipse': '⌖',
  'number.circle': '#',
  'number.square': '#',
  'person': '♟',
  'person.2': '♟',
  'person.badge.plus': '+',
  'person.fill': '♟',
  'person.text.rectangle': '♟',
  'person_add': '+',
  'phone': '☎',
  'pin': '⌖',
  'rectangle.portrait.and.arrow.right': '↪',
  'shield': '⬡',
  'swap_horiz': '↔',
  'task_alt': '✓',
  'tray': '✓',
  'tray.full': '✓',
  'tray.full.fill': '✓',
  'verified_user': '⬡',
  'visibility': '◉',
  'visibility_off': '⊘',
  'waving_hand': '✋',
};

function resolveName(name: AppIconName): string {
  if (typeof name === 'string') return name;
  const platformName = name[Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android'];
  return platformName ?? Object.values(name)[0] ?? '';
}

export default function AppIcon({
  name,
  size,
  tintColor = '#0E364C',
  accessible = false,
}: {
  name: AppIconName;
  size: number;
  tintColor?: string;
  accessible?: boolean;
}) {
  const resolvedName = resolveName(name);

  if (resolvedName === 'lock' || resolvedName === 'lock.rotation') {
    const stroke = Math.max(1.5, size * 0.09);
    return (
      <View
        accessible={accessible}
        importantForAccessibility={accessible ? 'auto' : 'no'}
        style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute',
            top: size * 0.08,
            width: size * 0.48,
            height: size * 0.46,
            borderColor: tintColor,
            borderWidth: stroke,
            borderBottomWidth: 0,
            borderTopLeftRadius: size * 0.24,
            borderTopRightRadius: size * 0.24,
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: size * 0.05,
            width: size * 0.78,
            height: size * 0.52,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: size * 0.12,
            backgroundColor: tintColor,
          }}>
          <View style={{ width: size * 0.1, height: size * 0.19, borderRadius: size, backgroundColor: '#FFFFFF' }} />
        </View>
      </View>
    );
  }

  const glyph = glyphByName[resolvedName] ?? '•';

  return (
    <Text
      accessible={accessible}
      importantForAccessibility={accessible ? 'auto' : 'no'}
      allowFontScaling={false}
      style={{
        color: tintColor,
        fontSize: size,
        fontWeight: '700',
        lineHeight: size + 4,
        minWidth: size,
        textAlign: 'center',
      }}>
      {glyph}
    </Text>
  );
}
