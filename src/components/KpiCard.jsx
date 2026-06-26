
import { Paper, Text, Group, Stack } from '@mantine/core';

export function KpiCard({ label, value, icon, iconSrc, bg = '#24263C' }) {
  return (
    <Paper
      p="md"
      radius={8}
      style={{
        background: bg,
        border: '1px solid #393c56',
      }}
    >
      <Stack gap={2} align="center">
        <Group gap={6} align="center" justify="center" wrap="nowrap">
          {iconSrc && <img src={iconSrc} alt="" height={16} style={{ display: 'block' }} />}
          {icon && <Text size="sm">{icon}</Text>}
          <Text size="xs" c="#888f9e" tt="uppercase" fw={600} ta="center" style={{ letterSpacing: '0.05em' }}>
            {label}
          </Text>
        </Group>
        <Text size="xl" fw={700} c="white" style={{ fontSize: '1.75rem' }}>
          {value}
        </Text>
      </Stack>
    </Paper>
  );
}
