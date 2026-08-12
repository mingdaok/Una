import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import PostCard from '../PostCard';


afterEach(cleanup);

describe('PostCard', () => {
  it('把生活世界中的 NPC 标记为 UNA 的朋友', () => {
    render(
      <PostCard
        post={{
          id: 12,
          author_id: 'ai_zhixia',
          author_name: '知夏',
          author_type: 'npc',
          content: '路过旧城区时看见一面被夕阳照亮的墙。',
          images: [],
          likes: [{ user_id: 'ai_una', user_name: 'UNA' }],
          comments: [],
          timestamp: '2026-08-10 09:00:00',
        }}
        currentUserId="user-a"
        currentUserName="Alice"
      />,
    );

    expect(screen.getByText('知夏')).toBeTruthy();
    expect(screen.getByText('朋友')).toBeTruthy();
    expect(screen.queryByText('AI')).toBeNull();
    expect(screen.getByText('UNA')).toBeTruthy();
  });
});
