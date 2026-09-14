import React from 'react';
import styled from 'styled-components';
import {
  CaptureData,
  CaptureMetric,
  CaptureMetricStatus,
  SessionState,
} from '@biosensesignal/web-sdk';

const COLOR_VALID = '#2e7d32';
const COLOR_WARNING = '#f9a825';
const COLOR_ERROR = '#c62828';
const COLOR_NA = '#bdbdbd';

function metricColor(metric?: CaptureMetric): string {
  if (!metric) return COLOR_NA;
  switch (metric.status) {
    case CaptureMetricStatus.VALID:
      return COLOR_VALID;
    case CaptureMetricStatus.WARNING:
      return COLOR_WARNING;
    case CaptureMetricStatus.ERROR:
      return COLOR_ERROR;
    default:
      return COLOR_NA;
  }
}

function metricValueText(metric?: CaptureMetric): string {
  if (!metric) return 'N/A';
  return String(metric.value);
}

const PanelWrapper = styled.div`
  background: rgba(20, 18, 17, 0.55);
  border-radius: 6px;
  padding: 6px 8px;
  min-width: 110px;
  max-width: 130px;
  font-size: 12px;
  color: #fff;
`;

const PhaseBanner = styled.div<{ state: SessionState }>`
  background: ${({ state }) =>
    state === SessionState.POSTURE_CHECK
      ? '#1565c0'
      : state === SessionState.MEASURING
      ? '#2e7d32'
      : '#555'};
  color: #fff;
  text-align: center;
  border-radius: 4px;
  padding: 2px 6px;
  margin-bottom: 6px;
  font-weight: 600;
  font-size: 11px;
  letter-spacing: 0.5px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const Label = styled.span<{ color: string }>`
  color: ${({ color }) => color};
`;

const Value = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-weight: 500;
`;

interface PgsPaneProps {
  captureData?: CaptureData;
  sessionState?: SessionState;
}

const PgsPane: React.FC<PgsPaneProps> = ({ captureData, sessionState }) => {
  const showPhase =
    sessionState === SessionState.POSTURE_CHECK ||
    sessionState === SessionState.MEASURING;

  const phaseLabel =
    sessionState === SessionState.POSTURE_CHECK
      ? 'POSTURE_CHECK'
      : sessionState === SessionState.MEASURING
      ? 'PROCESSING'
      : 'PGS';

  const f = captureData?.face;
  const d = captureData?.device;
  const e = captureData?.environment;

  return (
    <PanelWrapper>
      {showPhase && sessionState && (
        <PhaseBanner state={sessionState}>{phaseLabel}</PhaseBanner>
      )}
      <Row>
        <Label color={metricColor(f?.yaw)}>Yaw</Label>
        <Value>{metricValueText(f?.yaw)}</Value>
      </Row>
      <Row>
        <Label color={metricColor(f?.roll)}>Roll</Label>
        <Value>{metricValueText(f?.roll)}</Value>
      </Row>
      <Row>
        <Label color={metricColor(f?.pitch)}>Pitch</Label>
        <Value>{metricValueText(f?.pitch)}</Value>
      </Row>
      <Row>
        <Label color={metricColor(d?.pitch)}>Device Pitch</Label>
        <Value>{metricValueText(d?.pitch)}</Value>
      </Row>
      <Row>
        <Label color={metricColor(f?.horizontalAlignment)}>H-Align</Label>
        <Value>{metricValueText(f?.horizontalAlignment)}</Value>
      </Row>
      <Row>
        <Label color={metricColor(f?.verticalAlignment)}>V-Align</Label>
        <Value>{metricValueText(f?.verticalAlignment)}</Value>
      </Row>
      <Row>
        <Label color={metricColor(e?.lightingUniformity)}>Light Uni</Label>
        <Value>{metricValueText(e?.lightingUniformity)}</Value>
      </Row>
    </PanelWrapper>
  );
};

export default PgsPane;
