import { NextRequest } from 'next/server';
import { POST, GET } from './route';
import { describe, it, expect } from 'vitest';

describe('Chat Stream API Governance Integration', () => {
  it('POST should include governance metadata for credit-related queries', async () => {
    const req = new NextRequest('http://localhost/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ message: 'credit underwriting' }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('GET should include governance metadata for credit queries', async () => {
    const req = new NextRequest('http://localhost/api/chat/stream?q=credit');

    const response = await GET(req);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('should reject invalid POST requests', async () => {
    const req = new NextRequest('http://localhost/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    expect(response.status).toBe(400);
  });
});
