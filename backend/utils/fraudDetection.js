// Rule-based fraud detection engine
// No ML needed - pure logic, fully explainable

const RULES = {
  DUPLICATE_SCAN: 'DUPLICATE_SCAN',
  TIME_WINDOW_VIOLATION: 'TIME_WINDOW_VIOLATION',
  WRONG_WARD: 'WRONG_WARD',
  SPEED_ANOMALY: 'SPEED_ANOMALY',
  INACTIVE_EVENT: 'INACTIVE_EVENT',
  UNASSIGNED_DISTRIBUTOR: 'UNASSIGNED_DISTRIBUTOR',
};

const SEVERITY = {
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
};

async function checkFraud(supabase, { token, distributorId, scannedAt }) {
  const flags = [];

  // Rule 1: Duplicate scan
  if (token.status === 'distributed') {
    flags.push({
      rule: RULES.DUPLICATE_SCAN,
      severity: SEVERITY.HIGH,
      message: `Token already distributed at ${token.distributed_at}`,
    });
  }

  // Rule 2: Time window violation
  const event = token.events;
  if (event) {
    const now = new Date(scannedAt);
    const start = new Date(event.start_date);
    const end = new Date(event.end_date);
    if (now < start || now > end) {
      flags.push({
        rule: RULES.TIME_WINDOW_VIOLATION,
        severity: SEVERITY.HIGH,
        message: `Scan outside event window (${event.start_date} - ${event.end_date})`,
      });
    }

    // Rule 3: Inactive event
    if (event.status !== 'active') {
      flags.push({
        rule: RULES.INACTIVE_EVENT,
        severity: SEVERITY.HIGH,
        message: `Event is ${event.status}, not active`,
      });
    }
  }

  // Rule 4: Wrong ward - distributor scans outside assigned ward
  if (token.houses && token.distributor_ward) {
    if (token.houses.ward !== token.distributor_ward) {
      flags.push({
        rule: RULES.WRONG_WARD,
        severity: SEVERITY.MEDIUM,
        message: `House ward (${token.houses.ward}) doesn't match distributor ward (${token.distributor_ward})`,
      });
    }
  }

  // Rule 5: Speed anomaly - more than 10 scans in 2 minutes by same distributor
  const twoMinsAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('tokens')
    .select('*', { count: 'exact', head: true })
    .eq('distributed_by', distributorId)
    .gte('distributed_at', twoMinsAgo);

  if (count >= 10) {
    flags.push({
      rule: RULES.SPEED_ANOMALY,
      severity: SEVERITY.MEDIUM,
      message: `Distributor scanned ${count} tokens in the last 2 minutes`,
    });
  }

  return {
    isFlagged: flags.length > 0,
    hasHighSeverity: flags.some(f => f.severity === SEVERITY.HIGH),
    flags,
  };
}

module.exports = { checkFraud, RULES, SEVERITY };
