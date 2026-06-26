
import { useState, useMemo, useEffect } from 'react';
import { Stack, Text, Paper, Group } from '@mantine/core';
import { TypeBadge } from '../components/TypeBadge';
import { useMultipleDatasets } from '../hooks/useDataset';
import { KpiCard } from '../components/KpiCard';
import { DetectionTable } from '../components/DetectionTable';
import { DetectionMap } from '../components/DetectionMap';
import { SatelliteChip } from '../components/SatelliteChip';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { ViewSwitcher } from '../components/ViewSwitcher';
import theiaLogo from '../assets/TheiaLogo.svg';
import unattributedIcon from '../assets/Icons/UnattributedIcon.svg';
import darkIcon from '../assets/Icons/DarkIcon.svg';
import lightIcon from '../assets/Icons/LightIcon.svg';

const DATASETS = [
  'port_mariupol',
  'port_berdyansk',
  'port_feodosia',
  'port_kerch',
  'port_novorossiysk_unattr',
  'port_novorossiysk_light',
];

const RISK_COLORS = { HIGH: '#F75349', MODERATE: '#FFA500', LOW: '#22c55e' };

const PORTS = [
  { key: 'mariupol', name: 'Mariupol', lat: '46.95°N', lon: '37.55°E', desc: 'Major Azov Sea grain terminal', center: [37.55, 46.95], zoom: 10, datasets: ['port_mariupol'] },
  { key: 'berdyansk', name: 'Berdyansk', lat: '46.76°N', lon: '36.80°E', desc: 'Azov Sea port', center: [36.80, 46.76], zoom: 10, datasets: ['port_berdyansk'] },
  { key: 'feodosia', name: 'Feodosia', lat: '45.04°N', lon: '35.40°E', desc: 'Crimean grain port', center: [35.40, 45.04], zoom: 11, datasets: ['port_feodosia'] },
  { key: 'kerch', name: 'Kerch', lat: '45.35°N', lon: '36.47°E', desc: 'Kerch Strait gateway', center: [36.47, 45.35], zoom: 9, datasets: ['port_kerch'] },
  { key: 'novorossiysk', name: 'Novorossiysk', lat: '44.72°N', lon: '37.78°E', desc: "Russia's largest Black Sea port", center: [37.78, 44.72], zoom: 10, datasets: ['port_novorossiysk_unattr', 'port_novorossiysk_light'] },
];

export function GrainRiskAssessment({ activeTab, onTabChange }) {
  const { datasets, loading } = useMultipleDatasets(DATASETS);

  // Find latest date across all port data
  const reportDate = useMemo(() => {
    const allData = DATASETS.flatMap((d) => datasets[d] || []);
    const dates = allData.map((r) => r.acquired).filter(Boolean).sort();
    return dates.length > 0 ? dates[dates.length - 1].slice(0, 10) : '—';
  }, [datasets]);

  if (loading) return <Text c="#888f9e">Loading grain risk data…</Text>;

  return (
    <Stack gap={8}>
      <Paper p="xl" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <div>
            <img src={theiaLogo} alt="Theia" height={40} style={{ display: 'block' }} />
            <Text
              size="xs"
              c="#888f9e"
              fw={700}
              tt="uppercase"
              mt={28}
              style={{ letterSpacing: '0.12em' }}
            >
              Port-by-Port Analysis • Cargo Vessels 90–200m • Optical Satellite Detections
            </Text>
            <Text
              c="white"
              fw={800}
              mt={2}
              mb="md"
              style={{ fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
              Grain Movement Risk Assessment
            </Text>
            <ViewSwitcher active={activeTab} onChange={onTabChange} />
            <Group gap="lg" mt="lg">
              <Group gap={6}><img src={unattributedIcon} alt="" height={16} style={{ display: 'block' }} /><Text size="xs" c="#888f9e">Unattributed (no AIS)</Text></Group>
              <Group gap={6}><img src={darkIcon} alt="" height={16} style={{ display: 'block' }} /><Text size="xs" c="#888f9e">Dark (AIS off)</Text></Group>
              <Group gap={6}><img src={lightIcon} alt="" height={16} style={{ display: 'block' }} /><Text size="xs" c="#888f9e">Light (AIS on)</Text></Group>
            </Group>
          </div>
          <span
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 999,
              border: '1px solid #393c56',
              background: '#181926',
              color: '#888f9e',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Daily Snapshot • {reportDate}
          </span>
        </Group>
      </Paper>

      {PORTS.map((port) => {
        const allData = port.datasets.flatMap((d) => datasets[d] || []);
        const unattr = allData.filter((r) => r.detection_type === 'Unattributed');
        const dark = allData.filter((r) => r.detection_type === 'Dark');
        const light = allData.filter((r) => r.detection_type === 'Light');
        const total = allData.length;
        const risk = total > 100 ? 'HIGH' : total > 20 ? 'MODERATE' : 'LOW';

        return (
          <PortSection
            key={port.key}
            port={port}
            risk={risk}
            counts={{ unattr: unattr.length, dark: dark.length, light: light.length, total }}
            data={allData}
          />
        );
      })}

      {/* Methodology */}
      <Paper p="md" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
        <Text size="sm" fw={600} c="white">METHODOLOGY — DATA COLLECTION & RISK SCORING</Text>
        <Text size="xs" c="#888f9e" mt="xs">
          Port monitoring uses a 50 km radius from each port center. Detections are cargo-type
          vessels between 90–200m in length. Risk scores: 100 = dark/unattributed vessel ≥180m,
          95 = unattributed 90–180m, 80 = dark with AIS match. Attributed (light) vessels score 20–40.
        </Text>
      </Paper>

      <DisclaimerFooter />
    </Stack>
  );
}

function PortSection({ port, risk, counts, data }) {
  const [selected, setSelected] = useState(null);

  // Default to the latest detection in this port; keep current if still present.
  useEffect(() => {
    if (data.length === 0) return;
    setSelected((cur) =>
      cur && data.some((r) => r.object_id === cur.object_id) ? cur : latestByDate(data)
    );
  }, [data]);

  const tableData = data.map((r) => ({
    OID: r.object_id,
    Type: r.detection_type || 'Unattributed',
    Acquired: r.acquired?.slice(0, 10) || '—',
    Lat: r.lat?.toFixed(3),
    Lon: r.lon?.toFixed(3),
    'Length(m)': r.length,
    'Width(m)': r.width,
    Hdg: r.heading,
    Vessel: r.name || '—',
    IMO: r.imo || '—',
    Provider: r.provider || '—',
  }));

  // Port-centered view
  const portView = {
    longitude: port.center[0],
    latitude: port.center[1],
    zoom: port.zoom,
  };

  return (
    <Paper p="md" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
      <Group justify="space-between" align="flex-start" mb="sm">
        <div>
          <Text size="sm" fw={700} c="white">{port.name.toUpperCase()}</Text>
          <Text size="xs" c="#888f9e" mt={2}>{port.lat}, {port.lon} • {port.desc}</Text>
        </div>
          <TypeBadge color={RISK_COLORS[risk]}>{risk} RISK</TypeBadge>
      </Group>

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <div style={{ flex: 1 }}><KpiCard label="Unattributed" value={counts.unattr} iconSrc={unattributedIcon} bg="#181926" /></div>
        <div style={{ flex: 1 }}><KpiCard label="Dark" value={counts.dark} iconSrc={darkIcon} bg="#181926" /></div>
        <div style={{ flex: 1 }}><KpiCard label="Light" value={counts.light} iconSrc={lightIcon} bg="#181926" /></div>
        <div style={{ flex: 1 }}><KpiCard label="Total" value={counts.total} bg="#181926" /></div>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <div style={{ flex: 2 }}>
          <DetectionMap
            data={data}
            viewState={portView}
            onClick={setSelected}
            selected={selected}
            height="100%"
          />
        </div>
        <div style={{ flex: 1 }}>
          <SatelliteChip detection={selected} />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <DetectionTable
          bare
          data={tableData}
          columns={['OID', 'Type', 'Acquired', 'Lat', 'Lon', 'Length(m)', 'Width(m)', 'Hdg', 'Vessel', 'IMO', 'Provider']}
          onRowClick={(row) => {
            const raw = data.find((r) => r.object_id === row.OID);
            if (raw) setSelected(raw);
          }}
          isRowActive={(row) => selected && row.OID === selected.object_id}
          maxHeight={250}
        />
      </div>
    </Paper>
  );
}

function latestByDate(list) {
  let best = null;
  let bestT = '';
  for (const r of list) {
    const t = r.acquired || r.timestamp || '';
    if (t && t > bestT) {
      bestT = t;
      best = r;
    }
  }
  return best || list[0] || null;
}
