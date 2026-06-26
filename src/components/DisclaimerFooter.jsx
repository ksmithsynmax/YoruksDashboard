
import { Text } from '@mantine/core';

const DISCLAIMER_TEXT = `PRE-RELEASE AND CONFIDENTIAL. This dashboard is an early, pre-release work product provided by SynMax for quality-control review only. The data is preliminary, unverified, and subject to change. It is provided "AS IS" and "AS AVAILABLE" with no warranty of any kind, express or implied, including accuracy, completeness, timeliness, or fitness for a particular purpose, and must not be relied upon for any navigational, operational, commercial, trading, sanctions, legal, or safety decision. This dashboard and its contents are SynMax confidential information. Access is personal to the named recipient and may not be shared, redistributed, republished, or used to derive or train any competing product. © SynMax, Inc. All rights reserved.`;

export function DisclaimerFooter() {
  return (
    <Text size="xs" c="#888f9e" ta="left" mt="md" style={{ lineHeight: 1.5 }}>
      {DISCLAIMER_TEXT}
    </Text>
  );
}
