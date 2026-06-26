
import { useState } from 'react';
import { Paper, Text, Stack, Group, Divider, Modal } from '@mantine/core';
import { TypeBadge } from './TypeBadge';

// Match each badge to the exact fill color of its detection icon on the map.
const TYPE_COLORS = {
  Dark: '#FFA500',
  Unattributed: '#F75349',
  Light: '#00A3E3',
  AIS: '#00EB6C',
  Spoofing: '#FF6D99',
  STS: '#00A3E3',
};


// Spoofing, STS, and vessel detections are different record shapes, so resolve
// the real type from the layer it came from (if known) or its distinct fields.
function resolveType(d) {
  if (d._layerType === 'spoofing') return 'Spoofing';
  if (d._layerType === 'sts') return 'STS';
  if (d._layerType && ['Dark', 'Light', 'Unattributed', 'AIS'].includes(d._layerType)) return d._layerType;
  if (d.event_id != null || d.status === 'complete_sts_event') return 'STS';
  if (d.description != null && d.length == null) return 'Spoofing';
  if (d.detection_type) return d.detection_type;
  if (d.dark) return 'Dark';
  if (d.name) return 'Light';
  return 'Unattributed';
}

function formatPosition(d) {
  const lat = d.lat ?? d.latitude;
  const lon = d.lon ?? d.longitude;
  if (lat == null || lon == null) return '—';
  return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
}

export function SatelliteChip({ detection, bare = false }) {
  const type = detection ? resolveType(detection) : null;

  const content = !detection ? (
    <Text c="#888f9e" ta="center">Click a detection on the map to view details</Text>
  ) : (
    <Stack gap="sm">
      <Group justify="space-between">
        <Text size="sm" fw={600} c="white">SATELLITE IMAGE CHIP</Text>
        <TypeBadge color={TYPE_COLORS[type] || '#888f9e'}>{type}</TypeBadge>
      </Group>

      <ChipImage detection={detection} type={type} />

      {type === 'Spoofing' ? (
        <SpoofingDetails d={detection} />
      ) : type === 'STS' ? (
        <StsDetails d={detection} />
      ) : (
        <DetectionDetails d={detection} />
      )}
    </Stack>
  );

  if (bare) return content;

  return (
    <Paper p={detection ? 'md' : 'lg'} radius={8} style={{ background: '#181926', border: '1px solid #393c56' }}>
      {content}
    </Paper>
  );
}

function ChipImage({ detection, type }) {
  const [opened, setOpened] = useState(false);

  if (detection.image_url) {
    const name =
      detection.name ||
      detection.name_1 ||
      detection.name_2 ||
      (detection.object_id ? `OID ${detection.object_id}` : 'Detection');
    return (
      <>
        <img
          src={detection.image_url}
          alt=""
          onClick={() => setOpened(true)}
          style={{
            width: '100%',
            height: 200,
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        />
        <Modal
          opened={opened}
          onClose={() => setOpened(false)}
          title={`Satellite Imagery - ${name}`}
          size="lg"
          centered
          styles={{
            content: { background: '#181926' },
            header: { background: '#181926', borderBottom: '1px solid #393c56' },
            title: { color: '#ffffff', fontWeight: 600 },
            close: { color: '#ffffff' },
            body: { background: '#181926', padding: 0 },
          }}
        >
          <img
            src={detection.image_url}
            alt=""
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Modal>
      </>
    );
  }
  const note =
    type === 'Spoofing'
      ? 'No satellite chip — AIS-based spoofing event'
      : type === 'STS'
        ? 'No satellite chip for this STS event'
        : `No image available${detection.object_id ? ` for OID ${detection.object_id}` : ''}`;
  return (
    <Paper p="xl" radius={8} style={{ background: '#24263C', textAlign: 'center', minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Text c="#888f9e" size="sm">{note}</Text>
    </Paper>
  );
}

function DetectionDetails({ d }) {
  return (
    <Stack gap={4}>
      <DetailRow label="OID" value={d.object_id ?? '—'} />
      <DetailRow label="Vessel" value={d.name || '—'} />
      <DetailRow label="IMO / MMSI" value={`${d.imo || '—'} / ${d.mmsi || '—'}`} />
      <DetailRow label="Flag" value={d.flag_short_code || '—'} />
      <DetailRow label="Size" value={d.length != null ? `${d.length}m × ${d.width ?? '—'}m` : '—'} />
      <DetailRow label="Heading" value={d.heading != null ? `${d.heading}°` : '—'} />
      <DetailRow label="Provider" value={d.provider || '—'} />
      <DetailRow label="Acquired" value={d.acquired ? new Date(d.acquired).toLocaleString() : '—'} />
    </Stack>
  );
}

function SpoofingDetails({ d }) {
  return (
    <Stack gap={4}>
      <DetailRow label="Vessel" value={d.name || '—'} />
      <DetailRow label="IMO / MMSI" value={`${d.imo || '—'} / ${d.mmsi || '—'}`} />
      <DetailRow label="Flag" value={d.flag_short_code || '—'} />
      <DetailRow label="Anomaly" value={d.description || '—'} />
      <DetailRow label="Position" value={formatPosition(d)} />
      <DetailRow label="Time" value={d.timestamp ? new Date(d.timestamp).toLocaleString() : '—'} />
    </Stack>
  );
}

function StsDetails({ d }) {
  return (
    <Stack gap={4}>
      <Text size="xs" c="#888f9e" fw={600}>VESSEL 1</Text>
      <DetailRow label="Name" value={d.name_1 || '—'} />
      <DetailRow label="MMSI" value={d.mmsi_1 || '—'} />
      <DetailRow label="Flag / Type" value={`${d.flag_1 || '—'} / ${d.type_1 || '—'}`} />

      <Divider my={4} color="#393c56" />

      <Text size="xs" c="#888f9e" fw={600}>VESSEL 2</Text>
      <DetailRow label="Name" value={d.name_2 || '—'} />
      <DetailRow label="MMSI" value={d.mmsi_2 || '—'} />
      <DetailRow label="Flag / Type" value={`${d.flag_2 || '—'} / ${d.type_2 || '—'}`} />

      <Divider my={4} color="#393c56" />

      <DetailRow label="Status" value={d.status ? d.status.replace(/_/g, ' ') : '—'} />
      <DetailRow label="Position" value={formatPosition(d)} />
      <DetailRow label="Time" value={d.timestamp_display || '—'} />
    </Stack>
  );
}

function DetailRow({ label, value }) {
  return (
    <Group justify="space-between">
      <Text size="xs" c="#888f9e">{label}</Text>
      <Text size="xs" c="white" fw={500}>{value}</Text>
    </Group>
  );
}
