import { Group } from '@mantine/core';

export const VIEW_ITEMS = [
  { value: 'intelligence', label: 'Intelligence Overview' },
  { value: 'grain', label: 'Grain Risk Assessment' },
];

export function ViewSwitcher({ active, onChange }) {
  return (
    <Group gap={6} wrap="nowrap">
      {VIEW_ITEMS.map((item) => (
        <button
          key={item.value}
          type="button"
          className="nav-btn"
          data-active={active === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </Group>
  );
}
