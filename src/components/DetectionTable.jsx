
import { Paper, Table, Text, Group, ScrollArea } from '@mantine/core';
import { TypeBadge } from './TypeBadge';

const TYPE_COLORS = {
  Dark: '#FFA500',
  Unattributed: '#F75349',
  Light: '#00A3E3',
  Attributed: '#00A3E3',
};

export function DetectionTable({ data = [], columns, onRowClick, maxHeight = 400, title, count, bare = false, isRowActive }) {
  const cols = columns || (data[0] ? Object.keys(data[0]) : []);

  const inner = (
    <>
      {(title || count) && (
        <Group justify="space-between" mb="sm">
          {title ? <Text size="sm" fw={600} c="white">{title}</Text> : <span />}
          {count && <Text size="sm" fw={700} c="#60a5fa">{count}</Text>}
        </Group>
      )}

      {!data.length ? (
        <Text c="#888f9e" ta="center" py="xl" size="sm">No detections</Text>
      ) : (
        <div style={{ border: '1px solid #393c56', borderRadius: 4, overflow: 'hidden' }}>
        <ScrollArea.Autosize mah={maxHeight} type="auto">
          <Table
            striped
            highlightOnHover
            highlightOnHoverColor="#393C56"
            stickyHeader
            withRowBorders={false}
            verticalSpacing={12}
            style={{ fontSize: '0.8rem' }}
            styles={{
              table: { background: 'transparent' },
              tr: { cursor: onRowClick ? 'pointer' : 'default' },
              th: { color: '#ffffff', background: '#181926', fontSize: '0.7rem', textTransform: 'uppercase', borderBottom: '1px solid #393c56' },
              td: { color: '#ffffff' },
            }}
          >
            <Table.Thead>
              <Table.Tr>
                {cols.map((col, idx) => (
                  <Table.Th
                    key={col}
                    style={{
                      ...(idx === 0 ? { borderTopLeftRadius: 4 } : {}),
                      ...(idx === cols.length - 1 ? { borderTopRightRadius: 4 } : {}),
                    }}
                  >
                    {col}
                  </Table.Th>
                ))}
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.map((row, i) => {
                const isLast = i === data.length - 1;
                const active = isRowActive?.(row);
                return (
                  <Table.Tr key={i} onClick={() => onRowClick?.(row)}>
                    {cols.map((col, ci) => (
                      <Table.Td
                        key={col}
                        style={{
                          ...(i > 0 ? { borderTop: '1px solid #393c56' } : {}),
                          ...(isLast && ci === 0 ? { borderBottomLeftRadius: 4 } : {}),
                          ...(isLast && ci === cols.length - 1 ? { borderBottomRightRadius: 4 } : {}),
                          ...(active ? { backgroundColor: '#006CD7' } : {}),
                        }}
                      >
                        {col === 'Type' || col === 'detection_type' ? (
                          <TypeBadge size="xs" color={TYPE_COLORS[row[col]] || '#888f9e'}>
                            {row[col] || '—'}
                          </TypeBadge>
                        ) : (
                          row[col] ?? '—'
                        )}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>
        </ScrollArea.Autosize>
        </div>
      )}
    </>
  );

  if (bare) return inner;

  return (
    <Paper radius={8} p="md" style={{ background: '#24263C', border: '1px solid #393c56' }}>
      {inner}
    </Paper>
  );
}
