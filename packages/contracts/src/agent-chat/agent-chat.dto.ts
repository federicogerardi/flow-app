export interface MessageDTO {
  id: string;
  role: string;
  content: string;
  tokensUsed: number;
  modelUsed: string | null;
  createdAt: string;
}

export interface ConversationDTO {
  id: string;
  workspaceId: string;
  agentKey: string;
  agentName: string;
  title: string | null;
  status: string;
  messages: MessageDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ConversationListItemDTO {
  id: string;
  agentKey: string;
  agentName: string;
  title: string | null;
  status: string;
  messageCount: number;
  lastMessage: { content: string; role: string; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDTO {
  key: string;
  name: string;
  role: string;
  essence: string;
  capabilities: string[];
}
