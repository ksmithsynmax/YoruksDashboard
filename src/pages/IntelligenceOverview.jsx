
import { useState, useMemo, useEffect } from 'react';
import { Stack, Text, Group, Paper } from '@mantine/core';
import { useMultipleDatasets } from '../hooks/useDataset';
import { KpiCard } from '../components/KpiCard';
import { DetectionTable } from '../components/DetectionTable';
import { DetectionMap } from '../components/DetectionMap';
import { SatelliteChip } from '../components/SatelliteChip';
import { DisclaimerFooter } from '../components/DisclaimerFooter';
import { ViewSwitcher } from '../components/ViewSwitcher';
import theiaLogo from '../assets/TheiaLogo.svg';
import darkIcon from '../assets/Icons/DarkIcon.svg';
import unattributedIcon from '../assets/Icons/UnattributedIcon.svg';
import spoofingIcon from '../assets/Icons/SpoofingPositionIcon.svg';
import stsIcon from '../assets/Icons/STSDefault.svg';

const DATASETS = [
  'weekly_spoofing_events',
  'weekly_dark_detections',
  'weekly_sts_events',
  'dark_bulkers_90_200m',
  'unattr_bulkers_90_200m',
  'sentinel1_unattr_bulkers_90_200m',
  'light_bulkers_90_200m',
];

// Black Sea centered view
const BLACK_SEA_VIEW = { longitude: 34.5, latitude: 43.5, zoom: 5.2 };

export function IntelligenceOverview({ activeTab, onTabChange }) {
  const { datasets, loading } = useMultipleDatasets(DATASETS);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [activeTable, setActiveTable] = useState('spoofing');

  const spoofing = datasets.weekly_spoofing_events || [];
  const dark = datasets.weekly_dark_detections || [];
  const sts = datasets.weekly_sts_events || [];
  const darkBulkers = datasets.dark_bulkers_90_200m || [];
  const unattr = datasets.unattr_bulkers_90_200m || [];
  const sarBulkers = datasets.sentinel1_unattr_bulkers_90_200m || [];
  const lightBulkers = datasets.light_bulkers_90_200m || [];

  // Dedupe spoofing by synmax_ship_id for vessel count
  const spoofVessels = new Set(spoofing.map((r) => r.synmax_ship_id)).size;
  const darkVessels = new Set(dark.filter((r) => r.synmax_ship_id).map((r) => r.synmax_ship_id)).size;
  const unattributed = dark.filter((r) => !r.synmax_ship_id);

  // Date range
  const dateRange = useMemo(() => {
    const dates = dark.map((r) => r.acquired?.slice(0, 10)).filter(Boolean).sort();
    if (dates.length === 0) return '—';
    return `${dates[0]} → ${dates[dates.length - 1]}`;
  }, [dark]);

  // Multi-layer data for the main overview map
  const overviewLayers = useMemo(() => [
    { data: dark, type: 'Dark' },
    { data: spoofing.map(s => ({ ...s, lat: s.latitude, lon: s.longitude })), type: 'spoofing' },
    { data: sts.map(s => ({ ...s, lat: s.latitude, lon: s.longitude })), type: 'sts' },
  ], [dark, spoofing, sts]);

  // Select the latest dark detection by default, once data has loaded.
  useEffect(() => {
    if (loading || selectedDetection || dark.length === 0) return;
    setSelectedDetection(latestByDate(dark));
  }, [loading, dark, selectedDetection]);

  if (loading) return <Text c="#888f9e">Loading intelligence data…</Text>;

  return (
    <Stack gap={8}>
      {/* ── Header ── */}
      <Paper p="xl" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
        <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
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
              Black Sea &amp; Bosphorus Region • Spoofing • Dark Vessel • STS Transfer Monitoring
            </Text>
            <Text
              c="white"
              fw={800}
              mt={2}
              mb="md"
              style={{ fontSize: 26, lineHeight: 1.15, letterSpacing: '-0.02em' }}
            >
              Weekly Intelligence Assessment
            </Text>
            <ViewSwitcher active={activeTab} onChange={onTabChange} />
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
            Weekly Report • {dateRange}
          </span>
        </Group>
      </Paper>

      {/* ── Daily Intelligence Assessment / Key Findings ── */}
      <KeyFindings
        spoofingEvents={spoofing.length}
        spoofingVessels={spoofVessels}
        darkDetections={dark.length}
        darkVessels={darkVessels}
        stsEvents={sts.length}
        darkBulkers={darkBulkers.length}
        unattrBulkers={unattr.length}
        lightBulkers={lightBulkers.length}
      />

      {/* ── Weekly Detections (KPIs + map + chip + tables share one selection) ── */}
      <Paper p="md" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
        {/* KPI Row */}
        <div className="kpi-row">
          <KpiCard label="Spoofing Events" value={spoofing.length} iconSrc={spoofingIcon} bg="#181926" />
          <KpiCard label="Spoofing Vessels" value={spoofVessels} iconSrc={spoofingIcon} bg="#181926" />
          <KpiCard label="Dark Detections" value={dark.length} iconSrc={darkIcon} bg="#181926" />
          <KpiCard label="Dark Vessels" value={darkVessels} iconSrc={darkIcon} bg="#181926" />
          <KpiCard label="STS Events" value={sts.length} iconSrc={stsIcon} bg="#181926" />
          <KpiCard label="Unattr. Detections" value={unattributed.length} iconSrc={unattributedIcon} bg="#181926" />
        </div>

        {/* Main Overview Map + Satellite Chip */}
        <div className="map-chip" style={{ marginTop: 8 }}>
          <div className="map-chip__map">
            <DetectionMap
              multiLayer={overviewLayers}
              viewState={BLACK_SEA_VIEW}
              onClick={setSelectedDetection}
              selected={selectedDetection}
              height="100%"
            />
          </div>
          <div className="map-chip__side">
            <SatelliteChip detection={selectedDetection} />
          </div>
        </div>

        {/* Tabbed detection tables (one at a time to avoid a long scroll) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 20, borderBottom: '1px solid #393c56', marginBottom: 12 }}>
            {[
              { value: 'spoofing', label: 'Spoofing Events', count: spoofing.length },
              { value: 'dark', label: 'Dark Detections', count: dark.length },
              { value: 'sts', label: 'STS Events', count: sts.length },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                className="table-tab"
                data-active={activeTable === t.value}
                onClick={() => setActiveTable(t.value)}
              >
                {t.label}<span className="table-tab-count">{t.count}</span>
              </button>
            ))}
          </div>

          {activeTable === 'spoofing' && (
            <DetectionTable
              bare
              data={buildSpoofingTable(spoofing)}
              columns={['Vessel', 'IMO', 'MMSI', 'Flag', 'Events', 'First Seen', 'Last Seen']}
              onRowClick={(row) => {
                const e = row._event;
                if (e) setSelectedDetection({ ...e, lat: e.latitude, lon: e.longitude, _layerType: 'spoofing' });
              }}
              isRowActive={(row) =>
                selectedDetection &&
                String(row.MMSI) === String(selectedDetection.mmsi ?? selectedDetection.MMSI)
              }
            />
          )}

          {activeTable === 'dark' && (
            <DetectionTable
              bare
              data={dark.map((r) => ({
                OID: r.object_id,
                Vessel: r.name || '—',
                IMO: r.imo || '—',
                MMSI: r.mmsi || '—',
                Flag: r.flag_short_code || '—',
                'Length(m)': r.length,
                Acquired: r.acquired?.slice(0, 10),
                Provider: r.provider,
                _raw: r,
              }))}
              columns={['OID', 'Vessel', 'IMO', 'MMSI', 'Flag', 'Length(m)', 'Acquired', 'Provider']}
              onRowClick={(row) => {
                const raw = dark.find((r) => r.object_id === row.OID);
                if (raw) setSelectedDetection(raw);
              }}
              isRowActive={(row) => selectedDetection && row.OID === selectedDetection.object_id}
            />
          )}

          {activeTable === 'sts' && (
            <DetectionTable
              bare
              data={sts.map((e) => ({
                'Vessel 1': e.name_1 || '—',
                'Vessel 2': e.name_2 || '—',
                Flags: `${e.flag_1 || '—'} / ${e.flag_2 || '—'}`,
                'MMSI 1': e.mmsi_1 || '—',
                'MMSI 2': e.mmsi_2 || '—',
                Time: e.timestamp_display || '—',
                _raw: e,
              }))}
              columns={['Vessel 1', 'Vessel 2', 'Flags', 'MMSI 1', 'MMSI 2', 'Time']}
              onRowClick={(row) => {
                const e = row._raw;
                if (e) setSelectedDetection({ ...e, lat: e.latitude, lon: e.longitude });
              }}
              isRowActive={(row) =>
                selectedDetection && row._raw?.event_id === selectedDetection.event_id
              }
            />
          )}
        </div>
      </Paper>

      {/* ── Dark Bulkers Section ── */}
      <BulkerSection
        title="DARK BULKERS 90–200m"
        count={`${darkBulkers.length} detections`}
        data={darkBulkers}
        markerType="Dark"
        columns={['OID', 'Vessel', 'L(m)', 'W(m)', 'Acquired']}
        tableData={darkBulkers.map((r) => ({
          OID: r.object_id,
          Vessel: r.name || '—',
          'L(m)': r.length,
          'W(m)': r.width,
          Acquired: r.acquired?.slice(0, 10),
        }))}
      />

      {/* ── SAR Unattributed Bulkers Section ── */}
      <BulkerSection
        title="SAR UNATTRIBUTED BULKERS"
        count={`${sarBulkers.length} detections`}
        data={sarBulkers}
        markerType="Unattributed"
        columns={['OID', 'L(m)', 'W(m)', 'Hdg', 'Acquired']}
        tableData={sarBulkers.map((r) => ({
          OID: r.object_id,
          'L(m)': r.length,
          'W(m)': r.width,
          Hdg: r.heading,
          Acquired: r.acquired?.slice(0, 10),
        }))}
      />

      {/* ── AIS-Light Bulkers Section ── */}
      <BulkerSection
        title="AIS-LIGHT BULKERS"
        count={`${lightBulkers.length} attributed`}
        data={lightBulkers}
        markerType="Light"
        columns={['OID', 'Vessel', 'Flag', 'L(m)', 'Acquired']}
        tableData={lightBulkers.slice(0, 50).map((r) => ({
          OID: r.object_id,
          Vessel: r.name || '—',
          Flag: r.flag_short_code || '—',
          'L(m)': r.length,
          Acquired: r.acquired?.slice(0, 10),
        }))}
      />

      <DisclaimerFooter />
    </Stack>
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

// A bulker section owns its own selection so its chip defaults to (and stays on)
// a detection from its own dataset, independent of the main overview selection.
function BulkerSection({ title, count, data, markerType, columns, tableData }) {
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (data.length === 0) return;
    setSelected((cur) => {
      if (cur && data.some((r) => r.object_id === cur.object_id)) return cur;
      const latest = latestByDate(data);
      return latest ? { ...latest, _layerType: markerType } : null;
    });
  }, [data, markerType]);

  return (
    <MapSection title={title} count={count}>
      <div className="map-chip">
        <div className="map-chip__map">
          <DetectionMap
            data={data}
            markerType={markerType}
            onClick={setSelected}
            selected={selected}
            height="100%"
          />
        </div>
        <div className="map-chip__side">
          <SatelliteChip detection={selected} />
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <DetectionTable
          bare
          data={tableData}
          columns={columns}
          onRowClick={(row) => {
            const raw = data.find((r) => r.object_id === row.OID);
            if (raw) setSelected({ ...raw, _layerType: markerType });
          }}
          isRowActive={(row) => selected && row.OID === selected.object_id}
        />
      </div>
    </MapSection>
  );
}

function FindingsGroup({ title, items }) {
  return (
    <Paper
      p="md"
      radius={8}
      style={{ background: '#24263C', border: '1px solid #393c56' }}
    >
      <Text size="xs" fw={700} c="white" tt="uppercase" style={{ letterSpacing: '0.06em' }}>
        {title}
      </Text>
      <Stack gap={14} mt={16}>
        {items.map((item, i) => (
          <Group key={i} gap={12} wrap="nowrap" align="center">
            <div
              style={{
                width: 72,
                flexShrink: 0,
                padding: '10px 8px',
                background: '#181926',
                border: '1px solid #393c56',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: 'white',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {item.value}
              </Text>
            </div>
            <Text size="xs" c="#888f9e" style={{ lineHeight: 1.4 }}>{item.label}</Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  );
}

function KeyFindings({
  spoofingEvents,
  spoofingVessels,
  darkDetections,
  darkVessels,
  stsEvents,
  darkBulkers,
  unattrBulkers,
  lightBulkers,
}) {
  const n = (v) => Number(v).toLocaleString();

  return (
    <div className="findings-row">
      <FindingsGroup
        title="Key Findings — 7-Day Window"
        items={[
          { value: n(spoofingEvents), label: <>Spoofing events across {n(spoofingVessels)} unique vessels in the Black Sea &amp; Bosphorus</> },
          { value: n(darkDetections), label: <>Dark vessel detections across {n(darkVessels)} unique vessels via satellite</> },
          { value: n(stsEvents), label: 'AIS STS transfers detected across the region' },
        ]}
      />
      <FindingsGroup
        title="Grain Smuggling Risk — Single-Day Snapshot"
        items={[
          { value: n(155), label: 'Kerch Strait cargo detections (90–200m) — highest-activity zone' },
          { value: n(49), label: "Novorossiysk — Russia's primary grain export port" },
          { value: n(27), label: 'Mariupol (20) · Berdyansk (3) · Feodosia (4) — occupied-territory ports' },
        ]}
      />
      <FindingsGroup
        title="Bulker Detections — Single-Day Snapshot"
        items={[
          { value: n(darkBulkers), label: 'Dark bulkers (90–200m, AIS-off) across the Black Sea' },
          { value: n(unattrBulkers), label: 'Unattributed bulkers (no vessel match) — SAR + optical' },
          { value: n(lightBulkers), label: 'AIS-light bulkers (90–200m) broadcasting AIS' },
        ]}
      />
    </div>
  );
}

function MapSection({ title, count, children }) {
  return (
    <Paper p="md" radius={8} style={{ background: '#24263C', border: '1px solid #393c56' }}>
      <div style={{ marginBottom: 12 }}>
        <Text size="lg" fw={700} c="white">{title}</Text>
        <Text size="xs" c="#888f9e" mt={2}>{count}</Text>
      </div>
      {children}
    </Paper>
  );
}

function buildSpoofingTable(events) {
  const byVessel = {};
  events.forEach((e) => {
    const key = e.synmax_ship_id;
    if (!byVessel[key]) byVessel[key] = { events: [], ship_id: key };
    byVessel[key].events.push(e);
  });

  return Object.values(byVessel).map((v) => {
    const first = v.events[0];
    const sorted = [...v.events].sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));
    const latest = sorted[sorted.length - 1] || first;
    return {
      Vessel: first.name || first.synmax_ship_id?.slice(0, 8) || '—',
      IMO: first.imo || '—',
      MMSI: first.mmsi || '—',
      Flag: first.flag_short_code || '—',
      Events: v.events.length,
      'First Seen': sorted[0]?.timestamp?.slice(0, 10) || '—',
      'Last Seen': latest?.timestamp?.slice(0, 10) || '—',
      _event: latest,
    };
  }).sort((a, b) => b.Events - a.Events);
}
