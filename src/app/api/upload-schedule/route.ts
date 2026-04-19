import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const DAY_TO_INDEX: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
  mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

interface ExtractedItem {
  employeeName: string;
  day: string;
  startTime: string;
  endTime: string;
}

interface EmployeeRef {
  id: string;
  name: string;
}

// ─── Fuzzy name matching ──────────────────────────────────────────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatchEmployee(name: string, employees: EmployeeRef[]): string | null {
  const norm = (s: string) => s.toLowerCase().trim();
  const target = norm(name);
  if (!target) return null;

  // 1. Exact match
  const exact = employees.find(e => norm(e.name) === target);
  if (exact) return exact.id;

  // 2. Contains (e.g. "Jake" in "Jake Martinez", or "Jake Martinez" contains "Jake")
  const contains = employees.find(e =>
    norm(e.name).includes(target) || target.includes(norm(e.name))
  );
  if (contains) return contains.id;

  // 3. First-name match
  const firstName = employees.find(e => norm(e.name).split(' ')[0] === target.split(' ')[0]);
  if (firstName) return firstName.id;

  // 4. Levenshtein ≤ 3 (handles typos / messy handwriting)
  let best: EmployeeRef | null = null;
  let bestDist = Infinity;
  for (const emp of employees) {
    const dist = levenshtein(target, norm(emp.name));
    if (dist < bestDist && dist <= 3) { bestDist = dist; best = emp; }
    // Also try first-name-only comparison
    const firstName = norm(emp.name).split(' ')[0];
    const firstDist = levenshtein(target, firstName);
    if (firstDist < bestDist && firstDist <= 2) { bestDist = firstDist; best = emp; }
  }
  return best?.id ?? null;
}

// ─── Time normalisation ───────────────────────────────────────────────────────
/** Ensure times are HH:MM 24h. Claude should return them that way but normalise just in case. */
function normaliseTime(t: string): string {
  if (!t) return '09:00';
  // Already HH:MM
  if (/^\d{1,2}:\d{2}$/.test(t)) {
    const [h, m] = t.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  // Handle "9am", "9:30pm" etc.
  const match = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2] ?? '0');
    const meridiem = (match[3] ?? '').toLowerCase();
    if (meridiem === 'pm' && h < 12) h += 12;
    if (meridiem === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  return '09:00';
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set' }, { status: 500 });

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const employeesJson = form.get('employees') as string | null;

    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    if (!employeesJson) return NextResponse.json({ error: 'No employees provided' }, { status: 400 });

    const employees: EmployeeRef[] = JSON.parse(employeesJson);

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mediaType = (file.type || 'image/jpeg') as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // Call Claude Vision
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            {
              type: 'text',
              text: `Extract the work schedule from this image. Return ONLY a JSON object — no explanation, no markdown, just raw JSON — with this structure:
{
  "items": [
    { "employeeName": "string", "day": "Monday", "startTime": "HH:MM", "endTime": "HH:MM" }
  ]
}
Rules:
- day must be the full day name (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- startTime and endTime must be 24-hour HH:MM format
- Only include rows where you can clearly read a name AND times
- If a cell is blank or illegible, skip it`,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    let extracted: { items: ExtractedItem[] } = { items: [] };
    try {
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'Could not parse schedule from image', raw }, { status: 422 });
    }

    if (!extracted.items?.length) {
      return NextResponse.json({ error: 'No schedule data found in image' }, { status: 422 });
    }

    // Map extracted items to template items with fuzzy-matched employee IDs
    const templateItems = extracted.items
      .map(item => {
        const employeeId = fuzzyMatchEmployee(item.employeeName, employees);
        if (!employeeId) return null; // drop unmatched
        const dayIndex = DAY_TO_INDEX[item.day.toLowerCase()];
        if (dayIndex === undefined) return null; // drop unknown days
        return {
          employeeId,
          dayIndex,
          startTime: normaliseTime(item.startTime),
          endTime: normaliseTime(item.endTime),
          note: '',
        };
      })
      .filter(Boolean);

    if (!templateItems.length) {
      return NextResponse.json({ error: 'No shifts could be matched to your employees' }, { status: 422 });
    }

    return NextResponse.json({ items: templateItems });
  } catch (err) {
    console.error('[upload-schedule]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
