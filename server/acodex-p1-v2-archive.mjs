// AcodeX P1-v2: archived, operator-supplied device readback correlated with
// independently read-back Google Drive evidence. Never a live provider probe.
// This data is only returned by the existing owner-only evidence endpoint.
const file = (id, sha256) => Object.freeze({
  url: 'https://drive.google.com/file/d/' + id + '/view?usp=drivesdk', sha256,
});

export const ACODEX_P1_V2_ARCHIVE = Object.freeze({
  workstream: 'PLATFORM / ACODEX_P1_V2',
  evidenceVersion: '1.1.0',
  classification: 'HISTORICAL_REFERENCE_ONLY',
  provenance: 'OWNER_TERMINAL_OUTPUT_AND_DRIVE_SHA256_READBACK',
  archiveStatus: 'VERIFIED',
  currentDeviceStatus: 'NOT_PROVEN',
  baselineUtc: '2026-11-18T23:11:25Z',
  expectedStartUtc: '2026-11-19T00:41:03Z',
  latestSuccessUtc: '2026-11-19T00:41:28Z',
  checkedUtc: '2026-11-19T00:43:05Z',
  healthExit: 0,
  outerExit: 0,
  guardAuditExit: 0,
  lockClear: true,
  newOAuthFailures: 0,
  newPullFailures: 0,
  recovery: Object.freeze({
    "classification": "OWNER_TERMINAL_RECOVERY_SNAPSHOT",
    "provenance": "OWNER_TERMINAL_OUTPUT",
    "status": "VERIFIED",
    "historicalIncidentStatus": "BLOCKED_OBSERVED",
    "currentDeviceStatus": "NOT_PROVEN",
    "baselineUtc": "2026-11-25T17:03:15Z",
    "expectedStartUtc": "2026-11-25T17:08:56Z",
    "latestSuccessUtc": "2026-11-25T17:09:01Z",
    "checkedUtc": "2026-11-25T17:10:23Z",
    "healthExit": 0,
    "outerExit": 0,
    "guardAuditExit": 0,
    "acopyCommandExit": 0,
    "lockClear": true,
    "newOAuthFailures": 0,
    "newPullFailures": 0,
    "postBaselineSuccessCount": 1,
    "pullShaMatch": true,
    "guardShaMatch": true,
    "filtersPresent": true,
    "bridgeAckStatus": "NOT_PROVEN"
  }),
  evidence: Object.freeze({
    v1: file('1x_bhZ_HdgL-OKuHlPgYIk--5DB0KtwOA', '991b97eef4f31a69ece605347d9b6aeebc8405f0fcd30ee7e96d03869c5e5afd'),
    v11: file('18s5PsFUI2qc-0s58O-f3ECCrYA8bu9T2', '89b2215cf85420928c70271dffa38ee4ad51ccd07d1832b4bb35192e28c892a3'),
    standard: file('1CZTMusHxrA2ZR6xp-Q-iPVFcNwNTyb_h', 'be03a2c479eddc1a40d4bad133e34b41e20039aa27ee5a776b05a24571d9eb17'),
  }),
});
