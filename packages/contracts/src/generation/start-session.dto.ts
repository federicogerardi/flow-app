export interface StartSessionRequest {
  workspaceId: string;
  inputs: {
    text?: Record<string, string>;
    files?: { key: string; filename: string; content: string }[];
    selectedAssets?: string[];
  };
}

export interface StartSessionResponse {
  session: {
    id: string;
    toolKey: string;
    workspaceId: string;
    status: string;
    stepCount: number;
    createdAt: string;
  };
  replayed: boolean;
}
