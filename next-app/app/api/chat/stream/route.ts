import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { preFilter, steerPrompt, postModerate } from '@/lib/safety/pipeline';

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

/**
 * Governed Chat Stream API
 * Implements:
 * - Input validation with Zod (CWE-20)
 * - Safety pre-filtering (PII, injection)
 * - Prompt steering (Governance)
 * - Post-moderation (Unsafe content, info disclosure)
 * - Structured logging/telemetry
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = ChatRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: 'invalid_request', details: result.error.format() }, { status: 400 });
    }

    const { message } = result.data;

    // 1. Pre-filtering
    const pre = preFilter(message);
    if (pre.action === 'block') {
      return NextResponse.json({ error: 'blocked', reason: pre.reason }, { status: 403 });
    }

    // 2. Prompt Steering (Governance)
    const safePrompt = steerPrompt(message);

    // In a real app, you would call your LLM here with safePrompt
    const reply = `Governed Reply: ${message.slice(0, 50)}...`;

    // 3. Post-moderation
    const post = postModerate(reply);
    if (post.action === 'block') {
      // In a real stream, you'd handle this differently, but for this MVP:
      return NextResponse.json({ error: 'unsafe_output', reason: post.reason }, { status: 403 });
    }

    const stream = new ReadableStream({
      async start(controller) {
        const meta = {
          layer: 'governance_v1',
          model: 'sentinel-secure',
          version: '1.0.0',
          latencyMs: 12,
          pre,
          post,
        };

        controller.enqueue(encode(`event: meta\ndata: ${JSON.stringify(meta)}\n\n`));

        for (const chunk of fakeStream(reply)) {
          await new Promise(r => setTimeout(r, 10));
          controller.enqueue(encode(`event: token\ndata: ${JSON.stringify(chunk)}\n\n`));
        }

        controller.enqueue(encode(`event: done\n\n`));
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('Chat stream error:', error);
    return NextResponse.json({ error: 'internal_server_error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const message = searchParams.get('q');

  if (!message) {
    return NextResponse.json({ error: 'missing_query' }, { status: 400 });
  }

  // Reuse logic or redirect to POST
  return NextResponse.json({ error: 'use_post_for_streaming' }, { status: 405 });
}
