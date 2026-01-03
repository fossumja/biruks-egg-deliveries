const fs = require('fs');

function readEventBody() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    throw new Error('GITHUB_EVENT_PATH is not set. This script must run in GitHub Actions.');
  }
  const raw = fs.readFileSync(eventPath, 'utf8');
  const payload = JSON.parse(raw);
  const body = payload.pull_request && typeof payload.pull_request.body === 'string'
    ? payload.pull_request.body
    : '';
  return body;
}

function getSection(body, heading) {
  const pattern = new RegExp(`##\\s+${heading}\\s*[\\r\\n]+([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
  const match = body.match(pattern);
  return match ? match[1] : '';
}

function hasNonPlaceholderTraceabilityRow(section) {
  const lines = section.split(/\r?\n/).map((line) => line.trim());
  const dataRows = lines.filter((line) => line.startsWith('|') && line.includes('|'));
  for (const row of dataRows) {
    if (row.toLowerCase().includes('requirement/ac')) continue;
    if (row.includes('---')) continue;
    if (row.includes('<!--')) continue;
    if (row.replace(/\|/g, '').trim().length === 0) continue;
    return true;
  }
  return false;
}

function hasCheckedValidationSignOff(section) {
  return /-\s*\[\s*x\s*\]\s*Complete/i.test(section);
}

function hasAutomatedSpecsEntry(body) {
  const lines = body.split(/\r?\n/);
  const idx = lines.findIndex((line) => line.toLowerCase().includes('automated specs updated'));
  if (idx === -1) return false;
  for (let i = idx + 1; i < Math.min(lines.length, idx + 5); i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (!line.startsWith('-')) continue;
    if (line.includes('<!--')) continue;
    return true;
  }
  return false;
}

function runChecks() {
  const body = readEventBody();
  const errors = [];

  const traceability = getSection(body, 'Traceability');
  if (!traceability) {
    errors.push('Missing "## Traceability" section in PR body.');
  } else if (!hasNonPlaceholderTraceabilityRow(traceability)) {
    errors.push('Traceability table has no filled rows (placeholder only).');
  }

  const validation = getSection(body, 'Validation sign-off');
  if (!validation) {
    errors.push('Missing "## Validation sign-off" section in PR body.');
  } else if (!hasCheckedValidationSignOff(validation)) {
    errors.push('Validation sign-off is not marked complete ("- [x] Complete").');
  }

  if (!hasAutomatedSpecsEntry(body)) {
    errors.push('Automated specs updated section is missing or empty.');
  }

  if (errors.length) {
    console.error('PR body validation failed:');
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  console.log('PR body validation passed.');
}

runChecks();
