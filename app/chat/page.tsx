'use client';

import NoSSR from '../../components/NoSSR';
import ChatClient from '../../components/ChatClient';

export default function Chat() {
  return (
    <NoSSR>
      <ChatClient />
    </NoSSR>
  );
}