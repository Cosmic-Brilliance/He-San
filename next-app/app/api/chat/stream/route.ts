import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { preFilter, steerPrompt, postModerate, verifyGovernance } from '@/lib/safety/pipeline';

export const runtime = 'nodejs';

// Input validation schema
const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
});

function encode(s: string) {
  return new TextEncoder().encode(s);
}

async function* fakeStream(text: string) {
  for (const ch of text) {
    yield { delta: ch };
  }
}

async function handleStream(message: string) {
  // 1. Pre-filtering
  const pre = preFilter(message);
  if (pre.action === 'block') {
    return { error: 'blocked', reason: pre.reason, status: 403 };
  }

  // 2. Governance Verification
  const governance = verifyGovernance(message);

  // 3. Prompt Steering (Governance)
  const safePrompt = steerPrompt(message);

  // In a real app, you would call your LLM here with safePrompt
  let reply = "";
  if (governance && governance.risk_tier === "high") {
     reply = `[GOVERNED RESPONSE - HIGH RISK CREDIT]\nProcessing request with verified attestations for MAS FEAT and HKMA Ethics.\n\nResponse: ${message.slice(0, 50)}...`;
  } else {
     reply = `Governed Reply: ${message.slice(0, 50)}...`;
  }

  // 4. Post-moderation
  const post = postModerate(reply);
  if (post.action === 'block') {
    return { error: 'unsafe_output', reason: post.reason, status: 403 };
  }

  const stream = new ReadableStream({
    async start(controller) {
      const meta = {
        layer: 'governance_v1',
        model: 'sentinel-secure',
        version: '1.0.1',
        latencyMs: 15,
        pre,
        post,
        governance,
      };

      controller.enqueue(encode(`event: meta\ndata: ${JSON.stringify(meta)}\n\n`));

      for await (const chunk of fakeStream(reply)) {
        await new Promise(r => setTimeout(r, 10));
        controller.enqueue(encode(`event: token\ndata: ${JSON.stringify(chunk)}\n\n`));
      }

      controller.enqueue(encode(`event: done\n\n`));
      controller.close();
    }
  });

  return { stream, status: 200 };
}

function createStreamResponse(res: any) {
  if ('error' in res) {
    return NextResponse.json({ error: res.error, reason: res.reason }, { status: res.status });
  }

  return new Response(res.stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = ChatRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'invalid_request', details: result.error.format() }, { status: 400 });
    }

    const { message } = result.data;
    const res = await handleStream(message);
    return createStreamResponse(res);

  } catch (error) {
    console.error('Chat stream error encountered');
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get('q');

  if (!message) {
    return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  }

  const res = await handleStream(message);
  return createStreamResponse(res);
}
